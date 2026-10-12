'use client';

import { useCallback, useState } from 'react';
import type { Link } from '@/types';
import ShareCard from '@/components/share/ShareCard';
import LinkDetailPanel from '@/components/ui/LinkDetailPanel';

/**
 * 分享页的卡片列表。
 *
 * 页面本身是 Server Component（要产出静态快照），而弹层的开合必须有状态，
 * 故把「列表 + 弹层」一起挪到客户端 —— 弹层组件与首页共用同一个。
 */
export default function ShareCollectionList({ links }: { links: Link[] }) {
  const [detailLink, setDetailLink] = useState<Link | null>(null);

  const handleOpenDetail = useCallback((link: Link) => setDetailLink(link), []);
  const handleCloseDetail = useCallback(() => setDetailLink(null), []);

  return (
    <>
      <div className="flex flex-col gap-3">
        {links.map((link) => (
          <ShareCard key={link.id} link={link} onOpenDetail={handleOpenDetail} />
        ))}
      </div>
      <LinkDetailPanel link={detailLink} onClose={handleCloseDetail} />
    </>
  );
}
