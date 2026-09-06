/**
 * El embudo de oportunidades, en tablero y en tabla.
 *
 * SE PUEDE MOVER, NO SOLO MIRAR
 * Una tarjeta se arrastra —o se mueve desde su menú— de una columna a otra y el
 * cambio queda guardado. Un tablero que solo se mira obliga a llevar el embudo
 * en otra parte, y entonces la cifra del sistema y la de la reunión de los lunes
 * nunca coinciden.
 *
 * PERDER EXIGE DECIR POR QUÉ
 * Al mover a «cierre perdido» se pide el motivo. Es lo único que hace útil el
 * historial de pérdidas: saber cuántas se perdieron no ayuda a perder menos.
 */
import { useState } from 'react'
import {
  Box, Typography, Tab, Tabs, Chip, alpha, Menu, MenuItem, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Button, Tooltip,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { TrendingUp, DragIndicator } from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { crmApi, type Oportunidad } from '@/api/crm'
import { useCrud } from '@/components/datos/useCrud'
import type { CampoEntidad } from '@/components/datos/FormularioEntidad'
import {
  BORDE, CRM_COLOR, COLOR_ETAPA, Encabezados, Estado, Panel,
  fecha, legible, num, pesos,
} from '@/components/crm/comunes'

const ETAPAS = ['IDENTIFICACION', 'CALIFICACION', 'PROPUESTA', 'NEGOCIACION',
                'CIERRE_GANADO', 'CIERRE_PERDIDO']
const COLUMNAS = ETAPAS.filter(e => e !== 'CIERRE_PERDIDO')
const ABIERTAS = ['IDENTIFICACION', 'CALIFICACION', 'PROPUESTA', 'NEGOCIACION']

export default function CRMOportunidades() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const [menu, setMenu] = useState<{ el: HTMLElement; o: Oportunidad } | null>(null)
  const [perdiendo, setPerdiendo] = useState<Oportunidad | null>(null)
  const [motivo, setMotivo] = useState('')
  const [arrastrada, setArrastrada] = useState<number | null>(null)
  const [encima, setEncima] = useState<string | null>(null)

  const oportunidades = useQuery({
    queryKey: ['crm', 'oportunidades'],
    queryFn: () => crmApi.oportunidades(),
  })
  const clientes = useQuery({
    queryKey: ['crm', 'clientes', 'Todos', ''],
    queryFn: () => crmApi.clientes(),
    staleTime: 5 * 60 * 1000,
  })
  const ejecutivos = useQuery({
    queryKey: ['crm', 'ejecutivos'],
    queryFn: () => crmApi.ejecutivos(),
    staleTime: 10 * 60 * 1000,
  })

  const nombreCliente = (id: number) =>
    clientes.data?.find(c => c.id === id)?.razon_social ?? `Cliente #${id}`
  const nombreEjecutivo = (id?: number | null) =>
    ejecutivos.data?.find(e => e.id === id)?.nombre ?? '—'

  const mover = useMutation({
    mutationFn: ({ o, estado, motivo_perdida }:
                 { o: Oportunidad; estado: string; motivo_perdida?: string }) =>
      crmApi.moverOportunidad(o.id, estado, { motivo_perdida }),
    onSuccess: (r) => {
      toast.success(`«${r.nombre}» pasó a ${legible(r.estado).toLowerCase()}`)
      setMenu(null); setPerdiendo(null); setMotivo('')
      qc.invalidateQueries({ queryKey: ['crm'] })
    },
    onError: (e: any) => toast.error(
      e?.response?.data?.detail ?? 'No se pudo mover la oportunidad'),
  })

  // La etapa y la probabilidad NO se editan aqui: se mueven arrastrando la
  // tarjeta, y la probabilidad la fija la etapa. Dos maneras de cambiar lo mismo
  // producen tableros donde una oportunidad en negociacion dice 10%.
  const campos = (registro: Oportunidad | null): CampoEntidad[] => [
    { clave: 'codigo', etiqueta: 'Código', tipo: 'texto', obligatorio: true,
      ancho: 4, soloLectura: !!registro },
    { clave: 'nombre', etiqueta: 'Nombre del negocio', tipo: 'texto',
      obligatorio: true, ancho: 8 },
    { clave: 'cliente_id', etiqueta: 'Cliente', tipo: 'referencia',
      obligatorio: true, ancho: 6, soloLectura: !!registro,
      referencias: (clientes.data ?? []).map(c => ({ valor: c.id, etiqueta: c.razon_social })) },
    { clave: 'ejecutivo_id', etiqueta: 'Ejecutivo', tipo: 'referencia', ancho: 6,
      referencias: (ejecutivos.data ?? []).map(e => ({ valor: e.id, etiqueta: e.nombre })) },
    { clave: 'valor_estimado', etiqueta: 'Valor estimado', tipo: 'dinero',
      ancho: 6, minimo: 0,
      ayuda: 'Lo que sumaría al embudo. El pronóstico lo pondera por la etapa.' },
    { clave: 'servicio', etiqueta: 'Servicio', tipo: 'texto', ancho: 6 },
    { clave: 'fecha_esperada', etiqueta: 'Cierre esperado', tipo: 'fecha', ancho: 6 },
    { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'parrafo' },
  ]

  const crud = useCrud<Oportunidad>({
    nombre: 'oportunidad', genero: 'f', campos,
    titulo: o => `${o.codigo} · ${o.nombre}`,
    crear: d => crmApi.crearOportunidad(d),
    editar: (id, d) => crmApi.editarOportunidad(id, d),
    eliminar: id => crmApi.borrarOportunidad(id),
    consecuencia: () =>
      'Si ya tiene cotización o contrato, el borrado se niega: ese negocio '
      + 'quedaría sin origen.',
  })

  const pedirMover = (o: Oportunidad, estado: string) => {
    if (o.estado === estado) { setMenu(null); return }
    if (estado === 'CIERRE_PERDIDO') {
      setMenu(null); setPerdiendo(o); setMotivo('')
      return
    }
    mover.mutate({ o, estado })
  }

  const todas = oportunidades.data ?? []
  const abiertas = todas.filter(o => ABIERTAS.includes(o.estado))
  const cerradas = todas.filter(o => !ABIERTAS.includes(o.estado))
  const ganadas = todas.filter(o => o.estado === 'CIERRE_GANADO')

  const pipeline = abiertas.reduce((s, o) => s + num(o.valor_estimado), 0)
  const contratado = ganadas.reduce(
    (s, o) => s + num(o.valor_contratado ?? o.valor_estimado), 0)
  // La tasa de cierre solo mira las que YA se decidieron. Meter las abiertas en
  // el denominador la hunde artificialmente y hace pensar que se vende peor de
  // lo que se vende.
  const tasaCierre = cerradas.length
    ? Math.round((ganadas.length / cerradas.length) * 100) : null
  // El pronóstico pondera cada negocio por su probabilidad. Es la cifra que de
  // verdad se lleva al comité, y no la suma cruda del embudo.
  const pronostico = abiertas.reduce(
    (s, o) => s + num(o.valor_estimado) * (o.probabilidad / 100), 0)

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <TrendingUp sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>Oportunidades</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Arrastre una tarjeta a otra columna para moverla de etapa
            </Typography>
          </Box>
          <crud.BotonNuevo etiqueta="Nueva oportunidad" />
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Embudo abierto', value: pesos(pipeline), color: CRM_COLOR },
            { label: 'Pronóstico ponderado', value: pesos(pronostico), color: '#0EA5E9' },
            { label: 'Tasa de cierre', value: tasaCierre == null ? '—' : `${tasaCierre}%`,
              color: '#059669' },
            { label: 'Contratado', value: pesos(contratado), color: '#7C3AED' },
          ].map((k, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Box sx={{ border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2, p: 2 }}>
                <Typography sx={{ fontSize: 24, fontWeight: 900, lineHeight: 1,
                                  fontVariantNumeric: 'tabular-nums' }}>
                  {oportunidades.isLoading ? '·' : k.value}
                </Typography>
                <Typography sx={{ fontSize: 11, color: k.color, fontWeight: 600, mt: 0.25 }}>
                  {k.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
          mb: 3,
          '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 600 },
          '& .Mui-selected': { color: `${CRM_COLOR} !important` },
          '& .MuiTabs-indicator': { bgcolor: CRM_COLOR },
        }}>
          <Tab label="Tablero" />
          <Tab label="Tabla" />
        </Tabs>

        <Estado cargando={oportunidades.isLoading} error={oportunidades.error}
          vacio={!todas.length}
          mensajeVacio="Todavía no hay oportunidades"
          hint="Se crean al calificar un prospecto.">
          {tab === 0 && (
            <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
              {COLUMNAS.map(etapa => {
                const color = COLOR_ETAPA[etapa] || CRM_COLOR
                const suyas = todas.filter(o => o.estado === etapa)
                const total = suyas.reduce((s, o) => s + num(
                  etapa === 'CIERRE_GANADO' ? (o.valor_contratado ?? o.valor_estimado)
                                            : o.valor_estimado), 0)
                return (
                  <Box key={etapa}
                    onDragOver={e => { e.preventDefault(); setEncima(etapa) }}
                    onDragLeave={() => setEncima(c => c === etapa ? null : c)}
                    onDrop={e => {
                      e.preventDefault()
                      setEncima(null)
                      const o = todas.find(x => x.id === arrastrada)
                      setArrastrada(null)
                      if (o) pedirMover(o, etapa)
                    }}
                    sx={{
                      minWidth: 250, maxWidth: 280, flexShrink: 0, borderRadius: 2, p: 1,
                      bgcolor: encima === etapa ? alpha(color, 0.07) : 'transparent',
                      outline: encima === etapa ? `2px dashed ${alpha(color, 0.5)}` : 'none',
                      transition: 'background-color .15s',
                    }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between',
                               alignItems: 'center', mb: 1.5, px: 0.5 }}>
                      <Typography sx={{
                        fontSize: 12, fontWeight: 700, color,
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>
                        {legible(etapa)}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.75 }}>
                        <Chip label={suyas.length} size="small" sx={{
                          bgcolor: alpha(color, 0.15), color, fontSize: 10, height: 18,
                        }} />
                        {total > 0 && (
                          <Chip label={pesos(total)} size="small" sx={{
                            bgcolor: '#F1F5F9', color: 'text.secondary',
                            fontSize: 10, height: 18,
                          }} />
                        )}
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {!suyas.length && (
                        <Box sx={{
                          border: `1px dashed ${alpha(color, 0.25)}`, borderRadius: 1.5,
                          p: 2, textAlign: 'center',
                        }}>
                          <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                            Nada en esta etapa
                          </Typography>
                        </Box>
                      )}
                      {suyas.map(o => (
                        <Box key={o.id} draggable
                          onDragStart={() => setArrastrada(o.id)}
                          onDragEnd={() => { setArrastrada(null); setEncima(null) }}
                          onClick={e => setMenu({ el: e.currentTarget, o })}
                          sx={{
                            border: `1px solid ${alpha(color, 0.25)}`, borderRadius: 1.5,
                            p: 1.5, cursor: 'grab', bgcolor: 'background.paper',
                            opacity: arrastrada === o.id ? 0.45 : 1,
                            '&:hover': { borderColor: alpha(color, 0.6) },
                            transition: 'border-color .15s, opacity .15s',
                          }}>
                          <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-start' }}>
                            <DragIndicator sx={{ fontSize: 14, color: 'text.disabled', mt: 0.2 }} />
                            <Typography sx={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.3, flex: 1 }}>
                              {o.nombre}
                            </Typography>
                          </Box>
                          <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 1, mt: 0.5 }}>
                            {nombreCliente(o.cliente_id)}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75, gap: 1 }}>
                            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                              {o.servicio || '—'}
                            </Typography>
                            <Typography sx={{ fontSize: 13, fontWeight: 800, color }}>
                              {pesos(o.valor_contratado ?? o.valor_estimado)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
                              {fecha(o.fecha_cierre ?? o.fecha_esperada)}
                            </Typography>
                            <Typography sx={{ fontSize: 11, fontWeight: 700, color }}>
                              {o.probabilidad}%
                            </Typography>
                          </Box>
                          <Box sx={{ mt: 0.75, height: 3, borderRadius: 2, bgcolor: '#EEF2F7', overflow: 'hidden' }}>
                            <Box sx={{ height: '100%', width: `${o.probabilidad}%`,
                                       bgcolor: color, borderRadius: 2 }} />
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )
              })}
            </Box>
          )}

          {tab === 1 && (
            <Panel>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <Encabezados columnas={['Código', 'Oportunidad', 'Cliente', 'Servicio',
                    'Valor', 'Etapa', 'Prob.', 'Fecha', 'Ejecutivo', 'Motivo', '']} />
                  <tbody>
                    {todas.map(o => {
                      const color = COLOR_ETAPA[o.estado] || CRM_COLOR
                      return (
                        <tr key={o.id} style={{ borderBottom: `1px solid ${BORDE}` }}>
                          <td style={{ padding: '10px 14px', fontSize: 11.5, color: CRM_COLOR, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{o.codigo}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600 }}>{o.nombre}</td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{nombreCliente(o.cliente_id)}</td>
                          <td style={{ padding: '10px 14px', fontSize: 11.5, color: '#6B7280', whiteSpace: 'nowrap' }}>{o.servicio || '—'}</td>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: CRM_COLOR, whiteSpace: 'nowrap' }}>
                            {pesos(o.valor_contratado ?? o.valor_estimado)}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <Chip label={legible(o.estado)} size="small" sx={{
                              bgcolor: alpha(color, 0.15), color,
                              border: `1px solid ${alpha(color, 0.3)}`,
                              fontSize: 9.5, fontWeight: 700,
                            }} />
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color }}>{o.probabilidad}%</td>
                          <td style={{ padding: '10px 14px', fontSize: 11.5, color: '#6B7280', whiteSpace: 'nowrap' }}>
                            {fecha(o.fecha_cierre ?? o.fecha_esperada)}
                          </td>
                          <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{nombreEjecutivo(o.ejecutivo_id)}</td>
                          <td style={{ padding: '10px 14px', fontSize: 11.5, color: '#6B7280', maxWidth: 220 }}>
                            {o.motivo_perdida ? (
                              <Tooltip title={o.motivo_perdida}>
                                <span>{o.motivo_perdida.slice(0, 40)}
                                  {o.motivo_perdida.length > 40 ? '…' : ''}</span>
                              </Tooltip>
                            ) : '—'}
                          </td>
                          <td style={{ padding: '4px 8px' }}>
                            <crud.Acciones registro={o} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </Box>
            </Panel>
          )}
        </Estado>

        <Menu anchorEl={menu?.el} open={!!menu} onClose={() => setMenu(null)}>
          <MenuItem disabled sx={{ fontSize: 11, opacity: 0.7 }}>Mover a…</MenuItem>
          {ETAPAS.map(e => (
            <MenuItem key={e} disabled={menu?.o.estado === e || mover.isPending}
              onClick={() => menu && pedirMover(menu.o, e)}>
              <Box sx={{
                width: 9, height: 9, borderRadius: '50%', mr: 1.25,
                bgcolor: COLOR_ETAPA[e] || '#94A3B8',
              }} />
              {legible(e)}
            </MenuItem>
          ))}
        </Menu>

        <Dialog open={!!perdiendo} onClose={() => setPerdiendo(null)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>¿Por qué se perdió?</DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
              «{perdiendo?.nombre}» por {pesos(perdiendo?.valor_estimado)}. El
              motivo es lo único que después permite perder menos: sin él solo
              queda el recuento.
            </Typography>
            <TextField autoFocus fullWidth multiline minRows={2} size="small"
              label="Motivo de la pérdida" value={motivo}
              onChange={e => setMotivo(e.target.value)}
              placeholder="Precio por encima del competidor, se aplazó la decisión…" />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setPerdiendo(null)} sx={{ textTransform: 'none' }}>
              Cancelar
            </Button>
            <Button variant="contained" color="error"
              disabled={!motivo.trim() || mover.isPending}
              onClick={() => perdiendo && mover.mutate({
                o: perdiendo, estado: 'CIERRE_PERDIDO', motivo_perdida: motivo.trim(),
              })}
              sx={{ textTransform: 'none' }}>
              Marcar como perdida
            </Button>
          </DialogActions>
        </Dialog>

        <crud.Dialogos />
      </Box>
    </Layout>
  )
}
