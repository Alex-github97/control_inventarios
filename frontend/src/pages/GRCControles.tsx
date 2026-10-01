/**
 * GRC · Controles
 *
 * La efectividad de un control no se declara: se prueba. Cada prueba (de
 * diseño o de efectividad) queda registrada con quién la hizo, la muestra y
 * las excepciones; la última define la efectividad y, con la periodicidad de
 * prueba, cuándo toca la siguiente. Un control efectivo reduce el riesgo
 * residual de los riesgos que mitiga.
 */
import { useState } from 'react'
import { Box, Button, Typography } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Shield, Add } from '@mui/icons-material'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { grc, type Registro } from '@/api/grc'
import { FormularioRegistro, TablaRegistros, useCrud, Cifra, Encabezado, fmtFecha, type Campo } from '@/components/comun/Registro'
import { TIPOS_CONTROL, RESULTADOS_PRUEBA, EFECTIVIDAD_COLOR, CAT, etiqueta } from '@/components/grc/etiquetas'
import { FichaGRC, GRC_COLOR, ChipEstado, usePersonasGRC } from '@/components/grc/comun'

export default function GRCControles() {
  const crud = useCrud(['grc', 'controles'], grc.controles, 'Control')
  const personas = usePersonasGRC()
  const [dlg, setDlg] = useState<{ abierto: boolean; r: Registro | null }>({ abierto: false, r: null })
  const [ficha, setFicha] = useState<number | null>(null)
  const [prueba, setPrueba] = useState<Registro | null>(null)
  const [filtro, setFiltro] = useState('')
  const lista = crud.datos
  const visibles = filtro === 'vencida' ? lista.filter(c => c.prueba_vencida) : filtro ? lista.filter(c => c.efectividad === filtro) : lista

  const campos: Campo[] = [
    { clave: 'nombre', etiqueta: 'Control', obligatorio: true, ayuda: 'Qué se hace, quién y cuándo: «El tesorero verifica…»' },
    { clave: 'tipo', etiqueta: 'Naturaleza', tipo: 'seleccion', opciones: TIPOS_CONTROL, obligatorio: true, ancho: 6 },
    { clave: 'responsable_id', etiqueta: 'Responsable de ejecutarlo', tipo: 'persona', personas, obligatorio: true, ancho: 6 },
    { clave: 'proceso', etiqueta: 'Proceso', tipo: 'catalogo', catalogo: CAT.proceso, ancho: 6 },
    { clave: 'area', etiqueta: 'Área', tipo: 'catalogo', catalogo: CAT.area, ancho: 6 },
    { clave: 'frecuencia', etiqueta: 'Frecuencia de operación', tipo: 'catalogo', catalogo: CAT.frecuencia, ancho: 6 },
    { clave: 'periodicidad_prueba', etiqueta: 'Se prueba cada', tipo: 'catalogo', catalogo: CAT.periodicidad, ancho: 6,
      ayuda: 'Define la próxima prueba en la agenda' },
    { clave: 'automatizado', etiqueta: 'Automatizado (lo ejecuta un sistema)', tipo: 'interruptor' },
    { clave: 'descripcion', etiqueta: 'Descripción y evidencia que deja', tipo: 'area' },
  ]
  const camposPrueba: Campo[] = [
    { clave: 'tipo', etiqueta: 'Tipo de prueba', tipo: 'seleccion', opciones: [['diseno', 'Diseño'], ['efectividad', 'Efectividad operativa']], obligatorio: true, ancho: 6 },
    { clave: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', obligatorio: true, ancho: 6 },
    { clave: 'probador_id', etiqueta: 'Quién la hizo', tipo: 'persona', personas, obligatorio: true, ancho: 6 },
    { clave: 'resultado', etiqueta: 'Resultado', tipo: 'seleccion', opciones: RESULTADOS_PRUEBA, obligatorio: true, ancho: 6 },
    { clave: 'muestra', etiqueta: 'Tamaño de la muestra', tipo: 'numero', min: 0, ancho: 6 },
    { clave: 'excepciones', etiqueta: 'Excepciones encontradas', tipo: 'numero', min: 0, ancho: 6 },
    { clave: 'procedimiento', etiqueta: 'Procedimiento aplicado', tipo: 'area' },
    { clave: 'conclusion', etiqueta: 'Conclusión', tipo: 'area' },
  ]
  const n = (f: (c: Registro) => boolean) => lista.filter(f).length

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Shield sx={{ fontSize: 28 }} />} titulo="Controles" subtitulo="GRC · Diseño, pruebas y efectividad del control interno"
          color={GRC_COLOR} accion="Nuevo control" onAccion={() => setDlg({ abierto: true, r: null })} />
        <Grid container spacing={2} mb={3}>
          {([['efectivo', 'Efectivos'], ['parcialmente_efectivo', 'Parcialmente efectivos'], ['inefectivo', 'Inefectivos'], ['no_probado', 'Sin probar']] as const).map(([k, l]) => (
            <Grid key={k} size={{ xs: 6, md: 2.4 }}>
              <Box role="button" aria-pressed={filtro === k} onClick={() => setFiltro(filtro === k ? '' : k)} sx={{ cursor: 'pointer', borderRadius: 2, outline: filtro === k ? `2px solid ${EFECTIVIDAD_COLOR[k]}` : 'none' }}>
                <Cifra etiqueta={l} valor={n(c => c.efectividad === k)} color={EFECTIVIDAD_COLOR[k]} />
              </Box>
            </Grid>
          ))}
          <Grid size={{ xs: 12, md: 2.4 }}>
            <Box role="button" aria-pressed={filtro === 'vencida'} onClick={() => setFiltro(filtro === 'vencida' ? '' : 'vencida')} sx={{ cursor: 'pointer', borderRadius: 2, outline: filtro === 'vencida' ? '2px solid #991B1B' : 'none' }}>
              <Cifra etiqueta="Prueba vencida" valor={n(c => c.prueba_vencida)} color="#991B1B" />
            </Box>
          </Grid>
        </Grid>
        <TablaRegistros<Registro> filas={visibles} cargando={crud.isLoading} vacio="Sin controles registrados" etiqueta={c => c.nombre}
          onFila={c => setFicha(c.id)} onEditar={c => setDlg({ abierto: true, r: c })} onRetirar={c => crud.retirar.mutate(c.id)}
          extra={c => <Button size="small" onClick={() => setPrueba(c)}>Probar</Button>}
          columnas={[
            { titulo: 'Código', valor: c => <Box sx={{ fontFamily: 'monospace' }}>{c.codigo}</Box> },
            { titulo: 'Control', valor: c => c.nombre },
            { titulo: 'Naturaleza', valor: c => (etiqueta(TIPOS_CONTROL, c.tipo) || '').split(' · ')[0] },
            { titulo: 'Responsable', valor: c => c.responsable_nombre ?? '—' },
            { titulo: 'Efectividad', valor: c => <ChipEstado v={c.efectividad} /> },
            { titulo: 'Última prueba', valor: c => fmtFecha(c.ultima_evaluacion) },
            { titulo: 'Próxima', valor: c => <Box sx={{ color: c.prueba_vencida ? '#DC2626' : undefined, fontWeight: c.prueba_vencida ? 700 : 400 }}>{fmtFecha(c.proxima_evaluacion)}</Box> },
            { titulo: 'Riesgos', valor: c => c.riesgos, alinear: 'center' },
            { titulo: 'Obligaciones', valor: c => c.obligaciones, alinear: 'center' },
          ]} />
        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? `Editar ${dlg.r.codigo}` : 'Nuevo control'} campos={campos} registro={dlg.r}
          onGuardar={c => crud.guardar(dlg.r, c)} onCerrar={() => setDlg({ abierto: false, r: null })} />
        <FormularioRegistro abierto={!!prueba} titulo={`Prueba · ${prueba?.codigo ?? ''} ${prueba?.nombre ?? ''}`} campos={camposPrueba}
          valoresIniciales={{ tipo: 'efectividad', fecha: new Date().toISOString().slice(0, 10) }}
          onGuardar={async c => { await grc.pruebas.crear({ ...c, control_id: prueba!.id }); toast.success('Prueba registrada'); crud.refrescar() }}
          onCerrar={() => setPrueba(null)} />
        <FichaGRC tipo="control" id={ficha} onCerrar={() => setFicha(null)}
          acciones={c => <Button size="small" variant="contained" startIcon={<Add />} onClick={() => setPrueba(c)} sx={{ bgcolor: GRC_COLOR }}>Registrar prueba</Button>}
          resumen={c => [
            ['Naturaleza', (etiqueta(TIPOS_CONTROL, c.tipo) || '').split(' · ')[0]], ['Responsable', c.responsable_nombre],
            ['Efectividad', <ChipEstado v={c.efectividad} />], ['Frecuencia', c.frecuencia], ['Se prueba', c.periodicidad_prueba],
            ['Próxima prueba', fmtFecha(c.proxima_evaluacion)], ['Proceso', c.proceso], ['Automatizado', c.automatizado ? 'Sí' : 'No'],
          ]} />
        <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mt: 2 }}>
          La efectividad la fija la última prueba registrada. Un control sin probar no reduce el riesgo residual.
        </Typography>
      </Box>
    </Layout>
  )
}
