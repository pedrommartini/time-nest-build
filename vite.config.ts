import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    allowedHosts: true,
    watch: {
      ignored: [
        '**/android/**',
        '**/*.apk',
        '**/.agents/**',
        '**/scratch/**',
        '**/dist/**',
      ],
    },
  },
})
