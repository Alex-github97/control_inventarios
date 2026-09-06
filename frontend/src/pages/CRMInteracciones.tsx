/**
 * Todo contacto con un cliente: llamadas, correos, reuniones, WhatsApp.
 *
 * POR QUÉ IMPORTA QUE ESTÉ COMPLETO
 * Es el único sitio donde queda qué se le dijo a quién. Cuando un ejecutivo se
 * va —o simplemente está de vacaciones— esta lista es lo que permite que otro
 * retome la cuenta sin volver a preguntar lo ya preguntado.
 *
 * SE ORDENA POR FECHA, DESCENDENTE. Lo último es lo que hace falta antes de
 * llamar; el histórico completo se lee de arriba abajo si hace falta.
 */
import { useMemo, useState } from 'react'
import { Box, Typography, Chip, alpha, InputBase } from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Phone, Email, WhatsApp, Groups, Chat, Hub, Search, Forum,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { crmApi, type Interaccion } from '@/api/crm'
import { useCrud } from '@/components/datos/useCrud'
import type { CampoEntidad } from '@/components/datos/FormularioEntidad'
import {
  BORDE, CRM_COLOR, Estado, Panel, fechaHora, legible,
} from '@/components/crm/comunes'

const CFG_TIPO: Record<string, { color: string; icono: JSX.Element }> = {
  LLAMADA:    { color: '#059669', icono: <Phone sx={{ fontSize: 16 }} /> },
  EMAIL:      { color: '#0EA5E9', icono: <Email sx={{ fontSize: 16 }} /> },
  WHATSAPP:   { color: '#25D366', icono: <WhatsApp sx={{ fontSize: 16 }} /> },
  REUNION:    { color: '#7C3AED', icono: <Groups sx={{ fontSize: 16 }} /> },
  CHAT:       { color: '#F59E0B', icono: <Chat sx={{ fontSize: 16 }} /> },
  FORMULARIO: { color: CRM_COLOR, icono: <Hub sx={{ fontSize: 16 }} /> },
}

export default function CRMInteracciones() {
  const [tipo, setTipo] = useState('Todos')
  const [busqueda, setBusqueda] = useState('')

  const interacciones = useQuery({
    queryKey: ['crm', 'interacciones', tipo],
    queryFn: () => crmApi.interacciones({ tipo: tipo === 'Todos' ? undefined : tipo }),
  })
  const todas = useQuery({
    queryKey: ['crm', 'interacciones', 'Todos'],
    queryFn: () => crmApi.interacciones(),
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

  const campos = (): CampoEntidad[] => [
    { clave: 'cliente_id', etiqueta: 'Cliente', tipo: 'referencia',
      obligatorio: true, ancho: 6,
      referencias: (clientes.data ?? []).map(c => ({ valor: c.id, etiqueta: c.razon_social })) },
    { clave: 'tipo', etiqueta: 'Canal', tipo: 'seleccion', obligatorio: true,
      ancho: 6, porDefecto: 'LLAMADA',
      opciones: Object.keys(CFG_TIPO).map(v => ({ valor: v, etiqueta: legible(v) })) },
    { clave: 'asunto', etiqueta: 'Asunto', tipo: 'texto', ancho: 8 },
    { clave: 'fecha_interaccion', etiqueta: 'Cuándo', tipo: 'fechahora', ancho: 4 },
    { clave: 'duracion_min', etiqueta: 'Duración (min)', tipo: 'numero',
      ancho: 4, minimo: 0 },
    { clave: 'ejecutivo_id', etiqueta: 'Quién habló', tipo: 'referencia', ancho: 8,
      referencias: (ejecutivos.data ?? []).map(e => ({ valor: e.id, etiqueta: e.nombre })) },
    { clave: 'descripcion', etiqueta: 'Qué se habló', tipo: 'parrafo' },
    { clave: 'resultado', etiqueta: 'En qué quedó', tipo: 'texto', ancho: 6 },
    { clave: 'proximo_paso', etiqueta: 'Próximo paso', tipo: 'texto', ancho: 6,
      ayuda: 'Lo que hace que quien retome la cuenta sepa por dónde seguir.' },
  ]

  const crud = useCrud<Interaccion>({
    nombre: 'contacto', campos,
    titulo: i => i.asunto || legible(i.tipo),
    crear: d => crmApi.crearInteraccion(d),
    editar: (id, d) => crmApi.editarInteraccion(id, d),
    eliminar: id => crmApi.borrarInteraccion(id),
  })

  // Los recuentos por canal salen de los datos. Escritos a mano se quedarían
  // desactualizados en cuanto se añada un canal nuevo al catálogo.
  const porTipo = useMemo(() => {
    const c: Record<string, number> = {}
    for (const i of todas.data ?? []) c[i.tipo] = (c[i.tipo] || 0) + 1
    return Object.entries(c).sort((a, b) => b[1] - a[1])
  }, [todas.data])

  const texto = busqueda.trim().toLowerCase()
  const lista = (interacciones.data ?? [])
    .filter(i => !texto ||
      (i.asunto || '').toLowerCase().includes(texto) ||
      (i.descripcion || '').toLowerCase().includes(texto) ||
      nombreCliente(i.cliente_id).toLowerCase().includes(texto))
    .slice()
    .sort((a, b) => String(b.fecha_interaccion ?? '')
                      .localeCompare(String(a.fecha_interaccion ?? '')))

  const minutos = (todas.data ?? []).reduce((s, i) => s + (i.duracion_min || 0), 0)

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Forum sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>
              Contactos con clientes
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Qué se habló, con quién y en qué quedó
            </Typography>
          </Box>
          <crud.BotonNuevo etiqueta="Registrar contacto" />
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 6, md: 3 }}>
            <Box sx={{ border: `1px solid ${alpha(CRM_COLOR, 0.3)}`, borderRadius: 2, p: 2 }}>
              <Typography sx={{ fontSize: 24, fontWeight: 900, lineHeight: 1,
                                fontVariantNumeric: 'tabular-nums' }}>
                {todas.isLoading ? '·' : (todas.data?.length ?? 0)}
              </Typography>
              <Typography sx={{ fontSize: 11, color: CRM_COLOR, fontWeight: 600, mt: 0.25 }}>
                Contactos registrados
              </Typography>
            </Box>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <Box sx={{ border: `1px solid ${alpha('#7C3AED', 0.3)}`, borderRadius: 2, p: 2 }}>
              <Typography sx={{ fontSize: 24, fontWeight: 900, lineHeight: 1,
                                fontVariantNumeric: 'tabular-nums' }}>
                {minutos >= 60 ? `${Math.round(minutos / 60)} h` : `${minutos} min`}
              </Typography>
              <Typography sx={{ fontSize: 11, color: '#7C3AED', fontWeight: 600, mt: 0.25 }}>
                Tiempo dedicado
              </Typography>
            </Box>
          </Grid>
          {porTipo.slice(0, 2).map(([t, n]) => {
            const cfg = CFG_TIPO[t] ?? { color: '#94A3B8', icono: null }
            return (
              <Grid key={t} size={{ xs: 6, md: 3 }}>
                <Box sx={{
                  border: `1px solid ${alpha(cfg.color, 0.3)}`, borderRadius: 2, p: 2,
                  display: 'flex', gap: 1.5, alignItems: 'center',
                }}>
                  <Box sx={{
                    width: 38, height: 38, borderRadius: '10px',
                    bgcolor: alpha(cfg.color, 0.15), display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    '& svg': { color: cfg.color },
                  }}>{cfg.icono}</Box>
                  <Box>
                    <Typography sx={{ fontSize: 24, fontWeight: 900, lineHeight: 1,
                                      fontVariantNumeric: 'tabular-nums' }}>{n}</Typography>
                    <Typography sx={{ fontSize: 11, color: cfg.color, fontWeight: 600 }}>
                      {legible(t)}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            )
          })}
        </Grid>

        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{
            display: 'flex', gap: 1, border: `1px solid ${BORDE}`, borderRadius: 2,
            px: 2, py: 1, alignItems: 'center', flex: 1, minWidth: 200,
            bgcolor: 'background.paper',
          }}>
            <Search sx={{ color: 'text.disabled', fontSize: 20 }} />
            <InputBase placeholder="Buscar por asunto, cliente o contenido…"
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              sx={{ flex: 1, fontSize: 13.5 }} />
          </Box>
          {['Todos', ...Object.keys(CFG_TIPO)].map(t => (
            <Chip key={t} label={t === 'Todos' ? 'Todos' : legible(t)} size="small"
              onClick={() => setTipo(t)}
              sx={{
                cursor: 'pointer',
                bgcolor: tipo === t ? (CFG_TIPO[t]?.color || CRM_COLOR) : '#F1F5F9',
                color: tipo === t ? '#FFF' : 'text.secondary',
                fontWeight: tipo === t ? 700 : 400,
              }} />
          ))}
        </Box>

        <Panel sx={{ p: 2.5 }}>
          <Estado cargando={interacciones.isLoading} error={interacciones.error}
            vacio={!lista.length}
            mensajeVacio={busqueda || tipo !== 'Todos'
              ? 'Ningún contacto coincide con ese filtro'
              : 'Todavía no se ha registrado ningún contacto'}
            hint={busqueda || tipo !== 'Todos'
              ? 'Pruebe con otro canal o quite el texto de búsqueda.'
              : 'Cada llamada o reunión que se anote aquí le sirve a quien tome la cuenta después.'}>
            {lista.slice(0, 150).map(i => {
              const cfg = CFG_TIPO[i.tipo] ?? { color: '#94A3B8', icono: null }
              return (
                <Box key={i.id} sx={{
                  display: 'flex', gap: 1.75, p: 1.75, mb: 1.25, borderRadius: 1.5,
                  border: `1px solid ${BORDE}`, bgcolor: '#F9FAFB',
                }}>
                  <Box sx={{
                    width: 36, height: 36, borderRadius: '10px', flexShrink: 0,
                    bgcolor: alpha(cfg.color, 0.15), display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    '& svg': { color: cfg.color },
                  }}>{cfg.icono}</Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between',
                               gap: 1, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                        {i.asunto || legible(i.tipo)}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
                        <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>
                          {fechaHora(i.fecha_interaccion)}
                          {i.duracion_min ? ` · ${i.duracion_min} min` : ''}
                        </Typography>
                        <crud.Acciones registro={i} />
                      </Box>
                    </Box>
                    <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 0.5 }}>
                      {nombreCliente(i.cliente_id)} · {nombreEjecutivo(i.ejecutivo_id)}
                    </Typography>
                    {i.descripcion && (
                      <Typography sx={{ fontSize: 12.5, lineHeight: 1.5 }}>
                        {i.descripcion}
                      </Typography>
                    )}
                    <Box sx={{ display: 'flex', gap: 1, mt: 0.75, flexWrap: 'wrap' }}>
                      {i.resultado && (
                        <Chip label={i.resultado} size="small" sx={{
                          bgcolor: alpha('#059669', 0.12), color: '#059669',
                          fontSize: 10.5, height: 20,
                        }} />
                      )}
                      {i.proximo_paso && (
                        <Chip label={`Sigue: ${i.proximo_paso}`} size="small"
                          variant="outlined" sx={{ fontSize: 10.5, height: 20 }} />
                      )}
                    </Box>
                  </Box>
                </Box>
              )
            })}
            {lista.length > 150 && (
              <Typography sx={{ fontSize: 11.5, color: 'text.disabled', textAlign: 'center', mt: 1 }}>
                Se muestran los 150 más recientes de {lista.length}. Afine la
                búsqueda para ver los anteriores.
              </Typography>
            )}
          </Estado>
        </Panel>

        <crud.Dialogos />
      </Box>
    </Layout>
  )
}
