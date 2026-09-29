/**
 * SST · Plan de capacitación
 *
 * Era una maqueta: capacitaciones escritas a mano con cupos y evaluaciones
 * inventadas. Ahora se programan, se registra la asistencia y la evaluación, y
 * el cumplimiento del plan se calcula con lo completado frente a lo programado.
 */
import { useState } from 'react'
import { Box, Chip, Table, TableBody, TableCell, TableHead, TableRow, Paper, IconButton, Tooltip, LinearProgress, MenuItem, TextField, alpha } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { School, Edit, DeleteForever } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import { sstApi, type Capacitacion } from '@/api/sst'
import { FormularioRegistro, useCrud, Cifra, Encabezado, fmtFecha, type Campo } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const SST_COLOR = COLOR_MODULO
const ESTADOS: [string, string][] = [['PROGRAMADA', 'Programada'], ['EN_CURSO', 'En curso'], ['COMPLETADA', 'Completada'], ['CANCELADA', 'Cancelada']]
const COLOR_EST: Record<string, string> = { PROGRAMADA: '#0369A1', EN_CURSO: '#D97706', COMPLETADA: '#15803D', CANCELADA: '#6B7280' }
const TIPOS: [string, string][] = [['INDUCCION', 'Inducción'], ['REINDUCCION', 'Reinducción'], ['ESPECIFICA', 'Específica del cargo'],
  ['EMERGENCIAS', 'Emergencias'], ['ALTURAS', 'Trabajo en alturas'], ['COPASST', 'COPASST / Comité'], ['OTRA', 'Otra']]
const MODALIDADES: [string, string][] = [['PRESENCIAL', 'Presencial'], ['VIRTUAL', 'Virtual'], ['MIXTA', 'Mixta']]

const CAMPOS: Campo[] = [
  { clave: 'titulo', etiqueta: 'Tema', obligatorio: true },
  { clave: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', opciones: TIPOS, ancho: 6 },
  { clave: 'modalidad', etiqueta: 'Modalidad', tipo: 'seleccion', opciones: MODALIDADES, ancho: 6 },
  { clave: 'estado', etiqueta: 'Estado', tipo: 'seleccion', opciones: ESTADOS, obligatorio: true, ancho: 6 },
  { clave: 'instructor', etiqueta: 'Instructor', ancho: 6 },
  { clave: 'fecha_inicio', etiqueta: 'Inicio', tipo: 'fecha', obligatorio: true, ancho: 6 },
  { clave: 'fecha_fin', etiqueta: 'Fin', tipo: 'fecha', ancho: 6, validar: (v, f) => (v && f.fecha_inicio && v < f.fecha_inicio ? 'Antes del inicio' : null) },
  { clave: 'duracion_horas', etiqueta: 'Duración (horas)', tipo: 'numero', min: 0, ancho: 4 },
  { clave: 'max_participantes', etiqueta: 'Cupo', tipo: 'numero', min: 1, ancho: 4 },
  { clave: 'participantes', etiqueta: 'Asistentes', tipo: 'numero', min: 0, ancho: 4,
    validar: (v, f) => (v !== '' && f.max_participantes !== '' && Number(v) > Number(f.max_participantes) ? 'Más que el cupo' : null) },
  { clave: 'area_dirigida', etiqueta: 'Dirigida a (área / cargos)', ancho: 8 },
  { clave: 'evaluacion_prom', etiqueta: 'Evaluación (0-5)', tipo: 'numero', min: 0, max: 5, ancho: 4 },
  { clave: 'descripcion', etiqueta: 'Contenido', tipo: 'area' },
]

export default function SSTCapacitacion() {
  const crud = useCrud(['sst-capacitaciones'], sstApi.capacitaciones, 'Capacitación', [['sst-indicadores']], true)
  const [dlg, setDlg] = useState<{ abierto: boolean; r: Capacitacion | null }>({ abierto: false, r: null })
  const [filtro, setFiltro] = useState('')
  const anio = String(new Date().getFullYear())
  const lista = crud.datos
  const delAnio = lista.filter(c => (c.fecha_inicio ?? '').startsWith(anio) && c.estado !== 'CANCELADA')
  const completadas = delAnio.filter(c => c.estado === 'COMPLETADA')
  const evaluadas = completadas.filter(c => c.evaluacion_prom != null)
  const visibles = filtro ? lista.filter(c => c.estado === filtro) : lista

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<School sx={{ fontSize: 28 }} />} titulo="Plan de capacitación SST" subtitulo="SST · Programación, asistencia y evaluación"
          color={SST_COLOR} accion="Programar capacitación" onAccion={() => setDlg({ abierto: true, r: null })} />
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta={`Cumplimiento del plan ${anio}`} valor={delAnio.length ? `${((completadas.length / delAnio.length) * 100).toFixed(0)}%` : '—'} color={SST_COLOR} sub={`${completadas.length} de ${delAnio.length}`} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta={`Asistentes ${anio}`} valor={completadas.reduce((s, c) => s + (c.participantes || 0), 0)} color="#0369A1" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta={`Horas de formación ${anio}`} valor={completadas.reduce((s, c) => s + (c.duracion_horas || 0), 0)} color="#7C3AED" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Evaluación promedio" valor={evaluadas.length ? (evaluadas.reduce((s, c) => s + (c.evaluacion_prom ?? 0), 0) / evaluadas.length).toFixed(1) : '—'} color="#D97706" sub="Sobre 5" /></Grid>
        </Grid>
        <TextField select size="small" label="Estado" value={filtro} onChange={e => setFiltro(e.target.value)} sx={{ minWidth: 170, mb: 2 }}>
          <MenuItem value="">Todos</MenuItem>{ESTADOS.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
        </TextField>
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
          {crud.isLoading && <LinearProgress />}
          <Table size="small">
            <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12 } }}>
              <TableCell>Código</TableCell><TableCell>Tema</TableCell><TableCell>Tipo</TableCell><TableCell>Fecha</TableCell>
              <TableCell>Instructor</TableCell><TableCell align="right">Asistencia</TableCell><TableCell align="right">Eval.</TableCell><TableCell>Estado</TableCell><TableCell />
            </TableRow></TableHead>
            <TableBody>
              {!crud.isLoading && visibles.length === 0 && <TableRow><TableCell colSpan={9} align="center" sx={{ py: 3, color: 'text.secondary' }}>Sin capacitaciones</TableCell></TableRow>}
              {visibles.map(c => (
                <TableRow key={c.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{c.codigo}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}><b>{c.titulo}</b>{c.area_dirigida && <Box sx={{ color: 'text.secondary', fontSize: 11 }}>{c.area_dirigida}</Box>}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{TIPOS.find(t => t[0] === c.tipo)?.[1] ?? '—'}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{fmtFecha(c.fecha_inicio)}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{c.instructor ?? '—'}</TableCell>
                  <TableCell align="right" sx={{ fontSize: 12 }}>{c.participantes}{c.max_participantes ? ` / ${c.max_participantes}` : ''}</TableCell>
                  <TableCell align="right" sx={{ fontSize: 12 }}>{c.evaluacion_prom ?? '—'}</TableCell>
                  <TableCell><Chip size="small" label={ESTADOS.find(e => e[0] === c.estado)?.[1] ?? c.estado} sx={{ fontSize: 11, fontWeight: 700, bgcolor: alpha(COLOR_EST[c.estado] ?? '#6B7280', 0.12), color: COLOR_EST[c.estado] ?? '#6B7280' }} /></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="Editar / registrar asistencia"><IconButton size="small" aria-label={`Editar ${c.codigo}`} onClick={() => setDlg({ abierto: true, r: c })}><Edit fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Retirar"><IconButton size="small" aria-label={`Retirar ${c.codigo}`} onClick={() => { if (window.confirm(`¿Retirar ${c.codigo}?`)) crud.retirar.mutate(c.id) }}><DeleteForever fontSize="small" sx={{ color: '#DC2626' }} /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? `Capacitación ${dlg.r.codigo}` : 'Programar capacitación'} campos={CAMPOS} registro={dlg.r}
          valoresIniciales={{ estado: 'PROGRAMADA', participantes: '0', modalidad: 'PRESENCIAL' }}
          onGuardar={c => crud.guardar(dlg.r, { ...c, participantes: c.participantes ?? 0 })} onCerrar={() => setDlg({ abierto: false, r: null })} />
      </Box>
    </Layout>
  )
}
