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
        minify: 'esbuild',
        rollupOptions: {
            output: {
                manualChunks: {
                    // React core — tiny, always needed first
                    'react-vendor': ['react', 'react-dom'],
                    // Framer Motion — animation runtime
                    'framer': ['framer-motion'],
                    // Three.js core — heaviest dependency
                    'three-core': ['three'],
                    // R3F + Drei — split from three core for better caching
                    'three-react': ['@react-three/fiber', '@react-three/drei'],
                    // Supabase client
                    'supabase': ['@supabase/supabase-js'],
                },
            },
        },
    },
})
