#!/usr/bin/env python3
"""
Local proxy from the clinician app to a published Fabric Data Agent.

The app runs in a browser and cannot call the Data Agent's MCP endpoint
directly: the endpoint wants a Fabric bearer token for
`https://api.fabric.microsoft.com/.default`, which the Rayfin session does not
carry, and it does not answer cross-origin requests. This script bridges the
gap on the presenter's laptop:

    az login                                   # the presenter's own identity
    pip install mcp azure-identity
    python tools/agent_proxy.py                # http://localhost:8765

    VITE_AGENT_PROXY_URL=http://localhost:8765 npm run dev:offline
    # or put it in .env.local for the Fabric build

Every question is answered under the signed-in presenter's permissions —
which is the honest way to say "same permissions as the app" on stage.

Endpoints:
    GET  /health         -> {"ok": true, "workspaceId": ..., "dataAgentId": ...}
    POST /ask            <- {"question": "...", "threadId"?: "..."}
                         -> {"answer": "...", "status": "answered"|"declined", ...}

Configuration (environment or a `.env.agent` file next to this script):
    FABRIC_WORKSPACE_ID   workspace holding the data agent
    FABRIC_DATA_AGENT_ID  the published data agent's item id
    AGENT_PROXY_PORT      default 8765
    AGENT_ALLOWED_ORIGIN  default * (tighten to the app's origin when deployed)
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import os
import re
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

try:
    from azure.identity import AzureCliCredential, DefaultAzureCredential
    from mcp import ClientSession
except ImportError as exc:  # pragma: no cover
    sys.exit(
        f"Missing dependency ({exc}).\n"
        "  python3 -m venv tools/.venv && tools/.venv/bin/pip install mcp azure-identity"
    )

# The MCP Python SDK renamed its streamable-HTTP client between 1.x and 2.x, and
# changed the transport's shape at the same time. Both are supported here rather
# than pinning, because a demo laptop that upgrades the SDK the week before the
# session should not discover it at the lectern.
#
#   1.x  streamablehttp_client(url, headers=...)  -> (read, write, get_session_id)
#   2.x  streamable_http_client(url, http_client=...) -> (read, write)
try:  # mcp >= 2
    from mcp.client.streamable_http import streamable_http_client as _http_client_factory

    MCP_MAJOR = 2
except ImportError:  # mcp 1.x
    from mcp.client.streamable_http import streamablehttp_client as _http_client_factory

    MCP_MAJOR = 1


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


load_dotenv(Path(__file__).with_name(".env.agent"))

WORKSPACE_ID = os.environ.get("FABRIC_WORKSPACE_ID", "")
DATA_AGENT_ID = os.environ.get("FABRIC_DATA_AGENT_ID", "")
PORT = int(os.environ.get("AGENT_PROXY_PORT", "8765"))
ALLOWED_ORIGIN = os.environ.get("AGENT_ALLOWED_ORIGIN", "*")
FABRIC_SCOPE = "https://api.fabric.microsoft.com/.default"

if not WORKSPACE_ID or not DATA_AGENT_ID:
    sys.exit(
        "Set FABRIC_WORKSPACE_ID and FABRIC_DATA_AGENT_ID (environment or tools/.env.agent). "
        "The data agent must be published; copy the MCP server URL from its settings tab."
    )

MCP_URL = (
    f"https://api.fabric.microsoft.com/v1/mcp/workspaces/{WORKSPACE_ID}"
    f"/dataagents/{DATA_AGENT_ID}/agent"
)

# `az login` first; DefaultAzureCredential is the fallback for a service principal
# in the environment (AZURE_CLIENT_ID / AZURE_TENANT_ID / AZURE_CLIENT_SECRET).
try:
    CREDENTIAL = AzureCliCredential()
    CREDENTIAL.get_token(FABRIC_SCOPE)
except Exception:  # noqa: BLE001
    CREDENTIAL = DefaultAzureCredential()


def auth_headers() -> dict[str, str]:
    token = CREDENTIAL.get_token(FABRIC_SCOPE)
    return {"Authorization": f"Bearer {token.token}"}


DECLINE_PATTERN = re.compile(
    r"\b(cannot|can't|unable to|not able to|don't have|do not have|outside (of )?(my|the) scope|"
    r"no data|not available|can only answer)\b",
    re.IGNORECASE,
)


@contextlib.asynccontextmanager
async def open_streams(url: str, headers: dict[str, str]):
    """Read/write streams to the MCP endpoint, on either SDK generation."""
    if MCP_MAJOR >= 2:
        import httpx2

        async with httpx2.AsyncClient(headers=headers, timeout=180.0) as http_client:
            async with _http_client_factory(url, http_client=http_client) as streams:
                yield streams[0], streams[1]
    else:
        async with _http_client_factory(url, headers=headers) as streams:
            yield streams[0], streams[1]


def tool_question_arg(tool) -> str:
    """The name of the tool's first input property. `inputSchema` became `input_schema` in 2.x."""
    schema = getattr(tool, "input_schema", None) or getattr(tool, "inputSchema", None) or {}
    properties = schema.get("properties") or {}
    if not properties:
        raise RuntimeError(f"Tool '{tool.name}' declares no input properties.")
    return next(iter(properties))


def result_text(result) -> str:
    """Every text block of a tool result, joined. Robust to the block classes changing."""
    blocks = getattr(result, "content", None) or []
    return "\n".join(b.text for b in blocks if getattr(b, "text", None))


async def query_data_agent(question: str) -> dict:
    """One MCP round trip: initialise, discover the single tool, call it."""
    started = time.perf_counter()
    async with open_streams(MCP_URL, auth_headers()) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            if not tools.tools:
                raise RuntimeError("The data agent advertised no tools. Is it published?")
            tool = tools.tools[0]
            result = await session.call_tool(tool.name, {tool_question_arg(tool): question})
            text = result_text(result)
            return {
                "answer": text or "(empty answer)",
                "status": "declined" if DECLINE_PATTERN.search(text[:300]) else "answered",
                "groundedOn": ["Fabric Data Agent", "Fabric IQ"],
                "citations": [],
                "agent": {
                    "workspaceId": WORKSPACE_ID,
                    "dataAgentId": DATA_AGENT_ID,
                    "toolName": tool.name,
                    "sdkMajor": MCP_MAJOR,
                },
                "durationMs": round((time.perf_counter() - started) * 1000),
            }


class Handler(BaseHTTPRequestHandler):
    def _cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, status: int, body: dict) -> None:
        data = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self._cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        if self.path.rstrip("/") in ("", "/health"):
            self._json(200, {"ok": True, "workspaceId": WORKSPACE_ID, "dataAgentId": DATA_AGENT_ID, "mcpUrl": MCP_URL})
        else:
            self._json(404, {"error": "not found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path.rstrip("/") != "/ask":
            self._json(404, {"error": "not found"})
            return
        length = int(self.headers.get("Content-Length", "0"))
        try:
            payload = json.loads(self.rfile.read(length) or b"{}")
            question = str(payload.get("question", "")).strip()
            if not question:
                self._json(400, {"error": "question is required"})
                return
            if payload.get("episodeId"):
                question = f"{question} (episode_id = {payload['episodeId']})"
            result = asyncio.run(query_data_agent(question))
            result["threadId"] = payload.get("threadId")
            self._json(200, result)
        except Exception as exc:  # noqa: BLE001
            self._json(502, {"error": f"{type(exc).__name__}: {exc}"})

    def log_message(self, fmt: str, *args) -> None:  # noqa: D102
        sys.stderr.write(f"[agent-proxy] {fmt % args}\n")


if __name__ == "__main__":
    print(f"[agent-proxy] Data Agent MCP: {MCP_URL}")
    print(f"[agent-proxy] Listening on http://localhost:{PORT}  (POST /ask, GET /health)")
    ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
