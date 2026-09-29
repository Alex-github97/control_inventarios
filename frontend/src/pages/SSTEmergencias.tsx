/**
 * SST · Preparación y respuesta ante emergencias
 *
 * Era una maqueta: brigada, simulacros y planes escritos a mano, y el
 * «Registrar simulacro» solo ampliaba la lista en memoria.
 *
 *  - La brigada guarda hasta cuándo es válida la certificación de cada uno;
 *    «certificado: sí» seguía diciendo sí años después de vencida.
 *  - Los planes no son una tabla aparte: son los documentos del SG-SST de
 *    tipo PLAN. Tenerlos dos veces obligaría a actualizar el mismo plan en
 *    dos sitios.
 */
import { useState } from 'react'
import { Box, Chip, Table, TableBody, TableCell, TableHead, TableRow, Paper, IconButton, Tooltip, LinearProgress, Tabs, Tab, Typography, alpha } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { LocalFireDepartment, Edit, DeleteForever } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Link as RouterLink } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { sstApi, type Brigadista, type Simulacro } from '@/api/sst'
import { FormularioRegistro, useCrud, Cifra, Encabezado, fmtFecha, type Campo } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const SST_COLOR = COLOR_MODULO
const ROLES: [string, string][] = [['COORDINADOR', 'Coordinador de emergencias'], ['PRIMEROS_AUXILIOS', 'Primeros auxilios'],
  ['EVACUACION', 'Evacuación y rescate'], ['CONTRA_INCENDIOS', 'Control de incendios'], ['COMUNICACIONES', 'Comunicaciones']]
const RESULTADOS: [string, string][] = [['SATISFACTORIO', 'Satisfactorio'], ['ACEPTABLE', 'Aceptable'], ['DEFICIENTE', 'Deficiente']]
const COLOR_RES: Record<string, string> = { SATISFACTORIO: '#15803D', ACEPTABLE: '#D97706', DEFICIENTE: '#DC2626' }
const hoy = () => new Date().toISOString().slice(0, 10)
const fmtTiempo = (s?: number | null) => (s == null ? '—' : `${Math.floor(s / 60)} min ${s % 60} s`)

const CAMPOS_BRIG: Campo[] = [
  { clave: 'nombre', etiqueta: 'Nombre', obligatorio: true, ancho: 6 },
  { clave: 'rol', etiqueta: 'Rol en la brigada', tipo: 'seleccion', opciones: ROLES, obligatorio: true, ancho: 6 },
  { clave: 'cargo', etiqueta: 'Cargo', ancho: 6 },
  { clave: 'area', etiqueta: 'Área', ancho: 6 },
  { clave: 'telefono', etiqueta: 'Teléfono', ancho: 6 },
  { clave: 'certificado_hasta', etiqueta: 'Certificación válida hasta', tipo: 'fecha', ancho: 6 },
]
const CAMPOS_SIM: Campo[] = [
  { clave: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', obligatorio: true, ancho: 6, validar: v => (v && v > hoy() ? 'Aún no ha ocurrido' : null) },
  { clave: 'tipo', etiqueta: 'Escenario', obligatorio: true, ancho: 6, ayuda: 'Evacuación, incendio, sismo, derrame…' },
  { clave: 'participantes', etiqueta: 'Participantes', tipo: 'numero', min: 0, ancho: 4 },
  { clave: 'tiempo_respuesta_seg', etiqueta: 'Tiempo de evacuación (s)', tipo: 'numero', min: 0, ancho: 4 },
  { clave: 'resultado', etiqueta: 'Resultado', tipo: 'seleccion', opciones: RESULTADOS, ancho: 4 },
  { clave: 'observaciones', etiqueta: 'Observaciones', tipo: 'area' },
  { clave: 'acciones_mejora', etiqueta: 'Acciones de mejora', tipo: 'area' },
]

export default function SSTEmergencias() {
  const [tab, setTab] = useState(0)
  const brig = useCrud(['sst-brigada'], sstApi.brigada, 'Brigadista')
  const sims = useCrud(['sst-simulacros'], sstApi.simulacros, 'Simulacro')
  const { data: docs = [] } = useQuery({ queryKey: ['sst-documentos'], queryFn: () => sstApi.documentos.listar() })
  const planes = docs.filter(d => d.tipo === 'PLAN')
  const [dlgB, setDlgB] = useState<{ abierto: boolean; r: Brigadista | null }>({ abierto: false, r: null })
  const [dlgS, setDlgS] = useState<{ abierto: boolean; r: Simulacro | null }>({ abierto: false, r: null })
  const anio = String(new Date().getFullYear())
  const vigentes = brig.datos.filter(b => b.certificado_vigente)

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<LocalFireDepartment sx={{ fontSize: 28 }} />} titulo="Emergencias" subtitulo="SST · Brigada, simulacros y planes de respuesta" color={SST_COLOR}
          accion={tab === 0 ? 'Agregar brigadista' : tab === 1 ? 'Registrar simulacro' : undefined}
          onAccion={() => (tab === 0 ? setDlgB({ abierto: true, r: null }) : setDlgS({ abierto: true, r: null }))} />
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Integrantes de la brigada" valor={brig.datos.length} color={SST_COLOR} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Con certificación vigente" valor={vigentes.length} color="#15803D" sub={brig.datos.length ? `${brig.datos.length - vigentes.length} por renovar` : undefined} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta={`Simulacros ${anio}`} valor={sims.datos.filter(s => s.fecha.startsWith(anio)).length} color="#0369A1" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Planes vigentes" valor={planes.filter(p => p.estado === 'VIGENTE' && !p.revision_vencida).length} color="#D97706" sub={`${planes.length} planes registrados`} /></Grid>
        </Grid>
        <Paper variant="outlined" sx={{ borderRadius: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid #E5E7EB' }}>
            <Tab label="Brigada" /><Tab label="Simulacros" /><Tab label="Planes" />
          </Tabs>
          {(brig.isLoading || sims.isLoading) && <LinearProgress />}
          <Box sx={{ overflow: 'auto' }}>
            {tab === 0 && (
              <Table size="small">
                <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12 } }}>
                  <TableCell>Nombre</TableCell><TableCell>Rol</TableCell><TableCell>Cargo / área</TableCell><TableCell>Teléfono</TableCell><TableCell>Certificación</TableCell><TableCell />
                </TableRow></TableHead>
                <TableBody>
                  {!brig.isLoading && brig.datos.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>Sin integrantes registrados</TableCell></TableRow>}
                  {brig.datos.map(b => (
                    <TableRow key={b.id} hover>
                      <TableCell sx={{ fontSize: 12 }}><b>{b.nombre}</b></TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{ROLES.find(r => r[0] === b.rol)?.[1] ?? b.rol}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{[b.cargo, b.area].filter(Boolean).join(' · ') || '—'}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}>{b.telefono ?? '—'}</TableCell>
                      <TableCell>{b.certificado_hasta
                        ? <Chip size="small" label={`${b.certificado_vigente ? 'Vigente' : 'Vencida'} · ${fmtFecha(b.certificado_hasta)}`} color={b.certificado_vigente ? 'success' : 'error'} variant="outlined" />
                        : <Chip size="small" label="Sin certificar" variant="outlined" />}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="Editar"><IconButton size="small" aria-label={`Editar ${b.nombre}`} onClick={() => setDlgB({ abierto: true, r: b })}><Edit fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Retirar"><IconButton size="small" aria-label={`Retirar ${b.nombre}`} onClick={() => { if (window.confirm(`¿Retirar a ${b.nombre} de la brigada?`)) brig.retirar.mutate(b.id) }}><DeleteForever fontSize="small" sx={{ color: '#DC2626' }} /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {tab === 1 && (
              <Table size="small">
                <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12 } }}>
                  <TableCell>Fecha</TableCell><TableCell>Escenario</TableCell><TableCell align="right">Participantes</TableCell><TableCell align="right">Evacuación</TableCell>
                  <TableCell>Resultado</TableCell><TableCell>Observaciones</TableCell><TableCell />
                </TableRow></TableHead>
                <TableBody>
                  {!sims.isLoading && sims.datos.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 3, color: 'text.secondary' }}>Sin simulacros registrados</TableCell></TableRow>}
                  {sims.datos.map(s => (
                    <TableRow key={s.id} hover>
                      <TableCell sx={{ fontSize: 12 }}>{fmtFecha(s.fecha)}</TableCell>
                      <TableCell sx={{ fontSize: 12 }}><b>{s.tipo}</b></TableCell>
                      <TableCell align="right">{s.participantes ?? '—'}</TableCell>
                      <TableCell align="right" sx={{ fontSize: 12 }}>{fmtTiempo(s.tiempo_respuesta_seg)}</TableCell>
                      <TableCell>{s.resultado ? <Chip size="small" label={RESULTADOS.find(r => r[0] === s.resultado)?.[1]} sx={{ fontSize: 11, fontWeight: 700, bgcolor: alpha(COLOR_RES[s.resultado], 0.12), color: COLOR_RES[s.resultado] }} /> : '—'}</TableCell>
                      <TableCell sx={{ fontSize: 12, maxWidth: 300 }}>{s.observaciones ?? '—'}{s.acciones_mejora && <Typography fontSize={11} color="text.secondary">Mejora: {s.acciones_mejora}</Typography>}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="Editar"><IconButton size="small" aria-label={`Editar simulacro ${s.tipo}`} onClick={() => setDlgS({ abierto: true, r: s })}><Edit fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Retirar"><IconButton size="small" aria-label={`Retirar simulacro ${s.tipo}`} onClick={() => { if (window.confirm('¿Retirar este simulacro?')) sims.retirar.mutate(s.id) }}><DeleteForever fontSize="small" sx={{ color: '#DC2626' }} /></IconButton></Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {tab === 2 && (
              <Box sx={{ p: 2 }}>
                <Typography fontSize={13} color="text.secondary" mb={1.5}>
                  Los planes son los documentos del SG-SST de tipo «Plan». Se crean y actualizan en <RouterLink to="/sst/documentos">Documentos</RouterLink>.
                </Typography>
                <Table size="small">
                  <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12 } }}>
                    <TableCell>Plan</TableCell><TableCell>Versión</TableCell><TableCell>Aprobado</TableCell><TableCell>Próxima revisión</TableCell><TableCell>Estado</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {planes.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 3, color: 'text.secondary' }}>Sin planes registrados</TableCell></TableRow>}
                    {planes.map(p => (
                      <TableRow key={p.id}>
                        <TableCell sx={{ fontSize: 12 }}><b>{p.titulo}</b></TableCell>
                        <TableCell sx={{ fontSize: 12 }}>v{p.version}</TableCell>
                        <TableCell sx={{ fontSize: 12 }}>{fmtFecha(p.fecha_aprobacion)}</TableCell>
                        <TableCell sx={{ fontSize: 12, color: p.revision_vencida ? 'error.main' : undefined }}>{fmtFecha(p.fecha_revision)}</TableCell>
                        <TableCell><Chip size="small" label={p.revision_vencida ? 'Revisión vencida' : p.estado.replace('_', ' ').toLowerCase()} color={p.revision_vencida ? 'error' : p.estado === 'VIGENTE' ? 'success' : 'warning'} variant="outlined" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Box>
        </Paper>
        <FormularioRegistro abierto={dlgB.abierto} titulo={dlgB.r ? `Brigadista · ${dlgB.r.nombre}` : 'Agregar brigadista'} campos={CAMPOS_BRIG} registro={dlgB.r}
          onGuardar={c => brig.guardar(dlgB.r, c)} onCerrar={() => setDlgB({ abierto: false, r: null })} />
        <FormularioRegistro abierto={dlgS.abierto} titulo={dlgS.r ? 'Editar simulacro' : 'Registrar simulacro'} campos={CAMPOS_SIM} registro={dlgS.r}
          valoresIniciales={{ fecha: hoy() }} onGuardar={c => sims.guardar(dlgS.r, c)} onCerrar={() => setDlgS({ abierto: false, r: null })} />
      </Box>
    </Layout>
  )
}
