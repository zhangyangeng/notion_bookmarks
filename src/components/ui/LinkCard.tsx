'use client';

import { Link } from '@/types';
import { IconExternalLink } from '@tabler/icons-react';
import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import LinkIcon from '@/components/ui/LinkIcon';
import CardDetailTrigger from '@/components/ui/CardDetailTrigger';

interface LinkCardProps {
  link: Link;
  className?: string;
  style?: React.CSSProperties;
  /** 点开详情入口时的回调；不传则整张卡只有「跳官网」一个动作 */
  onOpenDetail?: (link: Link) => void;
}

const LinkCard = memo(
  function LinkCard({ link, className, style, onOpenDetail }: LinkCardProps) {
    return (
      /*
       * 容器承担三件事：定位、hover 反馈、给入口做 group 锚点。
       * hover 的位移与缩放放在这一层而不是锚点上 —— 否则悬停时锚点动了、入口没动，
       * 两者会在右下角错开几个像素。
       */
      <div
        className={cn(
          'group relative h-full rounded-lg',
          'transition-transform duration-200 hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.98]',
          className,
        )}
        style={style}
      >
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          /*
           * 底部只留 pb-2：卡片最下一行由「标签 + 详情入口」共用（见下方标签行）。
           * 不能写 p-4 + pb——同类 utility 的覆盖顺序会随配置变，这里用显式的四边。
           */
          className={cn(
            'flex h-full min-h-[120px] items-start gap-4 px-4 pt-4 pb-2 rounded-lg glass-card',
            'transition-shadow duration-200 hover:shadow-xl hover:shadow-primary/10',
            'w-full max-w-full',
          )}
        >
          {/* 图标（左）：不给容器铺底色，异形 logo 不再顶着方块 */}
          <LinkIcon link={link} className="w-14 h-14 rounded-lg" />

          {/* 内容（右） */}
          <div className="flex-1 min-w-0 flex flex-col h-full gap-1.5">
            {/* 标题行 */}
            <div className="flex items-center gap-2">
              <h3
                className="flex-1 min-w-0 text-base font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-2"
                title={link.name}
              >
                {link.name}
              </h3>
              <IconExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>

            {/* 描述：最多 3 行，头号痛点「描述看得见」 */}
            {link.desc && (
              <p
                className="text-sm text-foreground/80 group-hover:text-foreground line-clamp-3 transition-colors"
                title={link.desc}
              >
                {link.desc}
              </p>
            )}

            {/*
             * 底部行：标签在左，右下角的「详情」入口与它同一条带、齐平。
             * 用 mt-auto 吸收上方剩余空间停在底部；没有标签时这一行也得在，
             * 否则入口会浮到描述上去。
             */}
            <div
              className={cn(
                'flex flex-wrap items-center gap-1.5 mt-auto pt-1',
                onOpenDetail && 'card-detail-band',
              )}
            >
              {link.tags?.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 text-xs rounded-md bg-muted/40 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary/90 transition-colors',
                    tag === '推荐' && 'link-tag-featured font-medium',
                  )}
                  title={tag}
                >
                  <span className="truncate max-w-[80px]">{tag}</span>
                </span>
              ))}
              {link.tags && link.tags.length > 3 && (
                <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-md bg-muted/40 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary/90 transition-colors shrink-0">
                  +{link.tags.length - 3}
                </span>
              )}
            </div>
          </div>
        </a>

        {/* 入口与锚点并列：点它弹详情，点其余任意处仍是一步开官网 */}
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
  },
  (prev, next) => {
    return (
      prev.link.id === next.link.id &&
      prev.link.name === next.link.name &&
      prev.link.desc === next.link.desc &&
      prev.link.url === next.link.url &&
      prev.link.iconfile === next.link.iconfile &&
      prev.link.iconlink === next.link.iconlink &&
      prev.link.tags === next.link.tags &&
      prev.onOpenDetail === next.onOpenDetail &&
      prev.className === next.className
    );
  },
);

export default LinkCard;
