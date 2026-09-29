/**
 * GRC · Hallazgos y planes de acción
 *
 * Era una maqueta: hallazgos escritos a mano y guardados en memoria. Ahora
 * cuelgan de sus auditorías reales y cada uno lleva sus planes de acción con
 * avance. «Vencido» no se guarda: un hallazgo sin cerrar con la fecha límite
 * pasada se muestra vencido, y deja de estarlo si se corrige la fecha.
 */
import { useState } from 'react'
import { Box, Typography, Tabs, Tab, Drawer, IconButton, Button, Paper, Slider, Divider } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { FindInPage, Close, Add, DeleteForever } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { grcApi, type HallazgoGRC } from '@/api/grc'
import { FormularioRegistro, TablaRegistros, useCrud, Cifra, Encabezado, Etiqueta, fmtFecha, errorApi, type Campo } from '@/components/comun/Registro'
import { SEVERIDADES, SEVERIDAD_COLOR, ESTADOS_HALLAZGO, HALLAZGO_COLOR, etiqueta } from '@/components/grc/etiquetas'
import { COLOR_MODULO } from '@/config/marca'

const GRC_COLOR = COLOR_MODULO
const TIPOS: [string, string][] = [['no_conformidad_mayor', 'No conformidad mayor'], ['no_conformidad_menor', 'No conformidad menor'], ['observacion', 'Observación'], ['oportunidad_mejora', 'Oportunidad de mejora']]
const hoy = () => new Date().toISOString().slice(0, 10)

function Planes({ h, onCerrar }: { h: HallazgoGRC; onCerrar: () => void }) {
  const qc = useQueryClient()
  const clave = ['grc-planes', h.id]
  const { data: planes = [] } = useQuery({ queryKey: clave, queryFn: () => grcApi.planes.listar(h.id) })
  const [nuevo, setNuevo] = useState(false)
  const refrescar = () => qc.invalidateQueries({ queryKey: clave })
  const avance = useMutation({
    mutationFn: ({ p, v }: { p: typeof planes[number]; v: number }) =>
      grcApi.planes.editar(p.id, { hallazgo_id: h.id, accion: p.accion, avance: v, estado: v === 100 ? 'completado' : v > 0 ? 'en_curso' : 'pendiente' }),
    onSuccess: refrescar, onError: (e: any) => toast.error(errorApi(e)),
  })
  const retirar = useMutation({ mutationFn: (id: number) => grcApi.planes.retirar(id), onSuccess: refrescar })
  const campos: Campo[] = [
    { clave: 'accion', etiqueta: 'Acción', tipo: 'area', obligatorio: true },
    { clave: 'responsable', etiqueta: 'Responsable', ancho: 6 },
    { clave: 'fecha_objetivo', etiqueta: 'Fecha objetivo', tipo: 'fecha', ancho: 6 },
  ]
  return (
    <Box sx={{ width: { xs: '100vw', sm: 480 }, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Box><Typography fontSize={12} color="text.secondary">{h.codigo}</Typography><Typography fontWeight={800}>{h.titulo}</Typography></Box>
        <IconButton aria-label="Cerrar" onClick={onCerrar}><Close /></IconButton>
      </Box>
      {h.recomendacion && <Typography fontSize={13} mt={1}><b>Recomendación:</b> {h.recomendacion}</Typography>}
      <Divider sx={{ my: 2 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography fontWeight={700}>Planes de acción</Typography>
        <Button size="small" startIcon={<Add />} onClick={() => setNuevo(true)}>Agregar</Button>
      </Box>
      {planes.length === 0 && <Typography fontSize={13} color="text.secondary">Sin planes de acción.</Typography>}
      {planes.map(p => (
        <Paper key={p.id} variant="outlined" sx={{ p: 1.5, mb: 1, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography fontSize={13} fontWeight={600}>{p.accion}</Typography>
            <IconButton size="small" aria-label="Retirar plan" onClick={() => retirar.mutate(p.id)}><DeleteForever fontSize="small" /></IconButton>
          </Box>
          <Typography fontSize={11} color="text.secondary">{p.responsable ?? 'Sin responsable'} · objetivo {fmtFecha(p.fecha_objetivo)}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Slider size="small" value={p.avance ?? 0} step={10} min={0} max={100} aria-label={`Avance de ${p.accion}`}
              onChangeCommitted={(_, v) => avance.mutate({ p, v: v as number })} sx={{ color: GRC_COLOR }} />
            <Typography fontSize={12} fontWeight={700} sx={{ minWidth: 40 }}>{p.avance ?? 0}%</Typography>
          </Box>
        </Paper>
      ))}
      <FormularioRegistro abierto={nuevo} titulo="Nuevo plan de acción" campos={campos} valoresIniciales={{ responsable: h.responsable ?? '' }}
        onGuardar={async c => { await grcApi.planes.crear({ ...c, hallazgo_id: h.id }); toast.success('Plan agregado'); refrescar() }}
        onCerrar={() => setNuevo(false)} />
    </Box>
  )
}

export default function GRCHallazgos() {
  const [params] = useSearchParams()
  const filtroAud = params.get('auditoria') ? Number(params.get('auditoria')) : null
  const crud = useCrud(['grc-hallazgos'], grcApi.hallazgos, 'Hallazgo', [['grc-tablero']])
  const { data: auditorias = [] } = useQuery({ queryKey: ['grc-auditorias'], queryFn: () => grcApi.auditorias.listar() })
  const [dlg, setDlg] = useState<{ abierto: boolean; r: HallazgoGRC | null }>({ abierto: false, r: null })
  const [detalle, setDetalle] = useState<HallazgoGRC | null>(null)
  const [tab, setTab] = useState(0)
  const vencido = (h: HallazgoGRC) => h.estado !== 'cerrado' && !!h.fecha_limite && h.fecha_limite < hoy()
  const lista = crud.datos.filter(h => !filtroAud || h.auditoria_id === filtroAud)
  const visibles = tab === 1 ? lista.filter(h => h.estado !== 'cerrado') : tab === 2 ? lista.filter(h => h.estado === 'cerrado') : lista
  const codAud = (id?: number | null) => auditorias.find(a => a.id === id)?.codigo ?? '—'

  const CAMPOS: Campo[] = [
    { clave: 'titulo', etiqueta: 'Hallazgo', obligatorio: true },
    { clave: 'auditoria_id', etiqueta: 'Auditoría', tipo: 'seleccion', opciones: auditorias.map(a => [a.id, `${a.codigo} · ${a.nombre}`] as [number, string]), ancho: 6 },
    { clave: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', opciones: TIPOS, ancho: 6 },
    { clave: 'severidad', etiqueta: 'Severidad', tipo: 'seleccion', opciones: SEVERIDADES, obligatorio: true, ancho: 6 },
    { clave: 'estado', etiqueta: 'Estado', tipo: 'seleccion', opciones: ESTADOS_HALLAZGO, obligatorio: true, ancho: 6 },
    { clave: 'proceso', etiqueta: 'Proceso', ancho: 6 },
    { clave: 'responsable', etiqueta: 'Responsable', ancho: 6 },
    { clave: 'fecha_limite', etiqueta: 'Fecha límite', tipo: 'fecha', obligatorio: true, ancho: 6 },
    { clave: 'descripcion', etiqueta: 'Descripción y evidencia', tipo: 'area' },
    { clave: 'impacto', etiqueta: 'Impacto', tipo: 'area' },
    { clave: 'recomendacion', etiqueta: 'Recomendación', tipo: 'area' },
  ]

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<FindInPage sx={{ fontSize: 28 }} />} titulo="Hallazgos" subtitulo={filtroAud ? `GRC · Hallazgos de la auditoría ${codAud(filtroAud)}` : 'GRC · Hallazgos de auditoría y planes de acción'}
          color={GRC_COLOR} accion="Nuevo hallazgo" onAccion={() => setDlg({ abierto: true, r: null })} />
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Abiertos" valor={lista.filter(h => h.estado !== 'cerrado').length} color="#DC2626" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Vencidos" valor={lista.filter(vencido).length} color="#991B1B" sub="Fecha límite pasada sin cerrar" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Críticos o altos abiertos" valor={lista.filter(h => h.estado !== 'cerrado' && ['critica', 'alta'].includes(h.severidad ?? '')).length} color="#EA580C" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Cerrados" valor={lista.filter(h => h.estado === 'cerrado').length} color="#15803D" /></Grid>
        </Grid>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}><Tab label="Todos" /><Tab label="Activos" /><Tab label="Cerrados" /></Tabs>
        <TablaRegistros<HallazgoGRC> filas={visibles} cargando={crud.isLoading} vacio="Sin hallazgos" etiqueta={h => h.titulo}
          onFila={h => setDetalle(h)} onEditar={h => setDlg({ abierto: true, r: h })} onRetirar={h => crud.retirar.mutate(h.id)}
          columnas={[
            { titulo: 'Código', valor: h => <Box sx={{ fontFamily: 'monospace' }}>{h.codigo}</Box> },
            { titulo: 'Hallazgo', valor: h => <><b>{h.titulo}</b><Typography fontSize={11} color="text.secondary">{etiqueta(TIPOS, h.tipo)}</Typography></> },
            { titulo: 'Auditoría', valor: h => codAud(h.auditoria_id) },
            { titulo: 'Severidad', valor: h => h.severidad ? <Etiqueta texto={etiqueta(SEVERIDADES, h.severidad)} color={SEVERIDAD_COLOR[h.severidad]} /> : '—' },
            { titulo: 'Responsable', valor: h => h.responsable ?? '—' },
            { titulo: 'Límite', valor: h => <Box sx={{ color: vencido(h) ? 'error.main' : undefined, fontWeight: vencido(h) ? 700 : 400 }}>{fmtFecha(h.fecha_limite)}</Box> },
            { titulo: 'Estado', valor: h => vencido(h) ? <Etiqueta texto="Vencido" color={HALLAZGO_COLOR.vencido} /> : <Etiqueta texto={etiqueta(ESTADOS_HALLAZGO, h.estado)} color={HALLAZGO_COLOR[h.estado] ?? '#6B7280'} /> },
          ]} />
        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? `Hallazgo ${dlg.r.codigo}` : 'Nuevo hallazgo'} campos={CAMPOS} registro={dlg.r}
          valoresIniciales={{ estado: 'abierto', severidad: 'media', ...(filtroAud ? { auditoria_id: String(filtroAud) } : {}) }}
          onGuardar={c => crud.guardar(dlg.r, c)} onCerrar={() => setDlg({ abierto: false, r: null })} />
        <Drawer anchor="right" open={!!detalle} onClose={() => setDetalle(null)}>{detalle && <Planes h={detalle} onCerrar={() => setDetalle(null)} />}</Drawer>
      </Box>
    </Layout>
  )
}
