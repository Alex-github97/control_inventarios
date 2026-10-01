/**
 * GRC · Hallazgos y planes de acción
 *
 * Un hallazgo sale de una auditoría o de un incidente y se liga al riesgo y al
 * control que revela. Su fecha límite se propone con el plazo de
 * Configuración, «vencido» se calcula con ella, y no se cierra mientras tenga
 * planes de acción sin completar.
 */
import { useState } from 'react'
import { Box, Button, Paper, Typography, Slider } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { ReportProblem, Add } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { grc, type Registro } from '@/api/grc'
import { FormularioRegistro, TablaRegistros, useCrud, Cifra, Encabezado, fmtFecha, errorApi, type Campo } from '@/components/comun/Registro'
import { ESTADOS_HALLAZGO, SEVERIDADES, HALLAZGO_COLOR, CAT } from '@/components/grc/etiquetas'
import { FichaGRC, GRC_COLOR, ChipEstado, usePersonasGRC, useReferencias } from '@/components/grc/comun'

/** Campos del hallazgo, compartidos con Auditorías e Incidentes. */
export function useCamposHallazgo(): Campo[] {
  const personas = usePersonasGRC()
  const auditorias = useReferencias('auditoria')
  const riesgos = useReferencias('riesgo')
  const controles = useReferencias('control')
  const incidentes = useReferencias('incidente')
  return [
    { clave: 'titulo', etiqueta: 'Hallazgo', obligatorio: true },
    { clave: 'tipo', etiqueta: 'Tipo', tipo: 'catalogo', catalogo: CAT.tipoHallazgo, obligatorio: true, ancho: 6 },
    { clave: 'severidad', etiqueta: 'Severidad', tipo: 'seleccion', opciones: SEVERIDADES, obligatorio: true, ancho: 3 },
    { clave: 'estado', etiqueta: 'Estado', tipo: 'seleccion', opciones: ESTADOS_HALLAZGO, obligatorio: true, ancho: 3 },
    { clave: 's1', etiqueta: 'Origen y relación', tipo: 'seccion' },
    { clave: 'auditoria_id', etiqueta: 'Auditoría', tipo: 'referencia', opciones: auditorias, ancho: 6 },
    { clave: 'incidente_id', etiqueta: 'Incidente', tipo: 'referencia', opciones: incidentes, ancho: 6 },
    { clave: 'riesgo_id', etiqueta: 'Riesgo que revela', tipo: 'referencia', opciones: riesgos, ancho: 6 },
    { clave: 'control_id', etiqueta: 'Control deficiente', tipo: 'referencia', opciones: controles, ancho: 6 },
    { clave: 'proceso', etiqueta: 'Proceso', tipo: 'catalogo', catalogo: CAT.proceso, ancho: 6 },
    { clave: 'area', etiqueta: 'Área', tipo: 'catalogo', catalogo: CAT.area, ancho: 6 },
    { clave: 's2', etiqueta: 'Responsable y plazo', tipo: 'seccion' },
    { clave: 'responsable_id', etiqueta: 'Responsable de remediar', tipo: 'persona', personas, obligatorio: true, ancho: 6 },
    { clave: 'fecha_limite', etiqueta: 'Fecha límite', tipo: 'fecha', ancho: 6, ayuda: 'Vacía: el plazo por defecto de Configuración' },
    { clave: 'descripcion', etiqueta: 'Condición encontrada', tipo: 'area' },
    { clave: 'causa_raiz', etiqueta: 'Causa raíz', tipo: 'area' },
    { clave: 'impacto', etiqueta: 'Efecto / impacto', tipo: 'area', ancho: 6 },
    { clave: 'recomendacion', etiqueta: 'Recomendación', tipo: 'area', ancho: 6 },
  ]
}

function PanelPlanes({ hallazgo, refrescar }: { hallazgo: Registro; refrescar: () => void }) {
  const personas = usePersonasGRC()
  const q = useQuery({ queryKey: ['grc', 'planes', hallazgo.id], queryFn: () => grc.planes.listar({ hallazgo_id: hallazgo.id }) })
  const [nuevo, setNuevo] = useState(false)
  const campos: Campo[] = [
    { clave: 'accion', etiqueta: 'Acción', tipo: 'area', obligatorio: true },
    { clave: 'responsable_id', etiqueta: 'Responsable', tipo: 'persona', personas, obligatorio: true, ancho: 6 },
    { clave: 'fecha_objetivo', etiqueta: 'Fecha objetivo', tipo: 'fecha', ancho: 6 },
  ]
  const avance = async (p: Registro, v: number) => {
    try { await grc.planes.editar(p.id, { hallazgo_id: hallazgo.id, accion: p.accion, responsable_id: p.responsable_id,
      fecha_objetivo: p.fecha_objetivo, avance: v, evidencia: p.evidencia, observaciones: p.observaciones }); refrescar() }
    catch (e) { toast.error(errorApi(e)) }
  }
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ fontWeight: 700, fontSize: 13 }}>Planes de acción</Typography>
        <Button size="small" startIcon={<Add />} onClick={() => setNuevo(true)}>Agregar</Button>
      </Box>
      {(q.data ?? []).length === 0 && <Typography sx={{ fontSize: 12.5, color: 'text.secondary' }}>Sin planes. Un hallazgo sin plan no se remedia.</Typography>}
      {(q.data ?? []).map(p => (
        <Paper key={p.id} variant="outlined" sx={{ p: 1.25, mt: 1, borderRadius: 2 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{p.accion}</Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{p.responsable_nombre ?? 'Sin responsable'} · objetivo {fmtFecha(p.fecha_objetivo)}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Slider size="small" defaultValue={p.avance} step={10} min={0} max={100} aria-label={`Avance de ${p.accion}`}
              onChangeCommitted={(_, v) => avance(p, v as number)} sx={{ color: GRC_COLOR }} />
            <Typography sx={{ fontSize: 12, fontWeight: 700, minWidth: 40 }}>{p.avance}%</Typography>
          </Box>
        </Paper>
      ))}
      <FormularioRegistro abierto={nuevo} titulo="Nuevo plan de acción" campos={campos} valoresIniciales={{ responsable_id: hallazgo.responsable_id }}
        onGuardar={async c => { await grc.planes.crear({ ...c, hallazgo_id: hallazgo.id }); toast.success('Plan agregado'); refrescar() }}
        onCerrar={() => setNuevo(false)} />
    </Box>
  )
}

export default function GRCHallazgos() {
  const crud = useCrud(['grc', 'hallazgos'], grc.hallazgos, 'Hallazgo')
  const campos = useCamposHallazgo()
  const [dlg, setDlg] = useState<{ abierto: boolean; r: Registro | null }>({ abierto: false, r: null })
  const [ficha, setFicha] = useState<number | null>(null)
  const [filtro, setFiltro] = useState('')
  const lista = crud.datos
  const visibles = filtro === 'vencido' ? lista.filter(h => h.vencido) : filtro ? lista.filter(h => h.estado === filtro) : lista

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<ReportProblem sx={{ fontSize: 28 }} />} titulo="Hallazgos" subtitulo="GRC · De auditorías e incidentes a planes de acción"
          color={GRC_COLOR} accion="Nuevo hallazgo" onAccion={() => setDlg({ abierto: true, r: null })} />
        <Grid container spacing={2} mb={3}>
          {[...ESTADOS_HALLAZGO, ['vencido', 'Vencidos'] as [string, string]].map(([k, l]) => (
            <Grid key={k} size={{ xs: 6, md: 2.4 }}>
              <Box role="button" aria-pressed={filtro === k} onClick={() => setFiltro(filtro === k ? '' : k)} sx={{ cursor: 'pointer', borderRadius: 2, outline: filtro === k ? `2px solid ${HALLAZGO_COLOR[k]}` : 'none' }}>
                <Cifra etiqueta={l} valor={k === 'vencido' ? lista.filter(h => h.vencido).length : lista.filter(h => h.estado === k).length} color={HALLAZGO_COLOR[k]} />
              </Box>
            </Grid>
          ))}
        </Grid>
        <TablaRegistros<Registro> filas={visibles} cargando={crud.isLoading} vacio="Sin hallazgos" etiqueta={h => h.titulo}
          onFila={h => setFicha(h.id)} onEditar={h => setDlg({ abierto: true, r: h })} onRetirar={h => crud.retirar.mutate(h.id)}
          columnas={[
            { titulo: 'Código', valor: h => <Box sx={{ fontFamily: 'monospace' }}>{h.codigo}</Box> },
            { titulo: 'Hallazgo', valor: h => h.titulo },
            { titulo: 'Origen', valor: h => h.auditoria_codigo ?? h.incidente_codigo ?? '—' },
            { titulo: 'Severidad', valor: h => <ChipEstado v={h.severidad} /> },
            { titulo: 'Responsable', valor: h => h.responsable_nombre ?? '—' },
            { titulo: 'Límite', valor: h => <Box sx={{ color: h.vencido ? '#DC2626' : undefined, fontWeight: h.vencido ? 700 : 400 }}>{fmtFecha(h.fecha_limite)}</Box> },
            { titulo: 'Planes', valor: h => `${h.planes_completos}/${h.planes}`, alinear: 'center' },
            { titulo: 'Estado', valor: h => <ChipEstado v={h.vencido ? 'vencido' : h.estado} /> },
          ]} />
        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? `Editar ${dlg.r.codigo}` : 'Nuevo hallazgo'} campos={campos} registro={dlg.r}
          ancho="md" valoresIniciales={{ estado: 'abierto' }}
          onGuardar={c => crud.guardar(dlg.r, c)} onCerrar={() => setDlg({ abierto: false, r: null })} />
        <FichaGRC tipo="hallazgo" id={ficha} onCerrar={() => setFicha(null)} ocultar={['planes']}
          resumen={h => [
            ['Tipo', h.tipo], ['Severidad', <ChipEstado v={h.severidad} />], ['Estado', <ChipEstado v={h.estado} />],
            ['Responsable', h.responsable_nombre], ['Límite', fmtFecha(h.fecha_limite)], ['Proceso', h.proceso],
            ['Origen', h.auditoria_codigo ?? h.incidente_codigo], ['Riesgo', h.riesgo_codigo], ['Control', h.control_codigo],
          ]}>
          {(h, refrescar) => <PanelPlanes hallazgo={h} refrescar={refrescar} />}
        </FichaGRC>
      </Box>
    </Layout>
  )
}
