/**
 * Monta una pantalla en un DOM de mentira, con datos de VERDAD, y hace clic en
 * cada pestaña.
 *
 * POR QUÉ EXISTE
 * «Se crashea al darle click» no se diagnostica leyendo el código: el fallo solo
 * aparece cuando llegan los datos, y solo los datos reales lo provocan. La
 * pestaña de comprobantes montaba bien en desarrollo con veinte filas y mataba
 * el navegador en la cuenta demo con treinta mil; la única forma de verlo fue
 * montarla contra el servidor de verdad.
 *
 * CÓMO SE USA
 *   TOKEN=<jwt> API=https://tittanware.tech/api/v1  *   npx esbuild tools/montar_pagina.tsx --bundle --platform=node --format=cjs  *     --outfile=/tmp/m.cjs --alias:@=./src  *     --alias:@/components/layout/Layout=./tools/layout.tsx  *     --external:jsdom --jsx=automatic --define:import.meta.env='{}'
 *   node /tmp/m.cjs
 *
 * El token se acuña dentro del contenedor del backend con
 * `create_access_token(subject=1, esquema='cli_xxx', usuario='admin')`.
 *
 * Informa además cuántas filas pintó cada pestaña: una que pinte decenas de
 * miles es una que va a congelar el navegador aunque no lance ningún error.
 */
import './dom'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider, createTheme } from '@mui/material'
import { apiClient } from '../src/api/client'
import Pagina from '../src/pages/ERPContabilidad'
import { dom } from './dom'

apiClient.defaults.baseURL = process.env.API!
apiClient.defaults.headers.common.Authorization = `Bearer ${process.env.TOKEN}`
const errores: string[] = []
class Frontera extends React.Component<{ children: any }, { err: any }> {
  state = { err: null as any }
  static getDerivedStateFromError(err: any) { return { err } }
  componentDidCatch(err: any) { errores.push(String(err?.message ?? err)) }
  render() { return this.state.err ? null : this.props.children }
}
const reposar = async (ms = 2500) => { await act(async () => { await new Promise(r => setTimeout(r, ms)) }) }

async function principal() {
  const c = dom.window.document.getElementById('raiz')!
  const raiz = createRoot(c)
  await act(async () => {
    raiz.render(React.createElement(Frontera, null,
      React.createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
        React.createElement(ThemeProvider, { theme: createTheme() }, React.createElement(Pagina)))))
  })
  await reposar()
  const tabs = () => Array.from(c.querySelectorAll('button[role="tab"]')) as HTMLButtonElement[]
  console.log(`pestañas: ${tabs().length}`)
  for (let i = 0; i < tabs().length; i++) {
    const antes = errores.length
    const b = tabs()[i]; const et = (b.textContent || `#${i}`).trim()
    const t0 = Date.now()
    await act(async () => { b.click() })
    await reposar()
    const filas = c.querySelectorAll('tbody tr').length
    console.log(errores.length > antes
      ? `  CRASH  ${et}  ${errores.slice(antes).join(' | ').slice(0, 180)}`
      : `  ok     ${et}  (${filas} filas, ${Date.now() - t0} ms)`)
  }
  console.log(errores.length ? `\n${errores.length} crash(es)` : '\nsin crashes')
  process.exit(errores.length ? 1 : 0)
}
principal()
