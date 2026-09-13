'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * 动态阈值：取视口高度的 20% 与 160px 的较大值。
 * 固定像素值在短页（如当前 1203px 总高）上永远达不到，导致按钮不出现。
 */
function getThreshold(): number {
  return Math.max(160, window.innerHeight * 0.2);
}

export default function BackToTop() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > getThreshold());
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  /*
   * 底部偏移随页面而定，因为两处的「底部占用」不同：
   * - 首页底部有浮起的版权条（12px 外边距 + 约 46px 高），按钮必须让位，否则压在条上；
   * - 分享页没有这条，若沿用同一让位值，按钮会孤零零悬在半空。
   * 分享页路由固定为 /c/[slug]，故按前缀判断。
   */
  const bottomOffset = pathname?.startsWith('/c/') ? 'bottom-3' : 'bottom-[68px]';

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      title="回到顶部"
      aria-label="回到顶部"
      className={cn(
        'glass-brilliant fixed right-3 z-30 flex h-11 w-11 items-center justify-center rounded-full',
        bottomOffset,
        /* 悬停点亮到主色而非加深到黑 —— 与侧栏 / 卡片的强调色保持同一套语言 */
        'text-foreground/70 hover:text-primary hover:-translate-y-0.5 transition-all duration-300',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
      )}
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}
