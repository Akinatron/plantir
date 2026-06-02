/** @type {import('tailwindcss').Config} */
const colors = require('./src/theme/colors');

module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        secondary: colors.secondary,
        accent: colors.accent,
        success: colors.success,
        warning: colors.warning,
        danger: colors.danger,
        info: colors.info,
        neutral: colors.neutral,
        surface: colors.surface,
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        display: ['32px', { lineHeight: '38px', fontWeight: '700' }],
        h1: ['24px', { lineHeight: '30px', fontWeight: '700' }],
        h2: ['20px', { lineHeight: '26px', fontWeight: '600' }],
        h3: ['18px', { lineHeight: '24px', fontWeight: '600' }],
        'body-lg': ['16px', { lineHeight: '24px' }],
        body: ['15px', { lineHeight: '22px' }],
        'body-sm': ['14px', { lineHeight: '20px' }],
        caption: ['12px', { lineHeight: '16px' }],
        overline: ['11px', { lineHeight: '14px', letterSpacing: '0.8px', fontWeight: '600' }],
        'mono-lg': ['28px', { lineHeight: '32px', fontWeight: '600' }],
        mono: ['15px', { lineHeight: '22px' }],
      },
      spacing: {
        '0': '0',
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
      },
      borderRadius: {
        'xs': '4px',
        'sm': '8px',
        DEFAULT: '12px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        'full': '9999px',
      },
    },
  },
  plugins: [],
};
