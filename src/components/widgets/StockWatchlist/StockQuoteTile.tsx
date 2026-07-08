'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPercent, getTrendClass } from './quoteFormat';
import type { StockQuote } from '@/types/stock';

interface StockQuoteTileProps {
  quote: StockQuote;
  onRemove: (secid: string) => void;
}

export function StockQuoteTile({ quote, onRemove }: StockQuoteTileProps) {
  const trendClass = getTrendClass(quote.change);

  return (
    <div className="group/stock-tile stock-watchlist-quote-tile flex h-8 min-w-0 items-center gap-1 rounded-sm px-1.5 text-xs transition-colors hover:bg-accent/30">
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium leading-4 text-foreground">{quote.name}</div>
        <div className="truncate text-[9px] leading-3 text-muted-foreground">{quote.code}</div>
      </div>

      <div className={cn('shrink-0 text-right text-xs font-semibold tabular-nums', trendClass)}>
        {formatPercent(quote.changePercent)}
      </div>

      <button
        type="button"
        onClick={() => onRemove(quote.secid)}
        className="stock-watchlist-action-button rounded-sm p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover/stock-tile:opacity-100"
        title="移除"
        aria-label={`移除 ${quote.name}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
