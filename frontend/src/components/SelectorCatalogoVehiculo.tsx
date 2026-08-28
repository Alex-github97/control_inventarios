import { TextField, MenuItem, Alert, Stack, Typography, Chip, alpha } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { useQuery } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'

export interface MarcaActivo {
  id: number; nombre: string; tipo_activo?: string | null; activo?: boolean; total_lineas?: number
}
export interface LineaActivo {
  id: number; marca_id: number; nombre: string; marca?: string | null
  activo?: boolean; total_modelos?: number
}
export interface ModeloActivo {
  id: number; linea_id: number; nombre: string
  linea?: string | null; marca?: string | null; motor?: string | null
  anio_desde?: number | null; anio_hasta?: number | null
  motor_id?: number | null; tipo_combustible?: string | null
  capacidad_combustible?: number | null; numero_ejes?: number | null
  esquema_codigo?: string | null; vida_util_anios?: number | null
  vida_util_km?: number | null; capacidad_kg?: number | null
  activo?: boolean
}
export interface MotorActivo {
  id: number; nombre: string; marca?: string | null
  cilindraje_cc?: number | null; potencia_hp?: number | null; activo?: boolean
}
export interface CombustibleActivo { id: number; nombre: string; activo?: boolean }

export interface SeleccionVehiculo {
  marca_id: string
  linea_id: string
  modelo_id: string
  /** Nombres, que es lo que espera el backend al crear el activo */
  marca: string
  linea: string
  modelo: string
  /** Ficha técnica que hereda el activo desde el modelo elegido */
  motor_marca: string | null
  motor_linea: string | null
  motor_cc: number | null
  tipo_combustible: string | null
  capacidad_combustible: number | null
  numero_ejes: number | null
  vida_util_anios: number | null
  vida_util_km: number | null
  capacidad_kg: number | null
}

export const SELECCION_VEHICULO_VACIA: SeleccionVehiculo = {
  marca_id: '', linea_id: '', modelo_id: '',
  marca: '', linea: '', modelo: '',
  motor_marca: null, motor_linea: null, motor_cc: null,
  tipo_combustible: null, capacidad_combustible: null, numero_ejes: null,
  vida_util_anios: null, vida_util_km: null, capacidad_kg: null,
}

/**
 * Selección en cascada contra el catálogo de vehículos:
 * marca (del tipo de activo elegido) → línea (de esa marca) → modelo (de esa
 * línea). El modelo es la hoja y trae la ficha técnica, así que motor,
 * combustible, ejes y vida útil no se digitan: los define el catálogo.
 *
 * Es el mismo criterio del catálogo de llantas. Sin esto la ficha se llena a
 * mano y termina con "Kenworth", "KENWORTH" y "Ken worth" como tres marcas.
 */
export function SelectorCatalogoVehiculo({
  tipoActivo, valor, onChange, color = '#1A1A1A', requerido = false,
}: {
  /** Código del tipo de activo (VEHICULO, MONTACARGAS…). Acota las marcas. */
  tipoActivo?: string | null
  valor: SeleccionVehiculo
  onChange: (v: SeleccionVehiculo) => void
  color?: string
  requerido?: boolean
}) {
  const { data: marcas = [] } = useQuery<MarcaActivo[]>({
    queryKey: ['eam-cat-veh-marcas', tipoActivo ?? ''],
    queryFn: () => api.get('/eam/catalogo-vehiculos/marcas', {
      params: { solo_activas: true, ...(tipoActivo ? { tipo_activo: tipoActivo } : {}) },
    }).then(r => r.data),
  })
  const { data: lineas = [] } = useQuery<LineaActivo[]>({
    queryKey: ['eam-cat-veh-lineas', valor.marca_id],
    queryFn: () => api.get('/eam/catalogo-vehiculos/lineas', {
      params: { marca_id: valor.marca_id, solo_activas: true },
    }).then(r => r.data),
    enabled: !!valor.marca_id,
  })
  const { data: modelos = [] } = useQuery<ModeloActivo[]>({
    queryKey: ['eam-cat-veh-modelos', valor.linea_id],
    queryFn: () => api.get('/eam/catalogo-vehiculos/modelos', {
      params: { linea_id: valor.linea_id, solo_activos: true },
    }).then(r => r.data),
    enabled: !!valor.linea_id,
  })

  // Cambiar un nivel invalida los de abajo: una línea de Kenworth no tiene
  // sentido si la marca pasó a ser Volvo.
  const elegirMarca = (id: string) => {
    const m = marcas.find(x => String(x.id) === id)
    onChange({ ...SELECCION_VEHICULO_VACIA, marca_id: id, marca: m?.nombre ?? '' })
  }
  const elegirLinea = (id: string) => {
    const l = lineas.find(x => String(x.id) === id)
    onChange({
      ...SELECCION_VEHICULO_VACIA,
      marca_id: valor.marca_id, marca: valor.marca,
      linea_id: id, linea: l?.nombre ?? '',
    })
  }
  const elegirModelo = (id: string) => {
    const mo = modelos.find(x => String(x.id) === id)
    if (!mo) {
      onChange({
        ...SELECCION_VEHICULO_VACIA,
        marca_id: valor.marca_id, marca: valor.marca,
        linea_id: valor.linea_id, linea: valor.linea,
      })
      return
    }
    // El nombre del motor viene resuelto por el backend en `motor`; se parte en
    // marca y línea para las columnas que ya tiene el activo.
    const motorTxt = mo.motor ?? null
    onChange({
      marca_id: valor.marca_id, marca: valor.marca,
      linea_id: valor.linea_id, linea: valor.linea,
      modelo_id: id, modelo: mo.nombre,
      motor_marca: motorTxt ? motorTxt.split(' ')[0] : null,
      motor_linea: motorTxt,
      motor_cc: null,
      tipo_combustible: mo.tipo_combustible ?? null,
      capacidad_combustible: mo.capacidad_combustible ?? null,
      numero_ejes: mo.numero_ejes ?? null,
      vida_util_anios: mo.vida_util_anios ?? null,
      vida_util_km: mo.vida_util_km ?? null,
      capacidad_kg: mo.capacidad_kg ?? null,
    })
  }

  const modeloSel = modelos.find(x => String(x.id) === valor.modelo_id)

  return (
    <Stack gap={1.5}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            select fullWidth size="small" label={requerido ? 'Marca *' : 'Marca'}
            value={valor.marca_id} onChange={e => elegirMarca(e.target.value)}
            helperText={marcas.length === 0
              ? 'Sin marcas para este tipo. Agréguelas en Configuración.'
              : undefined}
          >
            <MenuItem value="">Seleccionar…</MenuItem>
            {marcas.map(m => (
              <MenuItem key={m.id} value={String(m.id)}>
                {m.nombre}
                {m.tipo_activo === null && (
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                    · general
                  </Typography>
                )}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <TextField
            select fullWidth size="small" label={requerido ? 'Línea *' : 'Línea'}
            value={valor.linea_id} onChange={e => elegirLinea(e.target.value)}
            disabled={!valor.marca_id}
            helperText={!valor.marca_id
              ? 'Elija la marca primero'
              : lineas.length === 0 ? 'Esta marca no tiene líneas configuradas' : undefined}
          >
            <MenuItem value="">Seleccionar…</MenuItem>
            {lineas.map(l => <MenuItem key={l.id} value={String(l.id)}>{l.nombre}</MenuItem>)}
          </TextField>
        </Grid>

      </Grid>

      {/* Ficha técnica heredada del modelo. El alta ya no pide modelo, así que
          esto solo aparece si alguien lo trae preseleccionado. */}
      {modeloSel && (
        <Alert
          severity="info" icon={false}
          sx={{ py: 0.5, bgcolor: alpha(color, 0.07), border: `1px solid ${alpha(color, 0.25)}` }}
        >
          <Typography variant="caption" fontWeight={700} display="block" sx={{ mb: 0.5 }}>
            Ficha técnica que toma del catálogo
          </Typography>
          <Stack direction="row" gap={0.6} flexWrap="wrap">
            {modeloSel.motor && <Chip size="small" label={`Motor: ${modeloSel.motor}`} sx={{ height: 21, fontSize: 10.5 }} />}
            {modeloSel.tipo_combustible && <Chip size="small" label={modeloSel.tipo_combustible} sx={{ height: 21, fontSize: 10.5 }} />}
            {modeloSel.numero_ejes != null && <Chip size="small" label={`${modeloSel.numero_ejes} eje(s)`} sx={{ height: 21, fontSize: 10.5 }} />}
            {modeloSel.capacidad_kg != null && <Chip size="small" label={`${modeloSel.capacidad_kg.toLocaleString('es-CO')} kg`} sx={{ height: 21, fontSize: 10.5 }} />}
            {modeloSel.vida_util_anios != null && <Chip size="small" label={`Vida útil ${modeloSel.vida_util_anios} años`} sx={{ height: 21, fontSize: 10.5 }} />}
            {!modeloSel.motor && !modeloSel.tipo_combustible && modeloSel.numero_ejes == null && (
              <Typography variant="caption" color="text.secondary">
                Este modelo no tiene ficha técnica configurada todavía.
              </Typography>
            )}
          </Stack>
        </Alert>
      )}
    </Stack>
  )
}
