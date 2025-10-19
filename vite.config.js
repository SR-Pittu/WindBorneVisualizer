import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: "/WindBorneVisualizer/",
  server: {
  proxy: {
    '/wb': {
      target: 'https://a.windbornesystems.com',
      changeOrigin: true,
      rewrite: p => p.replace(/^\/wb/, '/treasure'),
      secure: true,
    },
  },
},

})
