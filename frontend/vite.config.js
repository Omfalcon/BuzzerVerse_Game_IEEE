import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Set VITE_BACKEND_URL in .env.local for production deployments
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/socket.io': {
        target: 'https://deploy.bhook.food',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
