import { TextField, MenuItem, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'

export type TipoCatalogoActivo =
  | 'SEDE' | 'AREA' | 'UBICACION' | 'RESPONSABLE' | 'CUENTA_CONTABLE' | 'CENTRO_COSTO'

export interface ItemCatalogoActivo {
  id: number
  tipo: string
  nombre: string
  codigo?: string | null
  activo?: boolean
  en_uso?: number
}

export const TIPOS_CATALOGO_ACTIVO: { tipo: TipoCatalogoActivo; label: string; ayuda: string }[] = [
  { tipo: 'SEDE',            label: 'Sedes',             ayuda: 'Plantas, centros de distribución, patios' },
  { tipo: 'AREA',            label: 'Áreas',             ayuda: 'Área funcional responsable del activo' },
  { tipo: 'UBICACION',       label: 'Ubicaciones',       ayuda: 'Dónde está físicamente el activo' },
  { tipo: 'RESPONSABLE',     label: 'Responsables',      ayuda: 'Quién responde por el activo' },
  { tipo: 'CUENTA_CONTABLE', label: 'Cuentas contables', ayuda: 'Cuenta del PUC donde se registra' },
  { tipo: 'CENTRO_COSTO',    label: 'Centros de costo',  ayuda: 'A qué centro se cargan sus costos' },
]

/**
 * Desplegable de un catálogo organizativo del activo (sede, área, ubicación,
 * responsable, cuenta contable, centro de costo).
 *
 * Guarda el nombre y no el id, igual que el resto de la ficha del activo. Si el
 * activo ya traía un valor que no está en el catálogo — porque se escribió a
 * mano antes de que existiera la lista — se agrega como opción para no perderlo
 * en silencio al editar.
 */
export function SelectorCatalogoGeneral({
  tipo, label, valor, onChange, requerido = false, ayudaVacio,
}: {
  tipo: TipoCatalogoActivo
  label: string
  valor: string
  onChange: (v: string) => void
  requerido?: boolean
  ayudaVacio?: string
}) {
  const { data: items = [] } = useQuery<ItemCatalogoActivo[]>({
    queryKey: ['eam-cat-general', tipo],
    queryFn: () => api.get('/eam/catalogo-vehiculos/generales', {
      params: { tipo, solo_activos: true },
    }).then(r => r.data),
  })

  const enCatalogo = items.some(i => i.nombre === valor)
  const huerfano = Boolean(valor) && !enCatalogo

  return (
    <TextField
      select size="small" fullWidth label={requerido ? `${label} *` : label}
      value={valor} onChange={e => onChange(e.target.value)}
      helperText={
        huerfano
          ? 'Valor que no está en el catálogo; se conserva hasta que lo cambie'
          : items.length === 0
            ? (ayudaVacio ?? 'Sin valores. Agréguelos en Configuración → Catálogos.')
            : undefined
      }
    >
      <MenuItem value="">Sin especificar</MenuItem>
      {huerfano && (
        <MenuItem value={valor}>
          {valor}
          <Typography component="span" variant="caption" color="warning.main" sx={{ ml: 0.75 }}>
            · fuera del catálogo
          </Typography>
        </MenuItem>
      )}
      {items.map(i => (
        <MenuItem key={i.id} value={i.nombre}>
          {i.nombre}
          {i.codigo && (
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
              · {i.codigo}
            </Typography>
          )}
        </MenuItem>
      ))}
    </TextField>
  )
}
