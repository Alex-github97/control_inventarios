/**
 * GRC · Gobierno
 *
 * Comités con su tipo, periodicidad, presidente, secretario y miembros
 * (usuarios con acceso al módulo); sus sesiones con asistentes, quórum,
 * decisiones y los riesgos revisados; y qué tiene a cargo cada responsable.
 */
import { useState } from 'react'
import { Box, Tabs, Tab, Button } from '@mui/material'
import { AccountBalance, EventNote } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { grc, type Registro } from '@/api/grc'
import { FormularioRegistro, TablaRegistros, useCrud, Encabezado, fmtFecha, type Campo } from '@/components/comun/Registro'
import { CAT } from '@/components/grc/etiquetas'
import { FichaGRC, GRC_COLOR, usePersonasGRC, useReferencias } from '@/components/grc/comun'

export default function GRCGobierno() {
  const comites = useCrud(['grc', 'comites'], grc.comites, 'Comité')
  const sesiones = useCrud(['grc', 'sesiones'], grc.sesiones, 'Sesión', [], true)
  const responsables = useQuery({ queryKey: ['grc', 'responsables'], queryFn: grc.responsables })
  const personas = usePersonasGRC()
  const refComites = useReferencias('comite')
  const riesgos = useReferencias('riesgo')
  const [tab, setTab] = useState(0)
  const [dlg, setDlg] = useState<{ abierto: boolean; r: Registro | null }>({ abierto: false, r: null })
  const [sesion, setSesion] = useState<{ abierto: boolean; r: Registro | null; comite?: Registro }>({ abierto: false, r: null })
  const [ficha, setFicha] = useState<number | null>(null)

  const campos: Campo[] = [
    { clave: 'nombre', etiqueta: 'Nombre del comité', obligatorio: true },
    { clave: 'tipo', etiqueta: 'Tipo', tipo: 'catalogo', catalogo: CAT.tipoComite, obligatorio: true, ancho: 6 },
    { clave: 'periodicidad', etiqueta: 'Se reúne', tipo: 'catalogo', catalogo: CAT.periodicidad, obligatorio: true, ancho: 6 },
    { clave: 'presidente_id', etiqueta: 'Presidente', tipo: 'persona', personas, obligatorio: true, ancho: 6 },
    { clave: 'secretario_id', etiqueta: 'Secretario', tipo: 'persona', personas, ancho: 6 },
    { clave: 'miembros', etiqueta: 'Miembros', tipo: 'personas', personas },
    { clave: 'quorum_minimo', etiqueta: 'Quórum mínimo (asistentes)', tipo: 'numero', min: 1, ancho: 6 },
    { clave: 'descripcion', etiqueta: 'Objeto y funciones', tipo: 'area' },
  ]
  const camposSesion: Campo[] = [
    { clave: 'comite_id', etiqueta: 'Comité', tipo: 'referencia', opciones: refComites, obligatorio: true, ancho: 8 },
    { clave: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', obligatorio: true, ancho: 4 },
    { clave: 'asistentes', etiqueta: 'Asistentes', tipo: 'personas', personas },
    { clave: 'temas', etiqueta: 'Orden del día', tipo: 'area' },
    { clave: 'decisiones', etiqueta: 'Decisiones y compromisos', tipo: 'area' },
    { clave: 'riesgos', etiqueta: 'Riesgos revisados', tipo: 'referencias', opciones: riesgos },
    { clave: 'proxima', etiqueta: 'Próxima sesión', tipo: 'fecha', ancho: 6 },
    { clave: 'acta_url', etiqueta: 'Enlace al acta firmada', ancho: 6 },
  ]

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<AccountBalance sx={{ fontSize: 28 }} />} titulo="Gobierno" subtitulo="GRC · Comités, sesiones y responsables"
          color={GRC_COLOR} accion={tab === 1 ? 'Registrar sesión' : 'Nuevo comité'}
          onAccion={() => tab === 1 ? setSesion({ abierto: true, r: null }) : setDlg({ abierto: true, r: null })} />
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}><Tab label="Comités" /><Tab label="Sesiones" /><Tab label="Responsables" /></Tabs>
        {tab === 0 && (
          <TablaRegistros<Registro> filas={comites.datos} cargando={comites.isLoading} vacio="Sin comités" etiqueta={c => c.nombre}
            onFila={c => setFicha(c.id)} onEditar={c => setDlg({ abierto: true, r: c })} onRetirar={c => comites.retirar.mutate(c.id)}
            extra={c => <Button size="small" startIcon={<EventNote />} onClick={() => setSesion({ abierto: true, r: null, comite: c })}>Sesión</Button>}
            columnas={[
              { titulo: 'Comité', valor: c => c.nombre },
              { titulo: 'Tipo', valor: c => c.tipo ?? '—' },
              { titulo: 'Periodicidad', valor: c => c.periodicidad ?? '—' },
              { titulo: 'Presidente', valor: c => c.presidente_nombre ?? '—' },
              { titulo: 'Miembros', valor: c => c.miembros?.length ?? 0, alinear: 'center' },
              { titulo: 'Riesgos', valor: c => c.riesgos, alinear: 'center' },
              { titulo: 'Última sesión', valor: c => fmtFecha(c.ultima_sesion) },
              { titulo: 'Próxima', valor: c => fmtFecha(c.proxima_sesion) },
            ]} />
        )}
        {tab === 1 && (
          <TablaRegistros<Registro> filas={sesiones.datos} cargando={sesiones.isLoading} vacio="Sin sesiones registradas" etiqueta={s => `sesión del ${s.fecha}`}
            onEditar={s => setSesion({ abierto: true, r: s })} onRetirar={s => sesiones.retirar.mutate(s.id)}
            columnas={[
              { titulo: 'Fecha', valor: s => fmtFecha(s.fecha) },
              { titulo: 'Comité', valor: s => s.comite_nombre },
              { titulo: 'Asistentes', valor: s => (s.asistentes_nombres ?? []).join(', ') || '—' },
              { titulo: 'Quórum', valor: s => s.quorum_ok == null ? '—' : s.quorum_ok ? 'Sí' : 'No', alinear: 'center' },
              { titulo: 'Riesgos revisados', valor: s => s.riesgos?.length ?? 0, alinear: 'center' },
              { titulo: 'Próxima', valor: s => fmtFecha(s.proxima) },
            ]} />
        )}
        {tab === 2 && (
          <TablaRegistros<Registro> filas={(responsables.data ?? []).map((r: any) => ({ ...r, id: r.usuario_id }))} cargando={responsables.isLoading}
            vacio="Nadie tiene acceso al módulo GRC todavía" etiqueta={r => r.nombre}
            columnas={[
              { titulo: 'Persona', valor: r => r.nombre },
              { titulo: 'Cargo', valor: r => r.cargo ?? '—' },
              { titulo: 'Riesgos abiertos', valor: r => r.riesgos, alinear: 'center' },
              { titulo: 'Controles', valor: r => r.controles, alinear: 'center' },
              { titulo: 'Obligaciones', valor: r => r.obligaciones, alinear: 'center' },
              { titulo: 'Hallazgos abiertos', valor: r => r.hallazgos_abiertos, alinear: 'center' },
              { titulo: 'Planes pendientes', valor: r => r.planes_pendientes, alinear: 'center' },
            ]} />
        )}
        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? `Editar ${dlg.r.nombre}` : 'Nuevo comité'} campos={campos} registro={dlg.r}
          onGuardar={c => comites.guardar(dlg.r, c)} onCerrar={() => setDlg({ abierto: false, r: null })} />
        <FormularioRegistro abierto={sesion.abierto} titulo={sesion.r ? 'Editar sesión' : 'Registrar sesión'} campos={camposSesion} registro={sesion.r}
          valoresIniciales={{ fecha: new Date().toISOString().slice(0, 10), comite_id: sesion.comite?.id, asistentes: sesion.comite?.miembros ?? [] }}
          onGuardar={async c => { await sesiones.guardar(sesion.r, c); comites.refrescar() }}
          onCerrar={() => setSesion({ abierto: false, r: null })} />
        <FichaGRC tipo="comite" id={ficha} onCerrar={() => setFicha(null)}
          acciones={c => <Button size="small" variant="contained" startIcon={<EventNote />} sx={{ bgcolor: GRC_COLOR }}
            onClick={() => { const cc = comites.datos.find(x => x.id === c.id); setSesion({ abierto: true, r: null, comite: cc }) }}>Registrar sesión</Button>}
          resumen={c => [
            ['Tipo', c.tipo], ['Periodicidad', c.periodicidad], ['Quórum', c.quorum_minimo],
            ['Presidente', c.presidente_nombre], ['Secretario', c.secretario_nombre],
          ]}>
          {c => {
            const cc = comites.datos.find(x => x.id === c.id)
            return cc?.miembros_nombres?.length ? <Box sx={{ mb: 2, fontSize: 13 }}><b>Miembros:</b> {cc.miembros_nombres.join(', ')}</Box> : null
          }}
        </FichaGRC>
      </Box>
    </Layout>
  )
}
