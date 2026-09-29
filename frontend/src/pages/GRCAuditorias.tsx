/**
 * GRC · Auditorías
 *
 * Era una maqueta: auditorías y conteos de hallazgos escritos a mano. Ahora se
 * programan y avanzan contra el servidor, y los hallazgos de cada una se
 * cuentan de los hallazgos reales que la referencian.
 */
import { useState } from 'react'
import { Box, Typography, Tabs, Tab, Button } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Policy } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { grcApi, type AuditoriaGRC } from '@/api/grc'
import { FormularioRegistro, TablaRegistros, useCrud, Cifra, Encabezado, Etiqueta, fmtFecha, type Campo } from '@/components/comun/Registro'
import { TIPOS_AUDITORIA, ESTADOS_AUDITORIA, AUDITORIA_COLOR, etiqueta } from '@/components/grc/etiquetas'
import { COLOR_MODULO } from '@/config/marca'

const GRC_COLOR = COLOR_MODULO
const cop = (n?: number | string | null) => (n == null || n === '' ? '—' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n)))
const CAMPOS: Campo[] = [
  { clave: 'nombre', etiqueta: 'Auditoría', obligatorio: true },
  { clave: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', opciones: TIPOS_AUDITORIA, obligatorio: true, ancho: 6 },
  { clave: 'estado', etiqueta: 'Estado', tipo: 'seleccion', opciones: ESTADOS_AUDITORIA, obligatorio: true, ancho: 6 },
  { clave: 'auditado', etiqueta: 'Proceso / área auditada', ancho: 6 },
  { clave: 'auditor_lider', etiqueta: 'Auditor líder', ancho: 6 },
  { clave: 'equipo_auditor', etiqueta: 'Equipo auditor' },
  { clave: 'fecha_inicio', etiqueta: 'Inicio', tipo: 'fecha', obligatorio: true, ancho: 4 },
  { clave: 'fecha_fin', etiqueta: 'Fin', tipo: 'fecha', ancho: 4, validar: (v, f) => (v && f.fecha_inicio && v < f.fecha_inicio ? 'Antes del inicio' : null) },
  { clave: 'fecha_reporte', etiqueta: 'Informe', tipo: 'fecha', ancho: 4 },
  { clave: 'presupuesto', etiqueta: 'Presupuesto', tipo: 'numero', min: 0, ancho: 6 },
  { clave: 'criterios', etiqueta: 'Criterios (normas, contratos)', ancho: 6 },
  { clave: 'alcance', etiqueta: 'Alcance', tipo: 'area' },
  { clave: 'observaciones', etiqueta: 'Conclusiones', tipo: 'area' },
]

export default function GRCAuditorias() {
  const crud = useCrud(['grc-auditorias'], grcApi.auditorias, 'Auditoría', [['grc-tablero']], true)
  const { data: hallazgos = [] } = useQuery({ queryKey: ['grc-hallazgos'], queryFn: () => grcApi.hallazgos.listar() })
  const [dlg, setDlg] = useState<{ abierto: boolean; r: AuditoriaGRC | null }>({ abierto: false, r: null })
  const [tab, setTab] = useState('')
  const lista = crud.datos
  const anio = String(new Date().getFullYear())
  const hallDe = (id: number) => hallazgos.filter(h => h.auditoria_id === id)
  const visibles = tab ? lista.filter(a => a.estado === tab) : lista

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Policy sx={{ fontSize: 28 }} />} titulo="Auditorías" subtitulo="GRC · Programa, ejecución y resultados"
          color={GRC_COLOR} accion="Programar auditoría" onAccion={() => setDlg({ abierto: true, r: null })} />
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Planificadas" valor={lista.filter(a => a.estado === 'planificada').length} color="#0369A1" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="En curso" valor={lista.filter(a => ['en_ejecucion', 'en_revision'].includes(a.estado)).length} color="#D97706" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta={`Completadas ${anio}`} valor={lista.filter(a => a.estado === 'completada' && (a.fecha_fin ?? a.fecha_inicio ?? '').startsWith(anio)).length} color="#15803D" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Hallazgos abiertos" valor={hallazgos.filter(h => h.auditoria_id && h.estado !== 'cerrado').length} color="#DC2626" /></Grid>
        </Grid>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable">
          <Tab value="" label="Todas" />
          {ESTADOS_AUDITORIA.map(([v, l]) => <Tab key={v} value={v} label={l} />)}
        </Tabs>
        <TablaRegistros<AuditoriaGRC> filas={visibles} cargando={crud.isLoading} vacio="Sin auditorías" etiqueta={a => a.nombre}
          onEditar={a => setDlg({ abierto: true, r: a })} onRetirar={a => crud.retirar.mutate(a.id)}
          extra={a => hallDe(a.id).length ? <Button size="small" component={RouterLink} to={`/grc/hallazgos?auditoria=${a.id}`}>{hallDe(a.id).length} hallazgos</Button> : null}
          columnas={[
            { titulo: 'Código', valor: a => <Box sx={{ fontFamily: 'monospace' }}>{a.codigo}</Box> },
            { titulo: 'Auditoría', valor: a => <><b>{a.nombre}</b><Typography fontSize={11} color="text.secondary">{a.auditado ?? ''}</Typography></> },
            { titulo: 'Tipo', valor: a => etiqueta(TIPOS_AUDITORIA, a.tipo) },
            { titulo: 'Auditor', valor: a => a.auditor_lider ?? '—' },
            { titulo: 'Fechas', valor: a => `${fmtFecha(a.fecha_inicio)}${a.fecha_fin ? ` → ${fmtFecha(a.fecha_fin)}` : ''}` },
            { titulo: 'Presupuesto', alinear: 'right', valor: a => cop(a.presupuesto) },
            { titulo: 'Estado', valor: a => <Etiqueta texto={etiqueta(ESTADOS_AUDITORIA, a.estado)} color={AUDITORIA_COLOR[a.estado] ?? '#6B7280'} /> },
          ]} />
        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? `Auditoría ${dlg.r.codigo}` : 'Programar auditoría'} campos={CAMPOS} registro={dlg.r}
          valoresIniciales={{ tipo: 'interna', estado: 'planificada' }} onGuardar={c => crud.guardar(dlg.r, c)} onCerrar={() => setDlg({ abierto: false, r: null })} />
      </Box>
    </Layout>
  )
}
