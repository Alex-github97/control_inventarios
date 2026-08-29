/**
 * Compilación de la consola del operador, separada de la del portal.
 *
 * Se construye aparte para que el código que administra a todas las empresas no
 * quede dentro del paquete que descarga cada cliente. Sale a `dist-admin/` y el
 * proxy la sirve solo en el host `admin.*`.
 */
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  build: {
    outDir: 'dist-admin',
    emptyOutDir: true,
    rollupOptions: { input: path.resolve(__dirname, 'admin.html') },
  },
})
