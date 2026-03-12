/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      animation: {
        'slot-stop': 'slotStop 0.3s ease-out',
        'glow-pulse': 'glowPulse 1.5s ease-in-out infinite',
        'lever-pull': 'leverPull 0.4s ease-in-out',
      },
      keyframes: {
        slotStop: {
          '0%': { transform: 'scale(1.15)' },
          '50%': { transform: 'scale(0.93)' },
          '100%': { transform: 'scale(1)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(234,179,8,0.3)' },
          '50%': { boxShadow: '0 0 24px rgba(234,179,8,0.6)' },
        },
        leverPull: {
          '0%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(28px)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
