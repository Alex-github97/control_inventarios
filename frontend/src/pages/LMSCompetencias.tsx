/**
 * LMS · Competencias por cargo
 *
 * Era una maqueta: una matriz por cargo con niveles escritos a mano y la
 * brecha puesta aparte. Ahora el catálogo de competencias y la matriz se
 * guardan en el servidor, y la brecha —requerido menos actual— la calcula él.
 * Las competencias con brecha son las que alimentan las recomendaciones.
 */
import { useState } from 'react'
import { Box, Tabs, Tab, Typography, TextField, MenuItem } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Psychology } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import { lmsApi, type Competencia, type FilaMatriz } from '@/api/lms'
import { FormularioRegistro, TablaRegistros, useCrud, Cifra, Encabezado, Etiqueta, type Campo } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const LMS_COLOR = COLOR_MODULO
const NIVELES: [string, string][] = [['INICIAL', 'Inicial'], ['BASICO', 'Básico'], ['INTERMEDIO', 'Intermedio'], ['AVANZADO', 'Avanzado'], ['EXPERTO', 'Experto']]
const colorBrecha = (b: number) => (b >= 3 ? '#DC2626' : b === 2 ? '#EA580C' : b === 1 ? '#D97706' : '#15803D')

export default function LMSCompetencias() {
  const comps = useCrud(['lms-competencias'], lmsApi.competencias, 'Competencia', [], true)
  const matriz = useCrud(['lms-matriz'], lmsApi.matriz, 'Fila', [['lms-competencias']], true)
  const [tab, setTab] = useState(0)
  const [cargo, setCargo] = useState('')
  const [dlgC, setDlgC] = useState<{ abierto: boolean; r: Competencia | null }>({ abierto: false, r: null })
  const [dlgM, setDlgM] = useState<{ abierto: boolean; r: FilaMatriz | null }>({ abierto: false, r: null })
  const cargos = [...new Set(matriz.datos.map(m => m.cargo))].sort()
  const filas = matriz.datos.filter(m => !cargo || m.cargo === cargo)
  const conBrecha = matriz.datos.filter(m => m.brecha > 0)

  const CAMPOS_C: Campo[] = [{ clave: 'nombre', etiqueta: 'Competencia', obligatorio: true }, { clave: 'categoria', etiqueta: 'Categoría', ancho: 6 }, { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'area' }]
  const CAMPOS_M: Campo[] = [
    { clave: 'cargo', etiqueta: 'Cargo', obligatorio: true, ancho: 6 }, { clave: 'area', etiqueta: 'Área', ancho: 6 },
    { clave: 'competencia_id', etiqueta: 'Competencia', tipo: 'seleccion', opciones: comps.datos.map(c => [c.id, c.nombre] as [number, string]), obligatorio: true },
    { clave: 'nivel_requerido', etiqueta: 'Nivel requerido', tipo: 'seleccion', opciones: NIVELES, obligatorio: true, ancho: 6 },
    { clave: 'nivel_actual', etiqueta: 'Nivel actual', tipo: 'seleccion', opciones: NIVELES, ancho: 6, ayuda: 'El nivel que hoy tiene el cargo' },
  ]

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Psychology sx={{ fontSize: 28 }} />} titulo="Competencias" subtitulo="LMS · Matriz de competencias por cargo y brechas" color={LMS_COLOR}
          accion={tab === 2 ? 'Nueva competencia' : 'Agregar a la matriz'} onAccion={() => (tab === 2 ? setDlgC({ abierto: true, r: null }) : setDlgM({ abierto: true, r: null }))} />
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Competencias" valor={comps.datos.length} color={LMS_COLOR} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Cargos en la matriz" valor={cargos.length} color="#0369A1" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Brechas" valor={conBrecha.length} color="#D97706" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Brechas críticas (≥ 2 niveles)" valor={conBrecha.filter(m => m.brecha >= 2).length} color="#DC2626" /></Grid>
        </Grid>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}><Tab label="Matriz por cargo" /><Tab label={`Brechas (${conBrecha.length})`} /><Tab label="Catálogo" /></Tabs>
        {tab < 2 && (<>
          {tab === 0 && <TextField select size="small" label="Cargo" value={cargo} onChange={e => setCargo(e.target.value)} sx={{ minWidth: 240, mb: 2 }}><MenuItem value="">Todos</MenuItem>{cargos.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}</TextField>}
          <TablaRegistros<FilaMatriz> filas={tab === 1 ? [...conBrecha].sort((a, b) => b.brecha - a.brecha) : filas} cargando={matriz.isLoading} vacio="Sin filas en la matriz" etiqueta={m => `${m.cargo} · ${m.competencia}`}
            onEditar={m => setDlgM({ abierto: true, r: m })} onRetirar={m => matriz.retirar.mutate(m.id)}
            columnas={[
              { titulo: 'Cargo', valor: m => <><b>{m.cargo}</b><Typography fontSize={11} color="text.secondary">{m.area ?? ''}</Typography></> },
              { titulo: 'Competencia', valor: m => m.competencia ?? '—' },
              { titulo: 'Requerido', valor: m => NIVELES.find(n => n[0] === m.nivel_requerido)?.[1] },
              { titulo: 'Actual', valor: m => NIVELES.find(n => n[0] === m.nivel_actual)?.[1] ?? 'Sin evaluar' },
              { titulo: 'Brecha', valor: m => <Etiqueta texto={m.brecha ? `${m.brecha} nivel${m.brecha > 1 ? 'es' : ''}` : 'Cumple'} color={colorBrecha(m.brecha)} /> },
            ]} />
        </>)}
        {tab === 2 && (
          <TablaRegistros<Competencia> filas={comps.datos} cargando={comps.isLoading} vacio="Sin competencias" etiqueta={c => c.nombre}
            onEditar={c => setDlgC({ abierto: true, r: c })} onRetirar={c => comps.retirar.mutate(c.id)}
            columnas={[
              { titulo: 'Código', valor: c => <Box sx={{ fontFamily: 'monospace' }}>{c.codigo}</Box> },
              { titulo: 'Competencia', valor: c => <b>{c.nombre}</b> },
              { titulo: 'Categoría', valor: c => c.categoria ?? '—' },
              { titulo: 'Cargos que la requieren', alinear: 'right', valor: c => new Set(matriz.datos.filter(m => m.competencia_id === c.id).map(m => m.cargo)).size },
            ]} />
        )}
        <FormularioRegistro abierto={dlgC.abierto} titulo={dlgC.r ? dlgC.r.nombre : 'Nueva competencia'} campos={CAMPOS_C} registro={dlgC.r} onGuardar={c => comps.guardar(dlgC.r, c)} onCerrar={() => setDlgC({ abierto: false, r: null })} />
        <FormularioRegistro abierto={dlgM.abierto} titulo={dlgM.r ? 'Editar fila' : 'Agregar a la matriz'} campos={CAMPOS_M} registro={dlgM.r}
          valoresIniciales={{ nivel_requerido: 'INTERMEDIO', ...(cargo ? { cargo } : {}) }} onGuardar={c => matriz.guardar(dlgM.r, c)} onCerrar={() => setDlgM({ abierto: false, r: null })}
          pie={f => { const r = NIVELES.findIndex(n => n[0] === f.nivel_requerido), a = f.nivel_actual ? NIVELES.findIndex(n => n[0] === f.nivel_actual) : 0; if (r < 0) return null; const b = Math.max(0, r - a); return <Typography fontWeight={700} color={colorBrecha(b)}>Brecha: {b ? `${b} nivel(es)` : 'cumple'}</Typography> }} />
      </Box>
    </Layout>
  )
}
