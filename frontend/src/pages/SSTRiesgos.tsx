/**
 * SST · Matriz de peligros y riesgos (GTC 45)
 *
 * Era una maqueta con una escala inventada de 1 a 10 y el nivel escogido a
 * mano: P6×I9 decía «alto» y P6×I5 «medio», sin regla que los uniera.
 *
 * Ahora se valora como pide la GTC 45: nivel de deficiencia × exposición da la
 * probabilidad; por la consecuencia da el nivel de riesgo, que se interpreta
 * de I (no aceptable) a IV (aceptable). El servidor lo calcula; aquí se
 * muestra mientras se llena el formulario para que quien valora vea el efecto.
 */
import { useState } from 'react'
import {
  Box, Chip, Table, TableBody, TableCell, TableHead, TableRow, Paper, IconButton, Tooltip,
  LinearProgress, Typography, alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Warning, Edit, DeleteForever } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import { sstApi, type Riesgo } from '@/api/sst'
import { FormularioRegistro, useCrud, Encabezado, fmtFecha, type Campo } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const SST_COLOR = COLOR_MODULO
const CLASES: [string, string][] = [['FISICO', 'Físico'], ['QUIMICO', 'Químico'], ['BIOLOGICO', 'Biológico'], ['BIOMECANICO', 'Biomecánico'],
  ['PSICOSOCIAL', 'Psicosocial'], ['SEGURIDAD', 'Condiciones de seguridad'], ['FENOMENOS_NATURALES', 'Fenómenos naturales'], ['PUBLICO', 'Público']]
// Valores de la GTC 45.
const ND: [number, string][] = [[10, '10 · Muy alto'], [6, '6 · Alto'], [2, '2 · Medio'], [0, '0 · Bajo']]
const NE: [number, string][] = [[4, '4 · Continua'], [3, '3 · Frecuente'], [2, '2 · Ocasional'], [1, '1 · Esporádica']]
const NC: [number, string][] = [[100, '100 · Mortal o catastrófico'], [60, '60 · Muy grave'], [25, '25 · Grave'], [10, '10 · Leve']]
const INTERP: Record<string, { c: string; l: string }> = {
  I: { c: '#991B1B', l: 'I · No aceptable' }, II: { c: '#DC2626', l: 'II · No aceptable o con control específico' },
  III: { c: '#D97706', l: 'III · Mejorable' }, IV: { c: '#15803D', l: 'IV · Aceptable' },
}

/** El mismo cálculo del servidor, solo para la vista previa del formulario. */
function gtc45(nd: number, ne: number, nc: number) {
  const nr = nd * ne * nc
  return { np: nd * ne, nr, interp: nr >= 600 ? 'I' : nr >= 150 ? 'II' : nr >= 40 ? 'III' : 'IV' }
}

const CAMPOS: Campo[] = [
  { clave: 'proceso', etiqueta: 'Proceso', obligatorio: true, ancho: 6 },
  { clave: 'area', etiqueta: 'Área / zona', ancho: 6 },
  { clave: 'actividad', etiqueta: 'Actividad o tarea', obligatorio: true },
  { clave: 'clase_peligro', etiqueta: 'Clase de peligro', tipo: 'seleccion', opciones: CLASES, obligatorio: true, ancho: 6 },
  { clave: 'expuestos', etiqueta: 'Trabajadores expuestos', tipo: 'numero', min: 0, ancho: 6 },
  { clave: 'descripcion_peligro', etiqueta: 'Descripción del peligro', tipo: 'area' },
  { clave: 'efecto_posible', etiqueta: 'Efectos posibles', tipo: 'area' },
  { clave: 'nivel_deficiencia', etiqueta: 'Nivel de deficiencia (ND)', tipo: 'seleccion', opciones: ND, obligatorio: true, ancho: 4 },
  { clave: 'nivel_exposicion', etiqueta: 'Nivel de exposición (NE)', tipo: 'seleccion', opciones: NE, obligatorio: true, ancho: 4 },
  { clave: 'nivel_consecuencia', etiqueta: 'Nivel de consecuencia (NC)', tipo: 'seleccion', opciones: NC, obligatorio: true, ancho: 4 },
  { clave: 'controles_existentes', etiqueta: 'Controles existentes', tipo: 'area' },
  { clave: 'controles_propuestos', etiqueta: 'Medidas de intervención propuestas', tipo: 'area' },
  { clave: 'responsable', etiqueta: 'Responsable', ancho: 6 },
  { clave: 'fecha_revision', etiqueta: 'Próxima revisión', tipo: 'fecha', ancho: 6 },
]

export default function SSTRiesgos() {
  const crud = useCrud(['sst-riesgos'], sstApi.riesgos, 'Riesgo', [['sst-tablero']])
  const [dlg, setDlg] = useState<{ abierto: boolean; r: Riesgo | null }>({ abierto: false, r: null })
  const [filtro, setFiltro] = useState('')
  const lista = crud.datos
  const visibles = filtro ? lista.filter(r => r.interpretacion === filtro) : lista

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Warning sx={{ fontSize: 28 }} />} titulo="Matriz de peligros y riesgos" subtitulo="SST · Identificación y valoración según la GTC 45"
          color={SST_COLOR} accion="Nuevo peligro" onAccion={() => setDlg({ abierto: true, r: null })} />

        <Grid container spacing={2} mb={3}>
          {Object.entries(INTERP).map(([k, v]) => {
            const n = lista.filter(r => r.interpretacion === k).length
            const activo = filtro === k
            return (
              <Grid key={k} size={{ xs: 6, md: 3 }}>
                <Paper role="button" aria-label={`Filtrar nivel ${k}`} onClick={() => setFiltro(activo ? '' : k)} elevation={0}
                  sx={{ p: 2, borderRadius: 2, cursor: 'pointer', border: `1px solid ${alpha(v.c, activo ? 0.8 : 0.25)}`, bgcolor: activo ? alpha(v.c, 0.08) : 'transparent' }}>
                  <Typography sx={{ fontSize: 24, fontWeight: 800, color: v.c }}>{n}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{v.l}</Typography>
                </Paper>
              </Grid>
            )
          })}
        </Grid>

        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
          {crud.isLoading && <LinearProgress />}
          <Table size="small">
            <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12 } }}>
              <TableCell>Código</TableCell><TableCell>Proceso / actividad</TableCell><TableCell>Peligro</TableCell>
              <TableCell align="center">ND×NE×NC</TableCell><TableCell align="right">NR</TableCell><TableCell>Nivel</TableCell>
              <TableCell>Controles</TableCell><TableCell>Revisión</TableCell><TableCell />
            </TableRow></TableHead>
            <TableBody>
              {!crud.isLoading && visibles.length === 0 && <TableRow><TableCell colSpan={9} align="center" sx={{ py: 3, color: 'text.secondary' }}>Sin peligros identificados</TableCell></TableRow>}
              {visibles.map(r => {
                const i = r.interpretacion ? INTERP[r.interpretacion] : null
                return (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{r.codigo}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}><b>{r.proceso ?? '—'}</b><Typography fontSize={11} color="text.secondary">{r.actividad}</Typography></TableCell>
                    <TableCell sx={{ fontSize: 12, maxWidth: 240 }}>{CLASES.find(c => c[0] === r.clase_peligro)?.[1] ?? '—'}
                      <Typography fontSize={11} color="text.secondary">{r.descripcion_peligro}</Typography></TableCell>
                    <TableCell align="center" sx={{ fontSize: 12 }}>{r.nivel_riesgo_valor != null ? `${r.nivel_deficiencia}×${r.nivel_exposicion}×${r.nivel_consecuencia}` : 'Sin valorar'}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700 }}>{r.nivel_riesgo_valor ?? '—'}</TableCell>
                    <TableCell>{i ? <Chip size="small" label={r.interpretacion} sx={{ fontWeight: 800, bgcolor: alpha(i.c, 0.12), color: i.c }} /> : '—'}</TableCell>
                    <TableCell sx={{ fontSize: 11, maxWidth: 220 }}>{r.controles_propuestos || r.controles_existentes || '—'}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{fmtFecha(r.fecha_revision)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      <Tooltip title="Editar"><IconButton size="small" aria-label={`Editar ${r.codigo}`} onClick={() => setDlg({ abierto: true, r })}><Edit fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Retirar"><IconButton size="small" aria-label={`Retirar ${r.codigo}`} onClick={() => { if (window.confirm(`¿Retirar ${r.codigo}?`)) crud.retirar.mutate(r.id) }}><DeleteForever fontSize="small" sx={{ color: '#DC2626' }} /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Paper>

        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? `Peligro ${dlg.r.codigo}` : 'Nuevo peligro'} campos={CAMPOS} registro={dlg.r}
          onGuardar={c => crud.guardar(dlg.r, c)} onCerrar={() => setDlg({ abierto: false, r: null })}
          pie={f => {
            if (f.nivel_deficiencia === '' || f.nivel_exposicion === '' || f.nivel_consecuencia === '' || f.nivel_deficiencia == null) return null
            const g = gtc45(Number(f.nivel_deficiencia), Number(f.nivel_exposicion), Number(f.nivel_consecuencia))
            const i = INTERP[g.interp]
            return (
              <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: alpha(i.c, 0.08), border: `1px solid ${alpha(i.c, 0.3)}` }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: i.c }}>NP {g.np} · NR {g.nr} → {i.l}</Typography>
              </Paper>
            )
          }} />
      </Box>
    </Layout>
  )
}
