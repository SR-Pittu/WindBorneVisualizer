import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: "/windborne-visualizer/",
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
