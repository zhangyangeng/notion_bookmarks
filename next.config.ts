import type { NextConfig } from 'next';

/**
 * 构建产物目录：开发与生产分开。
 *
 * Next.js 独占 distDir，需要时会清空其中内容 —— 两边共用一个目录，会互相清掉对方的产物。
 *
 * 生产侧保持 `.next`：Vercel 的构建器固定从该目录取产物，改掉会导致部署失败。
 * 因此只把开发侧分出去。可用 NEXT_DIST_DIR 覆盖。
 */
const distDir =
  process.env.NEXT_DIST_DIR ?? (process.env.NODE_ENV === 'development' ? '.next-dev' : '.next');

const config: NextConfig = {
  distDir,

  images: {
    // 禁用图片优化以避免付费服务
    unoptimized: true,
  },

  // 优化资源加载
  experimental: {
    optimizeCss: true,
  },
  // 优化预加载
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default config;
