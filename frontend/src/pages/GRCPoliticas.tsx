/**
 * GRC · Políticas
 *
 * Ciclo de vida con trazabilidad: borrador → revisión → aprobación (solo el
 * aprobador asignado) → publicación. Una política aprobada no cambia de
 * contenido sin subir de versión, y la versión nueva vuelve a revisión y pide
 * las aceptaciones de nuevo. Las aceptaciones son por persona y por versión.
 */
import { useState } from 'react'
import { Box, Button, Alert, Typography, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Policy, CheckCircle } from '@mui/icons-material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { grc, type Registro } from '@/api/grc'
import { FormularioRegistro, TablaRegistros, useCrud, Cifra, Encabezado, fmtFecha, errorApi, type Campo } from '@/components/comun/Registro'
import { ESTADOS_POLITICA, POLITICA_COLOR, TRANSICIONES_POLITICA, CAT } from '@/components/grc/etiquetas'
import { FichaGRC, GRC_COLOR, ChipEstado, usePersonasGRC } from '@/components/grc/comun'

function Aceptaciones({ politica }: { politica: Registro }) {
  const q = useQuery({ queryKey: ['grc', 'aceptaciones', politica.id, politica.version], queryFn: () => grc.aceptaciones(politica.id) })
  if (!politica.aceptaciones_requeridas) return null
  const lista = q.data ?? []
  const hechas = lista.filter(a => a.fecha).length
  return (
    <Box sx={{ mb: 2 }}>
      <Typography sx={{ fontWeight: 700, fontSize: 13 }}>Aceptaciones de la versión {politica.version}: {hechas} de {lista.length}</Typography>
      {lista.map(a => (
        <Box key={a.usuario_id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, borderBottom: '1px solid #F1F5F9', fontSize: 12.5 }}>
          <span>{a.nombre}{a.cargo ? ` · ${a.cargo}` : ''}</span>
          <span style={{ color: a.fecha ? '#15803D' : '#94A3B8' }}>{a.fecha ? `Aceptó ${new Date(a.fecha).toLocaleDateString('es-CO')}` : 'Pendiente'}</span>
        </Box>
      ))}
    </Box>
  )
}

export default function GRCPoliticas() {
  const qc = useQueryClient()
  const crud = useCrud(['grc', 'politicas'], grc.politicas, 'Política', [], true)
  const personas = usePersonasGRC()
  const pendientes = useQuery({ queryKey: ['grc', 'mis-pendientes'], queryFn: grc.misPendientes })
  const [dlg, setDlg] = useState<{ abierto: boolean; r: Registro | null }>({ abierto: false, r: null })
  const [ficha, setFicha] = useState<number | null>(null)
  const [cambio, setCambio] = useState<{ p: Registro; estado: string; titulo: string } | null>(null)
  const [comentario, setComentario] = useState('')
  const [filtro, setFiltro] = useState('')
  const lista = crud.datos
  const visibles = filtro === 'vencida' ? lista.filter(p => p.vencida) : filtro ? lista.filter(p => p.estado === filtro) : lista

  const campos: Campo[] = [
    { clave: 'nombre', etiqueta: 'Política', obligatorio: true },
    { clave: 'tipo', etiqueta: 'Tipo', tipo: 'catalogo', catalogo: CAT.tipoPolitica, obligatorio: true, ancho: 8 },
    { clave: 'version', etiqueta: 'Versión', obligatorio: true, ancho: 4, ayuda: 'Súbala para cambiar una política aprobada' },
    { clave: 'propietario_id', etiqueta: 'Propietario', tipo: 'persona', personas, obligatorio: true, ancho: 6 },
    { clave: 'aprobador_id', etiqueta: 'Aprueba', tipo: 'persona', personas, ancho: 6, ayuda: 'Solo esta persona (o un administrador) puede aprobarla' },
    { clave: 'fecha_vigencia', etiqueta: 'Vigente desde', tipo: 'fecha', ancho: 4 },
    { clave: 'periodicidad_revision', etiqueta: 'Se revisa cada', tipo: 'catalogo', catalogo: CAT.periodicidad, ancho: 4 },
    { clave: 'fecha_revision', etiqueta: 'Próxima revisión', tipo: 'fecha', ancho: 4 },
    { clave: 'alcance', etiqueta: 'Alcance (a quién y a qué procesos aplica)', tipo: 'area' },
    { clave: 'descripcion', etiqueta: 'Contenido / lineamientos', tipo: 'area' },
    { clave: 'aceptaciones_requeridas', etiqueta: 'Cada persona con acceso a GRC debe leerla y aceptarla', tipo: 'interruptor' },
  ]

  const refrescar = () => qc.invalidateQueries({ queryKey: ['grc'] })
  const mover = async () => {
    try {
      await grc.estadoPolitica(cambio!.p.id, cambio!.estado, comentario || undefined)
      toast.success('Estado actualizado'); setCambio(null); setComentario(''); refrescar()
    } catch (e) { toast.error(errorApi(e)) }
  }
  const aceptar = async (id: number) => {
    try { await grc.aceptarPolitica(id); toast.success('Política aceptada'); refrescar() }
    catch (e) { toast.error(errorApi(e)) }
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Policy sx={{ fontSize: 28 }} />} titulo="Políticas" subtitulo="GRC · Ciclo de vida, aprobación y aceptación"
          color={GRC_COLOR} accion="Nueva política" onAccion={() => setDlg({ abierto: true, r: null })} />
        {(pendientes.data ?? []).length > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Tiene {pendientes.data!.length} política(s) publicada(s) por leer y aceptar:
            {pendientes.data!.map(p => (
              <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Typography sx={{ fontSize: 13 }}>{p.codigo} · {p.nombre} (v{p.version})</Typography>
                <Button size="small" onClick={() => setFicha(p.id)}>Leer</Button>
                <Button size="small" variant="contained" onClick={() => aceptar(p.id)}>Acepto</Button>
              </Box>
            ))}
          </Alert>
        )}
        <Grid container spacing={2} mb={3}>
          {ESTADOS_POLITICA.map(([k, l]) => (
            <Grid key={k} size={{ xs: 6, md: 2 }}>
              <Box role="button" aria-pressed={filtro === k} onClick={() => setFiltro(filtro === k ? '' : k)} sx={{ cursor: 'pointer', borderRadius: 2, outline: filtro === k ? `2px solid ${POLITICA_COLOR[k]}` : 'none' }}>
                <Cifra etiqueta={l} valor={lista.filter(p => p.estado === k).length} color={POLITICA_COLOR[k]} />
              </Box>
            </Grid>
          ))}
          <Grid size={{ xs: 6, md: 2 }}>
            <Box role="button" aria-pressed={filtro === 'vencida'} onClick={() => setFiltro(filtro === 'vencida' ? '' : 'vencida')} sx={{ cursor: 'pointer', borderRadius: 2 }}>
              <Cifra etiqueta="Revisión vencida" valor={lista.filter(p => p.vencida).length} color={POLITICA_COLOR.vencida} />
            </Box>
          </Grid>
        </Grid>
        <TablaRegistros<Registro> filas={visibles} cargando={crud.isLoading} vacio="Sin políticas registradas" etiqueta={p => p.nombre}
          onFila={p => setFicha(p.id)} onEditar={p => setDlg({ abierto: true, r: p })} onRetirar={p => crud.retirar.mutate(p.id)}
          columnas={[
            { titulo: 'Código', valor: p => <Box sx={{ fontFamily: 'monospace' }}>{p.codigo}</Box> },
            { titulo: 'Política', valor: p => p.nombre },
            { titulo: 'Tipo', valor: p => p.tipo ?? '—' },
            { titulo: 'Versión', valor: p => p.version },
            { titulo: 'Propietario', valor: p => p.propietario_nombre ?? '—' },
            { titulo: 'Estado', valor: p => <ChipEstado v={p.vencida ? 'vencida' : p.estado} /> },
            { titulo: 'Aceptaciones', valor: p => p.aceptaciones_requeridas ? `${p.aceptaciones} / ${p.aceptaciones_esperadas}` : 'No requiere' },
            { titulo: 'Revisión', valor: p => fmtFecha(p.fecha_revision) },
          ]} />
        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? `Editar ${dlg.r.codigo}` : 'Nueva política'} campos={campos} registro={dlg.r}
          ancho="md" valoresIniciales={{ version: '1.0' }}
          onGuardar={c => crud.guardar(dlg.r, c)} onCerrar={() => setDlg({ abierto: false, r: null })} />
        <FichaGRC tipo="politica" id={ficha} onCerrar={() => setFicha(null)}
          acciones={p => <>
            {(TRANSICIONES_POLITICA[p.estado] ?? []).map(([estado, titulo]) => (
              <Button key={estado} size="small" variant={estado === 'aprobada' || estado === 'publicada' ? 'contained' : 'outlined'}
                onClick={() => setCambio({ p, estado, titulo })} sx={estado === 'aprobada' || estado === 'publicada' ? { bgcolor: GRC_COLOR } : undefined}>{titulo}</Button>
            ))}
            {p.estado === 'publicada' && p.aceptaciones_requeridas && (
              <Button size="small" color="success" variant="contained" startIcon={<CheckCircle />} onClick={() => aceptar(p.id)}>La leí y la acepto</Button>
            )}
          </>}
          resumen={p => [
            ['Tipo', p.tipo], ['Versión', p.version], ['Estado', <ChipEstado v={p.estado} />],
            ['Propietario', p.propietario_nombre], ['Aprueba', p.aprobador_nombre], ['Aprobada', fmtFecha(p.fecha_aprobacion)],
            ['Vigente desde', fmtFecha(p.fecha_vigencia)], ['Se revisa', p.periodicidad_revision], ['Próxima revisión', fmtFecha(p.fecha_revision)],
          ]}>
          {p => <>
            {p.alcance && <Box sx={{ mb: 1.5 }}><Typography sx={{ fontWeight: 700, fontSize: 13 }}>Alcance</Typography>
              <Typography sx={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{p.alcance}</Typography></Box>}
            {p.descripcion && <Box sx={{ mb: 1.5 }}><Typography sx={{ fontWeight: 700, fontSize: 13 }}>Contenido</Typography>
              <Typography sx={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{p.descripcion}</Typography></Box>}
            <Aceptaciones politica={p} />
          </>}
        </FichaGRC>
        <Dialog open={!!cambio} onClose={() => setCambio(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>{cambio?.titulo} · {cambio?.p.nombre}</DialogTitle>
          <DialogContent>
            <TextField fullWidth multiline minRows={2} size="small" sx={{ mt: 1 }} value={comentario} onChange={e => setComentario(e.target.value)}
              label={cambio?.estado === 'borrador' ? 'Qué hay que corregir (obligatorio)' : 'Comentario (opcional)'} />
          </DialogContent>
          <DialogActions><Button color="inherit" onClick={() => setCambio(null)}>Cancelar</Button>
            <Button variant="contained" onClick={mover} disabled={cambio?.estado === 'borrador' && cambio?.p.estado === 'en_revision' && !comentario.trim()}>Confirmar</Button></DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
