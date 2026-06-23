import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import os from 'os'

function getLanIP(): string {
  // 1. Variable de entorno inyectada por docker-compose desde .env
  if (process.env.HOST_IP) return process.env.HOST_IP
  // 2. Fallback: primera interfaz IPv4 no interna del host
  for (const iface of Object.values(os.networkInterfaces())) {
    for (const net of iface ?? []) {
      if (net.family === 'IPv4' && !net.internal) return net.address
    }
  }
  return ''
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'lan-ip',
      configureServer(server) {
        // Expone la IP LAN del PC host sin pasar por el proxy al backend.
        server.middlewares.use('/server-ip', (_req, res) => {
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ ip: getLanIP() }))
        })
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      usePolling: true,
      interval: 1000,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // El celular accede via IP LAN (ej. 10.103.x.x:5173), pero el backend
        // solo tiene localhost en CORS_ORIGINS. Normalizar el Origin aquí evita
        // rechazos CORS sin necesidad de editar el backend.
        headers: { Origin: 'http://localhost:5173' },
      },
    },
  },
})
