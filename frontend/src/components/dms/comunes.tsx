/**
 * Lo propio de la gestión documental, sobre las piezas comunes.
 *
 * Aquí solo lo que significa algo únicamente en el archivo documental: qué
 * estado tiene un documento, cuánto le queda de vigencia, cómo se llama cada
 * acción del rastro de auditoría.
 */
import { Box, Chip, Tooltip, alpha } from '@mui/material'
import {
  Description, PictureAsPdf, TableChart, Image as ImagenIcono, Article,
} from '@mui/icons-material'
import { ACENTO, legible } from '@/components/datos/vista'

export {
  ACENTO as DMS_COLOR, BORDE, num, pesos, fecha, fechaHora, legible,
  Estado, Encabezados, Panel, Indicador,
} from '@/components/datos/vista'

/** El estado dice en qué punto de su vida está el documento. */
export const COLOR_ESTADO: Record<string, string> = {
  BORRADOR: '#94A3B8',
  EN_REVISION: '#F59E0B',
  APROBADO: '#0EA5E9',
  PUBLICADO: '#059669',
  OBSOLETO: '#EF4444',
  ARCHIVADO: '#6B7280',
}

export const COLOR_FIRMA: Record<string, string> = {
  PENDIENTE: '#F59E0B', FIRMADO: '#059669', RECHAZADO: '#EF4444',
}

export const COLOR_INSTANCIA: Record<string, string> = {
  EN_CURSO: '#0EA5E9', COMPLETADO: '#059669',
  RECHAZADO: '#EF4444', CANCELADO: '#94A3B8',
}

export const COLOR_EXPEDIENTE: Record<string, string> = {
  EMPLEADO: '#7C3AED', CONDUCTOR: '#0EA5E9', VEHICULO: '#059669',
  CLIENTE: ACENTO, PROVEEDOR: '#F59E0B', PROYECTO: '#6B7280',
}

/** El icono que corresponde a un archivo, por su tipo. */
export function IconoArchivo({ mime, nombre, size = 18 }: {
  mime?: string | null; nombre?: string | null; size?: number
}) {
  const t = `${mime || ''} ${nombre || ''}`.toLowerCase()
  const sx = { fontSize: size }
  if (t.includes('pdf')) return <PictureAsPdf sx={{ ...sx, color: '#DC2626' }} />
  if (t.includes('sheet') || t.includes('xls') || t.includes('csv'))
    return <TableChart sx={{ ...sx, color: '#059669' }} />
  if (t.includes('image') || /\.(png|jpe?g|gif|webp)$/.test(t))
    return <ImagenIcono sx={{ ...sx, color: '#7C3AED' }} />
  if (t.includes('word') || t.includes('doc'))
    return <Article sx={{ ...sx, color: '#2563EB' }} />
  return <Description sx={{ ...sx, color: '#6B7280' }} />
}

/**
 * Cuánto le queda de vigencia a un documento.
 *
 * Es la pregunta que se le hace de verdad a un archivo documental: no «qué
 * tengo» sino «qué se me está venciendo». Sin fecha de fin no hay respuesta, y
 * decir «vigente» cuando no se sabe es peor que decir que no se sabe.
 */
export function vigencia(fin?: string | null): {
  dias: number | null; texto: string; color: string
} {
  if (!fin) return { dias: null, texto: 'sin vencimiento', color: '#94A3B8' }
  const d = Math.round(
    (new Date(fin).getTime() - Date.now()) / 86_400_000)
  if (d < 0) {
    const pasados = -d
    return {
      dias: d,
      texto: pasados >= 60 ? `venció hace ${Math.round(pasados / 30)} meses`
             : `venció hace ${pasados} día(s)`,
      color: '#EF4444',
    }
  }
  if (d <= 30) return { dias: d, texto: `vence en ${d} día(s)`, color: '#F59E0B' }
  if (d <= 90) return { dias: d, texto: `vence en ${Math.round(d / 30)} meses`, color: '#0EA5E9' }
  return { dias: d, texto: `vigente hasta ${new Date(fin).toLocaleDateString('es-CO')}`,
           color: '#059669' }
}

/** La etiqueta de estado, siempre igual en todo el módulo. */
export function ChipEstado({ estado, size = 'small' }: {
  estado: string; size?: 'small' | 'medium'
}) {
  const c = COLOR_ESTADO[estado] || '#94A3B8'
  return (
    <Chip label={legible(estado)} size={size} sx={{
      bgcolor: alpha(c, 0.15), color: c,
      border: `1px solid ${alpha(c, 0.3)}`,
      fontSize: 10, fontWeight: 700,
    }} />
  )
}

/** La barra de vigencia: el color es el dato, el texto lo confirma. */
export function BarraVigencia({ fin }: { fin?: string | null }) {
  const v = vigencia(fin)
  return (
    <Tooltip title={fin ? new Date(fin).toLocaleDateString('es-CO') : 'Sin fecha de vencimiento'}>
      <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
        <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: v.color }} />
        <Box component="span" sx={{ fontSize: 11.5, color: v.color,
                                    fontWeight: v.dias != null && v.dias <= 30 ? 700 : 400 }}>
          {v.texto}
        </Box>
      </Box>
    </Tooltip>
  )
}
