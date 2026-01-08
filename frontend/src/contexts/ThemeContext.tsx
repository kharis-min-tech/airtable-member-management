import { createContext, useState, useEffect, useCallback, useMemo, useContext } from 'react';
import type { ReactNode } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const STORAGE_KEY = 'kharis-theme';

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * Gets the initial theme from localStorage or system preference.
 * Falls back to 'light' if neither is available.
 */
function getInitialTheme(): Theme {
  // Try to load from localStorage
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch (error) {
    console.warn('Failed to load theme from localStorage:', error);
  }

  // Fallback to system preference
  if (typeof window !== 'undefined' && window.matchMedia) {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  }

  // Default to light
  return 'light';
}

/**
 * Applies the theme class to the document root element.
 */
function applyThemeToDocument(theme: Theme): void {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}

/**
 * Persists the theme to localStorage.
 */
function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (error) {
    console.warn('Failed to save theme to localStorage:', error);
  }
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  // Apply theme to document on mount and when theme changes
  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    // Validate theme value
    if (newTheme !== 'light' && newTheme !== 'dark') {
      console.warn(`Invalid theme value: ${newTheme}. Must be 'light' or 'dark'.`);
      return;
    }
    setThemeState(newTheme);
    persistTheme(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prevTheme) => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      persistTheme(newTheme);
      return newTheme;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      toggleTheme,
      setTheme,
    }),
    [theme, toggleTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Hook to access the theme context.
 * Must be used within a ThemeProvider.
 */
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export default ThemeContext;
