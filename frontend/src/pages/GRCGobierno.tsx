/**
 * GRC · Gobierno corporativo
 *
 * Era una maqueta: comités, una matriz RACI y una lista de responsables
 * escritos a mano. Ahora:
 *  - Los comités se registran contra el servidor (antes no se podían editar).
 *  - «Responsables» ya no es una lista aparte: sale de lo que cada riesgo,
 *    control, obligación y hallazgo dice que tiene a cargo cada persona.
 *  - La matriz RACI se quitó: no había dónde guardarla ni nada que la usara,
 *    y una matriz de responsabilidades inventada es peor que ninguna.
 */
import { useState } from 'react'
import { Box, Tabs, Tab, Typography } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { AccountTree } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { grcApi, type Comite, type Responsable } from '@/api/grc'
import { FormularioRegistro, TablaRegistros, useCrud, Cifra, Encabezado, type Campo } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const GRC_COLOR = COLOR_MODULO
const PERIODOS: [string, string][] = [['mensual', 'Mensual'], ['bimestral', 'Bimestral'], ['trimestral', 'Trimestral'], ['semestral', 'Semestral'], ['anual', 'Anual']]
const CAMPOS: Campo[] = [
  { clave: 'nombre', etiqueta: 'Comité', obligatorio: true },
  { clave: 'tipo', etiqueta: 'Tipo', ancho: 6, ayuda: 'Junta, auditoría, riesgos, ética…' },
  { clave: 'periodicidad', etiqueta: 'Periodicidad', tipo: 'seleccion', opciones: PERIODOS, ancho: 6 },
  { clave: 'presidente', etiqueta: 'Presidente', ancho: 6 },
  { clave: 'secretario', etiqueta: 'Secretario', ancho: 6 },
  { clave: 'descripcion', etiqueta: 'Funciones', tipo: 'area' },
]

export default function GRCGobierno() {
  const crud = useCrud(['grc-comites'], grcApi.comites, 'Comité')
  const { data: resp = [], isLoading: cargandoResp } = useQuery({ queryKey: ['grc-responsables'], queryFn: grcApi.responsables })
  const [dlg, setDlg] = useState<{ abierto: boolean; r: Comite | null }>({ abierto: false, r: null })
  const [tab, setTab] = useState(0)
  const filasResp = resp.map((r, i) => ({ ...r, id: i + 1 }))

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<AccountTree sx={{ fontSize: 28 }} />} titulo="Gobierno corporativo" subtitulo="GRC · Comités y responsables" color={GRC_COLOR}
          accion={tab === 0 ? 'Nuevo comité' : undefined} onAccion={() => setDlg({ abierto: true, r: null })} />
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Comités" valor={crud.datos.length} color={GRC_COLOR} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Responsables con asignaciones" valor={resp.length} color="#0369A1" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Con hallazgos abiertos" valor={resp.filter(r => r.hallazgos_abiertos > 0).length} color="#DC2626" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Riesgos sin cerrar asignados" valor={resp.reduce((s, r) => s + r.riesgos, 0)} color="#D97706" /></Grid>
        </Grid>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}><Tab label="Comités" /><Tab label="Responsables" /></Tabs>
        {tab === 0 && (
          <TablaRegistros<Comite> filas={crud.datos} cargando={crud.isLoading} vacio="Sin comités registrados" etiqueta={c => c.nombre}
            onEditar={c => setDlg({ abierto: true, r: c })} onRetirar={c => crud.retirar.mutate(c.id)}
            columnas={[
              { titulo: 'Comité', valor: c => <><b>{c.nombre}</b><Typography fontSize={11} color="text.secondary">{c.tipo ?? ''}</Typography></> },
              { titulo: 'Presidente', valor: c => c.presidente ?? '—' },
              { titulo: 'Secretario', valor: c => c.secretario ?? '—' },
              { titulo: 'Periodicidad', valor: c => PERIODOS.find(p => p[0] === c.periodicidad)?.[1] ?? c.periodicidad ?? '—' },
              { titulo: 'Funciones', valor: c => c.descripcion ?? '—' },
            ]} />
        )}
        {tab === 1 && (
          <>
            <Typography fontSize={12} color="text.secondary" mb={1}>Sale del campo «responsable» de cada riesgo sin cerrar, control, obligación y hallazgo abierto. Para cambiar una asignación, edita el elemento.</Typography>
            <TablaRegistros<Responsable & { id: number }> filas={filasResp} cargando={cargandoResp} vacio="Nadie tiene asignaciones todavía" etiqueta={r => r.responsable}
              columnas={[
                { titulo: 'Responsable', valor: r => <b>{r.responsable}</b> },
                { titulo: 'Riesgos', alinear: 'right', valor: r => r.riesgos },
                { titulo: 'Controles', alinear: 'right', valor: r => r.controles },
                { titulo: 'Obligaciones', alinear: 'right', valor: r => r.obligaciones },
                { titulo: 'Hallazgos abiertos', alinear: 'right', valor: r => <Box sx={{ color: r.hallazgos_abiertos ? 'error.main' : undefined, fontWeight: r.hallazgos_abiertos ? 700 : 400 }}>{r.hallazgos_abiertos}</Box> },
              ]} />
          </>
        )}
        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? dlg.r.nombre : 'Nuevo comité'} campos={CAMPOS} registro={dlg.r}
          valoresIniciales={{ periodicidad: 'trimestral' }} onGuardar={c => crud.guardar(dlg.r, c)} onCerrar={() => setDlg({ abierto: false, r: null })} />
      </Box>
    </Layout>
  )
}
