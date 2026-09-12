// src/app/api/config/route.ts
import { getWebsiteConfig } from '@/lib/notion';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.error('API: 开始获取网站配置...');
    const config = await getWebsiteConfig();
    console.error('API: 成功获取配置:', config);
    return NextResponse.json(config);
  } catch (error) {
    console.error('获取配置失败:', error);
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 });
  }
}
