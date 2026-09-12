import '@testing-library/jest-dom/vitest';

// jsdom implements neither of these, and both are read during a normal render:
// `useTheme` asks the platform for a colour-scheme preference, and every chart
// measures nothing but React still mounts an SVG.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
