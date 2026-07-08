import { type ThemeConfig } from '@/types/theme';
import './style.css';

export const macintosh1984Theme: ThemeConfig = {
  name: 'macintosh-1984',
  displayName: '麦金塔 1984',
  modes: ['light'],
  styles: {
    light: {
      primary: 'hsl(0 0% 8%)',
      'primary-foreground': 'hsl(0 0% 98%)',
      background: 'hsl(0 0% 88%)',
      'background-foreground': 'hsl(0 0% 8%)',
      muted: 'hsl(0 0% 78%)',
      'muted-foreground': 'hsl(0 0% 18%)',
      accent: 'hsl(0 0% 96%)',
      'accent-foreground': 'hsl(0 0% 8%)',
      card: 'hsl(0 0% 96%)',
      'card-foreground': 'hsl(0 0% 8%)',
      border: 'hsl(0 0% 8%)',
      popover: 'hsl(0 0% 96%)',
      'popover-foreground': 'hsl(0 0% 8%)',

      'font-family': '"Chicago", "Geneva", "Monaco", "Noto Sans SC", system-ui, sans-serif',
      'font-size-base': '1rem',
      'font-size-sm': '0.875rem',
      'font-size-lg': '1.125rem',
      'font-weight-normal': '500',
      'font-weight-medium': '700',
      'font-weight-bold': '800',
      'line-height': '1.3',

      'card-padding': '1rem',
      'card-radius': '0',
      'card-shadow': '4px 4px 0 hsl(0 0% 8%)',
      'card-hover-shadow': '6px 6px 0 hsl(0 0% 8%)',
      'card-border-width': '2px',
      'card-border-style': 'solid',

      'border-radius-sm': '0',
      'border-radius-md': '0',
      'border-radius-lg': '0',
      'border-width': '2px',
      'border-style': 'solid',

      'spacing-xs': '0.5rem',
      'spacing-sm': '0.75rem',
      'spacing-md': '1rem',
      'spacing-lg': '1.5rem',
      'spacing-xl': '2rem',

      'transition-duration': '120ms',
      'transition-timing': 'steps(2, end)',

      'shadow-sm': '2px 2px 0 hsl(0 0% 8%)',
      'shadow-md': '4px 4px 0 hsl(0 0% 8%)',
      'shadow-lg': '6px 6px 0 hsl(0 0% 8%)',
      'shadow-hover': '6px 6px 0 hsl(0 0% 8%)'
    }
  }
};
