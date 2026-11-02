/**
 * Recogidas de llantas de la planta de reencauche, vistas desde la
 * planificación del TMS: las pendientes se programan en un viaje con una parada
 * por sede y la planta como destino. Si la empresa no tiene la planta, la lista
 * llega vacía y esto no se muestra.
 */
import { useState } from 'react'
import { Box, Paper, Typography, Checkbox, Button, Chip, TextField, Stack, alpha } from '@mui/material'
import { Route } from '@mui/icons-material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient } from '@/api/client'

export function RecogidasReencauche({ color }: { color: string }) {
  const qc = useQueryClient()
  const lista = useQuery({ queryKey: ['tms', 'recogidas-reencauche'], retry: false,
    queryFn: () => apiClient.get('/tms/recogidas-reencauche').then(r => r.data as any[]) })
  const [marcadas, setMarcadas] = useState<number[]>([])
  const [salida, setSalida] = useState(() => `${new Date().toLocaleDateString('en-CA')}T07:00`)
  if (!lista.data?.length) return null
  const programar = async () => {
    try {
      const v = await apiClient.post('/reencauche/recogidas/programar', { solicitud_ids: marcadas, fecha: new Date(salida).toISOString() }).then(r => r.data)
      toast.success(`Viaje ${v.codigo} creado: asígnele vehículo y conductor en la cola`)
      setMarcadas([]); qc.invalidateQueries({ queryKey: ['tms'] })
    } catch (e: any) { toast.error(e?.response?.data?.detail ?? 'No se pudo programar') }
  }
  return (
    <Paper elevation={0} sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', p: 2.5, mt: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5} flexWrap="wrap" gap={1}>
        <Typography fontWeight={700}>Recogidas de llantas para reencauche <Chip size="small" label={lista.data.length} sx={{ ml: 1, bgcolor: alpha(color, 0.1), color }} /></Typography>
        <Stack direction="row" gap={1}>
          <TextField size="small" type="datetime-local" label="Salida" value={salida} onChange={e => setSalida(e.target.value)} InputLabelProps={{ shrink: true }} />
          <Button variant="contained" startIcon={<Route />} disabled={!marcadas.length} onClick={programar} sx={{ bgcolor: color }}>Programar viaje ({marcadas.length})</Button>
        </Stack>
      </Stack>
      {lista.data.map(s => (
        <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 13, py: 0.25 }}>
          <Checkbox size="small" checked={marcadas.includes(s.id)} onChange={e => setMarcadas(e.target.checked ? [...marcadas, s.id] : marcadas.filter(x => x !== s.id))} />
          <b>{s.codigo}</b> · {s.cliente} · {s.sede}, {s.ciudad} · {s.cantidad_estimada} llantas · para el {s.fecha_requerida}
        </Box>
      ))}
    </Paper>
  )
}
