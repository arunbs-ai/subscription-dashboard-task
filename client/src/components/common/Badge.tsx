import React from 'react';
import { SubscriptionStatus, Role } from '../../types';

export interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'emerald' | 'amber' | 'rose' | 'indigo' | 'slate' | 'sky';
  status?: SubscriptionStatus;
  role?: Role;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant,
  status,
  role,
  size = 'md',
  dot = false,
  className = '',
}) => {
  let resolvedVariant = variant || 'slate';
  let label = children;

  if (status) {
    switch (status) {
      case 'active':
        resolvedVariant = 'emerald';
        label = label || 'Active';
        break;
      case 'trialing':
        resolvedVariant = 'sky';
        label = label || 'Trialing';
        break;
      case 'past_due':
        resolvedVariant = 'amber';
        label = label || 'Past Due';
        break;
      case 'cancelled':
        resolvedVariant = 'rose';
        label = label || 'Cancelled';
        break;
    }
  } else if (role) {
    if (role === 'admin') {
      resolvedVariant = 'indigo';
      label = label || 'Admin';
    } else {
      resolvedVariant = 'slate';
      label = label || 'Member';
    }
  }

  const variantStyles = {
    emerald:
      'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
    sky: 'bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800/60',
    amber:
      'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60',
    rose: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/60',
    indigo:
      'bg-brand-50 text-brand-700 border-brand-200/80 dark:bg-brand-950/40 dark:text-brand-300 dark:border-brand-800/60',
    slate:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/70 dark:text-slate-300 dark:border-slate-700',
  };

  const dotColors = {
    emerald: 'bg-emerald-500',
    sky: 'bg-sky-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    indigo: 'bg-brand-500',
    slate: 'bg-slate-400',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${sizeStyles[size]} ${variantStyles[resolvedVariant]} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[resolvedVariant]}`}
        />
      )}
      <span>{label}</span>
    </span>
  );
};
