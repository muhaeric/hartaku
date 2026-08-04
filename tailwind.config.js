/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light values come from the design brief; dark steps are picked to hold
        // the same contrast relationships against a dark surface.
        canvas: { DEFAULT: '#f6f7fb', dark: '#0d1117' },
        surface: { DEFAULT: '#ffffff', dark: '#161b22' },
        hairline: { DEFAULT: '#e7eaf0', dark: '#262c36' },
        ink: { DEFAULT: '#111827', dark: '#e6edf3' },
        subtitle: { DEFAULT: '#6b7280', dark: '#8b949e' },
        brand: {
          50: '#eef1fe',
          100: '#dfe4fd',
          200: '#c2ccfb',
          500: '#4361ee',
          600: '#3a55d9',
          700: '#2f45b4'
        },
        // Money polarity: one cool / one warm pole, both clearing 3:1 on white.
        income: '#047857',
        expense: '#dc2626',
        warning: '#b45309'
      },
      borderRadius: {
        card: '16px',
        control: '14px',
        sheet: '24px'
      },
      fontSize: {
        // Brief's scale. Line heights kept tight so rows stay inside their budget.
        caption: ['13px', '18px'],
        body: ['15px', '21px'],
        amount: ['17px', '22px'],
        'card-title': ['17px', '23px'],
        'section-title': ['20px', '27px'],
        'page-title': ['30px', '36px']
      },
      spacing: {
        // 8pt system: the brief's five steps, named so intent survives review.
        gap: '8px',
        'gap-normal': '12px',
        section: '20px',
        page: '16px'
      },
      animation: {
        'slide-up': 'slide-up 220ms cubic-bezier(0.32, 0.72, 0, 1)',
        'fade-in': 'fade-in 150ms ease-out',
        shimmer: 'shimmer 1.4s ease-in-out infinite'
      },
      keyframes: {
        'slide-up': {
          '0%': { transform: 'translateY(16px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        shimmer: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' }
        }
      }
    }
  },
  plugins: []
}
