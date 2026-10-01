/**
 * Piezas compartidas por las pantallas de GRC.
 *
 * - `usePersonasGRC`: usuarios con acceso al módulo, los únicos asignables.
 * - `useReferencias`: otros registros GRC como opciones de un desplegable.
 * - `useEscala`: los niveles 1–5 con el nombre que les dio la empresa.
 * - `FichaGRC`: la vista de un registro con todo lo que tiene alrededor
 *   (relacionados, vínculos, evidencias con archivo e historial), como la
 *   vista 360 de un activo en mantenimiento.
 * - `MatrizCalor`: probabilidad × impacto con las bandas configuradas.
 */
import React, { useMemo, useRef, useState } from 'react'
import {
  Box, Typography, Drawer, IconButton, Divider, Chip, Button, Tooltip, Paper, alpha, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Autocomplete, LinearProgress,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Close, Link as LinkIcon, LinkOff, UploadFile, Download, OpenInNew, History } from '@mui/icons-material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { grc, type Registro } from '@/api/grc'
import { errorApi, fmtFecha, Etiqueta, legible } from '@/components/comun/Registro'
import { CatalogoAuto } from '@/components/catalogo/CatalogoAuto'
import {
  PRIORIDAD_COLOR, EFECTIVIDAD_COLOR, HALLAZGO_COLOR, INCIDENTE_COLOR, CUMPLIMIENTO_COLOR,
  SEVERIDAD_COLOR, POLITICA_COLOR, AUDITORIA_COLOR, KRI_COLOR, ESTADO_PLAN, CAT,
} from './etiquetas'
import { COLOR_MODULO } from '@/config/marca'

export const GRC_COLOR = COLOR_MODULO

export function usePersonasGRC() {
  const q = useQuery({ queryKey: ['grc', 'personas'], queryFn: grc.personas, staleTime: 5 * 60 * 1000 })
  return q.data ?? []
}

const RUTAS: Record<string, keyof typeof grc> = {
  riesgo: 'riesgos', control: 'controles', politica: 'politicas', obligacion: 'obligaciones',
  auditoria: 'auditorias', hallazgo: 'hallazgos', incidente: 'incidentes', continuidad: 'continuidad',
  tercero: 'terceros', comite: 'comites',
}
export const NOMBRE_TIPO: Record<string, string> = {
  riesgo: 'Riesgo', control: 'Control', politica: 'Política', obligacion: 'Obligación', auditoria: 'Auditoría',
  hallazgo: 'Hallazgo', incidente: 'Incidente', continuidad: 'Plan de continuidad', tercero: 'Tercero',
  comite: 'Comité', sesion: 'Sesión', prueba: 'Prueba', plan: 'Plan de acción', kri: 'Indicador',
}

const etiquetaDe = (r: Registro) =>
  [r.codigo, r.nombre ?? r.titulo ?? r.proceso].filter(Boolean).join(' · ')

/** Registros de otro recurso como opciones `[id, etiqueta]`. */
export function useReferencias(tipo: string, habilitado = true): [number, string][] {
  const ruta = RUTAS[tipo]
  const q = useQuery({
    queryKey: ['grc', ruta], enabled: habilitado && !!ruta,
    queryFn: () => (grc[ruta] as any).listar() as Promise<Registro[]>,
  })
  return useMemo(() => (q.data ?? []).map(r => [r.id, etiquetaDe(r)] as [number, string]), [q.data])
}

/** Niveles de probabilidad e impacto con los nombres configurados. */
export function useEscala() {
  const q = useQuery({ queryKey: ['grc', 'matriz'], queryFn: grc.matriz, staleTime: 5 * 60 * 1000 })
  const escala = q.data?.escala ?? []
  const nivel = (eje: string): [number, string][] => [1, 2, 3, 4, 5].map(v => {
    const e = escala.find((x: any) => x.eje === eje && x.valor === v)
    return [v, `${v} · ${e?.nombre ?? ''}`]
  })
  return { probabilidad: nivel('probabilidad'), impacto: nivel('impacto'), bandas: q.data?.bandas ?? [], escala }
}

export const prioridadPorBandas = (nivel: number | null | undefined, bandas: any[]) => {
  if (!nivel) return null
  const ordenadas = [...bandas].sort((a, b) => b.minimo - a.minimo)
  return ordenadas.find(b => nivel >= b.minimo)?.prioridad ?? 'baja'
}

/** Color de un estado/nivel cualquiera, buscándolo en las tablas de colores. */
export const colorDe = (v?: string | null) =>
  (v && (PRIORIDAD_COLOR[v] ?? EFECTIVIDAD_COLOR[v] ?? HALLAZGO_COLOR[v] ?? INCIDENTE_COLOR[v] ?? CUMPLIMIENTO_COLOR[v]
    ?? SEVERIDAD_COLOR[v] ?? POLITICA_COLOR[v] ?? AUDITORIA_COLOR[v] ?? KRI_COLOR[v] ?? ESTADO_PLAN[v])) || '#64748B'

export const ChipEstado = ({ v }: { v?: string | null }) => v ? <Etiqueta texto={legible(v)} color={colorDe(v)} /> : <>—</>

// ── Matriz de calor ──────────────────────────────────────────────────────────

export function MatrizCalor({ celdas, titulo, onCelda, seleccion }: {
  celdas: Record<string, number>; titulo: string
  onCelda?: (p: number, i: number) => void; seleccion?: string | null
}) {
  const { probabilidad, impacto, bandas } = useEscala()
  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
      <Typography sx={{ fontWeight: 700, fontSize: 14, mb: 1 }}>{titulo}</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '110px repeat(5, 1fr)', gap: 0.5, fontSize: 11 }}>
        {[5, 4, 3, 2, 1].map(p => (
          <React.Fragment key={p}>
            <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary', pr: 1 }}>{probabilidad[p - 1][1]}</Box>
            {[1, 2, 3, 4, 5].map(i => {
              const n = celdas[`${p}-${i}`] ?? 0
              const pr = prioridadPorBandas(p * i, bandas) ?? 'baja'
              const c = PRIORIDAD_COLOR[pr]
              const sel = seleccion === `${p}-${i}`
              return (
                <Box key={i} role={onCelda ? 'button' : undefined} aria-label={`Probabilidad ${p}, impacto ${i}: ${n} riesgos`}
                  onClick={onCelda ? () => onCelda(p, i) : undefined}
                  sx={{ height: 42, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        bgcolor: alpha(c, n ? 0.85 : 0.18), color: n ? '#fff' : alpha(c, 0.8), fontWeight: 800, fontSize: 14,
                        cursor: onCelda ? 'pointer' : 'default', outline: sel ? '3px solid #0F172A' : 'none' }}>
                  {n || ''}
                </Box>
              )
            })}
          </React.Fragment>
        ))}
        <Box />
        {impacto.map(([v, l]) => <Box key={v} sx={{ textAlign: 'center', color: 'text.secondary', pt: 0.5 }}>{l}</Box>)}
      </Box>
      <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 1 }}>Filas: probabilidad · Columnas: impacto · Colores según las bandas de Configuración</Typography>
    </Paper>
  )
}

// ── Ficha ────────────────────────────────────────────────────────────────────

/** A qué se puede vincular cada tipo (igual que el servidor). */
const VINCULABLE: Record<string, string[]> = {
  obligacion: ['control', 'politica', 'riesgo'], control: ['obligacion', 'politica'], politica: ['obligacion', 'control'],
  riesgo: ['obligacion', 'continuidad'], continuidad: ['riesgo', 'tercero'], tercero: ['continuidad'],
}

const TITULOS: Record<string, string> = {
  controles: 'Controles que lo mitigan', tratamientos: 'Tratamientos', kris: 'Indicadores (KRI)', incidentes: 'Incidentes',
  hallazgos: 'Hallazgos', pruebas: 'Pruebas', riesgos: 'Riesgos', evaluaciones: 'Evaluaciones', planes: 'Planes de acción',
  sesiones: 'Sesiones', simulacros: 'Simulacros',
}

function FilaRelacionada({ r }: { r: any }) {
  const estado = r.estado ?? r.efectividad ?? r.resultado ?? r.prioridad
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, borderBottom: '1px solid #F1F5F9' }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 600 }} noWrap>{[r.codigo, r.nombre].filter(Boolean).join(' · ')}</Typography>
        <Typography sx={{ fontSize: 11, color: 'text.secondary' }} noWrap>
          {[r.responsable_nombre, r.fecha ? fmtFecha(r.fecha) : null, r.fecha_limite ? `límite ${fmtFecha(r.fecha_limite)}` : null,
            r.fecha_objetivo ? `objetivo ${fmtFecha(r.fecha_objetivo)}` : null, r.avance != null ? `${r.avance}%` : null,
            r.nivel_residual != null ? `nivel ${r.nivel_residual}` : null, r.puntaje_total != null ? `puntaje ${r.puntaje_total}` : null]
            .filter(Boolean).join(' · ')}
        </Typography>
      </Box>
      {estado && <ChipEstado v={String(estado)} />}
    </Box>
  )
}

function Vincular({ tipo, id, onListo }: { tipo: string; id: number; onListo: () => void }) {
  const opciones = VINCULABLE[tipo] ?? []
  const [abierto, setAbierto] = useState(false)
  const [destino, setDestino] = useState(opciones[0] ?? '')
  const [sel, setSel] = useState<[number, string] | null>(null)
  const refs = useReferencias(destino, abierto && !!destino)
  if (!opciones.length) return null
  const guardar = async () => {
    try {
      await grc.vincular({ origen_tipo: tipo, origen_id: id, destino_tipo: destino, destino_id: sel![0] })
      toast.success('Vinculado'); setAbierto(false); setSel(null); onListo()
    } catch (e) { toast.error(errorApi(e, 'No se pudo vincular')) }
  }
  return (
    <>
      <Button size="small" startIcon={<LinkIcon />} onClick={() => setAbierto(true)}>Vincular</Button>
      <Dialog open={abierto} onClose={() => setAbierto(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Vincular con…</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <TextField select size="small" label="Tipo de registro" value={destino} onChange={e => { setDestino(e.target.value); setSel(null) }}>
            {opciones.map(o => <MenuItem key={o} value={o}>{NOMBRE_TIPO[o]}</MenuItem>)}
          </TextField>
          <Autocomplete size="small" options={refs} value={sel} onChange={(_, v) => setSel(v)}
            getOptionLabel={o => o[1]} isOptionEqualToValue={(a, b) => a[0] === b[0]}
            renderInput={p => <TextField {...p} label={NOMBRE_TIPO[destino] ?? 'Registro'} />} />
        </DialogContent>
        <DialogActions><Button onClick={() => setAbierto(false)} color="inherit">Cancelar</Button>
          <Button variant="contained" disabled={!sel} onClick={guardar}>Vincular</Button></DialogActions>
      </Dialog>
    </>
  )
}

function SubirEvidencia({ tipo, id, onListo }: { tipo: string; id: number; onListo: () => void }) {
  const [abierto, setAbierto] = useState(false)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [tipoEv, setTipoEv] = useState<string | null>(null)
  const [vence, setVence] = useState('')
  const [subiendo, setSubiendo] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const subir = async () => {
    const fd = new FormData()
    fd.append('referencia_tipo', tipo); fd.append('referencia_id', String(id)); fd.append('archivo', archivo!)
    if (tipoEv) fd.append('tipo', tipoEv)
    if (vence) fd.append('fecha_vencimiento', vence)
    setSubiendo(true)
    try { await grc.subirEvidencia(fd); toast.success('Evidencia cargada'); setAbierto(false); setArchivo(null); onListo() }
    catch (e) { toast.error(errorApi(e, 'No se pudo subir')) }
    finally { setSubiendo(false) }
  }
  return (
    <>
      <Button size="small" startIcon={<UploadFile />} onClick={() => setAbierto(true)}>Adjuntar</Button>
      <Dialog open={abierto} onClose={() => setAbierto(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Adjuntar evidencia</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <input ref={input} type="file" hidden onChange={e => setArchivo(e.target.files?.[0] ?? null)} />
          <Button variant="outlined" onClick={() => input.current?.click()}>{archivo ? archivo.name : 'Elegir archivo'}</Button>
          <CatalogoAuto {...CAT.tipoEvidencia} label="Tipo de evidencia" valor={tipoEv} onChange={setTipoEv} />
          <TextField size="small" type="date" label="Vence" InputLabelProps={{ shrink: true }} value={vence}
            onChange={e => setVence(e.target.value)} helperText="Opcional: certificados, pólizas, licencias…" />
        </DialogContent>
        <DialogActions><Button onClick={() => setAbierto(false)} color="inherit">Cancelar</Button>
          <Button variant="contained" disabled={!archivo || subiendo} onClick={subir}>{subiendo ? 'Subiendo…' : 'Subir'}</Button></DialogActions>
      </Dialog>
    </>
  )
}

export function FichaGRC({ tipo, id, onCerrar, resumen, acciones, children, ocultar = [] }: {
  tipo: string; id: number | null; onCerrar: () => void
  /** Listas de relacionados que la página ya muestra en un panel propio. */
  ocultar?: string[]
  /** Pares etiqueta-valor para la cabecera, a partir del registro. */
  resumen?: (r: any) => [string, React.ReactNode][]
  /** Botones propios del tipo (aprobar, generar hallazgo…). */
  acciones?: (r: any, refrescar: () => void) => React.ReactNode
  /** Paneles propios del tipo (controles del riesgo, mediciones del KRI…). */
  children?: (r: any, refrescar: () => void) => React.ReactNode
}) {
  const qc = useQueryClient()
  const clave = ['grc', 'ficha', tipo, id]
  const q = useQuery({ queryKey: clave, queryFn: () => grc.ficha(tipo, id!), enabled: id != null })
  const [tab, setTab] = useState(0)
  const refrescar = () => { qc.invalidateQueries({ queryKey: ['grc'] }) }
  const r = q.data?.registro
  const rel = q.data?.relacionados ?? {}
  const listas = Object.entries(rel).filter(([k]) => !['vinculos', 'evidencias', ...ocultar].includes(k)) as [string, any[]][]

  return (
    // El tema pinta oscuro el papel de los Drawer (lo usa el menú lateral): la
    // ficha es contenido, así que va clara y con el color de texto normal.
    <Drawer anchor="right" open={id != null} onClose={onCerrar}
      PaperProps={{ sx: { bgcolor: '#fff', color: 'text.primary', backgroundImage: 'none' } }}>
      <Box sx={{ width: { xs: '100vw', sm: 620 }, p: 3 }}>
        {q.isLoading && <LinearProgress />}
        {r && <>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{NOMBRE_TIPO[tipo]} {r.codigo ? `· ${r.codigo}` : ''}</Typography>
              <Typography sx={{ fontWeight: 800, fontSize: 18, lineHeight: 1.25 }}>{r.nombre ?? r.titulo ?? r.proceso}</Typography>
            </Box>
            <IconButton aria-label="Cerrar ficha" onClick={onCerrar}><Close /></IconButton>
          </Box>
          {acciones && <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1.5 }}>{acciones(r, refrescar)}</Box>}
          {resumen && (
            <Grid container spacing={1.5} sx={{ mt: 1 }}>
              {resumen(r).map(([k, v]) => (
                <Grid key={k} size={{ xs: 6, sm: 4 }}>
                  <Typography sx={{ fontSize: 10.5, color: 'text.secondary', textTransform: 'uppercase', fontWeight: 700 }}>{k}</Typography>
                  <Box sx={{ fontSize: 13 }}>{v ?? '—'}</Box>
                </Grid>
              ))}
            </Grid>
          )}
          <Divider sx={{ my: 2 }} />
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ mb: 1.5 }}>
            <Tab label="Relacionados" /><Tab label={`Evidencias (${rel.evidencias?.length ?? 0})`} /><Tab label="Historial" />
          </Tabs>
          {tab === 0 && <>
            {children?.(r, refrescar)}
            {listas.filter(([, v]) => v.length).map(([k, v]) => (
              <Box key={k} sx={{ mb: 2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 0.5 }}>{TITULOS[k] ?? legible(k)} ({v.length})</Typography>
                {v.map((x: any) => <FilaRelacionada key={x.id ?? x.control_id} r={x} />)}
              </Box>
            ))}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 13 }}>Vínculos ({rel.vinculos?.length ?? 0})</Typography>
              <Vincular tipo={tipo} id={r.id} onListo={refrescar} />
            </Box>
            {(rel.vinculos ?? []).map((v: any) => (
              <Box key={v.vinculo_id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, borderBottom: '1px solid #F1F5F9' }}>
                <Chip size="small" label={NOMBRE_TIPO[v.tipo] ?? v.tipo} sx={{ fontSize: 10.5 }} />
                <Typography sx={{ fontSize: 12.5, flex: 1 }} noWrap>{[v.codigo, v.nombre].filter(Boolean).join(' · ')}</Typography>
                <Tooltip title="Quitar vínculo"><IconButton size="small" aria-label={`Desvincular ${v.nombre}`}
                  onClick={async () => { await grc.desvincular(v.vinculo_id); refrescar() }}><LinkOff fontSize="small" /></IconButton></Tooltip>
              </Box>
            ))}
            {!listas.some(([, v]) => v.length) && !(rel.vinculos ?? []).length && !children &&
              <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Sin registros relacionados todavía.</Typography>}
          </>}
          {tab === 1 && <>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}><SubirEvidencia tipo={tipo} id={r.id} onListo={refrescar} /></Box>
            {(rel.evidencias ?? []).length === 0 && <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Sin evidencias adjuntas.</Typography>}
            {(rel.evidencias ?? []).map((e: any) => (
              <Box key={e.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, borderBottom: '1px solid #F1F5F9' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600 }} noWrap>{e.nombre}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                    {[e.tipo, e.responsable_nombre, e.fecha_vencimiento ? `vence ${fmtFecha(e.fecha_vencimiento)}` : null].filter(Boolean).join(' · ')}
                  </Typography>
                </Box>
                {e.archivo && <IconButton size="small" aria-label={`Descargar ${e.nombre}`} onClick={() => grc.descargarEvidencia(e.id, e.nombre)}><Download fontSize="small" /></IconButton>}
                {e.url && <IconButton size="small" aria-label={`Abrir ${e.nombre}`} href={e.url} target="_blank"><OpenInNew fontSize="small" /></IconButton>}
              </Box>
            ))}
          </>}
          {tab === 2 && <>
            {(q.data?.historial ?? []).length === 0 && <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Sin cambios registrados.</Typography>}
            {(q.data?.historial ?? []).map((h: any, i: number) => (
              <Box key={i} sx={{ display: 'flex', gap: 1.5, py: 0.75, borderBottom: '1px solid #F1F5F9' }}>
                <History sx={{ fontSize: 16, color: 'text.disabled', mt: 0.3 }} />
                <Box>
                  <Typography sx={{ fontSize: 12.5 }}>
                    <b>{legible(h.accion)}</b>{h.campo ? ` · ${h.campo}` : ''}
                    {(h.anterior || h.nuevo) && <> : {h.anterior ?? '∅'} → {h.nuevo ?? '∅'}</>}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{h.usuario ?? 'Sistema'} · {new Date(h.fecha).toLocaleString('es-CO')}</Typography>
                </Box>
              </Box>
            ))}
          </>}
        </>}
      </Box>
    </Drawer>
  )
}
