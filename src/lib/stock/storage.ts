import type { StockIdentity, StockWatchlistLayout } from '@/types/stock';

export const STOCK_WATCHLIST_LIMIT = 10;
export const DEFAULT_STOCK_WATCHLIST: StockIdentity[] = [
  { secid: '1.000001', code: '000001', name: '上证指数', market: '指数', category: 'index' },
  { secid: '0.399001', code: '399001', name: '深证成指', market: '指数', category: 'index' },
  { secid: '0.399006', code: '399006', name: '创业板指', market: '指数', category: 'index' },
];

const STOCK_WATCHLIST_STORAGE_KEY = 'stockWatchlist:v1';
const STOCK_WATCHLIST_LAYOUT_KEY = 'stockWatchlistLayout:v1';
const STOCK_WATCHLIST_HIDE_WHEN_CLOSED_KEY = 'stockWatchlistHideWhenClosed:v1';

export function getStoredStocks(): StockIdentity[] {
  if (!canUseLocalStorage()) return DEFAULT_STOCK_WATCHLIST;

  try {
    const rawValue = localStorage.getItem(STOCK_WATCHLIST_STORAGE_KEY);
    if (rawValue === null) return DEFAULT_STOCK_WATCHLIST;

    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) return [];

    return normalizeStockList(parsed);
  } catch {
    return [];
  }
}

export function setStoredStocks(stocks: StockIdentity[]): StockIdentity[] {
  const normalizedStocks = normalizeStockList(stocks);

  if (canUseLocalStorage()) {
    localStorage.setItem(STOCK_WATCHLIST_STORAGE_KEY, JSON.stringify(normalizedStocks));
  }

  return normalizedStocks;
}

export function addStoredStocks(stocks: StockIdentity[]): StockIdentity[] {
  return setStoredStocks([...getStoredStocks(), ...stocks]);
}

export function removeStoredStock(secid: string): StockIdentity[] {
  return setStoredStocks(getStoredStocks().filter((stock) => stock.secid !== secid));
}

export function getStoredStockLayout(): StockWatchlistLayout {
  if (!canUseLocalStorage()) return 'list';

  const storedLayout = localStorage.getItem(STOCK_WATCHLIST_LAYOUT_KEY);
  return isStockWatchlistLayout(storedLayout) ? storedLayout : 'list';
}

export function setStoredStockLayout(layout: StockWatchlistLayout): StockWatchlistLayout {
  if (canUseLocalStorage()) {
    localStorage.setItem(STOCK_WATCHLIST_LAYOUT_KEY, layout);
  }

  return layout;
}

export function getStoredHideStockWhenMarketClosed(): boolean {
  if (!canUseLocalStorage()) return false;
  return localStorage.getItem(STOCK_WATCHLIST_HIDE_WHEN_CLOSED_KEY) === 'true';
}

export function setStoredHideStockWhenMarketClosed(hidden: boolean): boolean {
  if (canUseLocalStorage()) {
    localStorage.setItem(STOCK_WATCHLIST_HIDE_WHEN_CLOSED_KEY, hidden ? 'true' : 'false');
  }

  return hidden;
}

export function isAshareTradingOpen(now = new Date()): boolean {
  const shanghaiTime = getShanghaiTimeParts(now);
  if (shanghaiTime.weekday === 0 || shanghaiTime.weekday === 6) return false;

  const minutes = shanghaiTime.hour * 60 + shanghaiTime.minute + shanghaiTime.second / 60;
  return (
    (minutes >= 9 * 60 + 30 && minutes < 11 * 60 + 30) ||
    (minutes >= 13 * 60 && minutes <= 15 * 60)
  );
}

function normalizeStockList(value: unknown[]): StockIdentity[] {
  const seen = new Set<string>();
  const normalizedStocks: StockIdentity[] = [];

  for (const item of value) {
    const stock = normalizeStock(item);
    if (!stock || seen.has(stock.secid)) continue;

    seen.add(stock.secid);
    normalizedStocks.push(stock);

    if (normalizedStocks.length >= STOCK_WATCHLIST_LIMIT) break;
  }

  return normalizedStocks;
}

function normalizeStock(value: unknown): StockIdentity | null {
  if (!value || typeof value !== 'object') return null;

  const candidate = value as Partial<StockIdentity>;
  if (
    typeof candidate.secid !== 'string' ||
    typeof candidate.code !== 'string' ||
    typeof candidate.name !== 'string' ||
    typeof candidate.market !== 'string'
  ) {
    return null;
  }

  const stock: StockIdentity = {
    secid: candidate.secid.trim(),
    code: candidate.code.trim(),
    name: candidate.name.trim(),
    market: candidate.market.trim(),
  };

  if (isStockCategory(candidate.category)) {
    stock.category = candidate.category;
  }

  return stock.secid && stock.code && stock.name ? stock : null;
}

function canUseLocalStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function isStockWatchlistLayout(value: string | null): value is StockWatchlistLayout {
  return value === 'list' || value === 'grid';
}

function isStockCategory(value: unknown): value is StockIdentity['category'] {
  return value === 'stock' || value === 'etf' || value === 'index' || value === 'hk';
}

function getShanghaiTimeParts(date: Date): { weekday: number; hour: number; minute: number; second: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);

  const partMap = new Map(parts.map((part) => [part.type, part.value]));
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(partMap.get('weekday') ?? '');

  return {
    weekday,
    hour: Number(partMap.get('hour') ?? 0),
    minute: Number(partMap.get('minute') ?? 0),
    second: Number(partMap.get('second') ?? 0),
  };
}
