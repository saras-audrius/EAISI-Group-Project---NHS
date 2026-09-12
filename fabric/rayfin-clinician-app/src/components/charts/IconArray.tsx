import { ChartFrame } from './ChartFrame';
import { bandMarkVar } from './chartUtils';

interface IconArrayProps {
  probability: number;
  band: string;
  /** What the filled icons represent, e.g. "would not gain a meaningful improvement". */
  outcomeLabel: string;
}

const COLUMNS = 10;
const ROWS = 10;
const CELL = 20;
const RADIUS = 7;

/**
 * One hundred patients, of whom N are shaded.
 *
 * This is the headline number and it is deliberately not a percentage on its
 * own. Gigerenzer's natural-frequency finding is the reason: "34 in 100" is
 * understood by people a "34% probability" defeats, and low numeracy is common
 * in exactly the pre-operative conversation this screen is meant to support.
 * Spiegelhalter's position — that both formats are needed, not one — is why the
 * percentage sits beside the array rather than instead of it.
 *
 * The icons are dots, not human figures. The Predict: Breast Cancer redevelopment
 * found patients reported human-shaped icons as upsetting when the outcome was
 * bad, and an abstract mark communicates the same frequency without that cost.
 *
 * The shaded dots are contiguous from the top left, which makes the proportion
 * readable by area as well as by count; scattering them would look more "random"
 * and be measurably harder to estimate.
 */
export function IconArray({ probability, band, outcomeLabel }: IconArrayProps) {
  const filled = Math.round(probability * 100);
  const width = COLUMNS * CELL;
  const height = ROWS * CELL;

  return (
    <ChartFrame
      title="Icon array"
      caption={`Of 100 patients with a similar pre-operative profile, about ${filled} ${outcomeLabel}. The other ${100 - filled} would.`}
      denominator="Denominator: 100 hypothetical patients matched on the model's inputs. It is a statement about a group, not a verdict on this patient."
      ariaLabel={`Icon array of 100 dots. ${filled} of the 100 are shaded, representing ${filled} in 100 patients with a similar profile who ${outcomeLabel}.`}
      table={{
        headers: ['Outcome', 'Patients in 100'],
        rows: [
          [`Poor outcome — ${outcomeLabel}`, filled],
          ['Meaningful improvement', 100 - filled],
        ],
      }}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full max-w-[220px]"
        preserveAspectRatio="xMinYMin meet"
      >
        {Array.from({ length: ROWS * COLUMNS }, (_, i) => {
          const isFilled = i < filled;
          const cx = (i % COLUMNS) * CELL + CELL / 2;
          const cy = Math.floor(i / COLUMNS) * CELL + CELL / 2;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={RADIUS}
              fill={isFilled ? bandMarkVar(band) : 'var(--mf-chart-grid)'}
              stroke={isFilled ? bandMarkVar(band) : 'var(--mf-chart-neutral)'}
              strokeWidth={1}
            />
          );
        })}
      </svg>
    </ChartFrame>
  );
}
