// src/app/api/links/route.ts
import { getLinks } from '@/lib/notion';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const links = await getLinks();
    return NextResponse.json(links);
  } catch (error) {
    console.error('获取链接失败:', error);
    return NextResponse.json({ error: '获取链接失败' }, { status: 500 });
  }
}
