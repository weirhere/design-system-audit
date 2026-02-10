import { cn } from '@/lib/utils';
import { CLASSIFICATION_LABELS, CLASSIFICATION_DESCRIPTIONS } from '@/lib/constants';
import type { Classification } from '@/types/classification';

const classificationStyles: Record<Classification, string> = {
  unclassified: 'bg-slate-100 text-slate-600',
  inherit: 'bg-emerald-100 text-emerald-700',
  adapt: 'bg-amber-100 text-amber-700',
  extend: 'bg-red-100 text-red-700',
};

interface BadgeProps {
  classification: Classification;
  className?: string;
}

export function ClassificationBadge({ classification, className }: BadgeProps) {
  return (
    <span
      title={CLASSIFICATION_DESCRIPTIONS[classification]}
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        classificationStyles[classification],
        className
      )}
    >
      {CLASSIFICATION_LABELS[classification] || classification}
    </span>
  );
}

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  crawling: 'bg-blue-100 text-blue-700',
  crawled: 'bg-cyan-100 text-cyan-700',
  analyzing: 'bg-purple-100 text-purple-700',
  complete: 'bg-emerald-100 text-emerald-700',
  error: 'bg-red-100 text-red-700',
  pending: 'bg-slate-100 text-slate-600',
  running: 'bg-blue-100 text-blue-700',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize',
        statusStyles[status] || 'bg-slate-100 text-slate-600',
        className
      )}
    >
      {status}
    </span>
  );
}
