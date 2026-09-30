/**
 * APS · Reportes
 *
 * Tenía 918 líneas de tablas y gráficos con cifras escritas a mano (exactitud
 * por familia, adherencia MPS por semana, compromisos S&OP de junio…). Ahora
 * cada reporte es una vista del plan vigente que se descarga a Excel con los
 * mismos datos que se ven.
 */
import { useState } from 'react'
import { Box, Paper, Typography, Tabs, Tab, Button, LinearProgress, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material'
import { Assessment, Download } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { apsApi, n0, pesos, pct, nombreP, nombreU, mesCorto, TIPO_ORDEN } from '@/api/aps'
import { Encabezado } from '@/components/comun/Registro'
import { descargarExcel } from '@/utils/excel'
import { COLOR_MODULO } from '@/config/marca'

const C = COLOR_MODULO

function Tabla<T>({ titulo, filas, columnas, archivo }: { titulo: string; filas: T[]; columnas: { titulo: string; valor: (f: T) => any; alinear?: 'right' }[]; archivo: string }) {
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography fontWeight={800}>{titulo}</Typography>
        <Button size="small" startIcon={<Download />} disabled={!filas.length}
          onClick={() => descargarExcel(archivo, filas, columnas.map(c => ({ titulo: c.titulo, valor: (f: T) => { const v = c.valor(f); return typeof v === 'object' ? String(v) : v } })), titulo)}>Descargar Excel</Button>
      </Box>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto', maxHeight: 560 }}>
        <Table size="small" stickyHeader>
          <TableHead><TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700 } }}>{columnas.map(c => <TableCell key={c.titulo} align={c.alinear}>{c.titulo}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {filas.map((f, i) => <TableRow key={i} sx={{ '& td': { fontSize: 12 } }}>{columnas.map(c => <TableCell key={c.titulo} align={c.alinear}>{c.valor(f)}</TableCell>)}</TableRow>)}
            {!filas.length && <TableRow><TableCell colSpan={columnas.length} sx={{ fontSize: 12, color: 'text.secondary' }}>Sin datos.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}

export default function APSReportes() {
  const [tab, setTab] = useState(0)
  const pron = useQuery({ queryKey: ['aps', 'pronostico'], queryFn: apsApi.pronostico })
  const plan = useQuery({ queryKey: ['aps', 'plan'], queryFn: apsApi.plan })
  const inv = useQuery({ queryKey: ['aps', 'inventario'], queryFn: apsApi.inventario })
  const cap = useQuery({ queryKey: ['aps', 'capacidad'], queryFn: apsApi.capacidad })
  const cargando = pron.isLoading || plan.isLoading || inv.isLoading || cap.isLoading
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Assessment sx={{ fontSize: 28 }} />} titulo="Reportes APS" subtitulo="Vistas del plan vigente, descargables a Excel" color={C} />
        {cargando && <LinearProgress />}
        <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ borderBottom: '1px solid #E2E8F0', px: 2 }}>
            <Tab label="Pronóstico" /><Tab label="Órdenes del plan" /><Tab label="Inventario" /><Tab label="Capacidad" />
          </Tabs>
          {tab === 0 && pron.data && (
            <Tabla archivo="APS-pronostico" titulo="Pronóstico por producto y ubicación" filas={pron.data.series}
              columnas={[{ titulo: 'Producto', valor: s => nombreP(pron.data, s.producto_id) }, { titulo: 'Ubicación', valor: s => nombreU(pron.data, s.ubicacion_id) },
                { titulo: 'Familia', valor: s => pron.data!.productos[s.producto_id]?.familia ?? '' }, { titulo: 'Método', valor: s => s.nombre_metodo ?? '' },
                { titulo: 'WAPE', alinear: 'right', valor: s => pct(s.wape) }, { titulo: 'Próximo mes', alinear: 'right', valor: s => n0(s.proximo) },
                { titulo: 'Consenso publicado', valor: s => s.usa_consenso ? 'Sí' : 'No' }]} />
          )}
          {tab === 1 && plan.data && (
            <Tabla archivo="APS-ordenes" titulo="Órdenes sugeridas del plan" filas={[...plan.data.ordenes, ...plan.data.traslados]}
              columnas={[{ titulo: 'Tipo', valor: o => TIPO_ORDEN[o.tipo] }, { titulo: 'Producto', valor: o => nombreP(plan.data, o.producto_id) },
                { titulo: 'Ubicación', valor: o => nombreU(plan.data, o.ubicacion_id) }, { titulo: 'Cantidad', alinear: 'right', valor: o => n0(o.cantidad) },
                { titulo: 'Lanzar', valor: o => mesCorto(o.periodo_lanzamiento) }, { titulo: 'Recibir', valor: o => mesCorto(o.periodo_recepcion) },
                { titulo: 'Costo', alinear: 'right', valor: o => pesos(o.costo) }, { titulo: 'Atrasada', valor: o => o.atrasada ? 'Sí' : 'No' }]} />
          )}
          {tab === 2 && inv.data && (
            <Tabla archivo="APS-inventario" titulo="Inventario objetivo" filas={inv.data.inventario}
              columnas={[{ titulo: 'Producto', valor: x => nombreP(inv.data, x.producto_id) }, { titulo: 'Ubicación', valor: x => nombreU(inv.data, x.ubicacion_id) },
                { titulo: 'ABC-XYZ', valor: x => `${x.abc}${x.xyz ?? ''}` }, { titulo: 'Demanda/mes', alinear: 'right', valor: x => n0(x.demanda_mensual) },
                { titulo: 'Stock seguridad', alinear: 'right', valor: x => n0(x.stock_seguridad) }, { titulo: 'Punto de reorden', alinear: 'right', valor: x => n0(x.punto_reorden) },
                { titulo: 'EOQ', alinear: 'right', valor: x => n0(x.eoq) }, { titulo: 'Existencias', alinear: 'right', valor: x => n0(x.stock_actual) },
                { titulo: 'Valor', alinear: 'right', valor: x => pesos(x.valor_stock) }]} />
          )}
          {tab === 3 && cap.data && (
            <Tabla archivo="APS-capacidad" titulo="Carga de capacidad" filas={cap.data.capacidad}
              columnas={[{ titulo: 'Recurso', valor: c => cap.data!.recursos[c.recurso_id]?.nombre ?? c.recurso_id }, { titulo: 'Mes', valor: c => mesCorto(c.periodo) },
                { titulo: 'Carga (h)', alinear: 'right', valor: c => n0(c.carga_horas) }, { titulo: 'Capacidad (h)', alinear: 'right', valor: c => n0(c.capacidad_horas) },
                { titulo: 'Uso', alinear: 'right', valor: c => pct(c.uso_pct) }, { titulo: 'Sobrecarga', valor: c => c.sobrecarga ? 'Sí' : 'No' }]} />
          )}
        </Paper>
      </Box>
    </Layout>
  )
}
