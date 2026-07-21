import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Local: base=/  → http://127.0.0.1:5200/
// GitHub Actions: set VITE_BASE=/test_dashboard_v2/ (or /${{ github.event.repository.name }}/)
// Also auto-detects GITHUB_REPOSITORY when present.
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = process.env.VITE_BASE || (repoName ? `/${repoName}/` : '/')

export default defineConfig({
  base,
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 5200,
    strictPort: true,
    watch: {
      ignored: ['**/_xlsx_unzip/**', '**/node_modules/**'],
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 5200,
    strictPort: true,
  },
})
