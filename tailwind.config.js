// src/tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  safelist: [
    'shimmer-once',
    'sparkle',
    'underline-sweep'
  ],
  theme: {
    extend: {
      colors: {
        // Glassmorphism helpers
        glass: 'rgba(255,255,255,0.15)',
        stroke: 'rgba(255,255,255,0.28)',
        // Swiss Civil Protection (cp) palette
        'cp-orange': '#FF7900', // primary orange
        'cp-blue': '#005EB8',  // secondary blue
        // semantic aliases
        primary: '#FF7900',
        secondary: '#005EB8',
      },
      backdropBlur: { glass: '14px' },
      borderRadius: { glass: '1.25rem' },
    },
  },
  plugins: [],
};
