/**
 * SST · Configuración
 *
 * Era una maqueta: datos de la empresa y metas escritos en el estado de la
 * pantalla —«la compañía S.A.S.», NIT 900.123.456-7— y un «Guardar» que solo
 * cambiaba el texto del botón. Ahora se guarda en el servidor.
 *
 * La pestaña nueva es la que hace posibles los indicadores: Períodos, con los
 * trabajadores y las horas-hombre de cada mes. La de alertas y notificaciones
 * se quitó: ningún proceso las enviaba.
 */
import { useState } from 'react'
import {
  Box, Paper, Tabs, Tab, TextField, Button, Typography, Table, TableBody, TableCell, TableHead, TableRow,
  IconButton, Tooltip, LinearProgress, MenuItem, Alert,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Settings, Save, Edit, DeleteForever, Add } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { AdminCatalogos } from '@/components/catalogo/AdminCatalogos'
import { sstApi, type Periodo } from '@/api/sst'
import { Encabezado, FormularioRegistro, errorApi, type Campo } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const SST_COLOR = COLOR_MODULO
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const CLASES_RIESGO = ['I', 'II', 'III', 'IV', 'V']

const EMPRESA: [string, string, number][] = [
  ['empresa', 'Razón social', 6], ['nit', 'NIT', 6], ['arl', 'ARL', 6], ['clase_riesgo', 'Clase de riesgo', 6],
  ['responsable_sst', 'Responsable del SG-SST', 6], ['correo_responsable', 'Correo del responsable', 6],
]
const METAS: [string, string][] = [
  ['meta_if', 'Índice de frecuencia máximo (AT / millón h-h)'], ['meta_is', 'Índice de severidad máximo (días / millón h-h)'],
  ['meta_dias_sin_accidente', 'Días sin accidente (mínimo)'], ['meta_cumplimiento_capacitaciones', 'Cumplimiento de capacitaciones (%)'],
  ['meta_cumplimiento_inspecciones', 'Cumplimiento de inspecciones (%)'], ['meta_epp_vigentes', 'EPP vigentes (%)'],
]

const CAMPOS_PERIODO: Campo[] = [
  { clave: 'anio', etiqueta: 'Año', tipo: 'numero', obligatorio: true, min: 2000, max: 2100, ancho: 6 },
  { clave: 'mes', etiqueta: 'Mes', tipo: 'seleccion', opciones: MESES.map((m, i) => [i + 1, m] as [number, string]), obligatorio: true, ancho: 6 },
  { clave: 'trabajadores', etiqueta: 'Trabajadores', tipo: 'numero', obligatorio: true, min: 1, ancho: 6 },
  { clave: 'horas_hombre', etiqueta: 'Horas-hombre trabajadas', tipo: 'numero', obligatorio: true, min: 1, ancho: 6,
    ayuda: 'Suma de las horas trabajadas por todos en el mes' },
  { clave: 'dias_programados', etiqueta: 'Días de trabajo programados', tipo: 'numero', min: 0, ancho: 6, ayuda: 'Trabajadores × días hábiles' },
  { clave: 'dias_ausencia_medica', etiqueta: 'Días de ausencia por causa médica', tipo: 'numero', min: 0, ancho: 6 },
]

function Periodos() {
  const qc = useQueryClient()
  const { data: periodos = [], isLoading } = useQuery({ queryKey: ['sst-periodos'], queryFn: () => sstApi.periodos.listar() })
  const [dlg, setDlg] = useState<{ abierto: boolean; r: Periodo | null }>({ abierto: false, r: null })
  const refrescar = () => { qc.invalidateQueries({ queryKey: ['sst-periodos'] }); qc.invalidateQueries({ queryKey: ['sst-indicadores'] }) }
  const retirar = useMutation({
    mutationFn: (id: number) => sstApi.periodos.retirar(id),
    onSuccess: () => { toast.success('Período eliminado'); refrescar() },
    onError: (e: any) => toast.error(errorApi(e)),
  })
  const hoy = new Date()
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, gap: 2 }}>
        <Typography fontSize={13} color="text.secondary">
          Los índices de frecuencia y severidad dividen los accidentes por la exposición. Sin el mes registrado aquí, ese mes no tiene índice.
        </Typography>
        <Button size="small" variant="contained" startIcon={<Add />} onClick={() => setDlg({ abierto: true, r: null })} sx={{ bgcolor: SST_COLOR, flexShrink: 0 }}>Registrar mes</Button>
      </Box>
      {isLoading && <LinearProgress />}
      <Table size="small">
        <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12 } }}>
          <TableCell>Período</TableCell><TableCell align="right">Trabajadores</TableCell><TableCell align="right">Horas-hombre</TableCell>
          <TableCell align="right">Días programados</TableCell><TableCell align="right">Ausencia médica</TableCell><TableCell />
        </TableRow></TableHead>
        <TableBody>
          {!isLoading && periodos.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>Sin períodos registrados</TableCell></TableRow>}
          {periodos.map(p => (
            <TableRow key={p.id} hover>
              <TableCell>{MESES[p.mes - 1]} {p.anio}</TableCell>
              <TableCell align="right">{p.trabajadores.toLocaleString('es-CO')}</TableCell>
              <TableCell align="right">{p.horas_hombre.toLocaleString('es-CO')}</TableCell>
              <TableCell align="right">{p.dias_programados?.toLocaleString('es-CO') ?? '—'}</TableCell>
              <TableCell align="right">{p.dias_ausencia_medica}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                <Tooltip title="Editar"><IconButton size="small" aria-label={`Editar ${MESES[p.mes - 1]} ${p.anio}`} onClick={() => setDlg({ abierto: true, r: p })}><Edit fontSize="small" /></IconButton></Tooltip>
                <Tooltip title="Eliminar"><IconButton size="small" aria-label={`Eliminar ${MESES[p.mes - 1]} ${p.anio}`} onClick={() => { if (window.confirm('¿Eliminar este período?')) retirar.mutate(p.id) }}><DeleteForever fontSize="small" sx={{ color: '#DC2626' }} /></IconButton></Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? `${MESES[dlg.r.mes - 1]} ${dlg.r.anio}` : 'Registrar mes'} campos={CAMPOS_PERIODO} registro={dlg.r}
        valoresIniciales={{ anio: String(hoy.getFullYear()), mes: String(hoy.getMonth() + 1), dias_ausencia_medica: '0' }}
        onGuardar={async c => {
          await sstApi.periodos.guardar({ ...c, dias_ausencia_medica: c.dias_ausencia_medica ?? 0 } as any)
          toast.success('Período guardado'); refrescar()
        }}
        onCerrar={() => setDlg({ abierto: false, r: null })} />
    </Box>
  )
}

export default function SSTConfig() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const { data: cfg, isLoading } = useQuery({ queryKey: ['sst-config'], queryFn: sstApi.config })
  const [edicion, setEdicion] = useState<Record<string, string>>({})
  const valor = (k: string) => edicion[k] ?? cfg?.[k] ?? ''
  const cambios = Object.keys(edicion).filter(k => edicion[k] !== (cfg?.[k] ?? ''))
  const metaMal = (k: string) => k.startsWith('meta_') && valor(k) !== '' && !(Number(valor(k)) >= 0)
  const guardar = useMutation({
    mutationFn: () => sstApi.guardarConfig(Object.fromEntries(cambios.map(k => [k, edicion[k]]))),
    onSuccess: r => { qc.setQueryData(['sst-config'], r); setEdicion({}); toast.success('Configuración guardada') },
    onError: (e: any) => toast.error(errorApi(e)),
  })
  const botonGuardar = (
    <Button variant="contained" startIcon={<Save />} disabled={!cambios.length || cambios.some(metaMal) || guardar.isPending}
      onClick={() => guardar.mutate()} sx={{ bgcolor: SST_COLOR }}>Guardar cambios</Button>
  )

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Settings sx={{ fontSize: 28 }} />} titulo="Configuración SST" subtitulo="SST · Empresa, metas, períodos y catálogos" color={SST_COLOR} />
        <Paper variant="outlined" sx={{ borderRadius: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid #E5E7EB' }}>
            <Tab label="Empresa" /><Tab label="Metas" /><Tab label="Períodos" /><Tab label="Catálogos" />
          </Tabs>
          {isLoading && <LinearProgress />}
          <Box sx={{ p: 3 }}>
            {tab === 0 && (
              <Grid container spacing={2} sx={{ maxWidth: 800 }}>
                {EMPRESA.map(([k, l, w]) => (
                  <Grid key={k} size={{ xs: 12, sm: w }}>
                    {k === 'clase_riesgo'
                      ? <TextField select label={l} fullWidth size="small" value={valor(k)} onChange={e => setEdicion({ ...edicion, [k]: e.target.value })}>
                          <MenuItem value=""><em>—</em></MenuItem>{CLASES_RIESGO.map(c => <MenuItem key={c} value={c}>Clase {c}</MenuItem>)}
                        </TextField>
                      : <TextField label={l} fullWidth size="small" value={valor(k)} onChange={e => setEdicion({ ...edicion, [k]: e.target.value })} />}
                  </Grid>
                ))}
                <Grid size={{ xs: 12 }}>{botonGuardar}</Grid>
              </Grid>
            )}
            {tab === 1 && (
              <Grid container spacing={2} sx={{ maxWidth: 800 }}>
                <Grid size={{ xs: 12 }}><Alert severity="info">Las usa la pantalla de Indicadores para marcar en verde o rojo cada cifra.</Alert></Grid>
                {METAS.map(([k, l]) => (
                  <Grid key={k} size={{ xs: 12, sm: 6 }}>
                    <TextField label={l} type="number" fullWidth size="small" value={valor(k)} error={metaMal(k)} helperText={metaMal(k) ? 'Número no negativo' : undefined}
                      onChange={e => setEdicion({ ...edicion, [k]: e.target.value })} />
                  </Grid>
                ))}
                <Grid size={{ xs: 12 }}>{botonGuardar}</Grid>
              </Grid>
            )}
            {tab === 2 && <Periodos />}
            {tab === 3 && <AdminCatalogos modulo="SST" color={COLOR_MODULO} />}
          </Box>
        </Paper>
      </Box>
    </Layout>
  )
}
