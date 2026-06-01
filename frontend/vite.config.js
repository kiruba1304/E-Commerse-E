import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['vishnex.com'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5500',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
