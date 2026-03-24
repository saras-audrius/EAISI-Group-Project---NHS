import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from 'recharts';
import {
  fetchMetrics, fetchFeatureImportance, fetchConfusionMatrix, fetchPRCurves,
  fetchDatasetSummary, fetchThresholdAnalysis, fetchCalibration,
  type ModelMeta, type FeatureImportance, type ConfusionMatrixData, type PRCurves, type DatasetSummary,
  type ThresholdAnalysis, type CalibrationData,
} from '../utils/api';
import { MetricCard } from '../components/MetricCard';
import { ConfusionMatrix } from '../components/ConfusionMatrix';

const MODEL_COLORS: Record<string, string> = {
  ebm_model:           '#007F3B',
  random_forest_tuned: '#003087',
  lr_no_weights:       '#005EB8',
  lr_lasso_l1:         '#0072CE',
  lr_smote:            '#41B6E6',
};

const PIE_COLORS = ['#009639', '#DA291C'];

export function Dashboard() {
  const [models, setModels] = useState<ModelMeta[]>([]);
  const [importances, setImportances] = useState<FeatureImportance[]>([]);
  const [cm, setCm] = useState<ConfusionMatrixData | null>(null);
  const [prCurves, setPrCurves] = useState<PRCurves | null>(null);
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [thresholdAnalysis, setThresholdAnalysis] = useState<ThresholdAnalysis | null>(null);
  const [calibration, setCalibration] = useState<CalibrationData | null>(null);
  const [selectedThreshold, setSelectedThreshold] = useState(0.8);
  const [selectedModel, setSelectedModel] = useState('ebm_model');
  const [sortField, setSortField] = useState<keyof ModelMeta>('roc_auc');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetchMetrics(),
      fetchFeatureImportance(),
      fetchDatasetSummary(),
      fetchPRCurves(),
      fetchCalibration(),
    ])
      .then(([m, fi, ds, pr, cal]) => {
        setModels(m);
        setImportances(fi);
        setSummary(ds);
        setPrCurves(pr);
        setCalibration(cal);
        setLoading(false);
      })
      .catch(err => {
        setError('Could not connect to the API. Make sure the backend is running on port 8000.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchConfusionMatrix(selectedModel, selectedThreshold).then(setCm).catch(() => {});
  }, [selectedModel, selectedThreshold]);

  useEffect(() => {
    fetchThresholdAnalysis(selectedThreshold)
      .then(setThresholdAnalysis)
      .catch(() => {});
  }, [selectedThreshold]);

  const handleSort = (field: keyof ModelMeta) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortedModels = [...models].sort((a, b) => {
    const av = a[sortField] as number;
    const bv = b[sortField] as number;
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  const bestModel = models.length
    ? [...models].sort((a, b) => b.pr_auc - a.pr_auc)[0]
    : undefined;

  const pieData = summary
    ? [
        { name: 'Good Outcome (Class 0)', value: summary.class_0_train },
        { name: 'At Risk (Class 1)', value: summary.class_1_train },
      ]
    : [];

  const prModelNames = models
    .map(m => m.name)
    .filter(name => !!prCurves?.[name]);

  const prData = prCurves && prModelNames.length > 0
    ? prCurves[prModelNames[0]].recall.map((_: number, i: number) => {
        const point: Record<string, number> = {
          recall: prCurves[prModelNames[0]].recall[i],
        };
        prModelNames.forEach(name => {
          point[name] = prCurves[name].precision[i];
        });
        return point;
      })
    : [];

  const thresholdModelNames = models
    .map(m => m.name)
    .filter(name => !!thresholdAnalysis?.models?.[name]);

  const thresholdPrecisionData = thresholdAnalysis && thresholdModelNames.length > 0
    ? thresholdAnalysis.thresholds.map((threshold, i) => {
        const point: Record<string, number | string> = {
          threshold,
          thresholdLabel: threshold.toFixed(2),
        };
        thresholdModelNames.forEach(name => {
          point[name] = thresholdAnalysis.models[name].precision[i];
        });
        return point;
      })
    : [];

  if (loading) {
    return (
      <main className="nhs-main">
        <div className="nhs-spinner">
          <div className="nhs-spinner__ring" />
          Loading dashboard data...
        </div>
      </main>
    );
  }

  return (
    <main className="nhs-main">
      <div className="nhs-page-header">
        <div className="nhs-page-header__inner">
          <h1 className="nhs-page-header__title">Model Performance Dashboard</h1>
          <p className="nhs-page-header__lead">
            Test set performance metrics for all trained models including EBM. Data from
            {summary ? ` ${summary.train_samples.toLocaleString()} training` : ''} and
            {summary ? ` ${summary.test_samples.toLocaleString()} test` : ''} patients.
          </p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '1.5rem' }}>
          <div className="nhs-warning-callout">
            <div className="nhs-warning-callout__title"><span>⚠️</span> API Connection Error</div>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* KPI row */}
      <section className="nhs-section nhs-section--grey">
        <div className="nhs-section__inner">
          <div className="nhs-grid nhs-grid--4">
            <MetricCard
              label="Best ROC-AUC"
              value={bestModel ? bestModel.roc_auc.toFixed(3) : '–'}
              subtitle={bestModel ? bestModel.display_name : 'Highest discrimination'}
              variant="green"
              icon="🏆"
            />
            <MetricCard
              label="Best PR-AUC"
              value={bestModel ? bestModel.pr_auc.toFixed(3) : '–'}
              subtitle={bestModel ? bestModel.display_name : 'Precision-Recall Area Under Curve'}
              variant="default"
              icon="📈"
            />
            <MetricCard
              label="Training Samples"
              value={summary ? summary.train_samples.toLocaleString() : '–'}
              subtitle="80% stratified split"
              icon="🗃️"
            />
            <MetricCard
              label="Test Samples"
              value={summary ? summary.test_samples.toLocaleString() : '–'}
              subtitle="Held-out evaluation set"
              icon="🔬"
            />
          </div>
        </div>
      </section>

      <section className="nhs-section">
        <div className="nhs-section__inner">

          {/* Model comparison table */}
          <h2 className="nhs-section__title">Model Comparison</h2>
          <p className="nhs-section__lead">
            Click column headers to sort. Metrics for the at-risk minority class (Class 1).
          </p>
          <div className="nhs-table__wrapper mb-4">
            <table className="nhs-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('display_name' as keyof ModelMeta)}>Model ⇅</th>
                  <th onClick={() => handleSort('roc_auc')}>ROC-AUC ⇅</th>
                  <th onClick={() => handleSort('pr_auc')}>PR-AUC ⇅</th>
                  <th onClick={() => handleSort('precision')}>Precision (Class 1) ⇅</th>
                  <th onClick={() => handleSort('recall')}>Recall (Class 1) ⇅</th>
                  <th onClick={() => handleSort('f1')}>F1 (Class 1) ⇅</th>
                </tr>
              </thead>
              <tbody>
                {sortedModels.map(m => (
                  <tr key={m.name}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{m.display_name}</div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--nhs-mid-grey)' }}>{m.description}</div>
                      {bestModel && m.name === bestModel.name && (
                        <span className="nhs-tag nhs-tag--green" style={{ marginTop: '0.25rem' }}>Best model</span>
                      )}
                    </td>
                    <td><strong>{m.roc_auc.toFixed(3)}</strong></td>
                    <td>{m.pr_auc.toFixed(3)}</td>
                    <td>{(m.precision * 100).toFixed(1)}%</td>
                    <td>{(m.recall * 100).toFixed(1)}%</td>
                    <td>{m.f1.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Threshold analysis */}
          <div className="nhs-chart-card mb-4">
            <div className="nhs-chart-card__title">Threshold Explorer</div>
            <p style={{ fontSize: '0.875rem', color: 'var(--nhs-mid-grey)', marginBottom: '0.75rem' }}>
              Compare models at threshold 0.8 or choose another threshold to see precision movement.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <label style={{ fontWeight: 600, minWidth: '180px' }}>
                Selected threshold: {selectedThreshold.toFixed(2)}
              </label>
              <input
                type="range"
                min={0.1}
                max={0.9}
                step={0.05}
                value={selectedThreshold}
                onChange={e => setSelectedThreshold(Number(e.target.value))}
                style={{ width: '280px' }}
              />
              <button className="nhs-btn nhs-btn--secondary" onClick={() => setSelectedThreshold(0.8)}>
                Reset to 0.80
              </button>
            </div>

            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={thresholdPrecisionData} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="thresholdLabel" label={{ value: 'Threshold', position: 'insideBottom', offset: -2, fontSize: 12 }} tick={{ fontSize: 11 }} />
                <YAxis label={{ value: 'Precision', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12 }} tick={{ fontSize: 11 }} domain={[0, 1]} />
                <Tooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} contentStyle={{ fontSize: '0.875rem' }} />
                <Legend wrapperStyle={{ fontSize: '0.875rem', paddingTop: '0.5rem' }} />
                {models
                  .filter(m => thresholdModelNames.includes(m.name))
                  .map(m => (
                    <Line
                      key={`precision-${m.name}`}
                      type="monotone"
                      dataKey={m.name}
                      name={`${m.display_name} Precision`}
                      stroke={MODEL_COLORS[m.name] || '#005EB8'}
                      strokeWidth={m.name === (bestModel?.name ?? '') ? 2.75 : 2}
                      dot={false}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>

            <div className="nhs-table__wrapper" style={{ marginTop: '1rem' }}>
              <table className="nhs-table">
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Precision</th>
                    <th>Recall</th>
                    <th>F1</th>
                    <th>Specificity</th>
                    <th>Predicted Positives</th>
                  </tr>
                </thead>
                <tbody>
                  {models
                    .filter(m => thresholdAnalysis?.at_threshold?.[m.name])
                    .map(m => {
                      const at = thresholdAnalysis?.at_threshold?.[m.name];
                      if (!at) {
                        return null;
                      }
                      return (
                        <tr key={`at-threshold-${m.name}`}>
                          <td>{m.display_name}</td>
                          <td>{(at.precision * 100).toFixed(1)}%</td>
                          <td>{(at.recall * 100).toFixed(1)}%</td>
                          <td>{at.f1.toFixed(3)}</td>
                          <td>{(at.specificity * 100).toFixed(1)}%</td>
                          <td>{at.predicted_positive.toLocaleString()}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Charts row */}
          <div className="nhs-grid nhs-grid--2" style={{ marginBottom: '2rem' }}>

            {/* Feature importance */}
            <div className="nhs-chart-card">
              <div className="nhs-chart-card__title">
                Feature Importance — EBM Global Importance (Top 15)
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  layout="vertical"
                  data={importances.slice(0, 15)}
                  margin={{ left: 8, right: 20, top: 4, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    dataKey="feature"
                    type="category"
                    width={170}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(v: number) => [v.toFixed(4), 'Importance']}
                    contentStyle={{ fontSize: '0.875rem' }}
                  />
                  <Bar dataKey="importance" fill="#003087" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Class distribution pie */}
            <div className="nhs-chart-card">
              <div className="nhs-chart-card__title">Training Set — Class Distribution</div>
              {summary && (
                <>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => v.toLocaleString()} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="nhs-warning-callout" style={{ marginTop: '0.75rem' }}>
                    <div className="nhs-warning-callout__title">
                      <span>⚠️</span> Class imbalance: 82% / 18%
                    </div>
                    <p style={{ fontSize: '0.875rem', margin: 0 }}>
                      Standard accuracy is misleading. Precision-Recall AUC is the primary metric.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Confusion matrix */}
          <div className="nhs-chart-card mb-4">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div className="nhs-chart-card__title" style={{ marginBottom: 0 }}>
                Confusion Matrix — Threshold {selectedThreshold.toFixed(2)} (26,477 patients)
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600 }}>Model:</label>
                <select
                  className="nhs-select"
                  style={{ width: 'auto', padding: '0.375rem 2rem 0.375rem 0.625rem' }}
                  value={selectedModel}
                  onChange={e => setSelectedModel(e.target.value)}
                >
                  {models.map(m => (
                    <option key={m.name} value={m.name}>{m.display_name}</option>
                  ))}
                </select>
              </div>
            </div>
            {cm ? (
              <ConfusionMatrix matrix={cm.matrix as [[number,number],[number,number]]} labels={cm.labels as [string,string]} />
            ) : (
              <div className="nhs-spinner"><div className="nhs-spinner__ring" /></div>
            )}
          </div>

          {/* Calibration curve */}
          {calibration && (() => {
            const calData = calibration.prob_pred.map((pred, i) => ({
              predicted: Math.round(pred * 100),
              actual: Math.round(calibration.prob_true[i] * 100),
              perfect: Math.round(pred * 100),
            }));
            const mace = calibration.mean_absolute_error;
            return (
              <div className="nhs-chart-card mb-4">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <div className="nhs-chart-card__title" style={{ marginBottom: 0 }}>
                    Calibration Curve — EBM (test set, {calibration.n_bins} bins)
                  </div>
                  <span
                    className="nhs-tag nhs-tag--green"
                    title="Mean Absolute Calibration Error — lower is better. Below 0.01 is considered well-calibrated."
                  >
                    MACE {mace.toFixed(4)}
                  </span>
                </div>
                <p style={{ fontSize: '0.875rem', color: 'var(--nhs-mid-grey)', marginBottom: '1rem' }}>
                  Each dot shows the actual positive rate for patients in that predicted-probability bin.
                  Points on the diagonal mean the model's probabilities are accurate.
                  A MACE of {mace.toFixed(4)} means the predicted probability is off by only{' '}
                  <strong>{(mace * 100).toFixed(2)} percentage points</strong> on average — well-calibrated.
                </p>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={calData} margin={{ left: 0, right: 20, top: 8, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="predicted"
                      label={{ value: 'Mean predicted probability (%)', position: 'insideBottom', offset: -12, fontSize: 12 }}
                      tick={{ fontSize: 11 }}
                      domain={[0, 100]}
                    />
                    <YAxis
                      label={{ value: 'Actual positive rate (%)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12 }}
                      tick={{ fontSize: 11 }}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      formatter={(v: number, name: string) => [`${v}%`, name === 'actual' ? 'EBM (actual rate)' : 'Perfect calibration']}
                      contentStyle={{ fontSize: '0.875rem' }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '0.875rem', paddingTop: '0.5rem' }}
                      formatter={(value) => value === 'actual' ? 'EBM (actual rate)' : 'Perfect calibration'}
                    />
                    <Line
                      type="monotone"
                      dataKey="perfect"
                      stroke="#aaa"
                      strokeWidth={1.5}
                      strokeDasharray="5 4"
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="#007F3B"
                      strokeWidth={2.5}
                      dot={{ r: 5, fill: '#007F3B' }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <div className="nhs-inset" style={{ marginTop: '1rem' }}>
                  <strong>How to read this:</strong> If the EBM predicts 80% probability of poor outcome,
                  the calibration curve shows whether ~80% of those patients actually had a poor outcome.
                  The green line hugging the grey diagonal confirms the model's probabilities can be trusted
                  as genuine clinical risk estimates — not just rankings.
                </div>
              </div>
            );
          })()}

          {/* PR curves */}
          <div className="nhs-chart-card">
            <div className="nhs-chart-card__title">Precision-Recall Curves — Operating Point at Threshold {selectedThreshold.toFixed(2)}</div>
            <p style={{ fontSize: '0.875rem', color: 'var(--nhs-mid-grey)', marginBottom: '1rem' }}>
              Comparison across all models. The curves show performance across all thresholds. Current operating point (threshold {selectedThreshold.toFixed(2)}) metrics are shown in the Threshold Explorer table above. Each point on the curves represents a different classification threshold.
            </p>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={prData} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="recall" label={{ value: 'Recall', position: 'insideBottom', offset: -2, fontSize: 12 }} tick={{ fontSize: 11 }} />
                <YAxis label={{ value: 'Precision', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12 }} tick={{ fontSize: 11 }} domain={[0, 1]} />
                <Tooltip
                  formatter={(v: number) => v.toFixed(3)}
                  contentStyle={{ fontSize: '0.875rem' }}
                />
                <Legend wrapperStyle={{ fontSize: '0.875rem', paddingTop: '0.5rem' }} />
                {models
                  .filter(m => prModelNames.includes(m.name))
                  .map(m => (
                    <Line
                      key={m.name}
                      type="monotone"
                      dataKey={m.name}
                      name={`${m.display_name} (PR-AUC ${m.pr_auc.toFixed(3)})`}
                      stroke={MODEL_COLORS[m.name] || '#005EB8'}
                      strokeWidth={m.name === (bestModel?.name ?? '') ? 2.75 : 2}
                      strokeDasharray={m.name === (bestModel?.name ?? '') ? undefined : '5 4'}
                      dot={false}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
            <div className="nhs-inset" style={{ marginTop: '1rem' }}>
              <strong>Reading the PR curve:</strong> Each point represents a different
              classification threshold. Moving left to right increases recall (catching more
              at-risk patients) but typically decreases precision (more false alarms).
              The area under this curve (PR-AUC) summarises overall model utility for
              the minority class.
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}
