/**
 * The "Ask" surface: a clinician types a question in English and gets back an
 * answer that is grounded in governed tables, or a refusal.
 *
 * Three backends implement this, chosen once at boot (see `bootstrap.ts`):
 *
 * * `LocalAgentService` — a deterministic query engine over the same data
 *   service the rest of the app reads through. No language model, no network.
 *   It is the offline fallback and it is also honest about being one: every
 *   answer says it came from the built-in engine.
 * * `ProxyAgentService` — HTTP to a small local proxy (`tools/agent_proxy.py`)
 *   that speaks MCP to a published Fabric Data Agent under the presenter's own
 *   Entra identity. This is the stage path.
 * * `FunctionAgentService` — a Rayfin function (`rayfin/functions`) that does
 *   the same MCP call server-side under a service principal. Experimental in
 *   Rayfin 1.34; kept behind a flag.
 */

export type AgentMode = 'local' | 'proxy' | 'function';

export type AgentStatus = 'answered' | 'declined' | 'error';

export interface AgentCitation {
  /** A patient the answer used. Rendered as a link to the patient page. */
  episodeId?: string;
  label: string;
}

export interface AgentTable {
  headers: string[];
  rows: (string | number)[][];
}

export interface AgentAnswer {
  id: string;
  question: string;
  status: AgentStatus;
  /** Plain prose. Paragraphs separated by blank lines; no markup. */
  text: string;
  /** The query the answer was computed from, when the backend can say. */
  query?: string;
  /** Tables the answer was grounded on, e.g. `gold.patient_risk`. */
  groundedOn: string[];
  citations: AgentCitation[];
  table?: AgentTable;
  latencyMs: number;
  source: AgentMode;
  /** Conversation continuity for backends that keep a thread. */
  threadId?: string;
}

export interface AskOptions {
  threadId?: string;
  /** A patient the question is about, when asked from a patient page. */
  episodeId?: string;
}

export interface AgentService {
  readonly mode: AgentMode;
  /** One line the UI shows so nobody mistakes the engine for something it is not. */
  readonly description: string;
  readonly suggestedQuestions: readonly string[];
  ask(question: string, options?: AskOptions): Promise<AgentAnswer>;
}
