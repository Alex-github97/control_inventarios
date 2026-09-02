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
  SupportAgent, Download, Tune, AccountTree,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { PALETA, ESTADO, COLOR_MODULO } from '@/config/marca'
import {
  gestionApi, mensajeDeError,
  type AdjuntoGestion, type DetalleIncidencia,
} from './api'
import GestionFormulario, { Campo } from './GestionFormulario'

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


/** Adjuntar arrastrando, pegando del portapapeles, o escogiendo un archivo.
 *
 *  Lo de pegar es lo que de verdad hace falta: la evidencia de un fallo casi
 *  siempre es un pantallazo, y un pantallazo recien tomado esta en el
 *  portapapeles, no en un archivo. Obligar a guardarlo primero convierte tres
 *  segundos en media docena de pasos, y el resultado es que la gente describe el
 *  error con palabras en vez de mostrarlo.
 *
 *  El pegado se escucha en toda la ficha y no solo en esta zona: nadie hace clic
 *  en el area de adjuntos antes de pulsar Ctrl+V. Se ignora cuando el foco esta
 *  en un campo de texto, para no robarle el pegado a quien esta escribiendo un
 *  comentario.
 */
function ZonaAdjuntos({
  adjuntos, onSubir, onDescargar,
}: {
  adjuntos: AdjuntoGestion[]
  onSubir: (archivos: FileList | File[]) => void
  onDescargar: (id: number, nombre: string) => void
}) {
  const [encima, setEncima] = useState(false)

  useEffect(() => {
    function alPegar(e: ClipboardEvent) {
      const destino = e.target as HTMLElement | null
      const escribiendo = destino?.closest?.('input, textarea, [contenteditable="true"]')
      const archivos = Array.from(e.clipboardData?.files ?? [])
      if (!archivos.length) return
      // Si esta escribiendo y lo que pega es texto, no es asunto nuestro; pero
      // un archivo en el portapapeles siempre es un adjunto.
      if (escribiendo && !archivos.length) return
      e.preventDefault()
      onSubir(bautizar(archivos))
    }
    document.addEventListener('paste', alPegar)
    return () => document.removeEventListener('paste', alPegar)
  }, [onSubir])

  return (
    <Box>
      <Box
        onDragOver={e => { e.preventDefault(); setEncima(true) }}
        onDragLeave={() => setEncima(false)}
        onDrop={e => {
          e.preventDefault()
          setEncima(false)
          const archivos = Array.from(e.dataTransfer?.files ?? [])
          if (archivos.length) onSubir(bautizar(archivos))
        }}
        sx={{
          p: 1.75, borderRadius: 2, textAlign: 'center', cursor: 'pointer',
          border: `1.5px dashed ${encima ? COLOR_MODULO : PALETA.niebla}`,
          bgcolor: encima ? `${COLOR_MODULO}0F` : 'transparent',
          transition: 'background-color .15s, border-color .15s',
        }}
        component="label"
      >
        <input hidden type="file" multiple onChange={e => {
          if (e.target.files?.length) onSubir(e.target.files)
          e.target.value = ''
        }} />
        <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
          <AttachFile sx={{ fontSize: 16, color: PALETA.acero }} />
          <Typography variant="caption" sx={{ color: PALETA.grafito }}>
            Arrastre archivos aqui, peguelos con <b>Ctrl+V</b>, o
            <Box component="span" sx={{ color: COLOR_MODULO, fontWeight: 700 }}>
              {' '}escojalos
            </Box>
          </Typography>
        </Stack>
      </Box>

      {!!adjuntos.length && (
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap mt={1.25}>
          {adjuntos.map(a => (
            <Chip
              key={a.id} size="small" icon={<Download sx={{ fontSize: 13 }} />}
              label={`${a.nombre}${a.tamano ? ` · ${peso(a.tamano)}` : ''}`}
              onClick={() => onDescargar(a.id, a.nombre)}
              sx={{ height: 24, fontSize: 11, maxWidth: 300 }}
            />
          ))}
        </Stack>
      )}
    </Box>
  )
}

/** Un pantallazo del portapapeles llega sin nombre —o como «image.png» para
 *  todos—, asi que se le pone uno con la fecha. Sin esto, tres pantallazos de la
 *  misma incidencia se llaman igual y no hay forma de saber cual es cual. */
function bautizar(archivos: File[]): File[] {
  return archivos.map(a => {
    if (a.name && a.name !== 'image.png' && a.name !== 'blob') return a
    const extension = (a.type.split('/')[1] || 'png').replace('jpeg', 'jpg')
    const ahora = new Date()
    const sello = [
      ahora.getFullYear(), String(ahora.getMonth() + 1).padStart(2, '0'),
      String(ahora.getDate()).padStart(2, '0'),
    ].join('-') + '_' + [
      String(ahora.getHours()).padStart(2, '0'),
      String(ahora.getMinutes()).padStart(2, '0'),
      String(ahora.getSeconds()).padStart(2, '0'),
    ].join('')
    return new File([a], `pantallazo_${sello}.${extension}`, { type: a.type })
  })
}

const peso = (b?: number | null) =>
  !b ? '' : b < 1024 ? `${b} B`
    : b < 1048576 ? `${Math.round(b / 1024)} KB`
    : `${(b / 1048576).toFixed(1)} MB`



/** Los campos configurados de una incidencia, editables y con guardado propio.
 *
 *  Usa el mismo esquema y el mismo renderizador que el formulario de alta, asi
 *  que un campo nuevo aparece aca solo y con su lista de opciones puesta —los de
 *  entidad, como Responsable o Sprint, sacan sus opciones de las tablas—.
 *
 *  Guarda campo por campo y no con un boton: en una herramienta de trabajo,
 *  reasignar o reestimar es lo que mas se hace, y un boton «Guardar» hace que la
 *  mitad de los cambios se pierdan al cerrar la ficha. Los de texto guardan al
 *  salir del campo; los demas, al cambiarlos.
 */
function PanelDeCampos({
  incidenciaId, onGuardado,
}: {
  incidenciaId: number
  onGuardado: () => void
}) {
  const [borrador, setBorrador] = useState<Record<string, any>>({})
  const [problemas, setProblemas] = useState<Record<string, string>>({})

  const { data: esquema, isLoading } = useQuery({
    queryKey: ['gestion', 'formulario', 'panel', incidenciaId],
    queryFn: () => gestionApi.formulario({ incidencia_id: incidenciaId }),
  })

  // El borrador se rehace cuando llega el esquema: es lo guardado, y lo que se
  // muestra mientras una escritura viaja.
  useEffect(() => {
    if (!esquema) return
    const valores: Record<string, any> = {}
    esquema.secciones.forEach(s => s.campos.forEach(c => {
      valores[c.clave] = c.valor ?? null
    }))
    setBorrador(valores)
    setProblemas({})
  }, [esquema])

  const guardar = useMutation({
    mutationFn: ({ clave, valor }: { clave: string; valor: any }) =>
      gestionApi.editar(incidenciaId, { campos: { [clave]: valor } }),
    onSuccess: (_r, { clave }) => {
      setProblemas(previos => {
        const { [clave]: _, ...resto } = previos
        return resto
      })
      onGuardado()
    },
    onError: (e: any, { clave }) => {
      const d = e?.response?.data?.detail
      const detalle = Array.isArray(d?.campos) ? d.campos[0] : null
      // El motivo va bajo el campo y no en un aviso que se desvanece: un error
      // de validacion hay que poder leerlo mientras se corrige.
      setProblemas(previos => ({
        ...previos,
        [clave]: detalle ?? mensajeDeError(e, 'No se pudo guardar'),
      }))
    },
  })

  if (isLoading) return <Skeleton height={220} />
  if (!esquema?.secciones.length) return null

  /** Los de texto guardan al salir del campo; los demas, al cambiarlos. Guardar
   *  cada tecla de un texto largo serian veinte peticiones por frase. */
  const alSalir = new Set([
    'TEXTO', 'TEXTO_LARGO', 'TEXTO_RICO', 'NUMERO', 'DECIMAL', 'URL', 'CORREO',
  ])

  return (
    <Stack spacing={1.75}>
      {esquema.secciones.map(seccion => (
        <Box key={seccion.clave}>
          <Etiqueta>{seccion.titulo}</Etiqueta>
          <Stack spacing={1.5} mt={0.75}>
            {seccion.campos.map(campo => (
              <Box
                key={campo.clave}
                onBlur={() => {
                  if (!alSalir.has(campo.tipo)) return
                  const nuevo = borrador[campo.clave] ?? null
                  if (nuevo === (campo.valor ?? null)) return
                  guardar.mutate({ clave: campo.clave, valor: nuevo })
                }}
              >
                <Campo
                  campo={campo}
                  valor={borrador[campo.clave]}
                  error={problemas[campo.clave]}
                  onCambio={valor => {
                    setBorrador(previos => ({ ...previos, [campo.clave]: valor }))
                    if (!alSalir.has(campo.tipo)) {
                      guardar.mutate({ clave: campo.clave, valor })
                    }
                  }}
                />
              </Box>
            ))}
          </Stack>
        </Box>
      ))}
    </Stack>
  )
}



/** Qué nivel puede colgar de este. Es la misma regla que hace cumplir el
 *  servidor; acá solo sirve para no ofrecer lo que va a rechazar.
 *
 *  De una épica cuelga algo normal; de algo normal, una subtarea; de una
 *  subtarea no cuelga nada —tres niveles bastan, y el cuarto convierte el árbol
 *  en algo que nadie recorre—. */
function nivelHijo(nivel?: string | null): string[] {
  return { EPICA: ['NORMAL'], NORMAL: ['SUBTAREA'] }[String(nivel ?? 'NORMAL')] ?? []
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
  // El formulario completo, con TODOS los campos configurados. El panel lateral
  // deja cambiar lo de todos los días sin abrirlo; esto es para lo demás.
  const [editandoTodo, setEditandoTodo] = useState(false)
  const [creandoHija, setCreandoHija] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['gestion', 'incidencia', incidenciaId],
    queryFn: () => gestionApi.detalle(incidenciaId!),
    enabled: incidenciaId != null,
  })


  useEffect(() => {
    if (data) {
      setTitulo(data.incidencia.resumen)
      setEditandoTitulo(false)
    }
  }, [data?.incidencia.id, data?.incidencia.resumen])

  function refrescar() {
    qc.invalidateQueries({ queryKey: ['gestion', 'incidencia', incidenciaId] })
    qc.invalidateQueries({ queryKey: ['gestion', 'lista'] })
    qc.invalidateQueries({ queryKey: ['gestion', 'tablero'] })
  }

  // Todo cambio va dentro de `campos`, con la clave del registro. Envolverlo
  // acá y no en cada control es lo que evita que un sitio arme el cuerpo de
  // otra forma: eso era lo que devolvia 200 sin guardar nada.
  const editar = useMutation({
    mutationFn: (cambios: Record<string, unknown>) =>
      gestionApi.editar(incidenciaId!, { campos: cambios }),
    onSuccess: refrescar,
    onError: (e: any) => toast.error(mensajeDeError(e, 'No se pudo guardar')),
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
    mutationFn: (archivos: FileList | File[]) => {
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
            pestana={pestana} setPestana={setPestana}
            comentario={comentario} setComentario={setComentario}
            onCerrar={onCerrar}
            onGuardarTitulo={() => {
              if (titulo.trim() && titulo !== data.incidencia.resumen) {
                editar.mutate({ resumen: titulo.trim() })
              }
              setEditandoTitulo(false)
            }}
            onMover={id => mover.mutate(id)}
            onComentar={() => comentar.mutate()}
            onAdjuntar={f => adjuntar.mutate(f)}
            onDescargar={descargar}
            guardando={editar.isPending}
            moviendo={mover.isPending}
            onEditarTodo={() => setEditandoTodo(true)}
            onCrearHija={() => setCreandoHija(true)}
            puedeTenerHijas={nivelHijo(data.nivel).length > 0}
            onRefrescar={refrescar}
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

      {data && (
        <GestionFormulario
          abierto={creandoHija} proyecto={null} proyectos={[]}
          preseleccion={{
            proyecto_id: data.proyecto.id,
            // Solo los tipos del nivel que puede colgar de este. La regla la
            // hace cumplir el servidor; acá se evita ofrecer lo que va a
            // rechazar.
            niveles: nivelHijo(data.nivel),
            campos: { padre: String(data.incidencia.id) },
            titulo: `Nueva subtarea de ${data.incidencia.clave}`,
          }}
          onCerrar={() => setCreandoHija(false)}
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
  pestana: number; setPestana: (n: number) => void
  comentario: string; setComentario: (s: string) => void
  onCerrar: () => void
  onGuardarTitulo: () => void
  onMover: (id: number) => void
  onComentar: () => void
  onAdjuntar: (f: FileList | File[]) => void
  onDescargar: (id: number, nombre: string) => void
  guardando: boolean
  moviendo: boolean
  onEditarTodo: () => void
  onCrearHija: () => void
  puedeTenerHijas: boolean
  onRefrescar: () => void
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
          {p.puedeTenerHijas && (
            <Tooltip title="Crear una incidencia que cuelgue de esta. Sigue el mismo flujo que cualquier otra.">
              <Button size="small" startIcon={<AccountTree sx={{ fontSize: 15 }} />}
                onClick={p.onCrearHija} sx={{ textTransform: 'none' }}>
                Subtarea
              </Button>
            </Tooltip>
          )}
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
              <ZonaAdjuntos
                adjuntos={data.adjuntos}
                onSubir={p.onAdjuntar}
                onDescargar={p.onDescargar}
              />
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
          width: { xs: '100%', md: 340 }, flexShrink: 0, p: 3,
          borderLeft: { md: `1px solid ${PALETA.niebla}` }, bgcolor: PALETA.bruma,
        }}>
          <Stack spacing={1.5}>
            <Dato etiqueta="Proyecto" valor={data.proyecto.nombre} />

            {/* Todos los campos configurados, con el MISMO renderizador del
                formulario y guardando al cambiar.

                Antes había dos juegos de controles: unos escritos a mano y otros
                generados, que pintaban los mismos campos por segunda vez y sin
                sus opciones. Lo que alguien escribía en el duplicado no iba a
                ninguna parte. */}
            <PanelDeCampos
              incidenciaId={inc.id}
              onGuardado={p.onRefrescar}
            />

            <Divider sx={{ my: 0.5 }} />

            {/* Lo que lleva el sistema. No se edita: `creada` es un hecho, y las
                otras dos las sella el flujo al mover la incidencia. Ponerlas
                editables invitaría a "corregir" la historia. */}
            <Dato etiqueta="Creada" valor={cuando(data.creado) || '—'} />
            {data.iniciado && <Dato etiqueta="Empezó de verdad" valor={cuando(data.iniciado)} />}
            {data.resuelto && <Dato etiqueta="Resuelta" valor={cuando(data.resuelto)} />}

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
