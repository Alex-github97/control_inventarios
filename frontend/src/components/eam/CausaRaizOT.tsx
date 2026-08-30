/**
 * Informe de causa raíz de una orden de trabajo.
 *
 * Es un formulario y no un archivo adjunto a propósito: de un PDF subido no se
 * puede sacar «cuál es la falla que más nos cuesta en los Freightliner»; de
 * campos con estructura, sí. El PDF exportable se genera a partir de esto, no
 * al revés.
 *
 * Las evidencias van aparte de los documentos de la OT: aquellos son los
 * soportes comerciales —cotización, factura, orden de compra— y estas son la
 * evidencia técnica que se embebe en el informe.
 */
import { useRef, useState } from 'react'
import {
  Box, Card, Typography, Stack, Button, TextField, MenuItem, Chip, Alert,
  Skeleton, IconButton, Tooltip, Divider, Switch, FormControlLabel,
  Table, TableBody, TableCell, TableHead, TableRow,
} from '@mui/material'
import {
  Add, DeleteForever, PictureAsPdf, PhotoCamera, Save, Science, Download,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient as api } from '@/api/client'
import { PALETA, ESTADO, COLOR_MODULO } from '@/config/marca'
import { SelectorCatalogo } from '@/components/catalogo/SelectorCatalogo'
import { SelectorResponsable } from '@/components/catalogo/SelectorResponsable'

interface Porque { pregunta: string; respuesta: string }
interface Accion {
  id?: number; tipo: string; descripcion: string
  responsable?: string | null; fecha_compromiso?: string | null
  estado: string; fecha_cierre?: string | null; orden?: number
}
interface Evidencia {
  id: number; nombre: string; tamano?: number | null
  descripcion?: string | null; orden?: number
}
interface RCA {
  id?: number
  ot_numero?: string | null
  fecha_analisis?: string | null
  analista?: string | null
  participantes?: string | null
  metodologia: string
  estado: string
  descripcion_evento?: string | null
  deteccion?: string | null
  modo_falla?: string | null
  categoria_causa?: string | null
  porques?: Porque[] | null
  causa_inmediata?: string | null
  causa_raiz?: string | null
  factores_contribuyentes?: string | null
  horas_parada?: number | null
  costo_estimado?: number | null
  hubo_lesion: boolean
  hubo_ambiental: boolean
  conclusiones?: string | null
  verificacion_eficacia?: string | null
  fecha_verificacion?: string | null
  eficaz?: boolean | null
  acciones: Accion[]
  evidencias: Evidencia[]
}

const METODOLOGIAS = [
  { v: 'CINCO_PORQUES', l: 'Cinco porqués' },
  { v: 'ISHIKAWA', l: 'Ishikawa (espina de pescado)' },
  { v: 'ARBOL_FALLOS', l: 'Árbol de fallos' },
  { v: 'OTRA', l: 'Otra' },
]
const ESTADOS = [
  { v: 'BORRADOR', l: 'Borrador' },
  { v: 'EN_ANALISIS', l: 'En análisis' },
  { v: 'CERRADO', l: 'Cerrado' },
]
const TIPOS_ACCION = ['CORRECTIVA', 'PREVENTIVA']
const ESTADOS_ACCION = ['PENDIENTE', 'EN_PROCESO', 'HECHA']

const VACIO = (): RCA => ({
  metodologia: 'CINCO_PORQUES', estado: 'BORRADOR',
  hubo_lesion: false, hubo_ambiental: false,
  porques: [{ pregunta: '¿Por qué ocurrió?', respuesta: '' }],
  acciones: [], evidencias: [],
})

const peso = (b?: number | null) =>
  !b ? '' : b < 1048576 ? `${Math.round(b / 1024)} KB` : `${(b / 1048576).toFixed(1)} MB`

export function CausaRaizOT({ otId, otNumero }: { otId: number; otNumero?: string | null }) {
  const qc = useQueryClient()
  const entrada = useRef<HTMLInputElement>(null)
  const [f, setF] = useState<RCA | null>(null)
  const [pieDeFoto, setPieDeFoto] = useState('')

  const { data, isLoading } = useQuery<RCA | null>({
    queryKey: ['rca', otId],
    queryFn: () => api.get(`/eam/ots/${otId}/causa-raiz`).then(r => r.data),
  })

  // El formulario se siembra con lo guardado la primera vez que llega.
  const rca = f ?? (data ? { ...VACIO(), ...data } : null)
  const iniciar = () => setF(data ? { ...VACIO(), ...data } : VACIO())

  const set = <K extends keyof RCA>(k: K, v: RCA[K]) =>
    setF(p => ({ ...(p ?? rca ?? VACIO()), [k]: v }))

  const guardar = useMutation({
    mutationFn: () => api.put(`/eam/ots/${otId}/causa-raiz`, rca).then(r => r.data),
    onSuccess: d => {
      setF(null)
      qc.setQueryData(['rca', otId], d)
      qc.invalidateQueries({ queryKey: ['rca-analitica'] })
      toast.success('Análisis guardado')
    },
    // El servidor impide cerrar sin causa raíz y sin acciones; el mensaje dice
    // cuál de las dos falta.
    onError: (e: any) =>
      toast.error(e?.response?.data?.detail ?? 'No se pudo guardar el análisis'),
  })

  const subirEvidencia = useMutation({
    mutationFn: async (archivos: File[]) => {
      const cuerpo = new FormData()
      archivos.forEach(a => cuerpo.append('archivos', a))
      if (pieDeFoto.trim()) cuerpo.append('descripcion', pieDeFoto.trim())
      await api.post(`/eam/causa-raiz/${data!.id}/evidencias`, cuerpo)
    },
    onSuccess: () => {
      setPieDeFoto('')
      qc.invalidateQueries({ queryKey: ['rca', otId] })
      toast.success('Evidencia agregada')
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.detail ?? 'No se pudo subir la evidencia'),
  })

  const borrarEvidencia = useMutation({
    mutationFn: (id: number) => api.delete(`/eam/causa-raiz/evidencias/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rca', otId] }),
  })

  const exportar = async () => {
    if (!data?.id) return
    try {
      const r = await api.get(`/eam/causa-raiz/${data.id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(r.data)
      const el = document.createElement('a')
      el.href = url
      el.download = `causa-raiz-${otNumero ?? data.id}.pdf`
      document.body.appendChild(el); el.click(); el.remove()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('No se pudo generar el informe')
    }
  }

  if (isLoading) return <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />

  // Sin análisis y sin empezar a escribir: solo la invitación.
  if (!rca) {
    return (
      <Card variant="outlined" sx={{ borderRadius: 2, p: 3, textAlign: 'center' }}>
        <Science sx={{ fontSize: 32, color: PALETA.acero, opacity: 0.5 }} />
        <Typography variant="body2" color="text.secondary" mt={1}>
          Esta orden no tiene análisis de causa raíz.
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" mb={2}>
          Sirve para saber por qué falló y que no vuelva a pasar. Lo que se registre
          acá alimenta el tablero de mantenimiento.
        </Typography>
        <Button variant="contained" startIcon={<Add />} onClick={iniciar}
          sx={{ textTransform: 'none', fontWeight: 700 }}>
          Iniciar análisis
        </Button>
      </Card>
    )
  }

  const porques = rca.porques ?? []
  const cambiado = f !== null

  return (
    <Box>
      <Stack direction="row" alignItems="center" mb={1.5} flexWrap="wrap" useFlexGap>
        <Box sx={{ flex: 1, minWidth: 200 }}>
          <Typography variant="subtitle2" fontWeight={800}>Análisis de causa raíz</Typography>
          <Typography variant="caption" color="text.secondary">
            Alimenta el tablero de mantenimiento: causas por activo, marca y línea
          </Typography>
        </Box>
        <Chip label={ESTADOS.find(e => e.v === rca.estado)?.l ?? rca.estado} size="small" sx={{
          fontWeight: 700,
          bgcolor: rca.estado === 'CERRADO' ? `${ESTADO.exito}1A` : `${ESTADO.alerta}1F`,
          color: rca.estado === 'CERRADO' ? ESTADO.exito : ESTADO.alerta,
        }} />
        {data?.id && (
          <Button size="small" startIcon={<PictureAsPdf />} variant="outlined" onClick={exportar}
            sx={{ textTransform: 'none', fontWeight: 600 }}>
            Exportar informe
          </Button>
        )}
      </Stack>

      <Stack spacing={2}>
        {/* Identificación */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Fecha del análisis" type="date" size="small" fullWidth
            InputLabelProps={{ shrink: true }} value={rca.fecha_analisis ?? ''}
            onChange={e => set('fecha_analisis', e.target.value)} />
          {/* El analista es una persona, no un catálogo: sale de la nómina,
              por la misma razón que los responsables de los demás módulos. */}
          <SelectorResponsable label="Analista" valor={rca.analista ?? ''}
            onChange={v => set('analista', v)} sx={{ flex: 1 }} />
          <TextField select label="Metodología" size="small" fullWidth value={rca.metodologia}
            onChange={e => set('metodologia', e.target.value)}>
            {METODOLOGIAS.map(m => <MenuItem key={m.v} value={m.v}>{m.l}</MenuItem>)}
          </TextField>
        </Stack>
        <TextField label="Participantes" size="small" fullWidth value={rca.participantes ?? ''}
          onChange={e => set('participantes', e.target.value)}
          placeholder="Quiénes participaron en el análisis" />

        <Divider textAlign="left"><Typography variant="caption">Qué pasó</Typography></Divider>
        <TextField label="Descripción del evento" size="small" fullWidth multiline rows={3}
          value={rca.descripcion_evento ?? ''}
          onChange={e => set('descripcion_evento', e.target.value)} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          {/* Las tres son listas del catálogo y no texto libre: son justo lo
              que el tablero de causas agrupa. Escritas a mano, «fuga de
              aceite» y «Fuga aceite» cuentan como dos causas y el Pareto
              queda partido. Se configuran en CMMS · Configuración · Catálogos. */}
          <SelectorCatalogo modulo="EAM" tipo="METODO_DETECCION"
            label="Cómo se detectó" valor={rca.deteccion ?? ''}
            onChange={v => set('deteccion', v)} sx={{ flex: 1 }} />
          <SelectorCatalogo modulo="EAM" tipo="MODO_FALLA"
            label="Modo de falla" valor={rca.modo_falla ?? ''}
            onChange={v => set('modo_falla', v)}
            ayuda="Cómo se manifestó" sx={{ flex: 1 }} />
          <SelectorCatalogo modulo="EAM" tipo="CATEGORIA_CAUSA"
            label="Categoría de causa" valor={rca.categoria_causa ?? ''}
            onChange={v => set('categoria_causa', v)}
            ayuda="Es lo que después se agrupa en el tablero" sx={{ flex: 1 }} />
        </Stack>

        <Divider textAlign="left"><Typography variant="caption">Consecuencias</Typography></Divider>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField label="Horas de parada" size="small" fullWidth type="number"
            value={rca.horas_parada ?? ''}
            onChange={e => set('horas_parada', e.target.value === '' ? null : Number(e.target.value))} />
          <TextField label="Costo estimado" size="small" fullWidth type="number"
            value={rca.costo_estimado ?? ''}
            onChange={e => set('costo_estimado', e.target.value === '' ? null : Number(e.target.value))} />
          <FormControlLabel
            control={<Switch checked={rca.hubo_lesion}
              onChange={e => set('hubo_lesion', e.target.checked)} />}
            label={<Typography variant="caption">Hubo lesión</Typography>} />
          <FormControlLabel
            control={<Switch checked={rca.hubo_ambiental}
              onChange={e => set('hubo_ambiental', e.target.checked)} />}
            label={<Typography variant="caption">Impacto ambiental</Typography>} />
        </Stack>

        {/* Porqués */}
        <Divider textAlign="left"><Typography variant="caption">El análisis</Typography></Divider>
        <Box>
          <Stack direction="row" alignItems="center" mb={1}>
            <Typography variant="caption" sx={{ flex: 1, color: PALETA.grafito }}>
              Secuencia de porqués — cada respuesta es la pregunta de la siguiente
            </Typography>
            <Button size="small" startIcon={<Add />}
              onClick={() => set('porques', [...porques, { pregunta: '¿Por qué?', respuesta: '' }])}
              sx={{ textTransform: 'none' }}>Agregar</Button>
          </Stack>
          <Stack spacing={1}>
            {porques.map((p, i) => (
              <Stack key={i} direction="row" spacing={1} alignItems="center">
                <Chip label={i + 1} size="small" sx={{ fontWeight: 800, minWidth: 30 }} />
                <TextField size="small" label="Pregunta" value={p.pregunta} sx={{ flex: 1 }}
                  onChange={e => set('porques', porques.map((x, j) =>
                    j === i ? { ...x, pregunta: e.target.value } : x))} />
                <TextField size="small" label="Respuesta" value={p.respuesta} sx={{ flex: 2 }}
                  onChange={e => set('porques', porques.map((x, j) =>
                    j === i ? { ...x, respuesta: e.target.value } : x))} />
                <IconButton size="small"
                  onClick={() => set('porques', porques.filter((_, j) => j !== i))}>
                  <DeleteForever fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        </Box>

        <TextField label="Causa inmediata" size="small" fullWidth multiline rows={2}
          value={rca.causa_inmediata ?? ''}
          onChange={e => set('causa_inmediata', e.target.value)} />
        <TextField label="Causa raíz" size="small" fullWidth multiline rows={3} required
          value={rca.causa_raiz ?? ''}
          onChange={e => set('causa_raiz', e.target.value)}
          helperText="Obligatoria para poder cerrar el análisis" />
        <TextField label="Factores contribuyentes" size="small" fullWidth multiline rows={2}
          value={rca.factores_contribuyentes ?? ''}
          onChange={e => set('factores_contribuyentes', e.target.value)} />

        {/* Acciones */}
        <Divider textAlign="left"><Typography variant="caption">Acciones</Typography></Divider>
        <Box>
          <Stack direction="row" alignItems="center" mb={1}>
            <Typography variant="caption" sx={{ flex: 1, color: PALETA.grafito }}>
              Correctiva arregla lo que pasó; preventiva evita que vuelva
            </Typography>
            <Button size="small" startIcon={<Add />} sx={{ textTransform: 'none' }}
              onClick={() => set('acciones', [...rca.acciones, {
                tipo: 'PREVENTIVA', descripcion: '', estado: 'PENDIENTE',
              }])}>Agregar acción</Button>
          </Stack>
          {rca.acciones.length === 0 && (
            <Alert severity="warning" sx={{ py: 0.5 }}>
              Sin acciones no se puede cerrar el análisis: no evitaría que vuelva a pasar.
            </Alert>
          )}
          <Stack spacing={1}>
            {rca.acciones.map((a, i) => (
              <Stack key={i} direction={{ xs: 'column', md: 'row' }} spacing={1}>
                <TextField select size="small" label="Tipo" value={a.tipo} sx={{ minWidth: 130 }}
                  onChange={e => set('acciones', rca.acciones.map((x, j) =>
                    j === i ? { ...x, tipo: e.target.value } : x))}>
                  {TIPOS_ACCION.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
                <TextField size="small" label="Qué se hará" value={a.descripcion} sx={{ flex: 1 }}
                  onChange={e => set('acciones', rca.acciones.map((x, j) =>
                    j === i ? { ...x, descripcion: e.target.value } : x))} />
                {/* Quien responde por la acción también sale de la nómina: una
                    acción a cargo de un nombre que ya no trabaja acá es una
                    acción que nadie va a cerrar. */}
                <SelectorResponsable valor={a.responsable ?? ''}
                  sx={{ minWidth: 180 }}
                  onChange={v => set('acciones', rca.acciones.map((x, j) =>
                    j === i ? { ...x, responsable: v } : x))} />
                <TextField size="small" label="Compromiso" type="date"
                  InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }}
                  value={a.fecha_compromiso ?? ''}
                  onChange={e => set('acciones', rca.acciones.map((x, j) =>
                    j === i ? { ...x, fecha_compromiso: e.target.value } : x))} />
                <TextField select size="small" label="Estado" value={a.estado}
                  sx={{ minWidth: 130 }}
                  onChange={e => set('acciones', rca.acciones.map((x, j) =>
                    j === i ? { ...x, estado: e.target.value } : x))}>
                  {ESTADOS_ACCION.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                </TextField>
                <IconButton size="small"
                  onClick={() => set('acciones', rca.acciones.filter((_, j) => j !== i))}>
                  <DeleteForever fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        </Box>

        <Divider textAlign="left"><Typography variant="caption">Cierre</Typography></Divider>
        <TextField label="Conclusiones" size="small" fullWidth multiline rows={2}
          value={rca.conclusiones ?? ''} onChange={e => set('conclusiones', e.target.value)} />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="Verificación de eficacia" size="small" fullWidth
            value={rca.verificacion_eficacia ?? ''}
            onChange={e => set('verificacion_eficacia', e.target.value)}
            helperText="Sin esto el análisis queda en buenas intenciones" />
          <TextField label="Fecha de verificación" type="date" size="small"
            InputLabelProps={{ shrink: true }} sx={{ minWidth: 180 }}
            value={rca.fecha_verificacion ?? ''}
            onChange={e => set('fecha_verificacion', e.target.value)} />
          <TextField select label="Estado" size="small" sx={{ minWidth: 160 }} value={rca.estado}
            onChange={e => set('estado', e.target.value)}>
            {ESTADOS.map(e2 => <MenuItem key={e2.v} value={e2.v}>{e2.l}</MenuItem>)}
          </TextField>
        </Stack>

        <Box>
          <Button variant="contained" startIcon={<Save />} onClick={() => guardar.mutate()}
            disabled={guardar.isPending || !cambiado}
            sx={{ textTransform: 'none', fontWeight: 700 }}>
            {guardar.isPending ? 'Guardando…' : 'Guardar análisis'}
          </Button>
          {cambiado && (
            <Button onClick={() => setF(null)} sx={{ ml: 1, textTransform: 'none' }}>
              Descartar cambios
            </Button>
          )}
        </Box>
      </Stack>

      {/* Evidencias */}
      {data?.id && (
        <>
          <Divider sx={{ my: 2.5 }} textAlign="left">
            <Typography variant="caption">Evidencias del informe</Typography>
          </Divider>
          <Alert severity="info" sx={{ mb: 1.5, py: 0.5 }}>
            Fotos y PDF que sustentan el análisis; se incrustan en el informe exportado.
            Los soportes comerciales —cotización, factura, orden de compra— van en la
            sección Documentos.
          </Alert>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mb={1.5}>
            <TextField size="small" label="Pie de foto" value={pieDeFoto} sx={{ flex: 1 }}
              onChange={e => setPieDeFoto(e.target.value)}
              placeholder="Qué se ve en la evidencia"
              helperText="Una evidencia sin explicación no prueba nada" />
            <Button startIcon={<PhotoCamera />} variant="outlined"
              onClick={() => entrada.current?.click()}
              sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}>
              Agregar evidencia
            </Button>
            <input ref={entrada} type="file" hidden multiple accept="image/*,.pdf"
              onChange={e => {
                const archivos = Array.from(e.target.files ?? [])
                e.target.value = ''
                if (archivos.length) subirEvidencia.mutate(archivos)
              }} />
          </Stack>

          {(data.evidencias ?? []).length > 0 && (
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>ARCHIVO</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>PIE DE FOTO</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.evidencias.map(e => (
                    <TableRow key={e.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{e.nombre}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {peso(e.tamano)}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ color: PALETA.grafito }}>
                        {e.descripcion ?? '—'}
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="Descargar">
                          <IconButton size="small" onClick={async () => {
                            const r = await api.get(
                              `/eam/causa-raiz/evidencias/${e.id}/descargar`,
                              { responseType: 'blob' })
                            const url = URL.createObjectURL(r.data)
                            const el = document.createElement('a')
                            el.href = url; el.download = e.nombre
                            document.body.appendChild(el); el.click(); el.remove()
                            URL.revokeObjectURL(url)
                          }}>
                            <Download fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <IconButton size="small" onClick={() => borrarEvidencia.mutate(e.id)}>
                          <DeleteForever fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </>
      )}
    </Box>
  )
}
