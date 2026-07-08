'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Search, X } from 'lucide-react';
import { searchStocks } from '@/lib/stock/api';
import type { AddStockResult } from './useStockWatchlist';
import type { StockCategory, StockSearchResult } from '@/types/stock';

const PANEL_HEIGHT = 238;
const PANEL_MARGIN = 8;

interface PopoverPosition {
  top: number;
  left: number;
  width: number;
}

interface StockSearchProps {
  open: boolean;
  anchorRef: RefObject<HTMLDivElement | null>;
  onClose: () => void;
  onSelect: (stock: StockSearchResult) => AddStockResult;
}

export function StockSearch({ open, anchorRef, onClose, onSelect }: StockSearchProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const rect = anchor.getBoundingClientRect();
      const maxWidth = Math.max(PANEL_MARGIN * 2, window.innerWidth - PANEL_MARGIN * 2);
      const width = Math.min(Math.max(rect.width - PANEL_MARGIN * 2, 260), 392, maxWidth);
      const left = Math.min(
        Math.max(rect.left + PANEL_MARGIN, PANEL_MARGIN),
        window.innerWidth - width - PANEL_MARGIN
      );
      const preferredTop = rect.top + 38;
      const maxTop = Math.max(PANEL_MARGIN, window.innerHeight - PANEL_HEIGHT - PANEL_MARGIN);

      setPosition({
        top: Math.min(preferredTop, maxTop),
        left,
        width,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef, open]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [anchorRef, onClose, open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
      setError(null);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const keyword = query.trim();
    if (!keyword) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);

      try {
        const nextResults = await searchStocks(keyword);
        if (!cancelled) {
          setResults(nextResults);
        }
      } catch {
        if (!cancelled) {
          setResults([]);
          setError('搜索失败');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, query]);

  const handleSelect = (stock: StockSearchResult) => {
    const result = onSelect(stock);
    if (result.status === 'added') {
      setQuery('');
      setResults([]);
      onClose();
    }
  };

  const hasPanel = Boolean(query.trim() && (loading || error || results.length > 0));

  if (!open || !position || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label="添加股票"
      className="stock-watchlist-popover fixed z-[1000] rounded-md bg-card p-2 text-card-foreground shadow-lg ring-1 ring-border/70"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
      }}
    >
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">添加股票</span>
        <button
          type="button"
          onClick={onClose}
          className="stock-watchlist-action-button rounded-sm p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="关闭"
          aria-label="关闭股票搜索"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex h-7 items-center gap-1 rounded-md bg-background/80 px-2 ring-1 ring-border/60">
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="名称 / 代码"
          className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
        />
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>

      {hasPanel && (
        <div className="mt-1 max-h-[166px] overflow-y-auto rounded-md bg-background/95 ring-1 ring-border/60">
          {error ? (
            <div className="px-2 py-2 text-xs text-destructive">{error}</div>
          ) : loading ? (
            <div className="px-2 py-2 text-xs text-muted-foreground">搜索中...</div>
          ) : (
            results.map((stock) => (
              <button
                key={stock.secid}
                type="button"
                onClick={() => handleSelect(stock)}
                className="stock-watchlist-search-result flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-xs hover:bg-accent/40"
              >
                <span className="min-w-0 flex-1 truncate">{stock.name}</span>
                <span className="shrink-0 rounded-sm bg-muted px-1 text-[9px] text-muted-foreground">
                  {getCategoryLabel(stock.category)}
                </span>
                <span className="text-[10px] text-muted-foreground">{stock.code}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>,
    document.body
  );
}

function getCategoryLabel(category: StockCategory | undefined): string {
  if (category === 'etf') return 'ETF';
  if (category === 'hk') return '港股';
  if (category === 'index') return '指数';
  return 'A股';
}
