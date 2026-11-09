import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // big libraries in their own long-cached chunks
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          mantine: [
            '@mantine/core',
            '@mantine/hooks',
            '@mantine/notifications',
            '@mantine/modals',
          ],
          data: ['@tanstack/react-query', 'axios', 'dayjs'],
        },
      },
    },
  },
})
