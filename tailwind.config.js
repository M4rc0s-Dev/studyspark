/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Calm "slate blue + mist" study palette. Deep navy ink on a cool misty
        // paper, with a single serene slate-blue accent. Blue is the color most
        // associated with focus and low visual fatigue — restful for long study
        // sessions and, crucially, high-contrast (navy text never blends into
        // the light background the way the old warm scheme did).
        ink: {
          DEFAULT: '#1e2a38', // deep navy ink — strong contrast on paper
          soft: '#3a4a5c', // muted navy
          muted: '#647587', // slate-500-ish for secondary text
        },
        paper: {
          DEFAULT: '#f3f5f8', // cool misty background
          raised: '#ffffff',
          sunken: '#e7ecf2', // soft blue-gray for cards / sunken surfaces
        },
        // Slate-blue accent scale (replaces the old amber "ember"). Kept under
        // the `ember` token name so the whole app picks it up without touching
        // every className. 500 is the confident, calm accent.
        ember: {
          50: '#eef3f8',
          100: '#d9e3ee',
          200: '#bacadd',
          300: '#90a9c6',
          400: '#6a88ab',
          500: '#4a6c86',
          600: '#3a5670',
          700: '#2d4459',
        },
        // Cool navy dark mode. Rebuilt with a real luminance ladder so surfaces
        // separate from each other and from the page: the page (see `night`)
        // sits deepest, cards lift clearly above it, higher surfaces lift more,
        // and text is bright for readability. Kept under the `sepia` token name.
        sepia: {
          50: '#f1f5fa', // near-white — headings on dark
          100: '#e0e9f2', // primary text on dark
          200: '#c4d2e2', // secondary text
          300: '#9db0c6', // muted text (bright enough to read)
          400: '#33465c', // hairline border
          500: '#455b76', // stronger border
          600: '#111d2a', // input / inset surface (sunken, below cards)
          700: '#243547', // top surface (chatbot, popovers, hover)
          800: '#1e2c3c', // raised surface (modals, secondary cards)
          900: '#18242f', // card surface (clearly above the page)
        },
        // Dedicated page background for dark mode — deeper than every `sepia`
        // surface so cards, modals and inputs all read as lifted above it.
        night: {
          DEFAULT: '#0b1220', // page background
          soft: '#101a2a', // subtle raised band on the page
        },
      },
      boxShadow: {
        soft: '0 1px 2px rgba(30,42,56,0.05), 0 8px 24px -12px rgba(30,42,56,0.20)',
        lift: '0 2px 4px rgba(30,42,56,0.06), 0 18px 40px -16px rgba(30,42,56,0.30)',
      },
    },
  },
  plugins: [],
}
