import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/pokemon-filter/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "type-icons": ["./src/constants/typeIcons.ts"],
          "vendor": ["react", "react-dom"],
        },
      },
    },
  },
})
