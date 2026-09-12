import { describe, expect, it } from 'vitest';

import { RISK_BANDS } from '@/clinical';

import {
  fixtureCohortStats,
  fixtureExplanation,
  fixtureLogOdds,
  fixtureModelCard,
  fixtureModelCurves,
  fixturePatients,
  fixtureThresholdOptions,
} from '../fixtures';

/**
 * The offline demo is only useful if it is internally honest.
 *
 * These assert the properties a reviewer would otherwise have to take on trust:
 * that the explanation is the score's own arithmetic, that the bands match the
 * probabilities, that the histograms count the cohort they claim to, and that
 * the data is flagged as synthetic. If any of them fails, the demo is teaching
 * something false about how the real app works.
 */
describe('fixture cohort', () => {
  it('declares itself synthetic', () => {
    expect(fixtureModelCard.datasetIsSynthetic).toBe(true);
    expect(fixtureModelCard.dataSource).toMatch(/synthetic/i);
  });

  it('produces a stable cohort with a spread of bands', () => {
    expect(fixturePatients.length).toBeGreaterThan(10);
    const bands = new Set(fixturePatients.map((p) => p.riskBand));
    expect(bands.size).toBeGreaterThan(1);
  });

  it('gives every patient a band that matches their probability', () => {
    for (const p of fixturePatients) {
      const band = RISK_BANDS.find((b) => b.key === p.riskBand);
      expect(band, `unknown band ${p.riskBand}`).toBeDefined();
      expect(p.riskPoorOutcome).toBeGreaterThanOrEqual(band!.from);
      expect(p.riskPoorOutcome).toBeLessThanOrEqual(band!.to);
    }
  });

  it('is sorted highest risk first, as the clinician list expects', () => {
    const risks = fixturePatients.map((p) => p.riskPoorOutcome);
    expect([...risks].sort((a, b) => b - a)).toEqual(risks);
  });
});

describe('explanation arithmetic', () => {
  it('sums, with the intercept, back to the score', () => {
    for (const patient of fixturePatients) {
      const parts = fixtureLogOdds(patient.episodeId);
      expect(parts).not.toBeNull();
      const logit = parts!.intercept + parts!.sum;
      const reconstructed = 1 / (1 + Math.exp(-logit));
      expect(reconstructed).toBeCloseTo(patient.riskPoorOutcome, 10);
    }
  });

  it('shows the six largest terms, ranked by absolute contribution', () => {
    const rows = fixtureExplanation(fixturePatients[0].episodeId);
    expect(rows).toHaveLength(6);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6]);
    const magnitudes = rows.map((r) => Math.abs(r.contribution));
    expect([...magnitudes].sort((a, b) => b - a)).toEqual(magnitudes);
  });

  it('labels direction consistently with the sign', () => {
    for (const row of fixtureExplanation(fixturePatients[0].episodeId)) {
      expect(row.direction).toBe(row.contribution > 0 ? 'increases_risk' : 'reduces_risk');
    }
  });

  it('returns nothing for an episode id that is not in the cohort', () => {
    expect(fixtureExplanation('not-a-real-episode')).toEqual([]);
  });
});

describe('cohort distributions', () => {
  it('publishes every metric the patient page plots', () => {
    const metrics = new Set(fixtureCohortStats.map((s) => s.metric));
    for (const m of [
      'risk_poor_outcome',
      'oks_t0_score',
      'oks_pain_subscale',
      'oks_function_subscale',
      'oks_adl_subscale',
      'comorbidity_count',
    ]) {
      expect(metrics.has(m), `missing ${m}`).toBe(true);
    }
  });

  it('states a denominator that its bins do not exceed', () => {
    const byMetric = new Map<string, typeof fixtureCohortStats>();
    for (const row of fixtureCohortStats) {
      byMetric.set(row.metric, [...(byMetric.get(row.metric) ?? []), row]);
    }
    for (const [metric, rows] of byMetric) {
      const summed = rows.reduce((a, r) => a + r.n, 0);
      // Suppressed bins are written as zero, so the sum is at most the cohort.
      expect(summed, metric).toBeLessThanOrEqual(rows[0].cohortSize);
      expect(rows[0].unit, metric).not.toBe('');
    }
  });
});

describe('model artefacts', () => {
  it('publishes a calibration curve with an interval on every point', () => {
    const calibration = fixtureModelCurves.filter((c) => c.curveType === 'calibration');
    expect(calibration.length).toBe(10);
    for (const point of calibration) {
      expect(point.yLower).toBeLessThanOrEqual(point.y);
      expect(point.yUpper).toBeGreaterThanOrEqual(point.y);
      expect(point.n).toBeGreaterThan(0);
    }
  });

  it('publishes a shape function for every feature that can appear in an explanation', () => {
    const explained = new Set(
      fixturePatients.flatMap((p) => fixtureExplanation(p.episodeId).map((r) => r.feature))
    );
    const shapes = new Set(
      fixtureModelCurves.filter((c) => c.curveType === 'shape').map((c) => c.series)
    );
    for (const feature of explained) {
      expect(shapes.has(feature), `no shape function for ${feature}`).toBe(true);
    }
  });

  it('marks exactly one threshold as the one in use, and gives its rationale', () => {
    const chosen = fixtureThresholdOptions.filter((t) => t.isChosen);
    expect(chosen).toHaveLength(1);
    expect(chosen[0].rationale).toBeTruthy();
  });

  it('keeps the threshold counts internally consistent', () => {
    for (const t of fixtureThresholdOptions) {
      expect(t.correctlyFlaggedPer1000 + t.falseAlarmsPer1000).toBe(t.flaggedPer1000);
    }
  });

  it('trades recall for precision monotonically as the cut-off rises', () => {
    const sorted = [...fixtureThresholdOptions].sort((a, b) => a.threshold - b.threshold);
    for (let i = 1; i < sorted.length; i += 1) {
      expect(sorted[i].flaggedPer1000).toBeLessThanOrEqual(sorted[i - 1].flaggedPer1000);
      expect(sorted[i].missedPer1000).toBeGreaterThanOrEqual(sorted[i - 1].missedPer1000);
    }
  });
});
