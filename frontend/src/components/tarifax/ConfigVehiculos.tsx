/**
 * Equivalencias de tipo de vehículo: cómo nombra la empresa (o sus clientes)
 * cada vehículo y qué configuración SICETAC le corresponde.
 *
 * Es UNA configuración para toda la plataforma: la usan el motor de tarifas y
 * el comparativo SICETAC vs tarifa del cliente. Cambiarla en uno cambia el otro.
 */
import React, { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, LinearProgress, Stack, Typography, Box, TextField,
  Autocomplete, Tooltip, IconButton, Button,
} from '@mui/material'
import { DirectionsCar, DeleteOutline, Add as AddIcon, AutoFixHigh } from '@mui/icons-material'
import toast from 'react-hot-toast'
import { apiClient } from '@/api/client'
import { COLOR_MODULO } from '@/config/marca'

const TX_COLOR = COLOR_MODULO
const TX_DARK = COLOR_MODULO

interface MapeoRow { interna: string; sicetac: string }

// Equivalencias tipicas del transporte de carga en Colombia (punto de partida
// editable). La izquierda es como suele nombrarlas la empresa; la derecha, el
// codigo SICETAC. El usuario las ajusta antes de guardar.
export const EQUIVALENCIAS_SUGERIDAS: MapeoRow[] = [
  { interna: 'TURBO', sicetac: '2L3 Liviano entre 7.5 y 8 Tonel.' },
  { interna: 'SENCILLO', sicetac: '2' },
  { interna: 'CAMION', sicetac: '2' },
  { interna: 'DOBLETROQUE', sicetac: '3' },
  { interna: 'PATINETA', sicetac: '2S2' },
  { interna: 'TRACTOCAMION', sicetac: '3S2' },
  { interna: 'TRACTOMULA', sicetac: '3S3' },
  { interna: 'MULA', sicetac: '3S3' },
]

// ─── Configuración de mapeo de tipologías de vehículo (interna ↔ SICETAC) ─────
export function ConfigVehiculos({ open, onClose, onGuardado, nota }: {
  open: boolean; onClose: () => void
  /** Después de guardar (el comparativo SICETAC recalcula su cruce acá). */
  onGuardado?: () => void | Promise<void>
  /** Aviso adicional bajo la explicación. */
  nota?: React.ReactNode
}) {
  const [rows, setRows] = useState<MapeoRow[]>([])
  const [tipos, setTipos] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  React.useEffect(() => {
    if (!open) return
    setLoading(true)
    Promise.all([
      apiClient.get<Record<string, string>>('/tarifax/mapeo-vehiculos'),
      apiClient.get<string[]>('/tarifax/tipos-sicetac'),
    ]).then(([m, t]) => {
      const dict = (m.data || {}) as Record<string, string>
      const entries = Object.entries(dict)
      setRows(entries.length ? entries.map(([interna, sicetac]) => ({ interna, sicetac: String(sicetac) })) : [{ interna: '', sicetac: '' }])
      setTipos(t.data || [])
    }).catch(() => toast.error('No se pudo cargar la configuración'))
      .finally(() => setLoading(false))
  }, [open])

  const setRow = (i: number, patch: Partial<MapeoRow>) => setRows(rs => rs.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  const addRow = () => setRows(rs => [...rs, { interna: '', sicetac: '' }])
  const delRow = (i: number) => setRows(rs => rs.filter((_, idx) => idx !== i))

  // Precarga las equivalencias tipicas sin pisar las que el usuario ya definio.
  const cargarSugeridas = () => {
    setRows(rs => {
      const base = rs.filter(r => r.interna.trim() || r.sicetac.trim())
      const existentes = new Set(base.map(r => r.interna.trim().toUpperCase()))
      const nuevas = EQUIVALENCIAS_SUGERIDAS.filter(s => !existentes.has(s.interna.toUpperCase()))
      const merged = [...base, ...nuevas]
      return merged.length ? merged : [{ interna: '', sicetac: '' }]
    })
    toast.success('Equivalencias sugeridas cargadas · revísalas y guarda')
  }

  const guardar = async () => {
    const mapeo: Record<string, string> = {}
    for (const r of rows) {
      const k = r.interna.trim(); const v = r.sicetac.trim()
      if (k && v) mapeo[k] = v
    }
    // Guardar vacío borra todas las equivalencias (y deja sin cruce el motor y
    // el comparativo): se confirma antes.
    if (!Object.keys(mapeo).length && !window.confirm('No hay ninguna equivalencia. Si guarda, se borran todas y el motor y el comparativo SICETAC no podrán cruzar vehículos. ¿Continuar?')) return
    setSaving(true)
    try {
      const res = await apiClient.put('/tarifax/mapeo-vehiculos', { mapeo })
      toast.success(`Configuración guardada (${(res.data as any)?.categorias ?? Object.keys(mapeo).length} categorías)`)
      await onGuardado?.()
      onClose()
    } catch {
      toast.error('No se pudo guardar')
    } finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
        <DirectionsCar sx={{ color: TX_COLOR }} /> Configuración de tipologías de vehículo
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2, fontSize: 12.5 }}>
          Asocia la categoría con la que <b>tu empresa</b> nombra los vehículos (ej. TRACTOCAMIÓN, SENCILLO, TURBO)
          con la tipología equivalente en <b>SICETAC</b>. El cruce y el cálculo de CPK usarán esta equivalencia.
        </Alert>
        {nota}
        {loading ? <LinearProgress /> : (
          <Stack spacing={1.25}>
            <Stack direction="row" sx={{ px: 0.5 }}>
              <Typography sx={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Categoría interna</Typography>
              <Typography sx={{ flex: 1, fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>Tipología SICETAC</Typography>
              <Box sx={{ width: 36 }} />
            </Stack>
            {rows.map((r, i) => (
              <Stack key={i} direction="row" spacing={1} alignItems="center">
                <TextField size="small" placeholder="TRACTOCAMION" value={r.interna} onChange={e => setRow(i, { interna: e.target.value })} sx={{ flex: 1 }} />
                <Autocomplete
                  size="small" options={tipos} value={r.sicetac || null} freeSolo
                  onChange={(_, v) => setRow(i, { sicetac: v || '' })}
                  onInputChange={(_, v) => setRow(i, { sicetac: v })}
                  sx={{ flex: 1 }}
                  renderInput={(p) => <TextField {...p} placeholder="3S2" />}
                />
                <Tooltip title="Quitar"><IconButton size="small" onClick={() => delRow(i)} sx={{ color: '#DC2626' }}><DeleteOutline sx={{ fontSize: 18 }} /></IconButton></Tooltip>
              </Stack>
            ))}
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Button startIcon={<AddIcon />} onClick={addRow} sx={{ textTransform: 'none', color: TX_COLOR, fontWeight: 700 }}>Agregar categoría</Button>
              <Button startIcon={<AutoFixHigh />} onClick={cargarSugeridas} sx={{ textTransform: 'none', color: '#64748B', fontWeight: 700 }}>Cargar equivalencias sugeridas</Button>
            </Stack>
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} sx={{ color: '#64748B' }}>Cancelar</Button>
        <Button variant="contained" disabled={saving || loading} onClick={guardar} sx={{ bgcolor: TX_COLOR, '&:hover': { bgcolor: TX_DARK }, fontWeight: 700 }}>Guardar configuración</Button>
      </DialogActions>
    </Dialog>
  )
}

