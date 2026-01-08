import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { cn } from '../../lib/utils';

interface ThemeToggleProps {
  className?: string;
}

/**
 * ThemeToggle component for switching between light and dark themes.
 * Displays a sun icon in dark mode and a moon icon in light mode.
 */
export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        'p-2 rounded-lg transition-colors duration-200',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        'dark:focus:ring-offset-gray-900',
        'text-gray-600 dark:text-gray-300',
        className
      )}
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? (
        <Moon className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Sun className="h-5 w-5" aria-hidden="true" />
      )}
    </button>
  );
}

export default ThemeToggle;
