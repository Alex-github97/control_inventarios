import React, { useState } from 'react'
import { Box, Grid, Typography, Tab, Tabs, Chip, Switch, alpha } from '@mui/material'
import { Settings, Extension, Notifications, Hub } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const LMS_COLOR = '#D97706'
const #E5E7EB  = '#E5E7EB'

const FRAMEWORKS = [
  { nombre: 'SCORM 1.2', desc: 'Estándar clásico de paquetes de curso. Compatible con la mayoría de LMS.', activo: true },
  { nombre: 'SCORM 2004', desc: 'Versión mejorada de SCORM con seguimiento de estado más preciso.', activo: true },
  { nombre: 'xAPI (Tin Can)', desc: 'Modelo moderno de experiencias de aprendizaje. Permite tracking offline.', activo: false },
  { nombre: '70:20:10', desc: 'Marco de aprendizaje: 70% experiencia, 20% social, 10% formal.', activo: true },
]

const NOTIFICACIONES = [
  { tipo: 'Certificación por vencer (30 días)', activo: true, canal: 'Email + Sistema' },
  { tipo: 'Certificación vencida', activo: true, canal: 'Email + Sistema + SMS' },
  { tipo: 'Nuevo curso asignado', activo: true, canal: 'Sistema' },
  { tipo: 'Evaluación disponible', activo: true, canal: 'Email + Sistema' },
  { tipo: 'Insignia obtenida', activo: true, canal: 'Sistema' },
  { tipo: 'Ranking actualizado', activo: false, canal: 'Sistema' },
  { tipo: 'Reto completado', activo: true, canal: 'Sistema' },
  { tipo: 'Recordatorio de curso sin completar', activo: true, canal: 'Email' },
]

const INTEGRACIONES = [
  { modulo: 'HCM', descripcion: 'Sincronización de empleados, cargos y onboarding automático', activo: true, color: '#0EA5E9' },
  { modulo: 'QMS', descripcion: 'Lecciones aprendidas de no conformidades y CAPAs', activo: true, color: '#059669' },
  { modulo: 'GRC', descripcion: 'Cursos de compliance, ética y gestión de riesgos', activo: true, color: '#7C3AED' },
  { modulo: 'DMS', descripcion: 'Repositorio documental y biblioteca de conocimiento', activo: true, color: '#F59E0B' },
  { modulo: 'WMS', descripcion: 'Capacitación operativa de almacén y picking', activo: false, color: '#EF4444' },
  { modulo: 'TMS', descripcion: 'Escuela de conductores y formación vial', activo: true, color: '#DC2626' },
]

const UMBRALES = [
  { nombre: 'Nota mínima para aprobar evaluación', valor: '70%', editable: true },
  { nombre: 'Nota para certificación', valor: '80%', editable: true },
  { nombre: 'Días de alerta antes de vencimiento', valor: '30 días', editable: true },
  { nombre: 'Intentos máximos por evaluación', valor: '3', editable: true },
  { nombre: 'Horas mínimas requeridas (capacitación anual)', valor: '40 horas', editable: true },
  { nombre: 'Puntos por curso completado', valor: '50 pts', editable: true },
  { nombre: 'Puntos por evaluación aprobada', valor: '100 pts', editable: true },
  { nombre: 'Puntos por certificación obtenida', valor: '200 pts', editable: true },
]

export default function LMSConfig() {
  const [tab, setTab] = useState(0)
  const [notifs, setNotifs] = useState(NOTIFICACIONES.map(n => n.activo))
  const [ints, setInts]     = useState(INTEGRACIONES.map(i => i.activo))
  const [fws, setFws]       = useState(FRAMEWORKS.map(f => f.activo))

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${LMS_COLOR} 0%, #B45309 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Settings sx={{ color: 'text.primary', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary' }}>Configuración LMS</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.disabled' }}>
              Frameworks · Umbrales · Notificaciones · Integraciones
            </Typography>
          </Box>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)}
          sx={{
            mb: 3,
            '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 600 },
            '& .Mui-selected': { color: `${LMS_COLOR} !important` },
            '& .MuiTabs-indicator': { bgcolor: LMS_COLOR },
          }}>
          <Tab label="Frameworks" icon={<Extension sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Umbrales" icon={<Settings sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Notificaciones" icon={<Notifications sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Integraciones" icon={<Hub sx={{ fontSize: 16 }} />} iconPosition="start" />
        </Tabs>

        {tab === 0 && (
          <Grid container spacing={2}>
            {FRAMEWORKS.map((f, i) => (
              <Grid key={i} size={{ xs: 12, md: 6 }}>
                <Box sx={{ bgcolor: 'text.primary', border: `1px solid ${fws[i] ? #E5E7EB : '#E5E7EB'}`, borderRadius: 2, p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 15, fontWeight: 800, color: 'text.primary', mb: 0.5 }}>{f.nombre}</Typography>
                      <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.5 }}>{f.desc}</Typography>
                    </Box>
                    <Switch
                      checked={fws[i]}
                      onChange={e => {
                        const n = [...fws]
                        n[i] = e.target.checked
                        setFws(n)
                      }}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: LMS_COLOR },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: alpha(LMS_COLOR, 0.5) },
                      }}
                    />
                  </Box>
                  <Box sx={{ mt: 1.5 }}>
                    <Chip label={fws[i] ? 'Activo' : 'Inactivo'} size="small"
                      sx={{ bgcolor: fws[i] ? alpha('#059669', 0.15) : '#F1F5F9', color: fws[i] ? '#059669' : 'text.disabled', fontSize: 10, fontWeight: 600 }} />
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}

        {tab === 1 && (
          <Box sx={{ bgcolor: 'text.primary', border: `1px solid #E5E7EB`, borderRadius: 2, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Parámetro', 'Valor Actual', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'rgba(0,0,0,0.35)', borderBottom: '1px solid #F1F5F9' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {UMBRALES.map((u, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F9FAFB' }}>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: 'rgba(0,0,0,0.7)' }}>{u.nombre}</td>
                    <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 800, color: LMS_COLOR }}>{u.valor}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <Chip label="Editar" size="small" sx={{ bgcolor: alpha(LMS_COLOR, 0.1), color: LMS_COLOR, border: `1px solid ${alpha(LMS_COLOR, 0.2)}`, cursor: 'pointer', fontSize: 10 }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        )}

        {tab === 2 && (
          <Box sx={{ bgcolor: 'text.primary', border: `1px solid #E5E7EB`, borderRadius: 2, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Notificación', 'Canal', 'Activo'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'rgba(0,0,0,0.35)', borderBottom: '1px solid #F1F5F9' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {NOTIFICACIONES.map((n, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F9FAFB' }}>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: 'rgba(0,0,0,0.75)' }}>{n.tipo}</td>
                    <td style={{ padding: '10px 14px', fontSize: 11.5, color: 'rgba(0,0,0,0.4)' }}>{n.canal}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <Switch
                        checked={notifs[i]}
                        onChange={e => {
                          const next = [...notifs]
                          next[i] = e.target.checked
                          setNotifs(next)
                        }}
                        size="small"
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': { color: LMS_COLOR },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: alpha(LMS_COLOR, 0.5) },
                        }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        )}

        {tab === 3 && (
          <Grid container spacing={2}>
            {INTEGRACIONES.map((int, i) => (
              <Grid key={i} size={{ xs: 12, md: 6 }}>
                <Box sx={{ bgcolor: 'text.primary', border: `1px solid ${ints[i] ? alpha(int.color, 0.3) : '#E5E7EB'}`, borderRadius: 2, p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', flex: 1 }}>
                      <Box sx={{
                        width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
                        bgcolor: alpha(int.color, 0.15), border: `1px solid ${alpha(int.color, 0.3)}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Typography sx={{ fontSize: 12, fontWeight: 800, color: int.color }}>{int.modulo}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 800, color: 'text.primary', mb: 0.25 }}>{int.modulo} Integration</Typography>
                        <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.4 }}>{int.descripcion}</Typography>
                      </Box>
                    </Box>
                    <Switch
                      checked={ints[i]}
                      onChange={e => {
                        const next = [...ints]
                        next[i] = e.target.checked
                        setInts(next)
                      }}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: int.color },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: alpha(int.color, 0.5) },
                      }}
                    />
                  </Box>
                  <Box sx={{ mt: 1.5 }}>
                    <Chip label={ints[i] ? 'Conectado' : 'Desconectado'} size="small"
                      sx={{ bgcolor: ints[i] ? alpha('#059669', 0.15) : '#F1F5F9', color: ints[i] ? '#059669' : 'text.disabled', fontSize: 10, fontWeight: 600 }} />
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Layout>
  )
}
