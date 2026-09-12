import { useTheme, type ThemePreference } from '@/hooks/useTheme';

const OPTIONS: { value: ThemePreference; label: string; title: string }[] = [
  { value: 'light', label: 'Light', title: 'Always light' },
  { value: 'system', label: 'Auto', title: 'Follow the operating system' },
  { value: 'dark', label: 'Dark', title: 'Always dark' },
];

/**
 * A three-way segmented control rather than a moon icon.
 *
 * A single toggle cannot express "follow the system", and an icon-only control
 * cannot say which of the two states it is currently in without the user
 * clicking it to find out. This is a `radiogroup`, so it announces its current
 * value and arrows between options.
 */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="inline-flex rounded border border-line bg-elevated p-0.5"
    >
      {OPTIONS.map((option) => {
        const active = preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.title}
            onClick={() => setPreference(option.value)}
            className={`rounded px-2 py-0.5 text-micro font-medium transition-colors ${
              active
                ? 'bg-accent text-accent-fg'
                : 'text-muted hover:bg-sunken hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
