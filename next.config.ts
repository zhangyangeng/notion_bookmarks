import type { NextConfig } from "next";

const config: NextConfig = {
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