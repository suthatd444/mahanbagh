import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#fbf7ec',
        card: '#fffdf7',
        primary: '#1f6b3a',
        gold: '#c9961a',
      },
    },
  },
  plugins: [],
};
export default config;
