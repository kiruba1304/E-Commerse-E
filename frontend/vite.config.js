import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['vishnex.com'],
    proxy: {
      '/api': {
        target: 'https://back.vishnex.com',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
