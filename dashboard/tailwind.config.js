/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          // Rich Black – primary backgrounds
          black:     '#0A0A0A',
          surface:   '#161616',
          elevated:  '#1E1E1E',
          // Coral-Orange – primary accent / CTA
          coral:     '#FF6B35',
          'coral-hover': '#FF8555',
          // Gold – success / premium
          gold:      '#FFBE0B',
          'gold-dim':    '#E6A800',
          // Mint Green – positive / growth
          mint:      '#06D6A0',
          // Amber – warning
          amber:     '#FFB627',
          // Red – error / decline
          crimson:   '#EF476F',
          // Teal – info / links
          teal:      '#118AB2',
        },
        // Text scale
        ink: {
          primary:   '#F5F5F5',
          secondary: '#A3A3A3',
          muted:     '#737373',
          inverse:   '#0A0A0A',
        },
        // Border
        edge: {
          DEFAULT: '#404040',
          subtle:  '#2A2A2A',
          light:   '#E5E5E5',
        },
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono:  ['JetBrains Mono', 'SF Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        // Modular scale 1.25
        xs:   ['0.64rem',  { lineHeight: '1rem'   }],
        sm:   ['0.8rem',   { lineHeight: '1.25rem' }],
        base: ['1rem',     { lineHeight: '1.5rem'  }],
        lg:   ['1.25rem',  { lineHeight: '1.75rem' }],
        xl:   ['1.563rem', { lineHeight: '2rem'    }],
        '2xl':['1.953rem', { lineHeight: '2.25rem' }],
        '3xl':['2.441rem', { lineHeight: '2.75rem' }],
        '4xl':['3.052rem', { lineHeight: '3.25rem' }],
      },
      borderRadius: {
        card:  '12px',
        modal: '16px',
      },
      boxShadow: {
        card:     '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',
        'card-lg':'0 4px 16px rgba(0,0,0,0.5)',
        coral:    '0 4px 16px rgba(255,107,53,0.3)',
        gold:     '0 4px 16px rgba(255,190,11,0.3)',
        glow:     '0 0 24px rgba(255,107,53,0.15)',
      },
      backgroundImage: {
        'brand-gradient':    'linear-gradient(135deg, #FF6B35, #FFBE0B)',
        'brand-gradient-r':  'linear-gradient(135deg, #FFBE0B, #FF6B35)',
        'shimmer':           'linear-gradient(90deg, #1E1E1E 25%, #2A2A2A 50%, #1E1E1E 75%)',
        'shimmer-light':     'linear-gradient(90deg, #E5E5E5 25%, #F0F0F0 50%, #E5E5E5 75%)',
        'dark-surface':      'linear-gradient(135deg, #161616, #1E1E1E)',
      },
      animation: {
        shimmer:      'shimmer 1.5s infinite linear',
        'count-up':   'countUp 0.6s ease-out forwards',
        'slide-up':   'slideUp 0.3s ease-out forwards',
        'fade-in':    'fadeIn 0.3s ease-out forwards',
        'scale-in':   'scaleIn 0.2s ease-out forwards',
        'toast-in':   'toastIn 0.3s ease-out forwards',
        'toast-out':  'toastOut 0.3s ease-in forwards',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0'  },
        },
        slideUp: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)'    },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%':   { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)'    },
        },
        toastIn: {
          '0%':   { opacity: '0', transform: 'translateX(100%) translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0) translateY(0)'       },
        },
        toastOut: {
          '0%':   { opacity: '1', transform: 'translateX(0)'    },
          '100%': { opacity: '0', transform: 'translateX(100%)' },
        },
        pulseSoft: {
          '0%,100%': { opacity: '1'   },
          '50%':     { opacity: '0.5' },
        },
      },
      transitionTimingFunction: {
        'bounce-out': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
