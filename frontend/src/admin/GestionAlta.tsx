/**
 * El formulario de alta.
 *
 * Va en dos columnas: a la izquierda lo que describe el problema —título,
 * descripción y los campos configurables—, y a la derecha lo que lo sitúa en el
 * trabajo del equipo: responsable, quién reporta, prioridad, estimación, padre,
 * sprint y fechas. Es la misma separación que tiene el detalle, para que quien
 * llena el formulario ya sepa dónde va a encontrar cada cosa después.
 *
 * El responsable y quien reporta son selectores de personas reales, no texto
 * libre: con texto libre, «juan», «Juan» y «juan.perez» son tres responsables
 * distintos, la carga se reparte en tres y filtrar por asignado no encuentra la
 * mitad de lo que debería.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  Box, Stack, Typography, Button, TextField, MenuItem, Dialog, DialogTitle,
  DialogContent, DialogActions, Autocomplete, Chip, Divider, Alert, Tooltip,
} from '@mui/material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { PALETA, COLOR_MODULO } from '@/config/marca'
import {
  gestionApi, mensajeDeError,
  type ConfiguracionGestion, type Proyecto,
} from './api'
import { CamposDinamicos } from './GestionCampos'

const PUNTOS = [1, 2, 3, 5, 8, 13, 21]

export default function GestionAlta({
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
  const [asignado, setAsignado] = useState<string | null>(null)
  const [reporta, setReporta] = useState<string | null>(null)
  const [puntos, setPuntos] = useState<number | ''>('')
  const [padreId, setPadreId] = useState<number | ''>('')
  const [sprintId, setSprintId] = useState<number | ''>('')
  const [etiquetas, setEtiquetas] = useState<string[]>([])
  const [inicioPlan, setInicioPlan] = useState('')
  const [vence, setVence] = useState('')
  const [campos, setCampos] = useState<Record<string, any>>({})
  const [problemas, setProblemas] = useState<string[]>([])

  const tipo = config?.tipos.find(t => t.id === tipoId)
  const nivel = tipo?.nivel ?? 'NORMAL'

  const { data: personas } = useQuery({
    queryKey: ['gestion', 'personas'],
    queryFn: gestionApi.personas,
    staleTime: 5 * 60_000,
  })
  const { data: sugeridas } = useQuery({
    queryKey: ['gestion', 'etiquetas', proyecto.id],
    queryFn: () => gestionApi.etiquetas(proyecto.id),
    staleTime: 60_000,
  })
  const { data: padres } = useQuery({
    queryKey: ['gestion', 'padres', proyecto.id, nivel],
    queryFn: () => gestionApi.padresPosibles(proyecto.id, nivel),
    enabled: abierto && nivel !== 'EPICA',
  })
  const { data: sprints } = useQuery({
    queryKey: ['gestion', 'sprints', proyecto.id],
    queryFn: () => gestionApi.sprints(proyecto.id),
    enabled: abierto,
  })

  useEffect(() => {
    if (!abierto || !config) return
    // Se propone un tipo normal: crear una épica o una subtarea es la excepción,
    // y dejar el selector vacío obliga a un clic más en el caso corriente.
    const normal = config.tipos.find(t => t.nivel === 'NORMAL')
    setTipoId(normal?.id ?? config.tipos[0]?.id ?? '')
    setPrioridadId(config.prioridades.find(p => p.por_defecto)?.id ?? '')
    // Quien reporta es quien está creando, salvo que se cambie: es lo que pasa
    // el 90 % de las veces y dejarlo vacío obliga a llenarlo siempre.
    setReporta(personas?.find(p => p.soy_yo)?.usuario ?? null)
    setResumen(''); setDescripcion(''); setCampos({}); setProblemas([])
    setAsignado(null); setPuntos(''); setPadreId(''); setSprintId('')
    setEtiquetas([]); setInicioPlan(''); setVence('')
  }, [abierto, config, personas])

  const abiertos = useMemo(
    () => (sprints ?? []).filter(s => s.estado !== 'CERRADO'), [sprints])

  const crear = useMutation({
    mutationFn: () => gestionApi.crear({
      proyecto_id: proyecto.id, tipo_id: tipoId, resumen, descripcion,
      prioridad_id: prioridadId || null,
      asignado: asignado || null,
      reporta: reporta || null,
      puntos: puntos === '' ? null : puntos,
      padre_id: padreId || null,
      sprint_id: sprintId || null,
      etiquetas,
      inicio_plan: inicioPlan ? new Date(inicioPlan).toISOString() : null,
      vence: vence ? new Date(vence).toISOString() : null,
      campos,
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
    <Dialog open={abierto} onClose={onCerrar} maxWidth="md" fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        Nueva incidencia
        <Typography variant="caption" sx={{ display: 'block', color: PALETA.acero }}>
          {proyecto.icono} {proyecto.nombre}
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          {/* ── Qué pasa ── */}
          <Stack spacing={2} sx={{ flex: 1, minWidth: 0 }}>
            <TextField
              select size="small" label="Tipo" fullWidth value={tipoId}
              onChange={e => { setTipoId(Number(e.target.value)); setPadreId('') }}
            >
              {config?.tipos.map(t => (
                <MenuItem key={t.id} value={t.id}>
                  {t.icono} {t.nombre}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              size="small" label="Título" fullWidth autoFocus required
              value={resumen} onChange={e => setResumen(e.target.value)}
              helperText="Se puede reescribir después, cuantas veces haga falta."
            />

            <TextField
              size="small" label="Descripción" fullWidth multiline minRows={4}
              value={descripcion} onChange={e => setDescripcion(e.target.value)}
            />

            {!!config?.campos.length && (
              <>
                <Divider textAlign="left">
                  <Typography variant="caption" sx={{
                    fontWeight: 800, fontSize: 9.5, letterSpacing: '0.08em',
                    color: PALETA.acero,
                  }}>
                    DETALLE
                  </Typography>
                </Divider>
                {!!problemas.length && (
                  <Alert severity="warning" sx={{ py: 0.25, fontSize: 12 }}>
                    Revise lo marcado en rojo.
                  </Alert>
                )}
                <CamposDinamicos
                  definicion={config.campos} valores={campos} problemas={problemas}
                  onCambio={(clave, valor) => setCampos({ ...campos, [clave]: valor })}
                />
              </>
            )}
          </Stack>

          {/* ── Dónde va ── */}
          <Stack spacing={2} sx={{ width: { xs: '100%', md: 300 }, flexShrink: 0 }}>
            <Autocomplete
              size="small" options={personas ?? []} value={
                personas?.find(p => p.usuario === asignado) ?? null}
              getOptionLabel={p => p.nombre}
              onChange={(_, v) => setAsignado(v?.usuario ?? null)}
              renderInput={p => (
                <TextField {...p} label="Responsable"
                  helperText="Se puede dejar sin asignar." />
              )}
              renderOption={(props, p) => (
                <li {...props} key={p.usuario}>
                  <Box>
                    <Typography variant="body2">{p.nombre}</Typography>
                    <Typography variant="caption" sx={{ color: PALETA.acero }}>
                      {p.usuario} · {p.rol}
                    </Typography>
                  </Box>
                </li>
              )}
            />

            <Autocomplete
              size="small" options={personas ?? []} value={
                personas?.find(p => p.usuario === reporta) ?? null}
              getOptionLabel={p => p.nombre}
              onChange={(_, v) => setReporta(v?.usuario ?? null)}
              renderInput={p => (
                <TextField {...p} label="Reportó"
                  helperText="Cámbielo si la registra a nombre de otro." />
              )}
            />

            <TextField
              select size="small" label="Prioridad" fullWidth value={prioridadId}
              onChange={e => setPrioridadId(Number(e.target.value))}
            >
              {config?.prioridades.map(p => (
                <MenuItem key={p.id} value={p.id}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box sx={{
                      width: 8, height: 8, borderRadius: '50%',
                      bgcolor: p.color || PALETA.acero,
                    }} />
                    <span>{p.nombre}</span>
                  </Stack>
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select size="small" label="Estimación" fullWidth value={puntos}
              onChange={e => setPuntos(e.target.value === '' ? '' : Number(e.target.value))}
              helperText="Vacío no es cero: cero es «ya estaba hecho»."
            >
              <MenuItem value=""><em>Sin estimar</em></MenuItem>
              {PUNTOS.map(p => (
                <MenuItem key={p} value={p}>{p} {p === 1 ? 'punto' : 'puntos'}</MenuItem>
              ))}
            </TextField>

            {nivel !== 'EPICA' && (
              <TextField
                select size="small" fullWidth value={padreId}
                label={nivel === 'SUBTAREA' ? 'Cuelga de' : 'Épica'}
                onChange={e => setPadreId(e.target.value === '' ? '' : Number(e.target.value))}
                helperText={
                  padres?.length
                    ? undefined
                    : nivel === 'SUBTAREA'
                      ? 'No hay incidencias de las que pueda colgar.'
                      : 'Todavía no hay épicas en este proyecto.'
                }
              >
                <MenuItem value=""><em>Ninguna</em></MenuItem>
                {(padres ?? []).map(p => (
                  <MenuItem key={p.id} value={p.id}>
                    <Typography variant="body2" noWrap>
                      <b style={{ fontFamily: 'monospace', fontSize: 11 }}>{p.clave}</b>
                      {'  '}{p.resumen}
                    </Typography>
                  </MenuItem>
                ))}
              </TextField>
            )}

            <TextField
              select size="small" label="Sprint" fullWidth value={sprintId}
              onChange={e => setSprintId(e.target.value === '' ? '' : Number(e.target.value))}
              helperText={abiertos.length ? undefined : 'No hay sprints abiertos.'}
            >
              <MenuItem value=""><em>Al backlog</em></MenuItem>
              {abiertos.map(s => (
                <MenuItem key={s.id} value={s.id}>
                  {s.nombre}{s.estado === 'ACTIVO' ? ' · en curso' : ''}
                </MenuItem>
              ))}
            </TextField>

            <Autocomplete
              multiple freeSolo size="small"
              options={(sugeridas ?? []).map(e => e.etiqueta)}
              value={etiquetas}
              onChange={(_, v) => setEtiquetas(
                v.map(x => String(x).trim()).filter(Boolean))}
              renderTags={(valores, getProps) =>
                valores.map((v, i) => (
                  <Chip {...getProps({ index: i })} key={v} label={v} size="small"
                    sx={{ height: 20, fontSize: 10.5 }} />
                ))}
              renderInput={p => (
                <TextField {...p} label="Etiquetas"
                  helperText="Se proponen las que ya se usan, para no inventar tres formas de la misma." />
              )}
            />

            <Divider textAlign="left">
              <Tooltip title="Son las barras del Gantt: el plan. Lo real se sella solo al empezar y al resolver.">
                <Typography variant="caption" sx={{
                  fontWeight: 800, fontSize: 9.5, letterSpacing: '0.08em',
                  color: PALETA.acero,
                }}>
                  PLAN
                </Typography>
              </Tooltip>
            </Divider>

            <Stack direction="row" spacing={1.5}>
              <TextField
                size="small" type="date" label="Inicio" fullWidth
                InputLabelProps={{ shrink: true }}
                value={inicioPlan} onChange={e => setInicioPlan(e.target.value)}
              />
              <TextField
                size="small" type="date" label="Vence" fullWidth
                InputLabelProps={{ shrink: true }}
                value={vence} onChange={e => setVence(e.target.value)}
              />
            </Stack>
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Typography variant="caption" sx={{ color: PALETA.acero, flex: 1 }}>
          Los campos de esta pantalla se definen en Configuración → Campos.
        </Typography>
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
