/**
 * GRC · Configuración
 *
 * Era una maqueta: «marcos normativos» con porcentajes de cumplimiento
 * inventados, umbrales y notificaciones que no se guardaban, e integraciones
 * marcadas como conectadas que no existen. Se quitaron.
 *
 * Queda lo que es real: las escalas con que el servidor valora los riesgos
 * —para que quien registra sepa cómo se calcula la prioridad— y los catálogos
 * del módulo, que sí se administran.
 */
import { useState } from 'react'
import { Box, Paper, Tabs, Tab, Typography, Table, TableBody, TableCell, TableHead, TableRow, alpha } from '@mui/material'
import { Settings } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import { AdminCatalogos } from '@/components/catalogo/AdminCatalogos'
import { Encabezado, Etiqueta } from '@/components/comun/Registro'
import { PROBABILIDAD, IMPACTO, PRIORIDAD_COLOR, prioridadDe } from '@/components/grc/etiquetas'
import { COLOR_MODULO } from '@/config/marca'

const GRC_COLOR = COLOR_MODULO

export default function GRCConfig() {
  const [tab, setTab] = useState(0)
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Settings sx={{ fontSize: 28 }} />} titulo="Configuración GRC" subtitulo="GRC · Escalas de valoración y catálogos" color={GRC_COLOR} />
        <Paper variant="outlined" sx={{ borderRadius: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid #E5E7EB' }}>
            <Tab label="Escala de riesgos" /><Tab label="Catálogos" />
          </Tabs>
          <Box sx={{ p: 3 }}>
            {tab === 0 && (
              <Box sx={{ maxWidth: 820 }}>
                <Typography fontSize={13} mb={2}>
                  Cada riesgo se valora con probabilidad (1 a 5) por impacto (1 a 5). La prioridad la calcula el servidor con el nivel
                  <b> residual</b> —el que queda después de los controles— y, si no se ha valorado, con el inherente:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                  <Etiqueta texto="Crítica · 15 a 25" color={PRIORIDAD_COLOR.critica} />
                  <Etiqueta texto="Alta · 10 a 14" color={PRIORIDAD_COLOR.alta} />
                  <Etiqueta texto="Media · 5 a 9" color={PRIORIDAD_COLOR.media} />
                  <Etiqueta texto="Baja · 1 a 4" color={PRIORIDAD_COLOR.baja} />
                </Box>
                <Table size="small" sx={{ '& td, & th': { fontSize: 12, textAlign: 'center' } }}>
                  <TableHead><TableRow><TableCell sx={{ textAlign: 'left !important' }}>Probabilidad ↓ / Impacto →</TableCell>{IMPACTO.map(([v, l]) => <TableCell key={v}>{l}</TableCell>)}</TableRow></TableHead>
                  <TableBody>
                    {[...PROBABILIDAD].reverse().map(([p, lp]) => (
                      <TableRow key={p}>
                        <TableCell sx={{ textAlign: 'left !important' }}>{lp}</TableCell>
                        {IMPACTO.map(([i]) => { const c = PRIORIDAD_COLOR[prioridadDe(p * i)]; return <TableCell key={i} sx={{ bgcolor: alpha(c, 0.18), color: c, fontWeight: 700 }}>{p * i}</TableCell> })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
            {tab === 1 && <AdminCatalogos modulo="GRC" color={COLOR_MODULO} />}
          </Box>
        </Paper>
      </Box>
    </Layout>
  )
}
