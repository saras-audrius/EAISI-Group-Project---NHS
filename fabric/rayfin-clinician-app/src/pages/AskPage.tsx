import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { Card, Chip } from '@/components/ui/Primitives';
import { getAgentService, type AgentAnswer } from '@/services/agent';

interface Turn {
  id: string;
  question: string;
  answer?: AgentAnswer;
}

/**
 * Ask the estate a question in English.
 *
 * Every answer arrives with what it was grounded on, the query it stands for
 * where the backend can say, the patients it cited as links, and a status —
 * answered, declined, or error — so a refusal is visibly a refusal and never
 * an empty box. The backend is named on screen: a clinician should always be
 * able to tell whether they are talking to a language model or to a query
 * engine.
 */
export function AskPage() {
  const agent = getAgentService();
  const [params] = useSearchParams();
  const episodeId = params.get('episode') ?? undefined;
  const [input, setInput] = useState(params.get('q') ?? '');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [threadId, setThreadId] = useState<string | undefined>(undefined);
  const endRef = useRef<HTMLDivElement>(null);
  const autoAsked = useRef(false);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    const id = `turn-${Date.now()}`;
    setTurns((t) => [...t, { id, question: q }]);
    setInput('');
    setBusy(true);
    try {
      const answer = await agent.ask(q, { threadId, episodeId });
      if (answer.threadId) setThreadId(answer.threadId);
      setTurns((t) => t.map((turn) => (turn.id === id ? { ...turn, answer } : turn)));
    } finally {
      setBusy(false);
    }
  };

  // A question carried in the URL (from a patient page) is asked once, on load.
  useEffect(() => {
    const q = params.get('q');
    if (q && !autoAsked.current) {
      autoAsked.current = true;
      void ask(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof endRef.current?.scrollIntoView === 'function') {
      endRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [turns.length, busy]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void ask(input);
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-5">
        <header className="rise" style={{ '--i': 0 } as React.CSSProperties}>
          <div className="eyebrow mb-2">Ask</div>
          <h1 className="text-[1.75rem] font-semibold leading-tight tracking-tight text-ink">
            A grounded answer, or none
          </h1>
          <p className="mt-2 max-w-[62ch] text-small text-muted">
            Questions are answered from the governed tables — the scores, the model’s own
            explanations, the provider aggregates and the threshold sweep — under the same
            permissions as the rest of this app. What cannot be grounded is declined.
          </p>
        </header>

        <div className="space-y-4">
          {turns.length === 0 && (
            <Card className="rise" style={{ '--i': 1 } as React.CSSProperties}>
              <div className="p-5">
                <p className="text-small font-medium text-ink">Try one of these</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {agent.suggestedQuestions.map((q) => (
                    <li key={q}>
                      <button
                        type="button"
                        onClick={() => void ask(q)}
                        className="rounded-md border border-line bg-elevated px-3 py-1.5 text-small text-ink transition-colors hover:border-accent hover:bg-accent-tint hover:text-accent-text"
                      >
                        {q}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          )}

          {turns.map((turn) => (
            <div key={turn.id} className="space-y-3">
              <div className="flex justify-end">
                <p className="max-w-[70%] rounded-md bg-accent px-4 py-2.5 text-small text-accent-fg">
                  {turn.question}
                </p>
              </div>
              {turn.answer ? <AnswerCard answer={turn.answer} /> : <Thinking />}
            </div>
          ))}
          <div ref={endRef} />
        </div>

        <form onSubmit={onSubmit} className="sticky bottom-4 rise" style={{ '--i': 2 } as React.CSSProperties}>
          <div className="flex items-end gap-2 rounded-[var(--radius-card)] border border-line bg-elevated p-2">
            <label htmlFor="ask-input" className="sr-only-text">
              Your question
            </label>
            <textarea
              id="ask-input"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void ask(input);
                }
              }}
              placeholder={episodeId ? 'Ask about this patient, or anything on your list…' : 'Which of my patients are flagged, and why?'}
              className="max-h-40 min-h-[2.5rem] flex-1 resize-y bg-transparent px-3 py-2 text-body text-ink placeholder:text-muted focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || input.trim() === ''}
              className="rounded-lg bg-accent px-4 py-2 text-small font-semibold text-accent-fg transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Asking…' : 'Ask'}
            </button>
          </div>
        </form>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Card className="rise" style={{ '--i': 3 } as React.CSSProperties}>
          <div className="p-4">
            <div className="eyebrow mb-1">Answering</div>
            <p className="text-small font-semibold text-ink">
              {agent.mode === 'local'
                ? 'Built-in query engine'
                : agent.mode === 'proxy'
                  ? 'Fabric Data Agent (proxy)'
                  : 'Fabric Data Agent (Rayfin function)'}
            </p>
            <p className="mt-1 text-micro text-muted">{agent.description}</p>
          </div>
        </Card>
        <Card className="rise" style={{ '--i': 4 } as React.CSSProperties}>
          <div className="p-4">
            <div className="eyebrow mb-1">Grounding</div>
            <ul className="space-y-1 font-mono text-micro text-ink">
              <li>gold.patient_risk</li>
              <li>gold.risk_explanation</li>
              <li>gold.threshold_sweep</li>
              <li>ProviderStats · CohortStats</li>
            </ul>
            <p className="mt-2 text-micro text-muted">
              Column comments on these tables are what the agent reads; an undocumented column is one it guesses about.
            </p>
          </div>
        </Card>
        {episodeId && (
          <Card className="rise" style={{ '--i': 5 } as React.CSSProperties}>
            <div className="p-4 text-small">
              <div className="eyebrow mb-1">In context</div>
              <Link to={`/patient/${encodeURIComponent(episodeId)}`} className="font-mono text-micro text-accent-text hover:underline">
                {episodeId}
              </Link>
              <p className="mt-1 text-micro text-muted">“This patient” in a question refers to this record.</p>
            </div>
          </Card>
        )}
      </aside>
    </div>
  );
}

function Thinking() {
  return (
    <div className="flex items-center gap-2 px-2 text-small text-muted" role="status" aria-label="Waiting for an answer">
      <span className="thinking-dot inline-block h-2 w-2 rounded-full bg-accent" />
      <span className="thinking-dot inline-block h-2 w-2 rounded-full bg-accent" />
      <span className="thinking-dot inline-block h-2 w-2 rounded-full bg-accent" />
      <span className="ml-1">Grounding the answer…</span>
    </div>
  );
}

function AnswerCard({ answer }: { answer: AgentAnswer }) {
  const tone = answer.status === 'answered' ? 'accent' : answer.status === 'declined' ? 'warn' : 'danger';
  const label = answer.status === 'answered' ? 'grounded' : answer.status === 'declined' ? 'declined' : 'error';
  const showTableInline = (answer.table?.rows.length ?? 0) <= 12;

  return (
    <Card as="article" className={answer.status === 'declined' ? 'border-warn-border' : ''}>
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2">
        <Chip tone={tone}>{label}</Chip>
        {answer.groundedOn.map((g) => (
          <Chip key={g}>{g}</Chip>
        ))}
        <span className="ml-auto text-micro text-muted">
          {answer.latencyMs} ms · {answer.source === 'local' ? 'built-in engine' : 'Data Agent'}
        </span>
      </div>

      <div className="space-y-3 px-4 py-3">
        {answer.text.split(/\n{2,}/).map((para, i) => (
          <p key={i} className={`text-small ${i === 0 ? 'text-ink' : 'text-muted'}`}>
            {para}
          </p>
        ))}

        {answer.table && answer.table.rows.length > 0 && (
          showTableInline ? (
            <AnswerTable table={answer.table} />
          ) : (
            <details className="group">
              <summary className="cursor-pointer text-micro font-medium text-accent-text underline decoration-dotted underline-offset-2">
                Show all {answer.table.rows.length} rows
              </summary>
              <AnswerTable table={answer.table} />
            </details>
          )
        )}

        {answer.citations.length > 0 && (
          <p className="text-micro text-muted">
            Cited:{' '}
            {answer.citations.map((c, i) => (
              <span key={`${c.episodeId ?? c.label}-${i}`}>
                {i > 0 && ', '}
                {c.episodeId ? (
                  <Link to={`/patient/${encodeURIComponent(c.episodeId)}`} className="text-accent-text hover:underline">
                    {c.label}
                  </Link>
                ) : (
                  c.label
                )}
              </span>
            ))}
          </p>
        )}

        {answer.query && (
          <details className="group">
            <summary className="cursor-pointer text-micro font-medium text-accent-text underline decoration-dotted underline-offset-2">
              <span className="group-open:hidden">Show the query</span>
              <span className="hidden group-open:inline">Hide the query</span>
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-lg border border-line bg-sunken p-3 font-mono text-micro leading-5 text-ink">
              {answer.query}
            </pre>
          </details>
        )}
      </div>
    </Card>
  );
}

function AnswerTable({ table }: { table: NonNullable<AgentAnswer['table']> }) {
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full border-collapse text-micro">
        <thead>
          <tr>
            {table.headers.map((h) => (
              <th key={h} scope="col" className="border-b border-line px-2 py-1 text-left font-semibold text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="border-b border-line px-2 py-1 text-ink">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
