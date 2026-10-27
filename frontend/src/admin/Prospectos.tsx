/**
 * Prospectos — quienes escribieron desde el formulario de la landing.
 *
 * No son tickets: todavía no son clientes, no tienen empresa en la plataforma
 * ni conversación. Lo único que el equipo hace acá es leer la solicitud,
 * escribirle a la persona por fuera y dejar constancia de que se hizo.
 */
import { useState } from 'react'
import {
  Box, Card, Typography, Stack, TextField, MenuItem, Chip, Skeleton,
  Table, TableBody, TableCell, TableHead, TableRow, Tooltip, IconButton,
} from '@mui/material'
import { ContactMail, Refresh } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { PALETA, ESTADO, COLOR_MODULO } from '@/config/marca'
import { soporteApi, mensajeDeError, type EstadoProspecto, type Prospecto } from './api'

const ESTADOS: EstadoProspecto[] = ['NUEVO', 'CONTACTADO', 'DESCARTADO']
const NOMBRE_ESTADO: Record<EstadoProspecto, string> = {
  NUEVO: 'Nuevo', CONTACTADO: 'Contactado', DESCARTADO: 'Descartado',
}
const COLOR_ESTADO: Record<EstadoProspecto, string> = {
  NUEVO: COLOR_MODULO, CONTACTADO: ESTADO.exito, DESCARTADO: PALETA.acero,
}

// La fecha de llegada viene con zona y la de atención sin ella (en UTC): se
// agrega la Z solo cuando falta, o la primera quedaría inválida.
const cuando = (iso?: string | null) => {
  if (!iso) return '—'
  const d = new Date(/[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : iso + 'Z')
  return isNaN(d.getTime()) ? '—'
    : d.toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
}

export default function Prospectos() {
  const qc = useQueryClient()
  const [estado, setEstado] = useState<EstadoProspecto | ''>('NUEVO')

  const { data: lista = [], isLoading, refetch, isFetching } = useQuery<Prospecto[]>({
    queryKey: ['soporte-prospectos', estado],
    queryFn: () => soporteApi.prospectos(estado || undefined),
    refetchInterval: 60000,
  })

  const cambiar = useMutation({
    mutationFn: ({ id, nuevo }: { id: number; nuevo: EstadoProspecto }) =>
      soporteApi.cambiarEstadoProspecto(id, nuevo),
    onSuccess: (p) => {
      toast.success(`${p.nombre}: ${NOMBRE_ESTADO[p.estado].toLowerCase()}`)
      qc.invalidateQueries({ queryKey: ['soporte-prospectos'] })
    },
    onError: (e) => toast.error(mensajeDeError(e)),
  })

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2} alignItems={{ sm: 'center' }}>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          Solicitudes que llegan desde el formulario de contacto de la página pública.
        </Typography>
        <TextField select size="small" label="Estado" value={estado}
          onChange={e => setEstado(e.target.value as EstadoProspecto | '')} sx={{ minWidth: 170 }}>
          <MenuItem value="">Todos</MenuItem>
          {ESTADOS.map(e => <MenuItem key={e} value={e}>{NOMBRE_ESTADO[e]}</MenuItem>)}
        </TextField>
        <Tooltip title="Actualizar">
          <span>
            <IconButton onClick={() => refetch()} disabled={isFetching}><Refresh /></IconButton>
          </span>
        </Tooltip>
      </Stack>

      <Card sx={{ borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>LLEGÓ</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>QUIÉN</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>MENSAJE</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>ESTADO</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && [0, 1, 2].map(i => (
              <TableRow key={i}><TableCell colSpan={4}><Skeleton height={28} /></TableCell></TableRow>
            ))}
            {lista.map(p => (
              <TableRow key={p.id} sx={{ verticalAlign: 'top' }}>
                <TableCell sx={{ whiteSpace: 'nowrap', color: PALETA.grafito }}>
                  {cuando(p.created_at)}
                </TableCell>
                <TableCell sx={{ minWidth: 200 }}>
                  <Typography variant="body2" fontWeight={700}>{p.nombre}</Typography>
                  {p.empresa && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      {p.empresa}
                    </Typography>
                  )}
                  <Typography variant="caption" display="block">
                    <a href={`mailto:${p.correo}`} style={{ color: COLOR_MODULO }}>{p.correo}</a>
                  </Typography>
                  {p.telefono && (
                    <Typography variant="caption" display="block" color="text.secondary">
                      {p.telefono}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', maxWidth: 520 }}>
                    {p.mensaje}
                  </Typography>
                  {p.origen && p.origen !== '/' && (
                    <Typography variant="caption" color="text.secondary">Desde {p.origen}</Typography>
                  )}
                </TableCell>
                <TableCell sx={{ minWidth: 170 }}>
                  <TextField
                    select size="small" fullWidth value={p.estado}
                    disabled={cambiar.isPending}
                    onChange={e => cambiar.mutate({ id: p.id, nuevo: e.target.value as EstadoProspecto })}
                    SelectProps={{
                      renderValue: (v) => (
                        <Chip label={NOMBRE_ESTADO[v as EstadoProspecto]} size="small" sx={{
                          fontWeight: 700, fontSize: 10.5,
                          bgcolor: `${COLOR_ESTADO[v as EstadoProspecto]}1A`,
                          color: COLOR_ESTADO[v as EstadoProspecto],
                        }} />
                      ),
                    }}
                  >
                    {ESTADOS.map(e => <MenuItem key={e} value={e}>{NOMBRE_ESTADO[e]}</MenuItem>)}
                  </TextField>
                  {p.atendido_por && (
                    <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                      {p.atendido_por} · {cuando(p.atendido_en)}
                    </Typography>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && lista.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Box sx={{ textAlign: 'center', py: 5, color: PALETA.acero }}>
                    <ContactMail sx={{ fontSize: 40, opacity: 0.4 }} />
                    <Typography variant="body2" mt={1}>
                      No hay solicitudes {estado ? `en estado «${NOMBRE_ESTADO[estado]}»` : 'todavía'}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </Box>
  )
}
