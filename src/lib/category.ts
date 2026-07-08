// src/utils/category.ts
import { Link } from '@/types';

// 创建一个分类数据结构
export interface CategoryData {
  name: string;
  count: number;
  subCategories: {
    [key: string]: number;  // 子分类名称: 该子分类下的链接数量
  };
}

export function organizeCategories(links: Link[]): Record<string, CategoryData> {
  // 使用 reduce 来构建分类数据
  return links.reduce((acc, link) => {
    const category = link.category1;
    const subCategory = link.category2;

    // 如果这个主分类还不存在，创建它
    if (!acc[category]) {
      acc[category] = {
        name: category,
        count: 0,
        subCategories: {},
      };
    }

    // 增加主分类计数
    acc[category].count++;

    // 如果有子分类，处理子分类
    if (subCategory) {
      if (!acc[category].subCategories[subCategory]) {
        acc[category].subCategories[subCategory] = 0;
      }
      acc[category].subCategories[subCategory]++;
    }

    return acc;
  }, {} as Record<string, CategoryData>);
}