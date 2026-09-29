/**
 * Piezas para pantallas de registro: formulario declarativo, CRUD con avisos,
 * cifra de encabezado y título de página.
 *
 * Nacen del desmaquetado de SST: diez pantallas con el mismo patrón —una lista,
 * un «Nuevo», editar y retirar— que en la maqueta repetían cada una su propio
 * formulario a mano, y varias con un «Guardar» que no guardaba. Declarar los
 * campos una vez y dejar que el formulario haga la conversión (vacío → nulo,
 * texto → número) quita la clase de error más común de esas pantallas.
 */
import React, { useState } from 'react'
import {
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, FormControlLabel, Switch, Paper, alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Add } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'

export type TipoCampo = 'texto' | 'area' | 'numero' | 'fecha' | 'seleccion' | 'interruptor'

export interface Campo {
  clave: string
  etiqueta: string
  tipo?: TipoCampo
  opciones?: [string | number, string][]
  obligatorio?: boolean
  ancho?: 12 | 8 | 6 | 4 | 3
  ayuda?: string
  min?: number
  max?: number
  /** Si devuelve texto, el campo muestra ese error y no deja guardar. */
  validar?: (v: any, todos: Record<string, any>) => string | null
}

export const errorApi = (e: any, porDefecto = 'No se pudo guardar') => {
  const d = e?.response?.data?.detail
  return typeof d === 'string' ? d : Array.isArray(d) ? 'Revisa los datos del formulario' : porDefecto
}

/** Del registro al formulario: todo como texto para los TextField. */
const aFormulario = (campos: Campo[], r?: Record<string, any> | null) =>
  Object.fromEntries(campos.map(c => {
    const v = r?.[c.clave]
    if (c.tipo === 'interruptor') return [c.clave, !!v]
    if (v == null) return [c.clave, '']
    if (c.tipo === 'fecha') return [c.clave, String(v).slice(0, 10)]
    return [c.clave, String(v)]
  }))

/** Del formulario a la API: vacío → nulo, números como números. */
const aCuerpo = (campos: Campo[], f: Record<string, any>) =>
  Object.fromEntries(campos.map(c => {
    const v = f[c.clave]
    if (c.tipo === 'interruptor') return [c.clave, !!v]
    if (typeof v === 'string' && v.trim() === '') return [c.clave, null]
    if (c.tipo === 'numero') return [c.clave, Number(v)]
    if (c.tipo === 'seleccion' && c.opciones?.length && typeof c.opciones[0][0] === 'number') return [c.clave, Number(v)]
    return [c.clave, typeof v === 'string' ? v.trim() : v]
  }))

export function FormularioRegistro({ abierto, titulo, campos, registro, valoresIniciales, onGuardar, onCerrar, pie }: {
  abierto: boolean; titulo: string; campos: Campo[]
  registro?: Record<string, any> | null
  valoresIniciales?: Record<string, any>
  onGuardar: (cuerpo: Record<string, any>) => Promise<unknown>
  onCerrar: () => void
  /** Algo que mostrar debajo de los campos, calculado de lo que se escribe. */
  pie?: (valores: Record<string, any>) => React.ReactNode
}) {
  const [f, setF] = useState<Record<string, any>>({})
  const [guardando, setGuardando] = useState(false)
  const [abiertoAntes, setAbiertoAntes] = useState(false)
  if (abierto && !abiertoAntes) {
    setAbiertoAntes(true)
    setF({ ...aFormulario(campos, registro), ...(registro ? {} : valoresIniciales ?? {}) })
  }
  if (!abierto && abiertoAntes) setAbiertoAntes(false)

  const error = (c: Campo): string | null => {
    const v = f[c.clave]
    const vacio = v === '' || v == null
    if (c.obligatorio && vacio && c.tipo !== 'interruptor') return 'Obligatorio'
    if (c.tipo === 'numero' && !vacio) {
      const n = Number(v)
      if (!Number.isFinite(n)) return 'Debe ser un número'
      if (c.min != null && n < c.min) return `Mínimo ${c.min}`
      if (c.max != null && n > c.max) return `Máximo ${c.max}`
    }
    return c.validar ? c.validar(v, f) : null
  }
  const hayError = campos.some(c => error(c))

  const guardar = async () => {
    setGuardando(true)
    try { await onGuardar(aCuerpo(campos, f)); onCerrar() }
    catch (e) { toast.error(errorApi(e)) }
    finally { setGuardando(false) }
  }

  return (
    <Dialog open={abierto} onClose={onCerrar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>{titulo}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ pt: 1 }}>
          {campos.map(c => {
            const err = error(c)
            // Solo se muestra el «Obligatorio» cuando el campo ya se tocó o
            // tiene algo: un formulario nuevo no debe abrir todo en rojo.
            const mostrar = err && !(err === 'Obligatorio' && f[`_${c.clave}`] !== true)
            const comun = {
              label: c.etiqueta, fullWidth: true, size: 'small' as const, required: c.obligatorio,
              value: f[c.clave] ?? '', error: !!mostrar, helperText: mostrar ? err : c.ayuda,
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [c.clave]: e.target.value, [`_${c.clave}`]: true }),
            }
            return (
              <Grid key={c.clave} size={{ xs: 12, sm: c.ancho ?? 12 }}>
                {c.tipo === 'interruptor' ? (
                  <FormControlLabel label={c.etiqueta}
                    control={<Switch checked={!!f[c.clave]} onChange={e => setF({ ...f, [c.clave]: e.target.checked })} />} />
                ) : c.tipo === 'seleccion' ? (
                  <TextField select {...comun}>
                    {!c.obligatorio && <MenuItem value=""><em>—</em></MenuItem>}
                    {c.opciones?.map(([v, l]) => <MenuItem key={String(v)} value={String(v)}>{l}</MenuItem>)}
                  </TextField>
                ) : (
                  <TextField {...comun}
                    type={c.tipo === 'numero' ? 'number' : c.tipo === 'fecha' ? 'date' : 'text'}
                    multiline={c.tipo === 'area'} minRows={c.tipo === 'area' ? 2 : undefined}
                    InputLabelProps={c.tipo === 'fecha' ? { shrink: true } : undefined}
                    inputProps={c.tipo === 'numero' ? { min: c.min, max: c.max } : undefined} />
                )}
              </Grid>
            )
          })}
        </Grid>
        {pie && <Box mt={2}>{pie(f)}</Box>}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCerrar} color="inherit">Cancelar</Button>
        <Button variant="contained" disabled={hayError || guardando} onClick={guardar}>Guardar</Button>
      </DialogActions>
    </Dialog>
  )
}

/** Lista y mutaciones de un recurso con la forma listar/crear/editar/retirar. */
export function useCrud<T extends { id: number }>(clave: unknown[], api: {
  listar: (p?: any) => Promise<T[]>
  crear: (d: any) => Promise<T>
  editar: (id: number, d: any) => Promise<T>
  retirar: (id: number) => Promise<unknown>
}, nombre: string, invalidarTambien: unknown[][] = [], femenino = false) {
  const o = femenino ? 'a' : 'o'
  const qc = useQueryClient()
  const lista = useQuery({ queryKey: clave, queryFn: () => api.listar() })
  const refrescar = () => { qc.invalidateQueries({ queryKey: clave }); invalidarTambien.forEach(k => qc.invalidateQueries({ queryKey: k })) }
  const guardar = async (registro: T | null, cuerpo: any) => {
    const r = registro ? await api.editar(registro.id, cuerpo) : await api.crear(cuerpo)
    toast.success(registro ? `${nombre} actualizad${o}` : `${nombre} registrad${o}`)
    refrescar()
    return r
  }
  const retirar = useMutation({
    mutationFn: (id: number) => api.retirar(id),
    onSuccess: () => { toast.success(`${nombre} retirad${o}`); refrescar() },
    onError: (e: any) => toast.error(errorApi(e, 'No se pudo retirar')),
  })
  return { ...lista, datos: lista.data ?? [], guardar, retirar, refrescar }
}

export function Cifra({ etiqueta, valor, color, sub }: { etiqueta: string; valor: React.ReactNode; color: string; sub?: string }) {
  return (
    <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: `1px solid ${alpha(color, 0.25)}`, height: '100%' }}>
      <Typography sx={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1.1 }}>{valor}</Typography>
      <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>{etiqueta}</Typography>
      {sub && <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{sub}</Typography>}
    </Paper>
  )
}

export function Encabezado({ icono, titulo, subtitulo, color, accion, onAccion }: {
  icono: React.ReactNode; titulo: string; subtitulo: string; color: string
  accion?: string; onAccion?: () => void
}) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, gap: 2, flexWrap: 'wrap' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ color, display: 'flex' }}>{icono}</Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1 }}>{titulo}</Typography>
          <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{subtitulo}</Typography>
        </Box>
      </Box>
      {accion && <Button variant="contained" startIcon={<Add />} onClick={onAccion} sx={{ bgcolor: color, '&:hover': { bgcolor: color, filter: 'brightness(0.9)' } }}>{accion}</Button>}
    </Box>
  )
}

export const fmtFecha = (s?: string | null) => (s ? new Date(`${s.slice(0, 10)}T12:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
