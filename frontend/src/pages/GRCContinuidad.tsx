/**
 * GRC · Continuidad del negocio (ISO 22301)
 *
 * Análisis de impacto por proceso (criticidad, RTO, RPO, tiempo máximo
 * tolerable, impacto por hora, sistemas críticos del catálogo), el plan de
 * contingencia con su periodicidad de revisión, y los simulacros que prueban
 * si el RTO se cumple de verdad. Riesgos y terceros de los que depende el
 * proceso se vinculan desde la ficha.
 */
import { useState } from 'react'
import { Box, Tabs, Tab, Button } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { BusinessCenter, PlayCircle } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import { grc, type Registro } from '@/api/grc'
import { FormularioRegistro, TablaRegistros, useCrud, Cifra, Encabezado, fmtFecha, type Campo } from '@/components/comun/Registro'
import { SEVERIDADES, SEVERIDAD_COLOR, ESTADOS_PLAN_BCP, CAT, etiqueta } from '@/components/grc/etiquetas'
import { FichaGRC, GRC_COLOR, ChipEstado, usePersonasGRC, useReferencias } from '@/components/grc/comun'

const horas = (v?: number | null) => v == null ? '—' : `${v} h`

export default function GRCContinuidad() {
  const planes = useCrud(['grc', 'continuidad'], grc.continuidad, 'Plan')
  const simulacros = useCrud(['grc', 'simulacros'], grc.simulacros, 'Simulacro')
  const personas = usePersonasGRC()
  const refPlanes = useReferencias('continuidad')
  const [tab, setTab] = useState(0)
  const [dlg, setDlg] = useState<{ abierto: boolean; r: Registro | null }>({ abierto: false, r: null })
  const [sim, setSim] = useState<{ abierto: boolean; r: Registro | null; plan?: Registro }>({ abierto: false, r: null })
  const [ficha, setFicha] = useState<number | null>(null)
  const lista = planes.datos

  const campos: Campo[] = [
    { clave: 'proceso', etiqueta: 'Proceso', tipo: 'catalogo', catalogo: CAT.proceso, obligatorio: true, ancho: 8 },
    { clave: 'criticidad', etiqueta: 'Criticidad', tipo: 'seleccion', opciones: SEVERIDADES, obligatorio: true, ancho: 4 },
    { clave: 's1', etiqueta: 'Análisis de impacto (BIA)', tipo: 'seccion' },
    { clave: 'rto_horas', etiqueta: 'RTO (h): en cuánto debe volver', tipo: 'numero', min: 0, ancho: 4 },
    { clave: 'rpo_horas', etiqueta: 'RPO (h): cuántos datos puede perder', tipo: 'numero', min: 0, ancho: 4 },
    { clave: 'mtpd_horas', etiqueta: 'MTPD (h): máximo tolerable', tipo: 'numero', min: 0, ancho: 4,
      validar: (v, t) => v !== '' && t.rto_horas !== '' && Number(t.rto_horas) > Number(v) ? 'El RTO no puede superar el MTPD' : null },
    { clave: 'impacto_financiero_hora', etiqueta: 'Impacto financiero por hora (COP)', tipo: 'numero', min: 0, ancho: 6 },
    { clave: 'sistemas_criticos', etiqueta: 'Sistemas críticos', tipo: 'multicatalogo', catalogo: CAT.sistema, ancho: 6 },
    { clave: 'impacto_operativo', etiqueta: 'Impacto operativo', tipo: 'area' },
    { clave: 's2', etiqueta: 'Plan', tipo: 'seccion' },
    { clave: 'responsable_id', etiqueta: 'Responsable del plan', tipo: 'persona', personas, obligatorio: true, ancho: 6 },
    { clave: 'estado_plan', etiqueta: 'Estado del plan', tipo: 'seleccion', opciones: ESTADOS_PLAN_BCP, obligatorio: true, ancho: 6 },
    { clave: 'ultima_revision', etiqueta: 'Última revisión', tipo: 'fecha', ancho: 6 },
    { clave: 'periodicidad_revision', etiqueta: 'Se revisa cada', tipo: 'catalogo', catalogo: CAT.periodicidad, ancho: 6 },
    { clave: 'plan_contingencia', etiqueta: 'Plan de contingencia (pasos)', tipo: 'area' },
  ]
  const camposSim: Campo[] = [
    { clave: 'nombre', etiqueta: 'Simulacro', obligatorio: true },
    { clave: 'continuidad_id', etiqueta: 'Plan que se prueba', tipo: 'referencia', opciones: refPlanes, obligatorio: true, ancho: 8 },
    { clave: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', obligatorio: true, ancho: 4 },
    { clave: 'tipo', etiqueta: 'Tipo', tipo: 'catalogo', catalogo: CAT.tipoSimulacro, obligatorio: true, ancho: 6 },
    { clave: 'resultado', etiqueta: 'Resultado', tipo: 'catalogo', catalogo: CAT.resultadoSimulacro, ancho: 6 },
    { clave: 'coordinador_id', etiqueta: 'Coordinador', tipo: 'persona', personas, ancho: 6 },
    { clave: 'rto_logrado_horas', etiqueta: 'Tiempo de recuperación logrado (h)', tipo: 'numero', min: 0, ancho: 6 },
    { clave: 'participantes', etiqueta: 'Participantes', tipo: 'personas', personas },
    { clave: 'observaciones', etiqueta: 'Observaciones', tipo: 'area' },
    { clave: 'lecciones', etiqueta: 'Lecciones aprendidas', tipo: 'area' },
  ]

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<BusinessCenter sx={{ fontSize: 28 }} />} titulo="Continuidad del negocio" subtitulo="GRC · Análisis de impacto, planes y simulacros (ISO 22301)"
          color={GRC_COLOR} accion={tab === 1 ? 'Registrar simulacro' : 'Nuevo plan'}
          onAccion={() => tab === 1 ? setSim({ abierto: true, r: null }) : setDlg({ abierto: true, r: null })} />
        <Grid container spacing={2} mb={3}>
          {SEVERIDADES.map(([k, l]) => (
            <Grid key={k} size={{ xs: 6, md: 2.4 }}><Cifra etiqueta={`Procesos de criticidad ${l.toLowerCase()}`} valor={lista.filter(p => p.criticidad === k).length} color={SEVERIDAD_COLOR[k]} /></Grid>
          ))}
          <Grid size={{ xs: 12, md: 2.4 }}><Cifra etiqueta="RTO no cumplido en el último simulacro" valor={lista.filter(p => p.rto_cumplido === false).length} color="#991B1B" /></Grid>
        </Grid>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}><Tab label="Planes por proceso" /><Tab label="Simulacros" /></Tabs>
        {tab === 0 && (
          <TablaRegistros<Registro> filas={lista} cargando={planes.isLoading} vacio="Sin planes de continuidad" etiqueta={p => p.proceso}
            onFila={p => setFicha(p.id)} onEditar={p => setDlg({ abierto: true, r: p })} onRetirar={p => planes.retirar.mutate(p.id)}
            extra={p => <Button size="small" startIcon={<PlayCircle />} onClick={() => setSim({ abierto: true, r: null, plan: p })}>Simulacro</Button>}
            columnas={[
              { titulo: 'Proceso', valor: p => p.proceso },
              { titulo: 'Criticidad', valor: p => <ChipEstado v={p.criticidad} /> },
              { titulo: 'RTO / RPO / MTPD', valor: p => `${horas(p.rto_horas)} / ${horas(p.rpo_horas)} / ${horas(p.mtpd_horas)}` },
              { titulo: 'Sistemas', valor: p => (p.sistemas_criticos ?? []).join(', ') || '—' },
              { titulo: 'Responsable', valor: p => p.responsable_nombre ?? '—' },
              { titulo: 'Último simulacro', valor: p => p.ultimo_simulacro ? `${fmtFecha(p.ultimo_simulacro)} · ${p.rto_cumplido == null ? '' : p.rto_cumplido ? 'RTO cumplido' : 'RTO NO cumplido'}` : 'Nunca' },
              { titulo: 'Próxima revisión', valor: p => <Box sx={{ color: p.revision_vencida ? '#DC2626' : undefined }}>{fmtFecha(p.proxima_revision)}</Box> },
            ]} />
        )}
        {tab === 1 && (
          <TablaRegistros<Registro> filas={simulacros.datos} cargando={simulacros.isLoading} vacio="Sin simulacros" etiqueta={s => s.nombre}
            onEditar={s => setSim({ abierto: true, r: s })} onRetirar={s => simulacros.retirar.mutate(s.id)}
            columnas={[
              { titulo: 'Fecha', valor: s => fmtFecha(s.fecha) },
              { titulo: 'Simulacro', valor: s => s.nombre },
              { titulo: 'Proceso', valor: s => s.continuidad_proceso ?? '—' },
              { titulo: 'Tipo', valor: s => s.tipo ?? '—' },
              { titulo: 'Resultado', valor: s => s.resultado ?? '—' },
              { titulo: 'Recuperación', valor: s => horas(s.rto_logrado_horas) },
              { titulo: 'Participantes', valor: s => (s.participantes_nombres ?? []).length, alinear: 'center' },
            ]} />
        )}
        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? `Editar plan · ${dlg.r.proceso}` : 'Nuevo plan de continuidad'} campos={campos} registro={dlg.r}
          ancho="md" valoresIniciales={{ estado_plan: 'activo' }}
          onGuardar={c => planes.guardar(dlg.r, c)} onCerrar={() => setDlg({ abierto: false, r: null })} />
        <FormularioRegistro abierto={sim.abierto} titulo={sim.r ? 'Editar simulacro' : 'Registrar simulacro'} campos={camposSim} registro={sim.r}
          valoresIniciales={{ fecha: new Date().toISOString().slice(0, 10), continuidad_id: sim.plan?.id }}
          onGuardar={async c => { await simulacros.guardar(sim.r, c); planes.refrescar() }} onCerrar={() => setSim({ abierto: false, r: null })} />
        <FichaGRC tipo="continuidad" id={ficha} onCerrar={() => setFicha(null)}
          resumen={p => [
            ['Criticidad', <ChipEstado v={p.criticidad} />], ['RTO', horas(p.rto_horas)], ['RPO', horas(p.rpo_horas)],
            ['MTPD', horas(p.mtpd_horas)], ['Responsable', p.responsable_nombre], ['Estado', etiqueta(ESTADOS_PLAN_BCP, p.estado_plan)],
            ['Sistemas', (p.sistemas_criticos ?? []).join(', ') || '—'], ['Última revisión', fmtFecha(p.ultima_revision)], ['Se revisa', p.periodicidad_revision],
          ]} />
      </Box>
    </Layout>
  )
}
