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
      <div style={{ overflowX: 'auto' }}>
        <table className="nhs-table" style={{ width: '100%', marginBottom: 0 }}>
          <thead>
            <tr>
              <th style={{ minWidth: '170px' }}>Actual \ Predicted</th>
              <th style={{ textAlign: 'center' }}>{labels[0]}</th>
              <th style={{ textAlign: 'center' }}>{labels[1]}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>{labels[0]}</th>
              <td style={{ background: '#DFFBE8', textAlign: 'center' }}>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#003B14' }}>{fmt(tn)}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--nhs-mid-grey)' }}>True Negative</div>
                <div style={{ fontSize: '0.75rem', color: '#005B21', fontWeight: 700 }}>{pct(tn)}</div>
              </td>
              <td style={{ background: '#FFF3CC', textAlign: 'center' }}>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#7A4700' }}>{fmt(fp)}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--nhs-mid-grey)' }}>False Positive</div>
                <div style={{ fontSize: '0.75rem', color: '#B85C00', fontWeight: 700 }}>{pct(fp)}</div>
              </td>
            </tr>
            <tr>
              <th>{labels[1]}</th>
              <td style={{ background: '#FBE3E4', textAlign: 'center' }}>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#8B0000' }}>{fmt(fn)}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--nhs-mid-grey)' }}>False Negative</div>
                <div style={{ fontSize: '0.75rem', color: '#8B0000', fontWeight: 700 }}>{pct(fn)}</div>
              </td>
              <td style={{ background: '#DFFBE8', textAlign: 'center' }}>
                <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#003B14' }}>{fmt(tp)}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--nhs-mid-grey)' }}>True Positive</div>
                <div style={{ fontSize: '0.75rem', color: '#005B21', fontWeight: 700 }}>{pct(tp)}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '1rem', fontSize: '0.8125rem', color: 'var(--nhs-mid-grey)', lineHeight: 1.5 }}>
        <strong>Interpreting this matrix:</strong> Green cells = correct predictions (TN + TP).
        The at-risk class (Class 1) has high precision but very low recall — the model is
        conservative, flagging fewer patients as at-risk but more accurately when it does.
      </div>
    </div>
  );
}
