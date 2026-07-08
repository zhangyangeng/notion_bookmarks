import type { StockCategory, StockQuote, StockSearchResult } from '@/types/stock';

const SEARCH_ENDPOINT = 'https://searchapi.eastmoney.com/api/suggest/get';
const QUOTE_ENDPOINT = 'https://push2.eastmoney.com/api/qt/ulist.np/get';
const TENCENT_QUOTE_ENDPOINT = 'https://qt.gtimg.cn/q=';
const QUOTE_FIELDS = [
  'f2',
  'f3',
  'f4',
  'f5',
  'f6',
  'f8',
  'f12',
  'f13',
  'f14',
  'f18',
  'f124',
].join(',');

interface EastmoneySearchItem {
  Code?: unknown;
  Name?: unknown;
  Classify?: unknown;
  QuoteID?: unknown;
  SecurityTypeName?: unknown;
  MktNum?: unknown;
}

interface EastmoneySearchPayload {
  QuotationCodeTable?: {
    Data?: EastmoneySearchItem[];
  };
}

interface EastmoneyQuoteItem {
  f2?: unknown;
  f3?: unknown;
  f4?: unknown;
  f5?: unknown;
  f6?: unknown;
  f8?: unknown;
  f12?: unknown;
  f13?: unknown;
  f14?: unknown;
  f18?: unknown;
  f124?: unknown;
}

interface EastmoneyQuotePayload {
  data?: {
    diff?: EastmoneyQuoteItem[];
  };
}

type JsonpWindow = Window & Record<string, ((payload: unknown) => void) | undefined>;
type TencentQuoteWindow = Window & Record<string, string | undefined>;

export function toEastmoneySecid(code: string): string | null {
  const normalizedCode = code.trim();
  if (!/^\d{6}$/.test(normalizedCode)) return null;

  if (/^(60|68|69)/.test(normalizedCode)) {
    return `1.${normalizedCode}`;
  }

  if (/^(00|001|002|003|30|43|83|87|92)/.test(normalizedCode)) {
    return `0.${normalizedCode}`;
  }

  return null;
}

export function mapEastmoneySearchPayload(payload: unknown): StockSearchResult[] {
  const data = (payload as EastmoneySearchPayload)?.QuotationCodeTable?.Data;
  if (!Array.isArray(data)) return [];

  const seen = new Set<string>();
  const results: StockSearchResult[] = [];

  for (const item of data) {
    const code = toStringValue(item.Code);
    const name = toStringValue(item.Name);
    const market = toStringValue(item.SecurityTypeName);
    const quoteId = toStringValue(item.QuoteID);

    const category = getSupportedSearchCategory(item);
    if (!code || !name || !category) continue;

    const secid = quoteId || buildSecidFromMarket(item.MktNum, code) || toEastmoneySecid(code);
    if (!secid || seen.has(secid)) continue;

    seen.add(secid);
    results.push({
      secid,
      code,
      name,
      market: market || inferMarketName(secid),
      category,
    });
  }

  return results;
}

export function mapEastmoneyQuotePayload(payload: unknown, order?: string[]): StockQuote[] {
  const data = (payload as EastmoneyQuotePayload)?.data?.diff;
  if (!Array.isArray(data)) return [];

  const quotes = data
    .map(mapEastmoneyQuoteItem)
    .filter((quote): quote is StockQuote => quote !== null);

  if (!order || order.length === 0) return quotes;

  const quoteMap = new Map(quotes.map((quote) => [quote.secid, quote]));
  return order.map((secid) => quoteMap.get(secid)).filter((quote): quote is StockQuote => Boolean(quote));
}

export function mapTencentQuotePayload(payload: Record<string, string>, order?: string[]): StockQuote[] {
  const quotes = Object.entries(payload)
    .map(([symbol, value]) => mapTencentQuoteItem(symbol, value))
    .filter((quote): quote is StockQuote => quote !== null);

  if (!order || order.length === 0) return quotes;

  const quoteMap = new Map(quotes.map((quote) => [quote.secid, quote]));
  return order.map((secid) => quoteMap.get(secid)).filter((quote): quote is StockQuote => Boolean(quote));
}

export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  const keyword = query.trim();
  if (!keyword) return [];

  const url = new URL(SEARCH_ENDPOINT);
  url.searchParams.set('input', keyword);
  url.searchParams.set('type', '14');
  url.searchParams.set('count', '8');

  const payload = await fetchJsonp(url.toString());
  return mapEastmoneySearchPayload(payload);
}

export async function fetchStockQuotes(secids: string[]): Promise<StockQuote[]> {
  if (secids.length === 0) return [];

  try {
    return await fetchEastmoneyQuotes(secids);
  } catch {
    return fetchTencentQuotes(secids);
  }
}

async function fetchEastmoneyQuotes(secids: string[]): Promise<StockQuote[]> {
  const url = new URL(QUOTE_ENDPOINT);
  url.searchParams.set('fltt', '2');
  url.searchParams.set('invt', '2');
  url.searchParams.set('fields', QUOTE_FIELDS);
  url.searchParams.set('secids', secids.join(','));

  const response = await fetch(url.toString(), { cache: 'no-store' });
  if (!response.ok) throw new Error('获取股票行情失败');

  return mapEastmoneyQuotePayload(await response.json(), secids);
}

function mapEastmoneyQuoteItem(item: EastmoneyQuoteItem): StockQuote | null {
  const code = toStringValue(item.f12);
  const name = toStringValue(item.f14);
  const marketCode = parseNumber(item.f13);
  if (!code || !name || marketCode === null) return null;

  const secid = `${marketCode}.${code}`;
  const price = parseNumber(item.f2);

  return {
    secid,
    code,
    name,
    market: inferMarketName(secid),
    price,
    change: parseNumber(item.f4),
    changePercent: parseNumber(item.f3),
    previousClose: parseNumber(item.f18),
    volume: parseNumber(item.f5),
    amount: parseNumber(item.f6),
    turnoverRate: parseNumber(item.f8),
    updatedAt: parseTimestamp(item.f124),
    isStale: price === null,
  };
}

function mapTencentQuoteItem(symbol: string, value: string): StockQuote | null {
  const fields = value.split('~');
  const code = fields[2]?.trim();
  const name = fields[1]?.trim();
  const secid = tencentSymbolToSecid(symbol);

  if (!code || !name || !secid) return null;

  const price = parseNumber(fields[3]);

  return {
    secid,
    code,
    name,
    market: inferMarketName(secid),
    price,
    change: parseNumber(fields[31]),
    changePercent: parseNumber(fields[32]),
    previousClose: parseNumber(fields[4]),
    volume: parseNumber(fields[36]),
    amount: parseNumber(fields[37]),
    turnoverRate: parseNumber(fields[38]),
    updatedAt: parseTencentTimestamp(fields[30]),
    isStale: price === null,
  };
}

async function fetchTencentQuotes(secids: string[]): Promise<StockQuote[]> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('当前环境不支持股票行情备用源');
  }

  const symbols = secids.map(toTencentSymbol).filter((symbol): symbol is string => Boolean(symbol));
  if (symbols.length === 0) return [];

  const payload = await fetchTencentQuoteScript(symbols);
  return mapTencentQuotePayload(payload, secids);
}

function getSupportedSearchCategory(item: EastmoneySearchItem): StockCategory | null {
  const classify = toStringValue(item.Classify);
  const market = toStringValue(item.SecurityTypeName);

  if (
    classify === 'AStock' ||
    ['沪A', '深A', '京A', '科创板', '创业板', '北交所'].some((label) => market.includes(label))
  ) {
    return 'stock';
  }

  if (classify === 'Fund' && market.includes('基金')) return 'etf';
  if (classify === 'Index' || market.includes('指数')) return 'index';
  if (classify === 'HK' && market.includes('港股')) return 'hk';

  return null;
}

function buildSecidFromMarket(market: unknown, code: string): string | null {
  const marketCode = parseNumber(market);
  if (marketCode === null) return null;
  return `${marketCode}.${code}`;
}

function inferMarketName(secid: string): string {
  if (secid.startsWith('116.')) return '港股';
  if (secid.startsWith('100.')) return '指数';
  if (secid.startsWith('1.000') || secid.startsWith('0.399')) return '指数';
  return secid.startsWith('1.') ? '沪A' : '深A';
}

function toTencentSymbol(secid: string): string | null {
  const [market, code] = secid.split('.');
  if (!code) return null;
  if (market === '1') return `sh${code}`;
  if (market === '0') return `sz${code}`;
  if (market === '116') return `hk${code}`;
  return null;
}

function tencentSymbolToSecid(symbol: string): string | null {
  const normalizedSymbol = symbol.replace(/^v_/, '');
  if (normalizedSymbol.startsWith('sh')) return `1.${normalizedSymbol.slice(2)}`;
  if (normalizedSymbol.startsWith('sz')) return `0.${normalizedSymbol.slice(2)}`;
  if (normalizedSymbol.startsWith('hk')) return `116.${normalizedSymbol.slice(2)}`;
  return null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed || trimmed === '-') return null;

  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseTimestamp(value: unknown): string | null {
  const timestamp = parseNumber(value);
  if (timestamp === null) return null;
  return new Date(timestamp * 1000).toISOString();
}

function parseTencentTimestamp(value: unknown): string | null {
  const timestamp = toStringValue(value);
  const compactMatch = timestamp.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  const slashMatch = timestamp.match(/^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/);
  const match = compactMatch ?? slashMatch;
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+08:00`).toISOString();
}

function toStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function fetchJsonp(url: string, timeoutMs = 8000): Promise<unknown> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('当前环境不支持股票搜索'));
  }

  return new Promise((resolve, reject) => {
    const callbackName = `eastmoneyStockSearch_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const requestUrl = new URL(url);
    const callbackWindow = window as unknown as JsonpWindow;
    const script = document.createElement('script');

    let settled = false;

    const cleanup = () => {
      delete callbackWindow[callbackName];
      script.remove();
    };

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('股票搜索超时'));
    }, timeoutMs);

    callbackWindow[callbackName] = (payload: unknown) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();
      resolve(payload);
    };

    script.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();
      reject(new Error('股票搜索失败'));
    };

    requestUrl.searchParams.set('cb', callbackName);
    script.src = requestUrl.toString();
    script.async = true;
    document.head.appendChild(script);
  });
}

function fetchTencentQuoteScript(symbols: string[], timeoutMs = 8000): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    const quoteWindow = window as unknown as TencentQuoteWindow;
    const script = document.createElement('script');
    const variableNames = symbols.map((symbol) => `v_${symbol}`);
    let settled = false;

    const cleanup = () => {
      for (const variableName of variableNames) {
        delete quoteWindow[variableName];
      }
      script.remove();
    };

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('股票行情备用源超时'));
    }, timeoutMs);

    script.onload = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);

      const payload: Record<string, string> = {};
      for (const symbol of symbols) {
        const value = quoteWindow[`v_${symbol}`];
        if (typeof value === 'string') {
          payload[symbol] = value;
        }
      }

      cleanup();
      resolve(payload);
    };

    script.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();
      reject(new Error('股票行情备用源失败'));
    };

    script.src = `${TENCENT_QUOTE_ENDPOINT}${symbols.join(',')}`;
    script.async = true;
    script.charset = 'GBK';
    document.head.appendChild(script);
  });
}
