import React, { useEffect, useRef } from 'react'
import { Box, Typography } from '@mui/material'
import { cargarLeaflet, TESELAS, ATRIBUCION } from './leaflet'

export interface PuntoMapa {
  lat: number
  lng: number
  etiqueta?: string
}

interface Props {
  origen?: PuntoMapa | null
  destino?: PuntoMapa | null
  /** El rastro recorrido, en orden. Se dibuja como línea continua. */
  recorrido?: PuntoMapa[]
  /** Dónde está ahora. Es el punto que se resalta. */
  actual?: PuntoMapa | null
  altura?: number | string
  color?: string
}

/**
 * El mapa de un viaje: de dónde salió, por dónde va y a dónde llega.
 *
 * QUÉ DIBUJA Y QUÉ NO
 * La línea es el rastro de posiciones que reportó el vehículo, no la ruta
 * calculada por carretera. Son cosas distintas y conviene no confundirlas: unir
 * dos reportes de GPS con una recta no dice por dónde pasó el camión entre uno y
 * otro. Se dibuja lo que se sabe —los puntos reportados— y nada más; pintar una
 * ruta trazada sobre la malla vial sugeriría una precisión que este dato no
 * tiene.
 *
 * CUANDO NO HAY COORDENADAS
 * No se dibuja un mapa vacío del mundo: se dice que no hay posición. Un mapa
 * centrado en el océano es peor que ningún mapa, porque parece que el vehículo
 * está ahí.
 */
export function MapaSeguimiento({
  origen, destino, recorrido = [], actual,
  altura = 340, color = '#2563EB',
}: Props) {
  const contenedor = useRef<HTMLDivElement>(null)
  const mapa = useRef<any>(null)
  const capa = useRef<any>(null)
  const [error, setError] = React.useState(false)

  const puntos = [
    ...(origen ? [origen] : []),
    ...recorrido,
    ...(actual ? [actual] : []),
    ...(destino ? [destino] : []),
  ].filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng))

  useEffect(() => {
    let cancelado = false
    if (!puntos.length) return

    cargarLeaflet().then((L) => {
      if (cancelado || !contenedor.current) return

      if (!mapa.current) {
        mapa.current = L.map(contenedor.current, {
          scrollWheelZoom: false,   // la rueda es para desplazar la página
          zoomControl: true,
        }).setView([4.6, -74.08], 5)
        L.tileLayer(TESELAS, { attribution: ATRIBUCION, maxZoom: 19 })
          .addTo(mapa.current)
      }
      const m = mapa.current
      if (capa.current) { m.removeLayer(capa.current); capa.current = null }

      const grupo = L.layerGroup()

      const trazo = [...(origen ? [origen] : []), ...recorrido,
                     ...(actual ? [actual] : [])]
        .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lng))
        .map(p => [p.lat, p.lng])
      if (trazo.length > 1) {
        grupo.addLayer(L.polyline(trazo, {
          color, weight: 4, opacity: 0.85,
        }))
      }
      // Lo que falta por recorrer va punteado: es una estimación, no un rastro.
      if (actual && destino) {
        grupo.addLayer(L.polyline([[actual.lat, actual.lng],
                                   [destino.lat, destino.lng]], {
          color, weight: 3, opacity: 0.35, dashArray: '6 8',
        }))
      }

      if (origen) {
        grupo.addLayer(L.circleMarker([origen.lat, origen.lng], {
          radius: 7, color: '#fff', weight: 2,
          fillColor: '#16A34A', fillOpacity: 1,
        }).bindPopup(`Origen: ${origen.etiqueta ?? ''}`))
      }
      if (destino) {
        grupo.addLayer(L.circleMarker([destino.lat, destino.lng], {
          radius: 7, color: '#fff', weight: 2,
          fillColor: '#DC2626', fillOpacity: 1,
        }).bindPopup(`Destino: ${destino.etiqueta ?? ''}`))
      }
      if (actual) {
        grupo.addLayer(L.circleMarker([actual.lat, actual.lng], {
          radius: 10, color: '#fff', weight: 3,
          fillColor: color, fillOpacity: 1,
        }).bindPopup(actual.etiqueta ?? 'Última posición reportada'))
      }

      grupo.addTo(m)
      capa.current = grupo
      try {
        m.fitBounds(puntos.map(p => [p.lat, p.lng]), { padding: [34, 34] })
      } catch { /* un solo punto: se queda con la vista por omisión */ }
      // El mapa se monta dentro de un panel que puede estar creciendo todavía;
      // sin esto queda con el tamaño que tenía el contenedor al inicio y las
      // teselas salen cortadas.
      setTimeout(() => m.invalidateSize(), 140)
    }).catch(() => { if (!cancelado) setError(true) })

    return () => { cancelado = true }
  }, [JSON.stringify(puntos), color])

  useEffect(() => () => {
    if (mapa.current) { mapa.current.remove(); mapa.current = null }
  }, [])

  if (!puntos.length || error) {
    return (
      <Box sx={{
        height: altura, borderRadius: '12px', display: 'grid',
        placeItems: 'center', bgcolor: '#0F172A', color: '#94A3B8',
        border: '1px solid rgba(148,163,184,.25)', px: 3, textAlign: 'center',
      }}>
        <Typography sx={{ fontSize: 13 }}>
          {error
            ? 'No se pudo cargar el mapa. Revise la conexión.'
            : 'Este viaje todavía no tiene posiciones reportadas.'}
        </Typography>
      </Box>
    )
  }

  return (
    <Box ref={contenedor} sx={{
      height: altura, width: '100%', borderRadius: '12px',
      overflow: 'hidden', border: '1px solid rgba(148,163,184,.25)',
      bgcolor: '#EEF2F6',
      // Leaflet pone sus controles en z-index 1000 y se montan encima de los
      // diálogos de MUI. Bajarlos dentro del contenedor lo evita.
      '& .leaflet-pane, & .leaflet-control': { zIndex: 1 },
    }} />
  )
}
