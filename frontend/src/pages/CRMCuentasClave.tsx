/**
 * Las cuentas que se gestionan con plan propio.
 *
 * QUÉ HACE CLAVE A UNA CUENTA
 * No es el tamaño solo: es que alguien decidió dedicarle un plan, un objetivo y
 * una reunión periódica. Marcar a todo el mundo como cuenta clave es lo mismo
 * que no marcar a nadie, así que aquí solo salen las que están declaradas como
 * tales en `crm_cuenta_clave`.
 *
 * LOS INDICADORES SON LOS DEL CONTRATO
 * Cada tarjeta trae los acuerdos de nivel de servicio realmente firmados con ese
 * cliente, no una lista fija. Es lo que permite llevar la reunión trimestral con
 * el documento delante en vez de con una diapositiva.
 */
import { Box, Typography, Chip, alpha } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Stars, EventAvailable } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { crmApi, type CuentaClave } from '@/api/crm'
import { useCrud } from '@/components/datos/useCrud'
import type { CampoEntidad } from '@/components/datos/FormularioEntidad'
import {
  BORDE, CRM_COLOR, BarraSalud, Estado, Panel,
  fecha, legible, num, pesos,
} from '@/components/crm/comunes'

const COLOR_RIESGO: Record<string, string> = {
  BAJO: '#059669', MEDIO: '#F59E0B', ALTO: CRM_COLOR, CRITICO: '#EF4444',
}

const menorEsMejor = (unidad?: string | null) => {
  const u = (unidad || '').trim().toLowerCase()
  return ['hora', 'hr', 'h', 'día', 'dia', 'd', 'min', 'seg', 'semana']
    .some(x => u.startsWith(x))
}

export default function CRMCuentasClave() {
  const clientes = useQuery({
    queryKey: ['crm', 'clientes', 'Todos', ''],
    queryFn: () => crmApi.clientes(),
    staleTime: 5 * 60 * 1000,
  })
  const cuentas = useQuery({
    queryKey: ['crm', 'cuentas-clave'],
    queryFn: () => crmApi.cuentasClave(),
  })
  const ejecutivos = useQuery({
    queryKey: ['crm', 'ejecutivos'],
    queryFn: () => crmApi.ejecutivos(),
    staleTime: 10 * 60 * 1000,
  })
  const contratos = useQuery({
    queryKey: ['crm', 'contratos'],
    queryFn: () => crmApi.contratos(),
  })
  const riesgos = useQuery({
    queryKey: ['crm', 'riesgos'],
    queryFn: () => crmApi.riesgos(),
  })

  const nombreEjecutivo = (id?: number | null) =>
    ejecutivos.data?.find(e => e.id === id)?.nombre ?? '—'

  const campos = (registro: CuentaClave | null): CampoEntidad[] => [
    { clave: 'cliente_id', etiqueta: 'Cliente', tipo: 'referencia',
      obligatorio: true, ancho: 12, soloLectura: !!registro,
      referencias: (clientes.data ?? []).map(c => ({ valor: c.id, etiqueta: c.razon_social })),
      ayuda: registro ? undefined
        : 'Solo las que merecen un plan propio. Marcarlas todas equivale a no marcar ninguna.' },
    { clave: 'ejecutivo_id', etiqueta: 'Gerente de cuenta', tipo: 'referencia', ancho: 6,
      referencias: (ejecutivos.data ?? []).map(e => ({ valor: e.id, etiqueta: e.nombre })) },
    { clave: 'nivel_riesgo', etiqueta: 'Nivel de riesgo', tipo: 'seleccion',
      ancho: 6, porDefecto: 'BAJO',
      opciones: ['BAJO', 'MEDIO', 'ALTO', 'CRITICO']
        .map(v => ({ valor: v, etiqueta: legible(v) })) },
    { clave: 'objetivo_anual', etiqueta: 'Objetivo anual', tipo: 'dinero',
      ancho: 4, minimo: 0 },
    { clave: 'ingreso_actual', etiqueta: 'Facturado hasta hoy', tipo: 'dinero',
      ancho: 4, minimo: 0 },
    { clave: 'proxima_reunion', etiqueta: 'Próxima reunión', tipo: 'fecha', ancho: 4 },
    { clave: 'estrategia', etiqueta: 'Estrategia', tipo: 'parrafo',
      ayuda: 'Qué se va a hacer con esta cuenta este año, en concreto.' },
  ]

  const crud = useCrud<CuentaClave>({
    nombre: 'cuenta clave', genero: 'f', campos,
    titulo: c => c.cliente ?? `Cuenta #${c.id}`,
    crear: d => crmApi.crearCuentaClave(d),
    editar: (id, d) => crmApi.editarCuentaClave(id, d),
    eliminar: id => crmApi.borrarCuentaClave(id),
    consecuencia: () =>
      'Deja de gestionarse con plan propio. El cliente y su historia siguen igual.',
  })

  const todas = cuentas.data ?? []
  const objetivo = todas.reduce((s, c) => s + num(c.objetivo_anual), 0)
  const actual = todas.reduce((s, c) => s + num(c.ingreso_actual), 0)
  const enRiesgo = todas.filter(
    c => c.nivel_riesgo === 'ALTO' || c.nivel_riesgo === 'CRITICO').length

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Stars sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>
              Cuentas clave
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Objetivo, plan y próxima reunión de cada una
            </Typography>
          </Box>
          <crud.BotonNuevo etiqueta="Declarar cuenta clave" />
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Cuentas clave', value: todas.length, color: CRM_COLOR },
            { label: 'Objetivo conjunto', value: pesos(objetivo), color: '#7C3AED' },
            { label: 'Facturado hasta hoy', value: pesos(actual), color: '#059669',
              nota: objetivo ? `${Math.round((actual / objetivo) * 100)}% del objetivo` : undefined },
            { label: 'En riesgo alto', value: enRiesgo, color: '#EF4444' },
          ].map((k, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Box sx={{ border: `1px solid ${alpha(k.color, 0.3)}`, borderRadius: 2, p: 2 }}>
                <Typography sx={{ fontSize: 24, fontWeight: 900, lineHeight: 1,
                                  fontVariantNumeric: 'tabular-nums' }}>
                  {cuentas.isLoading ? '·' : k.value}
                </Typography>
                <Typography sx={{ fontSize: 11, color: k.color, fontWeight: 600, mt: 0.25 }}>
                  {k.label}
                </Typography>
                {k.nota && (
                  <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>{k.nota}</Typography>
                )}
              </Box>
            </Grid>
          ))}
        </Grid>

        <Estado cargando={cuentas.isLoading} error={cuentas.error}
          vacio={!todas.length}
          mensajeVacio="Todavía no hay cuentas clave declaradas"
          hint="Se marcan las que merecen un plan propio, no todas las grandes.">
          <Grid container spacing={2}>
            {todas.map(c => {
              const colRiesgo = COLOR_RIESGO[c.nivel_riesgo] || '#94A3B8'
              const avance = num(c.objetivo_anual)
                ? Math.round((num(c.ingreso_actual) / num(c.objetivo_anual)) * 100)
                : null
              const suyos = (contratos.data ?? [])
                .filter(k => k.cliente_id === c.cliente_id && k.estado === 'ACTIVO')
              const susRiesgos = (riesgos.data ?? [])
                .filter(r => r.cliente_id === c.cliente_id)
              return (
                <Grid key={c.id} size={{ xs: 12, lg: 6 }}>
                  <Panel sx={{ p: 2.5, height: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between',
                               alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                      <Box>
                        <Typography sx={{ fontSize: 15, fontWeight: 800 }}>
                          {c.cliente}
                        </Typography>
                        <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                          {nombreEjecutivo(c.ejecutivo_id)}
                          {c.segmento ? ` · ${legible(c.segmento)}` : ''}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexShrink: 0 }}>
                        {c.health_score != null && c.health_score > 0 && (
                          <BarraSalud score={c.health_score} />
                        )}
                        <Chip label={`riesgo ${c.nivel_riesgo.toLowerCase()}`} size="small"
                          sx={{
                            bgcolor: alpha(colRiesgo, 0.15), color: colRiesgo,
                            fontSize: 9.5, fontWeight: 700,
                          }} />
                        <crud.Acciones registro={c} />
                      </Box>
                    </Box>

                    <Box sx={{ mb: 1.75 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                          {pesos(c.ingreso_actual)} de {pesos(c.objetivo_anual)}
                        </Typography>
                        <Typography sx={{ fontSize: 12, fontWeight: 800,
                                          color: avance == null ? '#9CA3AF'
                                            : avance >= 80 ? '#059669' : '#F59E0B' }}>
                          {avance == null ? 'sin objetivo' : `${avance}%`}
                        </Typography>
                      </Box>
                      <Box sx={{ height: 7, borderRadius: 4, bgcolor: '#EEF2F7', overflow: 'hidden' }}>
                        <Box sx={{
                          height: '100%', width: `${Math.min(100, avance ?? 0)}%`,
                          bgcolor: (avance ?? 0) >= 80 ? '#059669' : '#F59E0B',
                          borderRadius: 4,
                        }} />
                      </Box>
                    </Box>

                    {!!suyos.length && (
                      <Box sx={{ mb: 1.5 }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary',
                                          textTransform: 'uppercase', letterSpacing: '.04em', mb: 0.75 }}>
                          Indicadores pactados
                        </Typography>
                        <IndicadoresDeCuenta contratoId={suyos[0].id} />
                      </Box>
                    )}

                    {c.estrategia && (
                      <Box sx={{ mb: 1.5 }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary',
                                          textTransform: 'uppercase', letterSpacing: '.04em', mb: 0.5 }}>
                          Estrategia
                        </Typography>
                        <Typography sx={{ fontSize: 12.5, lineHeight: 1.55 }}>
                          {c.estrategia}
                        </Typography>
                      </Box>
                    )}

                    {!!susRiesgos.length && (
                      <Box sx={{ mb: 1.5 }}>
                        {susRiesgos.map(r => (
                          <Box key={r.id} sx={{
                            p: 1.25, mb: 0.75, borderRadius: 1.25,
                            bgcolor: alpha(COLOR_RIESGO[r.nivel] || '#F59E0B', 0.07),
                            border: `1px solid ${alpha(COLOR_RIESGO[r.nivel] || '#F59E0B', 0.25)}`,
                          }}>
                            <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                              {r.tipo_riesgo}
                            </Typography>
                            <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                              {r.descripcion}
                            </Typography>
                            {r.plan_mitigacion && (
                              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mt: 0.25 }}>
                                <b>Plan:</b> {r.plan_mitigacion}
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </Box>
                    )}

                    {c.proxima_reunion && (
                      <Box sx={{
                        display: 'flex', alignItems: 'center', gap: 1,
                        pt: 1.25, borderTop: `1px solid ${BORDE}`,
                      }}>
                        <EventAvailable sx={{ fontSize: 16, color: CRM_COLOR }} />
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                          Próxima reunión: <b>{fecha(c.proxima_reunion)}</b>
                        </Typography>
                      </Box>
                    )}
                  </Panel>
                </Grid>
              )
            })}
          </Grid>
        </Estado>

        <crud.Dialogos />
      </Box>
    </Layout>
  )
}

function IndicadoresDeCuenta({ contratoId }: { contratoId: number }) {
  const sla = useQuery({
    queryKey: ['crm', 'sla', contratoId],
    queryFn: () => crmApi.slaDeContrato(contratoId),
  })
  if (!sla.data?.length) return null
  return (
    <Grid container spacing={1}>
      {sla.data.map(s => {
        const objetivo = num(s.objetivo)
        const actual = num(s.valor_actual)
        const cumple = menorEsMejor(s.unidad) ? actual <= objetivo : actual >= objetivo
        const col = s.valor_actual == null ? '#94A3B8' : cumple ? '#059669' : '#EF4444'
        const unidad = s.unidad === '%' ? '%' : ` ${s.unidad || ''}`
        return (
          <Grid key={s.id} size={{ xs: 6 }}>
            <Box sx={{
              p: 1, borderRadius: 1.25, bgcolor: alpha(col, 0.07),
              border: `1px solid ${alpha(col, 0.22)}`,
            }}>
              <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: col,
                                fontVariantNumeric: 'tabular-nums' }}>
                {s.valor_actual == null ? '—' : `${actual}${unidad}`}
              </Typography>
              <Typography sx={{ fontSize: 10, color: 'text.secondary', lineHeight: 1.3 }}>
                {s.indicador}
              </Typography>
              <Typography sx={{ fontSize: 9.5, color: 'text.disabled' }}>
                pactado {objetivo}{unidad}
              </Typography>
            </Box>
          </Grid>
        )
      })}
    </Grid>
  )
}
