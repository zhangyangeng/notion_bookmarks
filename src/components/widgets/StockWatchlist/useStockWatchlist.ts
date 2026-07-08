'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchStockQuotes } from '@/lib/stock/api';
import {
  STOCK_WATCHLIST_LIMIT,
  getStoredStocks,
  setStoredStocks,
} from '@/lib/stock/storage';
import type { StockIdentity, StockQuote } from '@/types/stock';

export interface AddStockResult {
  status: 'added' | 'duplicate' | 'limit';
  message: string;
}

const REFRESH_INTERVAL = 60 * 1000;

export function useStockWatchlist() {
  const [stocks, setStocks] = useState<StockIdentity[]>([]);
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const stocksRef = useRef<StockIdentity[]>([]);
  const messageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    stocksRef.current = stocks;
  }, [stocks]);

  useEffect(() => {
    return () => {
      if (messageTimerRef.current) {
        clearTimeout(messageTimerRef.current);
      }
    };
  }, []);

  const showMessage = useCallback((value: string) => {
    setMessage(value);
    if (messageTimerRef.current) {
      clearTimeout(messageTimerRef.current);
    }
    messageTimerRef.current = setTimeout(() => setMessage(null), 3000);
  }, []);

  const refreshQuotes = useCallback(async (targetStocks = stocksRef.current) => {
    if (targetStocks.length === 0) {
      setQuotes([]);
      setError(null);
      setLastUpdated(null);
      return;
    }

    setRefreshing(true);
    setError(null);

    try {
      const nextQuotes = await fetchStockQuotes(targetStocks.map((stock) => stock.secid));
      const quoteMap = new Map(nextQuotes.map((quote) => [quote.secid, quote]));

      setQuotes(targetStocks.map((stock) => quoteMap.get(stock.secid) ?? createStaleQuote(stock)));
      setLastUpdated(new Date().toISOString());
    } catch (refreshError) {
      console.error('Failed to fetch stock quotes:', refreshError);
      setError(refreshError instanceof Error ? refreshError.message : '获取股票行情失败');
      setQuotes((currentQuotes) => currentQuotes.map((quote) => ({ ...quote, isStale: true })));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const storedStocks = getStoredStocks();
    setStocks(storedStocks);
    setLoading(false);
    void refreshQuotes(storedStocks);
  }, [refreshQuotes]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void refreshQuotes();
      }
    }, REFRESH_INTERVAL);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshQuotes();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshQuotes]);

  const persistStocks = useCallback((nextStocks: StockIdentity[]) => {
    const savedStocks = setStoredStocks(nextStocks);
    setStocks(savedStocks);
    void refreshQuotes(savedStocks);
    return savedStocks;
  }, [refreshQuotes]);

  const addStock = useCallback((stock: StockIdentity): AddStockResult => {
    const currentStocks = stocksRef.current;

    if (currentStocks.some((item) => item.secid === stock.secid)) {
      const messageText = `${stock.name} 已在自选股`;
      showMessage(messageText);
      return { status: 'duplicate', message: messageText };
    }

    if (currentStocks.length >= STOCK_WATCHLIST_LIMIT) {
      const messageText = `自选股已满 ${STOCK_WATCHLIST_LIMIT} 个，先移除一个再添加`;
      showMessage(messageText);
      return { status: 'limit', message: messageText };
    }

    persistStocks([...currentStocks, stock]);
    const messageText = `已添加 ${stock.name}`;
    showMessage(messageText);
    return { status: 'added', message: messageText };
  }, [persistStocks, showMessage]);

  const removeStock = useCallback((secid: string) => {
    const nextStocks = stocksRef.current.filter((stock) => stock.secid !== secid);
    persistStocks(nextStocks);
    showMessage('已移除');
  }, [persistStocks, showMessage]);

  return {
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
  };
}

function createStaleQuote(stock: StockIdentity): StockQuote {
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
