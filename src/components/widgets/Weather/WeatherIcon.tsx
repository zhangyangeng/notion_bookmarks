import React from 'react';

interface WeatherIconProps {
  icon: string;
  className?: string;
}

export const WeatherIcon: React.FC<WeatherIconProps> = ({ icon, className = '' }) => {
  if (!icon) return null;
  
  return (
    <div className={`weather-icon ${className}`}>
      <i className={`qi-${icon}`}></i>
      

    </div>
  );
};
