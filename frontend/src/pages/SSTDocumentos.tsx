/**
 * SST · Documentos del sistema de gestión
 *
 * Era una maqueta: políticas y procedimientos escritos a mano. Ahora se
 * registran con su versión, responsable y fecha de revisión; si la revisión
 * ya pasó lo marca el servidor, para que el documento vencido se note.
 */
import { useState } from 'react'
import { Box, Chip, Table, TableBody, TableCell, TableHead, TableRow, Paper, IconButton, Tooltip, LinearProgress, MenuItem, TextField, Button, alpha } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Description, Edit, DeleteForever } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import { sstApi, type DocumentoSST } from '@/api/sst'
import { FormularioRegistro, useCrud, Cifra, Encabezado, fmtFecha, type Campo } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const SST_COLOR = COLOR_MODULO
const TIPOS: [string, string][] = [['POLITICA', 'Política'], ['PROCEDIMIENTO', 'Procedimiento'], ['INSTRUCTIVO', 'Instructivo'],
  ['FORMATO', 'Formato'], ['REGISTRO', 'Registro'], ['PROGRAMA', 'Programa'], ['PLAN', 'Plan']]
const ESTADOS: [string, string][] = [['VIGENTE', 'Vigente'], ['EN_REVISION', 'En revisión'], ['OBSOLETO', 'Obsoleto']]
const COLOR_EST: Record<string, string> = { VIGENTE: '#15803D', EN_REVISION: '#D97706', OBSOLETO: '#6B7280' }

const CAMPOS: Campo[] = [
  { clave: 'titulo', etiqueta: 'Título', obligatorio: true },
  { clave: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', opciones: TIPOS, obligatorio: true, ancho: 6 },
  { clave: 'estado', etiqueta: 'Estado', tipo: 'seleccion', opciones: ESTADOS, obligatorio: true, ancho: 6 },
  { clave: 'version', etiqueta: 'Versión', obligatorio: true, ancho: 4 },
  { clave: 'area_responsable', etiqueta: 'Área responsable', ancho: 8 },
  { clave: 'responsable', etiqueta: 'Responsable', ancho: 6 },
  { clave: 'fecha_aprobacion', etiqueta: 'Aprobado', tipo: 'fecha', ancho: 6 },
  { clave: 'fecha_revision', etiqueta: 'Próxima revisión', tipo: 'fecha', ancho: 6 },
  { clave: 'url_documento', etiqueta: 'Enlace al archivo', ancho: 6 },
  { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'area' },
]

export default function SSTDocumentos() {
  const crud = useCrud(['sst-documentos'], sstApi.documentos, 'Documento')
  const [dlg, setDlg] = useState<{ abierto: boolean; r: DocumentoSST | null }>({ abierto: false, r: null })
  const [tipo, setTipo] = useState('')
  const lista = crud.datos
  const visibles = tipo ? lista.filter(d => d.tipo === tipo) : lista

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Description sx={{ fontSize: 28 }} />} titulo="Documentos del SG-SST" subtitulo="SST · Políticas, procedimientos, programas y planes"
          color={SST_COLOR} accion="Nuevo documento" onAccion={() => setDlg({ abierto: true, r: null })} />
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Vigentes" valor={lista.filter(d => d.estado === 'VIGENTE').length} color="#15803D" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="En revisión" valor={lista.filter(d => d.estado === 'EN_REVISION').length} color="#D97706" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Revisión vencida" valor={lista.filter(d => d.revision_vencida && d.estado !== 'OBSOLETO').length} color="#DC2626" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Planes" valor={lista.filter(d => d.tipo === 'PLAN').length} color="#0369A1" sub="Se ven también en Emergencias" /></Grid>
        </Grid>
        <TextField select size="small" label="Tipo" value={tipo} onChange={e => setTipo(e.target.value)} sx={{ minWidth: 170, mb: 2 }}>
          <MenuItem value="">Todos</MenuItem>{TIPOS.map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
        </TextField>
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'auto' }}>
          {crud.isLoading && <LinearProgress />}
          <Table size="small">
            <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12 } }}>
              <TableCell>Código</TableCell><TableCell>Título</TableCell><TableCell>Tipo</TableCell><TableCell>Versión</TableCell>
              <TableCell>Responsable</TableCell><TableCell>Aprobado</TableCell><TableCell>Revisión</TableCell><TableCell>Estado</TableCell><TableCell />
            </TableRow></TableHead>
            <TableBody>
              {!crud.isLoading && visibles.length === 0 && <TableRow><TableCell colSpan={9} align="center" sx={{ py: 3, color: 'text.secondary' }}>Sin documentos</TableCell></TableRow>}
              {visibles.map(d => (
                <TableRow key={d.id} hover>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>{d.codigo}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}><b>{d.titulo}</b></TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{TIPOS.find(t => t[0] === d.tipo)?.[1] ?? d.tipo}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>v{d.version}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{d.responsable ?? d.area_responsable ?? '—'}</TableCell>
                  <TableCell sx={{ fontSize: 12 }}>{fmtFecha(d.fecha_aprobacion)}</TableCell>
                  <TableCell sx={{ fontSize: 12, color: d.revision_vencida && d.estado !== 'OBSOLETO' ? 'error.main' : undefined, fontWeight: d.revision_vencida ? 700 : 400 }}>{fmtFecha(d.fecha_revision)}</TableCell>
                  <TableCell><Chip size="small" label={ESTADOS.find(e => e[0] === d.estado)?.[1] ?? d.estado} sx={{ fontSize: 11, fontWeight: 700, bgcolor: alpha(COLOR_EST[d.estado] ?? '#6B7280', 0.12), color: COLOR_EST[d.estado] ?? '#6B7280' }} /></TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {d.url_documento && <Button size="small" href={d.url_documento} target="_blank" rel="noopener">Abrir</Button>}
                    <Tooltip title="Editar"><IconButton size="small" aria-label={`Editar ${d.codigo}`} onClick={() => setDlg({ abierto: true, r: d })}><Edit fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Retirar"><IconButton size="small" aria-label={`Retirar ${d.codigo}`} onClick={() => { if (window.confirm(`¿Retirar ${d.codigo}?`)) crud.retirar.mutate(d.id) }}><DeleteForever fontSize="small" sx={{ color: '#DC2626' }} /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? `Documento ${dlg.r.codigo}` : 'Nuevo documento'} campos={CAMPOS} registro={dlg.r}
          valoresIniciales={{ estado: 'VIGENTE', version: '1.0', tipo: 'PROCEDIMIENTO' }}
          onGuardar={c => crud.guardar(dlg.r, c)} onCerrar={() => setDlg({ abierto: false, r: null })} />
      </Box>
    </Layout>
  )
}
