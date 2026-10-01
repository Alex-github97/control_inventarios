/**
 * GRC · Auditorías
 *
 * Programa de auditorías con auditor líder y equipo (usuarios con acceso),
 * proceso o área auditada y el marco normativo que sirve de criterio. Los
 * hallazgos se abren desde la ficha de la auditoría y quedan ligados a ella.
 */
import { useState } from 'react'
import { Box, Button } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Search, Add } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import { grc, type Registro } from '@/api/grc'
import { FormularioRegistro, TablaRegistros, useCrud, Cifra, Encabezado, fmtFecha, type Campo } from '@/components/comun/Registro'
import { ESTADOS_AUDITORIA, AUDITORIA_COLOR, CAT } from '@/components/grc/etiquetas'
import { FichaGRC, GRC_COLOR, ChipEstado, usePersonasGRC } from '@/components/grc/comun'
import { useCamposHallazgo } from './GRCHallazgos'

export default function GRCAuditorias() {
  const crud = useCrud(['grc', 'auditorias'], grc.auditorias, 'Auditoría', [], true)
  const hallazgos = useCrud(['grc', 'hallazgos'], grc.hallazgos, 'Hallazgo')
  const personas = usePersonasGRC()
  const camposHallazgo = useCamposHallazgo()
  const [dlg, setDlg] = useState<{ abierto: boolean; r: Registro | null }>({ abierto: false, r: null })
  const [nuevoHallazgo, setNuevoHallazgo] = useState<Registro | null>(null)
  const [ficha, setFicha] = useState<number | null>(null)
  const lista = crud.datos

  const campos: Campo[] = [
    { clave: 'nombre', etiqueta: 'Auditoría', obligatorio: true },
    { clave: 'tipo', etiqueta: 'Tipo', tipo: 'catalogo', catalogo: CAT.tipoAuditoria, obligatorio: true, ancho: 6 },
    { clave: 'estado', etiqueta: 'Estado', tipo: 'seleccion', opciones: ESTADOS_AUDITORIA, obligatorio: true, ancho: 6 },
    { clave: 'auditor_lider_id', etiqueta: 'Auditor líder', tipo: 'persona', personas, obligatorio: true, ancho: 6 },
    { clave: 'equipo', etiqueta: 'Equipo auditor', tipo: 'personas', personas, ancho: 6 },
    { clave: 'proceso', etiqueta: 'Proceso auditado', tipo: 'catalogo', catalogo: CAT.proceso, ancho: 6 },
    { clave: 'area', etiqueta: 'Área auditada', tipo: 'catalogo', catalogo: CAT.area, ancho: 6 },
    { clave: 'marco', etiqueta: 'Criterio (marco normativo)', tipo: 'catalogo', catalogo: CAT.marco, ancho: 12 },
    { clave: 'fecha_inicio', etiqueta: 'Inicio', tipo: 'fecha', ancho: 4 },
    { clave: 'fecha_fin', etiqueta: 'Fin', tipo: 'fecha', ancho: 4,
      validar: (v, t) => v && t.fecha_inicio && v < t.fecha_inicio ? 'No puede ser antes del inicio' : null },
    { clave: 'fecha_reporte', etiqueta: 'Entrega del informe', tipo: 'fecha', ancho: 4 },
    { clave: 'presupuesto', etiqueta: 'Presupuesto', tipo: 'numero', min: 0, ancho: 6 },
    { clave: 'alcance', etiqueta: 'Alcance', tipo: 'area' },
    { clave: 'criterios', etiqueta: 'Criterios adicionales (numerales, procedimientos)', tipo: 'area' },
    { clave: 'observaciones', etiqueta: 'Observaciones', tipo: 'area' },
  ]

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Search sx={{ fontSize: 28 }} />} titulo="Auditorías" subtitulo="GRC · Programa, equipo, criterios y hallazgos"
          color={GRC_COLOR} accion="Programar auditoría" onAccion={() => setDlg({ abierto: true, r: null })} />
        <Grid container spacing={2} mb={3}>
          {ESTADOS_AUDITORIA.map(([k, l]) => (
            <Grid key={k} size={{ xs: 6, md: 2.4 }}><Cifra etiqueta={l} valor={lista.filter(a => a.estado === k).length} color={AUDITORIA_COLOR[k]} /></Grid>
          ))}
        </Grid>
        <TablaRegistros<Registro> filas={lista} cargando={crud.isLoading} vacio="Sin auditorías programadas" etiqueta={a => a.nombre}
          onFila={a => setFicha(a.id)} onEditar={a => setDlg({ abierto: true, r: a })} onRetirar={a => crud.retirar.mutate(a.id)}
          columnas={[
            { titulo: 'Código', valor: a => <Box sx={{ fontFamily: 'monospace' }}>{a.codigo}</Box> },
            { titulo: 'Auditoría', valor: a => a.nombre },
            { titulo: 'Tipo', valor: a => a.tipo ?? '—' },
            { titulo: 'Auditado', valor: a => a.proceso ?? a.area ?? '—' },
            { titulo: 'Líder', valor: a => a.auditor_lider_nombre ?? '—' },
            { titulo: 'Fechas', valor: a => `${fmtFecha(a.fecha_inicio)} – ${fmtFecha(a.fecha_fin)}` },
            { titulo: 'Estado', valor: a => <ChipEstado v={a.estado} /> },
            { titulo: 'Hallazgos', valor: a => `${a.hallazgos_abiertos} abiertos / ${a.hallazgos}`, alinear: 'center' },
          ]} />
        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? `Editar ${dlg.r.codigo}` : 'Programar auditoría'} campos={campos} registro={dlg.r}
          ancho="md" valoresIniciales={{ estado: 'planificada' }}
          onGuardar={c => crud.guardar(dlg.r, c)} onCerrar={() => setDlg({ abierto: false, r: null })} />
        <FormularioRegistro abierto={!!nuevoHallazgo} titulo="Nuevo hallazgo de la auditoría" campos={camposHallazgo} ancho="md"
          valoresIniciales={{ auditoria_id: nuevoHallazgo?.id, estado: 'abierto', proceso: nuevoHallazgo?.proceso, area: nuevoHallazgo?.area }}
          onGuardar={async c => { await hallazgos.guardar(null, c); crud.refrescar() }} onCerrar={() => setNuevoHallazgo(null)} />
        <FichaGRC tipo="auditoria" id={ficha} onCerrar={() => setFicha(null)}
          acciones={a => <Button size="small" variant="contained" startIcon={<Add />} sx={{ bgcolor: GRC_COLOR }} onClick={() => setNuevoHallazgo(a)}>Registrar hallazgo</Button>}
          resumen={a => [
            ['Tipo', a.tipo], ['Estado', <ChipEstado v={a.estado} />], ['Criterio', a.marco],
            ['Líder', a.auditor_lider_nombre], ['Equipo', (a.equipo_nombres ?? []).join(', ') || '—'], ['Auditado', a.proceso ?? a.area],
            ['Inicio', fmtFecha(a.fecha_inicio)], ['Fin', fmtFecha(a.fecha_fin)], ['Informe', fmtFecha(a.fecha_reporte)],
          ]} />
      </Box>
    </Layout>
  )
}
