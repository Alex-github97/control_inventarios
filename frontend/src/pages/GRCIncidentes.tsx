/**
 * GRC · Incidentes
 *
 * Un incidente es un riesgo que se materializó: se liga al riesgo y al control
 * que falló, registra la pérdida, y no se cierra sin causa raíz. Desde la ficha
 * se abre el hallazgo que lleva a los planes de acción.
 */
import { useState } from 'react'
import { Box, Button } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Warning, PlaylistAdd } from '@mui/icons-material'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { grc, type Registro } from '@/api/grc'
import { FormularioRegistro, TablaRegistros, useCrud, Cifra, Encabezado, fmtFecha, errorApi, type Campo } from '@/components/comun/Registro'
import { ESTADOS_INCIDENTE, SEVERIDADES, INCIDENTE_COLOR, CAT, etiqueta } from '@/components/grc/etiquetas'
import { FichaGRC, GRC_COLOR, ChipEstado, usePersonasGRC, useReferencias } from '@/components/grc/comun'

const pesos = (v?: number | null) => v == null ? '—' : v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

export default function GRCIncidentes() {
  const crud = useCrud(['grc', 'incidentes'], grc.incidentes, 'Incidente')
  const personas = usePersonasGRC()
  const riesgos = useReferencias('riesgo')
  const controles = useReferencias('control')
  const [dlg, setDlg] = useState<{ abierto: boolean; r: Registro | null }>({ abierto: false, r: null })
  const [ficha, setFicha] = useState<number | null>(null)
  const [filtro, setFiltro] = useState('')
  const lista = crud.datos
  const visibles = filtro ? lista.filter(i => i.estado === filtro) : lista

  const campos: Campo[] = [
    { clave: 'titulo', etiqueta: 'Qué pasó', obligatorio: true },
    { clave: 'tipo', etiqueta: 'Tipo', tipo: 'catalogo', catalogo: CAT.tipoIncidente, obligatorio: true, ancho: 6 },
    { clave: 'fecha_ocurrencia', etiqueta: 'Fecha de ocurrencia', tipo: 'fecha', obligatorio: true, ancho: 6 },
    { clave: 'severidad', etiqueta: 'Severidad', tipo: 'seleccion', opciones: SEVERIDADES, obligatorio: true, ancho: 4 },
    { clave: 'urgencia', etiqueta: 'Urgencia', tipo: 'seleccion', opciones: SEVERIDADES, ancho: 4 },
    { clave: 'estado', etiqueta: 'Estado', tipo: 'seleccion', opciones: ESTADOS_INCIDENTE, obligatorio: true, ancho: 4 },
    { clave: 's1', etiqueta: 'Relación con riesgos y controles', tipo: 'seccion' },
    { clave: 'riesgo_id', etiqueta: 'Riesgo que se materializó', tipo: 'referencia', opciones: riesgos, ancho: 6 },
    { clave: 'control_id', etiqueta: 'Control que falló', tipo: 'referencia', opciones: controles, ancho: 6 },
    { clave: 'proceso', etiqueta: 'Proceso', tipo: 'catalogo', catalogo: CAT.proceso, ancho: 6 },
    { clave: 'area', etiqueta: 'Área', tipo: 'catalogo', catalogo: CAT.area, ancho: 6 },
    { clave: 's2', etiqueta: 'Personas e impacto', tipo: 'seccion' },
    { clave: 'reportado_por_id', etiqueta: 'Reportó', tipo: 'persona', personas, ancho: 6, ayuda: 'Vacío: quien lo registra' },
    { clave: 'responsable_id', etiqueta: 'Responsable de atenderlo', tipo: 'persona', personas, ancho: 6 },
    { clave: 'perdida_estimada', etiqueta: 'Pérdida estimada (COP)', tipo: 'numero', min: 0, ancho: 6 },
    { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'area' },
    { clave: 'impacto', etiqueta: 'Impacto', tipo: 'area' },
    { clave: 'causa_raiz', etiqueta: 'Causa raíz', tipo: 'area',
      validar: (v, t) => t.estado === 'cerrado' && !String(v ?? '').trim() ? 'Para cerrar, registre la causa raíz' : null },
    { clave: 'acciones_tomadas', etiqueta: 'Acciones tomadas', tipo: 'area', ancho: 6 },
    { clave: 'lecciones_aprendidas', etiqueta: 'Lecciones aprendidas', tipo: 'area', ancho: 6 },
  ]

  const generar = async (i: Registro, refrescar: () => void) => {
    try { const h = await grc.hallazgoDeIncidente(i.id); toast.success(`Hallazgo ${h.codigo} abierto`); refrescar() }
    catch (e) { toast.error(errorApi(e)) }
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Warning sx={{ fontSize: 28 }} />} titulo="Incidentes" subtitulo="GRC · Riesgos materializados, pérdidas y lecciones"
          color={GRC_COLOR} accion="Reportar incidente" onAccion={() => setDlg({ abierto: true, r: null })} />
        <Grid container spacing={2} mb={3}>
          {ESTADOS_INCIDENTE.map(([k, l]) => (
            <Grid key={k} size={{ xs: 6, md: 2.4 }}>
              <Box role="button" aria-pressed={filtro === k} onClick={() => setFiltro(filtro === k ? '' : k)} sx={{ cursor: 'pointer', borderRadius: 2, outline: filtro === k ? `2px solid ${INCIDENTE_COLOR[k]}` : 'none' }}>
                <Cifra etiqueta={l} valor={lista.filter(i => i.estado === k).length} color={INCIDENTE_COLOR[k]} />
              </Box>
            </Grid>
          ))}
          <Grid size={{ xs: 12, md: 2.4 }}>
            <Cifra etiqueta="Pérdida registrada" valor={pesos(lista.reduce((s, i) => s + (i.perdida_estimada ?? 0), 0))} color="#991B1B" />
          </Grid>
        </Grid>
        <TablaRegistros<Registro> filas={visibles} cargando={crud.isLoading} vacio="Sin incidentes" etiqueta={i => i.titulo}
          onFila={i => setFicha(i.id)} onEditar={i => setDlg({ abierto: true, r: { ...i, fecha_ocurrencia: i.fecha_ocurrencia?.slice(0, 10) } })}
          onRetirar={i => crud.retirar.mutate(i.id)}
          columnas={[
            { titulo: 'Código', valor: i => <Box sx={{ fontFamily: 'monospace' }}>{i.codigo}</Box> },
            { titulo: 'Incidente', valor: i => i.titulo },
            { titulo: 'Tipo', valor: i => i.tipo ?? '—' },
            { titulo: 'Ocurrió', valor: i => fmtFecha(i.fecha_ocurrencia) },
            { titulo: 'Severidad', valor: i => <ChipEstado v={i.severidad} /> },
            { titulo: 'Riesgo', valor: i => i.riesgo_codigo ?? '—' },
            { titulo: 'Pérdida', valor: i => pesos(i.perdida_estimada), alinear: 'right' },
            { titulo: 'Estado', valor: i => <ChipEstado v={i.estado} /> },
          ]} />
        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? `Editar ${dlg.r.codigo}` : 'Reportar incidente'} campos={campos} registro={dlg.r}
          ancho="md" valoresIniciales={{ estado: 'abierto', fecha_ocurrencia: new Date().toISOString().slice(0, 10) }}
          onGuardar={c => crud.guardar(dlg.r, c)} onCerrar={() => setDlg({ abierto: false, r: null })} />
        <FichaGRC tipo="incidente" id={ficha} onCerrar={() => setFicha(null)}
          acciones={(i, refrescar) => <Button size="small" variant="contained" startIcon={<PlaylistAdd />} sx={{ bgcolor: GRC_COLOR }}
            onClick={() => generar(i, refrescar)}>Abrir hallazgo</Button>}
          resumen={i => [
            ['Tipo', i.tipo], ['Severidad', <ChipEstado v={i.severidad} />], ['Urgencia', etiqueta(SEVERIDADES, i.urgencia)],
            ['Estado', <ChipEstado v={i.estado} />], ['Ocurrió', fmtFecha(i.fecha_ocurrencia)], ['Cerrado', fmtFecha(i.fecha_cierre)],
            ['Reportó', i.reportado_por_nombre], ['Responsable', i.responsable_nombre], ['Pérdida', pesos(i.perdida_estimada)],
          ]} />
      </Box>
    </Layout>
  )
}
