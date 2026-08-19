import { TextField, MenuItem, Alert, Stack, Typography, Chip } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { useQuery } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'
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
  ambito = 'LLANTA', valor, onChange, color = '#32AC5C',
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

  const elegirMarca = (id: string) => {
    const m = marcas.find(x => String(x.id) === id)
    // Cambiar la marca invalida la referencia y la dimensión elegidas
    onChange({ ...SELECCION_VACIA, marca_id: id, marca: m?.nombre ?? '' })
  }
  const elegirReferencia = (id: string) => {
    const r = referencias.find(x => String(x.id) === id)
    onChange({
      ...valor, referencia_id: id, referencia: r?.nombre ?? '', tipo_uso: r?.tipo_uso ?? null,
      dimension_id: '', medida: '', profundidad_inicial: null, vida_util_km: null, presion_recomendada: null,
    })
  }
  const elegirDimension = (id: string) => {
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
        <TextField select label="Dimensión *" size="small" fullWidth value={valor.dimension_id}
          onChange={e => elegirDimension(e.target.value)} disabled={!valor.referencia_id}
          helperText={!valor.referencia_id ? 'Elige primero la referencia' : refDims.length === 0 ? 'Esta referencia no tiene dimensiones' : undefined}>
          <MenuItem value="">Seleccionar…</MenuItem>
          {refDims.map(rd => (
            <MenuItem key={rd.id} value={String(rd.dimension_id)}>
              {rd.dimension_nombre} · {rd.profundidad_inicial} mm
            </MenuItem>
          ))}
        </TextField>
      </Grid>

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
