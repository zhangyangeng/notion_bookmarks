'use client';

import { Link } from '@/types';
import { IconExternalLink } from '@tabler/icons-react';
import React from 'react';

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
      className="group flex flex-col gap-2 p-5 rounded-xl border border-border/50 bg-card hover:border-primary/50 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
          {link.name}
        </h3>
        <IconExternalLink className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
      </div>

      {link.review && (
        <p className="text-sm text-foreground/90 leading-relaxed">💬 {link.review}</p>
      )}

      {link.desc && link.desc !== link.review && (
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{link.desc}</p>
      )}
    </a>
  );
}
