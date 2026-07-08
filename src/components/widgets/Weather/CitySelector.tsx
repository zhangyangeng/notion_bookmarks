import React, { useState, useEffect, RefObject } from 'react';
import { createPortal } from 'react-dom';

interface CitySelectorProps {
  show: boolean;
  menuRef: RefObject<HTMLDivElement | null>;
  buttonRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onRefreshLocation: () => void;
  onClearSavedCity: () => void;
  onSelectCity: (city: string) => void;
  isRefreshing: boolean;
  savedCity: string | null;
}

export const CitySelector: React.FC<CitySelectorProps> = ({
  show,
  menuRef,
  buttonRef,
  onClose,
  onRefreshLocation,
  onSelectCity,
  isRefreshing,
  onClearSavedCity,
  savedCity
}) => {
  const [mounted, setMounted] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const [customCity, setCustomCity] = useState('');
  const cityInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    setPortalContainer(document.body);
  }, []);

  if (!mounted || !show || !portalContainer) return null;
  if (typeof window === 'undefined') return null;

  const position = buttonRef.current?.getBoundingClientRect() || { left: 0, bottom: 0 };

  const handleCitySelect = () => {
    if (customCity.trim()) {
      onSelectCity(customCity.trim());
      setCustomCity('');
    }
  };

  return createPortal(
    <div 
      ref={menuRef}
      className="fixed bg-card border border-border/40 rounded-md shadow-md z-[100] p-2 w-48"
      style={{
        left: position.left,
        top: position.bottom + 5,
        position: 'absolute',
      }}
      onClick={(e) => e.stopPropagation()}
      suppressHydrationWarning
    >
      <button 
        onClick={onClose}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
        aria-label="关闭"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>

      <div className="flex flex-col space-y-2 mt-2 pr-4">
        <button 
          onClick={onRefreshLocation}
          className="text-xs text-left px-2 py-1.5 hover:bg-primary/10 rounded-sm flex items-center gap-2 transition-colors"
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <>
              <div className="w-4 h-4 flex items-center justify-center">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
              </div>
              <span>正在获取位置...</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
              </svg>
              重新获取位置
            </>
          )}
        </button>
        
        {savedCity && (
          <button 
            onClick={onClearSavedCity}
            className="text-xs text-left px-2 py-1.5 hover:bg-primary/10 rounded-sm flex items-center gap-2 transition-colors text-destructive"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
            清除记忆城市
          </button>
        )}
        
        <div className="border-t border-border/40 my-1"></div>
        
        <div className="flex flex-col space-y-1">
          <div className="text-xs text-muted-foreground px-2">手动输入城市</div>
          <div className="flex items-center px-2">
            <input
              ref={cityInputRef}
              type="text"
              value={customCity}
              onChange={(e) => setCustomCity(e.target.value)}
              placeholder="输入城市名称"
              className="w-24 text-xs p-1 border border-border/40 rounded bg-background/80 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              style={{ color: 'var(--foreground)' }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCitySelect();
                }
              }}
            />
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleCitySelect();
              }}
              className="ml-1 px-3 h-7 text-xs font-medium rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground focus:outline-none transition-colors disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center whitespace-nowrap"
              disabled={!customCity.trim()}
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </div>,
    portalContainer
  );
};
