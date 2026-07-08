import React, { RefObject } from 'react';
import { motion } from 'framer-motion';

interface ErrorStateProps {
  message: string;
  currentCity: string;
  onRetry: () => void;
  onOpenSelector: (e: React.MouseEvent) => void;
  buttonRef: RefObject<HTMLButtonElement | null>; // Changed to RefObject to match useRef
  children?: React.ReactNode; // For the portal
}

export const ErrorState: React.FC<ErrorStateProps> = ({ 
  message, 
  currentCity, 
  onRetry, 
  onOpenSelector, 
  buttonRef,
  children 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="widget-card weather-widget p-4 bg-card/80 backdrop-blur-sm text-card-foreground w-[220px] h-[150px] flex flex-col justify-between relative overflow-hidden group"
      suppressHydrationWarning
    >
      {/* Background Decor */}
      <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-primary/20 to-transparent pointer-events-none transition-opacity group-hover:opacity-20"></div>
      
      <div className="flex justify-between items-start relative z-10">
        <div>
          <h3 className="text-xl font-medium text-destructive">获取失败</h3>
          <p className="text-xs mt-1 text-muted-foreground">{currentCity}</p>
        </div>
        <div className="flex items-center space-x-1">
          <div className="relative">
            <button 
              ref={buttonRef}
              onClick={onOpenSelector}
              className="text-xs p-1 rounded-full hover:bg-primary/10 focus:outline-none transition-colors"
              title="更改位置"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </button>
            {children}
          </div>
          <div className="weather-icon">
            <span className="text-2xl text-destructive">⚠️</span>
          </div>
        </div>
      </div>
      
      <div className="mt-2 relative z-10">
        <p className="text-sm text-muted-foreground break-words overflow-hidden line-clamp-3">{message}</p>
        <button 
          onClick={onRetry} 
          className="mt-2 text-xs text-primary hover:underline focus:outline-none"
        >
          点击重试
        </button>
      </div>
    </motion.div>
  );
};
