import axios from 'axios';

// Relative URL — Vite proxy forwards /api/* → localhost:8000, avoiding CORS
const BASE_URL = '';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ── Types ──────────────────────────────────────────────────

export interface ModelMeta {
  name: string;
  display_name: string;
  description: string;
  precision: number;
  recall: number;
  f1: number;
  roc_auc: number;
  pr_auc: number;
  best_params: Record<string, unknown>;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
}

export interface DatasetSummary {
  total_records: number;
  train_samples: number;
  test_samples: number;
  class_0_train: number;
  class_1_train: number;
  class_0_pct: number;
  class_1_pct: number;
  features: number;
  years: string;
  procedure: string;
}

export interface ConfusionMatrixData {
  model: string;
  threshold: number;
  matrix: [[number, number], [number, number]];
  labels: [string, string];
}

export interface PRCurves {
  [modelName: string]: { precision: number[]; recall: number[] };
}

export interface CalibrationData {
  model: string;
  n_bins: number;
  prob_pred: number[];
  prob_true: number[];
  mean_absolute_error: number;
}

export interface ThresholdModelCurves {
  precision: number[];
  recall: number[];
  f1: number[];
  specificity: number[];
  predicted_positive: number[];
}

export interface ThresholdPointMetrics {
  precision: number;
  recall: number;
  f1: number;
  specificity: number;
  predicted_positive: number;
}

export interface ThresholdAnalysis {
  selected_threshold: number;
  thresholds: number[];
  models: Record<string, ThresholdModelCurves>;
  at_threshold: Record<string, ThresholdPointMetrics>;
}

export interface PatientPayload {
  age_band: number;
  gender: number;
  oks_t0_pain: number;
  oks_t0_night_pain: number;
  oks_t0_washing: number;
  oks_t0_transport: number;
  oks_t0_walking: number;
  oks_t0_standing: number;
  oks_t0_limping: number;
  oks_t0_kneeling: number;
  oks_t0_work: number;
  oks_t0_confidence: number;
  oks_t0_shopping: number;
  oks_t0_stairs: number;
  t0_mobility: number;
  t0_self_care: number;
  t0_activity: number;
  t0_discomfort: number;
  t0_anxiety: number;
  t0_symptom_period: number;
  t0_living_arrangements: number;
  t0_assisted: number;
  t0_previous_surgery: number;
  t0_disability: number;
  heart_disease: number;
  high_bp: number;
  stroke: number;
  circulation: number;
  lung_disease: number;
  diabetes: number;
  kidney_disease: number;
  nervous_system: number;
  liver_disease: number;
  cancer: number;
  depression: number;
  arthritis: number;
  university_hospital: number;
  independent_hospital: number;
  region: string;
  model_name: string;
  oks_t0_score?: number;
}

export interface PredictionResult {
  prediction: number;
  probability_good_outcome: number;
  probability_at_risk: number;
  outcome_label: string;
  confidence: string;
  clinical_note: string;
  model_used: string;
  explanation_method?: string | null;
  feature_contributions?: FeatureContribution[];
  baseline_score?: number;
}

export interface FeatureContribution {
  feature: string;
  value: string;
  contribution: number;
  direction: string;
}

// ── API Calls ─────────────────────────────────────────────

export const fetchMetrics = async (): Promise<ModelMeta[]> => {
  const res = await api.get('/api/metrics');
  return res.data.models;
};

export const fetchFeatureImportance = async (): Promise<FeatureImportance[]> => {
  const res = await api.get('/api/feature-importance');
  return res.data.importances;
};

export const fetchDatasetSummary = async (): Promise<DatasetSummary> => {
  const res = await api.get('/api/dataset-summary');
  return res.data;
};

export const fetchConfusionMatrix = async (modelName: string, threshold: number = 0.8): Promise<ConfusionMatrixData> => {
  const res = await api.get(`/api/confusion-matrix/${modelName}`, {
    params: { threshold },
  });
  return res.data;
};

export const fetchPRCurves = async (): Promise<PRCurves> => {
  const res = await api.get('/api/pr-curves');
  return res.data;
};

export const fetchCalibration = async (modelName = 'ebm_model', nBins = 10): Promise<CalibrationData> => {
  const res = await api.get('/api/calibration', { params: { model_name: modelName, n_bins: nBins } });
  return res.data;
};

export const fetchThresholdAnalysis = async (
  selectedThreshold: number,
  minThreshold = 0.1,
  maxThreshold = 0.9,
  step = 0.05,
): Promise<ThresholdAnalysis> => {
  const res = await api.get('/api/threshold-analysis', {
    params: {
      selected_threshold: selectedThreshold,
      min_threshold: minThreshold,
      max_threshold: maxThreshold,
      step,
    },
  });
  return res.data;
};

export const fetchSyntheticPatient = async (): Promise<PatientPayload> => {
  const res = await api.get('/api/synthetic-patient');
  return res.data;
};

export const predict = async (patient: PatientPayload): Promise<PredictionResult> => {
  const res = await api.post('/api/predict', patient);
  return res.data;
};

export interface ExplanationRequest {
  probability_at_risk: number;
  outcome_label: string;
  top_features: FeatureContribution[];
}

export interface ExplanationResponse {
  clinical: string;
  patient: string;
}

export const fetchAIExplanation = async (req: ExplanationRequest): Promise<ExplanationResponse> => {
  const res = await api.post('/api/explain', req, { timeout: 30000 });
  return res.data;
};
