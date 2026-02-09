import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    base: '/stock/',
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
