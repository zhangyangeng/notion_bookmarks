'use client';

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';

// 明暗跟随系统，同时允许手动指定浅色 / 深色。
// attribute="class" 与 globals.css 的 .dark 变量块、tailwind 的 darkMode: "class" 对齐。
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
