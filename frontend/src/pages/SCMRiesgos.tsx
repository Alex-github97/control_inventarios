/**
 * SCM · Riesgos de la cadena de suministro
 *
 * Era una maqueta: riesgos escritos a mano y un «Registrar» que solo ampliaba
 * la lista en memoria. Ahora se guardan, pueden amarrarse a un proveedor, y
 * el nivel sale de impacto × probabilidad en el servidor. Un riesgo en
 * mitigación exige su plan.
 */
import { useState } from 'react'
import { Box, Chip, Table, TableBody, TableCell, TableHead, TableRow, Paper, IconButton, Tooltip, LinearProgress, Typography, alpha } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Warning, Edit, DeleteForever } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { scmApi, getProveedoresSCM, type RiesgoSCM } from '@/api/scm'
import { FormularioRegistro, useCrud, Encabezado, fmtFecha, type Campo } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const SCM_COLOR = COLOR_MODULO
const CATEGORIAS: [string, string][] = [['PROVEEDOR', 'Proveedor'], ['REGULATORIO', 'Regulatorio'], ['OPERATIVO', 'Operativo'],
  ['FINANCIERO', 'Financiero'], ['TECNOLOGICO', 'Tecnológico'], ['LOGISTICO', 'Logístico'], ['OTRO', 'Otro']]
const IMPACTOS: [number, string][] = [[1, '1 · Bajo'], [2, '2 · Medio'], [3, '3 · Alto'], [4, '4 · Crítico']]
const PROBS: [number, string][] = [[1, '1 · Baja'], [2, '2 · Media'], [3, '3 · Alta']]
const ESTADOS: [string, string][] = [['IDENTIFICADO', 'Identificado'], ['EN_MITIGACION', 'En mitigación'], ['MITIGADO', 'Mitigado'], ['MATERIALIZADO', 'Materializado']]
const NIVEL: Record<string, string> = { CRITICO: '#991B1B', ALTO: '#DC2626', MEDIO: '#D97706', BAJO: '#15803D' }

export default function SCMRiesgos() {
  const crud = useCrud(['scm-riesgos'], scmApi.riesgos, 'Riesgo')
  const { data: provs } = useQuery({ queryKey: ['scm-proveedores-selector'], queryFn: () => getProveedoresSCM({ page_size: 200 }) })
  const [dlg, setDlg] = useState<{ abierto: boolean; r: RiesgoSCM | null }>({ abierto: false, r: null })
  const [filtro, setFiltro] = useState('')
  const lista = crud.datos
  const visibles = filtro ? lista.filter(r => r.nivel === filtro) : lista

  const CAMPOS: Campo[] = [
    { clave: 'titulo', etiqueta: 'Riesgo', obligatorio: true },
    { clave: 'categoria', etiqueta: 'Categoría', tipo: 'seleccion', opciones: CATEGORIAS, obligatorio: true, ancho: 6 },
    { clave: 'proveedor_id', etiqueta: 'Proveedor (si aplica)', tipo: 'seleccion', opciones: (provs?.items ?? []).map(p => [p.id, p.razon_social] as [number, string]), ancho: 6 },
    { clave: 'impacto', etiqueta: 'Impacto', tipo: 'seleccion', opciones: IMPACTOS, obligatorio: true, ancho: 4 },
    { clave: 'probabilidad', etiqueta: 'Probabilidad', tipo: 'seleccion', opciones: PROBS, obligatorio: true, ancho: 4 },
    { clave: 'estado', etiqueta: 'Estado', tipo: 'seleccion', opciones: ESTADOS, obligatorio: true, ancho: 4 },
    { clave: 'responsable', etiqueta: 'Responsable', ancho: 6 },
    { clave: 'fecha_revision', etiqueta: 'Próxima revisión', tipo: 'fecha', ancho: 6 },
    { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'area' },
    { clave: 'plan_mitigacion', etiqueta: 'Plan de mitigación', tipo: 'area',
      validar: (v, f) => (f.estado === 'EN_MITIGACION' && !String(v ?? '').trim() ? 'Obligatorio en mitigación' : null) },
  ]

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Warning sx={{ fontSize: 28 }} />} titulo="Riesgos de suministro" subtitulo="SCM · Identificación, valoración y mitigación"
          color={SCM_COLOR} accion="Registrar riesgo" onAccion={() => setDlg({ abierto: true, r: null })} />
        <Grid container spacing={2} mb={3}>
          {Object.entries(NIVEL).map(([k, c]) => {
            const activo = filtro === k
            return (
              <Grid key={k} size={{ xs: 6, md: 3 }}>
                <Paper role="button" aria-label={`Filtrar ${k}`} onClick={() => setFiltro(activo ? '' : k)} elevation={0}
                  sx={{ p: 2, borderRadius: 2, cursor: 'pointer', border: `1px solid ${alpha(c, activo ? 0.8 : 0.25)}`, bgcolor: activo ? alpha(c, 0.08) : 'transparent' }}>
                  <Typography sx={{ fontSize: 24, fontWeight: 800, color: c }}>{lista.filter(r => r.nivel === k && r.estado !== 'MITIGADO').length}</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{k.charAt(0) + k.slice(1).toLowerCase()} · sin mitigar</Typography>
                </Paper>
              </Grid>
            )
          })}
        </Grid>
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
          {crud.isLoading && <LinearProgress />}
          <Table size="small">
            <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12 } }}>
              <TableCell>Riesgo</TableCell><TableCell>Categoría</TableCell><TableCell>Proveedor</TableCell><TableCell align="center">I × P</TableCell>
              <TableCell>Nivel</TableCell><TableCell>Estado</TableCell><TableCell>Revisión</TableCell><TableCell />
            </TableRow></TableHead>
            <TableBody>
              {!crud.isLoading && visibles.length === 0 && <TableRow><TableCell colSpan={8} align="center" sx={{ py: 3, color: 'text.secondary' }}>Sin riesgos registrados</TableCell></TableRow>}
              {visibles.map(r => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ fontSize: 12, maxWidth: 320 }}><b>{r.titulo}</b>{r.plan_mitigacion && <Typography fontSize={11} color="text.secondary">Plan: {r.plan_mitigacion}</Typography>}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{CATEGORIAS.find(c => c[0] === r.categoria)?.[1] ?? r.categoria}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{r.proveedor ?? '—'}</TableCell>
                  <TableCell align="center" sx={{ fontSize: 12 }}>{r.impacto} × {r.probabilidad} = <b>{r.puntaje}</b></TableCell>
                  <TableCell><Chip size="small" label={r.nivel} sx={{ fontSize: 11, fontWeight: 700, bgcolor: alpha(NIVEL[r.nivel], 0.12), color: NIVEL[r.nivel] }} /></TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{ESTADOS.find(e => e[0] === r.estado)?.[1] ?? r.estado}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{fmtFecha(r.fecha_revision)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="Editar"><IconButton size="small" aria-label={`Editar ${r.titulo}`} onClick={() => setDlg({ abierto: true, r })}><Edit fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Retirar"><IconButton size="small" aria-label={`Retirar ${r.titulo}`} onClick={() => { if (window.confirm('¿Retirar este riesgo?')) crud.retirar.mutate(r.id) }}><DeleteForever fontSize="small" sx={{ color: '#DC2626' }} /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? 'Editar riesgo' : 'Registrar riesgo'} campos={CAMPOS} registro={dlg.r}
          valoresIniciales={{ estado: 'IDENTIFICADO', categoria: 'PROVEEDOR', impacto: '2', probabilidad: '2' }}
          onGuardar={c => crud.guardar(dlg.r, c)} onCerrar={() => setDlg({ abierto: false, r: null })} />
      </Box>
    </Layout>
  )
}
