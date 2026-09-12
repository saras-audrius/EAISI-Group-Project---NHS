import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'mf-theme';

function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

function readStored(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    // Private browsing throws on access rather than returning null.
    return 'system';
  }
}

function apply(preference: ThemePreference): void {
  const dark = preference === 'dark' || (preference === 'system' && systemPrefersDark());
  document.documentElement.classList.toggle('dark', dark);
}

/**
 * Theme preference, persisted.
 *
 * Three states rather than two: `system` is a real choice, and a clinician whose
 * laptop switches to dark at 18:00 should not have to re-toggle an app that
 * pinned itself to light in the morning. The inline script in `index.html`
 * applies the same rule before first paint, so nothing flashes.
 */
export function useTheme(): {
  preference: ThemePreference;
  isDark: boolean;
  setPreference: (next: ThemePreference) => void;
} {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStored);
  const [isDark, setIsDark] = useState(
    () => preference === 'dark' || (preference === 'system' && systemPrefersDark())
  );

  useEffect(() => {
    apply(preference);
    setIsDark(preference === 'dark' || (preference === 'system' && systemPrefersDark()));

    if (preference !== 'system' || typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      apply('system');
      setIsDark(media.matches);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    try {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Preference is not persistable here; the in-memory state still applies.
    }
    setPreferenceState(next);
  }, []);

  return { preference, isDark, setPreference };
}
