/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const test = require('node:test');

const {
  mapEastmoneyQuotePayload,
  mapEastmoneySearchPayload,
  mapTencentQuotePayload,
  toEastmoneySecid,
} = require('./stock/api');
const {
  STOCK_WATCHLIST_LIMIT,
  addStoredStocks,
  getStoredHideStockWhenMarketClosed,
  getStoredStockLayout,
  getStoredStocks,
  isAshareTradingOpen,
  removeStoredStock,
  setStoredHideStockWhenMarketClosed,
  setStoredStockLayout,
  setStoredStocks,
} = require('./stock/storage');

function createLocalStorageMock(initial: Record<string, string> = {}) {
  const store = new Map<string, string>(Object.entries(initial));

  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
    removeItem(key: string) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

function installLocalStorage(initial: Record<string, string> = {}, sessionInitial: Record<string, string> = {}) {
  Object.defineProperty(globalThis, 'window', {
    value: {},
    configurable: true,
  });

  Object.defineProperty(globalThis, 'localStorage', {
    value: createLocalStorageMock(initial),
    configurable: true,
  });

  Object.defineProperty(globalThis, 'sessionStorage', {
    value: createLocalStorageMock(sessionInitial),
    configurable: true,
  });
}

test('toEastmoneySecid 根据 A 股代码推导东方财富 secid', () => {
  assert.equal(toEastmoneySecid('600519'), '1.600519');
  assert.equal(toEastmoneySecid('688001'), '1.688001');
  assert.equal(toEastmoneySecid('000001'), '0.000001');
  assert.equal(toEastmoneySecid('300750'), '0.300750');
  assert.equal(toEastmoneySecid('830799'), '0.830799');
  assert.equal(toEastmoneySecid('123'), null);
});

test('mapEastmoneySearchPayload 保留股票、ETF、港股和指数并过滤无关品类', () => {
  const results = mapEastmoneySearchPayload({
    QuotationCodeTable: {
      Data: [
        {
          Code: '600519',
          Name: '贵州茅台',
          Classify: 'AStock',
          QuoteID: '1.600519',
          SecurityTypeName: '沪A',
        },
        {
          Code: '000001',
          Name: '上证指数',
          Classify: 'Index',
          QuoteID: '1.000001',
          SecurityTypeName: '指数',
        },
        {
          Code: '510300',
          Name: '沪深300ETF华泰柏瑞',
          Classify: 'Fund',
          QuoteID: '1.510300',
          SecurityTypeName: '基金',
        },
        {
          Code: '00700',
          Name: '腾讯控股',
          Classify: 'HK',
          QuoteID: '116.00700',
          SecurityTypeName: '港股',
        },
        {
          Code: '150001',
          Name: '基金示例',
          Classify: 'OTCFUND',
          QuoteID: '150.150001',
          SecurityTypeName: '基金',
        },
      ],
    },
  });

  assert.deepEqual(results, [
    {
      secid: '1.600519',
      code: '600519',
      name: '贵州茅台',
      market: '沪A',
      category: 'stock',
    },
    {
      secid: '1.000001',
      code: '000001',
      name: '上证指数',
      market: '指数',
      category: 'index',
    },
    {
      secid: '1.510300',
      code: '510300',
      name: '沪深300ETF华泰柏瑞',
      market: '基金',
      category: 'etf',
    },
    {
      secid: '116.00700',
      code: '00700',
      name: '腾讯控股',
      market: '港股',
      category: 'hk',
    },
  ]);
});

test('mapEastmoneyQuotePayload 映射东方财富行情字段并保留输入顺序', () => {
  const quotes = mapEastmoneyQuotePayload(
    {
      data: {
        diff: [
          {
            f2: 1183.95,
            f3: -0.13,
            f4: -1.54,
            f5: 15060,
            f6: 1769344633,
            f8: 0.12,
            f12: '600519',
            f13: 1,
            f14: '贵州茅台',
            f18: 1185.49,
            f124: 1782873077,
          },
          {
            f2: 10.07,
            f3: 0.2,
            f4: 0.02,
            f5: 370818,
            f6: 371936655,
            f8: 0.19,
            f12: '000001',
            f13: 0,
            f14: '平安银行',
            f18: 10.05,
            f124: 1782873078,
          },
        ],
      },
    },
    ['0.000001', '1.600519']
  );

  assert.deepEqual(
    quotes.map((quote: {
      secid: string;
      code: string;
      name: string;
      price: number | null;
      change: number | null;
      changePercent: number | null;
      previousClose: number | null;
      updatedAt: string | null;
    }) => ({
      secid: quote.secid,
      code: quote.code,
      name: quote.name,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      previousClose: quote.previousClose,
      updatedAt: quote.updatedAt,
    })),
    [
      {
        secid: '0.000001',
        code: '000001',
        name: '平安银行',
        price: 10.07,
        change: 0.02,
        changePercent: 0.2,
        previousClose: 10.05,
        updatedAt: '2026-07-01T02:31:18.000Z',
      },
      {
        secid: '1.600519',
        code: '600519',
        name: '贵州茅台',
        price: 1183.95,
        change: -1.54,
        changePercent: -0.13,
        previousClose: 1185.49,
        updatedAt: '2026-07-01T02:31:17.000Z',
      },
    ]
  );
});

test('mapEastmoneyQuotePayload 对缺失价格返回 null 并标记 stale', () => {
  const [quote] = mapEastmoneyQuotePayload({
    data: {
      diff: [
        {
          f2: '-',
          f3: '-',
          f4: '-',
          f12: '600519',
          f13: 1,
          f14: '贵州茅台',
        },
      ],
    },
  });

  assert.equal(quote.price, null);
  assert.equal(quote.change, null);
  assert.equal(quote.changePercent, null);
  assert.equal(quote.isStale, true);
});

test('mapTencentQuotePayload 映射腾讯脚本行情字段并保留输入顺序', () => {
  const quotes = mapTencentQuotePayload(
    {
      sz000001: '51~平安银行~000001~10.16~10.05~10.05~599948~255326~344622~10.16~13~10.15~1236~10.14~2910~10.13~2714~10.12~1663~10.17~681~10.18~1661~10.19~2913~10.20~3204~10.21~351~~20260701114012~0.11~1.09~10.17~9.99~10.16/599948/604024484~599948~60402~0.31~4.58~~10.17~9.99~1.79~1971.64~1971.67~0.43~11.06~9.05~1.29',
      sh600519: '1~贵州茅台~600519~1190.96~1185.49~1180.10~24968~12303~12664~1190.96~4~1190.63~4~1190.59~1~1190.57~1~1190.19~1~1190.97~1~1191.00~10~1191.06~2~1191.17~1~1191.18~1~~20260701114011~5.47~0.46~1193.00~1166.33~1190.96/24968/2947774346~24968~294777~0.20~18.00~~1193.00~1166.33~2.25~14887.97~14887.97~6.39',
    },
    ['1.600519', '0.000001']
  );

  assert.deepEqual(
    quotes.map((quote: {
      secid: string;
      code: string;
      name: string;
      price: number | null;
      change: number | null;
      changePercent: number | null;
      previousClose: number | null;
      updatedAt: string | null;
    }) => ({
      secid: quote.secid,
      code: quote.code,
      name: quote.name,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      previousClose: quote.previousClose,
      updatedAt: quote.updatedAt,
    })),
    [
      {
        secid: '1.600519',
        code: '600519',
        name: '贵州茅台',
        price: 1190.96,
        change: 5.47,
        changePercent: 0.46,
        previousClose: 1185.49,
        updatedAt: '2026-07-01T03:40:11.000Z',
      },
      {
        secid: '0.000001',
        code: '000001',
        name: '平安银行',
        price: 10.16,
        change: 0.11,
        changePercent: 1.09,
        previousClose: 10.05,
        updatedAt: '2026-07-01T03:40:12.000Z',
      },
    ]
  );
});

test('mapTencentQuotePayload 映射腾讯港股行情字段', () => {
  const [quote] = mapTencentQuotePayload({
    hk00700: '100~腾讯控股~00700~429.800~420.200~421.200~38994409.0~0~0~429.800~0~0~0~0~0~0~0~0~0~429.800~0~0~0~0~0~0~0~0~0~38994409.0~2026/06/30 16:08:12~9.600~2.28~435.600~418.400~429.800~38994409.0~16688485489.052~0~15.70',
  });

  assert.deepEqual(
    {
      secid: quote.secid,
      code: quote.code,
      name: quote.name,
      market: quote.market,
      price: quote.price,
      change: quote.change,
      changePercent: quote.changePercent,
      previousClose: quote.previousClose,
      updatedAt: quote.updatedAt,
    },
    {
      secid: '116.00700',
      code: '00700',
      name: '腾讯控股',
      market: '港股',
      price: 429.8,
      change: 9.6,
      changePercent: 2.28,
      previousClose: 420.2,
      updatedAt: '2026-06-30T08:08:12.000Z',
    }
  );
});


test('storage 读取坏数据时返回空数组', () => {
  installLocalStorage({ 'stockWatchlist:v1': '{bad json' });

  assert.deepEqual(getStoredStocks(), []);
});

test('storage 首次读取时返回默认三大指数且允许用户清空', () => {
  installLocalStorage();

  assert.deepEqual(getStoredStocks(), [
    { secid: '1.000001', code: '000001', name: '上证指数', market: '指数', category: 'index' },
    { secid: '0.399001', code: '399001', name: '深证成指', market: '指数', category: 'index' },
    { secid: '0.399006', code: '399006', name: '创业板指', market: '指数', category: 'index' },
  ]);

  setStoredStocks([]);

  assert.deepEqual(getStoredStocks(), []);
});

test('storage 保存时去重并限制最多 10 只', () => {
  installLocalStorage();
  setStoredStocks([]);

  const stocks = Array.from({ length: 12 }, (_, index) => {
    const code = String(600000 + index).padStart(6, '0');
    return {
      secid: `1.${code}`,
      code,
      name: `股票${index}`,
      market: '沪A',
    };
  });

  const saved = addStoredStocks([...stocks, stocks[0]]);

  assert.equal(STOCK_WATCHLIST_LIMIT, 10);
  assert.equal(saved.length, 10);
  assert.equal(saved[0].secid, '1.600000');
  assert.equal(saved[9].secid, '1.600009');
  assert.deepEqual(getStoredStocks(), saved);
});

test('storage 可以移除指定股票', () => {
  installLocalStorage();
  setStoredStocks([
    { secid: '1.600519', code: '600519', name: '贵州茅台', market: '沪A' },
    { secid: '0.000001', code: '000001', name: '平安银行', market: '深A' },
  ]);

  const saved = removeStoredStock('1.600519');

  assert.deepEqual(saved, [
    { secid: '0.000001', code: '000001', name: '平安银行', market: '深A' },
  ]);
});

test('storage 保存并恢复自选股展示模式', () => {
  installLocalStorage({ 'stockWatchlistLayout:v1': 'unknown' });

  assert.equal(getStoredStockLayout(), 'list');
  assert.equal(setStoredStockLayout('grid'), 'grid');
  assert.equal(getStoredStockLayout(), 'grid');
  assert.equal(setStoredStockLayout('list'), 'list');
  assert.equal(getStoredStockLayout(), 'list');
});

test('storage 保存收盘隐藏开关', () => {
  installLocalStorage({ 'stockWatchlistHideWhenClosed:v1': 'bad' });

  assert.equal(getStoredHideStockWhenMarketClosed(), false);
  assert.equal(setStoredHideStockWhenMarketClosed(true), true);
  assert.equal(getStoredHideStockWhenMarketClosed(), true);
  assert.equal(setStoredHideStockWhenMarketClosed(false), false);
  assert.equal(getStoredHideStockWhenMarketClosed(), false);
});

test('isAshareTradingOpen 只在工作日 A 股交易时段返回 true', () => {
  assert.equal(isAshareTradingOpen(new Date('2026-07-01T01:29:59.000Z')), false);
  assert.equal(isAshareTradingOpen(new Date('2026-07-01T01:30:00.000Z')), true);
  assert.equal(isAshareTradingOpen(new Date('2026-07-01T03:30:00.000Z')), false);
  assert.equal(isAshareTradingOpen(new Date('2026-07-01T05:00:00.000Z')), true);
  assert.equal(isAshareTradingOpen(new Date('2026-07-01T07:00:01.000Z')), false);
  assert.equal(isAshareTradingOpen(new Date('2026-07-04T02:00:00.000Z')), false);
});
