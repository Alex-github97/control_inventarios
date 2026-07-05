// GRC Module — Configuración
import React, { useState } from 'react'
import {
  Box, Typography, Grid, Card, CardContent, Chip, alpha, Tab, Tabs,
  Switch, FormControlLabel, Slider, Button, Divider,
} from '@mui/material'
import {
  Settings, CheckCircle, CheckCircleOutline,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const GRC_COLOR = '#6D28D9'
const BORDER = '#E5E7EB'

interface TabPanelProps { children?: React.ReactNode; index: number; value: number }
function TabPanel({ children, value, index }: TabPanelProps) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

const SX_SWITCH = { '& .MuiSwitch-switchBase.Mui-checked': { color: GRC_COLOR }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: GRC_COLOR } }
const SX_LABEL = { color: 'text.secondary', '& .MuiFormControlLabel-label': { fontSize: 13 } }

const MARCOS = [
  { nombre: 'ISO 31000:2018', desc: 'Gestión del Riesgo', activo: true, version: '2018' },
  { nombre: 'ISO 37301:2021', desc: 'Sistemas de Gestión de Compliance', activo: true, version: '2021' },
  { nombre: 'ISO 27001:2022', desc: 'Seguridad de la Información', activo: true, version: '2022' },
  { nombre: 'ISO 22301:2019', desc: 'Continuidad del Negocio', activo: true, version: '2019' },
  { nombre: 'COSO ERM 2017', desc: 'Enterprise Risk Management', activo: true, version: '2017' },
  { nombre: 'COBIT 2019', desc: 'Gobernanza de TI', activo: false, version: '2019' },
  { nombre: 'NIST CSF 2.0', desc: 'Ciberseguridad Framework', activo: false, version: '2.0' },
]

const INTEGRACIONES = [
  { nombre: 'DMS', desc: 'Gestión Documental — evidencias y políticas', estado: 'activo', color: '#0891B2' },
  { nombre: 'QMS', desc: 'Calidad — NC, CAPA, riesgos de calidad', estado: 'activo', color: '#059669' },
  { nombre: 'HCM', desc: 'RRHH — capacitaciones, aceptaciones', estado: 'activo', color: '#D97706' },
  { nombre: 'WMS', desc: 'Bodega — incidentes operacionales', estado: 'activo', color: '#7C3AED' },
  { nombre: 'TMS', desc: 'Transporte — incidentes en ruta', estado: 'inactivo', color: '#EA580C' },
  { nombre: 'ERP', desc: 'Financiero — cumplimiento tributario', estado: 'inactivo', color: '#6B7280' },
  { nombre: 'SMTP', desc: 'Notificaciones por correo electrónico', estado: 'activo', color: '#059669' },
]

export default function GRCConfig() {
  const [tab, setTab] = useState(0)
  const [saved, setSaved] = useState(false)
  const [umbralRiesgo, setUmbralRiesgo]       = useState<number>(15)
  const [umbralCumpl, setUmbralCumpl]         = useState<number>(70)
  const [umbralHallazgo, setUmbralHallazgo]   = useState<number>(30)
  const [umbralTercero, setUmbralTercero]     = useState<number>(60)
  const [notifs, setNotifs] = useState({
    riesgo_critico: true, hallazgo_vencido: true, politica_vencer: true,
    incidente_critico: true, obligacion_vencer: true, auditoria_planificada: true,
    simulacro_pendiente: false, control_evaluar: false,
  })

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Settings sx={{ color: GRC_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Configuración GRC</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>GRC · Marcos Normativos · Umbrales · Notificaciones · Integraciones</Typography>
            </Box>
            <Chip label="GRC" size="small" sx={{ bgcolor: alpha(GRC_COLOR, 0.15), color: GRC_COLOR, fontWeight: 700, border: `1px solid ${alpha(GRC_COLOR, 0.35)}` }} />
          </Box>
          <Button variant="contained" startIcon={saved ? <CheckCircle /> : undefined} onClick={handleSave}
            sx={{ bgcolor: saved ? '#059669' : GRC_COLOR, '&:hover': { bgcolor: saved ? '#047857' : '#5B21B6' }, borderRadius: 2, transition: 'all 0.3s' }}>
            {saved ? 'Guardado' : 'Guardar Cambios'}
          </Button>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid #F1F5F9', '& .MuiTab-root': { color: 'text.disabled', fontSize: 13 }, '& .Mui-selected': { color: GRC_COLOR }, '& .MuiTabs-indicator': { bgcolor: GRC_COLOR } }}>
          <Tab label="Marcos Normativos" />
          <Tab label="Umbrales" />
          <Tab label="Notificaciones" />
          <Tab label="Integraciones" />
        </Tabs>

        <TabPanel value={tab} index={0}>
          <Grid container spacing={2}>
            {MARCOS.map(m => (
              <Grid key={m.nombre} size={{ xs: 12, md: 6, lg: 4 }}>
                <Card sx={{ bgcolor: '#fff', border: `1px solid ${alpha(m.activo ? GRC_COLOR : '#374151', 0.4)}`, borderRadius: 2 }}>
                  <CardContent sx={{ p: '14px !important' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography sx={{ fontWeight: 700, color: m.activo ? 'text.primary' : 'text.disabled', fontSize: 14 }}>{m.nombre}</Typography>
                        <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mb: 1 }}>{m.desc}</Typography>
                        <Chip label={`v${m.version}`} size="small" sx={{ fontSize: 9, height: 16, bgcolor: '#F1F5F9', color: 'text.secondary' }} />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {m.activo ? <CheckCircle sx={{ fontSize: 18, color: GRC_COLOR }} /> : <CheckCircleOutline sx={{ fontSize: 18, color: 'text.disabled' }} />}
                        <Typography sx={{ fontSize: 11, color: m.activo ? GRC_COLOR : 'text.disabled' }}>{m.activo ? 'Activo' : 'Inactivo'}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        <TabPanel value={tab} index={1}>
          <Card sx={{ bgcolor: '#fff', border: `1px solid #E5E7EB`, borderRadius: 2, maxWidth: 640 }}>
            <CardContent sx={{ p: 3 }}>
              {[
                { label: 'Nivel de riesgo crítico (umbral alerta)', value: umbralRiesgo, set: setUmbralRiesgo, min: 10, max: 25, color: '#DC2626', desc: 'Riesgos con nivel ≥ umbral se clasifican automáticamente como CRÍTICOS' },
                { label: 'Puntaje mínimo de cumplimiento (%)', value: umbralCumpl, set: setUmbralCumpl, min: 50, max: 90, color: GRC_COLOR, desc: 'Procesos bajo este umbral generan alerta de incumplimiento' },
                { label: 'Días máximos para cerrar hallazgo', value: umbralHallazgo, set: setUmbralHallazgo, min: 15, max: 90, color: '#D97706', desc: 'Hallazgos que superen este límite se marcan como VENCIDOS' },
                { label: 'Puntaje mínimo de tercero (%)', value: umbralTercero, set: setUmbralTercero, min: 40, max: 80, color: '#EA580C', desc: 'Terceros bajo este umbral se clasifican como nivel de riesgo ALTO' },
              ].map(u => (
                <Box key={u.label} sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: 13, color: 'text.primary', fontWeight: 600 }}>{u.label}</Typography>
                    <Typography sx={{ fontSize: 16, fontWeight: 800, color: u.color }}>{u.value}{u.min < 50 ? '' : '%'}</Typography>
                  </Box>
                  <Slider value={u.value} onChange={(_, v) => u.set(v as number)} min={u.min} max={u.max} step={1} marks sx={{ color: u.color, mb: 0.5 }} />
                  <Typography sx={{ fontSize: 11, color: 'text.disabled' }}>{u.desc}</Typography>
                  <Divider sx={{ borderColor: '#F1F5F9', mt: 2 }} />
                </Box>
              ))}
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tab} index={2}>
          <Card sx={{ bgcolor: '#fff', border: `1px solid #E5E7EB`, borderRadius: 2, maxWidth: 520 }}>
            <CardContent sx={{ p: 3 }}>
              <Typography sx={{ fontSize: 12, color: 'text.disabled', mb: 2 }}>Activar o desactivar alertas automáticas del sistema GRC</Typography>
              {[
                ['riesgo_critico',      'Nuevo riesgo clasificado como CRÍTICO'],
                ['hallazgo_vencido',    'Hallazgo que supera la fecha límite'],
                ['politica_vencer',     'Política a 60 días de vencer'],
                ['incidente_critico',   'Incidente con severidad CRÍTICA reportado'],
                ['obligacion_vencer',   'Obligación normativa a 90 días de vencer'],
                ['auditoria_planificada','Auditoría planificada próxima a 15 días'],
                ['simulacro_pendiente', 'Simulacro de continuidad pendiente'],
                ['control_evaluar',     'Control con evaluación próxima a 7 días'],
              ].map(([key, label]) => (
                <FormControlLabel
                  key={key}
                  sx={{ ...SX_LABEL, display: 'flex', justifyContent: 'space-between', width: '100%', mx: 0, mb: 0.5 }}
                  control={<Switch size="small" checked={notifs[key as keyof typeof notifs]} onChange={e => setNotifs(n => ({ ...n, [key]: e.target.checked }))} sx={SX_SWITCH} />}
                  label={label}
                  labelPlacement="start"
                />
              ))}
            </CardContent>
          </Card>
        </TabPanel>

        <TabPanel value={tab} index={3}>
          <Grid container spacing={2}>
            {INTEGRACIONES.map(i => (
              <Grid key={i.nombre} size={{ xs: 12, sm: 6, md: 4 }}>
                <Card sx={{ bgcolor: '#fff', border: `1px solid ${alpha(i.estado === 'activo' ? i.color : '#374151', 0.35)}`, borderRadius: 2 }}>
                  <CardContent sx={{ p: '14px !important' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Chip label={i.nombre} sx={{ bgcolor: alpha(i.estado === 'activo' ? i.color : '#374151', 0.18), color: i.estado === 'activo' ? i.color : '#6B7280', fontWeight: 700, fontSize: 12 }} />
                      <Chip label={i.estado} size="small" sx={{ fontSize: 10, height: 20, bgcolor: alpha(i.estado === 'activo' ? '#059669' : '#374151', 0.2), color: i.estado === 'activo' ? '#059669' : '#6B7280' }} />
                    </Box>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.4 }}>{i.desc}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>
      </Box>
    </Layout>
  )
}
