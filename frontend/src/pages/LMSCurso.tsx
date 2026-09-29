/**
 * LMS · Tomar un curso
 *
 * Pantalla nueva: la maqueta tenía catálogo y «mi aprendizaje» pero ningún
 * lugar donde se viera un curso por dentro. Aquí se inscribe, se recorre el
 * temario marcando lo visto, se presenta la evaluación y se ve el resultado.
 *
 * La evaluación la califica el servidor: esta pantalla nunca recibe cuál es la
 * opción correcta, solo el resultado después de entregar. El tiempo límite
 * también lo controla el servidor; el reloj de aquí es informativo.
 *
 * Quien administra ve además la pestaña Temario para crear módulos y
 * contenidos.
 */
import { useEffect, useState } from 'react'
import { useParams, Link as RouterLink } from 'react-router-dom'
import {
  Box, Typography, Paper, Button, Chip, LinearProgress, Tabs, Tab, IconButton, Tooltip, Radio, RadioGroup,
  FormControlLabel, Dialog, DialogTitle, DialogContent, DialogActions, Alert, alpha, Divider,
} from '@mui/material'
import { ArrowBack, CheckCircle, RadioButtonUnchecked, PlayCircle, Description, Link as LinkIcon, Quiz, Add, Edit, DeleteForever, EmojiEvents, Timer } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { lmsApi, type IntentoAbierto, type ResultadoIntento, type Modulo, type Contenido } from '@/api/lms'
import { FormularioRegistro, errorApi, type Campo } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const LMS_COLOR = COLOR_MODULO
const TIPOS_CONTENIDO: [string, string][] = [['VIDEO', 'Video'], ['DOCUMENTO', 'Documento'], ['PRESENTACION', 'Presentación'], ['ENLACE', 'Enlace'], ['QUIZ', 'Actividad'], ['SIMULACION', 'Simulación'], ['SCORM', 'Paquete SCORM']]
const icono = (t: string) => (t === 'VIDEO' ? <PlayCircle fontSize="small" /> : t === 'ENLACE' ? <LinkIcon fontSize="small" /> : t === 'QUIZ' ? <Quiz fontSize="small" /> : <Description fontSize="small" />)

function Examen({ intento, onTerminar }: { intento: IntentoAbierto; onTerminar: (r: ResultadoIntento) => void }) {
  const [resp, setResp] = useState<Record<number, number>>({})
  const [ahora, setAhora] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setAhora(Date.now()), 1000); return () => clearInterval(t) }, [])
  const limite = intento.tiempo_limite_min ? new Date(intento.inicio).getTime() + intento.tiempo_limite_min * 60000 : null
  const resta = limite ? Math.max(0, Math.floor((limite - ahora) / 1000)) : null
  const entregar = useMutation({
    mutationFn: () => lmsApi.entregar(intento.intento_id, intento.preguntas.map(p => ({ pregunta_id: p.id, opcion_id: resp[p.id] ?? null }))),
    onSuccess: onTerminar, onError: (e: any) => toast.error(errorApi(e)),
  })
  const faltan = intento.preguntas.filter(p => resp[p.id] == null).length
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography fontWeight={800}>{intento.nombre} · intento {intento.numero_intento} de {intento.intentos_maximos}</Typography>
        {resta != null && <Chip icon={<Timer />} label={`${Math.floor(resta / 60)}:${String(resta % 60).padStart(2, '0')}`} color={resta < 60 ? 'error' : 'default'} />}
      </Box>
      {intento.preguntas.map((p, i) => (
        <Paper key={p.id} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2 }}>
          <Typography fontWeight={600} mb={1}>{i + 1}. {p.enunciado} <Typography component="span" fontSize={11} color="text.secondary">({p.puntaje} pt)</Typography></Typography>
          <RadioGroup value={resp[p.id] ?? ''} onChange={e => setResp({ ...resp, [p.id]: Number(e.target.value) })}>
            {p.opciones.map(o => <FormControlLabel key={o.id} value={o.id} control={<Radio size="small" />} label={o.texto} />)}
          </RadioGroup>
        </Paper>
      ))}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography fontSize={12} color="text.secondary">{faltan ? `Faltan ${faltan} pregunta(s) por responder` : 'Todas respondidas'}</Typography>
        <Button variant="contained" disabled={entregar.isPending} onClick={() => { if (!faltan || window.confirm(`Quedan ${faltan} sin responder y contarán como incorrectas. ¿Entregar?`)) entregar.mutate() }}
          sx={{ bgcolor: LMS_COLOR }}>Entregar evaluación</Button>
      </Box>
    </Box>
  )
}

export default function LMSCurso() {
  const { id } = useParams()
  const cursoId = Number(id)
  const qc = useQueryClient()
  const { data: c, isLoading } = useQuery({ queryKey: ['lms-curso', cursoId], queryFn: () => lmsApi.curso(cursoId) })
  const [tab, setTab] = useState(0)
  const [examen, setExamen] = useState<IntentoAbierto | null>(null)
  const [resultado, setResultado] = useState<ResultadoIntento | null>(null)
  const [dlgMod, setDlgMod] = useState<{ abierto: boolean; r: Modulo | null }>({ abierto: false, r: null })
  const [dlgCont, setDlgCont] = useState<{ abierto: boolean; r: Contenido | null; modulo: number | null }>({ abierto: false, r: null, modulo: null })
  const refrescar = () => { qc.invalidateQueries({ queryKey: ['lms-curso', cursoId] }); qc.invalidateQueries({ queryKey: ['lms-catalogo'] }); qc.invalidateQueries({ queryKey: ['lms-mi'] }) }

  const inscribir = useMutation({ mutationFn: () => lmsApi.inscribirme(cursoId), onSuccess: () => { toast.success('Inscripción registrada'); refrescar() }, onError: (e: any) => toast.error(errorApi(e)) })
  const completar = useMutation({
    mutationFn: (x: Contenido) => lmsApi.completar(x.id, x.duracion_minutos),
    onSuccess: r => { refrescar(); if (r.certificado_emitido) toast.success(`¡Curso completado! Certificado ${r.certificado_emitido.numero}`) },
    onError: (e: any) => toast.error(errorApi(e)),
  })
  const iniciar = useMutation({ mutationFn: (evId: number) => lmsApi.iniciarEvaluacion(evId), onSuccess: setExamen, onError: (e: any) => toast.error(errorApi(e)) })
  const borrarMod = useMutation({ mutationFn: (mid: number) => lmsApi.borrarModulo(mid), onSuccess: refrescar, onError: (e: any) => toast.error(errorApi(e)) })
  const borrarCont = useMutation({ mutationFn: (cid: number) => lmsApi.borrarContenido(cid), onSuccess: refrescar, onError: (e: any) => toast.error(errorApi(e)) })

  if (isLoading || !c) return <Layout><Box p={3}><LinearProgress /></Box></Layout>
  const insc = c.inscripcion
  const todo = c.modulos.flatMap(m => m.contenidos)
  const vistos = todo.filter(x => x.completado).length

  const CAMPOS_MOD: Campo[] = [{ clave: 'nombre', etiqueta: 'Módulo', obligatorio: true, ancho: 8 }, { clave: 'orden', etiqueta: 'Orden', tipo: 'numero', min: 0, ancho: 4 }, { clave: 'duracion_horas', etiqueta: 'Horas', tipo: 'numero', min: 0, ancho: 6 }]
  const CAMPOS_CONT: Campo[] = [
    { clave: 'titulo', etiqueta: 'Título', obligatorio: true },
    { clave: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', opciones: TIPOS_CONTENIDO, obligatorio: true, ancho: 6 },
    { clave: 'duracion_minutos', etiqueta: 'Minutos', tipo: 'numero', min: 0, ancho: 3 },
    { clave: 'orden', etiqueta: 'Orden', tipo: 'numero', min: 0, ancho: 3 },
    { clave: 'url', etiqueta: 'Enlace al material', ayuda: 'Video, documento o presentación publicados (Drive, SharePoint, YouTube…)',
      validar: (v, f) => (['VIDEO', 'DOCUMENTO', 'PRESENTACION', 'ENLACE', 'SCORM'].includes(f.tipo) && !String(v ?? '').trim() ? 'Este tipo necesita enlace' : null) },
    { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'area' },
  ]

  return (
    <Layout>
      <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
        <Button component={RouterLink} to="/lms/catalogo" startIcon={<ArrowBack />} size="small" sx={{ mb: 1 }}>Catálogo</Button>
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, mb: 2 }}>
          <Typography fontSize={12} color="text.secondary">{c.codigo} · {c.modalidad.toLowerCase()} · {c.nivel.toLowerCase()} · {c.duracion_horas} h{c.instructor ? ` · ${c.instructor}` : ''}</Typography>
          <Typography variant="h5" fontWeight={800}>{c.nombre} {c.es_obligatorio && <Chip size="small" label="Obligatorio" color="warning" sx={{ verticalAlign: 'middle' }} />}</Typography>
          {c.descripcion && <Typography fontSize={14} color="text.secondary" mt={1}>{c.descripcion}</Typography>}
          <Divider sx={{ my: 2 }} />
          {c.estado !== 'PUBLICADO' ? <Alert severity="info">El curso está en {c.estado.toLowerCase()}: se puede preparar el temario, pero nadie puede inscribirse hasta publicarlo.</Alert>
            : !insc ? <Button variant="contained" onClick={() => inscribir.mutate()} disabled={inscribir.isPending} sx={{ bgcolor: LMS_COLOR }}>Inscribirme</Button>
            : (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography fontSize={13}>{insc.estado === 'COMPLETADO' ? '¡Completado!' : `${vistos} de ${todo.length} contenidos vistos`}</Typography>
                  <Typography fontSize={13} fontWeight={700}>{insc.progreso_pct.toFixed(0)}%{insc.nota_final != null ? ` · nota ${insc.nota_final}` : ''}</Typography>
                </Box>
                <LinearProgress variant="determinate" value={insc.progreso_pct} sx={{ height: 8, borderRadius: 4, '& .MuiLinearProgress-bar': { bgcolor: insc.estado === 'COMPLETADO' ? '#15803D' : LMS_COLOR } }} />
              </Box>
            )}
        </Paper>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}><Tab label="Contenido" /><Tab label={`Evaluaciones (${c.evaluaciones.length})`} /><Tab label="Temario (edición)" /></Tabs>
        {tab === 0 && (
          c.modulos.length === 0 ? <Typography color="text.secondary">El curso aún no tiene módulos.</Typography> :
          c.modulos.map(m => (
            <Paper key={m.id} variant="outlined" sx={{ mb: 1.5, borderRadius: 2 }}>
              <Typography fontWeight={700} sx={{ p: 1.5, bgcolor: alpha(LMS_COLOR, 0.06) }}>{m.nombre}</Typography>
              {m.contenidos.map(x => (
                <Box key={x.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 1.5, py: 1, borderTop: '1px solid #F1F5F9' }}>
                  {x.completado ? <CheckCircle sx={{ color: '#15803D' }} /> : <RadioButtonUnchecked sx={{ color: 'text.disabled' }} />}
                  <Box sx={{ color: LMS_COLOR, display: 'flex' }}>{icono(x.tipo)}</Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontSize={14}>{x.titulo}</Typography>
                    <Typography fontSize={11} color="text.secondary">{TIPOS_CONTENIDO.find(t => t[0] === x.tipo)?.[1]}{x.duracion_minutos ? ` · ${x.duracion_minutos} min` : ''}</Typography>
                  </Box>
                  {x.url && <Button size="small" href={x.url} target="_blank" rel="noopener">Abrir</Button>}
                  {insc && !x.completado && <Button size="small" variant="outlined" onClick={() => completar.mutate(x)} disabled={completar.isPending}>Marcar como visto</Button>}
                </Box>
              ))}
            </Paper>
          ))
        )}
        {tab === 1 && (
          c.evaluaciones.length === 0 ? <Typography color="text.secondary">Este curso no tiene evaluación: se completa al ver todo el contenido.</Typography> :
          c.evaluaciones.map(ev => (
            <Paper key={ev.id} variant="outlined" sx={{ p: 2, mb: 1.5, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography fontWeight={700}>{ev.nombre}</Typography>
                <Typography fontSize={12} color="text.secondary">Aprueba con {ev.puntaje_aprobacion}% · {ev.intentos_maximos} intento(s){ev.tiempo_limite_min ? ` · ${ev.tiempo_limite_min} min` : ' · sin límite de tiempo'}</Typography>
              </Box>
              <Button variant="contained" disabled={!insc || iniciar.isPending} onClick={() => iniciar.mutate(ev.id)} sx={{ bgcolor: LMS_COLOR }}>{insc ? 'Presentar' : 'Inscríbete primero'}</Button>
            </Paper>
          ))
        )}
        {tab === 2 && (
          <Box>
            <Button startIcon={<Add />} onClick={() => setDlgMod({ abierto: true, r: null })} sx={{ mb: 1 }}>Nuevo módulo</Button>
            {c.modulos.map(m => (
              <Paper key={m.id} variant="outlined" sx={{ mb: 1.5, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', p: 1.5, bgcolor: alpha(LMS_COLOR, 0.06) }}>
                  <Typography fontWeight={700} sx={{ flex: 1 }}>{m.orden}. {m.nombre}</Typography>
                  <Button size="small" startIcon={<Add />} onClick={() => setDlgCont({ abierto: true, r: null, modulo: m.id })}>Contenido</Button>
                  <Tooltip title="Editar módulo"><IconButton size="small" aria-label={`Editar módulo ${m.nombre}`} onClick={() => setDlgMod({ abierto: true, r: m })}><Edit fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Borrar módulo"><IconButton size="small" aria-label={`Borrar módulo ${m.nombre}`} onClick={() => { if (window.confirm(`¿Borrar el módulo «${m.nombre}» y sus contenidos?`)) borrarMod.mutate(m.id) }}><DeleteForever fontSize="small" sx={{ color: '#DC2626' }} /></IconButton></Tooltip>
                </Box>
                {m.contenidos.map(x => (
                  <Box key={x.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, py: 0.75, borderTop: '1px solid #F1F5F9' }}>
                    <Box sx={{ color: LMS_COLOR, display: 'flex' }}>{icono(x.tipo)}</Box>
                    <Typography fontSize={13} sx={{ flex: 1 }}>{x.orden}. {x.titulo}</Typography>
                    <IconButton size="small" aria-label={`Editar ${x.titulo}`} onClick={() => setDlgCont({ abierto: true, r: x, modulo: m.id })}><Edit fontSize="small" /></IconButton>
                    <IconButton size="small" aria-label={`Borrar ${x.titulo}`} onClick={() => { if (window.confirm(`¿Borrar «${x.titulo}»?`)) borrarCont.mutate(x.id) }}><DeleteForever fontSize="small" sx={{ color: '#DC2626' }} /></IconButton>
                  </Box>
                ))}
              </Paper>
            ))}
          </Box>
        )}

        <Dialog open={!!examen} maxWidth="md" fullWidth>
          <DialogContent>{examen && <Examen intento={examen} onTerminar={r => { setExamen(null); setResultado(r); refrescar() }} />}</DialogContent>
          <DialogActions><Button onClick={() => { if (window.confirm('Si sales, el intento queda abierto y el tiempo sigue corriendo. ¿Salir?')) setExamen(null) }}>Salir sin entregar</Button></DialogActions>
        </Dialog>
        <Dialog open={!!resultado} onClose={() => setResultado(null)} maxWidth="xs" fullWidth>
          <DialogTitle>{resultado?.aprobado ? '¡Aprobaste!' : 'No alcanzaste el puntaje'}</DialogTitle>
          <DialogContent>
            {resultado && (<>
              <Typography variant="h3" fontWeight={900} color={resultado.aprobado ? '#15803D' : '#DC2626'} textAlign="center">{resultado.puntaje}%</Typography>
              <Typography textAlign="center" color="text.secondary" mb={1}>Se aprueba con {resultado.puntaje_aprobacion}% · {resultado.detalle.filter(d => d.correcta).length} de {resultado.detalle.length} correctas</Typography>
              {resultado.fuera_de_tiempo && <Alert severity="warning" sx={{ mb: 1 }}>Se entregó después del tiempo límite: no cuenta ninguna respuesta.</Alert>}
              {!resultado.aprobado && <Typography fontSize={13} textAlign="center">{resultado.intentos_restantes ? `Te quedan ${resultado.intentos_restantes} intento(s).` : 'No te quedan intentos.'}</Typography>}
              {resultado.certificado_emitido && <Alert icon={<EmojiEvents />} severity="success" sx={{ mt: 1 }}>Certificado {resultado.certificado_emitido.numero} emitido · vence {resultado.certificado_emitido.vence}</Alert>}
            </>)}
          </DialogContent>
          <DialogActions><Button onClick={() => setResultado(null)}>Cerrar</Button></DialogActions>
        </Dialog>
        <FormularioRegistro abierto={dlgMod.abierto} titulo={dlgMod.r ? 'Editar módulo' : 'Nuevo módulo'} campos={CAMPOS_MOD} registro={dlgMod.r}
          valoresIniciales={{ orden: String(c.modulos.length + 1), duracion_horas: '0' }}
          onGuardar={async d => { dlgMod.r ? await lmsApi.editarModulo(dlgMod.r.id, d) : await lmsApi.crearModulo(cursoId, d); toast.success('Módulo guardado'); refrescar() }}
          onCerrar={() => setDlgMod({ abierto: false, r: null })} />
        <FormularioRegistro abierto={dlgCont.abierto} titulo={dlgCont.r ? 'Editar contenido' : 'Nuevo contenido'} campos={CAMPOS_CONT} registro={dlgCont.r}
          valoresIniciales={{ tipo: 'VIDEO', duracion_minutos: '0', orden: String((c.modulos.find(m => m.id === dlgCont.modulo)?.contenidos.length ?? 0) + 1) }}
          onGuardar={async d => { const cuerpo = { ...d, modulo_id: dlgCont.modulo!, duracion_minutos: d.duracion_minutos ?? 0, orden: d.orden ?? 0 }; dlgCont.r ? await lmsApi.editarContenido(dlgCont.r.id, cuerpo) : await lmsApi.crearContenido(cuerpo); toast.success('Contenido guardado'); refrescar() }}
          onCerrar={() => setDlgCont({ abierto: false, r: null, modulo: null })} />
      </Box>
    </Layout>
  )
}
