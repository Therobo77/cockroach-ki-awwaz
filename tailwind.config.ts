import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        roach: {
          50:  '#f0fdf0',
          100: '#dcfce8',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#a3e635',
          600: '#84cc16',
          700: '#65a30d',
          800: '#166534',
          900: '#052e16',
        },
        void: {
          50:  'rgb(var(--void-50) / <alpha-value>)',
          100: 'rgb(var(--void-100) / <alpha-value>)',
          200: 'rgb(var(--void-200) / <alpha-value>)',
          300: 'rgb(var(--void-300) / <alpha-value>)',
          400: 'rgb(var(--void-400) / <alpha-value>)',
          500: 'rgb(var(--void-500) / <alpha-value>)',
          600: 'rgb(var(--void-600) / <alpha-value>)',
          700: 'rgb(var(--void-700) / <alpha-value>)',
          800: 'rgb(var(--void-800) / <alpha-value>)',
          900: 'rgb(var(--void-900) / <alpha-value>)',
          950: 'rgb(var(--void-950) / <alpha-value>)',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        glow: {
          from: { boxShadow: '0 0 5px #a3e63520' },
          to:   { boxShadow: '0 0 20px #a3e63540, 0 0 40px #a3e63520' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
} satisfies Config
