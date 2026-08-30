/**
 * Lubricación · Configuración.
 *
 * La jerarquía es la misma de llantas —marca → producto → aplicación— y el
 * orden de las pestañas es el orden en que hay que llenarlas: sin marcas no hay
 * productos, y sin productos no hay aplicaciones.
 *
 * La pestaña que de verdad importa es «Límites». Es lo que convierte una lista
 * de números en un semáforo, y es donde cada empresa mete el criterio de su
 * fabricante o de su laboratorio.
 */
import { useState } from 'react'
import {
  Box, Card, Typography, Stack, Button, TextField, Chip, Alert, Skeleton,
  Table, TableBody, TableCell, TableHead, TableRow, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Switch,
  FormControlLabel, Tabs, Tab, InputAdornment,
} from '@mui/material'
import {
  Add, Edit, DeleteOutline, Science, Search, TrendingUp, Straighten,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { PALETA, ESTADO, COLOR_MODULO } from '@/config/marca'
import { lubeApi } from '@/api/lube'

const mensaje = (e: any) =>
  e?.response?.data?.detail ?? e?.message ?? 'No se pudo completar la operación'

/** Campo de un formulario genérico de catálogo. */
type Campo = {
  clave: string
  etiqueta: string
  tipo?: 'texto' | 'numero' | 'select' | 'switch' | 'area'
  opciones?: { valor: any; texto: string }[]
  ancho?: number
  ayuda?: string
  requerido?: boolean
}

/**
 * Tabla + diálogo de un catálogo. Los diez se comportan igual salvo por sus
 * campos, así que se declara una vez: diez copias serían diez sitios donde
 * arreglar el mismo error.
 *
 * Está fuera del componente padre a propósito. Definida adentro, React la
 * trataría como un tipo nuevo en cada render y remontaría todo el formulario a
 * cada tecla, perdiendo el foco.
 */
function CatalogoTabla({
  titulo, ayuda, clave, campos, columnas, api: recurso, extraParams, deshabilitarNuevo,
}: {
  titulo: string
  ayuda: string
  clave: string
  campos: Campo[]
  columnas: { clave: string; etiqueta: string; render?: (f: any) => any }[]
  api: any
  extraParams?: Record<string, any>
  deshabilitarNuevo?: string
}) {
  const qc = useQueryClient()
  const [abierto, setAbierto] = useState(false)
  const [editando, setEditando] = useState<any>(null)
  const [form, setForm] = useState<Record<string, any>>({})
  const [busqueda, setBusqueda] = useState('')

  const { data = [], isLoading } = useQuery({
    queryKey: [clave, extraParams],
    queryFn: () => recurso.listar(extraParams),
  })

  const invalidar = () => qc.invalidateQueries({ queryKey: [clave] })

  const guardar = useMutation({
    mutationFn: (datos: any) =>
      editando ? recurso.editar(editando.id, datos) : recurso.crear(datos),
    onSuccess: () => {
      invalidar(); setAbierto(false)
      toast.success(editando ? 'Cambios guardados' : 'Creado')
    },
    onError: (e: any) => toast.error(mensaje(e)),
  })

  const borrar = useMutation({
    mutationFn: (id: number) => recurso.borrar(id),
    onSuccess: () => { invalidar(); toast.success('Desactivado') },
    onError: (e: any) => toast.error(mensaje(e)),
  })

  const abrir = (fila?: any) => {
    setEditando(fila ?? null)
    const inicial: Record<string, any> = {}
    for (const c of campos) {
      inicial[c.clave] = fila?.[c.clave] ?? (c.tipo === 'switch' ? false : '')
    }
    if (!fila && extraParams) Object.assign(inicial, extraParams)
    setForm(inicial)
    setAbierto(true)
  }

  const enviar = () => {
    const faltan = campos.filter(c => c.requerido && !String(form[c.clave] ?? '').trim())
    if (faltan.length) {
      toast.error(`Falta ${faltan[0].etiqueta.toLowerCase()}`)
      return
    }
    const limpio: Record<string, any> = { activo: true }
    for (const c of campos) {
      const v = form[c.clave]
      limpio[c.clave] = c.tipo === 'numero'
        ? (v === '' || v === null ? null : Number(v))
        : c.tipo === 'switch' ? !!v
        : (v === '' ? null : v)
    }
    guardar.mutate(limpio)
  }

  const filtradas = data.filter((f: any) =>
    !busqueda || JSON.stringify(f).toLowerCase().includes(busqueda.toLowerCase()))

  return (
    <Box>
      <Stack direction="row" alignItems="flex-start" spacing={2} mb={2} flexWrap="wrap" useFlexGap>
        <Box sx={{ flex: 1, minWidth: 240 }}>
          <Typography variant="subtitle2" fontWeight={800}>{titulo}</Typography>
          <Typography variant="caption" color="text.secondary">{ayuda}</Typography>
        </Box>
        <TextField
          size="small" placeholder="Buscar…" value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
          sx={{ width: 220 }}
        />
        <Tooltip title={deshabilitarNuevo ?? ''}>
          <span>
            <Button variant="contained" startIcon={<Add />} onClick={() => abrir()}
              disabled={!!deshabilitarNuevo}
              sx={{ textTransform: 'none', fontWeight: 700 }}>
              Nuevo
            </Button>
          </span>
        </Tooltip>
      </Stack>

      {isLoading ? (
        <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 3 }} />
      ) : filtradas.length === 0 ? (
        <Card sx={{ borderRadius: 3, p: 5, textAlign: 'center' }}>
          <Science sx={{ fontSize: 38, color: PALETA.acero, opacity: 0.4 }} />
          <Typography variant="body2" color="text.secondary" mt={1.5}>
            {busqueda ? 'Nada coincide con esa búsqueda.' : 'Todavía no hay nada acá.'}
          </Typography>
        </Card>
      ) : (
        <Card sx={{ borderRadius: 3, overflow: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {columnas.map(c => (
                  <TableCell key={c.clave} sx={{ fontWeight: 700, fontSize: 11 }}>
                    {c.etiqueta.toUpperCase()}
                  </TableCell>
                ))}
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: 11 }}>—</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtradas.map((f: any) => (
                <TableRow key={f.id} hover>
                  {columnas.map(c => (
                    <TableCell key={c.clave} sx={{ fontSize: 13 }}>
                      {c.render ? c.render(f) : (f[c.clave] ?? '—')}
                    </TableCell>
                  ))}
                  <TableCell align="right">
                    <IconButton size="small" onClick={() => abrir(f)}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => borrar.mutate(f.id)}>
                      <DeleteOutline fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={abierto} onClose={() => setAbierto(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editando ? `Editar · ${titulo}` : `Nuevo · ${titulo}`}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {campos.map(c => c.tipo === 'switch' ? (
              <FormControlLabel
                key={c.clave}
                control={<Switch checked={!!form[c.clave]}
                  onChange={e => setForm({ ...form, [c.clave]: e.target.checked })} />}
                label={<Box>
                  <Typography variant="body2">{c.etiqueta}</Typography>
                  {c.ayuda && <Typography variant="caption" color="text.secondary">{c.ayuda}</Typography>}
                </Box>}
              />
            ) : (
              <TextField
                key={c.clave} label={c.etiqueta} size="small" fullWidth
                select={c.tipo === 'select'}
                type={c.tipo === 'numero' ? 'number' : 'text'}
                multiline={c.tipo === 'area'} rows={c.tipo === 'area' ? 3 : undefined}
                value={form[c.clave] ?? ''}
                helperText={c.ayuda}
                onChange={e => setForm({ ...form, [c.clave]: e.target.value })}
              >
                {(c.opciones ?? []).map(o => (
                  <MenuItem key={String(o.valor)} value={o.valor}>{o.texto}</MenuItem>
                ))}
              </TextField>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAbierto(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button variant="contained" onClick={enviar} disabled={guardar.isPending}
            sx={{ textTransform: 'none', fontWeight: 700 }}>
            {guardar.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

const chip = (texto: string, color: any) => (
  <Chip label={texto} size="small" sx={{
    height: 20, fontSize: 10, fontWeight: 700,
    bgcolor: `${color}1A`, color,
  }} />
)

export default function EAMLubricacionConfig() {
  const [tab, setTab] = useState(0)

  const { data: marcas = [] } = useQuery({ queryKey: ['lube-marcas'], queryFn: () => lubeApi.marcas.listar() })
  const { data: tipos = [] } = useQuery({ queryKey: ['lube-tipos'], queryFn: () => lubeApi.tipos.listar() })
  const { data: productos = [] } = useQuery({ queryKey: ['lube-productos'], queryFn: () => lubeApi.productos.listar() })
  const { data: parametros = [] } = useQuery({ queryKey: ['lube-parametros'], queryFn: () => lubeApi.parametros.listar() })

  const opcMarcas = marcas.map(m => ({ valor: m.id, texto: m.nombre }))
  const opcTipos = tipos.map(t => ({ valor: t.id, texto: `${t.nombre} (${t.unidad_vida.toLowerCase()})` }))
  const opcProductos = productos.map(p => ({ valor: p.id, texto: `${p.marca ?? ''} ${p.nombre}`.trim() }))
  const opcParametros = parametros.map(p => ({ valor: p.id, texto: `${p.nombre}${p.unidad ? ` (${p.unidad})` : ''}` }))

  const pestanas = [
    'Marcas', 'Productos', 'Aplicaciones', 'Tipos de compartimento',
    'Parámetros', 'Límites', 'Modos de falla', 'Motivos de drenaje',
    'Métodos de muestreo', 'Laboratorios',
  ]

  return (
    <Layout title="Lubricación · Configuración">
      <Box className="anim-page-in">
        <Box mb={2.5}>
          <Typography variant="h6" fontWeight={800}>Lubricación · Configuración</Typography>
          <Typography variant="caption" color="text.secondary">
            El orden de las pestañas es el orden en que hay que llenarlas: sin marcas no
            hay productos, y sin productos no hay aplicaciones
          </Typography>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable"
          scrollButtons="auto" sx={{ mb: 2.5, borderBottom: `1px solid ${PALETA.niebla}` }}>
          {pestanas.map(p => <Tab key={p} label={p} sx={{ textTransform: 'none', fontWeight: 700 }} />)}
        </Tabs>

        {tab === 0 && (
          <CatalogoTabla
            titulo="Marcas de lubricante" clave="lube-marcas" api={lubeApi.marcas}
            ayuda="El primer nivel de la jerarquía: Shell, Mobil, Chevron…"
            campos={[{ clave: 'nombre', etiqueta: 'Nombre', requerido: true }]}
            columnas={[{ clave: 'nombre', etiqueta: 'Marca' }]}
          />
        )}

        {tab === 1 && (
          <CatalogoTabla
            titulo="Productos" clave="lube-productos" api={lubeApi.productos}
            ayuda="El producto concreto de cada marca. Dos marcas pueden tener un «15W-40»: la unicidad es por marca"
            deshabilitarNuevo={marcas.length ? undefined : 'Primero cree al menos una marca'}
            campos={[
              { clave: 'marca_id', etiqueta: 'Marca', tipo: 'select', opciones: opcMarcas, requerido: true },
              { clave: 'nombre', etiqueta: 'Nombre del producto', requerido: true },
              { clave: 'familia', etiqueta: 'Familia', tipo: 'select', opciones: [
                { valor: 'MOTOR', texto: 'Motor' }, { valor: 'HIDRAULICO', texto: 'Hidráulico' },
                { valor: 'ENGRANAJES', texto: 'Engranajes' }, { valor: 'TRANSMISION', texto: 'Transmisión' },
                { valor: 'GRASA', texto: 'Grasa' }, { valor: 'REFRIGERANTE', texto: 'Refrigerante' },
                { valor: 'OTRO', texto: 'Otro' }] },
              { clave: 'grado_sae', etiqueta: 'Grado SAE', ayuda: 'Por ejemplo 15W-40' },
              { clave: 'grado_iso', etiqueta: 'Grado ISO', ayuda: 'Por ejemplo ISO VG 46' },
              { clave: 'base', etiqueta: 'Base', tipo: 'select', opciones: [
                { valor: 'Mineral', texto: 'Mineral' }, { valor: 'Semisintético', texto: 'Semisintético' },
                { valor: 'Sintético', texto: 'Sintético' }] },
            ]}
            columnas={[
              { clave: 'marca', etiqueta: 'Marca' },
              { clave: 'nombre', etiqueta: 'Producto' },
              { clave: 'familia', etiqueta: 'Familia' },
              { clave: 'grado_sae', etiqueta: 'SAE' },
              { clave: 'base', etiqueta: 'Base' },
            ]}
          />
        )}

        {tab === 2 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Acá va la vida recomendada y la meta de limpieza, y no en el producto, porque el
              mismo aceite dura unas 500 horas en un motor y varios miles en un sistema
              hidráulico. Es el mismo cruce que en llantas hace la referencia con la medida.
            </Alert>
            <CatalogoTabla
              titulo="Aplicaciones" clave="lube-aplicaciones" api={lubeApi.aplicaciones}
              ayuda="Producto × tipo de compartimento, con sus parámetros técnicos"
              deshabilitarNuevo={productos.length ? undefined : 'Primero cree al menos un producto'}
              campos={[
                { clave: 'producto_id', etiqueta: 'Producto', tipo: 'select', opciones: opcProductos, requerido: true },
                { clave: 'tipo_compartimento_id', etiqueta: 'Tipo de compartimento', tipo: 'select', opciones: opcTipos, requerido: true },
                { clave: 'vida_recomendada', etiqueta: 'Vida recomendada', tipo: 'numero', ayuda: 'En la unidad del tipo de compartimento' },
                { clave: 'vida_maxima', etiqueta: 'Vida máxima', tipo: 'numero' },
                { clave: 'meta_iso4406', etiqueta: 'Meta ISO 4406', ayuda: 'Por ejemplo 18/16/13' },
                { clave: 'volumen_tipico', etiqueta: 'Volumen típico (L)', tipo: 'numero' },
                { clave: 'costo_litro', etiqueta: 'Costo por litro', tipo: 'numero' },
                { clave: 'observaciones', etiqueta: 'Observaciones', tipo: 'area' },
              ]}
              columnas={[
                { clave: 'producto', etiqueta: 'Producto' },
                { clave: 'tipo_compartimento', etiqueta: 'Compartimento' },
                { clave: 'vida_recomendada', etiqueta: 'Vida recom.' },
                { clave: 'meta_iso4406', etiqueta: 'Meta ISO' },
                { clave: 'volumen_tipico', etiqueta: 'Vol. (L)' },
              ]}
            />
          </Box>
        )}

        {tab === 3 && (
          <CatalogoTabla
            titulo="Tipos de compartimento" clave="lube-tipos" api={lubeApi.tipos}
            ayuda="La familia que gobierna los límites. 50 ppm de hierro no dicen nada en un motor y son alarma en una caja"
            campos={[
              { clave: 'codigo', etiqueta: 'Código' },
              { clave: 'nombre', etiqueta: 'Nombre', requerido: true },
              { clave: 'unidad_vida', etiqueta: 'La vida se mide en', tipo: 'select', opciones: [
                { valor: 'HORAS', texto: 'Horas' }, { valor: 'KM', texto: 'Kilómetros' },
                { valor: 'DIAS', texto: 'Días' }] },
              { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'area' },
            ]}
            columnas={[
              { clave: 'codigo', etiqueta: 'Cód.' },
              { clave: 'nombre', etiqueta: 'Tipo' },
              { clave: 'unidad_vida', etiqueta: 'Vida en' },
              { clave: 'descripcion', etiqueta: 'Descripción' },
            ]}
          />
        )}

        {tab === 4 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Los códigos coinciden con los que reconoce el lector de boletines, así que lo
              que se extrae de un PDF entra directo como resultado. El «origen probable» es lo
              que traduce un número a un diagnóstico.
            </Alert>
            <CatalogoTabla
              titulo="Parámetros de análisis" clave="lube-parametros" api={lubeApi.parametros}
              ayuda="Cada resultado de una muestra es una fila, no una columna: agregar un parámetro no exige migrar nada"
              campos={[
                { clave: 'codigo', etiqueta: 'Código', requerido: true, ayuda: 'En minúsculas, como lo lee el OCR: fe, cu, tbn…' },
                { clave: 'nombre', etiqueta: 'Nombre', requerido: true },
                { clave: 'unidad', etiqueta: 'Unidad', ayuda: 'ppm, cSt, mgKOH/g…' },
                { clave: 'grupo', etiqueta: 'Grupo', tipo: 'select', opciones: [
                  { valor: 'DESGASTE', texto: 'Desgaste' }, { valor: 'CONTAMINACION', texto: 'Contaminación' },
                  { valor: 'ADITIVO', texto: 'Aditivo' }, { valor: 'PROPIEDAD', texto: 'Propiedad del fluido' }] },
                { clave: 'origen_probable', etiqueta: 'Origen probable', tipo: 'area',
                  ayuda: 'Qué pieza o entrada delata. Es lo que convierte el número en una causa' },
                { clave: 'es_texto', etiqueta: 'Es un código, no un número', tipo: 'switch',
                  ayuda: 'Como el ISO 4406, que son tres números que solo valen juntos' },
                { clave: 'bidireccional', etiqueta: 'Preocupa en las dos direcciones', tipo: 'switch',
                  ayuda: 'Como la viscosidad: alejarse por arriba o por abajo es igual de malo' },
                { clave: 'orden', etiqueta: 'Orden', tipo: 'numero' },
              ]}
              columnas={[
                { clave: 'codigo', etiqueta: 'Cód.' },
                { clave: 'nombre', etiqueta: 'Parámetro' },
                { clave: 'unidad', etiqueta: 'Unidad' },
                { clave: 'grupo', etiqueta: 'Grupo', render: (f: any) => chip(f.grupo, {
                  DESGASTE: ESTADO.peligro, CONTAMINACION: ESTADO.alerta,
                  ADITIVO: COLOR_MODULO, PROPIEDAD: PALETA.grafito,
                }[f.grupo as string] ?? PALETA.acero) },
                { clave: 'origen_probable', etiqueta: 'Origen probable' },
              ]}
            />
          </Box>
        )}

        {tab === 5 && (
          <Box>
            <Alert severity="warning" sx={{ mb: 2 }} icon={<TrendingUp />}>
              <b>La tasa de cambio es la que detecta la falla antes.</b> Un hierro que pasa de
              12 a 34 ppm en 80 horas es una alarma aunque 34 esté cómodamente bajo el límite
              absoluto. Los límites sembrados vienen marcados con fuente «NORMA»: son valores
              de arranque de uso común y hay que reemplazarlos por los del fabricante o el
              laboratorio de la empresa.
            </Alert>
            <CatalogoTabla
              titulo="Límites de alarma" clave="lube-limites" api={lubeApi.limites}
              ayuda="Se revisan los mínimos y los máximos: en el hierro el peligro es que suba, en el TBN es que baje"
              campos={[
                { clave: 'parametro_id', etiqueta: 'Parámetro', tipo: 'select', opciones: opcParametros, requerido: true },
                { clave: 'tipo_compartimento_id', etiqueta: 'Tipo de compartimento', tipo: 'select', opciones: opcTipos,
                  ayuda: 'Vacío = aplica a todos' },
                { clave: 'tipo', etiqueta: 'Clase de límite', tipo: 'select', opciones: [
                  { valor: 'ABSOLUTO', texto: 'Absoluto — el tope del fabricante' },
                  { valor: 'TASA_CAMBIO', texto: 'Tasa de cambio — por cada 100 de vida' },
                  { valor: 'ESTADISTICO', texto: 'Estadístico — fija el de la flota' }] },
                { clave: 'marginal_min', etiqueta: 'Marginal mínimo', tipo: 'numero' },
                { clave: 'marginal_max', etiqueta: 'Marginal máximo', tipo: 'numero' },
                { clave: 'critico_min', etiqueta: 'Crítico mínimo', tipo: 'numero' },
                { clave: 'critico_max', etiqueta: 'Crítico máximo', tipo: 'numero' },
                { clave: 'fuente', etiqueta: 'Fuente', tipo: 'select', opciones: [
                  { valor: 'OEM', texto: 'Fabricante del equipo' },
                  { valor: 'LABORATORIO', texto: 'Laboratorio' },
                  { valor: 'FLOTA', texto: 'Histórico de la flota' },
                  { valor: 'NORMA', texto: 'Valor de arranque (por ajustar)' }] },
                { clave: 'nota', etiqueta: 'Nota', tipo: 'area' },
              ]}
              columnas={[
                { clave: 'parametro', etiqueta: 'Parámetro' },
                { clave: 'tipo_compartimento', etiqueta: 'Compartimento', render: (f: any) => f.tipo_compartimento ?? 'Todos' },
                { clave: 'tipo', etiqueta: 'Clase', render: (f: any) => chip(
                  { ABSOLUTO: 'Absoluto', TASA_CAMBIO: 'Tasa', ESTADISTICO: 'Estadístico' }[f.tipo as string] ?? f.tipo,
                  f.tipo === 'TASA_CAMBIO' ? ESTADO.alerta : COLOR_MODULO) },
                { clave: 'marginal', etiqueta: 'Marginal', render: (f: any) =>
                  [f.marginal_min != null ? `≥${f.marginal_min}` : null,
                   f.marginal_max != null ? `≤${f.marginal_max}` : null].filter(Boolean).join(' · ') || '—' },
                { clave: 'critico', etiqueta: 'Crítico', render: (f: any) =>
                  [f.critico_min != null ? `<${f.critico_min}` : null,
                   f.critico_max != null ? `>${f.critico_max}` : null].filter(Boolean).join(' · ') || '—' },
                { clave: 'fuente', etiqueta: 'Fuente', render: (f: any) => f.fuente === 'NORMA'
                  ? chip('Por ajustar', ESTADO.alerta) : (f.fuente ?? '—') },
              ]}
            />
          </Box>
        )}

        {tab === 6 && (
          <CatalogoTabla
            titulo="Modos de falla del lubricante" clave="lube-modos" api={lubeApi.modosFalla}
            ayuda="Es lo que permite agrupar «por qué falla» en el tablero, igual que el catálogo de daños en llantas"
            campos={[
              { clave: 'codigo', etiqueta: 'Código', requerido: true },
              { clave: 'nombre', etiqueta: 'Nombre', requerido: true },
              { clave: 'categoria', etiqueta: 'Categoría', tipo: 'select', opciones: [
                { valor: 'DESGASTE', texto: 'Desgaste' }, { valor: 'CONTAMINACION', texto: 'Contaminación' },
                { valor: 'DEGRADACION', texto: 'Degradación' }, { valor: 'DILUCION', texto: 'Dilución' },
                { valor: 'REFRIGERANTE', texto: 'Refrigerante' }, { valor: 'ADITIVOS', texto: 'Aditivos' }] },
              { clave: 'severidad', etiqueta: 'Severidad', tipo: 'select', opciones: [
                { valor: 'LEVE', texto: 'Leve' }, { valor: 'MODERADO', texto: 'Moderado' },
                { valor: 'GRAVE', texto: 'Grave' }] },
              { clave: 'accion_sugerida', etiqueta: 'Acción sugerida', tipo: 'area' },
            ]}
            columnas={[
              { clave: 'codigo', etiqueta: 'Cód.' },
              { clave: 'nombre', etiqueta: 'Modo de falla' },
              { clave: 'categoria', etiqueta: 'Categoría' },
              { clave: 'severidad', etiqueta: 'Severidad', render: (f: any) => chip(f.severidad,
                f.severidad === 'GRAVE' ? ESTADO.peligro : f.severidad === 'MODERADO' ? ESTADO.alerta : ESTADO.exito) },
              { clave: 'accion_sugerida', etiqueta: 'Acción sugerida' },
            ]}
          />
        )}

        {tab === 7 && (
          <CatalogoTabla
            titulo="Motivos de drenaje" clave="lube-motivos" api={lubeApi.motivos}
            ayuda="Permite la pregunta que paga el programa: ¿cuántas cargas se botaron por calendario estando el aceite bueno?"
            campos={[
              { clave: 'codigo', etiqueta: 'Código' },
              { clave: 'nombre', etiqueta: 'Nombre', requerido: true },
              { clave: 'categoria', etiqueta: 'Categoría', tipo: 'select', opciones: [
                { valor: 'CALENDARIO', texto: 'Por calendario' }, { valor: 'CONDICION', texto: 'Por condición' },
                { valor: 'FALLA', texto: 'Por falla' }, { valor: 'CONTAMINACION', texto: 'Por contaminación' },
                { valor: 'INTERVENCION', texto: 'Por intervención' }] },
              { clave: 'evitable', etiqueta: 'Era evitable', tipo: 'switch',
                ayuda: 'Los evitables cuentan como oportunidad perdida en el tablero' },
              { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'area' },
            ]}
            columnas={[
              { clave: 'codigo', etiqueta: 'Cód.' },
              { clave: 'nombre', etiqueta: 'Motivo' },
              { clave: 'categoria', etiqueta: 'Categoría' },
              { clave: 'evitable', etiqueta: 'Evitable', render: (f: any) =>
                f.evitable ? chip('Sí', ESTADO.alerta) : chip('No', PALETA.acero) },
            ]}
          />
        )}

        {tab === 8 && (
          <Box>
            <Alert severity="warning" sx={{ mb: 2 }} icon={<Straighten />}>
              El método no es un adorno. Una muestra tomada por el tapón de drenaje arrastra el
              sedimento del fondo y da lecturas altas que no representan el aceite en
              circulación: mezclarla con el histórico hace que las tendencias no signifiquen nada.
            </Alert>
            <CatalogoTabla
              titulo="Métodos de muestreo" clave="lube-metodos" api={lubeApi.metodos}
              ayuda="Cómo se toma la muestra, con la calidad del dato que produce"
              campos={[
                { clave: 'nombre', etiqueta: 'Nombre', requerido: true },
                { clave: 'calidad', etiqueta: 'Calidad del dato', tipo: 'select', opciones: [
                  { valor: 'RECOMENDADO', texto: 'Recomendado' }, { valor: 'ACEPTABLE', texto: 'Aceptable' },
                  { valor: 'NO_RECOMENDADO', texto: 'No recomendado' }] },
                { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'area' },
              ]}
              columnas={[
                { clave: 'nombre', etiqueta: 'Método' },
                { clave: 'calidad', etiqueta: 'Calidad', render: (f: any) => chip(
                  { RECOMENDADO: 'Recomendado', ACEPTABLE: 'Aceptable', NO_RECOMENDADO: 'No recomendado' }[f.calidad as string] ?? f.calidad,
                  f.calidad === 'RECOMENDADO' ? ESTADO.exito : f.calidad === 'ACEPTABLE' ? ESTADO.alerta : ESTADO.peligro) },
                { clave: 'descripcion', etiqueta: 'Descripción' },
              ]}
            />
          </Box>
        )}

        {tab === 9 && (
          <CatalogoTabla
            titulo="Laboratorios" clave="lube-labs" api={lubeApi.laboratorios}
            ayuda="Los días de respuesta sirven para saber si una muestra está demorada o se perdió"
            campos={[
              { clave: 'nombre', etiqueta: 'Nombre', requerido: true },
              { clave: 'contacto', etiqueta: 'Contacto' },
              { clave: 'telefono', etiqueta: 'Teléfono' },
              { clave: 'correo', etiqueta: 'Correo' },
              { clave: 'dias_respuesta', etiqueta: 'Días de respuesta', tipo: 'numero' },
            ]}
            columnas={[
              { clave: 'nombre', etiqueta: 'Laboratorio' },
              { clave: 'contacto', etiqueta: 'Contacto' },
              { clave: 'telefono', etiqueta: 'Teléfono' },
              { clave: 'dias_respuesta', etiqueta: 'Días' },
            ]}
          />
        )}
      </Box>
    </Layout>
  )
}
