import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#7C3AED', hover: '#6D28D9', soft: '#F3EEFF' },
        pink: { DEFAULT: '#EC4899' },
        amber: { DEFAULT: '#F59E0B', soft: '#FEF3C7', ink: '#92400E' },
        cream: '#FFFDF8',
        surface: '#FFFFFF',
        ink: '#1E1B4B',
        muted: '#6B7280',
        border: '#EDE9FE',
        success: { DEFAULT: '#14B8A6', soft: '#CCFBF1', ink: '#0F5E57' },
        warning: { DEFAULT: '#F59E0B', soft: '#FEF3C7', ink: '#92400E' },
        danger: { DEFAULT: '#EF4444', soft: '#FEE2E2', ink: '#991B1B' },
        sky: { DEFAULT: '#0EA5E9', soft: '#E0F2FE', ink: '#075985' },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: { card: '16px', control: '12px', prompt: '24px' },
      boxShadow: {
        prompt: '0 20px 60px -20px rgba(124,58,237,.35)',
        card: '0 8px 30px -14px rgba(124,58,237,.25)',
      },
    },
  },
  plugins: [],
};

export default config;
