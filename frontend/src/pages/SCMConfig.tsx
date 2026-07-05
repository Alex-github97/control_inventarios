import React, { useState } from 'react'
import { Box, Typography, Grid, Card, CardContent, Chip, alpha, Switch, FormControlLabel, Button, Divider, TextField, Tab, Tabs } from '@mui/material'
import { Settings, Notifications, IntegrationInstructions, Security, Save } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const SCM_COLOR = '#0C4D8C'
const BORDER  = `rgba(12,77,140,0.25)`

const SX_INPUT = {
  '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: BORDER } },
}

interface ConfigItem { label: string; description: string; key: string }

const NOTIF_ITEMS: ConfigItem[] = [
  { key: 'notif_nueva_sol',   label: 'Nueva solicitud creada',        description: 'Notificar al jefe de compras cuando se crea una solicitud' },
  { key: 'notif_aprobacion',  label: 'Solicitud pendiente de aprobación', description: 'Recordatorio cuando hay solicitudes >48 h sin gestionar' },
  { key: 'notif_oc_enviada',  label: 'OC enviada al proveedor',       description: 'Confirmación interna al emitir una orden de compra' },
  { key: 'notif_oc_vencida',  label: 'OC sin respuesta del proveedor', description: 'Alerta si el proveedor no confirma en 72 h' },
  { key: 'notif_stock_min',   label: 'Alerta de stock mínimo',        description: 'Notificar cuando un SKU baje del nivel mínimo configurado' },
  { key: 'notif_riesgo_crit', label: 'Riesgo de cadena crítico',      description: 'Alerta inmediata al registrar riesgo de impacto CRÍTICO' },
]

const FLUJO_ITEMS: ConfigItem[] = [
  { key: 'flujo_aprobacion_2', label: 'Doble aprobación para OC >$50 M', description: 'Requiere aprobación de gerencia para órdenes superiores' },
  { key: 'flujo_eval_prov',    label: 'Evaluación automática de proveedor', description: 'Generar evaluación al cerrar cada orden de compra' },
  { key: 'flujo_sol_item',     label: 'Mínimo un ítem en solicitud',     description: 'Bloquear solicitudes sin ítems detallados' },
  { key: 'flujo_otd_track',    label: 'Registro automático OTD',         description: 'Calcular OTD al marcar OC como Recibida' },
]

const INTEG_ITEMS: ConfigItem[] = [
  { key: 'integ_erp',  label: 'Sincronizar con módulo ERP',    description: 'Actualizar maestros de proveedores y órdenes en ERP' },
  { key: 'integ_wms',  label: 'Integración con WMS',           description: 'Sincronizar recepciones de OC con bodega WMS' },
  { key: 'integ_tms',  label: 'Integración con TMS',           description: 'Enviar embarques SCM al módulo de transporte' },
  { key: 'integ_email',label: 'Envío de OC por email al proveedor', description: 'Adjuntar PDF al correo del contacto del proveedor' },
]

function ToggleCard({ item, checked, onChange }: { item: ConfigItem; checked: boolean; onChange: () => void }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: '#F9FAFB', borderRadius: 1.5, gap: 2 }}>
      <Box>
        <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary' }}>{item.label}</Typography>
        <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{item.description}</Typography>
      </Box>
      <Switch checked={checked} onChange={onChange} size="small"
        sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: SCM_COLOR }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: alpha(SCM_COLOR, 0.6) } }} />
    </Box>
  )
}

export default function SCMConfig() {
  const [tab, setTab]     = useState(0)
  const [saved, setSaved] = useState(false)
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    notif_nueva_sol: true, notif_aprobacion: true, notif_oc_enviada: true,
    notif_oc_vencida: false, notif_stock_min: true, notif_riesgo_crit: true,
    flujo_aprobacion_2: true, flujo_eval_prov: true, flujo_sol_item: true, flujo_otd_track: false,
    integ_erp: true, integ_wms: false, integ_tms: false, integ_email: true,
  })

  const [umbrales, setUmbrales] = useState({ aprobacion_monto: '50000000', dias_alerta_oc: '72', email_compras: 'compras@empresa.com', dias_eval_prov: '30' })

  function toggle(key: string) { setToggles(prev => ({ ...prev, [key]: !prev[key] })) }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Settings sx={{ color: SCM_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Configuración SCM</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>Parámetros globales, notificaciones, flujos e integraciones</Typography>
            </Box>
            <Chip label="SCM" size="small" sx={{ bgcolor: alpha(SCM_COLOR, 0.15), color: '#5B9BD5', fontWeight: 700, border: `1px solid ${alpha(SCM_COLOR, 0.35)}` }} />
          </Box>
          <Button variant="contained" startIcon={<Save />} onClick={handleSave} sx={{ bgcolor: saved ? '#22c55e' : SCM_COLOR, transition: 'background-color 0.3s' }}>
            {saved ? '¡Guardado!' : 'Guardar cambios'}
          </Button>
        </Box>

        {/* Tabs */}
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: `1px solid ${BORDER}`, '& .MuiTab-root': { color: 'text.disabled', minHeight: 40, textTransform: 'none' }, '& .Mui-selected': { color: '#5B9BD5' }, '& .MuiTabs-indicator': { bgcolor: SCM_COLOR } }}>
          <Tab label="Notificaciones" icon={<Notifications sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Flujo de trabajo" icon={<Security sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Integraciones" icon={<IntegrationInstructions sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Umbrales" icon={<Settings sx={{ fontSize: 16 }} />} iconPosition="start" />
        </Tabs>

        {/* Tab 0 — Notificaciones */}
        {tab === 0 && (
          <Card sx={{ bgcolor: '#fff', border: `1px solid ${BORDER}`, borderRadius: 2 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8, mb: 0.5 }}>Alertas y notificaciones del módulo SCM</Typography>
              {NOTIF_ITEMS.map(item => (
                <ToggleCard key={item.key} item={item} checked={toggles[item.key]} onChange={() => toggle(item.key)} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Tab 1 — Flujo de trabajo */}
        {tab === 1 && (
          <Card sx={{ bgcolor: '#fff', border: `1px solid ${BORDER}`, borderRadius: 2 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8, mb: 0.5 }}>Reglas del flujo de aprobación y operación</Typography>
              {FLUJO_ITEMS.map(item => (
                <ToggleCard key={item.key} item={item} checked={toggles[item.key]} onChange={() => toggle(item.key)} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Tab 2 — Integraciones */}
        {tab === 2 && (
          <Card sx={{ bgcolor: '#fff', border: `1px solid ${BORDER}`, borderRadius: 2 }}>
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8, mb: 0.5 }}>Conexiones con otros módulos y sistemas externos</Typography>
              {INTEG_ITEMS.map(item => (
                <ToggleCard key={item.key} item={item} checked={toggles[item.key]} onChange={() => toggle(item.key)} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Tab 3 — Umbrales */}
        {tab === 3 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ bgcolor: '#fff', border: `1px solid ${BORDER}`, borderRadius: 2 }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8 }}>Parámetros de aprobación</Typography>
                  <TextField
                    label="Monto máximo sin doble aprobación (COP)"
                    value={umbrales.aprobacion_monto}
                    onChange={e => setUmbrales(u => ({ ...u, aprobacion_monto: e.target.value }))}
                    type="number" fullWidth size="small" sx={SX_INPUT}
                  />
                  <TextField
                    label="Horas para alerta OC sin confirmación"
                    value={umbrales.dias_alerta_oc}
                    onChange={e => setUmbrales(u => ({ ...u, dias_alerta_oc: e.target.value }))}
                    type="number" fullWidth size="small" sx={SX_INPUT}
                  />
                  <TextField
                    label="Días entre evaluaciones de proveedor"
                    value={umbrales.dias_eval_prov}
                    onChange={e => setUmbrales(u => ({ ...u, dias_eval_prov: e.target.value }))}
                    type="number" fullWidth size="small" sx={SX_INPUT}
                  />
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ bgcolor: '#fff', border: `1px solid ${BORDER}`, borderRadius: 2 }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.8 }}>Contactos y correos</Typography>
                  <TextField
                    label="Correo del equipo de compras"
                    value={umbrales.email_compras}
                    onChange={e => setUmbrales(u => ({ ...u, email_compras: e.target.value }))}
                    fullWidth size="small" sx={SX_INPUT}
                  />
                  <Box sx={{ p: 2, bgcolor: alpha(SCM_COLOR, 0.07), borderRadius: 1.5, border: `1px dashed ${alpha(SCM_COLOR, 0.25)}` }}>
                    <Typography sx={{ fontSize: 12, color: alpha('#5B9BD5', 0.85) }}>
                      Las notificaciones por correo se enviarán desde el servidor SMTP configurado en el panel de administración del sistema.
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>
    </Layout>
  )
}
