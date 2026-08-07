/**
 * Every colour resolves through a CSS variable so a theme is data, not a set of
 * hand-written `dark:` twins - see the palettes in src/styles/index.css.
 * `<alpha-value>` is what keeps the opacity modifiers (`bg-brand/15`) working;
 * a plain `var(--brand)` would swallow them silently.
 */
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: token('canvas'),
        surface: token('surface'),
        hairline: token('hairline'),
        ink: token('ink'),
        subtitle: token('subtitle'),
        /*
         * Overlay ink - black on light themes, white on dark ones. One
         * `hover:bg-tint/5` now covers what used to need a
         * `hover:bg-black/5 dark:hover:bg-white/5` pair at every call site.
         */
        tint: token('tint'),
        /*
         * Named by role rather than by lightness step. A numeric 50..700 scale
         * assumes light-to-dark, which inverts on a dark theme; `soft` and
         * `onsoft` mean the same thing whichever way the theme runs.
         */
        brand: {
          DEFAULT: token('brand'),
          hover: token('brand-hover'),
          active: token('brand-active'),
          soft: token('brand-soft'),
          'soft-hover': token('brand-soft-hover'),
          onsoft: token('brand-onsoft'),
          fg: token('brand-fg')
        },
        income: token('income'),
        expense: token('expense'),
        warning: token('warning'),
        /** Backdrop ornament tint - only the decorative layer reads this. */
        decor: token('decor')
      },
      borderRadius: {
        card: '16px',
        control: '14px',
        sheet: '24px'
      },
      fontSize: {
        /*
         * Tightened a step from the brief's original scale after seeing it on a
         * real phone: 30px page titles and 17px amounts dominated every screen,
         * and the amounts were wide enough to truncate in three-column layouts.
         * Line heights stay tight so rows keep to their height budget.
         */
        caption: ['13px', '17px'],
        body: ['15px', '20px'],
        amount: ['15px', '20px'],
        'card-title': ['16px', '22px'],
        'section-title': ['17px', '24px'],
        'page-title': ['24px', '30px'],
        hero: ['26px', '32px']
      },
      spacing: {
        // 8pt system: the brief's steps, named so intent survives review.
        gap: '8px',
        'gap-normal': '12px',
        section: '16px',
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
