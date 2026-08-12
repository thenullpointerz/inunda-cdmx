import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/pluviometros": {
        target: "https://data.sacmex.cdmx.gob.mx",
        changeOrigin: true,
        rewrite: () => "/pluviometros/index.php/lluvia/get_pluviometros",
      },
    },
  },
})
