/**
 * Plantilla y cargue masivo para cualquier catálogo del CMMS.
 *
 * Envuelve a `CargueMasivo` resolviendo lo único que cambia entre catálogos:
 * de dónde salen las columnas y a qué ruta se envían las filas. Las columnas
 * las declara el servidor, así que agregar un catálogo nuevo al cargue es una
 * entrada en su registro y nada más — no hay que tocar esta pantalla.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient as api } from '@/api/client'
import { CargueMasivo, type ColumnaPlantilla } from './CargueMasivo'

/** Qué listas hay que refrescar cuando un cargue crea registros. */
const A_REFRESCAR: Record<string, string[]> = {
  'tipos-trabajo': ['eam-tipos-trabajo-completo'],
  'centros-costo': ['eam-centros-costo'],
  'tipos-activo': ['eam-tipos-activo', 'catalogo-vehiculos-tipos'],
  marcas: ['catalogo-vehiculos-marcas'],
  lineas: ['catalogo-vehiculos-lineas'],
  modelos: ['catalogo-vehiculos-modelos'],
  motores: ['catalogo-vehiculos-motores'],
  combustibles: ['catalogo-vehiculos-combustibles'],
}

export function CargueCatalogoEAM({
  ruta, color, compacto = true,
}: {
  ruta: string
  color?: string
  compacto?: boolean
}) {
  const qc = useQueryClient()

  const { data } = useQuery<{ titulo: string; columnas: ColumnaPlantilla[] }>({
    queryKey: ['plantilla-catalogo', ruta],
    queryFn: () => api.get(`/eam/catalogos/${ruta}/plantilla`).then(r => r.data),
    staleTime: Infinity,
  })

  if (!data?.columnas) return null

  return (
    <CargueMasivo
      compacto={compacto}
      titulo={data.titulo}
      nombreArchivo={`plantilla-${ruta}`}
      columnas={data.columnas}
      color={color}
      onImportar={filas =>
        api.post(`/eam/catalogos/${ruta}/importar`, { filas }).then(r => r.data)}
      onListo={() => {
        for (const clave of A_REFRESCAR[ruta] ?? []) {
          qc.invalidateQueries({ queryKey: [clave] })
        }
        // Las pantallas que consumen estos catálogos pueden tener otras claves;
        // un refresco general evita que muestren datos viejos tras un cargue.
        qc.invalidateQueries()
      }}
    />
  )
}
