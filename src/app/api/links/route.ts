// src/app/api/links/route.ts
import { getCategories, getLinks } from '@/lib/notion';
import { resolveLinks } from '@/lib/category';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // 与首页走同一条解析路径：分类引用解析成记录 id，所属分类被关闭的条目不返回
    const [links, categories] = await Promise.all([getLinks(), getCategories()]);
    return NextResponse.json(resolveLinks(links, categories));
  } catch (error) {
    console.error('获取链接失败:', error);
    return NextResponse.json({ error: '获取链接失败' }, { status: 500 });
  }
}
