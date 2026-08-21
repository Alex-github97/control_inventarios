/**
 * Selector de responsable, alimentado por los colaboradores de Gestión Humana.
 *
 * Deliberadamente NO usa el catálogo maestro: un catálogo manual de responsables
 * sería un segundo lugar donde mantener personas, en paralelo a la nómina, y las
 * dos listas se desincronizarían al primer ingreso o retiro. La fuente de verdad
 * de quién trabaja en la empresa es Gestión Humana.
 *
 * Guarda el nombre completo como texto, que es lo que ya almacenan los campos
 * `responsable` de los otros módulos: así se adopta sin migrar sus tablas.
 */
import { useMemo } from 'react'
import { Autocomplete, TextField, Box, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'

interface ColaboradorHCM {
  id: number
  nombres: string
  apellidos: string
  nombre_completo?: string | null
  cargo_nombre?: string | null
  area_nombre?: string | null
  estado_laboral?: string | null
  activo?: boolean
}

interface RespuestaLista {
  items: ColaboradorHCM[]
  total: number
}

interface OpcionResponsable {
  nombre: string
  detalle: string
  /** Verdadero cuando el valor venía guardado y no está en la nómina. */
  externo?: boolean
}

/** Con `freeSolo`, MUI entrega el valor como texto suelto o como opción. */
const nombreDe = (o: string | OpcionResponsable | null): string =>
  typeof o === 'string' ? o : (o?.nombre ?? '')

export function SelectorResponsable({
  label = 'Responsable', valor, onChange, onChangeEvento,
  requerido = false, sx, ayuda,
}: {
  label?: string
  valor: string
  onChange?: (nombre: string) => void
  /** Adaptador para las páginas con handlers curried, igual que en
   *  SelectorCatalogo. */
  onChangeEvento?: (e: any) => void
  requerido?: boolean
  sx?: object
  ayuda?: string
}) {
  const { data, isError } = useQuery<RespuestaLista>({
    queryKey: ['hcm-colaboradores-selector'],
    // per_page alto: se usa como lista de selección, no paginada
    queryFn: () => api.get('/hcm/colaboradores', {
      params: { per_page: 500 },
    }).then(r => r.data),
    retry: false,
  })

  const opciones = useMemo<OpcionResponsable[]>(() => {
    const items = data?.items ?? []
    // El tipo va explícito: si se deja inferir del map, el objeto que se agrega
    // después no puede traer `externo`.
    const lista: OpcionResponsable[] = items.map(c => ({
      nombre: (c.nombre_completo ?? `${c.nombres} ${c.apellidos}`).trim(),
      detalle: [c.cargo_nombre, c.area_nombre].filter(Boolean).join(' · '),
    }))
    // El valor guardado puede no estar en la nómina: alguien que ya se retiró, o
    // un texto escrito antes de que existiera este selector. Se conserva.
    if (valor && !lista.some(o => o.nombre === valor)) {
      lista.unshift({ nombre: valor, detalle: 'fuera de la nómina', externo: true })
    }
    return lista
  }, [data, valor])

  const seleccionada = opciones.find(o => o.nombre === valor) ?? null

  const emitir = (nombre: string) => {
    onChange?.(nombre)
    onChangeEvento?.({ target: { value: nombre, name: 'responsable' } })
  }

  // Si Gestión Humana no responde (sin permiso, por ejemplo) se degrada a texto
  // libre en lugar de dejar el campo inservible.
  if (isError) {
    return (
      <TextField
        size="small" fullWidth sx={sx}
        label={requerido ? `${label} *` : label}
        value={valor} onChange={e => emitir(e.target.value)}
        helperText="No se pudo consultar la nómina; se captura como texto"
      />
    )
  }

  const vacia = (data?.items ?? []).length === 0

  return (
    <Autocomplete
      size="small" sx={sx}
      options={opciones}
      value={seleccionada}
      // Con freeSolo el valor puede llegar como texto suelto o como opción, así
      // que hay que resolver ambos casos.
      onChange={(_e, v) => emitir(nombreDe(v))}
      getOptionLabel={o => nombreDe(o)}
      isOptionEqualToValue={(a, b) => nombreDe(a) === nombreDe(b)}
      // Permite escribir un nombre que no esté en la nómina (un contratista,
      // por ejemplo) sin perder la ayuda de la lista.
      freeSolo
      onInputChange={(_e, texto, razon) => { if (razon === 'input') emitir(texto) }}
      renderOption={(props, o) => {
        const op: OpcionResponsable = typeof o === 'string'
          ? { nombre: o, detalle: '' }
          : o
        return (
          <Box component="li" {...props} key={op.nombre}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" noWrap>{op.nombre}</Typography>
              {op.detalle && (
                <Typography variant="caption" color={op.externo ? 'warning.main' : 'text.secondary'}>
                  {op.detalle}
                </Typography>
              )}
            </Box>
          </Box>
        )
      }}
      renderInput={p => (
        <TextField
          {...p} label={requerido ? `${label} *` : label}
          helperText={vacia
            ? 'Sin colaboradores en Gestión Humana; se captura como texto'
            : (ayuda ?? undefined)}
        />
      )}
    />
  )
}
