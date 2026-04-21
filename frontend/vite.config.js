import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Set VITE_BACKEND_URL in .env.local for production deployments
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/socket.io': {
        target: 'https://deployment.zapto.org',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
