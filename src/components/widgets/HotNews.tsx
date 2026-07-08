'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';

interface HotNewsItem {
  title: string;
  url: string;
  views: string;
  platform: string;
}

const platforms = [
  { id: 'weibo', name: '微博' },
  { id: 'baidu', name: '百度' },
  { id: 'bilibili', name: '哔哩哔哩' },
  { id: 'toutiao', name: '今日头条' },
  { id: 'douyin', name: '抖音' }
];

const CACHE_TIME = 15 * 60 * 1000; // 15分钟

export default function HotNews() {
  const [activePlatform, setActivePlatform] = useState('weibo');
  const [news, setNews] = useState<HotNewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allNews, setAllNews] = useState<Record<string, HotNewsItem[]>>({});
  const lastFetchTime = useRef<number>(0);

  // 使用 ref 来保存最新的 activePlatform 和 allNews，避免在 fetchHotNews 中产生依赖
  const activePlatformRef = useRef(activePlatform);
  const allNewsRef = useRef(allNews);

  useEffect(() => {
    activePlatformRef.current = activePlatform;
    allNewsRef.current = allNews;
  }, [activePlatform, allNews]);

  // 获取数据的函数
  const fetchHotNews = useCallback(async (force = false) => {
    const now = Date.now();
    const currentAllNews = allNewsRef.current;
    const currentPlatform = activePlatformRef.current;

    // 如果数据在缓存时间内且不是强制刷新，直接使用缓存数据
    if (!force && now - lastFetchTime.current < CACHE_TIME && Object.keys(currentAllNews).length > 0) {
      setNews(currentAllNews[currentPlatform] || []);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/hot-news');
      if (!response.ok) {
        throw new Error('获取热搜数据失败');
      }
      const data = await response.json();
      setAllNews(data);
      // update ref immediately for subsequent logic if needed, but state update will trigger re-render
      setNews(data[currentPlatform] || []);
      lastFetchTime.current = now;
    } catch (error) {
      console.error('Failed to fetch hot news:', error);
      setError('获取热搜数据失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array as we use refs

  // 当平台切换时更新显示的数据
  useEffect(() => {
    if (allNews[activePlatform]) {
      setNews(allNews[activePlatform]);
    }
  }, [activePlatform, allNews]);

  // 自动轮播
  useEffect(() => {
    const autoRotate = () => {
      const currentIndex = platforms.findIndex(p => p.id === activePlatform);
      const nextIndex = (currentIndex + 1) % platforms.length;
      setActivePlatform(platforms[nextIndex].id);
    };

    // 每30秒切换一次平台
    const interval = setInterval(autoRotate, 30000);

    // 当用户手动切换平台时，重置定时器
    return () => clearInterval(interval);
  }, [activePlatform]);

  // 获取数据
  useEffect(() => {
    fetchHotNews();
    // 每15分钟刷新一次数据
    const refreshInterval = setInterval(() => fetchHotNews(true), 15 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, [fetchHotNews]);

  return (
    <div className="widget-card border h-[150px] flex flex-col">
      {/* 平台选择器 - 减小内边距和间距 */}
      <div className="flex gap-1.5 px-2 py-1.5 overflow-x-auto border-b">
        {platforms.map(platform => (
          <button
            key={platform.id}
            onClick={() => setActivePlatform(platform.id)}
            className={cn(
              "px-2.5 py-0.5 rounded-full text-sm whitespace-nowrap transition-colors",
              activePlatform === platform.id
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            {platform.name}
          </button>
        ))}
      </div>

      {/* 热搜列表 - 优化间距和布局 */}
      <div className="flex-1 overflow-y-auto py-1.5 px-2 space-y-0.5">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full w-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm">获取热搜数据...</p>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-sm text-destructive">
            {error}
          </div>
        ) : news.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
            暂无数据
          </div>
        ) : (
          news.map((item, index) => (
            <a
              key={index}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 cursor-pointer py-1 px-1 transition-colors hover:bg-accent/30 rounded-sm"
            >
              <span className={cn(
                "inline-flex w-4 h-4 items-center justify-center text-sm font-bold",
                {
                  'text-red-500 font-bold': index === 0,
                  'text-orange-500 font-bold': index === 1,
                  'text-yellow-500 font-bold': index === 2,
                  'text-muted-foreground': index > 2
                }
              )}>
                {index + 1}
              </span>
              
              <div className="flex-1 flex items-center justify-between min-w-0">
                <span className="text-sm truncate">
                  {item.title}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  {item.views}
                </span>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
} 