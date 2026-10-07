"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
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
exports.default = config;
