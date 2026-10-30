import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Serve the same serverless handler Vercel runs in production while developing.
function localApi() {
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use('/api/pluviometros', async (req, res) => {
        const { default: handler } = await server.ssrLoadModule('/api/pluviometros.js')
        await handler(req, res)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localApi()],
})
