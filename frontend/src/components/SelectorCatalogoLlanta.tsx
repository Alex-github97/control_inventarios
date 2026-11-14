import { useState } from 'react'
import { TextField, MenuItem, Alert, Stack, Typography, Chip, Button, ListSubheader } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient as api } from '@/api/client'
import { mensajeDeError } from '@/utils/errorApi'
import type { MarcaNeu, DimensionNeu, ReferenciaNeu, ReferenciaDimension } from './CatalogoLlantas'

export interface SeleccionCatalogo {
  marca_id: string
  referencia_id: string
  dimension_id: string
  /** Nombres, que es lo que espera el backend al crear la llanta */
  marca: string
  referencia: string
  medida: string
  /** Datos que hereda la llanta desde la combinación referencia+dimensión */
  profundidad_inicial: number | null
  vida_util_km: number | null
  presion_recomendada: number | null
  tipo_uso: string | null
}

export const SELECCION_VACIA: SeleccionCatalogo = {
  marca_id: '', referencia_id: '', dimension_id: '',
  marca: '', referencia: '', medida: '',
  profundidad_inicial: null, vida_util_km: null, presion_recomendada: null, tipo_uso: null,
}

/**
 * Selección en cascada contra el catálogo: marca → referencia (de esa marca) →
 * dimensión (solo las configuradas para esa referencia). La profundidad inicial
 * no se digita: la define el catálogo para esa combinación.
 */
export function SelectorCatalogoLlanta({
  ambito = 'LLANTA', valor, onChange, color = '#1A1A1A',
}: {
  ambito?: 'LLANTA' | 'BANDA'
  valor: SeleccionCatalogo
  onChange: (v: SeleccionCatalogo) => void
  color?: string
}) {
  const { data: marcas = [] } = useQuery<MarcaNeu[]>({
    queryKey: ['eam-cat-marcas', ambito],
    queryFn: () => api.get('/eam/neumaticos/catalogo/marcas', { params: { ambito } }).then(r => r.data),
  })
  const { data: referencias = [] } = useQuery<ReferenciaNeu[]>({
    queryKey: ['eam-cat-referencias', ambito, valor.marca_id],
    queryFn: () => api.get('/eam/neumaticos/catalogo/referencias', { params: { ambito, marca_id: valor.marca_id } }).then(r => r.data),
    enabled: !!valor.marca_id,
  })
  const { data: refDims = [] } = useQuery<ReferenciaDimension[]>({
    queryKey: ['eam-cat-ref-dim', valor.referencia_id],
    queryFn: () => api.get(`/eam/neumaticos/catalogo/referencias/${valor.referencia_id}/dimensiones`).then(r => r.data),
    enabled: !!valor.referencia_id,
  })
  // Todas las dimensiones del catálogo: las que la referencia aún no tiene
  // configuradas se pueden configurar desde aquí, con su profundidad inicial.
  // Sin esto, una referencia sin dimensiones dejaba la lista vacía y no había
  // forma de crear la llanta sin salir a Configuración.
  const { data: dimensiones = [] } = useQuery<DimensionNeu[]>({
    queryKey: ['eam-cat-dimensiones', ambito],
    queryFn: () => api.get('/eam/neumaticos/catalogo/dimensiones', { params: { ambito } }).then(r => r.data),
    enabled: !!valor.referencia_id,
  })
  const qc = useQueryClient()
  const [porConfigurar, setPorConfigurar] = useState('')   // id de la dimensión elegida sin configurar
  const [profNueva, setProfNueva] = useState('')
  const configuradas = new Set(refDims.map(rd => rd.dimension_id))
  const sinConfigurar = dimensiones.filter(d => !configuradas.has(d.id))
  const dimPorConfigurar = sinConfigurar.find(d => String(d.id) === porConfigurar)

  const configurar = useMutation({
    mutationFn: () => api.post('/eam/neumaticos/catalogo/referencia-dimension', {
      referencia_id: Number(valor.referencia_id), dimension_id: Number(porConfigurar),
      profundidad_inicial: Number(profNueva),
    }).then(r => r.data as ReferenciaDimension),
    onSuccess: rd => {
      toast.success('Dimensión configurada para la referencia')
      qc.invalidateQueries({ queryKey: ['eam-cat-ref-dim'] })
      onChange({
        ...valor, dimension_id: String(rd.dimension_id), medida: dimPorConfigurar?.nombre ?? '',
        profundidad_inicial: rd.profundidad_inicial ?? null,
        vida_util_km: rd.vida_util_km ?? null,
        presion_recomendada: rd.presion_recomendada ?? null,
      })
      setPorConfigurar('')
      setProfNueva('')
    },
    onError: (e: unknown) => toast.error(mensajeDeError(e, 'No se pudo configurar la dimensión')),
  })

  const elegirMarca = (id: string) => {
    const m = marcas.find(x => String(x.id) === id)
    // Cambiar la marca invalida la referencia y la dimensión elegidas
    setPorConfigurar('')
    onChange({ ...SELECCION_VACIA, marca_id: id, marca: m?.nombre ?? '' })
  }
  const elegirReferencia = (id: string) => {
    const r = referencias.find(x => String(x.id) === id)
    setPorConfigurar('')
    onChange({
      ...valor, referencia_id: id, referencia: r?.nombre ?? '', tipo_uso: r?.tipo_uso ?? null,
      dimension_id: '', medida: '', profundidad_inicial: null, vida_util_km: null, presion_recomendada: null,
    })
  }
  const elegirDimension = (id: string) => {
    // El rótulo «Sin configurar…» de la lista no es una opción: al tocarlo
    // llega sin valor.
    if (typeof id !== 'string') return
    if (id.startsWith('nueva:')) {
      // Existe en el catálogo pero no para esta referencia: falta su profundidad.
      setPorConfigurar(id.slice(6))
      setProfNueva('')
      onChange({ ...valor, dimension_id: '', medida: '', profundidad_inicial: null, vida_util_km: null, presion_recomendada: null })
      return
    }
    setPorConfigurar('')
    const rd = refDims.find(x => String(x.dimension_id) === id)
    onChange({
      ...valor, dimension_id: id, medida: rd?.dimension_nombre ?? '',
      profundidad_inicial: rd?.profundidad_inicial ?? null,
      vida_util_km: rd?.vida_util_km ?? null,
      presion_recomendada: rd?.presion_recomendada ?? null,
    })
  }

  const sinCatalogo = marcas.length === 0

  return (
    <>
      {sinCatalogo && (
        <Grid size={{ xs: 12 }}>
          <Alert severity="warning" sx={{ py: 0.5 }}>
            No hay marcas configuradas. Antes de registrar, define marcas, referencias y dimensiones en{' '}
            <b>Configuración → Catálogo de {ambito === 'LLANTA' ? 'llantas' : 'bandas de reencauche'}</b>.
          </Alert>
        </Grid>
      )}

      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField select label="Marca *" size="small" fullWidth value={valor.marca_id}
          onChange={e => elegirMarca(e.target.value)} disabled={sinCatalogo}>
          <MenuItem value="">Seleccionar…</MenuItem>
          {marcas.map(m => <MenuItem key={m.id} value={String(m.id)}>{m.nombre}</MenuItem>)}
        </TextField>
      </Grid>

      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField select label="Referencia *" size="small" fullWidth value={valor.referencia_id}
          onChange={e => elegirReferencia(e.target.value)} disabled={!valor.marca_id}
          helperText={!valor.marca_id ? 'Elige primero la marca' : referencias.length === 0 ? 'Esta marca no tiene referencias' : undefined}>
          <MenuItem value="">Seleccionar…</MenuItem>
          {referencias.map(r => <MenuItem key={r.id} value={String(r.id)}>{r.nombre}</MenuItem>)}
        </TextField>
      </Grid>

      <Grid size={{ xs: 12, sm: 4 }}>
        <TextField select label="Dimensión *" size="small" fullWidth
          value={valor.dimension_id || (dimPorConfigurar ? `nueva:${porConfigurar}` : '')}
          onChange={e => elegirDimension(e.target.value)} disabled={!valor.referencia_id}
          helperText={!valor.referencia_id ? 'Elige primero la referencia'
            : refDims.length === 0 && sinConfigurar.length === 0 ? 'No hay dimensiones en el catálogo'
            : refDims.length === 0 ? 'Elige la dimensión e indica su profundidad inicial' : undefined}>
          <MenuItem value="">Seleccionar…</MenuItem>
          {refDims.map(rd => (
            <MenuItem key={rd.id} value={String(rd.dimension_id)}>
              {rd.dimension_nombre} · {rd.profundidad_inicial} mm
            </MenuItem>
          ))}
          {sinConfigurar.length > 0 && (
            <ListSubheader sx={{ lineHeight: '28px', fontSize: 11 }}>Sin configurar para esta referencia</ListSubheader>
          )}
          {sinConfigurar.map(d => (
            <MenuItem key={`n${d.id}`} value={`nueva:${d.id}`}>{d.nombre}</MenuItem>
          ))}
        </TextField>
      </Grid>

      {dimPorConfigurar && (
        <Grid size={{ xs: 12 }}>
          <Alert severity="info" sx={{ py: 0.5, '& .MuiAlert-message': { width: '100%' } }}>
            <Typography fontSize={12.5} mb={1}>
              <b>{valor.referencia}</b> aún no tiene configurada la dimensión <b>{dimPorConfigurar.nombre}</b>.
              Indica su profundidad inicial y queda guardada en el catálogo.
            </Typography>
            <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
              <TextField size="small" type="number" label="Profundidad inicial (mm) *" value={profNueva}
                onChange={e => setProfNueva(e.target.value)} sx={{ width: 230, bgcolor: '#FFFFFF' }}
                inputProps={{ min: 0, step: 0.1 }} />
              <Button variant="contained" size="small" disabled={!(Number(profNueva) > 0) || configurar.isPending}
                onClick={() => configurar.mutate()} sx={{ bgcolor: color, textTransform: 'none', whiteSpace: 'nowrap' }}>
                Configurar y usar
              </Button>
            </Stack>
          </Alert>
        </Grid>
      )}

      {valor.profundidad_inicial != null && (
        <Grid size={{ xs: 12 }}>
          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
            <Typography fontSize={12} color="text.secondary">Según el catálogo:</Typography>
            <Chip size="small" label={`Profundidad inicial ${valor.profundidad_inicial} mm`} sx={{ bgcolor: `${color}22`, color, fontWeight: 700, fontSize: 11 }} />
            {valor.vida_util_km != null && <Chip size="small" label={`Vida útil ${valor.vida_util_km.toLocaleString('es-CO')} km`} sx={{ fontSize: 11 }} />}
            {valor.tipo_uso && <Chip size="small" label={`Uso ${valor.tipo_uso}`} sx={{ fontSize: 11 }} />}
          </Stack>
        </Grid>
      )}
    </>
  )
}
