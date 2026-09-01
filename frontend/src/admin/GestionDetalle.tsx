/**
 * El detalle de una incidencia.
 *
 * Dos decisiones que gobiernan esta pantalla:
 *
 *  · **El título se edita en el sitio.** Es el gesto central del módulo: una
 *    solicitud llega con las palabras del cliente y el equipo la va reescribiendo
 *    a medida que entiende el pedido. Esconder eso detrás de un diálogo de
 *    edición haría que nadie lo hiciera.
 *  · **Las transiciones que faltan por cumplir algo se muestran, deshabilitadas
 *    y con el motivo.** Esconderlas dejaría a la gente buscando un botón que
 *    nadie quitó.
 */
import { useEffect, useState } from 'react'
import {
  Box, Dialog, DialogContent, Stack, Typography, Chip, Button, TextField,
  IconButton, Divider, Tooltip, Skeleton, Alert, Tabs, Tab, Autocomplete,
  MenuItem,
} from '@mui/material'
import {
  Close, Send, AttachFile, Edit, Check, History, ChatBubbleOutline,
  SupportAgent, Download, Tune,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { PALETA, ESTADO, COLOR_MODULO } from '@/config/marca'
import {
  gestionApi, mensajeDeError,
  type DetalleIncidencia, type Persona,
} from './api'
import { CamposDinamicos } from './GestionCampos'
import GestionFormulario from './GestionFormulario'

const COLOR_CATEGORIA: Record<string, string> = {
  SIN_CLASIFICAR: PALETA.acero,
  POR_HACER: PALETA.grafito,
  EN_CURSO: COLOR_MODULO,
  TERMINADO: ESTADO.exito,
}

function cuando(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleString('es-CO', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

/** El historial se lee mejor con el nombre del campo en español. */
const NOMBRE_CAMPO: Record<string, string> = {
  creada: 'Creación', resumen: 'Título', descripcion: 'Descripción',
  estado: 'Estado', asignado: 'Responsable', puntos: 'Estimación',
  prioridad_id: 'Prioridad', vence: 'Vencimiento', iniciado: 'Inicio',
  resuelto: 'Resolución', tipo: 'Tipo', padre: 'Padre', origen: 'Origen',
  etiquetas: 'Etiquetas', adjunto: 'Adjunto', vinculo: 'Vínculo',
}

export default function GestionDetalle({
  incidenciaId, onCerrar,
}: {
  incidenciaId: number | null
  onCerrar: () => void
}) {
  const qc = useQueryClient()
  const [pestana, setPestana] = useState(0)
  const [comentario, setComentario] = useState('')
  const [editandoTitulo, setEditandoTitulo] = useState(false)
  const [titulo, setTitulo] = useState('')
  const [campos, setCampos] = useState<Record<string, any>>({})
  const [problemas, setProblemas] = useState<string[]>([])
  // El formulario completo, con TODOS los campos configurados. El panel lateral
  // deja cambiar lo de todos los días sin abrirlo; esto es para lo demás.
  const [editandoTodo, setEditandoTodo] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['gestion', 'incidencia', incidenciaId],
    queryFn: () => gestionApi.detalle(incidenciaId!),
    enabled: incidenciaId != null,
  })

  // Las listas de apoyo del panel lateral. Se piden aparte y con caché larga:
  // cambian mucho menos que la incidencia y no tiene sentido volver a traerlas
  // cada vez que alguien mueve una tarjeta.
  const { data: personas } = useQuery({
    queryKey: ['gestion', 'personas'],
    queryFn: gestionApi.personas,
    staleTime: 5 * 60_000,
  })
  const { data: config } = useQuery({
    queryKey: ['gestion', 'config', data?.proyecto.id ?? null],
    queryFn: () => gestionApi.configuracion(data?.proyecto.id),
    enabled: !!data,
    staleTime: 5 * 60_000,
  })
  const { data: sugeridas } = useQuery({
    queryKey: ['gestion', 'etiquetas', data?.proyecto.id],
    queryFn: () => gestionApi.etiquetas(data?.proyecto.id),
    enabled: !!data,
    staleTime: 60_000,
  })

  useEffect(() => {
    if (data) {
      setTitulo(data.incidencia.resumen)
      setCampos(data.incidencia.campos || {})
      setEditandoTitulo(false)
      setProblemas([])
    }
  }, [data?.incidencia.id, data?.incidencia.resumen])

  function refrescar() {
    qc.invalidateQueries({ queryKey: ['gestion', 'incidencia', incidenciaId] })
    qc.invalidateQueries({ queryKey: ['gestion', 'lista'] })
    qc.invalidateQueries({ queryKey: ['gestion', 'tablero'] })
  }

  const editar = useMutation({
    mutationFn: (cambios: Record<string, unknown>) =>
      gestionApi.editar(incidenciaId!, cambios),
    onSuccess: () => { setProblemas([]); refrescar() },
    onError: (e: any) => {
      const d = e?.response?.data?.detail
      if (d?.campos) { setProblemas(d.campos); return }
      toast.error(mensajeDeError(e, 'No se pudo guardar'))
    },
  })

  const mover = useMutation({
    mutationFn: (transicionId: number) =>
      gestionApi.transicionar(incidenciaId!, transicionId),
    onSuccess: r => { toast.success(`Ahora está en «${r.incidencia.estado}»`); refrescar() },
    onError: (e: any) => toast.error(mensajeDeError(e, 'No se pudo mover')),
  })

  const comentar = useMutation({
    mutationFn: () => gestionApi.comentar(incidenciaId!, comentario, false),
    onSuccess: () => { setComentario(''); refrescar() },
    onError: (e: any) => toast.error(mensajeDeError(e, 'No se pudo comentar')),
  })

  const adjuntar = useMutation({
    mutationFn: (archivos: FileList) => {
      const fd = new FormData()
      Array.from(archivos).forEach(a => fd.append('archivos', a))
      return gestionApi.adjuntar(incidenciaId!, fd)
    },
    onSuccess: () => { toast.success('Archivo adjuntado'); refrescar() },
    onError: (e: any) => toast.error(mensajeDeError(e, 'No se pudo adjuntar')),
  })

  async function descargar(id: number, nombre: string) {
    try {
      const blob = await gestionApi.descargarAdjunto(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = nombre; a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      toast.error(mensajeDeError(e, 'No se pudo descargar'))
    }
  }

  return (
    <Dialog open={incidenciaId != null} onClose={onCerrar} maxWidth="lg" fullWidth
      PaperProps={{ sx: { borderRadius: 2, minHeight: '70vh' } }}>
      <DialogContent sx={{ p: 0 }}>
        {isLoading || !data ? (
          <Box sx={{ p: 3 }}>
            <Skeleton height={40} /><Skeleton height={24} width="60%" />
            <Skeleton height={200} sx={{ mt: 2 }} />
          </Box>
        ) : (
          <Cuerpo
            data={data} titulo={titulo} setTitulo={setTitulo}
            editandoTitulo={editandoTitulo} setEditandoTitulo={setEditandoTitulo}
            campos={campos} setCampos={setCampos} problemas={problemas}
            pestana={pestana} setPestana={setPestana}
            comentario={comentario} setComentario={setComentario}
            onCerrar={onCerrar}
            onGuardarTitulo={() => {
              if (titulo.trim() && titulo !== data.incidencia.resumen) {
                editar.mutate({ resumen: titulo.trim() })
              }
              setEditandoTitulo(false)
            }}
            onGuardarCampos={() => editar.mutate({ campos })}
            onGuardarCampo={(c, v) => editar.mutate({ [c]: v })}
            onMover={id => mover.mutate(id)}
            onComentar={() => comentar.mutate()}
            onAdjuntar={f => adjuntar.mutate(f)}
            onDescargar={descargar}
            guardando={editar.isPending}
            moviendo={mover.isPending}
            personas={personas ?? []}
            prioridades={config?.prioridades ?? []}
            sugeridas={(sugeridas ?? []).map(e => e.etiqueta)}
            onEditarTodo={() => setEditandoTodo(true)}
          />
        )}
      </DialogContent>

      {data && (
        <GestionFormulario
          abierto={editandoTodo} incidenciaId={data.incidencia.id}
          proyecto={null} proyectos={[]}
          onCerrar={() => setEditandoTodo(false)}
          onGuardada={() => refrescar()}
        />
      )}
    </Dialog>
  )
}

function Cuerpo(p: {
  data: DetalleIncidencia
  titulo: string; setTitulo: (s: string) => void
  editandoTitulo: boolean; setEditandoTitulo: (b: boolean) => void
  campos: Record<string, any>; setCampos: (c: Record<string, any>) => void
  problemas: string[]
  pestana: number; setPestana: (n: number) => void
  comentario: string; setComentario: (s: string) => void
  onCerrar: () => void
  onGuardarTitulo: () => void
  onGuardarCampos: () => void
  onGuardarCampo: (campo: string, valor: any) => void
  onMover: (id: number) => void
  onComentar: () => void
  onAdjuntar: (f: FileList) => void
  onDescargar: (id: number, nombre: string) => void
  guardando: boolean
  moviendo: boolean
  personas: Persona[]
  prioridades: { id: number; nombre: string; color?: string | null }[]
  sugeridas: string[]
  onEditarTodo: () => void
}) {
  const { data } = p
  const inc = data.incidencia

  return (
    <Box>
      {/* ── Cabecera ── */}
      <Box sx={{ px: 3, pt: 2.5, pb: 2, borderBottom: `1px solid ${PALETA.niebla}` }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
          <Chip label={inc.clave} size="small" sx={{
            height: 20, fontFamily: 'monospace', fontWeight: 800, fontSize: 11,
            bgcolor: PALETA.niebla,
          }} />
          <Chip label={inc.tipo ?? '—'} size="small" variant="outlined"
            sx={{ height: 20, fontSize: 10.5 }} />
          <Chip label={inc.estado ?? '—'} size="small" sx={{
            height: 20, fontSize: 10.5, fontWeight: 700,
            bgcolor: `${COLOR_CATEGORIA[inc.categoria ?? ''] ?? PALETA.acero}1F`,
            color: COLOR_CATEGORIA[inc.categoria ?? ''] ?? PALETA.acero,
          }} />
          {inc.ticket_id && (
            <Tooltip title="Nació de una solicitud de soporte. El asunto que ve el cliente sigue siendo el suyo.">
              <Chip icon={<SupportAgent sx={{ fontSize: 13 }} />}
                label={`soporte #${inc.ticket_id}`} size="small"
                sx={{ height: 20, fontSize: 10, bgcolor: `${COLOR_MODULO}14`, color: COLOR_MODULO }} />
            </Tooltip>
          )}
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Abrir el formulario completo, con todos los campos configurados">
            <Button size="small" startIcon={<Tune sx={{ fontSize: 15 }} />}
              onClick={p.onEditarTodo} sx={{ textTransform: 'none' }}>
              Editar todo
            </Button>
          </Tooltip>
          <IconButton size="small" onClick={p.onCerrar}><Close fontSize="small" /></IconButton>
        </Stack>

        {p.editandoTitulo ? (
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <TextField
              size="small" fullWidth multiline autoFocus value={p.titulo}
              onChange={e => p.setTitulo(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); p.onGuardarTitulo() }
                if (e.key === 'Escape') { p.setTitulo(inc.resumen); p.setEditandoTitulo(false) }
              }}
              InputProps={{ sx: { fontSize: 20, fontWeight: 700 } }}
            />
            <IconButton size="small" onClick={p.onGuardarTitulo} disabled={p.guardando}>
              <Check fontSize="small" />
            </IconButton>
          </Stack>
        ) : (
          <Stack direction="row" alignItems="flex-start" spacing={1}>
            <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3, flex: 1 }}>
              {inc.resumen}
            </Typography>
            <Tooltip title="Reescribir el título. Queda en el historial y no cambia lo que ve el cliente.">
              <IconButton size="small" onClick={() => p.setEditandoTitulo(true)}>
                <Edit sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Stack>
        )}

        {/* ── Transiciones ── */}
        <Stack direction="row" spacing={1} mt={2} flexWrap="wrap" useFlexGap>
          {data.transiciones.map(t => (
            <Tooltip key={t.id} title={t.impedimentos.join(' · ')} arrow
              disableHoverListener={t.lista}>
              <span>
                <Button
                  size="small" variant={t.lista ? 'outlined' : 'text'}
                  disabled={!t.lista || p.moviendo}
                  onClick={() => p.onMover(t.id)}
                  sx={{ textTransform: 'none' }}
                >
                  {t.nombre}
                </Button>
              </span>
            </Tooltip>
          ))}
          {!data.transiciones.length && (
            <Typography variant="caption" sx={{ color: PALETA.acero }}>
              No hay movimientos disponibles desde este estado.
            </Typography>
          )}
        </Stack>
      </Box>

      {/* ── Cuerpo en dos columnas ── */}
      <Stack direction={{ xs: 'column', md: 'row' }}>
        <Box sx={{ flex: 1, p: 3, minWidth: 0 }}>
          <Tabs value={p.pestana} onChange={(_, v) => p.setPestana(v)}
            sx={{ mb: 2, minHeight: 36, '& .MuiTab-root': { minHeight: 36, textTransform: 'none' } }}>
            <Tab icon={<ChatBubbleOutline sx={{ fontSize: 15 }} />} iconPosition="start"
              label={`Conversación (${data.comentarios.length})`} />
            <Tab icon={<History sx={{ fontSize: 15 }} />} iconPosition="start"
              label="Historial" />
          </Tabs>

          {p.pestana === 0 && (
            <Box>
              {data.descripcion && (
                <Box sx={{
                  p: 1.5, mb: 2, borderRadius: 1.5, bgcolor: PALETA.bruma,
                  whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6,
                }}>
                  {data.descripcion}
                </Box>
              )}

              <Stack spacing={1.5}>
                {data.comentarios.map(c => (
                  <Box key={c.id}>
                    <Stack direction="row" spacing={1} alignItems="baseline">
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {c.autor}
                      </Typography>
                      <Typography variant="caption" sx={{ color: PALETA.acero }}>
                        {cuando(c.created_at)}{c.editado ? ' · editado' : ''}
                      </Typography>
                    </Stack>
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', mt: 0.25 }}>
                      {c.cuerpo}
                    </Typography>
                  </Box>
                ))}
                {!data.comentarios.length && (
                  <Typography variant="caption" sx={{ color: PALETA.acero }}>
                    Todavía nadie ha comentado.
                  </Typography>
                )}
              </Stack>

              <Stack direction="row" spacing={1} mt={2} alignItems="flex-end">
                <TextField
                  size="small" fullWidth multiline maxRows={6} placeholder="Escribir un comentario…"
                  value={p.comentario} onChange={e => p.setComentario(e.target.value)}
                />
                <Button size="small" variant="contained" startIcon={<Send sx={{ fontSize: 15 }} />}
                  disabled={!p.comentario.trim()} onClick={p.onComentar}>
                  Enviar
                </Button>
              </Stack>

              {/* ── Adjuntos ── */}
              <Divider sx={{ my: 2 }} />
              <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                <Button size="small" component="label" startIcon={<AttachFile sx={{ fontSize: 15 }} />}
                  sx={{ textTransform: 'none' }}>
                  Adjuntar
                  <input hidden type="file" multiple onChange={e => {
                    if (e.target.files?.length) p.onAdjuntar(e.target.files)
                    e.target.value = ''
                  }} />
                </Button>
                {data.adjuntos.map(a => (
                  <Chip key={a.id} size="small" icon={<Download sx={{ fontSize: 13 }} />}
                    label={a.nombre} onClick={() => p.onDescargar(a.id, a.nombre)}
                    sx={{ height: 22, fontSize: 11 }} />
                ))}
              </Stack>
            </Box>
          )}

          {p.pestana === 1 && (
            <Stack spacing={1}>
              {data.historial.map((h, i) => (
                <Stack key={i} direction="row" spacing={1} alignItems="baseline"
                  sx={{ fontSize: 13 }}>
                  <Typography variant="caption" sx={{
                    color: PALETA.acero, minWidth: 96, fontFamily: 'monospace', fontSize: 10.5,
                  }}>
                    {cuando(h.creado)}
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      {NOMBRE_CAMPO[h.campo] ?? h.campo}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: 12.5 }}>
                      {h.anterior && (
                        <Box component="span" sx={{
                          color: PALETA.acero, textDecoration: 'line-through', mr: 0.75,
                        }}>
                          {h.anterior}
                        </Box>
                      )}
                      {h.nuevo ?? <em style={{ color: PALETA.acero }}>vacío</em>}
                    </Typography>
                  </Box>
                  <Typography variant="caption" sx={{ color: PALETA.acero }}>
                    {h.autor}
                  </Typography>
                </Stack>
              ))}
              {!data.historial.length && (
                <Typography variant="caption" sx={{ color: PALETA.acero }}>
                  Sin cambios registrados.
                </Typography>
              )}
            </Stack>
          )}
        </Box>

        {/* ── Panel lateral ── */}
        <Box sx={{
          width: { xs: '100%', md: 320 }, flexShrink: 0, p: 3,
          borderLeft: { md: `1px solid ${PALETA.niebla}` }, bgcolor: PALETA.bruma,
        }}>
          <Stack spacing={1.5}>
            <Dato etiqueta="Proyecto" valor={data.proyecto.nombre} />

            {/* Editables en el sitio. En una herramienta de trabajo, reasignar o
                reestimar es lo que más se hace: detrás de un diálogo de edición
                se hace la mitad de las veces. */}
            <Autocomplete
              size="small" options={p.personas} value={
                p.personas.find(x => x.usuario === inc.asignado) ?? null}
              getOptionLabel={x => x.nombre}
              onChange={(_, v) => p.onGuardarCampo('asignado', v?.usuario ?? null)}
              renderInput={q => <TextField {...q} label="Responsable" variant="standard" />}
            />

            <Autocomplete
              size="small" options={p.personas} value={
                p.personas.find(x => x.usuario === inc.reporta) ?? null}
              getOptionLabel={x => x.nombre}
              onChange={(_, v) => p.onGuardarCampo('reporta', v?.usuario ?? null)}
              renderInput={q => <TextField {...q} label="Reportó" variant="standard" />}
            />

            <TextField
              select size="small" variant="standard" label="Prioridad"
              value={inc.prioridad_id ?? ''}
              onChange={e => p.onGuardarCampo('prioridad_id', Number(e.target.value))}
            >
              {p.prioridades.map(x => (
                <MenuItem key={x.id} value={x.id}>{x.nombre}</MenuItem>
              ))}
            </TextField>

            <TextField
              select size="small" variant="standard" label="Estimación"
              value={inc.puntos ?? ''}
              onChange={e => p.onGuardarCampo(
                'puntos', e.target.value === '' ? null : Number(e.target.value))}
            >
              <MenuItem value=""><em>Sin estimar</em></MenuItem>
              {[1, 2, 3, 5, 8, 13, 21].map(n => (
                <MenuItem key={n} value={n}>{n}</MenuItem>
              ))}
            </TextField>

            <Autocomplete
              multiple freeSolo size="small" options={p.sugeridas}
              value={inc.etiquetas}
              onChange={(_, v) => p.onGuardarCampo(
                'etiquetas', v.map(x => String(x).trim()).filter(Boolean))}
              renderTags={(valores, getProps) =>
                valores.map((v, i) => (
                  <Chip {...getProps({ index: i })} key={v} label={v} size="small"
                    sx={{ height: 20, fontSize: 10.5 }} />
                ))}
              renderInput={q => <TextField {...q} label="Etiquetas" variant="standard" />}
            />

            <Divider sx={{ my: 0.5 }} />

            {/* El plan: es lo que dibuja la barra del Gantt. */}
            <Stack direction="row" spacing={1}>
              <TextField
                size="small" type="date" variant="standard" label="Inicio previsto"
                InputLabelProps={{ shrink: true }} fullWidth
                defaultValue={(inc as any).inicio_plan?.slice(0, 10) ?? data.inicio_plan?.slice(0, 10) ?? ''}
                onBlur={e => p.onGuardarCampo(
                  'inicio_plan', e.target.value ? new Date(e.target.value).toISOString() : null)}
              />
              <TextField
                size="small" type="date" variant="standard" label="Vence"
                InputLabelProps={{ shrink: true }} fullWidth
                defaultValue={inc.vence ? String(inc.vence).slice(0, 10) : ''}
                onBlur={e => p.onGuardarCampo(
                  'vence', e.target.value ? new Date(e.target.value).toISOString() : null)}
              />
            </Stack>

            <Divider sx={{ my: 0.5 }} />

            <Dato etiqueta="Creada" valor={cuando(data.creado) || '—'} />
            {data.iniciado && <Dato etiqueta="Empezó de verdad" valor={cuando(data.iniciado)} />}
            {data.resuelto && <Dato etiqueta="Resuelta" valor={cuando(data.resuelto)} />}

            {!!data.definicion_campos.length && (
              <>
                <Divider sx={{ my: 0.5 }} />
                {!!p.problemas.length && (
                  <Alert severity="warning" sx={{ py: 0.5, fontSize: 12 }}>
                    {p.problemas[0]}
                  </Alert>
                )}
                <CamposDinamicos
                  definicion={data.definicion_campos}
                  valores={p.campos}
                  problemas={p.problemas}
                  onCambio={(clave, valor) => p.setCampos({ ...p.campos, [clave]: valor })}
                />
                <Button size="small" variant="outlined" disabled={p.guardando}
                  onClick={p.onGuardarCampos} sx={{ textTransform: 'none' }}>
                  Guardar campos
                </Button>
              </>
            )}

            {!!data.subtareas.length && (
              <>
                <Divider sx={{ my: 0.5 }} />
                <Etiqueta>Subtareas</Etiqueta>
                {data.subtareas.map(s => (
                  <Typography key={s.id} variant="caption" sx={{ display: 'block' }}>
                    <b style={{ fontFamily: 'monospace' }}>{s.clave}</b> {s.resumen}
                  </Typography>
                ))}
              </>
            )}

            {!!data.vinculos.length && (
              <>
                <Divider sx={{ my: 0.5 }} />
                <Etiqueta>Relacionadas</Etiqueta>
                {data.vinculos.map(v => (
                  <Typography key={v.id} variant="caption" sx={{ display: 'block' }}>
                    {v.tipo.toLowerCase()} · <b style={{ fontFamily: 'monospace' }}>
                      {v.otra?.clave}</b> {v.otra?.resumen}
                  </Typography>
                ))}
              </>
            )}
          </Stack>
        </Box>
      </Stack>
    </Box>
  )
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="caption" sx={{
      fontWeight: 800, letterSpacing: '0.07em', color: PALETA.acero, fontSize: 9.5,
    }}>
      {String(children).toUpperCase()}
    </Typography>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <Box>
      <Etiqueta>{etiqueta}</Etiqueta>
      <Typography variant="body2" sx={{ fontSize: 13 }}>{valor}</Typography>
    </Box>
  )
}
