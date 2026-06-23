import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        tailwindcss(),
        react(),
        // Polyfilla módulos Node.js (stream, events, buffer, etc.) usados por xlsx-js-style en el browser
        nodePolyfills({
            // Solo incluimos los módulos que realmente necesita xlsx-js-style
            include: ['stream', 'events', 'buffer', 'util', 'process'],
            globals: {
                Buffer: true,
                process: true,
            },
        }),
    ],
    base: '/stock/',
    optimizeDeps: {
        include: ['xlsx-js-style'],
    },
    server: {
        host: '0.0.0.0',
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:5176',
                changeOrigin: true,
            }
        }
    },
    preview: {
        host: '0.0.0.0',
        port: 3007,
        proxy: {
            '/api': {
                target: 'http://localhost:5176',
                changeOrigin: true,
            }
        }
    }
})
