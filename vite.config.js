import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: false,
        open: true
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        target: 'esnext',
        rollupOptions: {
            output: {
                manualChunks: {
                    // React core — tiny, always needed first
                    'react-vendor': ['react', 'react-dom'],
                    // Framer Motion — animation runtime
                    'framer': ['framer-motion'],
                    // Three.js + R3F — heaviest dependency, load separately
                    'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
                    // Supabase client
                    'supabase': ['@supabase/supabase-js'],
                },
            },
        },
    },
})
