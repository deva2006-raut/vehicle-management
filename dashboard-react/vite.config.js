import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // Use relative asset paths so the built HTML works when served under a
  // sub-path like /dashboard/ (vroom-express mounts ../public at /dashboard).
  base: './',
  plugins: [react()],
  build: {
    outDir: '../public',
    emptyOutDir: true
  }
})
