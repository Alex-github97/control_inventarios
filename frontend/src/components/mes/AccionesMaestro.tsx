/**
 * Editar y dar de baja una fila de los datos maestros del MES.
 *
 * Las siete pestañas de la configuración —plantas, líneas, celdas, equipos,
 * operarios, turnos, materiales— solo sabían crear y listar. Corregir el
 * nombre de una máquina obligaba a crear otra y dejar la anterior estorbando,
 * que es exactamente como se llena un catálogo de duplicados.
 *
 * El formulario se arma desde una descripción de campos en vez de escribirse
 * siete veces. No es por ahorrar líneas: siete diálogos casi iguales son siete
 * sitios donde arreglar el mismo error, y el séptimo siempre se olvida.
 */
import { useEffect, useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField,
  MenuItem, Stack, IconButton, Tooltip, Typography, Switch, FormControlLabel,
} from '@mui/material'
import { Edit, PowerSettingsNew } from '@mui/icons-material'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient as api } from '@/api/client'

export interface CampoMaestro {
  clave: string
  etiqueta: string
  tipo?: 'texto' | 'numero' | 'lista' | 'interruptor' | 'hora'
  opciones?: { valor: string | number; texto: string }[]
  requerido?: boolean
  ancho?: number          // de 1 a 12, dentro del diálogo
  ayuda?: string
}

interface Props {
  /** Segmento de /mes/… — «lineas», «equipos», «productos»… */
  recurso: string
  item: Record<string, any>
  campos: CampoMaestro[]
  /** Cómo se nombra en los mensajes: «la línea», «el equipo». */
  etiqueta: string
  /** Las consultas que hay que refrescar al guardar. */
  claves: unknown[][]
}

export function AccionesMaestro({ recurso, item, campos, etiqueta, claves }: Props) {
  const qc = useQueryClient()
  const [abierto, setAbierto] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({})

  // El formulario se rellena al abrir y no al montar: la fila puede cambiar
  // por debajo mientras el diálogo está cerrado.
  useEffect(() => {
    if (!abierto) return
    const inicial: Record<string, any> = {}
    for (const c of campos) inicial[c.clave] = item[c.clave] ?? (c.tipo === 'interruptor' ? false : '')
    setForm(inicial)
  }, [abierto, item, campos])

  const refrescar = () => claves.forEach(k => qc.invalidateQueries({ queryKey: k }))

  const guardar = useMutation({
    mutationFn: () => {
      const cuerpo: Record<string, any> = {}
      for (const c of campos) {
        const v = form[c.clave]
        cuerpo[c.clave] = c.tipo === 'numero'
          ? (v === '' || v == null ? null : Number(v))
          : c.tipo === 'interruptor' ? Boolean(v)
          : (typeof v === 'string' ? v.trim() : v) || null
      }
      return api.put(`/mes/${recurso}/${item.id}`, cuerpo).then(r => r.data)
    },
    onSuccess: () => {
      toast.success(`Se actualizó ${etiqueta}`)
      refrescar()
      setAbierto(false)
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.detail || `No se pudo actualizar ${etiqueta}`),
  })

  const desactivar = useMutation({
    mutationFn: () => api.delete(`/mes/${recurso}/${item.id}`),
    onSuccess: () => { toast.success(`Se dio de baja ${etiqueta}`); refrescar() },
    onError: (e: any) =>
      toast.error(e?.response?.data?.detail || `No se pudo dar de baja ${etiqueta}`),
  })

  const faltan = campos.some(c => c.requerido && !String(form[c.clave] ?? '').trim())

  return (
    <>
      <Stack direction="row" spacing={0.25} justifyContent="flex-end">
        <Tooltip title="Editar">
          <IconButton size="small" onClick={() => setAbierto(true)}>
            <Edit sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title={`Dar de baja ${etiqueta}`}>
          <span>
            <IconButton size="small" color="error" disabled={desactivar.isPending}
              onClick={() => desactivar.mutate()}>
              <PowerSettingsNew sx={{ fontSize: 16 }} />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <Dialog open={abierto} onClose={() => setAbierto(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, fontSize: 16 }}>
          Editar {etiqueta}
          <Typography variant="caption" display="block" color="text.secondary">
            {item.codigo ? `${item.codigo} · ` : ''}{item.nombre || ''}
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            {campos.map(c => c.tipo === 'interruptor' ? (
              <FormControlLabel key={c.clave}
                control={<Switch size="small" checked={Boolean(form[c.clave])}
                  onChange={e => setForm(f => ({ ...f, [c.clave]: e.target.checked }))} />}
                label={<Typography sx={{ fontSize: 13 }}>{c.etiqueta}</Typography>} />
            ) : (
              <TextField key={c.clave} size="small" fullWidth
                select={c.tipo === 'lista'}
                type={c.tipo === 'numero' ? 'number' : 'text'}
                label={c.etiqueta + (c.requerido ? ' *' : '')}
                value={form[c.clave] ?? ''}
                helperText={c.ayuda}
                onChange={e => setForm(f => ({ ...f, [c.clave]: e.target.value }))}>
                {c.tipo === 'lista' && [
                  <MenuItem key="__" value="">Sin especificar</MenuItem>,
                  ...(c.opciones || []).map(o => (
                    <MenuItem key={o.valor} value={o.valor}>{o.texto}</MenuItem>
                  )),
                ]}
              </TextField>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAbierto(false)} sx={{ textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button variant="contained" disabled={faltan || guardar.isPending}
            onClick={() => guardar.mutate()} sx={{ textTransform: 'none' }}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
