/**
 * Lo que repiten las pantallas de datos de todos los módulos.
 *
 * Existe para que la respuesta a «¿y si no hay datos?» sea la misma en todas.
 * Cuando cada pantalla resuelve el vacío a su manera, la plataforma se siente
 * como cien programas distintos: una dice «Sin resultados», otra deja la tabla
 * en blanco, otra muestra un cero que parece un dato real.
 *
 * Nació dentro del CRM y se movió aquí al conectar el segundo módulo: copiarlo
 * habría sido garantizar que las dos copias se separaran en el primer arreglo.
 */
import { ReactNode } from 'react'
import { Box, CircularProgress, Typography, alpha } from '@mui/material'
import { InboxOutlined, ErrorOutline } from '@mui/icons-material'
import { COLOR_MODULO } from '@/config/marca'

export const ACENTO = COLOR_MODULO
export const BORDE = '#E5E7EB'

/** Un decimal del servidor llega como cadena. */
export const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''))
  return Number.isFinite(n) ? n : 0
}

/**
 * Pesos colombianos, abreviados según su tamaño.
 *
 * Un contrato de 1.680.000.000 escrito entero no se lee de un vistazo, y en una
 * tabla con quince filas obliga a contar ceros. Se abrevia a «$1.680 M». El
 * millón es la unidad con la que se habla acá: nadie dice «uno coma seis mil
 * millones», dice «mil seiscientos ochenta millones».
 */
export function pesos(v: unknown, opciones?: { exacto?: boolean }): string {
  const n = num(v)
  if (!n) return '—'
  if (opciones?.exacto) {
    return '$' + n.toLocaleString('es-CO', { maximumFractionDigits: 0 })
  }
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 0 })} M`
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toLocaleString('es-CO', { maximumFractionDigits: 0 })} K`
  return '$' + n.toLocaleString('es-CO', { maximumFractionDigits: 0 })
}

export const porcentaje = (v: unknown, decimales = 1): string =>
  `${num(v).toFixed(decimales)}%`

/** «12 mar 2026». El año importa: hay contratos que vencen en tres. */
export function fecha(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export function fechaHora(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-CO', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

/** UN_ESTADO_ASI → «Un estado asi». Los enums no se le enseñan al usuario. */
export const legible = (v?: string | null): string => {
  if (!v) return '—'
  const t = v.replace(/_/g, ' ').toLowerCase()
  return t.charAt(0).toUpperCase() + t.slice(1)
}

/**
 * El estado de una consulta, resuelto en un solo sitio.
 *
 * Los tres casos —cargando, falló, no hay nada— tienen que distinguirse. Una
 * tabla vacía porque la petición falló y una tabla vacía porque no hay clientes
 * se ven igual, y llevan a llamar a soporte por un problema que no existe, o a
 * no llamar por uno que sí.
 */
export function Estado({
  cargando, error, vacio, mensajeVacio, hint, children,
}: {
  cargando?: boolean
  error?: unknown
  vacio?: boolean
  mensajeVacio?: string
  hint?: string
  children: ReactNode
}) {
  if (cargando) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <CircularProgress size={28} sx={{ color: ACENTO }} />
      </Box>
    )
  }
  if (error) {
    const detalle = (error as any)?.response?.data?.detail
    return (
      <Box sx={{
        p: 3, textAlign: 'center', borderRadius: 2,
        border: `1px solid ${alpha('#EF4444', 0.3)}`,
        bgcolor: alpha('#EF4444', 0.05),
      }}>
        <ErrorOutline sx={{ fontSize: 30, color: '#EF4444', mb: 1 }} />
        <Typography sx={{ fontSize: 13.5, fontWeight: 600, color: '#B91C1C' }}>
          {typeof detalle === 'string' ? detalle : 'No se pudo cargar la información'}
        </Typography>
        <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
          Vuelva a intentarlo. Si sigue igual, avísele a su administrador.
        </Typography>
      </Box>
    )
  }
  if (vacio) {
    return (
      <Box sx={{ p: 5, textAlign: 'center' }}>
        <InboxOutlined sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
        <Typography sx={{ fontSize: 13.5, color: 'text.secondary', fontWeight: 600 }}>
          {mensajeVacio || 'Todavía no hay nada aquí'}
        </Typography>
        {hint && (
          <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 0.5 }}>
            {hint}
          </Typography>
        )}
      </Box>
    )
  }
  return <>{children}</>
}

/** Las cabeceras que se repiten en todas las tablas del módulo. */
export function Encabezados({ columnas }: { columnas: string[] }) {
  return (
    <thead>
      <tr>
        {columnas.map(h => (
          <th key={h} style={{
            padding: '10px 14px', textAlign: 'left', fontSize: 11,
            fontWeight: 600, color: '#6B7280',
            borderBottom: '1px solid #F1F5F9', whiteSpace: 'nowrap',
          }}>{h}</th>
        ))}
      </tr>
    </thead>
  )
}

/** La caja con borde donde vive cada tabla o panel del módulo. */
export function Panel({ children, sx }: { children: ReactNode; sx?: object }) {
  return (
    <Box sx={{
      bgcolor: 'background.paper', border: `1px solid ${BORDE}`,
      borderRadius: 2, overflow: 'hidden', ...sx,
    }}>
      {children}
    </Box>
  )
}

/** La cifra grande de arriba. Con su etiqueta, y sin inventarse un formato. */
export function Indicador({ etiqueta, valor, color, nota }: {
  etiqueta: string; valor: ReactNode; color?: string; nota?: string
}) {
  const c = color || ACENTO
  return (
    <Box sx={{
      bgcolor: alpha(c, 0.08), border: `1px solid ${alpha(c, 0.2)}`,
      borderRadius: 1.5, p: 1.5, textAlign: 'center', height: '100%',
    }}>
      <Typography sx={{ fontSize: 20, fontWeight: 900, color: c,
                        fontVariantNumeric: 'tabular-nums' }}>
        {valor}
      </Typography>
      <Typography sx={{ fontSize: 10.5, color: 'text.secondary' }}>
        {etiqueta}
      </Typography>
      {nota && (
        <Typography sx={{ fontSize: 9.5, color: 'text.disabled', mt: 0.25 }}>
          {nota}
        </Typography>
      )}
    </Box>
  )
}

/** La barra de salud del cliente. El color es el dato; el número lo confirma. */
export function BarraSalud({ score }: { score: number }) {
  const col = score >= 75 ? '#059669' : score >= 50 ? ACENTO : '#EF4444'
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ width: 50, height: 5, borderRadius: 3, bgcolor: '#EEF2F7', overflow: 'hidden' }}>
        <Box sx={{ height: '100%', width: `${Math.max(0, Math.min(100, score))}%`,
                   bgcolor: col, borderRadius: 3 }} />
      </Box>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: col,
                        fontVariantNumeric: 'tabular-nums' }}>
        {score}
      </Typography>
    </Box>
  )
}
