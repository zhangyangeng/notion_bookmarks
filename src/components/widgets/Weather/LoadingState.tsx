import React from 'react';
import { motion } from 'framer-motion';

export const LoadingState: React.FC = () => (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className="widget-card weather-widget p-4 bg-card/80 backdrop-blur-sm text-card-foreground w-[220px] h-[150px] flex items-center justify-center"
    suppressHydrationWarning
  >
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
      <p className="text-sm">获取天气信息...</p>
    </div>
  </motion.div>
);

export const InitialLoadingState: React.FC = () => (
  <div 
    className="widget-card weather-widget p-4 bg-card/80 backdrop-blur-sm text-card-foreground w-[220px] h-[150px] flex flex-col justify-between relative overflow-hidden group animate-fade-in"
    suppressHydrationWarning
  >
    <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-primary/20 to-transparent pointer-events-none transition-opacity group-hover:opacity-20"></div>
    <div className="text-center m-auto">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
      <p className="text-sm">加载中...</p>
    </div>
  </div>
);
