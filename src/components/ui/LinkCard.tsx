'use client';

import { Link } from '@/types';
import { IconExternalLink } from '@tabler/icons-react';
import React, { useState, useEffect, memo, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  FALLBACK_ICON_SRC,
  ICON_LOAD_TIMEOUT_MS,
  getFailedIconState,
  getInitialIconState,
  getLoadedIconState,
  getTimedOutIconState,
} from '@/lib/link-icon';

interface LinkCardProps {
  link: Link;
  className?: string;
}

// 独立的图标组件，事件驱动加载，杜绝任何定时器轮询
const OptimisedLinkIcon = memo(function OptimisedLinkIcon({ 
  src, 
  alt, 
  onLoad, 
  onError 
}: { 
  src: string; 
  alt: string; 
  onLoad?: () => void; 
  onError: () => void;
}) {
  const imageRef = useRef<HTMLImageElement>(null);

  // 仅在初始挂载或 src 改变时检查已完成的缓存图片，不使用 setInterval 轮询
  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;

    if (image.complete) {
      if (image.naturalWidth > 0) {
        onLoad?.();
      } else {
        onError();
      }
    }
  }, [src, onLoad, onError]);

  return (
    // 使用原生 img，避免 Vercel Image Optimization 免费额度消耗与额外开销
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imageRef}
      src={src}
      alt={alt}
      className="w-full h-full object-contain transition-opacity duration-200"
      onLoad={onLoad}
      onError={onError}
      loading="lazy"
      decoding="async"
      fetchPriority="low"
    />
  );
}, (prev, next) => prev.src === next.src && prev.alt === next.alt);

const LinkCard = memo(function LinkCard({ link, className }: LinkCardProps) {
  const [iconState, setIconState] = useState(() => getInitialIconState(link));
  const iconContainerRef = useRef<HTMLDivElement>(null);

  const handleImageError = useCallback(() => {
    setIconState(getFailedIconState());
  }, []);

  const handleImageLoad = useCallback(() => {
    setIconState((state) => getLoadedIconState(state));
  }, []);

  // 当 link 变化时更新图片源
  useEffect(() => {
    setIconState(getInitialIconState(link));
  }, [link]);

  // 超时降级单次定时器（无轮询）
  useEffect(() => {
    if (iconState.isLoaded || iconState.src === FALLBACK_ICON_SRC) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIconState((state) => {
        if (state.isLoaded || state.src === FALLBACK_ICON_SRC) {
          return state;
        }
        return getTimedOutIconState(state);
      });
    }, ICON_LOAD_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [iconState.isLoaded, iconState.src]);

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex h-full flex-col p-4 rounded-xl border border-border/50 bg-card hover:border-primary/50 transition-all duration-200",
        "hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 active:scale-[0.98]",
        "w-full max-w-full",
        className
      )}
    >
      {/* 内容容器 */}
      <div className="flex flex-col h-full gap-2">
        {/* 图标和名称行 */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* 图标容器 */}
          <div 
            className="relative w-10 h-10 rounded-xl overflow-hidden transition-all shrink-0 bg-muted/50 p-1.5 border border-border/50"
          >
            <div ref={iconContainerRef} className="icon-container relative w-full h-full">
              {iconState.showFallback && (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-center bg-contain bg-no-repeat opacity-70"
                  style={{ backgroundImage: `url(${FALLBACK_ICON_SRC})` }}
                />
              )}
              <OptimisedLinkIcon 
                src={iconState.src} 
                alt={link.name} 
                onLoad={handleImageLoad}
                onError={handleImageError}
              />
               
              {iconState.showSpinner && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
                  <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>
          
          {/* 网站名称和图标 */}
          <div className="flex-1 min-w-0 relative">
            <div className="relative">
              <h3 
                className="text-lg text-foreground group-hover:text-primary transition-colors line-clamp-1 pr-6"
                title={link.name}
              >
                {link.name}
              </h3>
            </div>
            {/* 固定位置的外链图标 */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2">
              <IconExternalLink 
                className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" 
              />
            </div>
          </div>
        </div>

        {/* 描述行 */}
        {link.desc && (
          <div className="relative flex-1 min-h-0">
            <p 
              className="text-sm text-foreground/80 group-hover:text-foreground line-clamp-2 transition-colors"
              title={link.desc}
            >
              {link.desc}
            </p>
          </div>
        )}

        {/* 标签行 - 放在底部 */}
        {link.tags && link.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-auto flex-shrink-0">
            {link.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className={cn(
                  'link-tag inline-flex items-center px-2 py-0.5 text-xs rounded-md bg-muted/40 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary/90 transition-colors',
                  tag.includes('力荐') && 'link-tag-featured'
                )}
                title={tag}
              >
                <span className="link-tag-label truncate max-w-[80px]">{tag}</span>
              </span>
            ))}
            {link.tags.length > 3 && (
              <span 
                className="link-tag inline-flex items-center px-2 py-0.5 text-xs rounded-md bg-muted/40 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary/90 transition-colors shrink-0"
              >
                +{link.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 渐变悬浮效果 */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-transparent via-transparent to-transparent
                    group-hover:from-primary/5 group-hover:via-primary/2 group-hover:to-transparent
                    transition-colors duration-500 rounded-xl" />
    </a>
  );
}, (prev, next) => {
  return (
    prev.link.id === next.link.id &&
    prev.link.name === next.link.name &&
    prev.link.desc === next.link.desc &&
    prev.link.url === next.link.url &&
    prev.link.iconfile === next.link.iconfile &&
    prev.link.iconlink === next.link.iconlink &&
    prev.className === next.className
  );
});

export default LinkCard;
