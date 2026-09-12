import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BandDistribution } from '../BandDistribution';
import { CalibrationCurve } from '../CalibrationCurve';
import { CohortDistribution } from '../CohortDistribution';
import { ContributionChart } from '../ContributionChart';
import { IconArray } from '../IconArray';
import { RiskLadder } from '../RiskLadder';
import { ShapeFunction } from '../ShapeFunction';
import { SubscaleMeter } from '../SubscaleMeter';
import { ThresholdTradeoff } from '../ThresholdTradeoff';

/**
 * Two properties per chart, and they are the two that matter clinically.
 *
 * **It has a real accessible name.** A chart labelled "chart" is a chart that is
 * unavailable to anyone using a screen reader, which on a clinical review screen
 * means a clinician cannot do their job with it.
 *
 * **Its empty state says the data is missing.** This is the one that would cause
 * harm: a chart that renders blank when its fetch returned nothing reads as
 * "no contributing factors" or "no patients at risk" rather than "this did not
 * load". Every chart is asserted to say so in words.
 */

const cohortBins = [
  { metric: 'oks_t0_score', binIndex: 0, binStart: 0, binEnd: 12, n: 120, cohortSize: 900, cohortMedian: 18, unit: 'points (0-48)' },
  { metric: 'oks_t0_score', binIndex: 1, binStart: 12, binEnd: 24, n: 500, cohortSize: 900, cohortMedian: 18, unit: 'points (0-48)' },
  { metric: 'oks_t0_score', binIndex: 2, binStart: 24, binEnd: 36, n: 220, cohortSize: 900, cohortMedian: 18, unit: 'points (0-48)' },
  { metric: 'oks_t0_score', binIndex: 3, binStart: 36, binEnd: 48, n: 60, cohortSize: 900, cohortMedian: 18, unit: 'points (0-48)' },
];

const explanationRows = [
  { rank: 1, feature: 'oks_t0_score', featureLabel: 'Overall pre-op Oxford Knee Score', featureValue: 16, contribution: 0.42, direction: 'increases_risk' },
  { rank: 2, feature: 'comorbidity_count', featureLabel: 'Number of long-term conditions', featureValue: 4, contribution: 0.31, direction: 'increases_risk' },
  { rank: 3, feature: 'independent_hospital', featureLabel: 'Treated at an independent-sector provider', featureValue: 1, contribution: -0.23, direction: 'reduces_risk' },
];

const calibrationRows = [
  { curveType: 'calibration', series: '', seriesLabel: 'Calibrated EBM', pointIndex: 0, x: 0.1, y: 0.12, yLower: 0.08, yUpper: 0.17, n: 420, xUnit: 'predicted probability' },
  { curveType: 'calibration', series: '', seriesLabel: 'Calibrated EBM', pointIndex: 1, x: 0.4, y: 0.38, yLower: 0.33, yUpper: 0.44, n: 420, xUnit: 'predicted probability' },
];

const shapeRows = [
  { curveType: 'shape', series: 'comorbidity_count', seriesLabel: 'Number of long-term conditions', pointIndex: 0, x: 0, y: -0.37, yLower: -0.5, yUpper: -0.24, n: 300, xUnit: 'conditions (0-12)' },
  { curveType: 'shape', series: 'comorbidity_count', seriesLabel: 'Number of long-term conditions', pointIndex: 1, x: 4, y: 0.31, yLower: 0.18, yUpper: 0.44, n: 180, xUnit: 'conditions (0-12)' },
];

const thresholdRows = [
  { threshold: 0.2, flaggedPer1000: 610, correctlyFlaggedPer1000: 250, falseAlarmsPer1000: 360, missedPer1000: 60, precision: 0.41, recall: 0.81, isChosen: false },
  { threshold: 0.5, flaggedPer1000: 180, correctlyFlaggedPer1000: 120, falseAlarmsPer1000: 60, missedPer1000: 190, precision: 0.67, recall: 0.39, isChosen: true, rationale: 'Chosen with the clinical team.' },
];

describe('IconArray', () => {
  it('names the frequency in its accessible label', () => {
    render(
      <IconArray probability={0.34} band="moderate" outcomeLabel="would not gain a meaningful improvement" />
    );
    expect(
      screen.getByRole('img', { name: /34 of the 100 are shaded/i })
    ).toBeInTheDocument();
  });

  it('offers the same numbers as a table', () => {
    render(<IconArray probability={0.34} band="moderate" outcomeLabel="would not improve" />);
    expect(screen.getByText('Meaningful improvement')).toBeInTheDocument();
    expect(screen.getByText('66')).toBeInTheDocument();
  });
});

describe('RiskLadder', () => {
  it('states the patient position and the bands in its label', () => {
    render(<RiskLadder probability={0.39} band="moderate" />);
    expect(
      screen.getByRole('img', { name: /marked at 39.0 percent, in the Moderate band/i })
    ).toBeInTheDocument();
  });

  it('says how far the patient is from the next band', () => {
    render(<RiskLadder probability={0.39} band="moderate" />);
    expect(screen.getByText(/1.0 percentage points below the high band/i)).toBeInTheDocument();
  });
});

describe('CohortDistribution', () => {
  it('states the denominator and units in its label', () => {
    render(
      <CohortDistribution
        rows={cohortBins}
        value={16}
        valueLabel="16/48"
        title="Total OKS across the waiting list"
      />
    );
    expect(
      screen.getByRole('img', { name: /900 patients awaiting surgery, x-axis in points \(0-48\)/i })
    ).toBeInTheDocument();
  });

  it('renders an empty state that says the data is missing, not the finding', () => {
    render(<CohortDistribution rows={[]} title="Total OKS across the waiting list" valueLabel="—" />);
    expect(
      screen.getByRole('img', { name: /no data available/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/no cohort distribution has been published/i)).toBeInTheDocument();
  });
});

describe('ContributionChart', () => {
  it('describes every factor and its direction in its label', () => {
    render(<ContributionChart rows={explanationRows} />);
    expect(
      screen.getByRole('img', {
        name: /Number of long-term conditions, value 4, increases risk by 0.31 log-odds/i,
      })
    ).toBeInTheDocument();
  });

  it('translates log-odds into words rather than showing a bare number', () => {
    render(<ContributionChart rows={explanationRows} />);
    expect(
      screen.getAllByText(/multiplies the odds of a poor outcome by about 1.5/i).length
    ).toBeGreaterThan(0);
  });

  it('renders an empty state when no explanation was published', () => {
    render(<ContributionChart rows={[]} />);
    expect(screen.getByRole('img', { name: /Contributing factors: no data available/i })).toBeInTheDocument();
    expect(screen.getByText(/no explanation has been published for this patient/i)).toBeInTheDocument();
  });
});

describe('ShapeFunction', () => {
  it('states the axes and units in its label', () => {
    render(<ShapeFunction rows={shapeRows} patientValue={4} />);
    expect(
      screen.getByRole('img', {
        name: /x-axis in conditions \(0-12\), y-axis in log-odds/i,
      })
    ).toBeInTheDocument();
  });

  it('renders an empty state when the shape function is missing', () => {
    render(<ShapeFunction rows={[]} />);
    expect(screen.getByRole('img', { name: /How this factor moves risk: no data available/i })).toBeInTheDocument();
  });
});

describe('CalibrationCurve', () => {
  it('states the held-out denominator in its label', () => {
    render(<CalibrationCurve rows={calibrationRows} />);
    expect(
      screen.getByRole('img', { name: /840 held-out patients/i })
    ).toBeInTheDocument();
  });

  it('renders an empty state when no calibration was published', () => {
    render(<CalibrationCurve rows={[]} />);
    expect(screen.getByRole('img', { name: /Calibration: no data available/i })).toBeInTheDocument();
  });
});

describe('ThresholdTradeoff', () => {
  it('expresses the trade-off in patients per 1,000 in its label', () => {
    render(<ThresholdTradeoff rows={thresholdRows} />);
    expect(
      screen.getByRole('img', { name: /number per 1,000 patients correctly flagged/i })
    ).toBeInTheDocument();
  });

  it('marks which cut-off is actually in use', () => {
    render(<ThresholdTradeoff rows={thresholdRows} />);
    expect(screen.getByText(/At the cut-off in use \(0.50\)/i)).toBeInTheDocument();
  });

  it('renders an empty state when no threshold analysis exists', () => {
    render(<ThresholdTradeoff rows={[]} />);
    expect(screen.getByRole('img', { name: /Where the cut-off sits: no data available/i })).toBeInTheDocument();
  });
});

describe('BandDistribution', () => {
  it('lists every band and count in its label', () => {
    render(<BandDistribution counts={{ low: 4, moderate: 9, high: 3, very_high: 1 }} total={17} />);
    expect(
      screen.getByRole('img', { name: /4 low, 9 moderate, 3 high, 1 very high/i })
    ).toBeInTheDocument();
  });

  it('renders an empty state when no patients are assigned', () => {
    render(<BandDistribution counts={{}} total={0} />);
    expect(screen.getByRole('img', { name: /Your list by risk band: no data available/i })).toBeInTheDocument();
    expect(screen.getByText(/no patients are assigned to you/i)).toBeInTheDocument();
  });
});

describe('SubscaleMeter', () => {
  it('states the value, the maximum and the direction in its label', () => {
    render(<SubscaleMeter label="Pain" value={2} max={8} median={3} items="pain, night pain" />);
    expect(
      screen.getByRole('img', { name: /Pain: 2 out of 8 points, cohort median 3. Lower is worse/i })
    ).toBeInTheDocument();
  });

  it('says "not recorded" rather than drawing a zero', () => {
    render(<SubscaleMeter label="Pain" max={8} items="pain, night pain" />);
    expect(screen.getByRole('img', { name: /Pain: not recorded for this patient/i })).toBeInTheDocument();
    expect(screen.getByText('not recorded')).toBeInTheDocument();
  });
});
