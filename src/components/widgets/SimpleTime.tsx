'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Lunar from 'lunar-javascript';

export default function SimpleTime() {
  // 使用 null 初始状态，避免服务端和客户端渲染不一致
  const [mounted, setMounted] = useState(false);
  const [time, setTime] = useState<Date | null>(null);
  const [lunarDate, setLunarDate] = useState('');
  
  // 使用 ref 存储当前日期，避免无限循环
  const dateRef = useRef({
    day: 0,
    month: 0,
    year: 0
  });

  // 农历日期转换函数
  function getLunarDate(date: Date): string {
    try {
      // 使用 lunar-javascript 库计算农历日期
      const { Solar } = Lunar;
      const lunar = Solar.fromDate(date).getLunar();
      return `农历 ${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`;
    } catch (error) {
      console.error('Error calculating lunar date:', error);
      return '农历日期获取失败';
    }
  }

  useEffect(() => {
    // 客户端挂载后，设置为当前时间并开始计时
    setMounted(true);
    const now = new Date();
    setTime(now);
    setLunarDate(getLunarDate(now));
    
    // 初始化日期引用
    dateRef.current = {
      day: now.getDate(),
      month: now.getMonth(),
      year: now.getFullYear()
    };
    
    const timer = setInterval(() => {
      const currentTime = new Date();
      setTime(currentTime);
      
      // 只在日期变化时更新农历日期，避免不必要的计算
      if (currentTime.getDate() !== dateRef.current.day || 
          currentTime.getMonth() !== dateRef.current.month || 
          currentTime.getFullYear() !== dateRef.current.year) {
        
        // 更新引用中存储的日期
        dateRef.current = {
          day: currentTime.getDate(),
          month: currentTime.getMonth(),
          year: currentTime.getFullYear()
        };
        
        setLunarDate(getLunarDate(currentTime));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []); // 依赖数组为空，只在组件挂载时执行一次

  // 日期格式化 - 只有在 time 存在时才进行

  const month = (time?.getMonth() || 0) + 1;
  const day = time?.getDate() || 0;
  const hours = (time?.getHours() || 0).toString().padStart(2, '0');
  const minutes = (time?.getMinutes() || 0).toString().padStart(2, '0');
  const seconds = (time?.getSeconds() || 0).toString().padStart(2, '0');
  
  // 获取星期几
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];
  const weekDay = weekDays[time?.getDay() || 0];

  // 如果未挂载或时间未初始化，返回加载状态
  if (!mounted || !time) {
    return (
      <div className="flex flex-row items-center justify-center">
        <div className="widget-card simple-time-widget p-4 rounded-xl border border-border/40 bg-card/80 backdrop-blur-sm shadow-sm w-[280px] h-[150px] flex items-center">
          <div className="flex items-center w-full">
            <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
              <div className="bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 text-xs text-center py-0.5">
                --月
              </div>
              <div className="flex-1 flex items-center justify-center">
                <span className="text-3xl font-bold text-gray-400 dark:text-gray-500">--</span>
              </div>
            </div>
            
            <div className="ml-3 flex flex-col">
              <div className="font-medium text-gray-400 dark:text-gray-500">星期-</div>
              <div className="text-xs text-gray-400 dark:text-gray-500">农历 --月--</div>
              <div className="text-base font-medium font-mono text-gray-400 dark:text-gray-500 mt-1">--:--:--</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-row items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="widget-card simple-time-widget p-4 bg-card/80 backdrop-blur-sm w-[280px] h-[150px] flex items-center relative overflow-hidden group"
      >
        {/* 背景装饰 - 主题感知 */}
        <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-primary/20 to-transparent pointer-events-none transition-opacity group-hover:opacity-20"></div>
        
        <div className="flex items-center relative z-10 w-full">
          {/* 左侧日历 */}
          <div className="w-20 h-24   rounded-lg bg-background border border-border/40 flex flex-col overflow-hidden">
            <div className="bg-red-500 text-white text-sm text-center py-1 font-medium">
              {month}月
            </div>
            <div className="flex-1 flex items-center justify-center">
              <span className="text-5xl font-bold">{day}</span>
            </div>
          </div>
          
          {/* 右侧信息 */}
          <div className="ml-3 flex flex-col">
            <div className="font-medium">星期{weekDay}</div>
            <div className="text-xs text-muted-foreground">{lunarDate}</div>
            <div className="text-lg font-medium font-mono text-foreground/90 mt-2">{hours}:{minutes}:{seconds}</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}