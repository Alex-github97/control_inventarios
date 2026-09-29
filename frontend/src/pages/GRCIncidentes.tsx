/**
 * GRC · Incidentes de riesgo y cumplimiento
 *
 * Era una maqueta en memoria. Ahora los incidentes se registran y se cierran
 * contra el servidor; al cerrar se fija la fecha de cierre (antes quedaba
 * vacía) y se pide la causa raíz, que es lo que evita que se repita.
 */
import { useState } from 'react'
import { Box, Typography, Tabs, Tab } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { ReportGmailerrorred } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import { grcApi, type IncidenteGRC } from '@/api/grc'
import { FormularioRegistro, TablaRegistros, useCrud, Cifra, Encabezado, Etiqueta, fmtFecha, type Campo } from '@/components/comun/Registro'
import { SEVERIDADES, SEVERIDAD_COLOR, ESTADOS_INCIDENTE, INCIDENTE_COLOR, TIPOS_INCIDENTE, etiqueta } from '@/components/grc/etiquetas'
import { COLOR_MODULO } from '@/config/marca'

const GRC_COLOR = COLOR_MODULO
const hoy = () => new Date().toISOString().slice(0, 10)
const CAMPOS: Campo[] = [
  { clave: 'titulo', etiqueta: 'Incidente', obligatorio: true },
  { clave: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', opciones: TIPOS_INCIDENTE, obligatorio: true, ancho: 6 },
  { clave: 'severidad', etiqueta: 'Severidad', tipo: 'seleccion', opciones: SEVERIDADES, obligatorio: true, ancho: 6 },
  { clave: 'fecha_ocurrencia', etiqueta: 'Ocurrió', tipo: 'fecha', obligatorio: true, ancho: 6, validar: v => (v && v.slice(0, 10) > hoy() ? 'No puede ser futura' : null) },
  { clave: 'estado', etiqueta: 'Estado', tipo: 'seleccion', opciones: ESTADOS_INCIDENTE, obligatorio: true, ancho: 6 },
  { clave: 'proceso', etiqueta: 'Proceso', ancho: 6 },
  { clave: 'responsable', etiqueta: 'Responsable', ancho: 6 },
  { clave: 'reportado_por', etiqueta: 'Reportado por', ancho: 6 },
  { clave: 'urgencia', etiqueta: 'Urgencia', tipo: 'seleccion', opciones: [['alta', 'Alta'], ['media', 'Media'], ['baja', 'Baja']], ancho: 6 },
  { clave: 'descripcion', etiqueta: 'Qué pasó', tipo: 'area', obligatorio: true },
  { clave: 'impacto', etiqueta: 'Impacto', tipo: 'area' },
  { clave: 'causa_raiz', etiqueta: 'Causa raíz', tipo: 'area', validar: (v, f) => (f.estado === 'cerrado' && !String(v ?? '').trim() ? 'Para cerrar, registra la causa raíz' : null) },
  { clave: 'acciones_tomadas', etiqueta: 'Acciones tomadas', tipo: 'area' },
  { clave: 'lecciones_aprendidas', etiqueta: 'Lecciones aprendidas', tipo: 'area' },
]

export default function GRCIncidentes() {
  const crud = useCrud(['grc-incidentes'], grcApi.incidentes, 'Incidente', [['grc-tablero']])
  const [dlg, setDlg] = useState<{ abierto: boolean; r: IncidenteGRC | null }>({ abierto: false, r: null })
  const [tab, setTab] = useState(0)
  const lista = crud.datos
  const abiertos = lista.filter(i => i.estado !== 'cerrado')
  const cerrados = lista.filter(i => i.estado === 'cerrado' && i.fecha_ocurrencia && i.fecha_cierre)
  const diasProm = cerrados.length ? cerrados.reduce((s, i) => s + (new Date(i.fecha_cierre!).getTime() - new Date(i.fecha_ocurrencia!).getTime()) / 86400000, 0) / cerrados.length : null
  const visibles = tab === 1 ? abiertos : tab === 2 ? lista.filter(i => i.estado === 'cerrado') : lista

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<ReportGmailerrorred sx={{ fontSize: 28 }} />} titulo="Incidentes" subtitulo="GRC · Eventos de riesgo, fraude y cumplimiento"
          color={GRC_COLOR} accion="Reportar incidente" onAccion={() => setDlg({ abierto: true, r: null })} />
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Abiertos" valor={abiertos.length} color="#DC2626" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Críticos o altos abiertos" valor={abiertos.filter(i => ['critica', 'alta'].includes(i.severidad ?? '')).length} color="#EA580C" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Cerrados" valor={lista.length - abiertos.length} color="#15803D" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Días promedio para cerrar" valor={diasProm == null ? '—' : diasProm.toFixed(1)} color="#0369A1" /></Grid>
        </Grid>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}><Tab label="Todos" /><Tab label="Activos" /><Tab label="Cerrados" /></Tabs>
        <TablaRegistros<IncidenteGRC> filas={visibles} cargando={crud.isLoading} vacio="Sin incidentes" etiqueta={i => i.titulo}
          onEditar={i => setDlg({ abierto: true, r: i })} onRetirar={i => crud.retirar.mutate(i.id)}
          columnas={[
            { titulo: 'Código', valor: i => <Box sx={{ fontFamily: 'monospace' }}>{i.codigo}</Box> },
            { titulo: 'Incidente', valor: i => <><b>{i.titulo}</b><Typography fontSize={11} color="text.secondary">{etiqueta(TIPOS_INCIDENTE, i.tipo)}</Typography></> },
            { titulo: 'Severidad', valor: i => i.severidad ? <Etiqueta texto={etiqueta(SEVERIDADES, i.severidad)} color={SEVERIDAD_COLOR[i.severidad]} /> : '—' },
            { titulo: 'Ocurrió', valor: i => fmtFecha(i.fecha_ocurrencia) },
            { titulo: 'Cerrado', valor: i => fmtFecha(i.fecha_cierre) },
            { titulo: 'Responsable', valor: i => i.responsable ?? '—' },
            { titulo: 'Estado', valor: i => <Etiqueta texto={etiqueta(ESTADOS_INCIDENTE, i.estado)} color={INCIDENTE_COLOR[i.estado] ?? '#6B7280'} /> },
          ]} />
        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? `Incidente ${dlg.r.codigo}` : 'Reportar incidente'} campos={CAMPOS} registro={dlg.r}
          valoresIniciales={{ estado: 'abierto', severidad: 'media', tipo: 'operativo', fecha_ocurrencia: hoy() }}
          onGuardar={c => crud.guardar(dlg.r, c)} onCerrar={() => setDlg({ abierto: false, r: null })} />
      </Box>
    </Layout>
  )
}
