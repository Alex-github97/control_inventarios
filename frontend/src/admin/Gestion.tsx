/**
 * Proyectos e incidencias.
 *
 * El trabajo interno del equipo: lo que llega por el chat de soporte y se decide
 * hacer, más lo que nadie pidió pero hay que hacer igual.
 *
 * La lista se pagina por cursor y no por número de página. Con una lista que
 * cambia mientras se recorre, «página 3» se salta o repite filas; el cursor
 * apunta a una posición concreta del orden y sigue siendo correcto aunque entren
 * incidencias nuevas mientras alguien baja.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  Box, Stack, Typography, Button, Chip, Card, Table, TableBody, TableCell,
  TableHead, TableRow, Skeleton, Alert, Tabs, Tab, TextField, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tooltip,
} from '@mui/material'
import {
  Add, ViewList, ViewKanban, FolderOpen, Refresh, ArrowDownward,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { PALETA, ESTADO, COLOR_MODULO } from '@/config/marca'
import {
  gestionApi, mensajeDeError,
  type Incidencia, type Proyecto, type ConfiguracionGestion,
} from './api'
import { BarraDeFiltro } from './GestionFiltro'
import GestionDetalle from './GestionDetalle'
import GestionTablero from './GestionTablero'
import { CamposDinamicos } from './GestionCampos'

const COLOR_CATEGORIA: Record<string, string> = {
  SIN_CLASIFICAR: PALETA.acero,
  POR_HACER: PALETA.grafito,
  EN_CURSO: COLOR_MODULO,
  TERMINADO: ESTADO.exito,
}

function cuando(iso?: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

// ─── Alta ─────────────────────────────────────────────────────────────────────

function DialogoAlta({
  proyecto, config, abierto, onCerrar, onCreada,
}: {
  proyecto: Proyecto
  config?: ConfiguracionGestion
  abierto: boolean
  onCerrar: () => void
  onCreada: (id: number) => void
}) {
  const qc = useQueryClient()
  const [tipoId, setTipoId] = useState<number | ''>('')
  const [resumen, setResumen] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [prioridadId, setPrioridadId] = useState<number | ''>('')
  const [campos, setCampos] = useState<Record<string, any>>({})
  const [problemas, setProblemas] = useState<string[]>([])

  useEffect(() => {
    if (!abierto || !config) return
    // Se propone un tipo normal: crear una épica o una subtarea es la excepción,
    // y dejar el selector vacío obliga a un clic más en el caso corriente.
    const normal = config.tipos.find(t => t.nivel === 'NORMAL')
    setTipoId(normal?.id ?? config.tipos[0]?.id ?? '')
    setPrioridadId(config.prioridades.find(p => p.por_defecto)?.id ?? '')
    setResumen(''); setDescripcion(''); setCampos({}); setProblemas([])
  }, [abierto, config])

  const crear = useMutation({
    mutationFn: () => gestionApi.crear({
      proyecto_id: proyecto.id, tipo_id: tipoId, resumen, descripcion,
      prioridad_id: prioridadId || null, campos,
    }),
    onSuccess: inc => {
      toast.success(`Creada ${inc.clave}`)
      qc.invalidateQueries({ queryKey: ['gestion'] })
      onCerrar()
      onCreada(inc.id)
    },
    onError: (e: any) => {
      const d = e?.response?.data?.detail
      if (d?.campos) { setProblemas(d.campos); return }
      toast.error(mensajeDeError(e, 'No se pudo crear'))
    },
  })

  return (
    <Dialog open={abierto} onClose={onCerrar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        Nueva incidencia en {proyecto.nombre}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Stack direction="row" spacing={2}>
            <TextField
              select size="small" label="Tipo" fullWidth value={tipoId}
              onChange={e => setTipoId(Number(e.target.value))}
            >
              {config?.tipos.map(t => (
                <MenuItem key={t.id} value={t.id}>
                  {t.icono} {t.nombre}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select size="small" label="Prioridad" fullWidth value={prioridadId}
              onChange={e => setPrioridadId(Number(e.target.value))}
            >
              {config?.prioridades.map(p => (
                <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
              ))}
            </TextField>
          </Stack>

          <TextField
            size="small" label="Título" fullWidth autoFocus required
            value={resumen} onChange={e => setResumen(e.target.value)}
            helperText="Se puede reescribir después, cuantas veces haga falta."
          />
          <TextField
            size="small" label="Descripción" fullWidth multiline minRows={3}
            value={descripcion} onChange={e => setDescripcion(e.target.value)}
          />

          {!!config?.campos.length && (
            <CamposDinamicos
              definicion={config.campos} valores={campos} problemas={problemas}
              onCambio={(clave, valor) => setCampos({ ...campos, [clave]: valor })}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCerrar} sx={{ textTransform: 'none' }}>Cancelar</Button>
        <Button
          variant="contained" disabled={!resumen.trim() || !tipoId || crear.isPending}
          onClick={() => crear.mutate()} sx={{ textTransform: 'none' }}
        >
          Crear
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Lista ────────────────────────────────────────────────────────────────────

function Lista({
  proyecto, expresion, onAbrir,
}: {
  proyecto: Proyecto
  expresion: string
  onAbrir: (id: number) => void
}) {
  const [paginas, setPaginas] = useState<Incidencia[][]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hayMas, setHayMas] = useState(false)
  const [total, setTotal] = useState<number | null>(null)
  const [cargando, setCargando] = useState(false)

  // El filtro siempre lleva el proyecto: la barra escribe condiciones sobre lo
  // que ya está acotado, no sobre toda la base.
  const consulta = useMemo(() => {
    const base = `proyecto = "${proyecto.clave}"`
    return expresion.trim() ? `${base} Y ${expresion.trim()}` : base
  }, [proyecto.clave, expresion])

  async function traer(desde: string | null) {
    setCargando(true)
    try {
      const p = await gestionApi.buscar({
        expresion: consulta, limite: 25, cursor: desde, con_total: desde == null,
      })
      setPaginas(anteriores => (desde == null ? [p.resultados] : [...anteriores, p.resultados]))
      setCursor(p.siguiente ?? null)
      setHayMas(!!p.siguiente)
      if (desde == null) setTotal(p.total ?? null)
    } catch (e: any) {
      toast.error(mensajeDeError(e, 'No se pudo consultar'))
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { traer(null) }, [consulta])

  const filas = paginas.flat()

  if (cargando && !filas.length) {
    return <Skeleton variant="rounded" height={280} />
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ bgcolor: PALETA.bruma }}>
            <TableCell sx={{ fontWeight: 800, fontSize: 11, width: 92 }}>CLAVE</TableCell>
            <TableCell sx={{ fontWeight: 800, fontSize: 11 }}>TÍTULO</TableCell>
            <TableCell sx={{ fontWeight: 800, fontSize: 11, width: 130 }}>ESTADO</TableCell>
            <TableCell sx={{ fontWeight: 800, fontSize: 11, width: 110 }}>PRIORIDAD</TableCell>
            <TableCell sx={{ fontWeight: 800, fontSize: 11, width: 130 }}>RESPONSABLE</TableCell>
            <TableCell sx={{ fontWeight: 800, fontSize: 11, width: 60 }} align="right">PT</TableCell>
            <TableCell sx={{ fontWeight: 800, fontSize: 11, width: 120 }}>ACTUALIZADA</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filas.map(t => (
            <TableRow
              key={t.id} hover onClick={() => onAbrir(t.id)}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12 }}>
                {t.clave}
              </TableCell>
              <TableCell>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  {t.icono && <span>{t.icono}</span>}
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {t.resumen}
                  </Typography>
                  {t.ticket_id && (
                    <Chip label="soporte" size="small" variant="outlined"
                      sx={{ height: 16, fontSize: 8.5 }} />
                  )}
                </Stack>
              </TableCell>
              <TableCell>
                <Chip label={t.estado ?? '—'} size="small" sx={{
                  height: 20, fontSize: 10.5, fontWeight: 700,
                  bgcolor: `${COLOR_CATEGORIA[t.categoria ?? ''] ?? PALETA.acero}1F`,
                  color: COLOR_CATEGORIA[t.categoria ?? ''] ?? PALETA.acero,
                }} />
              </TableCell>
              <TableCell>
                <Typography variant="caption" sx={{ color: t.color_prioridad || 'inherit', fontWeight: 600 }}>
                  {t.prioridad ?? '—'}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="caption" sx={{ color: t.asignado ? 'inherit' : PALETA.acero }}>
                  {t.asignado ?? 'sin asignar'}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="caption" sx={{
                  fontWeight: 700, color: t.puntos == null ? PALETA.acero : 'inherit',
                }}>
                  {t.puntos ?? '—'}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="caption" sx={{ color: PALETA.acero }}>
                  {cuando(t.actualizado)}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
          {!filas.length && !cargando && (
            <TableRow>
              <TableCell colSpan={7} sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: PALETA.acero }}>
                  No hay incidencias que cumplan el filtro.
                </Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Stack direction="row" alignItems="center" spacing={1}
        sx={{ px: 2, py: 1, borderTop: `1px solid ${PALETA.niebla}` }}>
        <Typography variant="caption" sx={{ color: PALETA.acero }}>
          {filas.length}{total != null ? ` de ${total}` : ''}
        </Typography>
        <Box sx={{ flex: 1 }} />
        {hayMas && (
          <Button size="small" startIcon={<ArrowDownward sx={{ fontSize: 14 }} />}
            disabled={cargando} onClick={() => traer(cursor)}
            sx={{ textTransform: 'none' }}>
            Cargar más
          </Button>
        )}
      </Stack>
    </Card>
  )
}

// ─── La pantalla ──────────────────────────────────────────────────────────────

export default function Gestion() {
  const qc = useQueryClient()
  const [proyectoId, setProyectoId] = useState<number | null>(null)
  const [vista, setVista] = useState(0)
  const [expresion, setExpresion] = useState('')
  const [aplicada, setAplicada] = useState('')
  const [abierta, setAbierta] = useState<number | null>(null)
  const [creando, setCreando] = useState(false)

  const { data: proyectos, isLoading, error } = useQuery({
    queryKey: ['gestion', 'proyectos'],
    queryFn: () => gestionApi.proyectos(),
  })

  useEffect(() => {
    if (proyectos?.length && proyectoId == null) setProyectoId(proyectos[0].id)
  }, [proyectos, proyectoId])

  const proyecto = proyectos?.find(p => p.id === proyectoId) ?? null

  const { data: config } = useQuery({
    queryKey: ['gestion', 'config', proyectoId],
    queryFn: () => gestionApi.configuracion(proyectoId!),
    enabled: proyectoId != null,
    staleTime: 5 * 60_000,
  })

  if (isLoading) return <Skeleton variant="rounded" height={400} />

  if (error) {
    return (
      <Alert severity="error">
        {mensajeDeError(error, 'No se pudieron cargar los proyectos')}
      </Alert>
    )
  }

  if (!proyectos?.length) {
    return (
      <Alert severity="info" icon={<FolderOpen />}>
        Todavía no hay ningún proyecto. El primero se crea con el flujo estándar
        que ya trae la plataforma.
      </Alert>
    )
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} mb={2} flexWrap="wrap" useFlexGap>
        <TextField
          select size="small" value={proyectoId ?? ''} sx={{ minWidth: 260 }}
          onChange={e => { setProyectoId(Number(e.target.value)); setExpresion(''); setAplicada('') }}
        >
          {proyectos.map(p => (
            <MenuItem key={p.id} value={p.id}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <span>{p.icono}</span>
                <span>{p.nombre}</span>
                <Chip label={p.abiertas} size="small" sx={{
                  height: 17, fontSize: 9.5, fontWeight: 800, bgcolor: PALETA.niebla,
                }} />
                {p.restringido && (
                  <Chip label="restringido" size="small" variant="outlined"
                    sx={{ height: 17, fontSize: 8.5 }} />
                )}
              </Stack>
            </MenuItem>
          ))}
        </TextField>

        <Tabs value={vista} onChange={(_, v) => setVista(v)}
          sx={{ minHeight: 34, '& .MuiTab-root': { minHeight: 34, textTransform: 'none' } }}>
          <Tab icon={<ViewList sx={{ fontSize: 16 }} />} iconPosition="start" label="Lista" />
          <Tab icon={<ViewKanban sx={{ fontSize: 16 }} />} iconPosition="start" label="Tablero" />
        </Tabs>

        <Box sx={{ flex: 1 }} />

        <Tooltip title="Volver a consultar">
          <IconButton size="small" onClick={() => qc.invalidateQueries({ queryKey: ['gestion'] })}>
            <Refresh fontSize="small" />
          </IconButton>
        </Tooltip>
        <Button size="small" variant="contained" startIcon={<Add />}
          disabled={!proyecto} onClick={() => setCreando(true)}
          sx={{ textTransform: 'none' }}>
          Nueva incidencia
        </Button>
      </Stack>

      {proyecto?.descripcion && (
        <Typography variant="caption" sx={{ color: PALETA.acero, display: 'block', mb: 2 }}>
          {proyecto.descripcion}
        </Typography>
      )}

      {vista === 0 && (
        <>
          <Box sx={{ mb: 1 }}>
            <BarraDeFiltro
              expresion={expresion} onCambio={setExpresion}
              onBuscar={() => setAplicada(expresion)}
            />
          </Box>
          {proyecto && (
            <Lista proyecto={proyecto} expresion={aplicada} onAbrir={setAbierta} />
          )}
        </>
      )}

      {vista === 1 && proyecto && (
        <GestionTablero proyecto={proyecto} onAbrir={setAbierta} />
      )}

      {proyecto && (
        <DialogoAlta
          proyecto={proyecto} config={config} abierto={creando}
          onCerrar={() => setCreando(false)} onCreada={setAbierta}
        />
      )}

      <GestionDetalle incidenciaId={abierta} onCerrar={() => setAbierta(null)} />
    </Box>
  )
}
