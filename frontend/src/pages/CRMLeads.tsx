/**
 * Los prospectos que todavía no han comprado.
 *
 * EL PUNTAJE Y EL ESTADO SON LO MISMO
 * El estado —frío, tibio, caliente— no es una etiqueta que alguien ponga a mano:
 * lo determina el puntaje. Por eso la pantalla los muestra juntos y no deja
 * cambiar uno sin el otro. Un prospecto marcado «caliente» con puntaje 12 es
 * exactamente el dato que hace que nadie vuelva a confiar en la clasificación.
 *
 * El filtro de estado lo aplica el servidor; el de fuente y el texto, esta
 * pantalla. Es lo que la API expone hoy, y traerse todo para filtrar por estado
 * dejaría de funcionar en cuanto haya miles de prospectos.
 */
import { useMemo, useState } from 'react'
import { Box, Typography, Chip, InputBase, alpha } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Whatshot, Search, TrendingUp, AcUnit, Thermostat } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { crmApi, type Lead } from '@/api/crm'
import { useCrud } from '@/components/datos/useCrud'
import type { CampoEntidad } from '@/components/datos/FormularioEntidad'
import {
  BORDE, CRM_COLOR, Encabezados, Estado, Panel, legible, num, pesos,
} from '@/components/crm/comunes'

const INFO_ESTADO: Record<string, { color: string; icono: JSX.Element | null }> = {
  CALIENTE:   { color: CRM_COLOR, icono: <Whatshot sx={{ fontSize: 16, color: CRM_COLOR }} /> },
  TIBIO:      { color: '#F59E0B', icono: <Thermostat sx={{ fontSize: 16, color: '#F59E0B' }} /> },
  FRIO:       { color: '#0EA5E9', icono: <AcUnit sx={{ fontSize: 16, color: '#0EA5E9' }} /> },
  CONVERTIDO: { color: '#059669', icono: <TrendingUp sx={{ fontSize: 16, color: '#059669' }} /> },
  DESCARTADO: { color: '#6B7280', icono: null },
}
const ESTADOS = ['Todos', 'CALIENTE', 'TIBIO', 'FRIO', 'CONVERTIDO', 'DESCARTADO']

function BarraPuntaje({ score }: { score: number }) {
  const col = score >= 70 ? CRM_COLOR : score >= 40 ? '#F59E0B' : '#0EA5E9'
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ width: 64, height: 6, borderRadius: 3, bgcolor: '#EEF2F7', overflow: 'hidden' }}>
        <Box sx={{ height: '100%', width: `${Math.max(0, Math.min(100, score))}%`,
                   bgcolor: col, borderRadius: 3 }} />
      </Box>
      <Typography sx={{ fontSize: 12, fontWeight: 800, color: col,
                        fontVariantNumeric: 'tabular-nums' }}>
        {score}
      </Typography>
    </Box>
  )
}

export default function CRMLeads() {
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('Todos')
  const [fuente, setFuente] = useState('Todas')

  const cuentas = useQuery({
    queryKey: ['crm', 'clientes', 'Todos', ''],
    queryFn: () => crmApi.clientes(),
    staleTime: 5 * 60 * 1000,
  })
  const leads = useQuery({
    queryKey: ['crm', 'leads', estado],
    queryFn: () => crmApi.leads({ estado: estado === 'Todos' ? undefined : estado }),
  })
  const ejecutivos = useQuery({
    queryKey: ['crm', 'ejecutivos'],
    queryFn: () => crmApi.ejecutivos(),
    staleTime: 10 * 60 * 1000,
  })
  const todos = useQuery({
    queryKey: ['crm', 'leads', 'Todos'],
    queryFn: () => crmApi.leads(),
  })

  const nombreEjecutivo = (id?: number | null) =>
    ejecutivos.data?.find(e => e.id === id)?.nombre ?? '—'

  // El estado NO se escoge a mano: lo decide el puntaje. Dejar que alguien
  // marque «caliente» un prospecto de 12 puntos vacía de sentido toda la
  // clasificación, que es lo único que esta pantalla ordena.
  const campos = (registro: Lead | null): CampoEntidad[] => [
    { clave: 'codigo', etiqueta: 'Código', tipo: 'texto', obligatorio: true,
      ancho: 4, soloLectura: !!registro },
    { clave: 'empresa', etiqueta: 'Empresa', tipo: 'texto', obligatorio: true, ancho: 8 },
    { clave: 'contacto', etiqueta: 'Persona de contacto', tipo: 'texto', ancho: 4 },
    { clave: 'email', etiqueta: 'Correo', tipo: 'texto', ancho: 4 },
    { clave: 'telefono', etiqueta: 'Teléfono', tipo: 'texto', ancho: 4 },
    { clave: 'fuente', etiqueta: 'Por dónde llegó', tipo: 'texto', ancho: 4,
      ayuda: 'Sitio web, referido, feria… De aquí sale qué canal funciona.' },
    { clave: 'industria', etiqueta: 'Industria', tipo: 'texto', ancho: 4 },
    { clave: 'score', etiqueta: 'Puntaje', tipo: 'numero', ancho: 4,
      minimo: 0, maximo: 100, porDefecto: 30,
      ayuda: 'De 70 arriba es caliente; de 40 a 69, tibio; por debajo, frío.' },
    { clave: 'potencial', etiqueta: 'Potencial estimado', tipo: 'dinero',
      ancho: 6, minimo: 0 },
    { clave: 'cliente_id', etiqueta: 'Cuenta asociada', tipo: 'referencia', ancho: 6,
      referencias: (cuentas.data ?? []).map(c => ({ valor: c.id, etiqueta: c.razon_social })) },
    { clave: 'ejecutivo_id', etiqueta: 'Ejecutivo', tipo: 'referencia', ancho: 6,
      referencias: (ejecutivos.data ?? []).map(e => ({ valor: e.id, etiqueta: e.nombre })) },
    { clave: 'notas', etiqueta: 'Notas', tipo: 'parrafo' },
  ]

  const crud = useCrud<Lead>({
    nombre: 'prospecto', campos,
    titulo: l => `${l.codigo} · ${l.empresa}`,
    crear: d => crmApi.crearLead(d),
    editar: (id, d) => crmApi.editarLead(id, d),
    eliminar: id => crmApi.borrarLead(id),
    consecuencia: () =>
      'Si ya generó una oportunidad, el borrado se niega: se perdería de dónde '
      + 'salió ese negocio.',
  })

  // Las fuentes salen de los datos y no de una lista escrita a mano: si mañana
  // entra un prospecto por un canal nuevo, aparece solo en el filtro.
  const fuentes = useMemo(() => {
    const s = new Set((todos.data ?? []).map(l => l.fuente).filter(Boolean))
    return ['Todas', ...Array.from(s).sort() as string[]]
  }, [todos.data])

  const filtrados = (leads.data ?? []).filter(l => {
    const t = busqueda.trim().toLowerCase()
    const coincide = !t ||
      l.empresa.toLowerCase().includes(t) ||
      (l.contacto || '').toLowerCase().includes(t) ||
      l.codigo.toLowerCase().includes(t)
    return coincide && (fuente === 'Todas' || l.fuente === fuente)
  })

  // Los recuentos de arriba se miden sobre TODOS los prospectos, no sobre los
  // filtrados: si cambiaran al filtrar, dejarían de responder «¿cómo va el
  // embudo?» para responder «¿qué estoy mirando?», que ya lo dice la tabla.
  const cuenta = (e: string) => (todos.data ?? []).filter(l => l.estado === e).length
  const potencialAbierto = (todos.data ?? [])
    .filter(l => !l.convertido && l.estado !== 'DESCARTADO')
    .reduce((s, l) => s + num(l.potencial), 0)

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Whatshot sx={{ color: '#FFF', fontSize: 22 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>Prospectos</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Clasificación por puntaje y entrada del embudo
            </Typography>
          </Box>
          <crud.BotonNuevo />
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Calientes', value: cuenta('CALIENTE'), color: CRM_COLOR, icon: <Whatshot sx={{ fontSize: 20 }} /> },
            { label: 'Tibios', value: cuenta('TIBIO'), color: '#F59E0B', icon: <Thermostat sx={{ fontSize: 20 }} /> },
            { label: 'Fríos', value: cuenta('FRIO'), color: '#0EA5E9', icon: <AcUnit sx={{ fontSize: 20 }} /> },
            { label: 'Convertidos', value: cuenta('CONVERTIDO'), color: '#059669', icon: <TrendingUp sx={{ fontSize: 20 }} /> },
          ].map((s, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Box sx={{
                border: `1px solid ${alpha(s.color, 0.3)}`, borderRadius: 2, p: 2,
                display: 'flex', gap: 1.5, alignItems: 'center',
              }}>
                <Box sx={{
                  width: 38, height: 38, borderRadius: '10px',
                  bgcolor: alpha(s.color, 0.15), display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  '& svg': { color: s.color },
                }}>{s.icon}</Box>
                <Box>
                  <Typography sx={{ fontSize: 24, fontWeight: 900, lineHeight: 1,
                                    fontVariantNumeric: 'tabular-nums' }}>
                    {todos.isLoading ? '·' : s.value}
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: s.color, fontWeight: 600 }}>
                    {s.label}
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{
            display: 'flex', gap: 1, border: `1px solid ${BORDE}`, borderRadius: 2,
            px: 2, py: 1, alignItems: 'center', flex: 1, minWidth: 180,
            bgcolor: 'background.paper',
          }}>
            <Search sx={{ color: 'text.disabled', fontSize: 20 }} />
            <InputBase placeholder="Buscar por empresa, contacto o código…"
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              sx={{ flex: 1, fontSize: 13.5 }} />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          {ESTADOS.map(e => (
            <Chip key={e} label={e === 'Todos' ? 'Todos los estados' : legible(e)}
              size="small" onClick={() => setEstado(e)}
              sx={{
                cursor: 'pointer',
                bgcolor: estado === e ? (INFO_ESTADO[e]?.color || CRM_COLOR) : '#F0F2F5',
                color: estado === e ? '#FFF' : '#64748B',
                fontWeight: estado === e ? 700 : 400,
              }} />
          ))}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          {fuentes.map(f => (
            <Chip key={f} label={f} size="small" variant="outlined"
              onClick={() => setFuente(f)}
              sx={{
                cursor: 'pointer', fontSize: 11,
                borderColor: fuente === f ? CRM_COLOR : BORDE,
                color: fuente === f ? CRM_COLOR : '#64748B',
                fontWeight: fuente === f ? 700 : 400,
              }} />
          ))}
        </Box>

        <Panel>
          <Box sx={{
            p: 2, borderBottom: `1px solid ${BORDE}`, display: 'flex',
            justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap',
          }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
              {filtrados.length} prospecto(s)
            </Typography>
            <Typography sx={{ fontSize: 12, color: CRM_COLOR, fontWeight: 700 }}>
              Potencial sin convertir: {pesos(potencialAbierto)}
            </Typography>
          </Box>
          <Estado
            cargando={leads.isLoading} error={leads.error}
            vacio={!filtrados.length}
            mensajeVacio={busqueda || estado !== 'Todos' || fuente !== 'Todas'
              ? 'Ningún prospecto coincide con ese filtro'
              : 'Todavía no hay prospectos'}
            hint={busqueda || estado !== 'Todos' || fuente !== 'Todas'
              ? 'Pruebe quitando alguno de los filtros.'
              : 'Entran por el formulario del sitio, por referidos o por campaña.'}
          >
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <Encabezados columnas={['Código', 'Empresa', 'Contacto', 'Industria',
                  'Fuente', 'Estado', 'Puntaje', 'Potencial', 'Ejecutivo', '']} />
                <tbody>
                  {filtrados.map(l => {
                    const info = INFO_ESTADO[l.estado] || { color: '#64748B', icono: null }
                    return (
                      <tr key={l.id} style={{ borderBottom: `1px solid ${BORDE}` }}>
                        <td style={{ padding: '10px 14px', fontSize: 11.5, color: CRM_COLOR, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{l.codigo}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>{l.empresa}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{l.contacto || '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{l.industria || '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 11.5, color: '#6B7280', whiteSpace: 'nowrap' }}>{l.fuente || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            {info.icono}
                            <Chip label={legible(l.estado)} size="small" sx={{
                              bgcolor: alpha(info.color, 0.15), color: info.color,
                              fontSize: 9.5, fontWeight: 700,
                            }} />
                          </Box>
                        </td>
                        <td style={{ padding: '10px 14px' }}><BarraPuntaje score={l.score} /></td>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: CRM_COLOR, whiteSpace: 'nowrap' }}>
                          {pesos(l.potencial)}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>
                          {nombreEjecutivo(l.ejecutivo_id)}
                        </td>
                        <td style={{ padding: '4px 8px' }}>
                          <crud.Acciones registro={l} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </Box>
          </Estado>
        </Panel>

        <crud.Dialogos />
      </Box>
    </Layout>
  )
}
