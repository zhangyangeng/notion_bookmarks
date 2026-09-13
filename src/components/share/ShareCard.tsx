'use client';

import { Link } from '@/types';
import { IconExternalLink } from '@tabler/icons-react';
import { Quote } from 'lucide-react';
import { cn } from '@/lib/utils';
import LinkIcon from '@/components/ui/LinkIcon';

interface ShareCardProps {
  link: Link;
}

/**
 * 分享页卡片：突出「点评」—— 这是公开面的核心资产（见设计文档 1.3）。
 * 与首页 LinkCard 的差别：点评与站点描述并重，点评放在名称正下方、用醒目样式。
 */
export default function ShareCard({ link }: ShareCardProps) {
  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-4 p-5 rounded-lg border border-border/50 glass-card hover:border-primary/40 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
    >
      {/* 站点图标（左）：不给容器铺底色，异形 logo 不再顶着方块 */}
      <LinkIcon link={link} className="w-12 h-12 rounded-nav" />

      {/* 内容（右） */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xl font-semibold text-foreground group-hover:text-primary transition-colors">
            {link.name}
          </h3>
          <IconExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>

        {/* 点评：圆角块 + 引号图标，取代原先贯穿的硬竖线 */}
        {link.review && (
          <div className="flex gap-2 rounded-nav bg-primary/5 px-3 py-2">
            <Quote className="w-3.5 h-3.5 text-primary/50 shrink-0 mt-1" aria-hidden="true" />
            <p className="text-base text-foreground/90 leading-relaxed">{link.review}</p>
          </div>
        )}

        {link.desc && link.desc !== link.review && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{link.desc}</p>
        )}

        {/* 标签：「推荐」用暖赭点缀，其余中性，避免整页只有一种墨绿 */}
        {link.tags && link.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {link.tags.map((tag) => (
              <span
                key={tag}
                className={cn(
                  'inline-flex items-center px-2 py-0.5 text-xs rounded-md',
                  tag === '推荐'
                    ? 'bg-warm/15 text-warm font-medium'
                    : 'bg-muted/40 text-muted-foreground',
                )}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </a>
  );
}
