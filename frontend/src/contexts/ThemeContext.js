import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {}, setTheme: () => {} });

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('theme') || 'dark';
    } catch (_) {
      return 'dark';
    }
  });

  // Apply theme to the document root for Tailwind's dark mode and for CSS variables
  useEffect(() => {
    try { localStorage.setItem('theme', theme); } catch (_) {}

    const root = document.documentElement;

    // Toggle Tailwind's dark class so components using CSS variables (e.g., Card/Table)
    // pick correct foreground/background colors in dark mode.
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Keep existing attribute for any attribute-based checks
    root.setAttribute('data-theme', theme);
  }, [theme]);

  const value = useMemo(() => ({
    theme,
    setTheme,
    toggleTheme: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')),
  }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
