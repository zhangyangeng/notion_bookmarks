import { Client } from '@notionhq/client';
import {
  GetDatabaseResponse,
  DatabaseObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';
import { cache } from 'react';
import { envConfig } from '@/config';
import {
  Link,
  WebsiteConfig,
  Category,
  isNotionLinkPage,
  toLink,
  isNotionConfigPage,
  getConfigItem,
  isNotionCategoryPage,
  toCategory,
} from '@/types';

export const notion = new Client({
  auth: envConfig.NOTION_TOKEN,
});

export const revalidate = parseInt(process.env.REVALIDATE_TIME ?? '43200', 10);

// 可见性白名单：只有 `公开` 会被展示，其余值（含未填）一律不展示。
// 用白名单而非黑名单，是为了 fail-closed —— 条目漏填时默认不公开，而不是默认公开。
const VISIBILITY_PROPERTY = '可见性';
const VISIBILITY_PUBLIC = '公开';

// 获取网址链接
export const getLinks = cache(async () => {
  const databaseId = envConfig.NOTION_LINKS_DB_ID!;
  const allLinks: Link[] = [];
  let hasMore = true;
  let nextCursor: string | undefined;

  try {
    while (hasMore) {
      const response = await notion.databases.query({
        database_id: databaseId,
        start_cursor: nextCursor,
        filter: {
          property: VISIBILITY_PROPERTY,
          select: {
            equals: VISIBILITY_PUBLIC,
          },
        },
        // 只按创建时间取倒序，不依赖 category1 / category2 —— 这两个 Select
        // 字段在分类迁移完成后会被移除，查询不该被它们绑住。
        sorts: [
          {
            property: 'Created',
            direction: 'descending',
          },
        ],
      });

      const links = response.results.filter(isNotionLinkPage).map(toLink);

      allLinks.push(...links);
      hasMore = response.has_more;
      nextCursor = response.next_cursor || undefined;
    }

    // 对链接进行排序：先按是否置顶，再按创建时间
    allLinks.sort((a, b) => {
      // 带「推荐」标签的排在前面
      const aIsTop = a.tags.includes('推荐');
      const bIsTop = b.tags.includes('推荐');

      // 如果置顶状态不同，置顶的排在前面
      if (aIsTop !== bIsTop) {
        return aIsTop ? -1 : 1;
      }

      // 如果置顶状态相同，按创建时间逆序排序
      return new Date(b.created).getTime() - new Date(a.created).getTime();
    });

    return allLinks;
  } catch (error) {
    console.error('Error fetching links:', error);
    return [];
  }
});

// 获取网站配置
export const getWebsiteConfig = cache(async () => {
  try {
    const response = await notion.databases.query({
      database_id: envConfig.NOTION_WEBSITE_CONFIG_ID!,
    });

    const configMap: WebsiteConfig = {};

    response.results.forEach((page) => {
      if (!isNotionConfigPage(page)) return;
      const item = getConfigItem(page);
      if (item) {
        configMap[item.key] = item.value;
      }
    });

    // 获取配置数据库页面的图标作为网站图标
    const database = (await notion.databases.retrieve({
      database_id: envConfig.NOTION_WEBSITE_CONFIG_ID!,
    })) as GetDatabaseResponse;

    let favicon = '/favicon.ico';

    const fullDatabase = database as DatabaseObjectResponse;
    if (fullDatabase.icon) {
      if (fullDatabase.icon.type === 'emoji') {
        // 如果是 emoji，生成 data URL
        favicon = `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${fullDatabase.icon.emoji}</text></svg>`;
      } else if (fullDatabase.icon.type === 'file' && fullDatabase.icon.file) {
        favicon = fullDatabase.icon.file.url;
      } else if (fullDatabase.icon.type === 'external' && fullDatabase.icon.external) {
        favicon = fullDatabase.icon.external.url;
      }
    }

    // 返回基础配置
    // 将配置对象转换为 WebsiteConfig 类型
    // 注意：这里我们保留原有逻辑，将动态获取的配置与默认值合并
    const config: WebsiteConfig = {
      // 基础配置
      SITE_TITLE: configMap.SITE_TITLE ?? '我的导航',
      SITE_DESCRIPTION: configMap.SITE_DESCRIPTION ?? '个人导航网站',
      SITE_KEYWORDS: configMap.SITE_KEYWORDS ?? '导航,网址导航',
      SITE_AUTHOR: configMap.SITE_AUTHOR ?? '',
      SITE_FOOTER: configMap.SITE_FOOTER ?? '',
      SITE_FAVICON: favicon,
      // 主题配置
      THEME_NAME: configMap.THEME_NAME ?? 'simple',
      SHOW_THEME_SWITCHER: configMap.SHOW_THEME_SWITCHER ?? 'true',

      // 社交媒体配置
      SOCIAL_GITHUB: configMap.SOCIAL_GITHUB ?? '',
      SOCIAL_BLOG: configMap.SOCIAL_BLOG ?? '',
      SOCIAL_X: configMap.SOCIAL_X ?? '',
      SOCIAL_JIKE: configMap.SOCIAL_JIKE ?? '',
      SOCIAL_WEIBO: configMap.SOCIAL_WEIBO ?? '',
      SOCIAL_XIAOHONGSHU: configMap.SOCIAL_XIAOHONGSHU ?? '',
      // 分析和统计
      CLARITY_ID: configMap.CLARITY_ID ?? '',
      GA_ID: configMap.GA_ID ?? '',
    };

    return config;
  } catch (error) {
    console.error('获取网站配置失败，降级使用默认配置:', error);
    return {
      SITE_TITLE: '我的导航',
      SITE_DESCRIPTION: '个人导航网站',
      SITE_KEYWORDS: '导航,网址导航',
      SITE_AUTHOR: '',
      SITE_FOOTER: '',
      SITE_FAVICON: '/favicon.ico',
      THEME_NAME: 'simple',
      SHOW_THEME_SWITCHER: 'true',
      SOCIAL_GITHUB: '',
      SOCIAL_BLOG: '',
      SOCIAL_X: '',
      SOCIAL_JIKE: '',
      SOCIAL_WEIBO: '',
      SOCIAL_XIAOHONGSHU: '',
      CLARITY_ID: '',
      GA_ID: '',
    };
  }
});

// 获取分类记录（一级与二级混排的扁平列表，层级字段已解析，组装成树由 buildCategoryTree 完成）。
//
// 这里**不过滤 Enabled**，取全量：上层需要区分「分类被关闭」与「分类不存在」——
// 前者让条目整条收起，后者才落到「未分类」。过滤分别由 buildCategoryTree（管入口）
// 与 resolveLinks（管条目）完成。详见 src/lib/category.ts。
//
// NOTE: 此处未做分页循环。分类库当前 44 条，远低于 Notion 单页 100 条上限；
// 若将来超过 100 条，二级分类会被静默截断，届时需改成与 getLinks 相同的分页写法。
export const getCategories = cache(async (): Promise<Category[]> => {
  const databaseId = envConfig.NOTION_CATEGORIES_DB_ID;

  if (!databaseId) {
    return [];
  }

  try {
    const response = await notion.databases.query({
      database_id: databaseId,
      sorts: [
        {
          property: 'Order',
          direction: 'ascending',
        },
      ],
    });

    const categories = response.results.filter(isNotionCategoryPage).map(toCategory);

    return categories.sort((a, b) => a.order - b.order);
  } catch (err) {
    console.error('获取分类失败:', err);
    return [];
  }
});
