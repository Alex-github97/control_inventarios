/**
 * GRC · Obligaciones regulatorias
 *
 * Era una maqueta: leyes y contratos escritos a mano con su estado de
 * cumplimiento puesto a dedo. Ahora se registran contra el servidor (que antes
 * ni siquiera permitía editarlas). El estado de cumplimiento de cada una sale
 * de su evaluación en la matriz de cumplimiento, no se escribe aquí.
 */
import { useState } from 'react'
import { Box, Typography, Tabs, Tab } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Gavel } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { grcApi, type Obligacion } from '@/api/grc'
import { FormularioRegistro, TablaRegistros, useCrud, Cifra, Encabezado, Etiqueta, fmtFecha, type Campo } from '@/components/comun/Registro'
import { TIPOS_OBLIGACION, ESTADOS_CUMPLIMIENTO, CUMPLIMIENTO_COLOR, etiqueta } from '@/components/grc/etiquetas'
import { COLOR_MODULO } from '@/config/marca'

const GRC_COLOR = COLOR_MODULO
const CAMPOS: Campo[] = [
  { clave: 'nombre', etiqueta: 'Obligación', obligatorio: true, ayuda: 'Ley 1581 de 2012, Decreto 1072 de 2015, contrato con…' },
  { clave: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', opciones: TIPOS_OBLIGACION, obligatorio: true, ancho: 6 },
  { clave: 'fuente', etiqueta: 'Fuente / entidad', ancho: 6 },
  { clave: 'area', etiqueta: 'Área', ancho: 6 },
  { clave: 'responsable', etiqueta: 'Responsable', ancho: 6 },
  { clave: 'pais', etiqueta: 'País', ancho: 6 },
  { clave: 'industria', etiqueta: 'Industria', ancho: 6 },
  { clave: 'fecha_vigencia', etiqueta: 'Vigente desde', tipo: 'fecha', ancho: 6 },
  { clave: 'fecha_vencimiento', etiqueta: 'Vence / fecha límite', tipo: 'fecha', ancho: 6 },
  { clave: 'descripcion', etiqueta: 'Qué exige', tipo: 'area' },
]

export default function GRCObligaciones() {
  const crud = useCrud(['grc-obligaciones'], grcApi.obligaciones, 'Obligación', [['grc-tablero']], true)
  const { data: matriz = [] } = useQuery({ queryKey: ['grc-cumplimiento'], queryFn: () => grcApi.cumplimiento.listar() })
  const [dlg, setDlg] = useState<{ abierto: boolean; r: Obligacion | null }>({ abierto: false, r: null })
  const [tab, setTab] = useState(0)
  const hoy = new Date().toISOString().slice(0, 10)
  const en60 = new Date(Date.now() + 60 * 86400000).toISOString().slice(0, 10)

  // El estado de cada obligación: el peor de sus evaluaciones en la matriz.
  const orden = ['no_cumple', 'cumple_parcial', 'en_evaluacion', 'cumple', 'no_aplica']
  const estadoDe = (o: Obligacion) => {
    const ev = matriz.filter(m => m.obligacion_id === o.id).map(m => m.estado)
    return ev.length ? ev.sort((a, b) => orden.indexOf(a) - orden.indexOf(b))[0] : null
  }
  const lista = crud.datos
  const vencidas = lista.filter(o => o.fecha_vencimiento && o.fecha_vencimiento < hoy)
  const porVencer = lista.filter(o => o.fecha_vencimiento && o.fecha_vencimiento >= hoy && o.fecha_vencimiento <= en60)
  const incumplen = lista.filter(o => ['no_cumple', 'cumple_parcial'].includes(estadoDe(o) ?? ''))
  const atencion = lista.filter(o => vencidas.includes(o) || porVencer.includes(o) || incumplen.includes(o))
  const visibles = tab === 1 ? atencion : lista

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Gavel sx={{ fontSize: 28 }} />} titulo="Obligaciones regulatorias" subtitulo="GRC · Leyes, normas, contratos y requisitos"
          color={GRC_COLOR} accion="Nueva obligación" onAccion={() => setDlg({ abierto: true, r: null })} />
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Obligaciones" valor={lista.length} color={GRC_COLOR} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Sin evaluar" valor={lista.filter(o => !estadoDe(o)).length} color="#6B7280" sub="Sin fila en la matriz de cumplimiento" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Incumplen" valor={incumplen.length} color="#DC2626" sub="Total o parcialmente" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Vencen en 60 días" valor={porVencer.length} color="#D97706" sub={`${vencidas.length} ya vencidas`} /></Grid>
        </Grid>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}><Tab label="Todas" /><Tab label={`Requieren atención (${atencion.length})`} /></Tabs>
        <TablaRegistros<Obligacion> filas={visibles} cargando={crud.isLoading} vacio="Sin obligaciones" etiqueta={o => o.nombre}
          onEditar={o => setDlg({ abierto: true, r: o })} onRetirar={o => crud.retirar.mutate(o.id)}
          columnas={[
            { titulo: 'Código', valor: o => <Box sx={{ fontFamily: 'monospace' }}>{o.codigo}</Box> },
            { titulo: 'Obligación', valor: o => <><b>{o.nombre}</b><Typography fontSize={11} color="text.secondary">{o.fuente ?? ''}</Typography></> },
            { titulo: 'Tipo', valor: o => etiqueta(TIPOS_OBLIGACION, o.tipo) },
            { titulo: 'Responsable', valor: o => o.responsable ?? '—' },
            { titulo: 'Vence', valor: o => <Box sx={{ color: vencidas.includes(o) ? 'error.main' : porVencer.includes(o) ? 'warning.main' : undefined, fontWeight: vencidas.includes(o) || porVencer.includes(o) ? 700 : 400 }}>{fmtFecha(o.fecha_vencimiento)}</Box> },
            { titulo: 'Cumplimiento', valor: o => { const e = estadoDe(o); return e ? <Etiqueta texto={etiqueta(ESTADOS_CUMPLIMIENTO, e)} color={CUMPLIMIENTO_COLOR[e]} /> : <Typography fontSize={11} color="text.secondary">Sin evaluar</Typography> } },
          ]} />
        <Typography fontSize={11} color="text.secondary" mt={1}>El cumplimiento se evalúa en la <RouterLink to="/grc/cumplimiento">matriz de cumplimiento</RouterLink>.</Typography>
        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? `Obligación ${dlg.r.codigo}` : 'Nueva obligación'} campos={CAMPOS} registro={dlg.r}
          valoresIniciales={{ tipo: 'ley', pais: 'Colombia' }} onGuardar={c => crud.guardar(dlg.r, c)} onCerrar={() => setDlg({ abierto: false, r: null })} />
      </Box>
    </Layout>
  )
}
