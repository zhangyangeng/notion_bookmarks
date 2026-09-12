'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SearchItem, searchItems } from '@/lib/search';
import { IconSearch, IconExternalLink } from '@tabler/icons-react';

interface SearchPaletteProps {
  items: SearchItem[];
  /** 受控：由父组件决定面板开合（Cmd+K 快捷键与导航按钮共用同一开关） */
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

  const results = useMemo(() => searchItems(items, query).slice(0, MAX_RESULTS), [items, query]);

  // Cmd/Ctrl+K 唤起 / Esc 关闭
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onOpenChange]);

  // 打开时聚焦输入框、复位选中项
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // `?q=` 同步到 URL，结果可分享
  useEffect(() => {
    if (!open) return;
    const url = new URL(window.location.href);
    if (query) {
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
        className="w-full max-w-xl mx-4 rounded-xl border border-border bg-card shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 border-b border-border">
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
          <kbd className="hidden sm:inline-flex text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">
            Esc
          </kbd>
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

        <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
          <span>
            共 {items.length} 条 · 显示前 {results.length} 条
          </span>
          <span className="hidden sm:inline">↑↓ 选择 · Enter 打开</span>
        </div>
      </div>
    </div>
  );
}
