import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// En production (build pour GitHub Pages), l'app est servie depuis un
// sous-chemin : https://<user>.github.io/france-_compare/
// En dev, on reste à la racine pour un confort local.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/france-_compare/' : '/',
  plugins: [react()],
  server: { port: 5173, open: true },
}))
