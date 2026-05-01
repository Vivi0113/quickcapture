import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  root: 'src/renderer',
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'capture-window': path.resolve(__dirname, 'src/renderer/capture-window/index.html'),
        'main-window': path.resolve(__dirname, 'src/renderer/main-window/index.html')
      }
    }
  },
  server: {
    port: 5173
  }
})
