/**
 * Filtros comunes de los tableros de llantas: marca, referencia, dimensión y
 * año y semana de fabricación (leídos del DOT). Los aplica el servidor, igual
 * en el tablero general, en la pila de descarte y en su lista, así que los
 * totales de un tablero y de la lista a la que salta cuadran.
 *
 * Las opciones salen de los datos de la empresa (`/reportes/opciones-filtro`),
 * con cuántas llantas tiene cada una; las referencias se limitan a las marcas
 * elegidas.
 */
import { Autocomplete, Button, Chip, Stack, TextField } from '@mui/material'
import { FilterAltOff } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'

export interface FiltrosLlantas {
  marca: string[]
  referencia: string[]
  medida: string[]
  anio_fabricacion: number[]
  semana_fabricacion: number[]
}

export const FILTROS_VACIOS: FiltrosLlantas = { marca: [], referencia: [], medida: [], anio_fabricacion: [], semana_fabricacion: [] }

/** Valor que, en año o semana, pide las llantas sin DOT legible. */
export const SIN_DOT = 0

export const hayFiltros = (f: FiltrosLlantas) => Object.values(f).some(v => v.length > 0)

interface Opcion { valor: string; cantidad: number; marca?: string | null }
interface OpcionNumero { valor: number; cantidad: number }
interface Opciones { marcas: Opcion[]; referencias: Opcion[]; medidas: Opcion[]; anios: OpcionNumero[]; semanas: OpcionNumero[] }

const n = (x: number) => x.toLocaleString('es-CO')

export function FiltrosLlantasBarra({ alcance, valor, onChange }: {
  alcance: 'TODAS' | 'BAJA' | 'MONTADAS'
  valor: FiltrosLlantas
  onChange: (f: FiltrosLlantas) => void
}) {
  const { data } = useQuery<Opciones>({
    queryKey: ['eam-neu-opciones-filtro', alcance, valor.marca],
    queryFn: () => api.get('/eam/neumaticos/reportes/opciones-filtro', { params: { alcance, marca: valor.marca } }).then(r => r.data),
    placeholderData: prev => prev,
    staleTime: 60_000,
  })

  const texto = (campo: 'marca' | 'referencia' | 'medida', etiqueta: string, opciones: Opcion[], ancho: number) => (
    <Autocomplete
      multiple size="small" limitTags={1} sx={{ minWidth: ancho, maxWidth: ancho + 120 }}
      options={opciones.map(o => o.valor)}
      value={valor[campo]}
      onChange={(_, v) => onChange({
        ...valor, [campo]: v,
        // Quitar una marca deja fuera sus referencias elegidas.
        ...(campo === 'marca' ? { referencia: valor.referencia.filter(r => v.some(m => r.toUpperCase().startsWith(`${m.toUpperCase()} ·`))) } : {}),
      })}
      getOptionLabel={o => o}
      renderOption={(props, o) => {
        const op = opciones.find(x => x.valor === o)
        return <li {...props} key={o}>{o}{op ? <Chip size="small" label={n(op.cantidad)} sx={{ ml: 'auto', height: 18, fontSize: 10 }} /> : null}</li>
      }}
      renderInput={p => <TextField {...p} label={etiqueta} />}
    />
  )

  const numero = (campo: 'anio_fabricacion' | 'semana_fabricacion', etiqueta: string, opciones: OpcionNumero[], ancho: number) => (
    <Autocomplete
      multiple size="small" limitTags={2} sx={{ minWidth: ancho, maxWidth: ancho + 100 }}
      options={opciones.map(o => o.valor)}
      value={valor[campo]}
      onChange={(_, v) => onChange({ ...valor, [campo]: v })}
      getOptionLabel={o => (o === SIN_DOT ? 'Sin DOT válido' : String(o))}
      renderOption={(props, o) => {
        const op = opciones.find(x => x.valor === o)
        return <li {...props} key={o}>{o === SIN_DOT ? 'Sin DOT válido' : o}{op ? <Chip size="small" label={n(op.cantidad)} sx={{ ml: 'auto', height: 18, fontSize: 10 }} /> : null}</li>
      }}
      renderInput={p => <TextField {...p} label={etiqueta} />}
    />
  )

  return (
    <Stack direction="row" gap={1} flexWrap="wrap" alignItems="center" role="group" aria-label="Filtros de llantas">
      {texto('marca', 'Marca', data?.marcas ?? [], 150)}
      {texto('referencia', 'Referencia', data?.referencias ?? [], 190)}
      {texto('medida', 'Dimensión', data?.medidas ?? [], 150)}
      {numero('anio_fabricacion', 'Año de fabricación', data?.anios ?? [], 150)}
      {numero('semana_fabricacion', 'Semana de fabricación', data?.semanas ?? [], 160)}
      {hayFiltros(valor) && (
        <Button size="small" startIcon={<FilterAltOff />} onClick={() => onChange(FILTROS_VACIOS)} sx={{ textTransform: 'none' }}>
          Limpiar filtros
        </Button>
      )}
    </Stack>
  )
}
