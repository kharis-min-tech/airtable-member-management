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
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
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
            ? 'bg-blue-600 text-white border-blue-600'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        Month
      </button>
    </div>
  );
}

export default PeriodToggle;
