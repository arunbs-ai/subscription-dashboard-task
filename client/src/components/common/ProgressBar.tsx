import React from 'react';

export interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  subLabel?: string;
  unit?: string;
  showPercent?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  label,
  subLabel,
  unit = '',
  showPercent = true,
  className = '',
}) => {
  const percentage = Math.min(Math.round((value / max) * 100), 100);

  const getBarColor = (pct: number) => {
    if (pct >= 90) return 'bg-rose-500';
    if (pct >= 75) return 'bg-amber-500';
    return 'bg-indigo-600 dark:bg-indigo-500';
  };

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {label}
        </span>
        <span className="text-slate-500 dark:text-slate-400 font-mono">
          {subLabel || `${value.toLocaleString()}${unit} / ${max.toLocaleString()}${unit}`}
          {showPercent && <span className="ml-1 text-slate-400">({percentage}%)</span>}
        </span>
      </div>
      <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${getBarColor(percentage)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
