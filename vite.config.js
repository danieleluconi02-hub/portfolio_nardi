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
                // Function form: the object form made Rollup park shared helpers
                // (React, Vite's preload helper) inside the three.js chunks, so the
                // landing page downloaded the whole 3D engine up front.
                manualChunks(id) {
                    // Tiny shared helpers go with React, which every page loads anyway
                    if (id.includes('vite/preload-helper') || id.includes('commonjsHelpers')) return 'react-vendor'
                    if (!id.includes('node_modules')) return
                    // React core — tiny, always needed first
                    if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react-vendor'
                    // Framer Motion — animation runtime
                    if (/[\\/]node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) return 'framer'
                    // Three.js core — heaviest dependency, only loaded with the spheres
                    if (/[\\/]node_modules[\\/]three[\\/]/.test(id)) return 'three-core'
                    // R3F + Drei — split from three core for better caching
                    if (/[\\/]node_modules[\\/]@react-three[\\/]/.test(id)) return 'three-react'
                    // Supabase client
                    if (/[\\/]node_modules[\\/]@supabase[\\/]/.test(id)) return 'supabase'
                },
            },
        },
    },
})
