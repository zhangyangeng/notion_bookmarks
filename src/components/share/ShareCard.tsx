'use client';

import { Link } from '@/types';
import { IconExternalLink } from '@tabler/icons-react';
import { Quote } from 'lucide-react';
import { cn } from '@/lib/utils';
import LinkIcon from '@/components/ui/LinkIcon';
import CardDetailTrigger from '@/components/ui/CardDetailTrigger';

interface ShareCardProps {
  link: Link;
  /** 点开详情入口时的回调；不传则整张卡只有「跳官网」一个动作 */
  onOpenDetail?: (link: Link) => void;
}

/**
 * 分享页卡片：突出「点评」—— 这是公开面的核心资产（见设计文档 1.3）。
 * 与首页 LinkCard 的差别：点评与站点描述并重，点评放在名称正下方、用醒目样式。
 *
 * 详情入口与首页同构：锚点与按钮并列，点卡片其余处仍是一步开官网。
 */
export default function ShareCard({ link, onOpenDetail }: ShareCardProps) {
  return (
    <div className="group relative rounded-lg transition-transform duration-200 hover:-translate-y-0.5">
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        /* 与首页同款底部行：底部只留 pb-2，最下一行由「标签 + 详情入口」共用 */
        className="flex gap-4 px-5 pt-5 pb-2 rounded-lg border border-border/50 glass-card transition-colors duration-200 hover:border-primary/40 hover:shadow-md"
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
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {link.desc}
            </p>
          )}

          {/*
           * 底部行：标签在左，右下角的「详情」入口与它同一条带、齐平。
           * 没有标签时这一行也得在，否则入口会浮到描述上去。
           */}
          <div
            className={cn(
              'flex flex-wrap items-center gap-1.5 pt-0.5',
              onOpenDetail && 'card-detail-band',
            )}
          >
            {link.tags?.map((tag) => (
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
        </div>
      </a>

      {onOpenDetail && (
        <CardDetailTrigger
          label={link.name}
          onClick={(event) => {
            event.stopPropagation();
            onOpenDetail(link);
          }}
        />
      )}
    </div>
  );
}
