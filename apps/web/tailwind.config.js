/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        void: {
          DEFAULT: '#0B0F1A',
          50: '#1a1f2e',
          100: '#151a28',
          200: '#111827',
          300: '#0f1420',
          400: '#0d111c',
          500: '#0B0F1A',
          600: '#090d16',
          700: '#070a12',
          800: '#05080e',
          900: '#03060a',
        },
        gold: {
          DEFAULT: '#D4A853',
          50: '#fdf6e3',
          100: '#f9edc4',
          200: '#f0d98a',
          300: '#e6c25a',
          400: '#D4A853',
          500: '#c4952e',
          600: '#a87d24',
          700: '#8c6620',
          800: '#70501e',
          900: '#5d421c',
        },
        stellar: {
          blue: '#60A5FA',
          cyan: '#67E8F9',
          purple: '#A78BFA',
          pink: '#F472B6',
          green: '#34D399',
          red: '#EF4444',
          orange: '#FB923C',
          amber: '#FBBF24',
        },
        steel: {
          DEFAULT: '#1E293B',
          light: '#334155',
          lighter: '#475569',
          muted: '#64748B',
          faint: '#94A3B8',
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', '"Noto Serif SC"', 'serif'],
        body: ['"DM Sans"', '"Noto Sans SC"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'star-field': 'radial-gradient(1px 1px at 20px 30px, #fff2, transparent), radial-gradient(1px 1px at 40px 70px, #fff1, transparent), radial-gradient(1px 1px at 50px 160px, #fff3, transparent), radial-gradient(1px 1px at 90px 40px, #fff1, transparent), radial-gradient(1px 1px at 130px 80px, #fff2, transparent), radial-gradient(1px 1px at 160px 120px, #fff1, transparent)',
      },
      animation: {
        'glow-pulse': 'glow-pulse 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s ease-out forwards',
        'slide-up': 'slide-up 0.4s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.3s ease-out forwards',
        'shimmer': 'shimmer 2s linear infinite',
        'twinkle': 'twinkle 4s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '1' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'twinkle': {
          '0%, 100%': { opacity: '0.3', transform: 'scale(1)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        },
      },
      boxShadow: {
        'glow-sm': '0 0 8px -2px rgba(212, 168, 83, 0.3)',
        'glow': '0 0 20px -4px rgba(212, 168, 83, 0.3)',
        'glow-lg': '0 0 40px -8px rgba(212, 168, 83, 0.25)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'glass-inset': 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },
    },
  },
  plugins: [],
}
