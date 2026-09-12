// 默认配置
export const defaultConfig = {
  // 基础配置
  SITE_TITLE: 'Notion 导航站',
  SITE_DESCRIPTION: '使用 Notion 作为数据库的个人导航网站 - 为您提供高质量的网址导航服务',
  SITE_KEYWORDS: 'Notion导航,网址导航,个人导航,书签管理,在线工具,效率工具',
  SITE_FOOTER: '',
  // 社交媒体配置
  SOCIAL_GITHUB: '',
  SOCIAL_BLOG: '',
  SOCIAL_X: '',
  SOCIAL_JIKE: '',
  SOCIAL_WEIBO: '',
  SOCIAL_XIAOHONGSHU: '',
} as const;

// 环境变量配置
export const envConfig = {
  // Notion配置
  NOTION_TOKEN: process.env.NOTION_TOKEN,
  NOTION_LINKS_DB_ID: process.env.NOTION_LINKS_DB_ID,
  NOTION_WEBSITE_CONFIG_ID: process.env.NOTION_WEBSITE_CONFIG_ID,
  NOTION_CATEGORIES_DB_ID: process.env.NOTION_CATEGORIES_DB_ID,
  // 分析和统计
  CLARITY_ID: process.env.NEXT_PUBLIC_CLARITY_ID ?? '',
  GA_ID: process.env.GA_ID ?? '',
  // 页面重新验证时间（秒）
  // REVALIDATE_TIME: parseInt(process.env.REVALIDATE_TIME ?? '3600', 10),
} as const;

// 配置类型
export type Config = typeof defaultConfig & {
  // 添加可选的运行时配置项
  CLARITY_ID?: string;
  GA_ID?: string;
  // 主题配置
  THEME_NAME?: string;
  SHOW_THEME_SWITCHER?: string;
};

// 合并配置
export function mergeConfig(runtimeConfig: Partial<Config> = {}): Config {
  return {
    ...defaultConfig,
    ...runtimeConfig,
    CLARITY_ID: envConfig.CLARITY_ID,
    GA_ID: envConfig.GA_ID,
  };
}
