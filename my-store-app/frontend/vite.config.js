import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Khi chạy `npm run dev`: chuyển /api sang backend → cùng origin như production (không cần CORS)
    proxy: {
      '/api': {
        target: process.env.VITE_DEV_API_TARGET || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    sourcemap: false,
    rolldownOptions: {
      output: {
        // Tách thư viện lớn thành file riêng → trình duyệt cache lâu, tải trang nhanh hơn
        advancedChunks: {
          groups: [
            { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/ },
            { name: 'charts', test: /node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor)[\\/]/ },
            { name: 'scanner', test: /node_modules[\\/]html5-qrcode[\\/]/ },
          ],
        },
      },
    },
  },
})
