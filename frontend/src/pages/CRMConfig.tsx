/**
 * Los umbrales del módulo y el estado real de sus enlaces con los demás.
 *
 * CADA UMBRAL DICE QUÉ CAMBIA AL MOVERLO
 * Un número suelto en una pantalla de configuración no se toca nunca: nadie
 * arriesga a mover algo que no sabe qué hace. Por eso al lado de cada uno va la
 * frase que explica la consecuencia, y el valor por defecto para poder volver.
 *
 * LOS ENLACES NO SE PROMETEN, SE CONSULTAN
 * La maqueta traía ocho integraciones con un interruptor de encendido. Aquí se
 * lee qué módulos tiene contratados la empresa —lo mismo que decide qué se ve en
 * el menú— y se dice, para cada uno, qué le aporta al comercial si está y qué se
 * pierde si no. Un interruptor que no enciende nada es peor que no tenerlo.
 */
import { useState } from 'react'
import {
  Box, Typography, Tab, Tabs, Chip, alpha, Slider, Button, Tooltip,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Settings, Restore, CheckCircle, RemoveCircleOutline } from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { crmApi, type ParametroCRM } from '@/api/crm'
import { useAuthStore } from '@/store/authStore'
import { BORDE, CRM_COLOR, Estado, Panel } from '@/components/crm/comunes'

/** Qué le aporta cada módulo al comercial. Sin esto, la lista es un inventario. */
const ENLACES: { modulo: string; nombre: string; color: string; aporta: string; sin: string }[] = [
  { modulo: 'erp', nombre: 'Contabilidad', color: '#0EA5E9',
    aporta: 'Facturación y cartera reales por cliente, para calcular el margen y el puntaje de pago.',
    sin: 'La rentabilidad por cliente no se puede calcular: solo se ve lo facturado.' },
  { modulo: 'wms', nombre: 'Bodega', color: '#059669',
    aporta: 'Exactitud de inventario y despachos, que alimentan el indicador pactado de cada contrato.',
    sin: 'La exactitud de inventario del contrato hay que cargarla a mano.' },
  { modulo: 'tms', nombre: 'Transporte', color: '#7C3AED',
    aporta: 'Entregas a tiempo, de donde sale el OTIF que se le promete al cliente.',
    sin: 'El OTIF del contrato hay que cargarlo a mano.' },
  { modulo: 'dms', nombre: 'Documentos', color: '#F59E0B',
    aporta: 'El contrato firmado queda enlazado a la ficha del cliente.',
    sin: 'El contrato figura por su código, pero el documento vive fuera del sistema.' },
  { modulo: 'qms', nombre: 'Calidad', color: '#EF4444',
    aporta: 'Un reclamo se puede convertir en no conformidad con su análisis de causa.',
    sin: 'El reclamo se cierra en el ticket y no queda análisis de por qué pasó.' },
  { modulo: 'grc', nombre: 'Riesgos', color: CRM_COLOR,
    aporta: 'Los riesgos de cuenta entran al mapa de riesgos de la empresa.',
    sin: 'El riesgo de la cuenta se queda dentro del comercial.' },
  { modulo: 'gh', nombre: 'Gestión humana', color: '#8B5CF6',
    aporta: 'Los ejecutivos comerciales salen de la nómina y no de un catálogo aparte.',
    sin: 'Hay que mantener el catálogo de ejecutivos a mano.' },
  { modulo: 'lms', nombre: 'Formación', color: '#D97706',
    aporta: 'Se puede asignar formación al equipo comercial desde su ficha.',
    sin: 'La formación del equipo se lleva por fuera.' },
]

export default function CRMConfig() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)
  const modulos = useAuthStore(s => s.modulos)

  const parametros = useQuery({
    queryKey: ['crm', 'parametros'],
    queryFn: () => crmApi.parametros(),
  })

  const guardar = useMutation({
    mutationFn: ({ clave, valor }: { clave: string; valor: number }) =>
      crmApi.guardarParametro(clave, valor),
    onSuccess: (p) => {
      toast.success(`«${p.nombre}» quedó en ${p.valor} ${p.unidad}`)
      qc.invalidateQueries({ queryKey: ['crm'] })
    },
    onError: (e: any) => toast.error(
      e?.response?.data?.detail ?? 'No se pudo guardar'),
  })
  const restaurar = useMutation({
    mutationFn: (clave: string) => crmApi.restaurarParametro(clave),
    onSuccess: (p) => {
      toast.success(`«${p.nombre}» volvió a su valor por defecto`)
      qc.invalidateQueries({ queryKey: ['crm'] })
    },
    onError: () => toast.error('No se pudo restaurar'),
  })

  // `['*']` significa que la empresa tiene todo contratado.
  const tiene = (m: string) => modulos.includes('*') || modulos.includes(m)
  const conectados = ENLACES.filter(e => tiene(e.modulo))

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Settings sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>
              Configuración del comercial
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Con qué umbrales avisa el módulo, y con qué otros módulos habla
            </Typography>
          </Box>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
          mb: 3,
          '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 600 },
          '& .Mui-selected': { color: `${CRM_COLOR} !important` },
          '& .MuiTabs-indicator': { bgcolor: CRM_COLOR },
        }}>
          <Tab label="Umbrales" />
          <Tab label={`Enlaces (${conectados.length} de ${ENLACES.length})`} />
        </Tabs>

        {tab === 0 && (
          <Estado cargando={parametros.isLoading} error={parametros.error}
            vacio={!parametros.data?.length}
            mensajeVacio="No hay umbrales configurables">
            <Grid container spacing={2}>
              {parametros.data?.map(p => (
                <Grid key={p.clave} size={{ xs: 12, md: 6 }}>
                  <Umbral parametro={p}
                    guardando={guardar.isPending}
                    onGuardar={valor => guardar.mutate({ clave: p.clave, valor })}
                    onRestaurar={() => restaurar.mutate(p.clave)} />
                </Grid>
              ))}
            </Grid>
          </Estado>
        )}

        {tab === 1 && (
          <Grid container spacing={2}>
            {ENLACES.map(e => {
              const activo = tiene(e.modulo)
              return (
                <Grid key={e.modulo} size={{ xs: 12, md: 6 }}>
                  <Panel sx={{
                    p: 2, height: '100%',
                    borderColor: activo ? alpha(e.color, 0.35) : BORDE,
                    bgcolor: activo ? alpha(e.color, 0.03) : 'background.paper',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1 }}>
                      {activo
                        ? <CheckCircle sx={{ fontSize: 18, color: e.color }} />
                        : <RemoveCircleOutline sx={{ fontSize: 18, color: 'text.disabled' }} />}
                      <Typography sx={{ fontSize: 14, fontWeight: 700, flex: 1 }}>
                        {e.nombre}
                      </Typography>
                      <Chip label={activo ? 'contratado' : 'no contratado'} size="small"
                        sx={{
                          height: 20, fontSize: 10, fontWeight: 700,
                          bgcolor: activo ? alpha(e.color, 0.15) : '#F1F5F9',
                          color: activo ? e.color : 'text.secondary',
                        }} />
                    </Box>
                    <Typography sx={{ fontSize: 12.5, lineHeight: 1.55,
                                      color: activo ? 'text.primary' : 'text.secondary' }}>
                      {activo ? e.aporta : e.sin}
                    </Typography>
                  </Panel>
                </Grid>
              )
            })}
            <Grid size={{ xs: 12 }}>
              <Typography sx={{ fontSize: 12, color: 'text.disabled', mt: 0.5 }}>
                Qué módulos tiene contratados su empresa no se cambia desde aquí:
                se acuerda con quien le administra la plataforma.
              </Typography>
            </Grid>
          </Grid>
        )}
      </Box>
    </Layout>
  )
}

function Umbral({ parametro, guardando, onGuardar, onRestaurar }: {
  parametro: ParametroCRM
  guardando: boolean
  onGuardar: (valor: number) => void
  onRestaurar: () => void
}) {
  // El deslizador se mueve libre y solo se guarda al soltarlo. Guardar en cada
  // pixel manda una petición por cada movimiento del dedo.
  const [valor, setValor] = useState(parametro.valor)
  const cambiado = valor !== parametro.valor

  return (
    <Panel sx={{ p: 2, height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between',
                 alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
          {parametro.nombre}
        </Typography>
        <Typography sx={{ fontSize: 17, fontWeight: 900, color: CRM_COLOR,
                          whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
          {valor} <Box component="span" sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>
            {parametro.unidad}
          </Box>
        </Typography>
      </Box>

      <Typography sx={{ fontSize: 11.5, color: 'text.secondary', lineHeight: 1.5, mb: 1 }}>
        {parametro.explica}
      </Typography>

      <Slider
        value={valor} min={parametro.minimo} max={parametro.maximo}
        step={parametro.maximo - parametro.minimo > 60 ? 5 : 1}
        onChange={(_, v) => setValor(v as number)}
        onChangeCommitted={(_, v) => {
          if ((v as number) !== parametro.valor) onGuardar(v as number)
        }}
        disabled={guardando}
        sx={{ color: CRM_COLOR, mt: 0.5 }}
      />

      <Box sx={{ display: 'flex', justifyContent: 'space-between',
                 alignItems: 'center', gap: 1 }}>
        <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>
          entre {parametro.minimo} y {parametro.maximo} · por defecto {parametro.defecto}
        </Typography>
        {parametro.personalizado && !cambiado && (
          <Tooltip title={`Volver a ${parametro.defecto} ${parametro.unidad}`}>
            <Button size="small" startIcon={<Restore sx={{ fontSize: 14 }} />}
              onClick={() => { setValor(parametro.defecto); onRestaurar() }}
              sx={{ textTransform: 'none', fontSize: 11 }}>
              Restaurar
            </Button>
          </Tooltip>
        )}
      </Box>
    </Panel>
  )
}
