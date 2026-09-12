'use client';

import * as React from 'react';
import { IconPalette, IconSun, IconMoon, IconDeviceDesktop } from '@tabler/icons-react';
import { useTheme } from 'next-themes';

interface ThemeSwitcherProps {
  className?: string;
}

type IconComponent = React.ComponentType<{ className?: string }>;

// 主题值退化为三态：设计语言只剩一套，明暗交给系统与用户偏好
const THEME_OPTIONS: { value: string; label: string; icon: IconComponent }[] = [
  { value: 'light', label: '浅色', icon: IconSun },
  { value: 'dark', label: '深色', icon: IconMoon },
  { value: 'system', label: '跟随系统', icon: IconDeviceDesktop },
];

export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const [mounted, setMounted] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const { theme, setTheme } = useTheme();
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);

  // 处理点击外部关闭下拉菜单
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  // 服务端无法得知用户偏好，挂载后再渲染，避免 hydration 不一致
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className={`theme-switcher relative ${className || ''}`}>
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="theme-switcher-trigger p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors active:scale-95"
        aria-label="切换主题"
      >
        <IconPalette className="w-5 h-5" />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="theme-switcher-menu absolute right-0 mt-2 w-40 py-2 bg-popover border rounded-lg shadow-lg z-[200]"
          onClick={(e) => e.stopPropagation()}
        >
          {THEME_OPTIONS.map(({ value, label, icon: OptionIcon }) => (
            <button
              key={value}
              className={`theme-switcher-option w-full flex items-center gap-2 px-4 py-2 text-sm rounded-md transition-colors
                        ${
                          theme === value
                            ? 'theme-switcher-option-active bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
              onClick={() => {
                setTheme(value);
                setIsOpen(false);
              }}
            >
              <OptionIcon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
