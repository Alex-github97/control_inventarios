/** /app-movil: a donde lleva el QR. En el teléfono se descarga desde aquí. */
import { Alert, Box, Paper } from '@mui/material'
import { AppsMoviles, useTieneCmms } from '@/components/AppMovil'

export default function AppMovil() {
  const tiene = useTieneCmms()
  return (
    <Box className="anim-page-in" sx={{ p: { xs: 2, md: 3 }, maxWidth: 900, mx: 'auto' }}>
      <Paper sx={{ p: { xs: 2.5, md: 4 } }}>
        {tiene ? <AppsMoviles inicial={new URLSearchParams(window.location.search).get('app') === 'lite' ? 'lite' : 'cmms'} /> : (
          <Alert severity="info">La app móvil acompaña al CMMS, y su empresa no lo tiene contratado.</Alert>
        )}
      </Paper>
    </Box>
  )
}
