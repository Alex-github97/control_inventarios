/**
 * GRC · Controles internos
 *
 * Era una maqueta: controles escritos a mano y guardados solo en memoria.
 * Ahora se registran y se evalúan contra el servidor. Un control cuya próxima
 * evaluación ya pasó se marca, porque un control sin probar no respalda nada.
 */
import { useState } from 'react'
import { Box, Chip, Typography } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Shield } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import { grcApi, type ControlGRC } from '@/api/grc'
import { FormularioRegistro, TablaRegistros, useCrud, Cifra, Encabezado, Etiqueta, fmtFecha, type Campo } from '@/components/comun/Registro'
import { TIPOS_CONTROL, EFECTIVIDAD, EFECTIVIDAD_COLOR, etiqueta } from '@/components/grc/etiquetas'
import { COLOR_MODULO } from '@/config/marca'

const GRC_COLOR = COLOR_MODULO
const FRECUENCIAS: [string, string][] = [['continua', 'Continua'], ['diaria', 'Diaria'], ['semanal', 'Semanal'], ['mensual', 'Mensual'], ['trimestral', 'Trimestral'], ['anual', 'Anual']]
const CAMPOS: Campo[] = [
  { clave: 'nombre', etiqueta: 'Control', obligatorio: true },
  { clave: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', opciones: TIPOS_CONTROL, obligatorio: true, ancho: 6 },
  { clave: 'frecuencia', etiqueta: 'Frecuencia', tipo: 'seleccion', opciones: FRECUENCIAS, ancho: 6 },
  { clave: 'proceso', etiqueta: 'Proceso', ancho: 6 },
  { clave: 'responsable', etiqueta: 'Responsable', ancho: 6 },
  { clave: 'efectividad', etiqueta: 'Efectividad', tipo: 'seleccion', opciones: EFECTIVIDAD, obligatorio: true, ancho: 6 },
  { clave: 'automatizado', etiqueta: 'Automatizado', tipo: 'interruptor', ancho: 6 },
  { clave: 'ultima_evaluacion', etiqueta: 'Última evaluación', tipo: 'fecha', ancho: 6 },
  { clave: 'proxima_evaluacion', etiqueta: 'Próxima evaluación', tipo: 'fecha', ancho: 6,
    validar: (v, f) => (v && f.ultima_evaluacion && v < f.ultima_evaluacion ? 'Antes de la última' : null) },
  { clave: 'descripcion', etiqueta: 'Cómo opera el control', tipo: 'area' },
]

export default function GRCControles() {
  const crud = useCrud(['grc-controles'], grcApi.controles, 'Control', [['grc-tablero']])
  const [dlg, setDlg] = useState<{ abierto: boolean; r: ControlGRC | null }>({ abierto: false, r: null })
  const lista = crud.datos
  const hoy = new Date().toISOString().slice(0, 10)
  const vencidos = lista.filter(c => c.proxima_evaluacion && c.proxima_evaluacion < hoy)
  const efectivos = lista.filter(c => c.efectividad === 'efectivo')

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Shield sx={{ fontSize: 28 }} />} titulo="Controles internos" subtitulo="GRC · Inventario, pruebas y efectividad"
          color={GRC_COLOR} accion="Nuevo control" onAccion={() => setDlg({ abierto: true, r: null })} />
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Controles" valor={lista.length} color={GRC_COLOR} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Efectivos" valor={lista.length ? `${Math.round((efectivos.length / lista.length) * 100)}%` : '—'} color="#15803D" sub={`${efectivos.length} de ${lista.length}`} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Sin probar" valor={lista.filter(c => c.efectividad === 'no_probado').length} color="#6B7280" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Evaluación vencida" valor={vencidos.length} color="#DC2626" /></Grid>
        </Grid>
        <TablaRegistros<ControlGRC> filas={lista} cargando={crud.isLoading} vacio="Sin controles registrados" etiqueta={c => c.nombre}
          onEditar={c => setDlg({ abierto: true, r: c })} onRetirar={c => crud.retirar.mutate(c.id)}
          columnas={[
            { titulo: 'Código', valor: c => <Box sx={{ fontFamily: 'monospace' }}>{c.codigo}</Box> },
            { titulo: 'Control', valor: c => <><b>{c.nombre}</b>{c.automatizado && <Chip size="small" label="Automático" sx={{ ml: 1, height: 18, fontSize: 10 }} />}<Typography fontSize={11} color="text.secondary">{c.proceso ?? ''}</Typography></> },
            { titulo: 'Tipo', valor: c => etiqueta(TIPOS_CONTROL, c.tipo) },
            { titulo: 'Frecuencia', valor: c => etiqueta(FRECUENCIAS, c.frecuencia) },
            { titulo: 'Responsable', valor: c => c.responsable ?? '—' },
            { titulo: 'Efectividad', valor: c => <Etiqueta texto={etiqueta(EFECTIVIDAD, c.efectividad)} color={EFECTIVIDAD_COLOR[c.efectividad] ?? '#6B7280'} /> },
            { titulo: 'Próxima prueba', valor: c => <Box sx={{ color: vencidos.includes(c) ? 'error.main' : undefined, fontWeight: vencidos.includes(c) ? 700 : 400 }}>{fmtFecha(c.proxima_evaluacion)}</Box> },
          ]} />
        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? `Control ${dlg.r.codigo}` : 'Nuevo control'} campos={CAMPOS} registro={dlg.r}
          valoresIniciales={{ tipo: 'preventivo', efectividad: 'no_probado', automatizado: false }}
          onGuardar={c => crud.guardar(dlg.r, c)} onCerrar={() => setDlg({ abierto: false, r: null })} />
      </Box>
    </Layout>
  )
}
