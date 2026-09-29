/**
 * SST · Incidentes y accidentes de trabajo
 *
 * Era una maqueta que importaba el cliente de la API y no lo usaba: la lista
 * salía de una constante y «Reportar» solo la ampliaba en memoria.
 *
 * El flujo es el de la norma: se reporta, se investiga (causas inmediata y
 * básica, acciones correctivas) y se cierra. El servidor no deja cerrar un
 * accidente de trabajo sin causas registradas.
 */
import { useState } from 'react'
import {
  Box, Chip, Table, TableBody, TableCell, TableHead, TableRow, Paper, IconButton, Tooltip,
  LinearProgress, MenuItem, TextField, alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { ReportProblem, Edit, DeleteForever, Search, CheckCircle } from '@mui/icons-material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { sstApi, type Incidente } from '@/api/sst'
import { FormularioRegistro, useCrud, Cifra, Encabezado, fmtFecha, errorApi, type Campo } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const SST_COLOR = COLOR_MODULO
const TIPOS: [string, string][] = [['ACCIDENTE_TRABAJO', 'Accidente de trabajo'], ['INCIDENTE', 'Incidente'], ['CASI_ACCIDENTE', 'Casi accidente'], ['ENFERMEDAD_LABORAL', 'Enfermedad laboral']]
const GRAVEDADES: [string, string][] = [['LEVE', 'Leve'], ['MODERADO', 'Moderado'], ['GRAVE', 'Grave'], ['MUY_GRAVE', 'Muy grave'], ['MORTAL', 'Mortal']]
const ESTADOS: Record<string, { l: string; c: string }> = {
  REPORTADO: { l: 'Reportado', c: '#DC2626' }, EN_INVESTIGACION: { l: 'En investigación', c: '#D97706' },
  INVESTIGADO: { l: 'Investigado', c: '#0369A1' }, CERRADO: { l: 'Cerrado', c: '#15803D' },
}
const SIGUIENTE: Record<string, [string, string]> = {
  REPORTADO: ['EN_INVESTIGACION', 'Iniciar investigación'], EN_INVESTIGACION: ['INVESTIGADO', 'Marcar investigado'], INVESTIGADO: ['CERRADO', 'Cerrar'],
}
const hoy = () => new Date().toISOString().slice(0, 10)

const CAMPOS: Campo[] = [
  { clave: 'tipo', etiqueta: 'Tipo de evento', tipo: 'seleccion', opciones: TIPOS, obligatorio: true, ancho: 6 },
  { clave: 'gravedad', etiqueta: 'Gravedad', tipo: 'seleccion', opciones: GRAVEDADES, ancho: 6 },
  { clave: 'fecha_evento', etiqueta: 'Fecha del evento', tipo: 'fecha', obligatorio: true, ancho: 6,
    validar: v => (v && v > hoy() ? 'No puede ser futura' : null) },
  { clave: 'hora_evento', etiqueta: 'Hora (HH:MM)', ancho: 6, validar: v => (v && !/^\d{2}:\d{2}$/.test(v) ? 'Formato HH:MM' : null) },
  { clave: 'trabajador', etiqueta: 'Trabajador', obligatorio: true, ancho: 6 },
  { clave: 'cargo', etiqueta: 'Cargo', ancho: 6 },
  { clave: 'area', etiqueta: 'Área', ancho: 6 },
  { clave: 'lugar', etiqueta: 'Lugar', ancho: 6 },
  { clave: 'descripcion', etiqueta: 'Qué pasó', tipo: 'area', obligatorio: true },
  { clave: 'dias_incapacidad', etiqueta: 'Días de incapacidad', tipo: 'numero', min: 0, ancho: 6 },
  { clave: 'investigador', etiqueta: 'Investigador', ancho: 6 },
  { clave: 'causa_inmediata', etiqueta: 'Causa inmediata', tipo: 'area', ayuda: 'Actos y condiciones inseguras' },
  { clave: 'causa_basica', etiqueta: 'Causa básica', tipo: 'area', ayuda: 'Factores personales y del trabajo' },
  { clave: 'acciones_correctivas', etiqueta: 'Acciones correctivas', tipo: 'area' },
]

export default function SSTIncidentes() {
  const qc = useQueryClient()
  const crud = useCrud(['sst-incidentes'], sstApi.incidentes, 'Evento', [['sst-tablero'], ['sst-indicadores']])
  const [dlg, setDlg] = useState<{ abierto: boolean; r: Incidente | null }>({ abierto: false, r: null })
  const [filtroEstado, setFiltroEstado] = useState('')
  const [buscar, setBuscar] = useState('')

  const cambiarEstado = useMutation({
    mutationFn: ({ id, e }: { id: number; e: string }) => sstApi.incidentes.estado(id, e),
    onSuccess: () => { toast.success('Estado actualizado'); crud.refrescar() },
    onError: (e: any) => toast.error(errorApi(e)),
  })

  const lista = crud.datos
  const anio = String(new Date().getFullYear())
  const delAnio = lista.filter(i => i.fecha_evento.startsWith(anio))
  const visibles = lista.filter(i => (!filtroEstado || i.estado === filtroEstado)
    && (!buscar || `${i.numero} ${i.trabajador ?? ''} ${i.area ?? ''} ${i.descripcion ?? ''}`.toLowerCase().includes(buscar.toLowerCase())))

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<ReportProblem sx={{ fontSize: 28 }} />} titulo="Incidentes y accidentes" subtitulo="SST · Reporte, investigación y cierre"
          color={SST_COLOR} accion="Reportar evento" onAccion={() => setDlg({ abierto: true, r: null })} />
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta={`Accidentes de trabajo ${anio}`} valor={delAnio.filter(i => i.tipo === 'ACCIDENTE_TRABAJO').length} color="#DC2626" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta={`Días de incapacidad ${anio}`} valor={delAnio.reduce((s, i) => s + (i.dias_incapacidad || 0), 0)} color="#D97706" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Sin cerrar" valor={lista.filter(i => i.estado !== 'CERRADO').length} color="#0369A1" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta={`Casi accidentes ${anio}`} valor={delAnio.filter(i => i.tipo === 'CASI_ACCIDENTE').length} color="#6B7280" sub="Reportarlos previene el siguiente" /></Grid>
        </Grid>

        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField size="small" placeholder="Buscar" value={buscar} onChange={e => setBuscar(e.target.value)}
            InputProps={{ startAdornment: <Search sx={{ fontSize: 18, mr: 0.5, color: 'text.disabled' }} /> }} />
          <TextField select size="small" label="Estado" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} sx={{ minWidth: 170 }}>
            <MenuItem value="">Todos</MenuItem>
            {Object.entries(ESTADOS).map(([k, v]) => <MenuItem key={k} value={k}>{v.l}</MenuItem>)}
          </TextField>
        </Box>

        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
          {crud.isLoading && <LinearProgress />}
          <Table size="small">
            <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12 } }}>
              <TableCell>Número</TableCell><TableCell>Tipo</TableCell><TableCell>Fecha</TableCell><TableCell>Trabajador</TableCell>
              <TableCell>Área</TableCell><TableCell>Gravedad</TableCell><TableCell align="right">Días</TableCell><TableCell>Estado</TableCell><TableCell />
            </TableRow></TableHead>
            <TableBody>
              {!crud.isLoading && visibles.length === 0 && <TableRow><TableCell colSpan={9} align="center" sx={{ py: 3, color: 'text.secondary' }}>Sin eventos registrados</TableCell></TableRow>}
              {visibles.map(i => {
                const e = ESTADOS[i.estado] ?? { l: i.estado, c: '#6B7280' }
                const sig = SIGUIENTE[i.estado]
                return (
                  <TableRow key={i.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{i.numero}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{TIPOS.find(t => t[0] === i.tipo)?.[1] ?? i.tipo}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{fmtFecha(i.fecha_evento)}{i.hora_evento ? ` ${i.hora_evento}` : ''}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{i.trabajador ?? '—'}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{i.area ?? '—'}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{GRAVEDADES.find(g => g[0] === i.gravedad)?.[1] ?? '—'}</TableCell>
                    <TableCell align="right" sx={{ fontSize: 12 }}>{i.dias_incapacidad || 0}</TableCell>
                    <TableCell><Chip size="small" label={e.l} sx={{ fontSize: 11, fontWeight: 700, bgcolor: alpha(e.c, 0.12), color: e.c }} /></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {sig && <Tooltip title={sig[1]}><IconButton size="small" aria-label={`${sig[1]} ${i.numero}`} onClick={() => cambiarEstado.mutate({ id: i.id, e: sig[0] })}><CheckCircle fontSize="small" sx={{ color: '#15803D' }} /></IconButton></Tooltip>}
                      <Tooltip title="Editar / investigar"><IconButton size="small" aria-label={`Editar ${i.numero}`} onClick={() => setDlg({ abierto: true, r: i })}><Edit fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Retirar"><IconButton size="small" aria-label={`Retirar ${i.numero}`} onClick={() => { if (window.confirm(`¿Retirar ${i.numero}?`)) crud.retirar.mutate(i.id) }}><DeleteForever fontSize="small" sx={{ color: '#DC2626' }} /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Paper>

        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? `Evento ${dlg.r.numero}` : 'Reportar evento'} campos={CAMPOS} registro={dlg.r}
          valoresIniciales={{ tipo: 'INCIDENTE', fecha_evento: hoy(), dias_incapacidad: '0' }}
          onGuardar={c => crud.guardar(dlg.r, { ...c, dias_incapacidad: c.dias_incapacidad ?? 0 }).then(() => qc.invalidateQueries({ queryKey: ['sst-tablero'] }))}
          onCerrar={() => setDlg({ abierto: false, r: null })} />
      </Box>
    </Layout>
  )
}
