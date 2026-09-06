/**
 * Los expedientes: la carpeta de un conductor, de un vehículo, de un cliente.
 *
 * LA PREGUNTA ES QUÉ FALTA, NO QUÉ HAY
 * Un expediente se mira para saber si el conductor puede manejar o si el camión
 * puede salir. Por eso la completitud va primero y en color, y lo que falta se
 * nombra: «le falta la licencia» sirve; «85% completo» no le dice a nadie qué
 * hacer.
 *
 * LO QUE FALTA SE DEDUCE
 * `dms_expediente_documento` solo guarda lo que SÍ está adjunto —la columna del
 * documento es obligatoria—, así que lo pendiente es la ausencia de fila. La
 * lista de lo exigible por tipo de expediente vive aquí, y es la misma que usa
 * el sembrador.
 */
import { useState } from 'react'
import {
  Box, Typography, Chip, InputBase, alpha, Button, Tooltip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, TextField,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Inventory2, Search, CheckCircle, RemoveCircleOutline, Add, LinkOff,
} from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { dmsApi, type Expediente } from '@/api/dms'
import { useCrud } from '@/components/datos/useCrud'
import type { CampoEntidad } from '@/components/datos/FormularioEntidad'
import {
  BORDE, DMS_COLOR, COLOR_EXPEDIENTE, Estado, Panel,
  IconoArchivo, fecha, legible,
} from '@/components/dms/comunes'

/**
 * Qué documentos exige cada clase de expediente.
 *
 * Está aquí y no en la base porque hoy no hay tabla para ello: el esquema
 * guarda lo adjunto, no lo exigible. Ponerlo a la vista —en vez de esconderlo
 * en un cálculo— permite al menos que quien lo lea sepa contra qué se está
 * midiendo, y que cambiarlo sea una línea.
 */
const EXIGIDOS: Record<string, string[]> = {
  CONDUCTOR: ['Licencia de conducción', 'Hoja de vida', 'Certificado médico',
              'Examen ocupacional', 'Contrato laboral'],
  VEHICULO:  ['Tarjeta de propiedad', 'SOAT', 'Revisión técnico-mecánica',
              'Póliza de seguro'],
  EMPLEADO:  ['Contrato laboral', 'Hoja de vida', 'Examen ocupacional'],
  CLIENTE:   ['Contrato con cliente', 'Póliza de seguro'],
  PROVEEDOR: ['Contrato con cliente', 'Póliza de seguro'],
  PROYECTO:  ['Contrato con cliente'],
}
const TIPOS = Object.keys(EXIGIDOS)

const colorCompletitud = (p: number) =>
  p >= 100 ? '#059669' : p >= 60 ? '#F59E0B' : '#EF4444'

export default function DMSExpedientes() {
  const [busqueda, setBusqueda] = useState('')
  const [tipo, setTipo] = useState('Todos')
  const [abierto, setAbierto] = useState<Expediente | null>(null)

  const expedientes = useQuery({
    queryKey: ['dms', 'expedientes', tipo],
    queryFn: () => dmsApi.expedientes({ tipo: tipo === 'Todos' ? undefined : tipo }),
  })
  const todos = useQuery({
    queryKey: ['dms', 'expedientes'],
    queryFn: () => dmsApi.expedientes(),
  })

  const campos = (registro: Expediente | null): CampoEntidad[] => [
    { clave: 'codigo', etiqueta: 'Código', tipo: 'texto', ancho: 4,
      soloLectura: !!registro },
    { clave: 'nombre', etiqueta: 'De quién es', tipo: 'texto',
      obligatorio: true, ancho: 8,
      ayuda: 'El nombre del conductor, la placa del vehículo, la razón social.' },
    { clave: 'tipo', etiqueta: 'Clase de expediente', tipo: 'seleccion',
      obligatorio: true, ancho: 6, soloLectura: !!registro,
      opciones: TIPOS.map(t => ({ valor: t, etiqueta: legible(t) })),
      ayuda: registro ? undefined
        : 'Decide qué documentos se le van a exigir.' },
    { clave: 'estado', etiqueta: 'Estado', tipo: 'seleccion', ancho: 6,
      porDefecto: 'ACTIVO',
      opciones: ['ACTIVO', 'INACTIVO', 'ARCHIVADO']
        .map(v => ({ valor: v, etiqueta: legible(v) })) },
    { clave: 'descripcion', etiqueta: 'Notas', tipo: 'parrafo' },
  ]

  const crud = useCrud<Expediente>({
    nombre: 'expediente', campos, claves: [['dms']],
    titulo: e => e.nombre,
    crear: d => dmsApi.crearExpediente(d),
    editar: (id, d) => dmsApi.editarExpediente(id, d),
    eliminar: id => dmsApi.borrarExpediente(id),
    consecuencia: () =>
      'Los documentos NO se borran: siguen en el archivo. Lo que se pierde es '
      + 'el vínculo que los agrupaba.',
  })

  const universo = todos.data ?? []
  const texto = busqueda.trim().toLowerCase()
  const lista = (expedientes.data ?? []).filter(
    e => !texto || e.nombre.toLowerCase().includes(texto)
      || (e.codigo || '').toLowerCase().includes(texto))

  const completos = universo.filter(e => e.completitud_pct >= 100).length
  const criticos = universo.filter(e => e.completitud_pct < 60).length
  const promedio = universo.length
    ? Math.round(universo.reduce((s, e) => s + e.completitud_pct, 0) / universo.length)
    : null

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${DMS_COLOR} 0%, #1E40AF 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Inventory2 sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>Expedientes</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Qué documentos le faltan a cada conductor, vehículo o cliente
            </Typography>
          </Box>
          <crud.BotonNuevo />
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Expedientes', value: universo.length, color: DMS_COLOR },
            { label: 'Completos', value: completos, color: '#059669' },
            { label: 'Por debajo del 60%', value: criticos, color: '#EF4444' },
            { label: 'Completitud media',
              value: promedio == null ? '—' : `${promedio}%`, color: '#F59E0B' },
          ].map((s, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Box sx={{ border: `1px solid ${alpha(s.color, 0.3)}`, borderRadius: 2, p: 2 }}>
                <Typography sx={{ fontSize: 24, fontWeight: 900, lineHeight: 1,
                                  fontVariantNumeric: 'tabular-nums' }}>
                  {todos.isLoading ? '·' : s.value}
                </Typography>
                <Typography sx={{ fontSize: 11, color: s.color, fontWeight: 600, mt: 0.25 }}>
                  {s.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{
            display: 'flex', gap: 1, border: `1px solid ${BORDE}`, borderRadius: 2,
            px: 2, py: 1, alignItems: 'center', flex: 1, minWidth: 220,
            bgcolor: 'background.paper',
          }}>
            <Search sx={{ color: 'text.disabled', fontSize: 20 }} />
            <InputBase placeholder="Buscar por nombre o código…"
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              sx={{ flex: 1, fontSize: 13.5 }} />
          </Box>
          {['Todos', ...TIPOS].map(t => (
            <Chip key={t} label={t === 'Todos' ? 'Todos' : legible(t)} size="small"
              onClick={() => setTipo(t)}
              sx={{
                cursor: 'pointer',
                bgcolor: tipo === t ? (COLOR_EXPEDIENTE[t] || DMS_COLOR) : '#F1F5F9',
                color: tipo === t ? '#FFF' : 'text.secondary',
                fontWeight: tipo === t ? 700 : 400,
              }} />
          ))}
        </Box>

        <Estado cargando={expedientes.isLoading} error={expedientes.error}
          vacio={!lista.length}
          mensajeVacio={texto || tipo !== 'Todos'
            ? 'Ningún expediente coincide con ese filtro'
            : 'Todavía no hay expedientes'}
          hint={texto || tipo !== 'Todos' ? undefined
            : 'Un expediente agrupa los documentos obligatorios de alguien.'}>
          <Grid container spacing={2}>
            {lista.map(e => {
              const col = colorCompletitud(e.completitud_pct)
              const clase = COLOR_EXPEDIENTE[e.tipo] || DMS_COLOR
              return (
                <Grid key={e.id} size={{ xs: 12, md: 6, xl: 4 }}>
                  <Panel sx={{ p: 2, height: '100%',
                               borderColor: e.completitud_pct < 60
                                 ? alpha('#EF4444', 0.35) : BORDE }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between',
                               alignItems: 'flex-start', gap: 1, mb: 1 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 700 }} noWrap>
                          {e.nombre}
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                          {e.codigo} · abierto el {fecha(e.created_at)}
                        </Typography>
                      </Box>
                      <Chip label={legible(e.tipo)} size="small" sx={{
                        bgcolor: alpha(clase, 0.15), color: clase,
                        fontSize: 9.5, fontWeight: 700, flexShrink: 0,
                      }} />
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                        Documentación
                      </Typography>
                      <Typography sx={{ fontSize: 13, fontWeight: 800, color: col }}>
                        {e.completitud_pct}%
                      </Typography>
                    </Box>
                    <Box sx={{ height: 7, borderRadius: 4, bgcolor: '#EEF2F7',
                               overflow: 'hidden', mb: 1.25 }}>
                      <Box sx={{ height: '100%', width: `${e.completitud_pct}%`,
                                 bgcolor: col, borderRadius: 4 }} />
                    </Box>

                    <QueFalta expediente={e} />

                    <Box sx={{ display: 'flex', justifyContent: 'space-between',
                               alignItems: 'center', mt: 1.25, pt: 1.25,
                               borderTop: `1px solid ${BORDE}` }}>
                      <Button size="small" onClick={() => setAbierto(e)}
                        sx={{ textTransform: 'none', fontSize: 12, color: DMS_COLOR }}>
                        Ver documentos
                      </Button>
                      <crud.Acciones registro={e} />
                    </Box>
                  </Panel>
                </Grid>
              )
            })}
          </Grid>
        </Estado>

        <Contenido expediente={abierto} onCerrar={() => setAbierto(null)} />
        <crud.Dialogos />
      </Box>
    </Layout>
  )
}

/**
 * Los documentos exigidos que todavía no están. Es lo accionable.
 *
 * LÍMITE CONOCIDO: una consulta por tarjeta.
 * Hoy no hay endpoint que devuelva los adjuntos de varios expedientes a la vez,
 * así que cada tarjeta pide los suyos. Con las decenas que se manejan hoy es
 * aceptable —y la caché de React Query evita repetirlas al volver—, pero si un
 * cliente llega a centenares hay que añadir esa ruta al servidor: la pantalla
 * empezaría a tardar antes de mostrar nada útil.
 */
function QueFalta({ expediente }: { expediente: Expediente }) {
  const adjuntos = useQuery({
    queryKey: ['dms', 'expediente-docs', expediente.id],
    queryFn: () => dmsApi.documentosDeExpediente(expediente.id),
  })
  const exigidos = EXIGIDOS[expediente.tipo] ?? []
  const puestos = new Set((adjuntos.data ?? []).map(a => a.tipo_requerido))
  const faltan = exigidos.filter(t => !puestos.has(t))

  if (adjuntos.isLoading) {
    return <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>Revisando…</Typography>
  }
  if (!faltan.length) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
        <CheckCircle sx={{ fontSize: 15, color: '#059669' }} />
        <Typography sx={{ fontSize: 11.5, color: '#059669', fontWeight: 600 }}>
          No le falta nada
        </Typography>
      </Box>
    )
  }
  return (
    <Box>
      <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.5 }}>
        Le falta{faltan.length > 1 ? 'n' : ''}:
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        {faltan.map(t => (
          <Chip key={t} icon={<RemoveCircleOutline sx={{ fontSize: 13 }} />}
            label={t} size="small" sx={{
              height: 20, fontSize: 10.5,
              bgcolor: alpha('#EF4444', 0.1), color: '#B91C1C',
              '& .MuiChip-icon': { color: '#B91C1C' },
            }} />
        ))}
      </Box>
    </Box>
  )
}

/** Los documentos ya adjuntos, con la opción de sumar o quitar. */
function Contenido({ expediente, onCerrar }: {
  expediente: Expediente | null
  onCerrar: () => void
}) {
  const qc = useQueryClient()
  const [agregando, setAgregando] = useState(false)
  const [docElegido, setDocElegido] = useState<number | ''>('')
  const [tipoRequerido, setTipoRequerido] = useState('')

  const adjuntos = useQuery({
    queryKey: ['dms', 'expediente-docs', expediente?.id],
    queryFn: () => dmsApi.documentosDeExpediente(expediente!.id),
    enabled: !!expediente,
  })
  const documentos = useQuery({
    queryKey: ['dms', 'documentos', 'todos'],
    queryFn: () => dmsApi.documentos(),
    enabled: !!expediente,
  })

  const refrescar = () => qc.invalidateQueries({ queryKey: ['dms'] })

  const adjuntar = useMutation({
    mutationFn: () => dmsApi.adjuntarAExpediente({
      expediente_id: expediente!.id,
      documento_id: Number(docElegido),
      tipo_requerido: tipoRequerido || undefined,
      es_obligatorio: true,
    }),
    onSuccess: () => {
      toast.success('Documento adjuntado')
      setAgregando(false); setDocElegido(''); setTipoRequerido('')
      refrescar()
    },
    onError: (e: any) => toast.error(
      e?.response?.data?.detail ?? 'No se pudo adjuntar'),
  })

  const quitar = useMutation({
    mutationFn: (id: number) => dmsApi.quitarDeExpediente(id),
    onSuccess: () => { toast.success('Documento desvinculado'); refrescar() },
    onError: () => toast.error('No se pudo desvincular'),
  })

  const exigidos = expediente ? (EXIGIDOS[expediente.tipo] ?? []) : []
  const nombreDoc = (id: number) =>
    documentos.data?.find(d => d.id === id)?.nombre ?? `Documento #${id}`

  return (
    <Dialog open={!!expediente} onClose={onCerrar} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>
        {expediente?.nombre}
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', fontWeight: 400 }}>
          {expediente?.codigo} · {legible(expediente?.tipo ?? '')} ·
          {' '}{expediente?.completitud_pct}% completo
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Estado cargando={adjuntos.isLoading} error={adjuntos.error}
          vacio={!adjuntos.data?.length}
          mensajeVacio="Este expediente está vacío"
          hint="Use «Adjuntar documento» para empezar a llenarlo.">
          {adjuntos.data?.map(a => (
            <Box key={a.id} sx={{
              display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, mb: 1,
              borderRadius: 1.5, border: `1px solid ${BORDE}`, bgcolor: '#F9FAFB',
            }}>
              <IconoArchivo nombre={nombreDoc(a.documento_id)} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600 }} noWrap>
                  {nombreDoc(a.documento_id)}
                </Typography>
                {a.tipo_requerido && (
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                    cubre el requisito «{a.tipo_requerido}»
                  </Typography>
                )}
              </Box>
              <Tooltip title="Quitar del expediente (el documento no se borra)">
                <IconButton size="small" disabled={quitar.isPending}
                  onClick={() => quitar.mutate(a.id)}>
                  <LinkOff sx={{ fontSize: 17 }} />
                </IconButton>
              </Tooltip>
            </Box>
          ))}
        </Estado>

        {agregando && (
          <Box sx={{
            mt: 2, p: 2, borderRadius: 1.5,
            border: `1px solid ${alpha(DMS_COLOR, 0.35)}`,
            bgcolor: alpha(DMS_COLOR, 0.04),
          }}>
            <TextField select size="small" fullWidth sx={{ mb: 1.5 }}
              label="Documento" value={docElegido}
              onChange={e => setDocElegido(Number(e.target.value) || '')}>
              {documentos.data?.slice(0, 300).map(d => (
                <MenuItem key={d.id} value={d.id}>
                  {d.codigo} · {d.nombre}
                </MenuItem>
              ))}
            </TextField>
            <TextField select size="small" fullWidth sx={{ mb: 1.5 }}
              label="Qué requisito cubre" value={tipoRequerido}
              onChange={e => setTipoRequerido(e.target.value)}
              helperText="Sin esto, el documento suma pero no se sabe qué requisito tapa.">
              {exigidos.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button size="small" onClick={() => setAgregando(false)}
                sx={{ textTransform: 'none' }}>Cancelar</Button>
              <Button size="small" variant="contained"
                disabled={!docElegido || adjuntar.isPending}
                onClick={() => adjuntar.mutate()}
                sx={{ textTransform: 'none' }}>Adjuntar</Button>
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {!agregando && (
          <Button startIcon={<Add />} onClick={() => setAgregando(true)}
            sx={{ textTransform: 'none', mr: 'auto' }}>
            Adjuntar documento
          </Button>
        )}
        <Button onClick={onCerrar} sx={{ textTransform: 'none' }}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  )
}
