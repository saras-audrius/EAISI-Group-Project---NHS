import React from 'react';

interface Props {
  matrix: [[number, number], [number, number]];
  labels: [string, string];
}

export function ConfusionMatrix({ matrix, labels }: Props) {
  const [[tn, fp], [fn, tp]] = matrix;
  const total = tn + fp + fn + tp;

  const pct = (n: number) => `${((n / total) * 100).toFixed(1)}%`;
  const fmt = (n: number) => n.toLocaleString();

  return (
    <div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '100px 1fr 1fr',
        gap: '4px',
        fontSize: '0.875rem',
      }}>
        {/* Header row */}
        <div />
        <div style={{ textAlign: 'center', padding: '0.5rem', fontWeight: 600, color: 'var(--nhs-dark-grey)' }}>
          Predicted: {labels[0]}
        </div>
        <div style={{ textAlign: 'center', padding: '0.5rem', fontWeight: 600, color: 'var(--nhs-dark-grey)' }}>
          Predicted: {labels[1]}
        </div>

        {/* Row 1: Actual Class 0 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          fontWeight: 600,
          color: 'var(--nhs-dark-grey)',
          padding: '0.5rem',
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          textAlign: 'center',
          gridRow: '2 / 4',
        }}>
          Actual Class
        </div>
        <div style={{ textAlign: 'center', fontWeight: 600, color: 'var(--nhs-dark-grey)', padding: '0.5rem' }}>
          Actual: {labels[0]}
        </div>
        <div />

        {/* TN */}
        <div className="nhs-cm-cell nhs-cm-cell--tn" style={{
          background: '#DFFBE8',
          borderRadius: '4px',
          padding: '1rem',
          textAlign: 'center',
        }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, display: 'block', color: '#003B14' }}>
            {fmt(tn)}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--nhs-mid-grey)' }}>True Negative</span>
          <span style={{ fontSize: '0.75rem', color: '#005B21', fontWeight: 600 }}>{pct(tn)}</span>
        </div>
        {/* FP */}
        <div style={{
          background: '#FFF3CC',
          borderRadius: '4px',
          padding: '1rem',
          textAlign: 'center',
        }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, display: 'block', color: '#7A4700' }}>
            {fmt(fp)}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--nhs-mid-grey)' }}>False Positive</span>
          <span style={{ fontSize: '0.75rem', color: '#B85C00', fontWeight: 600 }}>{pct(fp)}</span>
        </div>

        {/* Row 2: Actual Class 1 */}
        <div style={{ textAlign: 'center', fontWeight: 600, color: 'var(--nhs-dark-grey)', padding: '0.5rem' }}>
          Actual: {labels[1]}
        </div>
        <div />
        {/* FN */}
        <div style={{
          background: '#FBE3E4',
          borderRadius: '4px',
          padding: '1rem',
          textAlign: 'center',
        }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, display: 'block', color: '#8B0000' }}>
            {fmt(fn)}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--nhs-mid-grey)' }}>False Negative</span>
          <span style={{ fontSize: '0.75rem', color: '#8B0000', fontWeight: 600 }}>{pct(fn)}</span>
        </div>
        {/* TP */}
        <div style={{
          background: '#DFFBE8',
          borderRadius: '4px',
          padding: '1rem',
          textAlign: 'center',
        }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, display: 'block', color: '#003B14' }}>
            {fmt(tp)}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--nhs-mid-grey)' }}>True Positive</span>
          <span style={{ fontSize: '0.75rem', color: '#005B21', fontWeight: 600 }}>{pct(tp)}</span>
        </div>
      </div>

      <div style={{ marginTop: '1rem', fontSize: '0.8125rem', color: 'var(--nhs-mid-grey)', lineHeight: 1.5 }}>
        <strong>Interpreting this matrix:</strong> Green cells = correct predictions (TN + TP).
        The at-risk class (Class 1) has high precision but very low recall — the model is
        conservative, flagging fewer patients as at-risk but more accurately when it does.
      </div>
    </div>
  );
}
