import { UserDataFunctions } from '@microsoft/fabric-user-data-functions';

/**
 * `askDataAgent` — the in-estate path from the clinician app to a published
 * Fabric Data Agent.
 *
 * The browser cannot call the Data Agent's MCP endpoint itself: it needs a
 * Fabric bearer token (`https://api.fabric.microsoft.com/.default`) and the
 * endpoint does not answer cross-origin requests. This function makes the call
 * server-side, inside the workspace, under a service principal whose secret is
 * set with `rayfin secret set` / `rayfin/.env.secrets` and never reaches the
 * frontend bundle.
 *
 * Secrets and settings (all read from the function's environment):
 *
 *   FABRIC_WORKSPACE_ID    workspace holding the data agent
 *   FABRIC_DATA_AGENT_ID   the published data agent's item id
 *   AZURE_TENANT_ID        tenant of the service principal
 *   AZURE_CLIENT_ID        service principal (app registration) id
 *   AZURE_CLIENT_SECRET    its client secret  <- `rayfin secret set AZURE_CLIENT_SECRET`
 *
 * The service principal must be a workspace member with permission to read the
 * data agent and its sources. Note the consequence honestly on stage: an
 * answer from this path carries the *service principal's* permissions, not the
 * signed-in clinician's. The proxy in `tools/agent_proxy.py` runs under the
 * presenter's own identity and is the rehearsed route; this one is the
 * "nothing leaves the workspace" route, and Rayfin functions are experimental
 * in 1.34.
 *
 * The MCP exchange is written out by hand rather than through an SDK so the
 * function has no dependency beyond `fetch`: initialise → tools/list →
 * tools/call, over streamable HTTP with JSON responses.
 */

const udf = new UserDataFunctions();

const FABRIC_SCOPE = 'https://api.fabric.microsoft.com/.default';

interface McpResponse {
  result?: Record<string, unknown>;
  error?: { message?: string };
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set on the function. See function_app.ts for the list.`);
  return value;
}

async function serviceToken(): Promise<string> {
  const tenant = required('AZURE_TENANT_ID');
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: required('AZURE_CLIENT_ID'),
    client_secret: required('AZURE_CLIENT_SECRET'),
    scope: FABRIC_SCOPE,
  });
  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Token request failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token: string };
  return json.access_token;
}

/** One JSON-RPC call over MCP streamable HTTP. Accepts plain JSON or an SSE body. */
async function mcp(
  url: string,
  token: string,
  sessionId: string | null,
  id: number,
  method: string,
  params: Record<string, unknown>
): Promise<{ body: McpResponse; sessionId: string | null }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
  };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
  });
  if (!res.ok) throw new Error(`MCP ${method} failed: ${res.status} ${await res.text()}`);
  const nextSession = res.headers.get('mcp-session-id') ?? sessionId;
  const text = await res.text();
  const contentType = res.headers.get('content-type') ?? '';
  let body: McpResponse;
  if (contentType.includes('text/event-stream')) {
    // Take the last `data:` line that parses as JSON-RPC with our id.
    const events = text
      .split(/\n\n/)
      .flatMap((chunk) => chunk.split('\n').filter((l) => l.startsWith('data:')))
      .map((l) => l.slice(5).trim())
      .filter(Boolean);
    const matching = events
      .map((e) => {
        try {
          return JSON.parse(e) as McpResponse & { id?: number };
        } catch {
          return null;
        }
      })
      .filter((e): e is McpResponse & { id?: number } => e !== null && e.id === id);
    body = matching[matching.length - 1] ?? {};
  } else {
    body = text ? (JSON.parse(text) as McpResponse) : {};
  }
  if (body.error) throw new Error(`MCP ${method}: ${body.error.message ?? 'error'}`);
  return { body, sessionId: nextSession };
}

udf.func(
  'askDataAgent',
  async (question: string, threadId?: string): Promise<{ answer: string; threadId?: string; toolName?: string; durationMs?: number }> => {
    const started = Date.now();
    const url = `https://api.fabric.microsoft.com/v1/mcp/workspaces/${required('FABRIC_WORKSPACE_ID')}/dataagents/${required('FABRIC_DATA_AGENT_ID')}/agent`;
    const token = await serviceToken();

    let session: string | null = null;
    const init = await mcp(url, token, session, 1, 'initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'knee-outcome-review', version: '1.0.0' },
    });
    session = init.sessionId;

    const list = await mcp(url, token, session, 2, 'tools/list', {});
    const tools = (list.body.result?.tools as { name: string; inputSchema: { properties: Record<string, unknown> } }[]) ?? [];
    if (tools.length === 0) throw new Error('The data agent advertised no tools. Is it published?');
    const tool = tools[0];
    const questionArg = Object.keys(tool.inputSchema.properties)[0];

    const call = await mcp(url, token, session, 3, 'tools/call', {
      name: tool.name,
      arguments: { [questionArg]: question },
    });
    const content = (call.body.result?.content as { type: string; text?: string }[]) ?? [];
    const answer = content.filter((c) => c.type === 'text' && c.text).map((c) => c.text).join('\n');

    return { answer: answer || '(empty answer)', threadId, toolName: tool.name, durationMs: Date.now() - started };
  },
  []
);
