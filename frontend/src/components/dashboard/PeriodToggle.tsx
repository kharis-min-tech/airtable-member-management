interface PeriodToggleProps {
  period: 'week' | 'month';
  onPeriodChange: (period: 'week' | 'month') => void;
  disabled?: boolean;
}

function PeriodToggle({ period, onPeriodChange, disabled = false }: PeriodToggleProps) {
  return (
    <div className="inline-flex rounded-md shadow-sm" role="group">
      <button
        type="button"
        onClick={() => onPeriodChange('week')}
        disabled={disabled}
        className={`px-4 py-2 text-sm font-medium rounded-l-md border transition-colors ${
          period === 'week'
            ? 'bg-primary dark:bg-primary-dark text-white border-primary dark:border-primary-dark'
            : 'bg-surface-light dark:bg-surface-dark text-text-primary-light dark:text-text-primary-dark border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        Week
      </button>
      <button
        type="button"
        onClick={() => onPeriodChange('month')}
        disabled={disabled}
        className={`px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b transition-colors ${
          period === 'month'
            ? 'bg-primary dark:bg-primary-dark text-white border-primary dark:border-primary-dark'
            : 'bg-surface-light dark:bg-surface-dark text-text-primary-light dark:text-text-primary-dark border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        Month
      </button>
    </div>
  );
}

export default PeriodToggle;
