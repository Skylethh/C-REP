import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        emerald: {
          950: '#052e2b'
        }
      }
    }
  },
  darkMode: 'class'
} satisfies Config;


