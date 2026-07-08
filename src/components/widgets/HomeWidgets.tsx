'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { WidgetSkeleton, HotNewsSkeleton } from '@/components/ui/Skeleton';
import { WebsiteConfig } from '@/types';
import { motion } from 'framer-motion';

// Dynamic imports for widgets
const SimpleTime = dynamic(() => import('@/components/widgets/SimpleTime'), {
  loading: () => <WidgetSkeleton className="w-[280px] h-[150px]" />,
  ssr: false
});

const AnalogClock = dynamic(() => import('@/components/widgets/AnalogClock'), {
  loading: () => <WidgetSkeleton className="w-[150px] h-[150px]" />,
  ssr: false
});

const Weather = dynamic(() => import('@/components/widgets/Weather'), {
  loading: () => <WidgetSkeleton className="w-[400px] h-[150px]" />,
  ssr: false
});

const IPInfo = dynamic(() => import('@/components/widgets/IPInfo'), {
  loading: () => <WidgetSkeleton className="w-[220px] h-[150px]" />,
  ssr: false
});

const HotNews = dynamic(() => import('@/components/widgets/HotNews'), {
  loading: () => <HotNewsSkeleton className="w-[300px] h-[150px]" />,
  ssr: false
});

const StockWatchlist = dynamic(() => import('@/components/widgets/StockWatchlist'), {
  loading: () => <WidgetSkeleton className="w-[340px] h-[150px]" />,
  ssr: false
});

interface HomeWidgetsProps {
    config: WebsiteConfig;
}

export default function HomeWidgets({ config }: HomeWidgetsProps) {
    const widgetMap: Record<string, React.ReactNode> = {
        '简易时钟': <SimpleTime />,
        '圆形时钟': <AnalogClock />,
        '天气': <Weather />,
        'IP信息': <IPInfo />,
        '热搜': <HotNews />,
        '自选股': <StockWatchlist />,
    };

    const widgetConfig = config.WIDGET_CONFIG?.split(',').map(s => s.trim()).filter(Boolean) ?? [];

    return (
        <div className="hidden lg:block w-full mb-8">
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="relative overflow-hidden"
            >
                <div className="flex overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                    <div className="flex space-x-4 px-1">
                        {widgetConfig.map((name, idx) => {
                            const Comp = widgetMap[name];
                            if (!Comp) return null;
                            return (
                                <div key={name + '-' + idx} className="flex-shrink-0">
                                    {Comp}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
