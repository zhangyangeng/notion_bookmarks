'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';
import { IconPalette, IconSun, IconMoon, IconDeviceDesktop, IconCheck } from '@tabler/icons-react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

interface ThemeSwitcherProps {
  className?: string;
  /**
   * 菜单沿着哪条边对齐：
   * `right`（默认）右边缘贴住按钮、向左展开；`left` 左边缘贴住按钮、向右展开。
   * 侧栏折叠态只有 64px 宽，必须传 `left`，否则菜单会把左侧让出去、溢出屏幕。
   */
  align?: 'left' | 'right';
}

type IconComponent = React.ComponentType<{ className?: string }>;

// 主题值退化为三态：设计语言只剩一套，明暗交给系统与用户偏好
const THEME_OPTIONS: { value: string; label: string; icon: IconComponent }[] = [
  { value: 'light', label: '浅色', icon: IconSun },
  { value: 'dark', label: '深色', icon: IconMoon },
  { value: 'system', label: '跟随系统', icon: IconDeviceDesktop },
];

/** 菜单宽度，需与下方 `w-40` 保持一致 */
const MENU_WIDTH = 160;
/** 菜单与视口边缘的安全距离 */
const VIEWPORT_GAP = 8;

export function ThemeSwitcher({ className, align = 'right' }: ThemeSwitcherProps) {
  const [mounted, setMounted] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const [position, setPosition] = React.useState<{ top: number; left: number } | null>(null);
  const { theme, setTheme } = useTheme();
  const menuRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  /*
   * 菜单通过 portal 挂到 body 上，而不是留在按钮旁边。
   * 原因：侧栏是 `overflow-y-auto` 的滚动面板，而 `overflow-y: auto` 会把 `overflow-x`
   * 一并算成 auto —— 留在侧栏里就会被横向裁掉（折叠态尤其明显）。
   */
  const updatePosition = React.useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const preferredLeft = align === 'left' ? rect.left : rect.right - MENU_WIDTH;
    const maxLeft = window.innerWidth - MENU_WIDTH - VIEWPORT_GAP;

    setPosition({
      top: rect.bottom + 8,
      left: Math.min(Math.max(VIEWPORT_GAP, preferredLeft), Math.max(VIEWPORT_GAP, maxLeft)),
    });
  }, [align]);

  // 打开期间跟随按钮移动（侧栏自身滚动、窗口缩放），避免菜单与按钮脱节
  React.useEffect(() => {
    if (!isOpen) return;

    const onReflow = () => updatePosition();
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
    return () => {
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
    };
  }, [isOpen, updatePosition]);

  // 处理点击外部关闭下拉菜单
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        buttonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Esc 关闭，与命令面板保持一致
  React.useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  // 服务端无法得知用户偏好，挂载后再渲染，避免 hydration 不一致
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className={cn('relative', className)}>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          if (isOpen) {
            setIsOpen(false);
          } else {
            updatePosition();
            setIsOpen(true);
          }
        }}
        className="p-2 rounded-nav text-muted-foreground hover:text-foreground hover:bg-accent transition-colors active:scale-95"
        aria-label="切换主题"
        aria-expanded={isOpen}
      >
        <IconPalette className="w-5 h-5" />
      </button>

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: position.top, left: position.left }}
            className="fixed w-40 p-1.5 rounded-nav glass-surface shadow-lg z-[200]"
            onClick={(e) => e.stopPropagation()}
          >
            {THEME_OPTIONS.map(({ value, label, icon: OptionIcon }) => {
              const isActive = theme === value;

              return (
                <button
                  key={value}
                  onClick={() => {
                    setTheme(value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-nav transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                  )}
                >
                  <OptionIcon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">{label}</span>
                  {isActive && <IconCheck className="w-4 h-4 shrink-0" aria-hidden="true" />}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
