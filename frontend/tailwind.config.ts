import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        th: {
          'bg-primary': 'var(--th-bg-primary)',
          'bg-secondary': 'var(--th-bg-secondary)',
          'bg-card': 'var(--th-bg-card)',
          'text-primary': 'var(--th-text-primary)',
          'text-secondary': 'var(--th-text-secondary)',
          'text-tertiary': 'var(--th-text-tertiary)',
          'text-body': 'var(--th-text-body)',
          'nav-bg': 'var(--th-nav-bg)',
          'border': 'var(--th-border)',
          'border-card': 'var(--th-border-card)',
          'feature-card-bg': 'var(--th-feature-card-bg)',
          'stat-bg': 'var(--th-stat-bg)',
          'eyebrow': 'var(--th-eyebrow-color)',
          'link': 'var(--th-link)',
          'section-label': 'var(--th-section-label)',
          'accent-blue': '#0071e3', // Hardcoded blue used in few places
          'accent-blue-hover': '#0077ed',
          'error': '#ff3b30'
        }
      },
      fontFamily: {
        text: ['var(--cf-font-text)', 'sans-serif'],
        display: ['var(--cf-font-display)', 'sans-serif'],
      },
      boxShadow: {
        'feature-card': 'var(--th-feature-card-shadow)',
        'feature-card-hover': 'rgba(0,0,0,0.14) 0 8px 32px 0',
        'feature-card-active': 'rgba(0,0,0,0.08) 0 2px 20px 0',
        'social-proof': 'rgba(0,0,0,0.22) 3px 5px 30px 0px',
        'waitlist-success': 'rgba(0,0,0,0.08) 0 2px 20px',
        'hero-mockup': '0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
      }
    },
  },
  plugins: [],
};
export default config;
