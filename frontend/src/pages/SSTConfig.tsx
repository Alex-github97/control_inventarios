import React, { useState } from 'react'
import { Box, Typography, Grid, Card, CardContent, Chip, alpha, Button, TextField, Switch, FormControlLabel, Tabs, Tab, Slider, Divider } from '@mui/material'
import { Settings, Notifications, Tune, Save } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const SST_COLOR = '#C53030'
const #E5E7EB  = 'rgba(197,48,48,0.2)'

const SX_INPUT = {
  '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: '#E5E7EB' } },
  '& .MuiInputLabel-root': { color: 'text.secondary' },
}
const SX_SWITCH = {
  '& .MuiSwitch-switchBase.Mui-checked': { color: SST_COLOR },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: SST_COLOR },
}
const SX_TABS = {
  borderBottom: '1px solid #F1F5F9', mb: 3,
  '& .MuiTab-root': { color: 'text.secondary', fontSize: 13, textTransform: 'none' },
  '& .Mui-selected': { color: '#F87171 !important' },
  '& .MuiTabs-indicator': { backgroundColor: SST_COLOR },
}

interface SectionTitleProps { children: React.ReactNode }
function SectionTitle({ children }: SectionTitleProps) {
  return <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'text.disabled', mb: 1.5 }}>{children}</Typography>
}

export default function SSTConfig() {
  const [tab, setTab]   = useState(0)

  // Tab 0 — Empresa / SG-SST
  const [empresa, setEmpresa]         = useState('Icoltrans S.A.S.')
  const [nit, setNit]                 = useState('900.123.456-7')
  const [arl, setArl]                 = useState('Sura')
  const [claseRiesgo, setClaseRiesgo] = useState('III')
  const [coord, setCoord]             = useState('Andrés Torres')
  const [correoCoord, setCorreoCoord] = useState('sst@icoltrans.com.co')
  const [vig, setVig]                 = useState('2026-12-31')
  const [trabaj, setTrabaj]           = useState('94')

  // Tab 1 — Alertas
  const [alertIncidente, setAlertIncidente]       = useState(true)
  const [alertInspeccion, setAlertInspeccion]     = useState(true)
  const [alertEPPVencer, setAlertEPPVencer]       = useState(true)
  const [diasPrevioEPP, setDiasPrevioEPP]         = useState(60)
  const [alertCapacitacion, setAlertCapacitacion] = useState(true)
  const [diasPreviosCap, setDiasPreviosCap]       = useState(7)
  const [alertDocumentos, setAlertDocumentos]     = useState(true)
  const [diasPreviosDoc, setDiasPreviosDoc]       = useState(30)
  const [emailAlertas, setEmailAlertas]           = useState('operaciones@icoltrans.com.co')

  // Tab 2 — Umbrales
  const [metaDiasAcc, setMetaDiasAcc]     = useState(60)
  const [metaIF, setMetaIF]               = useState(10)
  const [metaIS, setMetaIS]               = useState(100)
  const [metaCap, setMetaCap]             = useState(90)
  const [metaInsp, setMetaInsp]           = useState(95)
  const [metaEPP, setMetaEPP]             = useState(100)
  const [autoClose, setAutoClose]         = useState(true)
  const [diasAutoClose, setDiasAutoClose] = useState(30)

  const [saved, setSaved] = useState(false)

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Settings sx={{ color: SST_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1 }}>Configuración SST</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>Parámetros del SG-SST, alertas y umbrales de cumplimiento</Typography>
            </Box>
            <Chip label="SG-SST" size="small" sx={{ bgcolor: alpha(SST_COLOR, 0.15), color: '#F87171', fontWeight: 700, border: `1px solid ${alpha(SST_COLOR, 0.35)}` }} />
          </Box>
          <Button variant="contained" startIcon={<Save />} onClick={handleSave}
            sx={{ bgcolor: saved ? '#22c55e' : SST_COLOR, transition: 'background 0.3s' }}>
            {saved ? 'Guardado' : 'Guardar cambios'}
          </Button>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={SX_TABS}>
          <Tab icon={<Settings sx={{ fontSize: 16 }} />} iconPosition="start" label="Empresa / SG-SST" />
          <Tab icon={<Notifications sx={{ fontSize: 16 }} />} iconPosition="start" label="Alertas y notificaciones" />
          <Tab icon={<Tune sx={{ fontSize: 16 }} />} iconPosition="start" label="Umbrales e indicadores" />
        </Tabs>

        {/* Tab 0: Empresa */}
        {tab === 0 && (
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ border: `1px solid #E5E7EB`, borderRadius: 2 }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <SectionTitle>Información de la empresa</SectionTitle>
                  <TextField label="Razón social" value={empresa} onChange={e => setEmpresa(e.target.value)} fullWidth size="small" sx={SX_INPUT} />
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField label="NIT" value={nit} onChange={e => setNit(e.target.value)} fullWidth size="small" sx={SX_INPUT} />
                    <TextField label="No. trabajadores" value={trabaj} onChange={e => setTrabaj(e.target.value)} size="small" sx={{ ...SX_INPUT, width: 140 }} />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField label="ARL" value={arl} onChange={e => setArl(e.target.value)} fullWidth size="small" sx={SX_INPUT} />
                    <TextField label="Clase de riesgo" value={claseRiesgo} onChange={e => setClaseRiesgo(e.target.value)} size="small" sx={{ ...SX_INPUT, width: 140 }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ border: `1px solid #E5E7EB`, borderRadius: 2 }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <SectionTitle>Responsable del SG-SST</SectionTitle>
                  <TextField label="Coordinador SST" value={coord} onChange={e => setCoord(e.target.value)} fullWidth size="small" sx={SX_INPUT} />
                  <TextField label="Correo del coordinador" value={correoCoord} onChange={e => setCorreoCoord(e.target.value)} fullWidth size="small" sx={SX_INPUT} />
                  <TextField label="Vigencia actual del SG-SST" type="date" value={vig} onChange={e => setVig(e.target.value)} fullWidth size="small" sx={SX_INPUT} InputLabelProps={{ shrink: true }} />
                  <Box sx={{ p: 1.5, bgcolor: alpha(SST_COLOR, 0.08), borderRadius: 1.5, border: `1px solid ${alpha(SST_COLOR, 0.2)}` }}>
                    <Typography sx={{ fontSize: 11, color: '#F87171' }}>Normas de referencia: Decreto 1072/2015, Resolución 0312/2019, Resolución 2400/1979</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Tab 1: Alertas */}
        {tab === 1 && (
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ border: `1px solid #E5E7EB`, borderRadius: 2 }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <SectionTitle>Alertas automáticas</SectionTitle>
                  <FormControlLabel label={<Typography sx={{ fontSize: 13, color: 'text.primary' }}>Notificar nuevos incidentes/accidentes</Typography>}
                    control={<Switch checked={alertIncidente} onChange={e => setAlertIncidente(e.target.checked)} size="small" sx={SX_SWITCH} />} />
                  <FormControlLabel label={<Typography sx={{ fontSize: 13, color: 'text.primary' }}>Inspecciones vencidas sin completar</Typography>}
                    control={<Switch checked={alertInspeccion} onChange={e => setAlertInspeccion(e.target.checked)} size="small" sx={SX_SWITCH} />} />
                  <Divider sx={{ borderColor: '#F1F5F9' }} />
                  <FormControlLabel label={<Typography sx={{ fontSize: 13, color: 'text.primary' }}>EPP próximo a vencer</Typography>}
                    control={<Switch checked={alertEPPVencer} onChange={e => setAlertEPPVencer(e.target.checked)} size="small" sx={SX_SWITCH} />} />
                  {alertEPPVencer && (
                    <Box sx={{ pl: 4 }}>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.5 }}>Días de anticipación: {diasPrevioEPP}</Typography>
                      <Slider value={diasPrevioEPP} onChange={(_, v) => setDiasPrevioEPP(v as number)} min={7} max={180} step={7}
                        sx={{ color: SST_COLOR, '& .MuiSlider-rail': { bgcolor: '#E2E8F0' } }} />
                    </Box>
                  )}
                  <FormControlLabel label={<Typography sx={{ fontSize: 13, color: 'text.primary' }}>Capacitaciones próximas a realizarse</Typography>}
                    control={<Switch checked={alertCapacitacion} onChange={e => setAlertCapacitacion(e.target.checked)} size="small" sx={SX_SWITCH} />} />
                  {alertCapacitacion && (
                    <Box sx={{ pl: 4 }}>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.5 }}>Días de anticipación: {diasPreviosCap}</Typography>
                      <Slider value={diasPreviosCap} onChange={(_, v) => setDiasPreviosCap(v as number)} min={1} max={30}
                        sx={{ color: SST_COLOR, '& .MuiSlider-rail': { bgcolor: '#E2E8F0' } }} />
                    </Box>
                  )}
                  <FormControlLabel label={<Typography sx={{ fontSize: 13, color: 'text.primary' }}>Documentos próximos a vencer revisión</Typography>}
                    control={<Switch checked={alertDocumentos} onChange={e => setAlertDocumentos(e.target.checked)} size="small" sx={SX_SWITCH} />} />
                  {alertDocumentos && (
                    <Box sx={{ pl: 4 }}>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.5 }}>Días de anticipación: {diasPreviosDoc}</Typography>
                      <Slider value={diasPreviosDoc} onChange={(_, v) => setDiasPreviosDoc(v as number)} min={7} max={90} step={7}
                        sx={{ color: SST_COLOR, '& .MuiSlider-rail': { bgcolor: '#E2E8F0' } }} />
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ border: `1px solid #E5E7EB`, borderRadius: 2 }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <SectionTitle>Destino de notificaciones</SectionTitle>
                  <TextField label="Correo para alertas SST" value={emailAlertas} onChange={e => setEmailAlertas(e.target.value)} fullWidth size="small" sx={SX_INPUT} />
                  <Box sx={{ p: 1.5, bgcolor: '#F9FAFB', borderRadius: 1.5, border: '1px solid #E5E7EB' }}>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.5 }}>
                      Las alertas también se enviarán al coordinador SST configurado en la pestaña "Empresa / SG-SST". Para múltiples destinatarios, separe los correos con coma.
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Tab 2: Umbrales */}
        {tab === 2 && (
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ border: `1px solid #E5E7EB`, borderRadius: 2 }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <SectionTitle>Metas de indicadores clave</SectionTitle>
                  {[
                    { label: 'Días sin accidente (meta mínima)', value: metaDiasAcc, set: setMetaDiasAcc, min: 0, max: 365 },
                    { label: 'Índice de Frecuencia — meta máxima', value: metaIF, set: setMetaIF, min: 0, max: 50 },
                    { label: 'Índice de Severidad — meta máxima', value: metaIS, set: setMetaIS, min: 0, max: 500 },
                  ].map(cfg => (
                    <Box key={cfg.label}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{cfg.label}</Typography>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#F87171' }}>{cfg.value}</Typography>
                      </Box>
                      <Slider value={cfg.value} onChange={(_, v) => cfg.set(v as number)} min={cfg.min} max={cfg.max}
                        sx={{ color: SST_COLOR, '& .MuiSlider-rail': { bgcolor: '#E2E8F0' } }} />
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ border: `1px solid #E5E7EB`, borderRadius: 2 }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <SectionTitle>Metas de cumplimiento (%)</SectionTitle>
                  {[
                    { label: 'Cumplimiento capacitaciones',  value: metaCap,  set: setMetaCap  },
                    { label: 'Cumplimiento inspecciones',    value: metaInsp, set: setMetaInsp },
                    { label: 'Cobertura EPP',                value: metaEPP,  set: setMetaEPP  },
                  ].map(cfg => (
                    <Box key={cfg.label}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{cfg.label}</Typography>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: '#F87171' }}>{cfg.value}%</Typography>
                      </Box>
                      <Slider value={cfg.value} onChange={(_, v) => cfg.set(v as number)} min={50} max={100}
                        sx={{ color: SST_COLOR, '& .MuiSlider-rail': { bgcolor: '#E2E8F0' } }} />
                    </Box>
                  ))}
                  <Divider sx={{ borderColor: '#F1F5F9' }} />
                  <FormControlLabel label={<Typography sx={{ fontSize: 13, color: 'text.primary' }}>Cierre automático de incidentes investigados</Typography>}
                    control={<Switch checked={autoClose} onChange={e => setAutoClose(e.target.checked)} size="small" sx={SX_SWITCH} />} />
                  {autoClose && (
                    <Box sx={{ pl: 4 }}>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary', mb: 0.5 }}>Días tras investigación: {diasAutoClose}</Typography>
                      <Slider value={diasAutoClose} onChange={(_, v) => setDiasAutoClose(v as number)} min={7} max={90} step={7}
                        sx={{ color: SST_COLOR, '& .MuiSlider-rail': { bgcolor: '#E2E8F0' } }} />
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>
    </Layout>
  )
}
