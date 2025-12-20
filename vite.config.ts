import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  // Set base path for GitHub Pages deployment
  base: process.env.GITHUB_PAGES === 'true' ? '/volcano-simulator/' : '/',
})
