/**
 * GRC · Gestión de terceros
 *
 * Era una maqueta en memoria. Ahora los terceros se registran contra el
 * servidor (que antes no dejaba editarlos) y se evalúan en cuatro criterios;
 * el puntaje y la clasificación los calcula el servidor. El nivel de riesgo
 * del tercero lo decide una persona a la vista de sus evaluaciones.
 */
import { useState } from 'react'
import { Box, Typography, Drawer, IconButton, Button, Paper, Divider } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Handshake, Close, Add } from '@mui/icons-material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { grcApi, type Tercero } from '@/api/grc'
import { FormularioRegistro, TablaRegistros, useCrud, Cifra, Encabezado, Etiqueta, type Campo } from '@/components/comun/Registro'
import { TIPOS_TERCERO, NIVEL_TERCERO, NIVEL_TERCERO_COLOR, etiqueta } from '@/components/grc/etiquetas'
import { COLOR_MODULO } from '@/config/marca'

const GRC_COLOR = COLOR_MODULO
const CLASIF_COLOR: Record<string, string> = { excelente: '#15803D', bueno: '#0369A1', regular: '#D97706', deficiente: '#DC2626' }
const CAMPOS: Campo[] = [
  { clave: 'nombre', etiqueta: 'Tercero', obligatorio: true },
  { clave: 'nit', etiqueta: 'NIT', ancho: 6 },
  { clave: 'tipo', etiqueta: 'Tipo', tipo: 'seleccion', opciones: TIPOS_TERCERO, obligatorio: true, ancho: 6 },
  { clave: 'sector', etiqueta: 'Sector', ancho: 6 },
  { clave: 'pais', etiqueta: 'País', ancho: 6 },
  { clave: 'contacto', etiqueta: 'Contacto', ancho: 6 },
  { clave: 'nivel_riesgo', etiqueta: 'Nivel de riesgo', tipo: 'seleccion', opciones: NIVEL_TERCERO, obligatorio: true, ancho: 6 },
]
const CRITERIOS: [string, string][] = [['cumplimiento_legal', 'Cumplimiento legal'], ['riesgo_reputacional', 'Reputación'], ['solidez_financiera', 'Solidez financiera'], ['seguridad_info', 'Seguridad de la información']]

function Evaluaciones({ t, onCerrar }: { t: Tercero; onCerrar: () => void }) {
  const qc = useQueryClient()
  const clave = ['grc-evaluaciones', t.id]
  const { data: evs = [] } = useQuery({ queryKey: clave, queryFn: () => grcApi.evaluaciones.listar(t.id) })
  const [nueva, setNueva] = useState(false)
  const campos: Campo[] = [
    { clave: 'periodo', etiqueta: 'Período', obligatorio: true, ancho: 6, ayuda: '2026-Q3, 2026…' },
    { clave: 'evaluador', etiqueta: 'Evaluador', ancho: 6 },
    ...CRITERIOS.map(([k, l]) => ({ clave: k, etiqueta: `${l} (0-100)`, tipo: 'numero' as const, min: 0, max: 100, obligatorio: true, ancho: 6 as const })),
    { clave: 'observaciones', etiqueta: 'Observaciones', tipo: 'area' },
  ]
  return (
    <Box sx={{ width: { xs: '100vw', sm: 460 }, p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Box><Typography fontSize={12} color="text.secondary">{etiqueta(TIPOS_TERCERO, t.tipo)} · {t.nit ?? 'sin NIT'}</Typography><Typography fontWeight={800}>{t.nombre}</Typography></Box>
        <IconButton aria-label="Cerrar" onClick={onCerrar}><Close /></IconButton>
      </Box>
      <Divider sx={{ my: 2 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography fontWeight={700}>Evaluaciones</Typography>
        <Button size="small" startIcon={<Add />} onClick={() => setNueva(true)}>Evaluar</Button>
      </Box>
      {evs.length === 0 && <Typography fontSize={13} color="text.secondary">Sin evaluaciones.</Typography>}
      {[...evs].reverse().map(e => (
        <Paper key={e.id} variant="outlined" sx={{ p: 1.5, mb: 1, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography fontWeight={700}>{e.periodo}</Typography>
            {e.clasificacion && <Etiqueta texto={`${Number(e.puntaje_total).toFixed(1)} · ${e.clasificacion}`} color={CLASIF_COLOR[e.clasificacion] ?? '#6B7280'} />}
          </Box>
          <Typography fontSize={11} color="text.secondary">{CRITERIOS.map(([k, l]) => `${l}: ${(e as any)[k] ?? '—'}`).join(' · ')}</Typography>
          {e.observaciones && <Typography fontSize={12} mt={0.5}>{e.observaciones}</Typography>}
        </Paper>
      ))}
      <FormularioRegistro abierto={nueva} titulo={`Evaluar ${t.nombre}`} campos={campos}
        pie={f => { const v = CRITERIOS.map(([k]) => Number(f[k])).filter(x => f && Number.isFinite(x)); return v.length === 4 && CRITERIOS.every(([k]) => f[k] !== '') ? <Typography fontWeight={700}>Puntaje: {(v.reduce((s, x) => s + x, 0) / 4).toFixed(1)}</Typography> : null }}
        onGuardar={async c => { await grcApi.evaluaciones.crear({ ...c, tercero_id: t.id }); toast.success('Evaluación registrada'); qc.invalidateQueries({ queryKey: clave }) }}
        onCerrar={() => setNueva(false)} />
    </Box>
  )
}

export default function GRCTerceros() {
  const crud = useCrud(['grc-terceros'], grcApi.terceros, 'Tercero', [['grc-tablero']])
  const [dlg, setDlg] = useState<{ abierto: boolean; r: Tercero | null }>({ abierto: false, r: null })
  const [detalle, setDetalle] = useState<Tercero | null>(null)
  const lista = crud.datos.filter(t => t.estado !== 'inactivo')

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Handshake sx={{ fontSize: 28 }} />} titulo="Terceros" subtitulo="GRC · Debida diligencia de proveedores, clientes y aliados"
          color={GRC_COLOR} accion="Nuevo tercero" onAccion={() => setDlg({ abierto: true, r: null })} />
        <Grid container spacing={2} mb={3}>
          {NIVEL_TERCERO.map(([v, l]) => (
            <Grid key={v} size={{ xs: 6, md: 3 }}><Cifra etiqueta={`Riesgo ${l.toLowerCase()}`} valor={lista.filter(t => t.nivel_riesgo === v).length} color={NIVEL_TERCERO_COLOR[v]} /></Grid>
          ))}
        </Grid>
        <TablaRegistros<Tercero> filas={lista} cargando={crud.isLoading} vacio="Sin terceros" etiqueta={t => t.nombre}
          onFila={t => setDetalle(t)} onEditar={t => setDlg({ abierto: true, r: t })} onRetirar={t => crud.retirar.mutate(t.id)}
          columnas={[
            { titulo: 'Tercero', valor: t => <><b>{t.nombre}</b><Typography fontSize={11} color="text.secondary">{t.nit ?? ''}</Typography></> },
            { titulo: 'Tipo', valor: t => etiqueta(TIPOS_TERCERO, t.tipo) },
            { titulo: 'Sector', valor: t => t.sector ?? '—' },
            { titulo: 'Contacto', valor: t => t.contacto ?? '—' },
            { titulo: 'Riesgo', valor: t => t.nivel_riesgo ? <Etiqueta texto={etiqueta(NIVEL_TERCERO, t.nivel_riesgo)} color={NIVEL_TERCERO_COLOR[t.nivel_riesgo] ?? '#6B7280'} /> : '—' },
          ]} />
        <Typography fontSize={11} color="text.secondary" mt={1}>Haz clic en un tercero para ver y registrar sus evaluaciones.</Typography>
        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? dlg.r.nombre : 'Nuevo tercero'} campos={CAMPOS} registro={dlg.r}
          valoresIniciales={{ tipo: 'proveedor', pais: 'Colombia', nivel_riesgo: 'medio' }} onGuardar={c => crud.guardar(dlg.r, c)} onCerrar={() => setDlg({ abierto: false, r: null })} />
        <Drawer anchor="right" open={!!detalle} onClose={() => setDetalle(null)}>{detalle && <Evaluaciones t={detalle} onCerrar={() => setDetalle(null)} />}</Drawer>
      </Box>
    </Layout>
  )
}
