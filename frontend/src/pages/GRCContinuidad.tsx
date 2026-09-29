/**
 * GRC · Continuidad del negocio
 *
 * Era una maqueta en memoria. Ahora el análisis de impacto (procesos, RTO,
 * RPO, costo por hora) y los simulacros se guardan en el servidor, que antes
 * ni siquiera permitía editar un plan. Un proceso crítico que no se ha
 * probado con un simulacro en el último año se marca: un plan que nunca se
 * ensayó no se sabe si funciona.
 */
import { useState } from 'react'
import { Box, Typography, Tabs, Tab, Chip } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Restore } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import { grcApi, type Continuidad, type SimulacroGRC } from '@/api/grc'
import { FormularioRegistro, TablaRegistros, useCrud, Cifra, Encabezado, Etiqueta, fmtFecha, type Campo } from '@/components/comun/Registro'
import { CRITICIDAD, SEVERIDAD_COLOR, etiqueta } from '@/components/grc/etiquetas'
import { COLOR_MODULO } from '@/config/marca'

const GRC_COLOR = COLOR_MODULO
const cop = (n?: number | string | null) => (n == null || n === '' ? '—' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n)))
const RESULTADOS: [string, string][] = [['exitoso', 'Exitoso'], ['parcial', 'Parcial'], ['fallido', 'Fallido']]
const RES_COLOR: Record<string, string> = { exitoso: '#15803D', parcial: '#D97706', fallido: '#DC2626' }

const CAMPOS_PLAN: Campo[] = [
  { clave: 'proceso', etiqueta: 'Proceso', obligatorio: true },
  { clave: 'criticidad', etiqueta: 'Criticidad', tipo: 'seleccion', opciones: CRITICIDAD, obligatorio: true, ancho: 6 },
  { clave: 'responsable', etiqueta: 'Responsable', ancho: 6 },
  { clave: 'rto_horas', etiqueta: 'RTO (horas)', tipo: 'numero', min: 0, ancho: 4, ayuda: 'Tiempo máximo para recuperarlo' },
  { clave: 'rpo_horas', etiqueta: 'RPO (horas)', tipo: 'numero', min: 0, ancho: 4, ayuda: 'Datos que se pueden perder' },
  { clave: 'impacto_financiero_hora', etiqueta: 'Costo por hora caído', tipo: 'numero', min: 0, ancho: 4 },
  { clave: 'sistemas_criticos', etiqueta: 'Sistemas críticos', ancho: 6 },
  { clave: 'dependencias', etiqueta: 'Dependencias', ancho: 6 },
  { clave: 'impacto_operativo', etiqueta: 'Impacto operativo', tipo: 'area' },
  { clave: 'plan_contingencia', etiqueta: 'Plan de contingencia', tipo: 'area' },
]

export default function GRCContinuidad() {
  const planes = useCrud(['grc-continuidad'], grcApi.continuidad, 'Plan', [['grc-tablero']])
  const sims = useCrud(['grc-simulacros'], grcApi.simulacros, 'Simulacro', [['grc-tablero']])
  const [tab, setTab] = useState(0)
  const [dlgP, setDlgP] = useState<{ abierto: boolean; r: Continuidad | null }>({ abierto: false, r: null })
  const [dlgS, setDlgS] = useState<{ abierto: boolean; r: SimulacroGRC | null }>({ abierto: false, r: null })
  const haceUnAnio = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10)
  const ultimoSim = (id: number) => sims.datos.filter(s => s.continuidad_id === id && s.fecha).sort((a, b) => b.fecha!.localeCompare(a.fecha!))[0]
  const criticos = planes.datos.filter(p => ['critica', 'alta'].includes(p.criticidad ?? ''))
  const sinProbar = criticos.filter(p => !ultimoSim(p.id) || ultimoSim(p.id).fecha! < haceUnAnio)

  const CAMPOS_SIM: Campo[] = [
    { clave: 'nombre', etiqueta: 'Simulacro', obligatorio: true },
    { clave: 'continuidad_id', etiqueta: 'Proceso probado', tipo: 'seleccion', opciones: planes.datos.map(p => [p.id, p.proceso] as [number, string]), obligatorio: true, ancho: 6 },
    { clave: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', obligatorio: true, ancho: 6 },
    { clave: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', opciones: [['escritorio', 'De escritorio'], ['funcional', 'Funcional'], ['completo', 'Completo']], ancho: 4 },
    { clave: 'resultado', etiqueta: 'Resultado', tipo: 'seleccion', opciones: RESULTADOS, obligatorio: true, ancho: 4 },
    { clave: 'participantes', etiqueta: 'Participantes', tipo: 'numero', min: 0, ancho: 4 },
    { clave: 'observaciones', etiqueta: 'Observaciones', tipo: 'area' },
    { clave: 'lecciones', etiqueta: 'Lecciones', tipo: 'area' },
  ]

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Restore sx={{ fontSize: 28 }} />} titulo="Continuidad del negocio" subtitulo="GRC · Análisis de impacto, planes y simulacros" color={GRC_COLOR}
          accion={tab === 0 ? 'Nuevo proceso' : 'Registrar simulacro'} onAccion={() => (tab === 0 ? setDlgP({ abierto: true, r: null }) : setDlgS({ abierto: true, r: null }))} />
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Procesos analizados" valor={planes.datos.length} color={GRC_COLOR} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Críticos o altos" valor={criticos.length} color="#EA580C" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Críticos sin probar en 12 meses" valor={sinProbar.length} color="#DC2626" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Simulacros" valor={sims.datos.length} color="#0369A1" sub={`${sims.datos.filter(s => s.resultado === 'exitoso').length} exitosos`} /></Grid>
        </Grid>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}><Tab label="Procesos (BIA)" /><Tab label="Simulacros" /></Tabs>
        {tab === 0 && (
          <TablaRegistros<Continuidad> filas={planes.datos} cargando={planes.isLoading} vacio="Sin procesos analizados" etiqueta={p => p.proceso}
            onEditar={p => setDlgP({ abierto: true, r: p })} onRetirar={p => planes.retirar.mutate(p.id)}
            columnas={[
              { titulo: 'Proceso', valor: p => <><b>{p.proceso}</b><Typography fontSize={11} color="text.secondary">{p.sistemas_criticos ?? ''}</Typography></> },
              { titulo: 'Criticidad', valor: p => p.criticidad ? <Etiqueta texto={etiqueta(CRITICIDAD, p.criticidad)} color={SEVERIDAD_COLOR[p.criticidad] ?? '#6B7280'} /> : '—' },
              { titulo: 'RTO', alinear: 'right', valor: p => (p.rto_horas != null ? `${p.rto_horas} h` : '—') },
              { titulo: 'RPO', alinear: 'right', valor: p => (p.rpo_horas != null ? `${p.rpo_horas} h` : '—') },
              { titulo: 'Costo / hora', alinear: 'right', valor: p => cop(p.impacto_financiero_hora) },
              { titulo: 'Responsable', valor: p => p.responsable ?? '—' },
              { titulo: 'Último simulacro', valor: p => { const s = ultimoSim(p.id); return s ? `${fmtFecha(s.fecha)} · ${etiqueta(RESULTADOS, s.resultado)}` : sinProbar.includes(p) ? <Chip size="small" color="error" variant="outlined" label="Nunca probado" /> : '—' } },
            ]} />
        )}
        {tab === 1 && (
          <TablaRegistros<SimulacroGRC> filas={sims.datos} cargando={sims.isLoading} vacio="Sin simulacros" etiqueta={s => s.nombre ?? `Simulacro ${s.id}`}
            onEditar={s => setDlgS({ abierto: true, r: s })} onRetirar={s => sims.retirar.mutate(s.id)}
            columnas={[
              { titulo: 'Fecha', valor: s => fmtFecha(s.fecha) },
              { titulo: 'Simulacro', valor: s => <b>{s.nombre ?? '—'}</b> },
              { titulo: 'Proceso', valor: s => planes.datos.find(p => p.id === s.continuidad_id)?.proceso ?? '—' },
              { titulo: 'Participantes', alinear: 'right', valor: s => s.participantes ?? '—' },
              { titulo: 'Resultado', valor: s => s.resultado ? <Etiqueta texto={etiqueta(RESULTADOS, s.resultado)} color={RES_COLOR[s.resultado] ?? '#6B7280'} /> : '—' },
              { titulo: 'Lecciones', valor: s => s.lecciones ?? '—' },
            ]} />
        )}
        <FormularioRegistro abierto={dlgP.abierto} titulo={dlgP.r ? dlgP.r.proceso : 'Nuevo proceso'} campos={CAMPOS_PLAN} registro={dlgP.r}
          valoresIniciales={{ criticidad: 'alta' }} onGuardar={c => planes.guardar(dlgP.r, c)} onCerrar={() => setDlgP({ abierto: false, r: null })} />
        <FormularioRegistro abierto={dlgS.abierto} titulo={dlgS.r ? 'Editar simulacro' : 'Registrar simulacro'} campos={CAMPOS_SIM} registro={dlgS.r}
          valoresIniciales={{ fecha: new Date().toISOString().slice(0, 10) }} onGuardar={c => sims.guardar(dlgS.r, c)} onCerrar={() => setDlgS({ abierto: false, r: null })} />
      </Box>
    </Layout>
  )
}
