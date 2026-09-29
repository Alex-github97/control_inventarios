/**
 * GRC · Inventario de riesgos
 *
 * Era una maqueta: siete riesgos escritos a mano, con una escala de nivel
 * propia de la pantalla que no coincidía con la del servidor. Ahora se
 * registran contra la API: nivel inherente y residual los calcula el
 * servidor (probabilidad × impacto) y la prioridad sale del residual —el
 * riesgo que queda después de los controles—. El mapa de calor se arma con
 * los riesgos reales y cada riesgo lleva sus tratamientos con avance.
 */
import { useState } from 'react'
import { Box, Paper, Typography, Tabs, Tab, Tooltip, IconButton, Button, Slider, alpha, Drawer, Divider } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { BugReport, Add, DeleteForever, Close } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { grcApi, type RiesgoGRC } from '@/api/grc'
import { FormularioRegistro, TablaRegistros, useCrud, Cifra, Encabezado, Etiqueta, fmtFecha, errorApi, type Campo } from '@/components/comun/Registro'
import { TIPOS_RIESGO, ESTADOS_RIESGO, TRATAMIENTOS, PROBABILIDAD, IMPACTO, PRIORIDAD_COLOR, prioridadDe, etiqueta } from '@/components/grc/etiquetas'
import { COLOR_MODULO } from '@/config/marca'

const GRC_COLOR = COLOR_MODULO

const CAMPOS: Campo[] = [
  { clave: 'nombre', etiqueta: 'Riesgo', obligatorio: true },
  { clave: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', opciones: TIPOS_RIESGO, obligatorio: true, ancho: 6 },
  { clave: 'estado', etiqueta: 'Estado', tipo: 'seleccion', opciones: ESTADOS_RIESGO, obligatorio: true, ancho: 6 },
  { clave: 'proceso', etiqueta: 'Proceso', ancho: 6 },
  { clave: 'responsable', etiqueta: 'Responsable', ancho: 6 },
  { clave: 'probabilidad_inherente', etiqueta: 'Probabilidad inherente', tipo: 'seleccion', opciones: PROBABILIDAD, obligatorio: true, ancho: 6 },
  { clave: 'impacto_inherente', etiqueta: 'Impacto inherente', tipo: 'seleccion', opciones: IMPACTO, obligatorio: true, ancho: 6 },
  { clave: 'probabilidad_residual', etiqueta: 'Probabilidad residual', tipo: 'seleccion', opciones: PROBABILIDAD, ancho: 6, ayuda: 'Después de los controles' },
  { clave: 'impacto_residual', etiqueta: 'Impacto residual', tipo: 'seleccion', opciones: IMPACTO, ancho: 6 },
  { clave: 'tratamiento', etiqueta: 'Tratamiento', tipo: 'seleccion', opciones: TRATAMIENTOS, ancho: 6 },
  { clave: 'apetito_riesgo', etiqueta: 'Apetito de riesgo', ancho: 6 },
  { clave: 'descripcion', etiqueta: 'Descripción y causas', tipo: 'area' },
]

function Tratamientos({ riesgo, onCerrar }: { riesgo: RiesgoGRC; onCerrar: () => void }) {
  const qc = useQueryClient()
  const clave = ['grc-tratamientos', riesgo.id]
  const { data: lista = [] } = useQuery({ queryKey: clave, queryFn: () => grcApi.tratamientos.listar(riesgo.id) })
  const [nuevo, setNuevo] = useState(false)
  const refrescar = () => qc.invalidateQueries({ queryKey: clave })
  const avance = useMutation({
    mutationFn: ({ id, v }: { id: number; v: number }) => grcApi.tratamientos.avance(id, v),
    onSuccess: refrescar, onError: (e: any) => toast.error(errorApi(e)),
  })
  const retirar = useMutation({ mutationFn: (id: number) => grcApi.tratamientos.retirar(id), onSuccess: refrescar })
  const campos: Campo[] = [
    { clave: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', opciones: TRATAMIENTOS, obligatorio: true, ancho: 6 },
    { clave: 'fecha_objetivo', etiqueta: 'Fecha objetivo', tipo: 'fecha', ancho: 6 },
    { clave: 'responsable', etiqueta: 'Responsable' },
    { clave: 'descripcion', etiqueta: 'Acción', tipo: 'area', obligatorio: true },
  ]
  return (
    <Box sx={{ width: { xs: '100vw', sm: 460 }, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box><Typography fontSize={12} color="text.secondary">{riesgo.codigo}</Typography><Typography fontWeight={800}>{riesgo.nombre}</Typography></Box>
        <IconButton aria-label="Cerrar" onClick={onCerrar}><Close /></IconButton>
      </Box>
      <Typography fontSize={13} color="text.secondary" mt={1}>{riesgo.descripcion ?? 'Sin descripción'}</Typography>
      <Divider sx={{ my: 2 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography fontWeight={700}>Tratamientos</Typography>
        <Button size="small" startIcon={<Add />} onClick={() => setNuevo(true)}>Agregar</Button>
      </Box>
      {lista.length === 0 && <Typography fontSize={13} color="text.secondary">Sin tratamientos registrados.</Typography>}
      {lista.map(t => (
        <Paper key={t.id} variant="outlined" sx={{ p: 1.5, mb: 1, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography fontSize={13} fontWeight={600}>{etiqueta(TRATAMIENTOS, t.tipo)} · {t.descripcion}</Typography>
            <IconButton size="small" aria-label="Retirar tratamiento" onClick={() => retirar.mutate(t.id)}><DeleteForever fontSize="small" /></IconButton>
          </Box>
          <Typography fontSize={11} color="text.secondary">{t.responsable ?? 'Sin responsable'} · objetivo {fmtFecha(t.fecha_objetivo)}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Slider size="small" value={t.avance} step={10} min={0} max={100} aria-label={`Avance de ${t.descripcion}`}
              onChangeCommitted={(_, v) => avance.mutate({ id: t.id, v: v as number })} sx={{ color: GRC_COLOR }} />
            <Typography fontSize={12} fontWeight={700} sx={{ minWidth: 40 }}>{t.avance}%</Typography>
          </Box>
        </Paper>
      ))}
      <FormularioRegistro abierto={nuevo} titulo="Nuevo tratamiento" campos={campos} valoresIniciales={{ tipo: riesgo.tratamiento ?? 'mitigar' }}
        onGuardar={async c => { await grcApi.tratamientos.crear({ ...c, riesgo_id: riesgo.id }); toast.success('Tratamiento agregado'); refrescar() }}
        onCerrar={() => setNuevo(false)} />
    </Box>
  )
}

export default function GRCRiesgos() {
  const crud = useCrud(['grc-riesgos'], grcApi.riesgos, 'Riesgo', [['grc-tablero']])
  const [dlg, setDlg] = useState<{ abierto: boolean; r: RiesgoGRC | null }>({ abierto: false, r: null })
  const [detalle, setDetalle] = useState<RiesgoGRC | null>(null)
  const [tab, setTab] = useState(0)
  const [filtro, setFiltro] = useState('')
  const lista = crud.datos
  const vivos = lista.filter(r => !['cerrado', 'mitigado'].includes(r.estado))
  const visibles = filtro ? lista.filter(r => r.prioridad === filtro) : lista

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<BugReport sx={{ fontSize: 28 }} />} titulo="Inventario de riesgos" subtitulo="GRC · Identificación, evaluación y tratamiento"
          color={GRC_COLOR} accion="Nuevo riesgo" onAccion={() => setDlg({ abierto: true, r: null })} />
        <Grid container spacing={2} mb={3}>
          {(['critica', 'alta', 'media', 'baja'] as const).map(p => (
            <Grid key={p} size={{ xs: 6, md: 3 }}>
              <Box role="button" aria-label={`Filtrar prioridad ${p}`} onClick={() => setFiltro(filtro === p ? '' : p)} sx={{ cursor: 'pointer', outline: filtro === p ? `2px solid ${PRIORIDAD_COLOR[p]}` : 'none', borderRadius: 2 }}>
                <Cifra etiqueta={`Prioridad ${p} · sin cerrar`} valor={vivos.filter(r => r.prioridad === p).length} color={PRIORIDAD_COLOR[p]} />
              </Box>
            </Grid>
          ))}
        </Grid>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}><Tab label="Inventario" /><Tab label="Mapa de calor 5×5" /></Tabs>
        {tab === 0 && (
          <TablaRegistros<RiesgoGRC> filas={visibles} cargando={crud.isLoading} vacio="Sin riesgos registrados" etiqueta={r => r.nombre}
            onFila={r => setDetalle(r)} onEditar={r => setDlg({ abierto: true, r })} onRetirar={r => crud.retirar.mutate(r.id)}
            columnas={[
              { titulo: 'Código', valor: r => <Box sx={{ fontFamily: 'monospace' }}>{r.codigo}</Box> },
              { titulo: 'Riesgo', valor: r => <><b>{r.nombre}</b><Typography fontSize={11} color="text.secondary">{etiqueta(TIPOS_RIESGO, r.tipo)}{r.proceso ? ` · ${r.proceso}` : ''}</Typography></> },
              { titulo: 'Responsable', valor: r => r.responsable ?? '—' },
              { titulo: 'Inherente', alinear: 'center', valor: r => r.nivel_inherente != null ? `${r.probabilidad_inherente}×${r.impacto_inherente} = ${r.nivel_inherente}` : '—' },
              { titulo: 'Residual', alinear: 'center', valor: r => r.nivel_residual != null ? `${r.probabilidad_residual}×${r.impacto_residual} = ${r.nivel_residual}` : '—' },
              { titulo: 'Prioridad', valor: r => r.prioridad ? <Etiqueta texto={r.prioridad} color={PRIORIDAD_COLOR[r.prioridad]} /> : '—' },
              { titulo: 'Tratamiento', valor: r => etiqueta(TRATAMIENTOS, r.tratamiento) },
              { titulo: 'Estado', valor: r => etiqueta(ESTADOS_RIESGO, r.estado) },
            ]} />
        )}
        {tab === 1 && (
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, overflow: 'auto' }}>
            <Typography fontSize={12} color="text.secondary" mb={1}>Riesgos sin cerrar ubicados por su valoración inherente. Pasa el cursor sobre una celda para ver cuáles son.</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '90px repeat(5, minmax(70px, 1fr))', gap: 0.5, minWidth: 520 }}>
              {[5, 4, 3, 2, 1].map(p => (
                <Box key={p} sx={{ display: 'contents' }}>
                  <Typography fontSize={11} sx={{ alignSelf: 'center' }}>{PROBABILIDAD[p - 1][1]}</Typography>
                  {[1, 2, 3, 4, 5].map(i => {
                    const aqui = vivos.filter(r => r.probabilidad_inherente === p && r.impacto_inherente === i)
                    const c = PRIORIDAD_COLOR[prioridadDe(p * i)]
                    return (
                      <Tooltip key={i} title={aqui.map(r => `${r.codigo} ${r.nombre}`).join(' · ') || 'Sin riesgos'}>
                        <Box sx={{ height: 56, borderRadius: 1, bgcolor: alpha(c, aqui.length ? 0.85 : 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', color: aqui.length ? '#fff' : c, fontWeight: 800 }}>
                          {aqui.length || ''}
                        </Box>
                      </Tooltip>
                    )
                  })}
                </Box>
              ))}
              <Box />
              {IMPACTO.map(([v, l]) => <Typography key={v} fontSize={11} textAlign="center">{l}</Typography>)}
            </Box>
          </Paper>
        )}
        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? `Riesgo ${dlg.r.codigo}` : 'Nuevo riesgo'} campos={CAMPOS} registro={dlg.r}
          valoresIniciales={{ estado: 'identificado', tipo: 'operativo', tratamiento: 'mitigar' }}
          onGuardar={c => crud.guardar(dlg.r, c)} onCerrar={() => setDlg({ abierto: false, r: null })}
          pie={f => {
            const pi = Number(f.probabilidad_inherente), ii = Number(f.impacto_inherente), pr = Number(f.probabilidad_residual), ir = Number(f.impacto_residual)
            if (!pi || !ii) return null
            const n = pr && ir ? pr * ir : pi * ii
            const p = prioridadDe(n)
            return <Typography fontSize={13} fontWeight={700} color={PRIORIDAD_COLOR[p]}>Inherente {pi * ii}{pr && ir ? ` · residual ${pr * ir}` : ''} → prioridad {p}</Typography>
          }} />
        <Drawer anchor="right" open={!!detalle} onClose={() => setDetalle(null)}>
          {detalle && <Tratamientos riesgo={detalle} onCerrar={() => setDetalle(null)} />}
        </Drawer>
      </Box>
    </Layout>
  )
}
