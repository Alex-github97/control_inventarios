/**
 * APS · Configuración
 *
 * Tenía catálogos, «parámetros globales», integraciones «conectadas» y
 * usuarios escritos a mano. Ahora es donde se cargan los maestros que usa el
 * motor —ubicaciones, productos, recursos, rutas, existencias y políticas— y
 * los parámetros que el motor de verdad lee. Integraciones y usuarios se
 * quitaron: no había nada detrás.
 */
import { useState } from 'react'
import { Box, Paper, Typography, Tabs, Tab, TextField, Button, Alert, InputAdornment } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Settings, Save } from '@mui/icons-material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apsApi, n0, n1, pesos, type Ubicacion, type Producto, type Recurso, type Ruta, type Parametro } from '@/api/aps'
import { Encabezado, FormularioRegistro, TablaRegistros, useCrud, Etiqueta, errorApi, type Campo } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const C = COLOR_MODULO
const INVALIDA = [['aps']]

function useMaestros() {
  const ubic = useQuery({ queryKey: ['aps', 'ubicaciones'], queryFn: apsApi.ubicaciones.listar })
  const prod = useQuery({ queryKey: ['aps', 'productos'], queryFn: apsApi.productos.listar })
  const rec = useQuery({ queryKey: ['aps', 'recursos'], queryFn: apsApi.recursos.listar })
  return { ubicaciones: ubic.data ?? [], productos: prod.data ?? [], recursos: rec.data ?? [] }
}

function Parametros() {
  const qc = useQueryClient()
  const { data = [] } = useQuery({ queryKey: ['aps', 'config'], queryFn: apsApi.config })
  const [v, setV] = useState<Record<string, string>>({})
  const valor = (c: { clave: string; valor: number }) => v[c.clave] ?? String(c.valor)
  const malo = (c: { clave: string; valor: number; min: number; max: number }) => { const x = Number(valor(c)); return valor(c) === '' || !Number.isFinite(x) || x < c.min || x > c.max }
  const guardar = async () => {
    try {
      await apsApi.guardarConfig(Object.fromEntries(data.map(c => [c.clave, Number(valor(c))])))
      toast.success('Parámetros guardados'); setV({}); qc.invalidateQueries({ queryKey: ['aps'] })
    } catch (e) { toast.error(errorApi(e)) }
  }
  return (
    <Box sx={{ p: 3 }}>
      <Typography fontSize={13} color="text.secondary" mb={2}>Solo están los parámetros que el motor lee. Cambiarlos recalcula el plan completo.</Typography>
      <Grid container spacing={2} sx={{ maxWidth: 900 }}>
        {data.map(c => (
          <Grid key={c.clave} size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" type="number" label={c.descripcion} value={valor(c)} error={malo(c)}
              helperText={malo(c) ? `Entre ${c.min} y ${c.max}` : `Por defecto ${n0(c.defecto)}`}
              onChange={e => setV(x => ({ ...x, [c.clave]: e.target.value }))}
              InputProps={c.clave.endsWith('_pct') ? { endAdornment: <InputAdornment position="end">%</InputAdornment> } : undefined} />
          </Grid>
        ))}
      </Grid>
      <Button variant="contained" startIcon={<Save />} sx={{ mt: 2, bgcolor: C }} disabled={data.some(malo)} onClick={guardar}>Guardar parámetros</Button>
    </Box>
  )
}

function Ubicaciones() {
  const crud = useCrud<Ubicacion>(['aps', 'ubicaciones'], apsApi.ubicaciones, 'Ubicación', INVALIDA, true)
  const [ed, setEd] = useState<Ubicacion | null | undefined>(undefined)
  const plantas = crud.datos.filter(u => !u.abastecida_por_id && u.id !== ed?.id)
  const campos: Campo[] = [
    { clave: 'codigo', etiqueta: 'Código', obligatorio: true, ancho: 4 },
    { clave: 'nombre', etiqueta: 'Nombre', obligatorio: true, ancho: 8 },
    { clave: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', obligatorio: true, ancho: 6, opciones: [['PLANTA', 'Planta'], ['CD', 'Centro de distribución'], ['BODEGA', 'Bodega'], ['TIENDA', 'Punto de venta']] },
    { clave: 'abastecida_por_id', etiqueta: 'Se abastece desde', tipo: 'seleccion', ancho: 6, opciones: plantas.map(u => [u.id, u.nombre]), ayuda: 'Vacío = se abastece sola (produce o compra). Con planta: recibe traslados (DRP).' },
    { clave: 'ciudad', etiqueta: 'Ciudad', ancho: 6 }, { clave: 'pais', etiqueta: 'País', ancho: 6 },
  ]
  const nombre = (id?: number | null) => crud.datos.find(u => u.id === id)?.nombre ?? '—'
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}><Button variant="contained" sx={{ bgcolor: C }} onClick={() => setEd(null)}>Nueva ubicación</Button></Box>
      <TablaRegistros<Ubicacion> filas={crud.datos} cargando={crud.isLoading} vacio="Sin ubicaciones. Empiece por la planta." etiqueta={u => u.nombre}
        onEditar={setEd} onRetirar={u => crud.retirar.mutate(u.id)}
        columnas={[{ titulo: 'Código', valor: u => u.codigo }, { titulo: 'Nombre', valor: u => <b>{u.nombre}</b> }, { titulo: 'Tipo', valor: u => u.tipo },
          { titulo: 'Se abastece desde', valor: u => u.abastecida_por_id ? nombre(u.abastecida_por_id) : <Etiqueta texto="Propia" color="#64748B" /> }, { titulo: 'Ciudad', valor: u => u.ciudad ?? '—' }]} />
      <FormularioRegistro abierto={ed !== undefined} titulo={ed ? 'Editar ubicación' : 'Nueva ubicación'} campos={campos} registro={ed}
        valoresIniciales={{ tipo: 'PLANTA' }} onGuardar={c => crud.guardar(ed ?? null, c)} onCerrar={() => setEd(undefined)} />
    </Box>
  )
}

function Productos() {
  const crud = useCrud<Producto>(['aps', 'productos'], apsApi.productos, 'Producto', INVALIDA)
  const [ed, setEd] = useState<Producto | null | undefined>(undefined)
  const campos: Campo[] = [
    { clave: 'codigo', etiqueta: 'Código', obligatorio: true, ancho: 4 }, { clave: 'nombre', etiqueta: 'Nombre', obligatorio: true, ancho: 8 },
    { clave: 'familia', etiqueta: 'Familia', ancho: 6, ayuda: 'Agrupa reportes y S&OP' }, { clave: 'unidad_medida', etiqueta: 'Unidad', ancho: 6 },
    { clave: 'lead_time_dias', etiqueta: 'Tiempo de entrega (días)', tipo: 'numero', min: 0, max: 365, ancho: 4, obligatorio: true },
    { clave: 'costo_unitario', etiqueta: 'Costo unitario', tipo: 'numero', min: 0, ancho: 4 },
    { clave: 'peso_kg', etiqueta: 'Peso (kg)', tipo: 'numero', min: 0, ancho: 4, ayuda: 'Para consolidar camiones' },
    { clave: 'precio_venta', etiqueta: 'Precio de venta', tipo: 'numero', min: 0, ancho: 6 },
  ]
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}><Button variant="contained" sx={{ bgcolor: C }} onClick={() => setEd(null)}>Nuevo producto</Button></Box>
      <TablaRegistros<Producto> filas={crud.datos} cargando={crud.isLoading} vacio="Sin productos" etiqueta={p => p.codigo}
        onEditar={setEd} onRetirar={p => crud.retirar.mutate(p.id)}
        columnas={[{ titulo: 'Código', valor: p => p.codigo }, { titulo: 'Nombre', valor: p => <b>{p.nombre}</b> }, { titulo: 'Familia', valor: p => p.familia ?? '—' },
          { titulo: 'Entrega', alinear: 'right', valor: p => `${p.lead_time_dias} d` }, { titulo: 'Costo', alinear: 'right', valor: p => pesos(p.costo_unitario) },
          { titulo: 'Peso', alinear: 'right', valor: p => p.peso_kg ? `${n1(p.peso_kg)} kg` : <Etiqueta texto="Sin peso" color="#D97706" /> }]} />
      <FormularioRegistro abierto={ed !== undefined} titulo={ed ? 'Editar producto' : 'Nuevo producto'} campos={campos} registro={ed}
        valoresIniciales={{ unidad_medida: 'UN', lead_time_dias: '0' }} onGuardar={c => crud.guardar(ed ?? null, c)} onCerrar={() => setEd(undefined)} />
    </Box>
  )
}

function Recursos() {
  const { ubicaciones } = useMaestros()
  const crud = useCrud<Recurso>(['aps', 'recursos'], apsApi.recursos, 'Recurso', INVALIDA)
  const [ed, setEd] = useState<Recurso | null | undefined>(undefined)
  const campos: Campo[] = [
    { clave: 'codigo', etiqueta: 'Código', obligatorio: true, ancho: 4 }, { clave: 'nombre', etiqueta: 'Nombre', obligatorio: true, ancho: 8 },
    { clave: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', obligatorio: true, ancho: 6, opciones: [['LINEA', 'Línea'], ['EQUIPO', 'Equipo'], ['PERSONAL', 'Personal'], ['BODEGA', 'Bodega'], ['TRANSPORTE', 'Transporte'], ['MATERIAL', 'Material']] },
    { clave: 'ubicacion_id', etiqueta: 'Ubicación', tipo: 'seleccion', ancho: 6, opciones: ubicaciones.map(u => [u.id, u.nombre]) },
    { clave: 'capacidad_diaria', etiqueta: 'Horas disponibles por día', tipo: 'numero', min: 0, ancho: 6, obligatorio: true },
    { clave: 'eficiencia_pct', etiqueta: 'Eficiencia (%)', tipo: 'numero', min: 1, max: 100, ancho: 6, obligatorio: true },
  ]
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}><Button variant="contained" sx={{ bgcolor: C }} onClick={() => setEd(null)}>Nuevo recurso</Button></Box>
      <TablaRegistros<Recurso> filas={crud.datos} cargando={crud.isLoading} vacio="Sin recursos" etiqueta={r => r.codigo}
        onEditar={setEd} onRetirar={r => crud.retirar.mutate(r.id)}
        columnas={[{ titulo: 'Código', valor: r => r.codigo }, { titulo: 'Nombre', valor: r => <b>{r.nombre}</b> }, { titulo: 'Tipo', valor: r => r.tipo },
          { titulo: 'Horas/día', alinear: 'right', valor: r => n1(r.capacidad_diaria) }, { titulo: 'Eficiencia', alinear: 'right', valor: r => `${n0(r.eficiencia_pct)} %` }]} />
      <FormularioRegistro abierto={ed !== undefined} titulo={ed ? 'Editar recurso' : 'Nuevo recurso'} campos={campos} registro={ed}
        valoresIniciales={{ tipo: 'LINEA', eficiencia_pct: '85', unidad_capacidad: 'horas' }} onGuardar={c => crud.guardar(ed ?? null, { ...c, unidad_capacidad: 'horas' })} onCerrar={() => setEd(undefined)} />
    </Box>
  )
}

function Rutas() {
  const { productos, recursos } = useMaestros()
  const crud = useCrud<Ruta>(['aps', 'rutas'], apsApi.rutas, 'Ruta', INVALIDA, true)
  const [ed, setEd] = useState<Ruta | null | undefined>(undefined)
  const campos: Campo[] = [
    { clave: 'producto_id', etiqueta: 'Producto', tipo: 'seleccion', obligatorio: true, ancho: 6, opciones: productos.map(p => [p.id, `${p.codigo} · ${p.nombre}`]) },
    { clave: 'recurso_id', etiqueta: 'Recurso', tipo: 'seleccion', obligatorio: true, ancho: 6, opciones: recursos.map(r => [r.id, r.nombre]) },
    { clave: 'horas_por_unidad', etiqueta: 'Horas por unidad', tipo: 'numero', min: 0.000001, obligatorio: true, ayuda: 'Ej. 0,005 h = 18 segundos por unidad' },
  ]
  const np = (id: number) => productos.find(p => p.id === id)
  return (
    <Box sx={{ p: 3 }}>
      <Alert severity="info" sx={{ mb: 2 }}>Un producto con ruta se <b>fabrica</b> y carga la capacidad de sus recursos; sin ruta, se <b>compra</b>.</Alert>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}><Button variant="contained" sx={{ bgcolor: C }} onClick={() => setEd(null)}>Nueva ruta</Button></Box>
      <TablaRegistros<Ruta> filas={crud.datos} cargando={crud.isLoading} vacio="Sin rutas: todos los productos se comprarían" etiqueta={r => `${np(r.producto_id)?.codigo} → ${recursos.find(x => x.id === r.recurso_id)?.nombre}`}
        onEditar={setEd} onRetirar={r => crud.retirar.mutate(r.id)}
        columnas={[{ titulo: 'Producto', valor: r => np(r.producto_id) ? `${np(r.producto_id)!.codigo} · ${np(r.producto_id)!.nombre}` : r.producto_id },
          { titulo: 'Recurso', valor: r => recursos.find(x => x.id === r.recurso_id)?.nombre ?? r.recurso_id },
          { titulo: 'Horas por unidad', alinear: 'right', valor: r => r.horas_por_unidad }]} />
      <FormularioRegistro abierto={ed !== undefined} titulo={ed ? 'Editar ruta' : 'Nueva ruta'} campos={campos} registro={ed}
        onGuardar={c => crud.guardar(ed ?? null, c)} onCerrar={() => setEd(undefined)} />
    </Box>
  )
}

export function Existencias() {
  const { productos, ubicaciones } = useMaestros()
  const crud = useCrud<Parametro>(['aps', 'parametros'], apsApi.parametros, 'Parámetro', INVALIDA)
  const [ed, setEd] = useState<Parametro | null | undefined>(undefined)
  const campos: Campo[] = [
    { clave: 'producto_id', etiqueta: 'Producto', tipo: 'seleccion', obligatorio: true, ancho: 6, opciones: productos.map(p => [p.id, `${p.codigo} · ${p.nombre}`]) },
    { clave: 'ubicacion_id', etiqueta: 'Ubicación', tipo: 'seleccion', obligatorio: true, ancho: 6, opciones: ubicaciones.map(u => [u.id, u.nombre]) },
    { clave: 'stock_actual', etiqueta: 'Existencias hoy', tipo: 'numero', min: 0, obligatorio: true, ancho: 6 },
    { clave: 'nivel_servicio_pct', etiqueta: 'Nivel de servicio (%)', tipo: 'numero', min: 50, max: 99.9, obligatorio: true, ancho: 6, ayuda: 'Probabilidad de no quedarse sin stock' },
    { clave: 'lote_produccion', etiqueta: 'Lote mínimo de producción', tipo: 'numero', min: 0, ancho: 6 },
    { clave: 'lote_minimo_compra', etiqueta: 'Lote mínimo de compra', tipo: 'numero', min: 0, ancho: 6 },
    { clave: 'lead_time_produccion_dias', etiqueta: 'Días de producción (si difiere)', tipo: 'numero', min: 0, max: 365, ancho: 6 },
    { clave: 'lead_time_compra_dias', etiqueta: 'Días de compra (si difiere)', tipo: 'numero', min: 0, max: 365, ancho: 6 },
  ]
  const np = (id: number) => productos.find(p => p.id === id)
  return (
    <Box sx={{ p: 3 }}>
      <Typography fontSize={13} color="text.secondary" mb={2}>Existencias y políticas por producto y ubicación. Las existencias son el punto de partida del plan; al recibir una orden aprobada se actualizan solas.</Typography>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}><Button variant="contained" sx={{ bgcolor: C }} onClick={() => setEd(null)}>Nuevo registro</Button></Box>
      <TablaRegistros<Parametro> filas={crud.datos} cargando={crud.isLoading} vacio="Sin existencias registradas: el plan supone cero" etiqueta={p => `${np(p.producto_id)?.codigo} en ${ubicaciones.find(u => u.id === p.ubicacion_id)?.nombre}`}
        onEditar={setEd} onRetirar={p => crud.retirar.mutate(p.id)}
        columnas={[{ titulo: 'Producto', valor: p => np(p.producto_id)?.codigo ?? p.producto_id }, { titulo: 'Ubicación', valor: p => ubicaciones.find(u => u.id === p.ubicacion_id)?.nombre ?? p.ubicacion_id },
          { titulo: 'Existencias', alinear: 'right', valor: p => <b>{n0(p.stock_actual)}</b> }, { titulo: 'Servicio', alinear: 'right', valor: p => `${n1(p.nivel_servicio_pct)} %` },
          { titulo: 'Lote prod.', alinear: 'right', valor: p => n0(p.lote_produccion) }, { titulo: 'Lote compra', alinear: 'right', valor: p => n0(p.lote_minimo_compra) }]} />
      <FormularioRegistro abierto={ed !== undefined} titulo={ed ? 'Editar existencias y política' : 'Nuevo registro'} campos={campos} registro={ed}
        valoresIniciales={{ nivel_servicio_pct: '95', stock_actual: '0' }} onGuardar={c => crud.guardar(ed ?? null, c)} onCerrar={() => setEd(undefined)} />
    </Box>
  )
}

export default function APSConfig() {
  const [tab, setTab] = useState(0)
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Settings sx={{ fontSize: 28 }} />} titulo="Configuración APS" subtitulo="Maestros del plan y parámetros del motor" color={C} />
        <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ borderBottom: '1px solid #E2E8F0', px: 2 }}>
            <Tab label="Parámetros del motor" /><Tab label="Ubicaciones" /><Tab label="Productos" /><Tab label="Recursos" /><Tab label="Rutas" /><Tab label="Existencias y políticas" />
          </Tabs>
          {tab === 0 && <Parametros />}{tab === 1 && <Ubicaciones />}{tab === 2 && <Productos />}
          {tab === 3 && <Recursos />}{tab === 4 && <Rutas />}{tab === 5 && <Existencias />}
        </Paper>
      </Box>
    </Layout>
  )
}
