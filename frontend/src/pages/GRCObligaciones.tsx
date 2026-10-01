/**
 * GRC · Obligaciones
 *
 * Cada obligación nace de un marco normativo (ley, norma, contrato) y se
 * cubre con controles y políticas, que se vinculan desde su ficha. Su estado
 * de cumplimiento no se escribe: es el de su evaluación más reciente, y la
 * próxima evaluación sale de la periodicidad.
 */
import { useState } from 'react'
import { Box, Button } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Gavel, FactCheck } from '@mui/icons-material'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { grc, type Registro } from '@/api/grc'
import { FormularioRegistro, TablaRegistros, useCrud, Cifra, Encabezado, fmtFecha, type Campo } from '@/components/comun/Registro'
import { ESTADOS_CUMPLIMIENTO, CUMPLIMIENTO_COLOR, CAT } from '@/components/grc/etiquetas'
import { FichaGRC, GRC_COLOR, ChipEstado, usePersonasGRC } from '@/components/grc/comun'

export function camposEvaluacion(personas: any[], obligaciones?: [number, string][]): Campo[] {
  return [
    ...(obligaciones ? [{ clave: 'obligacion_id', etiqueta: 'Obligación', tipo: 'referencia', opciones: obligaciones, obligatorio: true } as Campo] : []),
    { clave: 'estado', etiqueta: 'Resultado', tipo: 'seleccion', opciones: ESTADOS_CUMPLIMIENTO, obligatorio: true, ancho: 6 },
    { clave: 'puntaje', etiqueta: 'Puntaje (0–100)', tipo: 'numero', min: 0, max: 100, ancho: 6 },
    { clave: 'ultima_evaluacion', etiqueta: 'Fecha de evaluación', tipo: 'fecha', ancho: 6 },
    { clave: 'responsable_id', etiqueta: 'Evaluó', tipo: 'persona', personas, ancho: 6 },
    { clave: 'proceso', etiqueta: 'Proceso', tipo: 'catalogo', catalogo: CAT.proceso, ancho: 6 },
    { clave: 'area', etiqueta: 'Área', tipo: 'catalogo', catalogo: CAT.area, ancho: 6 },
    { clave: 'evidencias', etiqueta: 'Evidencia del cumplimiento', tipo: 'area',
      validar: (v, t) => t.estado === 'cumple' && !String(v ?? '').trim() ? 'Para «cumple» diga con qué evidencia' : null },
    { clave: 'observaciones', etiqueta: 'Observaciones', tipo: 'area' },
  ]
}

export default function GRCObligaciones() {
  const crud = useCrud(['grc', 'obligaciones'], grc.obligaciones, 'Obligación', [], true)
  const personas = usePersonasGRC()
  const [dlg, setDlg] = useState<{ abierto: boolean; r: Registro | null }>({ abierto: false, r: null })
  const [ficha, setFicha] = useState<number | null>(null)
  const [evaluar, setEvaluar] = useState<Registro | null>(null)
  const [filtro, setFiltro] = useState('')
  const lista = crud.datos
  const visibles = filtro ? lista.filter(o => o.estado_cumplimiento === filtro) : lista

  const campos: Campo[] = [
    { clave: 'nombre', etiqueta: 'Obligación', obligatorio: true, ayuda: 'Qué exige, en una frase' },
    { clave: 'marco', etiqueta: 'Marco normativo', tipo: 'catalogo', catalogo: CAT.marco, obligatorio: true, ancho: 8 },
    { clave: 'articulo', etiqueta: 'Artículo / numeral', ancho: 4 },
    { clave: 'tipo', etiqueta: 'Tipo', tipo: 'catalogo', catalogo: CAT.tipoObligacion, ancho: 6 },
    { clave: 'pais', etiqueta: 'País', tipo: 'catalogo', catalogo: CAT.pais, ancho: 6 },
    { clave: 'responsable_id', etiqueta: 'Responsable', tipo: 'persona', personas, obligatorio: true, ancho: 6 },
    { clave: 'periodicidad', etiqueta: 'Se evalúa cada', tipo: 'catalogo', catalogo: CAT.periodicidad, ancho: 6 },
    { clave: 'proceso', etiqueta: 'Proceso', tipo: 'catalogo', catalogo: CAT.proceso, ancho: 6 },
    { clave: 'area', etiqueta: 'Área', tipo: 'catalogo', catalogo: CAT.area, ancho: 6 },
    { clave: 'fecha_vigencia', etiqueta: 'Vigente desde', tipo: 'fecha', ancho: 6 },
    { clave: 'fecha_vencimiento', etiqueta: 'Vence', tipo: 'fecha', ancho: 6 },
    { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'area' },
  ]

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Gavel sx={{ fontSize: 28 }} />} titulo="Obligaciones" subtitulo="GRC · Requisitos legales, normativos y contractuales"
          color={GRC_COLOR} accion="Nueva obligación" onAccion={() => setDlg({ abierto: true, r: null })} />
        <Grid container spacing={2} mb={3}>
          {ESTADOS_CUMPLIMIENTO.map(([k, l]) => (
            <Grid key={k} size={{ xs: 6, md: 2.4 }}>
              <Box role="button" aria-pressed={filtro === k} onClick={() => setFiltro(filtro === k ? '' : k)} sx={{ cursor: 'pointer', borderRadius: 2, outline: filtro === k ? `2px solid ${CUMPLIMIENTO_COLOR[k]}` : 'none' }}>
                <Cifra etiqueta={l} valor={lista.filter(o => o.estado_cumplimiento === k).length} color={CUMPLIMIENTO_COLOR[k]} />
              </Box>
            </Grid>
          ))}
        </Grid>
        <TablaRegistros<Registro> filas={visibles} cargando={crud.isLoading} vacio="Sin obligaciones registradas" etiqueta={o => o.nombre}
          onFila={o => setFicha(o.id)} onEditar={o => setDlg({ abierto: true, r: o })} onRetirar={o => crud.retirar.mutate(o.id)}
          extra={o => <Button size="small" onClick={() => setEvaluar(o)}>Evaluar</Button>}
          columnas={[
            { titulo: 'Código', valor: o => <Box sx={{ fontFamily: 'monospace' }}>{o.codigo}</Box> },
            { titulo: 'Obligación', valor: o => o.nombre },
            { titulo: 'Marco', valor: o => [o.marco, o.articulo].filter(Boolean).join(' · ') || '—' },
            { titulo: 'Responsable', valor: o => o.responsable_nombre ?? '—' },
            { titulo: 'Cumplimiento', valor: o => <ChipEstado v={o.estado_cumplimiento} /> },
            { titulo: 'Próxima evaluación', valor: o => fmtFecha(o.proxima_evaluacion) },
            { titulo: 'Vence', valor: o => <Box sx={{ color: o.vencida ? '#DC2626' : undefined }}>{fmtFecha(o.fecha_vencimiento)}</Box> },
            { titulo: 'Controles', valor: o => o.controles, alinear: 'center' },
            { titulo: 'Políticas', valor: o => o.politicas, alinear: 'center' },
          ]} />
        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? `Editar ${dlg.r.codigo}` : 'Nueva obligación'} campos={campos} registro={dlg.r}
          ancho="md" valoresIniciales={{ pais: 'Colombia' }}
          onGuardar={c => crud.guardar(dlg.r, c)} onCerrar={() => setDlg({ abierto: false, r: null })} />
        <FormularioRegistro abierto={!!evaluar} titulo={`Evaluar · ${evaluar?.nombre ?? ''}`} campos={camposEvaluacion(personas)}
          valoresIniciales={{ estado: 'en_evaluacion', ultima_evaluacion: new Date().toISOString().slice(0, 10),
                              responsable_id: evaluar?.responsable_id, proceso: evaluar?.proceso, area: evaluar?.area }}
          onGuardar={async c => { await grc.cumplimiento.crear({ ...c, obligacion_id: evaluar!.id }); toast.success('Evaluación registrada'); crud.refrescar() }}
          onCerrar={() => setEvaluar(null)} />
        <FichaGRC tipo="obligacion" id={ficha} onCerrar={() => setFicha(null)}
          acciones={o => <Button size="small" variant="contained" startIcon={<FactCheck />} onClick={() => setEvaluar(o)} sx={{ bgcolor: GRC_COLOR }}>Evaluar cumplimiento</Button>}
          resumen={o => [
            ['Marco', o.marco], ['Artículo', o.articulo], ['Tipo', o.tipo], ['Responsable', o.responsable_nombre],
            ['Cumplimiento', <ChipEstado v={o.estado_cumplimiento} />], ['Se evalúa', o.periodicidad],
            ['Vigente desde', fmtFecha(o.fecha_vigencia)], ['Vence', fmtFecha(o.fecha_vencimiento)], ['Proceso', o.proceso],
          ]} />
      </Box>
    </Layout>
  )
}
