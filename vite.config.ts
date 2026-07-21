import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Actions sets GITHUB_REPOSITORY=owner/repo → base=/repo/
// Local dev keeps base=/ so http://127.0.0.1:5200/ still works.
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
