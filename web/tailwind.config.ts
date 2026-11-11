import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#1E3A8A',
        primary: { DEFAULT: '#2563EB', hover: '#1D4ED8' },
        page: '#F8FAFC',
        line: '#E2E8F0',
        rowline: '#F1F5F9',
        ink: { DEFAULT: '#0F172A', soft: '#475569', mute: '#94A3B8' },
        ok: { fg: '#15803D', bg: '#DCFCE7' },
        warn: { fg: '#B45309', bg: '#FEF3C7' },
        risk: { fg: '#B91C1C', bg: '#FEE2E2' },
        info: { fg: '#1D4ED8', bg: '#DBEAFE' },
        neutral: { fg: '#475569', bg: '#F1F5F9' },
      },
      borderRadius: { DEFAULT: '6px', md: '6px', lg: '6px', sm: '4px' },
      fontFamily: { sans: ['var(--font-inter)', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
export default config
