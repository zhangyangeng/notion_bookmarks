// src/lib/anchor.ts

/** 锚点写入地址栏的方式：`push` 记一条新历史（点击导航），`replace` 覆盖当前条目（滚动同步） */
export type AnchorWriteMode = 'push' | 'replace';

/**
 * 把锚点写进地址栏；传空串表示清掉锚点。
 *
 * NOTE: 用 History API 而不是给 `location.hash` 赋值 —— 赋值会让浏览器按原生锚点再滚一次，
 *       跟本组件自己控制的滚动位置与时机打架。查询词同步（`?q=`）同此做法。
 *       路径与查询串沿用当前值，只换 hash，免得顺手抹掉别的状态。
 */
export function writeAnchorHash(hash: string, mode: AnchorWriteMode = 'push'): void {
  if (typeof window === 'undefined') return;

  const { pathname, search, hash: current } = window.location;
  const next = `${pathname}${search}${hash ? `#${hash}` : ''}`;
  if (next === `${pathname}${search}${current}`) return;

  if (mode === 'push') {
    window.history.pushState(null, '', next);
  } else {
    window.history.replaceState(null, '', next);
  }
}

/**
 * 滚动到锚点元素。偏移由 `globals.css` 的 `html { scroll-padding-top }` 统一提供，此处不再叠加。
 *
 * NOTE: 分类切换后目标区块要等 React 完成一次提交才出现在 DOM 里，故按帧重试若干次。
 *       始终找不到目标就回落到页顶 —— 点了导航却停在原地，比回到顶部更难解释。
 *       整个重试过程仍在浏览器绘制前完成，用户看不到中间位置。
 */
export function scrollToAnchor(
  elementId: string,
  behavior: ScrollBehavior = 'smooth',
  maxFrames = 12,
): void {
  if (typeof window === 'undefined') return;

  const attempt = (framesLeft: number) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior, block: 'start' });
      return;
    }
    if (framesLeft > 0) {
      window.requestAnimationFrame(() => attempt(framesLeft - 1));
      return;
    }
    window.scrollTo({ top: 0, behavior });
  };

  window.requestAnimationFrame(() => attempt(maxFrames));
}
