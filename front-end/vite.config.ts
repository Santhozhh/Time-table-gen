import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(),tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'https://time-table-gen-1.onrender.com', // Adjust this to your backend URL
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
