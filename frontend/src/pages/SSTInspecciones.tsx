/**
 * SST · Inspecciones de seguridad
 *
 * Era una maqueta: la lista salía de una constante y «Programar» solo la
 * ampliaba en memoria. Ahora se programan, se ejecutan (hallazgos, puntuación
 * y observaciones) y se cierran contra el servidor.
 */
import { useState } from 'react'
import { Box, Chip, Table, TableBody, TableCell, TableHead, TableRow, Paper, IconButton, Tooltip, LinearProgress, MenuItem, TextField, alpha } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { FactCheck, Edit, DeleteForever, PlayArrow, DoneAll } from '@mui/icons-material'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { sstApi, type Inspeccion } from '@/api/sst'
import { FormularioRegistro, useCrud, Cifra, Encabezado, fmtFecha, errorApi, type Campo } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const SST_COLOR = COLOR_MODULO
const ESTADOS: Record<string, { l: string; c: string }> = {
  PROGRAMADA: { l: 'Programada', c: '#0369A1' }, EN_CURSO: { l: 'En curso', c: '#D97706' },
  COMPLETADA: { l: 'Completada', c: '#15803D' }, CANCELADA: { l: 'Cancelada', c: '#6B7280' },
}
const TIPOS: [string, string][] = [['PLANEADA', 'Planeada'], ['NO_PLANEADA', 'No planeada'], ['EXTINTORES', 'Extintores'],
  ['BOTIQUINES', 'Botiquines'], ['LOCATIVA', 'Locativa'], ['EPP', 'Uso de EPP'], ['VEHICULOS', 'Vehículos']]

const CAMPOS: Campo[] = [
  { clave: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', opciones: TIPOS, obligatorio: true, ancho: 6 },
  { clave: 'area', etiqueta: 'Área', obligatorio: true, ancho: 6 },
  { clave: 'fecha_programada', etiqueta: 'Fecha programada', tipo: 'fecha', obligatorio: true, ancho: 6 },
  { clave: 'inspector', etiqueta: 'Inspector', ancho: 6 },
  { clave: 'descripcion', etiqueta: 'Alcance', tipo: 'area' },
  { clave: 'hallazgos_count', etiqueta: 'Hallazgos', tipo: 'numero', min: 0, ancho: 6 },
  { clave: 'puntuacion', etiqueta: 'Puntuación (0-100)', tipo: 'numero', min: 0, max: 100, ancho: 6 },
  { clave: 'observaciones', etiqueta: 'Observaciones', tipo: 'area' },
]

export default function SSTInspecciones() {
  const crud = useCrud(['sst-inspecciones'], sstApi.inspecciones, 'Inspección', [['sst-tablero'], ['sst-indicadores']], true)
  const [dlg, setDlg] = useState<{ abierto: boolean; r: Inspeccion | null }>({ abierto: false, r: null })
  const [filtro, setFiltro] = useState('')
  const estado = useMutation({
    mutationFn: ({ id, e }: { id: number; e: string }) => sstApi.inspecciones.estado(id, e),
    onSuccess: () => { toast.success('Inspección actualizada'); crud.refrescar() },
    onError: (e: any) => toast.error(errorApi(e)),
  })
  const lista = crud.datos
  const hoy = new Date().toISOString().slice(0, 10)
  const vencidas = lista.filter(i => i.estado === 'PROGRAMADA' && i.fecha_programada && i.fecha_programada < hoy)
  const hechas = lista.filter(i => i.estado === 'COMPLETADA')
  const conPuntaje = hechas.filter(i => i.puntuacion != null)
  const visibles = filtro ? lista.filter(i => i.estado === filtro) : lista

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<FactCheck sx={{ fontSize: 28 }} />} titulo="Inspecciones de seguridad" subtitulo="SST · Programación, ejecución y hallazgos"
          color={SST_COLOR} accion="Programar inspección" onAccion={() => setDlg({ abierto: true, r: null })} />
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Programadas" valor={lista.filter(i => i.estado === 'PROGRAMADA').length} color="#0369A1" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Atrasadas" valor={vencidas.length} color="#DC2626" sub="Programadas con fecha ya pasada" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Completadas" valor={hechas.length} color="#15803D" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Puntuación promedio" valor={conPuntaje.length ? (conPuntaje.reduce((s, i) => s + (i.puntuacion ?? 0), 0) / conPuntaje.length).toFixed(1) : '—'} color={SST_COLOR} /></Grid>
        </Grid>
        <TextField select size="small" label="Estado" value={filtro} onChange={e => setFiltro(e.target.value)} sx={{ minWidth: 170, mb: 2 }}>
          <MenuItem value="">Todos</MenuItem>
          {Object.entries(ESTADOS).map(([k, v]) => <MenuItem key={k} value={k}>{v.l}</MenuItem>)}
        </TextField>
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
          {crud.isLoading && <LinearProgress />}
          <Table size="small">
            <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12 } }}>
              <TableCell>Número</TableCell><TableCell>Tipo</TableCell><TableCell>Área</TableCell><TableCell>Programada</TableCell>
              <TableCell>Realizada</TableCell><TableCell>Inspector</TableCell><TableCell align="right">Hallazgos</TableCell>
              <TableCell align="right">Puntuación</TableCell><TableCell>Estado</TableCell><TableCell />
            </TableRow></TableHead>
            <TableBody>
              {!crud.isLoading && visibles.length === 0 && <TableRow><TableCell colSpan={10} align="center" sx={{ py: 3, color: 'text.secondary' }}>Sin inspecciones</TableCell></TableRow>}
              {visibles.map(i => {
                const e = ESTADOS[i.estado] ?? { l: i.estado, c: '#6B7280' }
                const atrasada = vencidas.includes(i)
                return (
                  <TableRow key={i.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{i.numero}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{TIPOS.find(t => t[0] === i.tipo)?.[1] ?? i.tipo}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{i.area ?? '—'}</TableCell>
                    <TableCell sx={{ fontSize: 12, color: atrasada ? 'error.main' : undefined }}>{fmtFecha(i.fecha_programada)}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{fmtFecha(i.fecha_realizacion)}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{i.inspector ?? '—'}</TableCell>
                    <TableCell align="right">{i.hallazgos_count}</TableCell>
                    <TableCell align="right">{i.puntuacion ?? '—'}</TableCell>
                    <TableCell><Chip size="small" label={atrasada ? 'Atrasada' : e.l} sx={{ fontSize: 11, fontWeight: 700, bgcolor: alpha(atrasada ? '#DC2626' : e.c, 0.12), color: atrasada ? '#DC2626' : e.c }} /></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {i.estado === 'PROGRAMADA' && <Tooltip title="Iniciar"><IconButton size="small" aria-label={`Iniciar ${i.numero}`} onClick={() => estado.mutate({ id: i.id, e: 'EN_CURSO' })}><PlayArrow fontSize="small" /></IconButton></Tooltip>}
                      {['PROGRAMADA', 'EN_CURSO'].includes(i.estado) && <Tooltip title="Completar"><IconButton size="small" aria-label={`Completar ${i.numero}`} onClick={() => estado.mutate({ id: i.id, e: 'COMPLETADA' })}><DoneAll fontSize="small" sx={{ color: '#15803D' }} /></IconButton></Tooltip>}
                      <Tooltip title="Editar / registrar resultado"><IconButton size="small" aria-label={`Editar ${i.numero}`} onClick={() => setDlg({ abierto: true, r: i })}><Edit fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Retirar"><IconButton size="small" aria-label={`Retirar ${i.numero}`} onClick={() => { if (window.confirm(`¿Retirar ${i.numero}?`)) crud.retirar.mutate(i.id) }}><DeleteForever fontSize="small" sx={{ color: '#DC2626' }} /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Paper>
        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? `Inspección ${dlg.r.numero}` : 'Programar inspección'} campos={CAMPOS} registro={dlg.r}
          valoresIniciales={{ tipo: 'PLANEADA', hallazgos_count: '0' }}
          onGuardar={c => crud.guardar(dlg.r, { ...c, hallazgos_count: c.hallazgos_count ?? 0 })} onCerrar={() => setDlg({ abierto: false, r: null })} />
      </Box>
    </Layout>
  )
}
