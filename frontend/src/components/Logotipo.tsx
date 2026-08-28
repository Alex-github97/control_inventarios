/**
 * Logotipo de TittanWare.
 *
 * Se dibuja con tipografía y no con una imagen: el logo ES Montserrat SemiBold
 * con espaciado, así que reproducirlo en texto da el mismo resultado, escala a
 * cualquier tamaño sin perder nitidez y se adapta al fondo sobre el que va.
 *
 * Si más adelante quieren usar el archivo original, basta dejarlo en
 * `public/logo-tittanware.svg` y cambiar este componente por una <img>.
 */
import { Box, Typography } from '@mui/material'
import { MARCA, PALETA } from '@/config/marca'

export function Logotipo({
  tamano = 28, conLema = false, claro = false,
}: {
  /** Altura de las letras, en píxeles. */
  tamano?: number
  /** Muestra el lema bajo el nombre, como en el logo completo. */
  conLema?: boolean
  /** Para fondos oscuros. */
  claro?: boolean
}) {
  const color = claro ? '#FFFFFF' : PALETA.tinta
  const colorLema = claro ? PALETA.niebla : PALETA.acero

  return (
    <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
      <Typography
        component="span"
        sx={{
          fontFamily: '"Montserrat", sans-serif',
          fontWeight: 600,
          fontSize: tamano,
          // El espaciado amplio es lo que le da su carácter al logotipo.
          letterSpacing: '0.22em',
          // Compensa el espaciado del último carácter para que el bloque quede
          // centrado de verdad.
          textIndent: '0.22em',
          lineHeight: 1,
          color,
          whiteSpace: 'nowrap',
        }}
      >
        {MARCA.logotipo}
      </Typography>

      {conLema && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: tamano * 0.28 + 'px' }}>
          <Box sx={{ width: tamano * 0.6, height: '1px', bgcolor: colorLema, opacity: 0.6 }} />
          <Typography
            component="span"
            sx={{
              fontFamily: '"Montserrat", sans-serif',
              fontWeight: 500,
              fontSize: Math.max(7, tamano * 0.26),
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: colorLema,
              whiteSpace: 'nowrap',
            }}
          >
            {MARCA.lema}
          </Typography>
          <Box sx={{ width: tamano * 0.6, height: '1px', bgcolor: colorLema, opacity: 0.6 }} />
        </Box>
      )}
    </Box>
  )
}
