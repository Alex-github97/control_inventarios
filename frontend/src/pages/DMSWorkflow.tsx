/**
 * Los flujos de aprobación y los documentos que van pasando por ellos.
 *
 * DOS COSAS DISTINTAS EN LA MISMA PANTALLA
 * El **flujo** es la ruta: qué pasos tiene y quién responde por cada uno. La
 * **instancia** es un documento concreto recorriéndola. Se separan en pestañas
 * porque configurar la ruta y empujar un documento son trabajos de personas
 * distintas en momentos distintos.
 *
 * LO VENCIDO SE VE
 * Una instancia que pasó su fecha límite se marca en rojo. Un circuito de
 * aprobación cuyo tablero no distingue lo atascado deja documentos varados
 * semanas sin que nadie se entere.
 */
import { useState } from 'react'
import {
  Box, Typography, Chip, alpha, Tabs, Tab, Button, Tooltip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  AccountTree, PlayArrow, Cancel, Add, DragIndicator, ArrowForward,
} from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { dmsApi, type Workflow, type Instancia, type WorkflowPaso } from '@/api/dms'
import { useCrud } from '@/components/datos/useCrud'
import {
  BORDE, DMS_COLOR, COLOR_INSTANCIA, Encabezados, Estado, Panel,
  fecha, fechaHora, legible,
} from '@/components/dms/comunes'

export default function DMSWorkflow() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [detalle, setDetalle] = useState<Workflow | null>(null)
  const [comentando, setComentando] = useState<
    { i: Instancia; accion: 'avanzar' | 'cancelar' } | null>(null)
  const [comentario, setComentario] = useState('')

  const flujos = useQuery({
    queryKey: ['dms', 'workflows'], queryFn: () => dmsApi.workflows(),
  })
  const instancias = useQuery({
    queryKey: ['dms', 'instancias'], queryFn: () => dmsApi.instancias(),
  })
  const documentos = useQuery({
    queryKey: ['dms', 'documentos', 'todos'], queryFn: () => dmsApi.documentos(),
  })
  const tipos = useQuery({
    queryKey: ['dms', 'tipos'], queryFn: () => dmsApi.tipos(),
    staleTime: 10 * 60 * 1000,
  })

  const refrescar = () => qc.invalidateQueries({ queryKey: ['dms'] })

  const mover = useMutation({
    mutationFn: ({ i, accion, texto }: {
      i: Instancia; accion: 'avanzar' | 'cancelar'; texto?: string
    }) => accion === 'avanzar'
      ? dmsApi.avanzarInstancia(i.id, texto)
      : dmsApi.cancelarInstancia(i.id, texto),
    onSuccess: (_r, v) => {
      toast.success(v.accion === 'avanzar' ? 'Pasó al siguiente paso'
                                           : 'Flujo cancelado')
      setComentando(null); setComentario(''); refrescar()
    },
    onError: (e: any) => toast.error(
      e?.response?.data?.detail ?? 'No se pudo mover el flujo'),
  })

  const crud = useCrud<Workflow>({
    nombre: 'flujo', claves: [['dms']],
    titulo: w => w.nombre,
    campos: () => [
      { clave: 'nombre', etiqueta: 'Nombre del flujo', tipo: 'texto',
        obligatorio: true, ancho: 8 },
      { clave: 'tipo_documento_id', etiqueta: 'Se aplica a', tipo: 'referencia',
        ancho: 4,
        referencias: (tipos.data ?? []).map(t => ({ valor: t.id, etiqueta: t.nombre })),
        ayuda: 'Qué clase de documento recorre esta ruta.' },
      { clave: 'dias_limite', etiqueta: 'Plazo total (días)', tipo: 'numero',
        ancho: 6, minimo: 1, porDefecto: 10,
        ayuda: 'Pasado ese plazo la instancia se marca vencida.' },
      { clave: 'activo', etiqueta: 'Disponible', tipo: 'interruptor',
        ancho: 6, porDefecto: true },
      { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'parrafo' },
    ],
    crear: d => dmsApi.crearWorkflow(d),
    editar: (id, d) => dmsApi.editarWorkflow(id, d),
    eliminar: id => dmsApi.borrarWorkflow(id),
    consecuencia: () =>
      'Se eliminan también sus pasos. Los documentos que ya lo recorrieron '
      + 'conservan su historia.',
  })

  const todas = instancias.data ?? []
  const enCurso = todas.filter(i => i.estado === 'EN_CURSO')
  const vencidas = enCurso.filter(
    i => i.fecha_limite && new Date(i.fecha_limite) < new Date())
  const doc = (id?: number | null) =>
    documentos.data?.find(d => d.id === id)

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${DMS_COLOR} 0%, #1E40AF 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AccountTree sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>
              Flujos de aprobación
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Por dónde pasa cada documento antes de publicarse
            </Typography>
          </Box>
          {tab === 0 && <crud.BotonNuevo />}
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Flujos configurados', value: flujos.data?.length ?? 0, color: DMS_COLOR },
            { label: 'Documentos en curso', value: enCurso.length, color: '#0EA5E9' },
            { label: 'Fuera de plazo', value: vencidas.length, color: '#EF4444' },
            { label: 'Completados',
              value: todas.filter(i => i.estado === 'COMPLETADO').length, color: '#059669' },
          ].map((s, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Box sx={{ border: `1px solid ${alpha(s.color, 0.3)}`, borderRadius: 2, p: 2 }}>
                <Typography sx={{ fontSize: 24, fontWeight: 900, lineHeight: 1,
                                  fontVariantNumeric: 'tabular-nums' }}>
                  {instancias.isLoading ? '·' : s.value}
                </Typography>
                <Typography sx={{ fontSize: 11, color: s.color, fontWeight: 600, mt: 0.25 }}>
                  {s.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
          mb: 3,
          '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 600 },
          '& .Mui-selected': { color: `${DMS_COLOR} !important` },
          '& .MuiTabs-indicator': { bgcolor: DMS_COLOR },
        }}>
          <Tab label={`Rutas${flujos.data ? ` (${flujos.data.length})` : ''}`} />
          <Tab label={`Documentos en curso${enCurso.length ? ` (${enCurso.length})` : ''}`} />
        </Tabs>

        {tab === 0 && (
          <Estado cargando={flujos.isLoading} error={flujos.error}
            vacio={!flujos.data?.length}
            mensajeVacio="No hay flujos configurados"
            hint="Un flujo dice por qué manos pasa un documento antes de publicarse.">
            <Grid container spacing={2}>
              {flujos.data?.map(w => (
                <Grid key={w.id} size={{ xs: 12, md: 6 }}>
                  <Panel sx={{ p: 2, height: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between',
                               alignItems: 'flex-start', gap: 1, mb: 1 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                          {w.nombre}
                        </Typography>
                        <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                          {tipos.data?.find(t => t.id === w.tipo_documento_id)?.nombre
                            ?? 'cualquier tipo'} · plazo de {w.dias_limite ?? '—'} días
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        {!w.activo && (
                          <Chip label="inactivo" size="small" sx={{
                            height: 18, fontSize: 9.5, mr: 0.5,
                            bgcolor: '#F1F5F9', color: '#6B7280',
                          }} />
                        )}
                        <crud.Acciones registro={w} />
                      </Box>
                    </Box>
                    <PasosDelFlujo id={w.id} />
                    <Button size="small" onClick={() => setDetalle(w)}
                      sx={{ textTransform: 'none', fontSize: 12, mt: 1, color: DMS_COLOR }}>
                      Configurar pasos
                    </Button>
                  </Panel>
                </Grid>
              ))}
            </Grid>
          </Estado>
        )}

        {tab === 1 && (
          <Panel>
            <Estado cargando={instancias.isLoading} error={instancias.error}
              vacio={!todas.length}
              mensajeVacio="Ningún documento está recorriendo un flujo"
              hint="Los documentos entran al flujo al enviarse a revisión.">
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <Encabezados columnas={['Documento', 'Flujo', 'Paso', 'Estado',
                    'Inició', 'Plazo', '']} />
                  <tbody>
                    {todas.map(i => {
                      const col = COLOR_INSTANCIA[i.estado] || '#94A3B8'
                      const vencida = i.estado === 'EN_CURSO' && i.fecha_limite
                        && new Date(i.fecha_limite) < new Date()
                      const flujo = flujos.data?.find(w => w.id === i.workflow_id)
                      const d = doc(i.documento_id)
                      return (
                        <tr key={i.id} style={{ borderBottom: `1px solid ${BORDE}` }}>
                          <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 600, maxWidth: 280 }}>
                            {d?.nombre ?? `Documento #${i.documento_id}`}
                            <Box component="div" sx={{ fontSize: 11, color: '#6B7280', fontWeight: 400 }}>
                              {d?.codigo}
                            </Box>
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280' }}>
                            {flujo?.nombre ?? '—'}
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 600 }}>
                            {i.paso_actual ?? '—'}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <Chip label={legible(i.estado)} size="small" sx={{
                              bgcolor: alpha(col, 0.15), color: col,
                              fontSize: 9.5, fontWeight: 700,
                            }} />
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 11.5, color: '#6B7280', whiteSpace: 'nowrap' }}>
                            {fecha(i.fecha_inicio)}
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 11.5, whiteSpace: 'nowrap',
                                       color: vencida ? '#EF4444' : '#6B7280',
                                       fontWeight: vencida ? 700 : 400 }}>
                            {vencida ? 'fuera de plazo' : fecha(i.fecha_limite)}
                          </td>
                          <td style={{ padding: '4px 8px', whiteSpace: 'nowrap' }}>
                            {i.estado === 'EN_CURSO' && (
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <Button size="small" variant="contained"
                                  startIcon={<PlayArrow sx={{ fontSize: 15 }} />}
                                  disabled={mover.isPending}
                                  onClick={() => { setComentando({ i, accion: 'avanzar' }); setComentario('') }}
                                  sx={{ textTransform: 'none', fontSize: 11.5 }}>
                                  Avanzar
                                </Button>
                                <Tooltip title="Cancelar el flujo">
                                  <IconButton size="small" color="error"
                                    onClick={() => { setComentando({ i, accion: 'cancelar' }); setComentario('') }}>
                                    <Cancel sx={{ fontSize: 17 }} />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            )}
                            {i.comentario_cierre && (
                              <Tooltip title={i.comentario_cierre}>
                                <Typography sx={{ fontSize: 11, color: '#6B7280', maxWidth: 180 }} noWrap>
                                  {i.comentario_cierre}
                                </Typography>
                              </Tooltip>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </Box>
            </Estado>
          </Panel>
        )}

        <Pasos flujo={detalle} onCerrar={() => setDetalle(null)} />

        <Dialog open={!!comentando} onClose={() => setComentando(null)}
          maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>
            {comentando?.accion === 'avanzar'
              ? 'Pasar al siguiente paso' : 'Cancelar el flujo'}
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
              {comentando?.accion === 'avanzar'
                ? 'Quien reciba el documento en el siguiente paso va a leer este comentario.'
                : 'Cancelar detiene el flujo. El motivo queda en el historial del documento.'}
            </Typography>
            <TextField autoFocus fullWidth multiline minRows={2} size="small"
              label={comentando?.accion === 'avanzar' ? 'Comentario (opcional)' : 'Motivo'}
              value={comentario} onChange={e => setComentario(e.target.value)} />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setComentando(null)} sx={{ textTransform: 'none' }}>
              Cancelar
            </Button>
            <Button variant="contained"
              color={comentando?.accion === 'cancelar' ? 'error' : 'primary'}
              disabled={mover.isPending
                || (comentando?.accion === 'cancelar' && !comentario.trim())}
              onClick={() => comentando && mover.mutate({
                i: comentando.i, accion: comentando.accion,
                texto: comentario.trim() || undefined })}
              sx={{ textTransform: 'none' }}>
              {comentando?.accion === 'avanzar' ? 'Avanzar' : 'Cancelar el flujo'}
            </Button>
          </DialogActions>
        </Dialog>

        <crud.Dialogos />
      </Box>
    </Layout>
  )
}

/** Los pasos en línea, para ver la ruta de un vistazo. */
function PasosDelFlujo({ id }: { id: number }) {
  const pasos = useQuery({
    queryKey: ['dms', 'pasos', id],
    queryFn: () => dmsApi.pasos(id),
    staleTime: 5 * 60 * 1000,
  })
  if (pasos.isLoading) {
    return <Typography sx={{ fontSize: 11.5, color: 'text.disabled' }}>Cargando…</Typography>
  }
  if (!pasos.data?.length) {
    return (
      <Typography sx={{ fontSize: 11.5, color: '#B45309' }}>
        Sin pasos: este flujo no hace nada todavía.
      </Typography>
    )
  }
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
      {pasos.data.slice().sort((a, b) => a.orden - b.orden).map((p, i) => (
        <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {i > 0 && <ArrowForward sx={{ fontSize: 13, color: 'text.disabled' }} />}
          <Tooltip title={`${p.responsable_rol || 'sin responsable'} · ${p.dias_limite ?? '—'} días`}>
            <Chip label={p.nombre} size="small" sx={{
              height: 21, fontSize: 10.5,
              bgcolor: alpha(DMS_COLOR, 0.1), color: DMS_COLOR,
            }} />
          </Tooltip>
        </Box>
      ))}
    </Box>
  )
}

/** Añadir, cambiar y quitar pasos de una ruta. */
function Pasos({ flujo, onCerrar }: { flujo: Workflow | null; onCerrar: () => void }) {
  const pasos = useQuery({
    queryKey: ['dms', 'pasos', flujo?.id],
    queryFn: () => dmsApi.pasos(flujo!.id),
    enabled: !!flujo,
  })

  const crud = useCrud<WorkflowPaso>({
    nombre: 'paso', claves: [['dms']],
    titulo: p => p.nombre,
    campos: () => [
      { clave: 'workflow_id', etiqueta: 'Flujo', tipo: 'numero',
        soloLectura: true, ancho: 4, porDefecto: flujo?.id },
      { clave: 'nombre', etiqueta: 'Nombre del paso', tipo: 'texto',
        obligatorio: true, ancho: 8 },
      { clave: 'tipo', etiqueta: 'Qué se hace', tipo: 'seleccion', ancho: 4,
        porDefecto: 'REVISION',
        opciones: ['REVISION', 'APROBACION', 'FIRMA', 'PUBLICACION']
          .map(v => ({ valor: v, etiqueta: legible(v) })) },
      { clave: 'orden', etiqueta: 'Orden', tipo: 'numero', ancho: 4, minimo: 1,
        obligatorio: true,
        ayuda: 'El número decide la secuencia.' },
      { clave: 'dias_limite', etiqueta: 'Plazo (días)', tipo: 'numero',
        ancho: 4, minimo: 1 },
      { clave: 'responsable_rol', etiqueta: 'Quién responde', tipo: 'texto',
        ancho: 8, ayuda: 'El cargo, no la persona: la persona cambia.' },
      { clave: 'es_obligatorio', etiqueta: 'No se puede saltar',
        tipo: 'interruptor', ancho: 4, porDefecto: true },
    ],
    crear: d => dmsApi.crearPaso({ ...d, workflow_id: flujo!.id }),
    editar: (id, d) => dmsApi.editarPaso(id, d),
    eliminar: id => dmsApi.borrarPaso(id),
  })

  return (
    <Dialog open={!!flujo} onClose={onCerrar} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ fontWeight: 700, pb: 0.5 }}>
        Pasos de «{flujo?.nombre}»
        <Typography sx={{ fontSize: 12.5, color: 'text.secondary', fontWeight: 400 }}>
          El orden decide la secuencia. Cada paso tiene su plazo.
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Estado cargando={pasos.isLoading} error={pasos.error}
          vacio={!pasos.data?.length}
          mensajeVacio="Este flujo no tiene pasos"
          hint="Sin pasos, un documento entra y no le pasa nada.">
          {pasos.data?.slice().sort((a, b) => a.orden - b.orden).map(p => (
            <Box key={p.id} sx={{
              display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, mb: 1,
              borderRadius: 1.5, border: `1px solid ${BORDE}`, bgcolor: '#F9FAFB',
            }}>
              <DragIndicator sx={{ fontSize: 16, color: 'text.disabled' }} />
              <Box sx={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                bgcolor: alpha(DMS_COLOR, 0.15), color: DMS_COLOR,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800,
              }}>{p.orden}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                  {p.nombre}
                  {!p.es_obligatorio && (
                    <Chip label="opcional" size="small" sx={{
                      ml: 1, height: 17, fontSize: 9,
                      bgcolor: '#F1F5F9', color: '#6B7280',
                    }} />
                  )}
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                  {legible(p.tipo ?? '')} · {p.responsable_rol || 'sin responsable'}
                  {p.dias_limite ? ` · ${p.dias_limite} días` : ''}
                </Typography>
              </Box>
              <crud.Acciones registro={p} />
            </Box>
          ))}
        </Estado>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button startIcon={<Add />} onClick={crud.abrirNuevo}
          sx={{ textTransform: 'none', mr: 'auto' }}>
          Añadir paso
        </Button>
        <Button onClick={onCerrar} sx={{ textTransform: 'none' }}>Cerrar</Button>
      </DialogActions>
      <crud.Dialogos />
    </Dialog>
  )
}
