import { TextField, MenuItem, Typography } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { useQuery } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'
import type { MotorActivo } from './SelectorCatalogoVehiculo'

/**
 * Cascada marca del motor → línea del motor, contra el catálogo de motores.
 *
 * Se guarda en `motor_marca` y `motor_linea` del activo, que son columnas que ya
 * existían. La marca sale de los valores distintos del catálogo, así que agregar
 * un motor nuevo en la configuración basta para que aparezca acá.
 */
export function SelectorMotor({
  marca, linea, onChange, color = '#1A1A1A',
}: {
  marca: string
  linea: string
  onChange: (marca: string, linea: string) => void
  color?: string
}) {
  const { data: marcas = [] } = useQuery<string[]>({
    queryKey: ['eam-motor-marcas'],
    queryFn: () => api.get('/eam/catalogo-vehiculos/motores/marcas').then(r => r.data),
  })
  const { data: motores = [] } = useQuery<MotorActivo[]>({
    queryKey: ['eam-motores-de-marca', marca],
    queryFn: () => api.get('/eam/catalogo-vehiculos/motores', {
      params: { marca, solo_activos: true },
    }).then(r => r.data),
    enabled: Boolean(marca),
  })

  const motorSel = motores.find(m => m.nombre === linea)

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          select fullWidth size="small" label="Marca del motor"
          value={marca}
          // Cambiar la marca invalida la línea elegida
          onChange={e => onChange(e.target.value, '')}
          helperText={marcas.length === 0
            ? 'Sin motores en el catálogo. Agréguelos en Configuración.'
            : undefined}
        >
          <MenuItem value="">Seleccionar…</MenuItem>
          {marcas.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField
          select fullWidth size="small" label="Línea del motor"
          value={linea} disabled={!marca}
          onChange={e => onChange(marca, e.target.value)}
          helperText={!marca
            ? 'Elija la marca del motor primero'
            : motores.length === 0
              ? 'Esta marca no tiene líneas configuradas'
              : motorSel
                ? [
                    motorSel.cilindraje_cc ? `${motorSel.cilindraje_cc.toLocaleString('es-CO')} cc` : null,
                    motorSel.potencia_hp ? `${motorSel.potencia_hp} HP` : null,
                  ].filter(Boolean).join(' · ') || undefined
                : undefined}
        >
          <MenuItem value="">Seleccionar…</MenuItem>
          {motores.map(m => (
            <MenuItem key={m.id} value={m.nombre}>
              {m.nombre}
              {m.cilindraje_cc && (
                <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                  · {m.cilindraje_cc.toLocaleString('es-CO')} cc
                </Typography>
              )}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
    </Grid>
  )
}
