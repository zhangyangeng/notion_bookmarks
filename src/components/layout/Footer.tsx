'use client';

import React, { memo } from 'react';
import { WebsiteConfig } from '@/types';
import { FaGithub, FaXTwitter, FaWeibo } from 'react-icons/fa6';
import { FaBlogger } from 'react-icons/fa';
import { cn } from '@/lib/utils';
import { copyrightYears } from '@/lib/copyright';

interface FooterProps {
  config: WebsiteConfig;
  /** 左侧让位：与内容区共用同一套侧栏外边距，避免压住浮起侧栏的底部圆角 */
  className?: string;
  /** 当前年份。由服务端计算后传入 —— 客户端取值会让首屏与服务端渲染不一致 */
  year: number;
}

type IconComponent = React.ComponentType<{ className?: string }>;

type SocialItem = {
  key: string;
  href: string;
  title: string;
  Icon?: IconComponent;
  imgSrc?: string;
};

const Footer = memo(function Footer({ config, className, year }: FooterProps) {
  const socials: SocialItem[] = [
    { key: 'github', href: config.SOCIAL_GITHUB, title: 'GitHub', Icon: FaGithub },
    { key: 'blog', href: config.SOCIAL_BLOG, title: 'Blog', Icon: FaBlogger },
    { key: 'x', href: config.SOCIAL_X, title: 'X (Twitter)', Icon: FaXTwitter },
    { key: 'jike', href: config.SOCIAL_JIKE, title: '即刻', imgSrc: '/logo_jike.png' },
    { key: 'weibo', href: config.SOCIAL_WEIBO, title: '微博', Icon: FaWeibo },
    { key: 'xhs', href: config.SOCIAL_XIAOHONGSHU, title: '小红书', imgSrc: '/xhs_logo.svg' },
  ].filter((item) => Boolean(item.href));

  return (
    <footer className={cn('fixed bottom-3 left-0 right-0 z-30', className)}>
      {/* 浮起胶囊条：footer 横向铺满内容列，内条 mx-4 与内容区 px-4 对齐（320→1264） */}
      <div className="rounded-lg glass-surface px-4 py-2 mx-4">
        {/* 单行：版权与社交图标同行，靠一条细分隔线断开两段 */}
        <div className="flex items-center justify-center gap-3">
          <p className="text-xs text-muted-foreground whitespace-nowrap">
            {/* 窄屏放不下完整版权说明，收成一行短格式，避免社交图标被挤到第二行 */}
            <span className="md:hidden">
              © {copyrightYears(year)} {config.SITE_AUTHOR}
            </span>
            <span className="hidden md:inline">
              © {copyrightYears(year)} {config.SITE_AUTHOR} · 保留所有权利 · 基于 Next.js 与 Notion
              构建
            </span>
          </p>

          <span aria-hidden="true" className="h-3.5 w-px shrink-0 bg-border/20" />

          <div className="flex shrink-0 items-center gap-0.5">
            {socials.map(({ key, href, title, Icon, imgSrc }) => (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                title={title}
                aria-label={title}
                className="flex h-7 w-7 items-center justify-center rounded-nav text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                {Icon ? (
                  <Icon className="w-4 h-4" />
                ) : (
                  <img
                    src={imgSrc}
                    alt={title}
                    width={16}
                    height={16}
                    /* 位图图标常驻灰度：红色灰度化后约 rgb(106,106,106)，与 muted-foreground
                       的 rgb(99,106,99) 亮度相当，不必再叠 opacity，否则会比同排图标浅。
                       悬停改压暗而非还原彩色，对应 FontAwesome 的 text-muted → text-foreground */
                    className="grayscale transition-[filter] hover:brightness-75"
                    loading="lazy"
                    decoding="async"
                  />
                )}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
});

export default Footer;
