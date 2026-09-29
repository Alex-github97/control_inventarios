/**
 * LMS · Universidad corporativa
 *
 * Era una maqueta: facultades, escuelas y programas escritos a mano. Ahora se
 * administran contra el servidor, que antes permitía crearlos pero no
 * corregirlos ni retirarlos. Se suman los instructores, que la maqueta no tenía
 * dónde administrar y que el catálogo de cursos necesita.
 */
import { useState } from 'react'
import { Box, Tabs, Tab, Typography } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { AccountBalance } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import { lmsApi, type Facultad, type Escuela, type Programa, type Instructor } from '@/api/lms'
import { FormularioRegistro, TablaRegistros, useCrud, Cifra, Encabezado, type Campo } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const LMS_COLOR = COLOR_MODULO
const TIPOS_PROG: [string, string][] = [['DIPLOMADO', 'Diplomado'], ['CERTIFICACION', 'Certificación'], ['RUTA_APRENDIZAJE', 'Ruta de aprendizaje'], ['CARRERA_INTERNA', 'Carrera interna'], ['INDUCCION', 'Inducción']]
const TIPOS_INSTR: [string, string][] = [['INTERNO', 'Interno'], ['EXTERNO', 'Externo'], ['EXPERTO', 'Experto']]

export default function LMSUniversidad() {
  const fac = useCrud(['lms-facultades'], lmsApi.facultades, 'Facultad', [], true)
  const esc = useCrud(['lms-escuelas'], lmsApi.escuelas, 'Escuela', [['lms-facultades']], true)
  const prog = useCrud(['lms-programas'], lmsApi.programas, 'Programa', [['lms-escuelas']])
  const ins = useCrud(['lms-instructores'], lmsApi.instructores, 'Instructor')
  const [tab, setTab] = useState(0)
  const [dlg, setDlg] = useState<{ abierto: boolean; r: any }>({ abierto: false, r: null })
  const conf = [
    { nombre: 'facultad', crud: fac, campos: [{ clave: 'nombre', etiqueta: 'Facultad', obligatorio: true }, { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'area' }] as Campo[] },
    { nombre: 'escuela', crud: esc, campos: [{ clave: 'nombre', etiqueta: 'Escuela', obligatorio: true }, { clave: 'facultad_id', etiqueta: 'Facultad', tipo: 'seleccion', obligatorio: true, opciones: fac.datos.map(f => [f.id, f.nombre] as [number, string]) }, { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'area' }] as Campo[] },
    { nombre: 'programa', crud: prog, campos: [{ clave: 'nombre', etiqueta: 'Programa', obligatorio: true }, { clave: 'escuela_id', etiqueta: 'Escuela', tipo: 'seleccion', obligatorio: true, ancho: 6, opciones: esc.datos.map(e => [e.id, e.nombre] as [number, string]) }, { clave: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', opciones: TIPOS_PROG, obligatorio: true, ancho: 6 }, { clave: 'duracion_horas', etiqueta: 'Horas', tipo: 'numero', min: 0, ancho: 6 }, { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'area' }] as Campo[] },
    { nombre: 'instructor', crud: ins, campos: [{ clave: 'nombre', etiqueta: 'Instructor', obligatorio: true }, { clave: 'email', etiqueta: 'Correo', ancho: 6, validar: (v: any) => (v && !/^\S+@\S+\.\S+$/.test(v) ? 'Correo no válido' : null) }, { clave: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', opciones: TIPOS_INSTR, obligatorio: true, ancho: 6 }, { clave: 'especialidad', etiqueta: 'Especialidad' }] as Campo[] },
  ][tab]

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<AccountBalance sx={{ fontSize: 28 }} />} titulo="Universidad corporativa" subtitulo="LMS · Facultades, escuelas, programas e instructores" color={LMS_COLOR}
          accion={`${['programa', 'instructor'].includes(conf.nombre) ? 'Nuevo' : 'Nueva'} ${conf.nombre}`} onAccion={() => setDlg({ abierto: true, r: null })} />
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Facultades" valor={fac.datos.length} color={LMS_COLOR} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Escuelas" valor={esc.datos.length} color="#0369A1" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Programas" valor={prog.datos.length} color="#7C3AED" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Instructores" valor={ins.datos.length} color="#D97706" /></Grid>
        </Grid>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}><Tab label="Facultades" /><Tab label="Escuelas" /><Tab label="Programas" /><Tab label="Instructores" /></Tabs>
        {tab === 0 && <TablaRegistros<Facultad & { total_escuelas?: number }> filas={fac.datos} cargando={fac.isLoading} vacio="Sin facultades" etiqueta={f => f.nombre}
          onEditar={r => setDlg({ abierto: true, r })} onRetirar={r => fac.retirar.mutate(r.id)}
          columnas={[{ titulo: 'Facultad', valor: f => <b>{f.nombre}</b> }, { titulo: 'Descripción', valor: f => f.descripcion ?? '—' }, { titulo: 'Escuelas', alinear: 'right', valor: f => f.total_escuelas ?? 0 }]} />}
        {tab === 1 && <TablaRegistros<Escuela & { facultad_nombre?: string; total_programas?: number }> filas={esc.datos} cargando={esc.isLoading} vacio="Sin escuelas" etiqueta={e => e.nombre}
          onEditar={r => setDlg({ abierto: true, r })} onRetirar={r => esc.retirar.mutate(r.id)}
          columnas={[{ titulo: 'Escuela', valor: e => <b>{e.nombre}</b> }, { titulo: 'Facultad', valor: e => e.facultad_nombre ?? '—' }, { titulo: 'Programas', alinear: 'right', valor: e => e.total_programas ?? 0 }]} />}
        {tab === 2 && <TablaRegistros<Programa & { escuela_nombre?: string; total_cursos?: number }> filas={prog.datos} cargando={prog.isLoading} vacio="Sin programas" etiqueta={p => p.nombre}
          onEditar={r => setDlg({ abierto: true, r })} onRetirar={r => prog.retirar.mutate(r.id)}
          columnas={[{ titulo: 'Código', valor: p => <Box sx={{ fontFamily: 'monospace' }}>{p.codigo}</Box> }, { titulo: 'Programa', valor: p => <b>{p.nombre}</b> }, { titulo: 'Tipo', valor: p => TIPOS_PROG.find(t => t[0] === p.tipo)?.[1] ?? p.tipo }, { titulo: 'Escuela', valor: p => p.escuela_nombre ?? '—' }, { titulo: 'Horas', alinear: 'right', valor: p => p.duracion_horas }]} />}
        {tab === 3 && <TablaRegistros<Instructor & { total_cursos?: number }> filas={ins.datos} cargando={ins.isLoading} vacio="Sin instructores" etiqueta={i => i.nombre}
          onEditar={r => setDlg({ abierto: true, r })} onRetirar={r => ins.retirar.mutate(r.id)}
          columnas={[{ titulo: 'Instructor', valor: i => <><b>{i.nombre}</b><Typography fontSize={11} color="text.secondary">{i.email ?? ''}</Typography></> }, { titulo: 'Tipo', valor: i => TIPOS_INSTR.find(t => t[0] === i.tipo)?.[1] ?? i.tipo }, { titulo: 'Especialidad', valor: i => i.especialidad ?? '—' }, { titulo: 'Cursos', alinear: 'right', valor: i => i.total_cursos ?? 0 }]} />}
        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? `Editar ${conf.nombre}` : `${['programa', 'instructor'].includes(conf.nombre) ? 'Nuevo' : 'Nueva'} ${conf.nombre}`} campos={conf.campos} registro={dlg.r}
          valoresIniciales={{ tipo: tab === 2 ? 'DIPLOMADO' : 'INTERNO', duracion_horas: '0' }}
          onGuardar={c => (conf.crud as any).guardar(dlg.r, c)} onCerrar={() => setDlg({ abierto: false, r: null })} />
      </Box>
    </Layout>
  )
}
