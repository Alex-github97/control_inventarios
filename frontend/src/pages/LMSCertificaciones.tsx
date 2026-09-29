/**
 * LMS · Certificaciones
 *
 * Era una maqueta. Ahora hay dos cosas reales: las certificaciones que otorga
 * cada curso (se emiten solas al completarlo) y los certificados emitidos,
 * cuyo estado —vigente, por vencer, vencido— sale de la fecha de vencimiento.
 * El servidor anterior los dejaba «vigentes» para siempre.
 */
import { useState } from 'react'
import { Box, Tabs, Tab, Typography } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { WorkspacePremium } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { lmsApi, type Certificacion, type CertificadoEmitido } from '@/api/lms'
import { FormularioRegistro, TablaRegistros, useCrud, Cifra, Encabezado, Etiqueta, fmtFecha, type Campo } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const LMS_COLOR = COLOR_MODULO
const EST: Record<string, { l: string; c: string }> = { VIGENTE: { l: 'Vigente', c: '#15803D' }, POR_VENCER: { l: 'Por vencer', c: '#D97706' }, VENCIDA: { l: 'Vencido', c: '#DC2626' }, CANCELADA: { l: 'Cancelado', c: '#6B7280' } }

export default function LMSCertificaciones() {
  const crud = useCrud(['lms-certificaciones'], lmsApi.certificaciones, 'Certificación', [], true)
  const { data: emitidos = [], isLoading } = useQuery({ queryKey: ['lms-certificados'], queryFn: lmsApi.certificados })
  const { data: cursos = [] } = useQuery({ queryKey: ['lms-catalogo'], queryFn: lmsApi.catalogo })
  const [dlg, setDlg] = useState<{ abierto: boolean; r: Certificacion | null }>({ abierto: false, r: null })
  const [tab, setTab] = useState(0)
  const [filtro, setFiltro] = useState('')
  const CAMPOS: Campo[] = [
    { clave: 'nombre', etiqueta: 'Certificación', obligatorio: true },
    { clave: 'curso_id', etiqueta: 'Curso que la otorga', tipo: 'seleccion', opciones: cursos.map(c => [c.id, `${c.codigo} · ${c.nombre}`] as [number, string]), ayuda: 'Se emite sola al completar el curso' },
    { clave: 'vigencia_meses', etiqueta: 'Vigencia (meses)', tipo: 'numero', min: 1, obligatorio: true, ancho: 6 },
    { clave: 'entidad_emisora', etiqueta: 'Entidad emisora', ancho: 6 },
    { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'area' },
  ]
  const visibles = filtro ? emitidos.filter(e => e.estado === filtro) : emitidos

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<WorkspacePremium sx={{ fontSize: 28 }} />} titulo="Certificaciones" subtitulo="LMS · Certificaciones y certificados emitidos" color={LMS_COLOR}
          accion={tab === 0 ? 'Nueva certificación' : undefined} onAccion={() => setDlg({ abierto: true, r: null })} />
        <Grid container spacing={2} mb={3}>
          {Object.entries(EST).slice(0, 3).map(([k, v]) => (
            <Grid key={k} size={{ xs: 6, md: 3 }}><Box role="button" aria-label={`Filtrar ${v.l}`} sx={{ cursor: 'pointer' }} onClick={() => { setTab(1); setFiltro(filtro === k ? '' : k) }}><Cifra etiqueta={`Certificados ${v.l.toLowerCase()}s`} valor={emitidos.filter(e => e.estado === k).length} color={v.c} /></Box></Grid>
          ))}
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Certificaciones definidas" valor={crud.datos.length} color={LMS_COLOR} /></Grid>
        </Grid>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}><Tab label="Certificaciones" /><Tab label={`Emitidos${filtro ? ` · ${EST[filtro].l.toLowerCase()}` : ''}`} /></Tabs>
        {tab === 0 && (
          <TablaRegistros<Certificacion> filas={crud.datos} cargando={crud.isLoading} vacio="Sin certificaciones" etiqueta={c => c.nombre}
            onEditar={c => setDlg({ abierto: true, r: c })} onRetirar={c => crud.retirar.mutate(c.id)}
            columnas={[
              { titulo: 'Código', valor: c => <Box sx={{ fontFamily: 'monospace' }}>{c.codigo}</Box> },
              { titulo: 'Certificación', valor: c => <b>{c.nombre}</b> },
              { titulo: 'Curso', valor: c => cursos.find(x => x.id === c.curso_id)?.nombre ?? <Typography fontSize={12} color="text.secondary">Sin curso: no se emite sola</Typography> },
              { titulo: 'Vigencia', valor: c => `${c.vigencia_meses} meses` },
              { titulo: 'Emisor', valor: c => c.entidad_emisora ?? '—' },
              { titulo: 'Emitidos', alinear: 'right', valor: c => emitidos.filter(e => e.certificacion_id === c.id).length },
            ]} />
        )}
        {tab === 1 && (
          <TablaRegistros<CertificadoEmitido> filas={visibles} cargando={isLoading} vacio="Sin certificados emitidos" etiqueta={e => e.numero}
            columnas={[
              { titulo: 'Número', valor: e => <Box sx={{ fontFamily: 'monospace' }}>{e.numero}</Box> },
              { titulo: 'Persona', valor: e => <b>{e.usuario}</b> },
              { titulo: 'Certificación', valor: e => e.certificacion },
              { titulo: 'Emitido', valor: e => fmtFecha(e.emision) },
              { titulo: 'Vence', valor: e => <>{fmtFecha(e.vence)}{e.dias_restantes != null && e.dias_restantes >= 0 && e.estado === 'POR_VENCER' && <Typography fontSize={11} color="warning.main">en {e.dias_restantes} días</Typography>}</> },
              { titulo: 'Estado', valor: e => <Etiqueta texto={EST[e.estado]?.l ?? e.estado} color={EST[e.estado]?.c ?? '#6B7280'} /> },
            ]} />
        )}
        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? dlg.r.nombre : 'Nueva certificación'} campos={CAMPOS} registro={dlg.r}
          valoresIniciales={{ vigencia_meses: '12' }} onGuardar={c => crud.guardar(dlg.r, c)} onCerrar={() => setDlg({ abierto: false, r: null })} />
      </Box>
    </Layout>
  )
}
