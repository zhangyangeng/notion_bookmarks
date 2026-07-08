'use client';

import { Clock3, EyeOff, Grid2X2, List, Plus, RefreshCw, TrendingUp } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  getStoredHideStockWhenMarketClosed,
  getStoredStockLayout,
  isAshareTradingOpen,
  setStoredHideStockWhenMarketClosed,
  setStoredStockLayout,
} from '@/lib/stock/storage';
import { StockQuoteRow } from './StockQuoteRow';
import { StockQuoteTile } from './StockQuoteTile';
import { StockSearch } from './StockSearch';
import { useStockWatchlist } from './useStockWatchlist';
import type { StockIdentity, StockQuote, StockWatchlistLayout } from '@/types/stock';

type NoticeTone = 'info' | 'danger';

interface StockNotice {
  text: string;
  tone: NoticeTone;
}

export default function StockWatchlist() {
  const [sessionHidden, setSessionHidden] = useState(false);
  const [hideWhenClosed, setHideWhenClosed] = useState(false);
  const [marketOpen, setMarketOpen] = useState(true);

  useEffect(() => {
    setHideWhenClosed(getStoredHideStockWhenMarketClosed());
    setMarketOpen(isAshareTradingOpen());

    const intervalId = window.setInterval(() => {
      setMarketOpen(isAshareTradingOpen());
    }, 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  if (sessionHidden || (hideWhenClosed && !marketOpen)) return null;

  return (
    <StockWatchlistContent
      hideWhenClosed={hideWhenClosed}
      onToggleHideWhenClosed={() => {
        const nextValue = setStoredHideStockWhenMarketClosed(!hideWhenClosed);

        if (nextValue && !marketOpen) {
          window.setTimeout(() => setHideWhenClosed(nextValue), 1100);
          return;
        }

        setHideWhenClosed(nextValue);
      }}
      onHideForSession={() => {
        setSessionHidden(true);
      }}
    />
  );
}

interface StockWatchlistContentProps {
  hideWhenClosed: boolean;
  onToggleHideWhenClosed: () => void;
  onHideForSession: () => void;
}

function StockWatchlistContent({
  hideWhenClosed,
  onToggleHideWhenClosed,
  onHideForSession,
}: StockWatchlistContentProps) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [layout, setLayout] = useState<StockWatchlistLayout>('list');
  const [notice, setNotice] = useState<StockNotice | null>(null);
  const {
    stocks,
    quotes,
    loading,
    refreshing,
    error,
    message,
    lastUpdated,
    addStock,
    removeStock,
    refreshQuotes,
  } = useStockWatchlist();

  useEffect(() => {
    setLayout(getStoredStockLayout());
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (message) {
      showNotice(message, 'info');
      return;
    }

    if (error) {
      showNotice(error, 'danger');
    }
  }, [error, message]);

  const displayQuotes = useMemo(() => {
    if (quotes.length > 0) return quotes;
    return stocks.map(createPendingQuote);
  }, [quotes, stocks]);

  const updateLayout = (nextLayout: StockWatchlistLayout) => {
    setLayout(setStoredStockLayout(nextLayout));
  };

  const showNotice = (text: string, tone: NoticeTone = 'info') => {
    setNotice({ text, tone });
    if (noticeTimerRef.current) {
      clearTimeout(noticeTimerRef.current);
    }
    noticeTimerRef.current = setTimeout(() => setNotice(null), 2600);
  };

  const toggleHideWhenClosed = () => {
    const nextValue = !hideWhenClosed;
    onToggleHideWhenClosed();
    showNotice(nextValue ? '已开启：A股休市时自动隐藏' : '已关闭：休市后也显示自选股');
  };

  const hideForSession = () => {
    showNotice('已暂时关闭，刷新页面后恢复');
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }
    hideTimerRef.current = setTimeout(onHideForSession, 1100);
  };

  return (
    <div
      ref={widgetRef}
      className="widget-card stock-watchlist-widget relative flex h-[150px] w-[340px] flex-col overflow-hidden text-card-foreground"
    >
      <div className="flex h-9 items-center gap-1.5 border-b border-border/60 px-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="whitespace-nowrap text-sm font-semibold text-foreground">自选股</span>
          <span className="truncate text-[10px] text-muted-foreground">
            {formatUpdatedAt(lastUpdated)}
          </span>
        </div>

        <HeaderIconButton
          label="刷新行情"
          tooltip="刷新最新行情"
          disabled={refreshing || stocks.length === 0}
          onClick={() => refreshQuotes()}
        >
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
        </HeaderIconButton>

        <HeaderIconButton
          label={hideWhenClosed ? '关闭收盘后隐藏' : '开启收盘后隐藏'}
          tooltip="收盘后隐藏：A股休市时自动隐藏组件"
          active={hideWhenClosed}
          onClick={toggleHideWhenClosed}
        >
          <Clock3 className="h-3.5 w-3.5" />
        </HeaderIconButton>

        <HeaderIconButton
          label="添加股票"
          tooltip="添加股票、ETF、港股或指数"
          onClick={() => {
            setSearchOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
        </HeaderIconButton>

        <HeaderIconButton
          label="暂时关闭自选股"
          tooltip="暂时关闭：当前页面隐藏，刷新后恢复"
          onClick={hideForSession}
        >
          <EyeOff className="h-3.5 w-3.5" />
        </HeaderIconButton>

        <div className="stock-watchlist-mode-toggle flex shrink-0 rounded-md bg-muted/45 p-0.5">
          <button
            type="button"
            onClick={() => updateLayout('list')}
            className={cn(
              'stock-watchlist-mode-button rounded-sm p-0.5 transition-colors',
              layout === 'list'
                ? 'stock-watchlist-mode-active bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            title="单列展示"
            aria-label="单列展示"
            aria-pressed={layout === 'list'}
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => updateLayout('grid')}
            className={cn(
              'stock-watchlist-mode-button rounded-sm p-0.5 transition-colors',
              layout === 'grid'
                ? 'stock-watchlist-mode-active bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            title="双列展示"
            aria-label="双列展示"
            aria-pressed={layout === 'grid'}
          >
            <Grid2X2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className={cn(
            'stock-watchlist-toast pointer-events-none absolute right-2 top-10 z-40 max-w-[240px] rounded-md px-2.5 py-1.5 text-xs shadow-lg ring-1',
            notice.tone === 'danger'
              ? 'bg-destructive text-destructive-foreground ring-destructive/30'
              : 'bg-popover text-popover-foreground ring-border/70'
          )}
        >
          {notice.text}
        </div>
      )}

      <div
        className={cn(
          'stock-watchlist-scroll min-h-0 flex-1 overflow-y-auto p-1',
          layout === 'grid' && displayQuotes.length > 0 && 'grid grid-cols-2 content-start gap-0.5'
        )}
      >
        {loading ? (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            加载中...
          </div>
        ) : displayQuotes.length === 0 ? (
          <div className="flex h-full items-center justify-center px-3 text-center text-xs text-muted-foreground">
            添加股票后显示行情
          </div>
        ) : (
          displayQuotes.map((quote) => layout === 'grid' ? (
            <StockQuoteTile key={quote.secid} quote={quote} onRemove={removeStock} />
          ) : (
            <StockQuoteRow key={quote.secid} quote={quote} onRemove={removeStock} />
          ))
        )}
      </div>

      <StockSearch
        open={searchOpen}
        anchorRef={widgetRef}
        onClose={() => setSearchOpen(false)}
        onSelect={addStock}
      />
    </div>
  );
}

interface HeaderIconButtonProps {
  label: string;
  tooltip: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}

function HeaderIconButton({
  label,
  tooltip,
  active = false,
  disabled = false,
  onClick,
  children,
}: HeaderIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'group/stock-action stock-watchlist-action-button relative rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50',
        active &&
          'stock-watchlist-action-active bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
      )}
      aria-label={label}
      aria-pressed={active || undefined}
    >
      {children}
      <span className="pointer-events-none absolute right-0 top-[calc(100%+6px)] z-50 hidden w-max max-w-[190px] rounded-md bg-popover px-2 py-1 text-[10px] leading-snug text-popover-foreground opacity-0 shadow-lg ring-1 ring-border/70 group-hover/stock-action:block group-hover/stock-action:opacity-100">
        {tooltip}
      </span>
    </button>
  );
}

function createPendingQuote(stock: StockIdentity): StockQuote {
  return {
    ...stock,
    price: null,
    change: null,
    changePercent: null,
    previousClose: null,
    volume: null,
    amount: null,
    turnoverRate: null,
    updatedAt: null,
    isStale: true,
  };
}

function formatUpdatedAt(value: string | null): string {
  if (!value) return '';

  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
