import { useEffect, useState } from 'react';

/**
 * 平台判定：只有 macOS / iOS 用 ⌘(Command)，Windows / Linux / Android 用 Ctrl。
 * 快捷键提示必须跟着系统走 —— 给 Windows 用户看 ⌘ 等于让他猜。
 */
export type PlatformKind = 'mac' | 'other';

export function detectPlatform(): PlatformKind {
  if (typeof navigator === 'undefined') return 'mac';

  // Chromium 系的 userAgentData 比 UA 字符串可靠（UA 里 iPadOS 会伪装成 Macintosh）
  const platformHint = (navigator as Navigator & { userAgentData?: { platform?: string } })
    .userAgentData?.platform;
  if (typeof platformHint === 'string' && platformHint.length > 0) {
    return /mac|ios|ipad|iphone|ipod/i.test(platformHint) ? 'mac' : 'other';
  }

  const ua = navigator.userAgent;
  // iPadOS 13+ 的 UA 与 macOS 完全一致，靠触摸点数量区分
  const iPadPosingAsMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod|Macintosh/.test(ua) || iPadPosingAsMac ? 'mac' : 'other';
}

/**
 * 挂载后才返回平台，挂载前为 null。
 * NOTE: 服务端渲染拿不到 navigator，若首帧就渲染具体键帽会与客户端不一致（hydration mismatch），
 *       故调用方需在 null 时先不渲染快捷键，等挂载完成再补上。
 */
export function usePlatform(): PlatformKind | null {
  const [platform, setPlatform] = useState<PlatformKind | null>(null);
  useEffect(() => setPlatform(detectPlatform()), []);
  return platform;
}

/** 唤起搜索的快捷键键帽：⌘ + K（Apple）或 Ctrl + K（其余） */
export function searchShortcut(platform: PlatformKind | null): {
  modifier: string;
  key: string;
} | null {
  if (!platform) return null;
  return platform === 'mac' ? { modifier: '⌘', key: 'K' } : { modifier: 'Ctrl', key: 'K' };
}
