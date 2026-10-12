'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Link } from '@/types';
import type { ContentBlock, RichTextSpan } from '@/lib/notion-blocks';
import { cn } from '@/lib/utils';
import LinkIcon from '@/components/ui/LinkIcon';
import { IconExternalLink, IconX, IconCheckbox, IconSquare } from '@tabler/icons-react';
import { Quote } from 'lucide-react';

interface LinkDetailPanelProps {
  /** 为 null 时不渲染 —— 开合由父组件的一个状态决定 */
  link: Link | null;
  onClose: () => void;
}

/**
 * 已取回的正文缓存。同一次会话内重复点开同一张卡不再打接口。
 * 只在浏览器里写入（请求发生在 effect 中），刷新即失效 —— 正文改了自然会重取。
 */
const contentCache = new Map<string, ContentBlock[]>();

type ContentState =
  { status: 'loading' } | { status: 'ready'; blocks: ContentBlock[] } | { status: 'failed' };

/**
 * 链接详情弹层（首页与分享页共用）。
 *
 * 三段结构：头部固定 → 中部滚动 → 底部「访问官网」固定。
 * 桌面是居中玻璃面板，移动端是底部抽屉 —— **同一套 DOM，靠响应式类名切换**，不写两套。
 *
 * 数据来源天然分两层：标题 / 描述 / 点评随列表数据已经在客户端，点开即可渲染；
 * 只有页面正文要按需向服务端要（浏览器没有 Notion 凭据）。
 * 因此正文区要等一等 —— 而这份等待不对外展示：正文回来之前，那里什么都不出现。
 */
export default function LinkDetailPanel({ link, onClose }: LinkDetailPanelProps) {
  const linkId = link?.id ?? null;
  const [content, setContent] = useState<ContentState>({ status: 'loading' });

  // 正文按需拉取：缓存命中就不发请求
  useEffect(() => {
    if (!linkId) return;

    const cached = contentCache.get(linkId);
    if (cached) {
      setContent({ status: 'ready', blocks: cached });
      return;
    }

    let cancelled = false;
    setContent({ status: 'loading' });

    fetch(`/api/links/${linkId}/content`)
      .then((response) => response.json())
      .then((data: { blocks?: ContentBlock[]; failed?: boolean }) => {
        if (cancelled) return;
        if (data.failed || !Array.isArray(data.blocks)) {
          setContent({ status: 'failed' });
          return;
        }
        contentCache.set(linkId, data.blocks);
        setContent({ status: 'ready', blocks: data.blocks });
      })
      .catch(() => {
        if (!cancelled) setContent({ status: 'failed' });
      });

    return () => {
      cancelled = true;
    };
  }, [linkId]);

  // Esc 关闭
  useEffect(() => {
    if (!link) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [link, onClose]);

  // 面板打开时锁住背景滚动，关掉后还原（调用方可能自己设过 overflow）
  useEffect(() => {
    if (!link) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [link]);

  // 有序列表项的序号：扁平结构里自己数一遍，遇到非有序块就重新开始
  const numbering = useMemo(() => {
    const blocks = content.status === 'ready' ? content.blocks : [];
    const result: number[] = [];
    const counters = new Map<number, number>();

    blocks.forEach((block, index) => {
      if (block.type === 'list-item' && block.ordered) {
        const next = (counters.get(block.depth) ?? 0) + 1;
        counters.set(block.depth, next);
        result[index] = next;
      } else {
        counters.clear();
        result[index] = 0;
      }
    });

    return result;
  }, [content]);

  if (!link) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="link-detail-title"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm md:items-center md:p-6"
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl glass-surface md:max-h-[70vh] md:max-w-xl md:rounded-2xl"
      >
        {/* 头部（固定）：图标 + 标题。整行纵向居中，标题换行时图标跟着落到标题块中间 */}
        <div className="flex items-center gap-3 border-b border-border/50 p-4">
          <LinkIcon link={link} className="h-11 w-11 rounded-nav" />
          <h2
            id="link-detail-title"
            className="min-w-0 flex-1 text-lg font-semibold break-words text-foreground"
          >
            {link.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="-mr-1 shrink-0 rounded-nav p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <IconX className="h-5 w-5" />
          </button>
        </div>

        {/* 中部（滚动）：描述全文 + 点评 + 补充内容 */}
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {link.desc && <p className="text-sm leading-relaxed text-foreground/80">{link.desc}</p>}

          {link.review && (
            <div className="flex gap-2 rounded-nav bg-primary/5 px-3 py-2">
              <Quote className="mt-1 h-3.5 w-3.5 shrink-0 text-primary/50" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-foreground/90">{link.review}</p>
            </div>
          )}

          <ContentSection state={content} numbering={numbering} />

          {link.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {link.tags.map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    'inline-flex items-center rounded-md px-2 py-0.5 text-xs',
                    tag === '推荐'
                      ? 'bg-warm/15 font-medium text-warm'
                      : 'bg-muted/40 text-muted-foreground',
                  )}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 底部（固定）：跳转不因内容长短而消失 */}
        <div className="border-t border-border/50 p-3">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-10 w-full items-center justify-center gap-1.5 rounded-nav bg-primary text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            访问官网
            <IconExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

/**
 * 正文区：取回内容才渲染，其余情况一律不出现。
 *
 * 加载中不给占位、取回为空也不给「暂无」—— 多数的条目本来就没有正文，
 * 摆出骨架再让它消失，等于让用户白等一场的同时还多看两帧状态。
 * 让「还在路上」与「本来就没有」在视觉上完全一致：都是空白，正文回来才长出来。
 */
function ContentSection({ state, numbering }: { state: ContentState; numbering: number[] }) {
  if (state.status === 'loading') {
    return null;
  }

  if (state.status === 'failed') {
    return <p className="text-sm text-muted-foreground">补充内容加载失败，请稍后重试。</p>;
  }

  if (state.blocks.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {state.blocks.map((block, index) => (
        <BlockView key={index} block={block} order={numbering[index]} />
      ))}
    </div>
  );
}

/** 行内富文本：加粗、斜体、行内代码与链接逐段还原，不抹平用户写的格式。 */
function RichText({ spans }: { spans: RichTextSpan[] }) {
  return (
    <>
      {spans.map((span, index) => {
        const content = (
          <span
            className={cn(
              span.bold && 'font-semibold',
              span.italic && 'italic',
              span.underline && 'underline',
              span.strike && 'line-through',
              span.code && 'rounded bg-muted/60 px-1 py-0.5 font-mono text-[0.85em]',
            )}
          >
            {span.text}
          </span>
        );

        if (!span.href) return <span key={index}>{content}</span>;

        return (
          <a
            key={index}
            href={span.href}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-primary underline decoration-primary/30 underline-offset-2 hover:decoration-primary"
          >
            {content}
          </a>
        );
      })}
    </>
  );
}

const TEXT_BASE = 'text-sm leading-relaxed text-foreground/85';

function BlockView({ block, order }: { block: ContentBlock; order: number }) {
  // depth 是 Notion 的嵌套层级，扁平结构里靠左内边距还原
  const indent = block.depth > 0 ? { marginLeft: `${block.depth * 1.25}rem` } : undefined;

  switch (block.type) {
    case 'heading':
      return (
        <p
          style={indent}
          className={cn(
            'font-semibold text-foreground',
            block.level === 1 && 'text-base',
            block.level >= 2 && 'text-sm',
            block.level >= 2 && 'text-foreground/90',
          )}
        >
          <RichText spans={block.spans} />
        </p>
      );

    case 'list-item':
      return (
        <div style={indent} className={cn(TEXT_BASE, 'flex gap-2')}>
          <span className="shrink-0 select-none text-muted-foreground">
            {block.ordered ? `${order}.` : '•'}
          </span>
          <span className="min-w-0">
            <RichText spans={block.spans} />
          </span>
        </div>
      );

    case 'todo':
      return (
        <div style={indent} className={cn(TEXT_BASE, 'flex gap-2')}>
          {block.checked ? (
            <IconCheckbox className="mt-0.5 h-4 w-4 shrink-0 text-primary/70" aria-hidden="true" />
          ) : (
            <IconSquare
              className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/60"
              aria-hidden="true"
            />
          )}
          <span className={cn('min-w-0', block.checked && 'text-muted-foreground line-through')}>
            <RichText spans={block.spans} />
          </span>
        </div>
      );

    case 'quote':
      return (
        <blockquote
          style={indent}
          className={cn(TEXT_BASE, 'border-l-2 border-primary/30 pl-3 text-foreground/75')}
        >
          <RichText spans={block.spans} />
        </blockquote>
      );

    case 'callout':
      return (
        <div style={indent} className={cn(TEXT_BASE, 'rounded-nav bg-muted/40 px-3 py-2')}>
          <RichText spans={block.spans} />
        </div>
      );

    case 'code':
      return (
        <pre
          style={indent}
          className="overflow-x-auto rounded-nav bg-muted/50 p-3 text-xs leading-relaxed"
        >
          <code className="font-mono text-foreground/85">{block.text}</code>
        </pre>
      );

    case 'divider':
      return <hr style={indent} className="border-border/50" />;

    case 'image':
      return (
        <figure style={indent} className="space-y-1.5">
          {/* 原生 img：Notion 的图是签名地址，走 Image Optimization 只会多一层失效风险 */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={block.url}
            alt={block.caption}
            loading="lazy"
            className="max-w-full rounded-nav border border-border/40"
          />
          {block.caption && (
            <figcaption className="text-xs text-muted-foreground">{block.caption}</figcaption>
          )}
        </figure>
      );

    // paragraph / toggle / text（兜底拍扁）排版一致：折叠块的子块已在服务端拉平
    default:
      return (
        <p style={indent} className={TEXT_BASE}>
          <RichText spans={block.spans} />
        </p>
      );
  }
}
