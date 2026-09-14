'use client';

import React, {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SearchItem, searchItems, readInitialQuery, planQuerySync } from '@/lib/search';
import { IconSearch, IconExternalLink } from '@tabler/icons-react';

interface SearchPaletteProps {
  items: SearchItem[];
  /** 受控：由父组件决定面板开合（Cmd+K 快捷键与导航按钮共用同一开关） */
  open: boolean;
  /**
   * 接收 setState 而非普通回调 —— Cmd+K 是开关，要按「最新值」取反。
   * 若读闭包里的 `open`，在收起面板的同一次事件循环里再按 Cmd+K 会读到旧值，开关失灵。
   */
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}

const MAX_RESULTS = 20;

/**
 * Cmd/Ctrl+K 命令面板。纯前端检索，`?q=` 同步 URL 让结果可分享。
 * 索引数据来自公开面全量条目（name / desc / tags / 点评 / 分类名）。
 */
export default function SearchPalette({ items, open, onOpenChange }: SearchPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  /** 地址栏带来的初始查询词，等面板真正打开时再消费（见下方两个 effect 的分工） */
  const pendingQuery = useRef<string | null>(null);
  /** 上一轮的面板开合状态 —— 用来识别「关闭」这个动作本身，而非「当前是关闭态」 */
  const prevOpen = useRef(false);

  const results = useMemo(() => searchItems(items, query).slice(0, MAX_RESULTS), [items, query]);

  // 地址栏带 `?q=` 时自动展开面板，让别人发来的搜索结果链接能直接打开。
  // 读 location 只能放在客户端 effect：首帧读会与服务端输出不一致，触发 hydration 报错。
  // 此处不直接 setQuery —— 面板尚未打开，马上会被「打开时」的 effect 覆盖，故先暂存。
  useEffect(() => {
    const initial = readInitialQuery(window.location.href);
    if (!initial) return;
    pendingQuery.current = initial;
    onOpenChange(true);
  }, [onOpenChange]);

  // Cmd/Ctrl+K 唤起 / Esc 关闭
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange((prev) => !prev);
      } else if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onOpenChange]);

  // 打开时查询词取自地址栏暂存值（若有），消费一次即弃；关闭时一并清空。
  // 关闭也要清：否则重开面板那一帧会带着上次的查询词同步进地址栏，
  // 而下一帧查询词才被改写，那一下已经来不及把地址栏改回来了 —— 结果是地址栏留着词、输入框却是空的。
  useEffect(() => {
    if (open) {
      setQuery(pendingQuery.current ?? '');
      pendingQuery.current = null;
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery('');
    }
  }, [open]);

  // `?q=` 同步到 URL，结果可分享；关闭面板时一并清掉（判定依据见 lib/search 的 planQuerySync）。
  useEffect(() => {
    const justClosed = prevOpen.current && !open;
    prevOpen.current = open;

    const action = planQuerySync({ open, query, justClosed });
    if (action === 'none') return;

    const url = new URL(window.location.href);
    if (action === 'set') {
      url.searchParams.set('q', query);
    } else {
      url.searchParams.delete('q');
    }
    window.history.replaceState(null, '', url.toString());
  }, [query, open]);

  // 键盘导航：上下选择，回车打开
  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && results[activeIndex]) {
        e.preventDefault();
        window.open(results[activeIndex].url, '_blank', 'noopener,noreferrer');
        onOpenChange(false);
      }
    },
    [results, activeIndex, onOpenChange],
  );

  // 选中项跟随可视区
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-xl mx-4 rounded-lg glass-surface overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 border-b border-border/50">
          <IconSearch className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onInputKeyDown}
            placeholder="搜索站点名称、描述、标签、点评…"
            className="flex-1 h-12 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
          />
          <kbd className="kbd hidden sm:inline-flex">Esc</kbd>
        </div>

        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-1">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              没有匹配的结果
            </div>
          ) : (
            results.map((item, index) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                data-index={index}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => onOpenChange(false)}
                className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                  index === activeIndex ? 'bg-primary/10' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {item.name}
                    </span>
                    {item.categoryName && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {item.categoryName}
                      </span>
                    )}
                  </div>
                  {(item.review || item.desc) && (
                    <p className="text-xs text-muted-foreground truncate">
                      {item.review || item.desc}
                    </p>
                  )}
                </div>
                <IconExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
              </a>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-border/50 text-xs text-muted-foreground flex items-center justify-between">
          <span>
            共 {items.length} 条 · 显示前 {results.length} 条
          </span>
          <span className="hidden sm:inline">↑↓ 选择 · Enter 打开</span>
        </div>
      </div>
    </div>
  );
}
