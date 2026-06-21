import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  alpha,
  Grid,
  Button,
  Tab,
  Tabs,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
} from '@mui/material'
import {
  CalendarMonth,
  PlayArrow,
  Publish,
  Factory,
  LocalShipping,
  Inventory,
  AccountTree,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const APS_COLOR = '#7C3AED'
const APS_COLOR_DARK = '#6D28D9'

// ─── Mock Data ────────────────────────────────────────────────────────────────

const mpsPlanData = [
  { id: 'OP-001', producto: 'Paleta Industrial 1200x1000', cantidad: 500, periodo: 'Sem 25', planta: 'Planta A', recurso: 'Línea 1', estado: 'LIBERADA', inicio: 10, duracion: 25 },
  { id: 'OP-002', producto: 'Estiba Plástica 1100x1100', cantidad: 320, periodo: 'Sem 25', planta: 'Planta A', recurso: 'Línea 2', estado: 'PLANEADA', inicio: 5, duracion: 30 },
  { id: 'OP-003', producto: 'Caja Corrugada Doble Canal', cantidad: 2400, periodo: 'Sem 26', planta: 'Planta B', recurso: 'Línea 3', estado: 'PLANEADA', inicio: 35, duracion: 20 },
  { id: 'OP-004', producto: 'Zuncho Plástico 16mm', cantidad: 800, periodo: 'Sem 26', planta: 'Planta B', recurso: 'Línea 1', estado: 'LIBERADA', inicio: 40, duracion: 15 },
  { id: 'OP-005', producto: 'Film Stretch 500m', cantidad: 1200, periodo: 'Sem 27', planta: 'Planta C', recurso: 'Línea 4', estado: 'PLANEADA', inicio: 55, duracion: 18 },
  { id: 'OP-006', producto: 'Esquinero Cartón 50mm', cantidad: 3600, periodo: 'Sem 27', planta: 'Planta A', recurso: 'Línea 2', estado: 'PLANEADA', inicio: 60, duracion: 22 },
  { id: 'OP-007', producto: 'Paleta Exportación 1200x800', cantidad: 250, periodo: 'Sem 28', planta: 'Planta B', recurso: 'Línea 3', estado: 'PLANEADA', inicio: 70, duracion: 28 },
  { id: 'OP-008', producto: 'Tapa Metálica TM-200', cantidad: 1800, periodo: 'Sem 28', planta: 'Planta C', recurso: 'Línea 1', estado: 'LIBERADA', inicio: 75, duracion: 12 },
]

const mrpData = [
  { producto: 'Madera Pino 2"x4"', demanda_bruta: 1200, stock_inicial: 300, recepciones: 500, disponible_neto: 400, req_neto: 800, orden_sugerida: 1000, tipo: 'COMPRA', fecha_emision: '2026-06-20', fecha_recepcion: '2026-06-27' },
  { producto: 'Resina Polipropileno', demanda_bruta: 800, stock_inicial: 950, recepciones: 0, disponible_neto: 650, req_neto: 0, orden_sugerida: 0, tipo: '-', fecha_emision: '-', fecha_recepcion: '-' },
  { producto: 'Cartón Liner 200g/m²', demanda_bruta: 5000, stock_inicial: 800, recepciones: 1200, disponible_neto: 1200, req_neto: 3800, orden_sugerida: 4000, tipo: 'COMPRA', fecha_emision: '2026-06-22', fecha_recepcion: '2026-06-29' },
  { producto: 'Pigmento Negro', demanda_bruta: 150, stock_inicial: 80, recepciones: 50, disponible_neto: 80, req_neto: 70, orden_sugerida: 100, tipo: 'COMPRA', fecha_emision: '2026-06-21', fecha_recepcion: '2026-06-28' },
  { producto: 'Adhesivo PVA', demanda_bruta: 200, stock_inicial: 220, recepciones: 0, disponible_neto: 120, req_neto: 0, orden_sugerida: 0, tipo: '-', fecha_emision: '-', fecha_recepcion: '-' },
  { producto: 'Fleje Metálico 32mm', demanda_bruta: 600, stock_inicial: 100, recepciones: 200, disponible_neto: 150, req_neto: 450, orden_sugerida: 500, tipo: 'COMPRA', fecha_emision: '2026-06-23', fecha_recepcion: '2026-06-30' },
  { producto: 'Film LLDPE 23 micras', demanda_bruta: 900, stock_inicial: 200, recepciones: 300, disponible_neto: 400, req_neto: 500, orden_sugerida: 600, tipo: 'PRODUCCION', fecha_emision: '2026-06-24', fecha_recepcion: '2026-07-01' },
  { producto: 'Papel Kraft 90g/m²', demanda_bruta: 2000, stock_inicial: 400, recepciones: 600, disponible_neto: 600, req_neto: 1400, orden_sugerida: 1500, tipo: 'COMPRA', fecha_emision: '2026-06-20', fecha_recepcion: '2026-06-27' },
]

const drpData = [
  { planta: 'Planta A - Bogotá', familia: 'Paletas', stock_actual: 1200, stock_seguridad: 500, requerimiento: 800, traslado: 0, estado: 'OK' },
  { planta: 'Bodega Central - Medellín', familia: 'Paletas', stock_actual: 180, stock_seguridad: 400, requerimiento: 600, traslado: 420, estado: 'BAJO' },
  { planta: 'CD Cali', familia: 'Estibas Plásticas', stock_actual: 850, stock_seguridad: 300, requerimiento: 400, traslado: 0, estado: 'OK' },
  { planta: 'Planta B - Barranquilla', familia: 'Cajas Corrugado', stock_actual: 3200, stock_seguridad: 1000, requerimiento: 2800, traslado: 0, estado: 'OK' },
  { planta: 'Bodega Norte - Bucaramanga', familia: 'Cajas Corrugado', stock_actual: 400, stock_seguridad: 800, requerimiento: 1200, traslado: 800, estado: 'BAJO' },
  { planta: 'Planta C - Pereira', familia: 'Film Stretch', stock_actual: 2100, stock_seguridad: 600, requerimiento: 500, traslado: 0, estado: 'EXCESO' },
]

const networkNodes = [
  { id: 'pa', label: 'Planta A\nBogotá', x: 20, y: 35, type: 'planta' },
  { id: 'pb', label: 'Planta B\nBarranquilla', x: 20, y: 65, type: 'planta' },
  { id: 'pc', label: 'Planta C\nPereira', x: 20, y: 50, type: 'planta' },
  { id: 'cc', label: 'CD Central\nMedellín', x: 50, y: 50, type: 'cd' },
  { id: 'bn', label: 'Bodega Norte\nBucaramanga', x: 80, y: 30, type: 'bodega' },
  { id: 'bc', label: 'Bodega Cali\nCali', x: 80, y: 70, type: 'bodega' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card sx={{ bgcolor: alpha(color, 0.08), border: `1px solid ${alpha(color, 0.3)}`, flex: 1 }}>
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="caption" sx={{ color: alpha(color, 0.8), fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, color, mt: 0.5 }}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  )
}

function TabMPS({ horizonte, setHorizonte }: { horizonte: string; setHorizonte: (v: string) => void }) {
  return (
    <Box>
      {/* KPIs */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <KpiCard label="Adherencia al Plan" value="88.7%" color={APS_COLOR} />
        <KpiCard label="Variación vs Demanda" value="3.2%" color="#0EA5E9" />
        <KpiCard label="Órdenes Planificadas" value="8" color="#10B981" />
        <KpiCard label="Horizonte" value={horizonte} color="#F59E0B" />
      </Stack>

      {/* Controls */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>Gantt — Plan Maestro de Producción</Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Horizonte</InputLabel>
            <Select value={horizonte} label="Horizonte" onChange={e => setHorizonte(e.target.value)}>
              <MenuItem value="Semanal">Semanal</MenuItem>
              <MenuItem value="Mensual">Mensual</MenuItem>
              <MenuItem value="Trimestral">Trimestral</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" startIcon={<Publish />} sx={{ bgcolor: APS_COLOR, '&:hover': { bgcolor: APS_COLOR_DARK } }}>
            Publicar Plan
          </Button>
        </Stack>
      </Stack>

      {/* Gantt Header */}
      <Paper sx={{ border: `1px solid ${alpha(APS_COLOR, 0.2)}`, overflow: 'hidden' }}>
        <Box sx={{ bgcolor: alpha(APS_COLOR, 0.1), px: 2, py: 1, display: 'flex' }}>
          <Box sx={{ width: 200, flexShrink: 0 }}>
            <Typography variant="caption" fontWeight={700} color={APS_COLOR}>ORDEN / PRODUCTO</Typography>
          </Box>
          <Box sx={{ flex: 1, display: 'flex' }}>
            {['Sem 25', 'Sem 26', 'Sem 27', 'Sem 28'].map(s => (
              <Box key={s} sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">{s}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {mpsPlanData.map((op, i) => (
          <Box key={op.id} sx={{
            display: 'flex', alignItems: 'center', px: 2, py: 1.5,
            bgcolor: i % 2 === 0 ? 'background.paper' : alpha(APS_COLOR, 0.03),
            borderTop: `1px solid ${alpha(APS_COLOR, 0.08)}`,
          }}>
            <Box sx={{ width: 200, flexShrink: 0 }}>
              <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.2 }}>{op.id}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
                {op.producto.length > 25 ? op.producto.slice(0, 25) + '…' : op.producto}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, position: 'relative', height: 28 }}>
              <Box sx={{
                position: 'absolute',
                left: `${op.inicio}%`,
                width: `${op.duracion}%`,
                height: '100%',
                bgcolor: op.estado === 'LIBERADA' ? APS_COLOR : alpha(APS_COLOR, 0.5),
                borderRadius: 1,
                display: 'flex',
                alignItems: 'center',
                px: 1,
                overflow: 'hidden',
              }}>
                <Typography variant="caption" sx={{ color: 'white', fontWeight: 600, whiteSpace: 'nowrap', fontSize: 10 }}>
                  {op.cantidad.toLocaleString()} un
                </Typography>
              </Box>
            </Box>
          </Box>
        ))}
      </Paper>

      {/* Detail Table */}
      <Paper sx={{ mt: 3, border: `1px solid ${alpha(APS_COLOR, 0.15)}` }}>
        <Box sx={{ bgcolor: alpha(APS_COLOR, 0.06), px: 2, py: 1.5 }}>
          <Typography variant="subtitle2" fontWeight={700} color={APS_COLOR}>Detalle de Órdenes de Producción</Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(APS_COLOR, 0.04) }}>
              {['Orden', 'Producto', 'Cantidad', 'Período', 'Planta', 'Recurso', 'Estado'].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: APS_COLOR }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {mpsPlanData.map(op => (
              <TableRow key={op.id} hover>
                <TableCell sx={{ fontWeight: 600, color: APS_COLOR }}>{op.id}</TableCell>
                <TableCell>{op.producto}</TableCell>
                <TableCell>{op.cantidad.toLocaleString()}</TableCell>
                <TableCell>{op.periodo}</TableCell>
                <TableCell>{op.planta}</TableCell>
                <TableCell>{op.recurso}</TableCell>
                <TableCell>
                  <Chip
                    label={op.estado}
                    size="small"
                    sx={{
                      bgcolor: op.estado === 'LIBERADA' ? alpha('#10B981', 0.15) : alpha('#F59E0B', 0.15),
                      color: op.estado === 'LIBERADA' ? '#10B981' : '#F59E0B',
                      fontWeight: 700, fontSize: 10,
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}

function TabMRP() {
  const totalOrdenes = mrpData.filter(r => r.orden_sugerida > 0).length
  const valorEstimado = mrpData.reduce((s, r) => s + r.orden_sugerida * 1850, 0)

  return (
    <Box>
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <KpiCard label="Total Órdenes Sugeridas" value={String(totalOrdenes)} color={APS_COLOR} />
        <KpiCard label="Valor Estimado" value={`$${(valorEstimado / 1e6).toFixed(1)}M`} color="#0EA5E9" />
        <KpiCard label="Items con Req. Neto > 0" value={String(mrpData.filter(r => r.req_neto > 0).length)} color="#EF4444" />
      </Stack>

      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={700}>Explosión de Materiales — MRP</Typography>
        <Button variant="contained" startIcon={<PlayArrow />} sx={{ bgcolor: APS_COLOR, '&:hover': { bgcolor: APS_COLOR_DARK } }}>
          Ejecutar MRP
        </Button>
      </Stack>

      <Paper sx={{ border: `1px solid ${alpha(APS_COLOR, 0.15)}`, overflow: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(APS_COLOR, 0.08) }}>
              {['Producto', 'Dem. Bruta', 'Stock Inicial', 'Rec. Planeadas', 'Disp. Neto', 'Req. Neto', 'Orden Sugerida', 'Tipo Orden', 'F. Emisión', 'F. Recepción'].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 10, color: APS_COLOR, whiteSpace: 'nowrap' }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {mrpData.map((row, i) => (
              <TableRow key={i} hover sx={{ bgcolor: row.req_neto > 0 ? alpha('#EF4444', 0.04) : 'inherit' }}>
                <TableCell sx={{ fontWeight: 600, fontSize: 12 }}>{row.producto}</TableCell>
                <TableCell>{row.demanda_bruta.toLocaleString()}</TableCell>
                <TableCell>{row.stock_inicial.toLocaleString()}</TableCell>
                <TableCell>{row.recepciones.toLocaleString()}</TableCell>
                <TableCell>{row.disponible_neto.toLocaleString()}</TableCell>
                <TableCell sx={{ color: row.req_neto > 0 ? '#EF4444' : 'inherit', fontWeight: row.req_neto > 0 ? 700 : 400 }}>
                  {row.req_neto.toLocaleString()}
                </TableCell>
                <TableCell sx={{ color: row.orden_sugerida > 0 ? APS_COLOR : 'inherit', fontWeight: 700 }}>
                  {row.orden_sugerida > 0 ? row.orden_sugerida.toLocaleString() : '-'}
                </TableCell>
                <TableCell>
                  {row.tipo !== '-' && (
                    <Chip label={row.tipo} size="small" sx={{ bgcolor: alpha(APS_COLOR, 0.12), color: APS_COLOR, fontWeight: 700, fontSize: 10 }} />
                  )}
                </TableCell>
                <TableCell sx={{ fontSize: 11 }}>{row.fecha_emision}</TableCell>
                <TableCell sx={{ fontSize: 11 }}>{row.fecha_recepcion}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}

function TabDRP() {
  const estadoColor = (e: string) => e === 'OK' ? '#10B981' : e === 'BAJO' ? '#EF4444' : '#F59E0B'

  return (
    <Box>
      <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>Red de Distribución — DRP</Typography>

      {/* Network Visual */}
      <Paper sx={{ p: 3, mb: 3, border: `1px solid ${alpha(APS_COLOR, 0.2)}`, bgcolor: alpha(APS_COLOR, 0.02) }}>
        <Typography variant="subtitle2" fontWeight={700} color={APS_COLOR} sx={{ mb: 2 }}>
          Mapa de Red Logística
        </Typography>
        <Box sx={{ position: 'relative', height: 180, overflow: 'hidden' }}>
          {/* SVG Lines */}
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
            {/* Planta A → CD Central */}
            <line x1="20%" y1="35%" x2="50%" y2="50%" stroke={alpha(APS_COLOR, 0.4)} strokeWidth={2} strokeDasharray="4 2" />
            {/* Planta B → CD Central */}
            <line x1="20%" y1="65%" x2="50%" y2="50%" stroke={alpha(APS_COLOR, 0.4)} strokeWidth={2} strokeDasharray="4 2" />
            {/* Planta C → CD Central */}
            <line x1="20%" y1="50%" x2="50%" y2="50%" stroke={alpha(APS_COLOR, 0.4)} strokeWidth={2} strokeDasharray="4 2" />
            {/* CD Central → Bodegas */}
            <line x1="50%" y1="50%" x2="80%" y2="30%" stroke="#10B981" strokeWidth={2} />
            <line x1="50%" y1="50%" x2="80%" y2="70%" stroke="#10B981" strokeWidth={2} />
          </svg>

          {/* Nodes */}
          {networkNodes.map(n => (
            <Box key={n.id} sx={{
              position: 'absolute',
              left: `${n.x}%`,
              top: `${n.y}%`,
              transform: 'translate(-50%, -50%)',
              bgcolor: n.type === 'planta' ? APS_COLOR : n.type === 'cd' ? '#0EA5E9' : '#10B981',
              color: 'white',
              px: 1.5, py: 0.8,
              borderRadius: 1.5,
              textAlign: 'center',
              minWidth: 90,
              boxShadow: `0 2px 8px ${alpha(APS_COLOR, 0.3)}`,
              zIndex: 1,
            }}>
              {n.label.split('\n').map((l, i) => (
                <Typography key={i} variant="caption" sx={{ display: 'block', fontWeight: i === 0 ? 700 : 400, fontSize: i === 0 ? 11 : 9 }}>
                  {l}
                </Typography>
              ))}
            </Box>
          ))}
        </Box>

        <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
          {[['Plantas', APS_COLOR], ['CD / Hub', '#0EA5E9'], ['Bodegas Destino', '#10B981']].map(([l, c]) => (
            <Stack key={l as string} direction="row" alignItems="center" spacing={0.5}>
              <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: c as string }} />
              <Typography variant="caption" color="text.secondary">{l as string}</Typography>
            </Stack>
          ))}
        </Stack>
      </Paper>

      {/* DRP Table */}
      <Paper sx={{ border: `1px solid ${alpha(APS_COLOR, 0.15)}` }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: alpha(APS_COLOR, 0.08) }}>
              {['Planta / Bodega', 'Familia', 'Stock Actual', 'Stock Seguridad', 'Requerimiento', 'Traslado Sugerido', 'Estado'].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11, color: APS_COLOR }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {drpData.map((row, i) => (
              <TableRow key={i} hover>
                <TableCell sx={{ fontWeight: 600 }}>{row.planta}</TableCell>
                <TableCell>{row.familia}</TableCell>
                <TableCell>{row.stock_actual.toLocaleString()}</TableCell>
                <TableCell>{row.stock_seguridad.toLocaleString()}</TableCell>
                <TableCell>{row.requerimiento.toLocaleString()}</TableCell>
                <TableCell sx={{ color: row.traslado > 0 ? APS_COLOR : 'inherit', fontWeight: row.traslado > 0 ? 700 : 400 }}>
                  {row.traslado > 0 ? row.traslado.toLocaleString() : '-'}
                </TableCell>
                <TableCell>
                  <Chip
                    label={row.estado}
                    size="small"
                    sx={{ bgcolor: alpha(estadoColor(row.estado), 0.15), color: estadoColor(row.estado), fontWeight: 700, fontSize: 10 }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}

// ─── Page Component ───────────────────────────────────────────────────────────

export default function APSPlan() {
  const [tab, setTab] = useState(0)
  const [horizonte, setHorizonte] = useState('Semanal')

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: alpha(APS_COLOR, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarMonth sx={{ color: APS_COLOR, fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800} sx={{ color: APS_COLOR, lineHeight: 1.2 }}>
              Plan Maestro de Producción
            </Typography>
            <Typography variant="caption" color="text.secondary">
              APS — MPS / MRP / DRP · Horizonte {horizonte}
            </Typography>
          </Box>
          <Box sx={{ flex: 1 }} />
          <Chip label="APS" sx={{ bgcolor: APS_COLOR, color: 'white', fontWeight: 700 }} />
        </Stack>

        {/* Tabs */}
        <Paper sx={{ border: `1px solid ${alpha(APS_COLOR, 0.2)}`, overflow: 'hidden' }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              borderBottom: `1px solid ${alpha(APS_COLOR, 0.15)}`,
              bgcolor: alpha(APS_COLOR, 0.04),
              '& .MuiTab-root': { fontWeight: 700, fontSize: 13 },
              '& .Mui-selected': { color: APS_COLOR },
              '& .MuiTabs-indicator': { bgcolor: APS_COLOR },
            }}
          >
            <Tab icon={<CalendarMonth fontSize="small" />} iconPosition="start" label="MPS — Master Production Schedule" />
            <Tab icon={<Inventory fontSize="small" />} iconPosition="start" label="MRP — Material Requirements Planning" />
            <Tab icon={<LocalShipping fontSize="small" />} iconPosition="start" label="DRP — Distribution Requirements Planning" />
          </Tabs>
          <Box sx={{ p: 3 }}>
            {tab === 0 && <TabMPS horizonte={horizonte} setHorizonte={setHorizonte} />}
            {tab === 1 && <TabMRP />}
            {tab === 2 && <TabDRP />}
          </Box>
        </Paper>
      </Box>
    </Layout>
  )
}
