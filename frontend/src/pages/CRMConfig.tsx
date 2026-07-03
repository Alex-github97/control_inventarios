import React, { useState } from 'react'
import { Box, Grid, Typography, Tab, Tabs, Chip, Switch, alpha } from '@mui/material'
import { Settings } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const CRM_COLOR = '#DC2626'
const #E5E7EB  = '#E5E7EB'

const INTEGRACIONES = [
  { nombre: 'ERP',  desc: 'Sincroniza facturación, pagos e ingresos reales en tiempo real',                color: '#0EA5E9', activa: true  },
  { nombre: 'WMS',  desc: 'Inventario, despachos y exactitud de bodega conectados a OTIF',                 color: '#059669', activa: true  },
  { nombre: 'TMS',  desc: 'Entregas, rutas y KPIs de transporte para cálculo de OTIF',                    color: '#7C3AED', activa: true  },
  { nombre: 'DMS',  desc: 'Contratos y documentos firmados digitalmente almacenados en DMS',               color: '#F59E0B', activa: true  },
  { nombre: 'QMS',  desc: 'Tickets PQRS generan No Conformidades automáticas en QMS',                     color: '#EF4444', activa: false },
  { nombre: 'GRC',  desc: 'Riesgos de cliente clasificados y gestionados en el módulo GRC',               color: CRM_COLOR, activa: false },
  { nombre: 'HCM',  desc: 'Ejecutivos comerciales, equipos y estructura organizacional desde HCM',         color: '#8B5CF6', activa: true  },
  { nombre: 'LMS',  desc: 'Capacitación de equipos comerciales y onboarding de ejecutivos',               color: '#D97706', activa: false },
]

const UMBRALES = [
  { param: 'Health Score — Alerta Amarilla', valor: 60, tipo: 'puntaje', min: 30, max: 80 },
  { param: 'Health Score — Alerta Roja',     valor: 40, tipo: 'puntaje', min: 10, max: 60 },
  { param: 'Churn Risk — Escalación',        valor: 30, tipo: '%',       min: 10, max: 60 },
  { param: 'Lead Score — Caliente',          valor: 75, tipo: 'puntaje', min: 50, max: 100 },
  { param: 'Lead Score — Tibio',             valor: 50, tipo: 'puntaje', min: 25, max: 75 },
  { param: 'SLA — Alerta Vencimiento',       valor: 30, tipo: 'días',    min: 7,  max: 90 },
  { param: 'Contrato — Alerta Renovación',   valor: 60, tipo: 'días',    min: 30, max: 120 },
  { param: 'OTIF — Umbral de Alerta',        valor: 90, tipo: '%',       min: 80, max: 98 },
]

const NOTIFICACIONES = [
  { tipo: 'Contrato próximo a vencer (SLA configurado)',  canal: 'Email + Push', activa: true },
  { tipo: 'Health Score bajo el umbral de alerta',        canal: 'Email + Push', activa: true },
  { tipo: 'Ticket escalado sin respuesta',                canal: 'Push',         activa: true },
  { tipo: 'Lead nuevo calificado como CALIENTE',          canal: 'Push',         activa: true },
  { tipo: 'Oportunidad sin movimiento en 14 días',        canal: 'Email',        activa: false },
  { tipo: 'OTIF por debajo del umbral contractual',       canal: 'Email + Push', activa: true },
  { tipo: 'Encuesta NPS con detractor (<6)',              canal: 'Email + Push', activa: true },
  { tipo: 'Riesgo de churn superó umbral IA',            canal: 'Push',         activa: false },
]

const LEAD_SCORING = [
  { factor: 'Industria objetivo (Retail, Alimentos, Farmacéutico)', peso: 25 },
  { factor: 'Tamaño de empresa (empleados, ingresos)',              peso: 20 },
  { factor: 'Interacción activa con la empresa (web, email)',       peso: 20 },
  { factor: 'Cargo del contacto (C-Level, Dirección)',             peso: 15 },
  { factor: 'Fuente del lead (referido, evento)',                  peso: 10 },
  { factor: 'Coincidencia con perfil de cliente ganador',          peso: 10 },
]

export default function CRMConfig() {
  const [tab, setTab] = useState(0)
  const [notifs, setNotifs]   = useState(NOTIFICACIONES.map(n => n.activa))
  const [integs, setIntegs]   = useState(INTEGRACIONES.map(i => i.activa))

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Settings sx={{ color: 'text.primary', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary' }}>Configuración CRM</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Umbrales · Notificaciones · Lead Scoring · Integraciones
            </Typography>
          </Box>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{ mb: 3, '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 600 }, '& .Mui-selected': { color: `${CRM_COLOR} !important` }, '& .MuiTabs-indicator': { bgcolor: CRM_COLOR } }}>
          <Tab label="Umbrales" />
          <Tab label="Notificaciones" />
          <Tab label="Lead Scoring" />
          <Tab label="Integraciones" />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ bgcolor: 'text.primary', border: `1px solid #E5E7EB`, borderRadius: 2, p: 2.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 2 }}>Parámetros y Umbrales del Sistema</Typography>
            {UMBRALES.map((u, i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.75, borderBottom: '1px solid #F1F5F9' }}>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>{u.param}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.disabled', mt: 0.25 }}>Rango: {u.min} – {u.max} {u.tipo}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ px: 2, py: 0.75, bgcolor: alpha(CRM_COLOR, 0.12), border: `1px solid ${alpha(CRM_COLOR, 0.25)}`, borderRadius: 1, minWidth: 70, textAlign: 'center' }}>
                    <Typography sx={{ fontSize: 16, fontWeight: 900, color: CRM_COLOR }}>{u.valor}</Typography>
                    <Typography sx={{ fontSize: 9.5, color: 'text.disabled' }}>{u.tipo}</Typography>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {tab === 1 && (
          <Box sx={{ bgcolor: 'text.primary', border: `1px solid #E5E7EB`, borderRadius: 2, p: 2.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 2 }}>Configuración de Alertas y Notificaciones</Typography>
            {NOTIFICACIONES.map((n, i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.75, borderBottom: '1px solid #F1F5F9' }}>
                <Box>
                  <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>{n.tipo}</Typography>
                  <Chip label={n.canal} size="small" sx={{ bgcolor: '#F1F5F9', color: 'text.secondary', fontSize: 10, mt: 0.75 }} />
                </Box>
                <Switch checked={notifs[i]} onChange={e => setNotifs(prev => { const c = [...prev]; c[i] = e.target.checked; return c })}
                  sx={{ '& .MuiSwitch-thumb': { bgcolor: notifs[i] ? CRM_COLOR : '#4B5563' }, '& .MuiSwitch-track': { bgcolor: notifs[i] ? alpha(CRM_COLOR, 0.35) : '#D1D5DB' } }} />
              </Box>
            ))}
          </Box>
        )}

        {tab === 2 && (
          <Box sx={{ bgcolor: 'text.primary', border: `1px solid #E5E7EB`, borderRadius: 2, p: 2.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary', mb: 0.5 }}>Modelo de Lead Scoring IA</Typography>
            <Typography sx={{ fontSize: 12, color: 'text.disabled', mb: 2.5 }}>Suma de pesos = 100 · Umbral CALIENTE: ≥75 · TIBIO: 50-74 · FRÍO: &lt;50</Typography>
            {LEAD_SCORING.map((f, i) => (
              <Box key={i} sx={{ mb: 2.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                  <Typography sx={{ fontSize: 12.5, color: 'text.primary', fontWeight: 500 }}>{f.factor}</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 900, color: CRM_COLOR }}>{f.peso}%</Typography>
                </Box>
                <Box sx={{ height: 8, borderRadius: 4, bgcolor: '#E2E8F0', overflow: 'hidden' }}>
                  <Box sx={{ height: '100%', width: `${f.peso * 4}%`, bgcolor: CRM_COLOR, borderRadius: 4 }} />
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {tab === 3 && (
          <Grid container spacing={2}>
            {INTEGRACIONES.map((int, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                <Box sx={{ bgcolor: 'text.primary', border: `1px solid ${alpha(integs[i] ? int.color : '#4B5563', 0.3)}`, borderRadius: 2, p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Box>
                      <Box sx={{ display: 'inline-flex', px: 1.5, py: 0.5, bgcolor: alpha(int.color, 0.15), borderRadius: 1, mb: 0.75 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 900, color: int.color }}>{int.nombre}</Typography>
                      </Box>
                    </Box>
                    <Switch checked={integs[i]} onChange={e => setIntegs(prev => { const c = [...prev]; c[i] = e.target.checked; return c })}
                      size="small"
                      sx={{ '& .MuiSwitch-thumb': { bgcolor: integs[i] ? int.color : '#4B5563' }, '& .MuiSwitch-track': { bgcolor: integs[i] ? alpha(int.color, 0.35) : '#D1D5DB' } }} />
                  </Box>
                  <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.5 }}>{int.desc}</Typography>
                  <Chip label={integs[i] ? 'Conectado' : 'Desconectado'} size="small"
                    sx={{ mt: 1.5, bgcolor: integs[i] ? alpha('#059669', 0.12) : alpha('#4B5563', 0.1), color: integs[i] ? '#059669' : '#6B7280', fontSize: 10 }} />
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Layout>
  )
}
