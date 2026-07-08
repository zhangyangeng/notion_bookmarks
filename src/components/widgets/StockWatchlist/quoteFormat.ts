export function formatPrice(value: number | null): string {
  return value === null ? '--' : value.toFixed(value >= 100 ? 2 : 3).replace(/0$/, '');
}

export function formatPercent(value: number | null): string {
  if (value === null) return '--';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatChange(value: number | null): string {
  if (value === null) return '--';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}`;
}

export function getTrendClass(value: number | null): string {
  if (value === null) return 'text-muted-foreground';
  if (value > 0) return 'text-red-500';
  if (value < 0) return 'text-emerald-500';
  return 'text-muted-foreground';
}

