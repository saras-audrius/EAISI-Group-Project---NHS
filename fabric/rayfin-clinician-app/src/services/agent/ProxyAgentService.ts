import type { AgentAnswer, AgentService, AskOptions } from './types';

/**
 * What `tools/agent_proxy.py` returns. The proxy speaks MCP to the published
 * Fabric Data Agent under the presenter's own Entra sign-in, so the answer is
 * computed with the same permissions the presenter has in the workspace.
 */
interface ProxyResponse {
  answer: string;
  status?: 'answered' | 'declined' | 'error';
  threadId?: string;
  query?: string;
  groundedOn?: string[];
  citations?: { episodeId?: string; label: string }[];
  table?: { headers: string[]; rows: (string | number)[][] };
  agent?: { workspaceId?: string; dataAgentId?: string; toolName?: string };
}

export class ProxyAgentService implements AgentService {
  readonly mode = 'proxy' as const;
  readonly description: string;

  readonly suggestedQuestions = [
    'Which of my pre-operative patients are flagged, and why?',
    'Which factors contributed most for this patient?',
    'How does our flag rate compare with other providers?',
    'What happens to the flagged count at a threshold of 0.7?',
  ] as const;

  constructor(private readonly baseUrl: string) {
    this.description = `Fabric Data Agent, via the local proxy at ${baseUrl}. Grounded on the gold tables through Fabric IQ; answers carry the same permissions as the signed-in presenter.`;
  }

  async ask(question: string, options: AskOptions = {}): Promise<AgentAnswer> {
    const started = performance.now();
    const id = `ans-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    try {
      const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          threadId: options.threadId,
          episodeId: options.episodeId,
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`Agent proxy returned ${res.status}${detail ? `: ${detail.slice(0, 300)}` : ''}`);
      }
      const body = (await res.json()) as ProxyResponse;
      return {
        id,
        question,
        status: body.status ?? (looksDeclined(body.answer) ? 'declined' : 'answered'),
        text: body.answer,
        query: body.query,
        groundedOn: body.groundedOn ?? ['Fabric Data Agent'],
        citations: body.citations ?? [],
        table: body.table,
        latencyMs: Math.round(performance.now() - started),
        source: this.mode,
        threadId: body.threadId ?? options.threadId,
      };
    } catch (err) {
      return {
        id,
        question,
        status: 'error',
        text:
          err instanceof Error
            ? `${err.message}. Is the proxy running? \`python tools/agent_proxy.py\` after \`az login\`.`
            : 'The agent proxy could not be reached.',
        groundedOn: [],
        citations: [],
        latencyMs: Math.round(performance.now() - started),
        source: this.mode,
        threadId: options.threadId,
      };
    }
  }
}

/** The Data Agent phrases a refusal in prose; catch the common shapes so the UI can mark it. */
export function looksDeclined(text: string): boolean {
  return /\b(cannot|can't|unable to|not able to|don't have|do not have|outside (of )?(my|the) scope|no data|not available)\b/i.test(
    text.slice(0, 240)
  );
}
