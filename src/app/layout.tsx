import './globals.css';
import { ThemeProvider } from '@/components/ui/ThemeProvider';
import BackToTop from '@/components/ui/BackToTop';
import { Metadata } from 'next';
import { Clarity } from '@/components/analytics/Clarity';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

import { getWebsiteConfig } from '@/lib/notion';
import { mergeConfig } from '@/config';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const config = mergeConfig(await getWebsiteConfig());

  return {
    // 未配置站点地址时退回 Vercel 提供的部署域名，避免把 localhost 写进 og:url
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
    ),
    title: {
      default: config.SITE_TITLE || 'Ezho导航',
      template: `%s | ${config.SITE_TITLE || 'Ezho工具箱'}`,
    },
    description: config.SITE_DESCRIPTION || 'Ezho工具箱，超级个体需要知道的各种好用工具',
    keywords: config.SITE_KEYWORDS?.split(',') || ['AI导航', '超级个体', '工具箱'],
    icons: {
      icon: '/favicon.ico',
    },
    openGraph: {
      type: 'website',
      locale: 'zh_CN',
      url: '/',
      title: config.SITE_TITLE,
      description: config.SITE_DESCRIPTION,
      siteName: config.SITE_TITLE,
      // 站点级分享图，全站兜底：微信 / QQ / 飞书 / 钉钉等国内平台读的都是 og:image
      images: [
        {
          url: '/og.png',
          width: 1200,
          height: 630,
          alt: config.SITE_TITLE,
        },
      ],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const config = mergeConfig(await getWebsiteConfig());

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <Clarity clarityId={config.CLARITY_ID || ''} />
        <GoogleAnalytics gaId={config.GA_ID || ''} />
      </head>
      <body>
        <ThemeProvider>
          {children}
          {/* 挂在根布局：首页与分享页共用同一个回到顶部入口 */}
          <BackToTop />
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
