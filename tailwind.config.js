/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'cyber-black': '#050505',
                'cyber-dark': '#0a0a0a',
                'cyber-gray': '#1a1a1a',
                'cyber-light': '#2a2a2a',
                'neon-cyan': '#00FFFF',
                'neon-cyan-dim': '#00CCCC',
                'neon-magenta': '#FF00FF',
                'neon-magenta-dim': '#CC00CC',
                'neon-blue': '#0066FF',
                'neon-purple': '#9900FF',
                'hud-green': '#00FF66',
                'hud-orange': '#FF6600',
                'hud-red': '#FF0033',
            },
            fontFamily: {
                'cyber': ['Orbitron', 'sans-serif'],
                'mono': ['Share Tech Mono', 'monospace'],
            },
            boxShadow: {
                'neon-cyan': '0 0 5px #00FFFF, 0 0 20px #00FFFF, 0 0 40px #00FFFF',
                'neon-cyan-soft': '0 0 10px rgba(0,255,255,0.5)',
                'neon-magenta': '0 0 5px #FF00FF, 0 0 20px #FF00FF, 0 0 40px #FF00FF',
                'neon-magenta-soft': '0 0 10px rgba(255,0,255,0.5)',
                'glass': '0 8px 32px rgba(0,0,0,0.37)',
            },
            backgroundImage: {
                'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
                'cyber-grid': 'linear-gradient(rgba(0,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,255,0.03) 1px, transparent 1px)',
            },
            backdropBlur: {
                'glass': '10px',
            },
            animation: {
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'glitch': 'glitch 0.3s ease-in-out',
                'scan': 'scan 8s linear infinite',
                'flicker': 'flicker 0.15s infinite',
                'float': 'float 6s ease-in-out infinite',
            },
            keyframes: {
                glitch: {
                    '0%, 100%': { transform: 'translate(0)' },
                    '20%': { transform: 'translate(-2px, 2px)' },
                    '40%': { transform: 'translate(-2px, -2px)' },
                    '60%': { transform: 'translate(2px, 2px)' },
                    '80%': { transform: 'translate(2px, -2px)' },
                },
                scan: {
                    '0%': { transform: 'translateY(-100%)' },
                    '100%': { transform: 'translateY(100vh)' },
                },
                flicker: {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.8 },
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
            },
        },
    },
    plugins: [],
}
