import { cn } from '@/lib/utils';

interface ColorSwatchProps {
  color: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ColorSwatch({ color, size = 'md', className }: ColorSwatchProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <span
      className={cn(
        'inline-block rounded border border-slate-200 shrink-0',
        sizes[size],
        className
      )}
      style={{ backgroundColor: color }}
      title={color}
    />
  );
}
