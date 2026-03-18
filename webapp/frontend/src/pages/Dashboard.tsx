import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from 'recharts';
import {
  fetchMetrics, fetchFeatureImportance, fetchConfusionMatrix, fetchPRCurves,
  fetchDatasetSummary,
  type ModelMeta, type FeatureImportance, type ConfusionMatrixData, type PRCurves, type DatasetSummary,
} from '../utils/api';
import { MetricCard } from '../components/MetricCard';
import { ConfusionMatrix } from '../components/ConfusionMatrix';

const MODEL_COLORS: Record<string, string> = {
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
  const [selectedModel, setSelectedModel] = useState('random_forest_tuned');
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
    ])
      .then(([m, fi, ds, pr]) => {
        setModels(m);
        setImportances(fi);
        setSummary(ds);
        setPrCurves(pr);
        setLoading(false);
      })
      .catch(err => {
        setError('Could not connect to the API. Make sure the backend is running on port 8000.');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchConfusionMatrix(selectedModel).then(setCm).catch(() => {});
  }, [selectedModel]);

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

  const bestModel = models.find(m => m.name === 'random_forest_tuned');

  const pieData = summary
    ? [
        { name: 'Good Outcome (Class 0)', value: summary.class_0_train },
        { name: 'At Risk (Class 1)', value: summary.class_1_train },
      ]
    : [];

  const prData = prCurves
    ? prCurves['random_forest_tuned']?.recall.map((r: number, i: number) => ({
        recall: r,
        rf: prCurves['random_forest_tuned']?.precision[i],
        lr: prCurves['lr_no_weights']?.precision[i],
      }))
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
            Test set performance metrics for all four trained models. Data from
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
              label="Best ROC-AUC (RF Tuned)"
              value={bestModel ? bestModel.roc_auc.toFixed(3) : '–'}
              subtitle="Random Forest with GridSearchCV"
              variant="green"
              icon="🏆"
            />
            <MetricCard
              label="Best PR-AUC (RF Tuned)"
              value={bestModel ? bestModel.pr_auc.toFixed(3) : '–'}
              subtitle="Precision-Recall Area Under Curve"
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
                      {m.name === 'random_forest_tuned' && (
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

          {/* Charts row */}
          <div className="nhs-grid nhs-grid--2" style={{ marginBottom: '2rem' }}>

            {/* Feature importance */}
            <div className="nhs-chart-card">
              <div className="nhs-chart-card__title">
                Feature Importance — Random Forest (Top 15)
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
                Confusion Matrix — Test Set (26,477 patients)
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

          {/* PR curves */}
          <div className="nhs-chart-card">
            <div className="nhs-chart-card__title">Precision-Recall Curves</div>
            <p style={{ fontSize: '0.875rem', color: 'var(--nhs-mid-grey)', marginBottom: '1rem' }}>
              RF Tuned vs LR No Weights. Higher area under curve = better model performance for the at-risk class.
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
                <Line
                  type="monotone"
                  dataKey="rf"
                  name="RF Tuned (PR-AUC 0.396)"
                  stroke="#003087"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="lr"
                  name="LR No Weights (PR-AUC 0.383)"
                  stroke="#41B6E6"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                />
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
