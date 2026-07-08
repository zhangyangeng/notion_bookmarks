'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatChange, formatPercent, formatPrice, getTrendClass } from './quoteFormat';
import type { StockQuote } from '@/types/stock';

interface StockQuoteRowProps {
  quote: StockQuote;
  onRemove: (secid: string) => void;
}

export function StockQuoteRow({ quote, onRemove }: StockQuoteRowProps) {
  const trendClass = getTrendClass(quote.change);

  return (
    <div className="group/stock-row stock-watchlist-quote-row flex h-[22px] items-center gap-1.5 rounded-sm px-1.5 text-[11px] transition-colors hover:bg-accent/30">
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium leading-3 text-foreground">{quote.name}</div>
        <div className="leading-3 text-[9px] text-muted-foreground">{quote.code}</div>
      </div>

      <div className="w-12 text-right tabular-nums text-foreground">
        {formatPrice(quote.price)}
      </div>

      <div className={cn('w-11 text-right tabular-nums', trendClass)}>
        {formatChange(quote.change)}
      </div>

      <div className={cn('w-11 text-right tabular-nums', trendClass)}>
        {formatPercent(quote.changePercent)}
      </div>

      <button
        type="button"
        onClick={() => onRemove(quote.secid)}
        className="stock-watchlist-action-button rounded-sm p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover/stock-row:opacity-100"
        title="移除"
        aria-label={`移除 ${quote.name}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
