'use client';

import { Link } from '@/types';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  FALLBACK_ICON_SRC,
  ICON_LOAD_TIMEOUT_MS,
  getFailedIconState,
  getInitialIconState,
  getLoadedIconState,
  getTimedOutIconState,
} from '@/lib/link-icon';

interface LinkIconProps {
  link: Link;
  /** 外层图标框的尺寸与圆角，由调用方决定 */
  className?: string;
}

/**
 * 站点图标（首页卡片与分享页卡片共用）。
 *
 * 两处容易踩空的地方：
 *
 * 1. **图片在 hydration 之前就已失败**（例如源站对图标做了防盗链）时，
 *    `onError` 不会再触发一次，状态会永远停在「加载中」，最后落到超时兜底 ——
 *    破图的原生占位（alt 文本 + 破图图标）就这样留在页面上。挂载后主动查一次
 *    `complete && naturalWidth === 0` 补上这个判定。
 *
 * 2. **兜底图标与真实图片不能同时可见**，否则两者位置完全重合、画面糊成一团。
 *    兜底期间把 `<img>` 隐掉（仍然保留在 DOM 里继续加载），加载成功后自然露出。
 *
 * 另外带上 `referrerPolicy="no-referrer"`：部分站点（如 rg-adguard 系列）对带
 * Referer 的图标请求直接返回 403，去掉 Referer 才拿得到图。
 */
const LinkIcon = memo(function LinkIcon({ link, className }: LinkIconProps) {
  const [iconState, setIconState] = useState(() => getInitialIconState(link));
  const imageRef = useRef<HTMLImageElement>(null);

  const handleImageError = useCallback(() => setIconState(getFailedIconState()), []);
  const handleImageLoad = useCallback(() => setIconState((state) => getLoadedIconState(state)), []);

  // 当 link 变化时更新图片源
  useEffect(() => {
    setIconState(getInitialIconState(link));
  }, [link]);

  // 补判定 hydration 之前就已完成的加载（成功或失败），事件回调此时不会再触发
  useEffect(() => {
    const image = imageRef.current;
    if (!image || !image.complete) return;

    if (image.naturalWidth > 0) {
      handleImageLoad();
    } else {
      handleImageError();
    }
  }, [iconState.src, handleImageLoad, handleImageError]);

  // 超时降级：单次定时器，不轮询
  useEffect(() => {
    if (iconState.isLoaded || iconState.src === FALLBACK_ICON_SRC) return;

    const timeoutId = window.setTimeout(() => {
      setIconState((state) =>
        state.isLoaded || state.src === FALLBACK_ICON_SRC ? state : getTimedOutIconState(state),
      );
    }, ICON_LOAD_TIMEOUT_MS);

    return () => window.clearTimeout(timeoutId);
  }, [iconState.isLoaded, iconState.src]);

  return (
    <div className={cn('relative shrink-0 overflow-hidden', className)}>
      {/* 内层 15% 内边距把图标约束在同一视觉框内，方形/长条 logo 观感大小趋同 */}
      <div className="relative w-full h-full p-[15%]">
        {iconState.showFallback && (
          <div
            aria-hidden="true"
            className="absolute inset-[15%] bg-center bg-contain bg-no-repeat opacity-70"
            style={{ backgroundImage: `url(${FALLBACK_ICON_SRC})` }}
          />
        )}

        {/* 原生 img：避免 Vercel Image Optimization 额度消耗 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imageRef}
          src={iconState.src}
          alt={link.name}
          className={cn(
            'w-full h-full object-contain transition-opacity duration-200',
            iconState.showFallback && 'opacity-0',
          )}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          referrerPolicy="no-referrer"
        />

        {iconState.showSpinner && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
            <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
});

export default LinkIcon;
