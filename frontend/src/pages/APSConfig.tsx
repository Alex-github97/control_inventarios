import React, { useState } from 'react'
import { Layout } from '@/components/layout/Layout'
import {
  Box, Typography, Grid, Chip, Paper, Tabs, Tab, Button,
  TextField, Switch, Slider, alpha, InputAdornment,
} from '@mui/material'
import { Settings, Search } from '@mui/icons-material'

const APS_COLOR = '#7C3AED'

const catalogos = [
  { nombre: 'Ubicaciones / Plantas', items: 12, activos: 10, ultima: '2026-06-15' },
  { nombre: 'Productos APS', items: 248, activos: 232, ultima: '2026-06-18' },
  { nombre: 'Recursos de Capacidad', items: 34, activos: 28, ultima: '2026-06-10' },
  { nombre: 'Familias de Demanda', items: 18, activos: 18, ultima: '2026-05-28' },
  { nombre: 'Proveedores (APS)', items: 67, activos: 54, ultima: '2026-06-01' },
  { nombre: 'Restricciones', items: 89, activos: 76, ultima: '2026-06-17' },
  { nombre: 'Calendarios', items: 6, activos: 5, ultima: '2026-04-12' },
  { nombre: 'Parámetros MRP', items: 248, activos: 248, ultima: '2026-06-18' },
]

const parametros = [
  { label: 'Horizonte Planificación (semanas)', tipo: 'slider', val: 52, min: 4, max: 156, unit: 'sem' },
  { label: 'Granularidad Plan', tipo: 'slider', val: 7, min: 1, max: 30, unit: 'días' },
  { label: 'Factor Seguridad Inventario', tipo: 'slider', val: 20, min: 5, max: 50, unit: '%' },
  { label: 'Lead Time Promedio Compras (días)', tipo: 'slider', val: 15, min: 1, max: 60, unit: 'días' },
]

const switches_ = [
  { label: 'Optimización Automática Diaria', desc: 'Motor LP corre automáticamente a las 2am', val: true },
  { label: 'Alertas Predictivas por ML', desc: 'Activa predicciones de quiebre y exceso', val: true },
  { label: 'Digital Twin en Tiempo Real', desc: 'Sincronización continua con fuentes de datos', val: true },
  { label: 'Colaboración de Demanda', desc: 'Habilita flujo de aprobación S&OP', val: false },
  { label: 'MRP en Cascada Multinivel', desc: 'Despliegue MRP a todos los niveles de BOM', val: true },
  { label: 'Notificaciones por Email', desc: 'Alertas críticas enviadas a usuarios APS', val: false },
]

const integraciones = [
  { sistema: 'ERP / MES', tipo: 'REST API', estado: 'CONECTADO', sync: 'Cada 15min', ultima: 'hace 3min', registros: '1,247' },
  { sistema: 'WMS', tipo: 'REST API', estado: 'CONECTADO', sync: 'Cada 30min', ultima: 'hace 12min', registros: '892' },
  { sistema: 'TMS', tipo: 'REST API', estado: 'CONECTADO', sync: 'Cada 1h', ultima: 'hace 45min', registros: '324' },
  { sistema: 'CRM / Ventas', tipo: 'REST API', estado: 'CONECTADO', sync: 'Cada 4h', ultima: 'hace 2h', registros: '156' },
  { sistema: 'Proveedor X (EDI)', tipo: 'EDI 850/855', estado: 'PARCIAL', sync: 'Diario', ultima: 'hace 18h', registros: '23' },
  { sistema: 'ERP Finanzas', tipo: 'REST API', estado: 'DESCONECTADO', sync: 'Manual', ultima: 'hace 3 días', registros: '0' },
]

const usuarios = [
  { nombre: 'Carlos Martínez', email: 'c.martinez@icoltrans.com', rol: 'Planificador Jefe', acceso: 'Total', ultimo: 'hace 2h' },
  { nombre: 'Ana Rodríguez', email: 'a.rodriguez@icoltrans.com', rol: 'Analista Demanda', acceso: 'Demanda + Reportes', ultimo: 'hace 30min' },
  { nombre: 'Luis Gómez', email: 'l.gomez@icoltrans.com', rol: 'Planeación Supply', acceso: 'MPS + MRP + Cap', ultimo: 'hace 1h' },
  { nombre: 'Sandra Pérez', email: 's.perez@icoltrans.com', rol: 'Colaborador S&OP', acceso: 'S&OP + Colaboración', ultimo: 'hace 4h' },
  { nombre: 'Admin Sistema', email: 'admin@icoltrans.com', rol: 'Administrador APS', acceso: 'Total', ultimo: 'hace 15min' },
]

export default function APSConfig() {
  const [tab, setTab] = useState(0)
  const [busqueda, setBusqueda] = useState('')
  const [sliderVals, setSliderVals] = useState(parametros.map(p => p.val))
  const [swVals, setSwVals] = useState(switches_.map(s => s.val))

  const catFiltrados = catalogos.filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()))

  return (
    <Layout>
      <Box sx={{ p: 3, background: '#F0F2F5', minHeight: '100vh' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Box sx={{ width: 42, height: 42, borderRadius: '12px', background: `linear-gradient(135deg, ${APS_COLOR} 0%, #6D28D9 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 14px ${alpha(APS_COLOR, 0.4)}` }}>
            <Settings sx={{ color: '#FFF', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ color: '#1E293B', fontWeight: 700 }}>Configuración APS</Typography>
            <Typography variant="body2" sx={{ color: '#64748B' }}>Catálogos, Parámetros, Integraciones y Usuarios del módulo APS</Typography>
          </Box>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, '& .MuiTab-root': { color: '#64748B', fontSize: 13 }, '& .Mui-selected': { color: APS_COLOR }, '& .MuiTabs-indicator': { bgcolor: APS_COLOR } }}>
          <Tab label="Catálogos" />
          <Tab label="Parámetros Globales" />
          <Tab label="Integraciones" />
          <Tab label="Usuarios APS" />
        </Tabs>

        {tab === 0 && (
          <>
            <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
              <TextField
                size="small" placeholder="Buscar catálogo..." value={busqueda}
                onChange={e => setBusqueda(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: '#64748B', fontSize: 18 }} /></InputAdornment> }}
                sx={{ flex: 1, maxWidth: 360, '& .MuiOutlinedInput-root': { '&:hover fieldset': { borderColor: APS_COLOR }, '&.Mui-focused fieldset': { borderColor: APS_COLOR } } }}
              />
              <Button variant="contained" sx={{ bgcolor: APS_COLOR, fontWeight: 700, '&:hover': { bgcolor: '#6D28D9' } }}>+ Nuevo Registro</Button>
            </Box>
            <Paper sx={{ bgcolor: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr', px: 2.5, py: 1.5, borderBottom: '1px solid #E5E7EB' }}>
                {['Catálogo', 'Total Items', 'Activos', 'Última Actualización', ''].map(h => (
                  <Typography key={h} sx={{ color: '#64748B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</Typography>
                ))}
              </Box>
              {catFiltrados.map((c, i) => (
                <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1fr', px: 2.5, py: 1.75, borderBottom: '1px solid #E5E7EB', alignItems: 'center', '&:hover': { bgcolor: '#F8FAFC' } }}>
                  <Typography sx={{ color: '#1E293B', fontSize: 13, fontWeight: 500 }}>{c.nombre}</Typography>
                  <Typography sx={{ color: '#334155', fontSize: 13 }}>{c.items.toLocaleString()}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ color: '#10B981', fontSize: 13 }}>{c.activos}</Typography>
                    {c.items - c.activos > 0 && <Typography sx={{ color: '#64748B', fontSize: 11 }}>/ {c.items - c.activos} inac.</Typography>}
                  </Box>
                  <Typography sx={{ color: '#64748B', fontSize: 12 }}>{c.ultima}</Typography>
                  <Button size="small" sx={{ color: APS_COLOR, fontSize: 11, textTransform: 'none' }}>Ver / Editar</Button>
                </Box>
              ))}
            </Paper>
          </>
        )}

        {tab === 1 && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ bgcolor: '#fff', borderRadius: '12px', p: 3 }}>
                <Typography sx={{ color: '#1E293B', fontWeight: 700, mb: 3, fontSize: 15 }}>Horizonte y Granularidad</Typography>
                {parametros.map((p, i) => (
                  <Box key={p.label} sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography sx={{ color: '#334155', fontSize: 13 }}>{p.label}</Typography>
                      <Chip label={`${sliderVals[i]} ${p.unit}`} size="small" sx={{ bgcolor: alpha(APS_COLOR, 0.15), color: APS_COLOR, fontWeight: 700, fontSize: 11 }} />
                    </Box>
                    <Slider
                      value={sliderVals[i]} min={p.min} max={p.max}
                      onChange={(_, v) => setSliderVals(vs => { const n = [...vs]; n[i] = v as number; return n })}
                      sx={{ color: APS_COLOR, '& .MuiSlider-thumb': { width: 14, height: 14 }, '& .MuiSlider-rail': { bgcolor: '#E5E7EB' } }}
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography sx={{ color: '#64748B', fontSize: 11 }}>{p.min} {p.unit}</Typography>
                      <Typography sx={{ color: '#64748B', fontSize: 11 }}>{p.max} {p.unit}</Typography>
                    </Box>
                  </Box>
                ))}
                <Button fullWidth variant="contained" sx={{ mt: 1, bgcolor: APS_COLOR, fontWeight: 700, '&:hover': { bgcolor: '#6D28D9' } }}>Guardar Parámetros</Button>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Paper sx={{ bgcolor: '#fff', borderRadius: '12px', p: 3 }}>
                <Typography sx={{ color: '#1E293B', fontWeight: 700, mb: 3, fontSize: 15 }}>Funcionalidades Activas</Typography>
                {switches_.map((s, i) => (
                  <Box key={s.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, pb: 2.5, borderBottom: i < switches_.length - 1 ? '1px solid #E5E7EB' : 'none' }}>
                    <Box>
                      <Typography sx={{ color: '#1E293B', fontSize: 13, fontWeight: 500 }}>{s.label}</Typography>
                      <Typography sx={{ color: '#64748B', fontSize: 11, mt: 0.25 }}>{s.desc}</Typography>
                    </Box>
                    <Switch
                      checked={swVals[i]}
                      onChange={(_, v) => setSwVals(sv => { const n = [...sv]; n[i] = v; return n })}
                      sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: APS_COLOR }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: APS_COLOR } }}
                    />
                  </Box>
                ))}
              </Paper>
            </Grid>
          </Grid>
        )}

        {tab === 2 && (
          <Paper sx={{ bgcolor: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 1fr', px: 2.5, py: 1.5, borderBottom: '1px solid #E5E7EB' }}>
              {['Sistema', 'Tipo', 'Estado', 'Sincronización', 'Última Sync', 'Registros'].map(h => (
                <Typography key={h} sx={{ color: '#64748B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</Typography>
              ))}
            </Box>
            {integraciones.map((int, i) => {
              const stColor = int.estado === 'CONECTADO' ? '#10B981' : int.estado === 'PARCIAL' ? '#F59E0B' : '#EF4444'
              return (
                <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 1fr 1fr 1fr', px: 2.5, py: 2, borderBottom: '1px solid #E5E7EB', alignItems: 'center', '&:hover': { bgcolor: '#F8FAFC' } }}>
                  <Typography sx={{ color: '#1E293B', fontSize: 13, fontWeight: 600 }}>{int.sistema}</Typography>
                  <Typography sx={{ color: '#64748B', fontSize: 12 }}>{int.tipo}</Typography>
                  <Chip label={int.estado} size="small" sx={{ bgcolor: alpha(stColor, 0.15), color: stColor, fontWeight: 700, fontSize: 10, width: 'fit-content' }} />
                  <Typography sx={{ color: '#64748B', fontSize: 12 }}>{int.sync}</Typography>
                  <Typography sx={{ color: '#64748B', fontSize: 12 }}>{int.ultima}</Typography>
                  <Typography sx={{ color: int.estado === 'CONECTADO' ? '#10B981' : '#64748B', fontSize: 13, fontWeight: int.estado === 'CONECTADO' ? 700 : 400 }}>{int.registros}</Typography>
                </Box>
              )
            })}
            <Box sx={{ p: 2, display: 'flex', gap: 2 }}>
              <Button variant="outlined" size="small" sx={{ color: APS_COLOR, borderColor: alpha(APS_COLOR, 0.35), '&:hover': { borderColor: APS_COLOR, bgcolor: alpha(APS_COLOR, 0.08) } }}>+ Nueva Integración</Button>
              <Button variant="outlined" size="small" sx={{ color: '#64748B', borderColor: '#E5E7EB', '&:hover': { borderColor: '#CBD5E1', bgcolor: '#F8FAFC' } }}>Probar Conexiones</Button>
            </Box>
          </Paper>
        )}

        {tab === 3 && (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button variant="contained" sx={{ bgcolor: APS_COLOR, fontWeight: 700, '&:hover': { bgcolor: '#6D28D9' } }}>+ Agregar Usuario</Button>
            </Box>
            <Paper sx={{ bgcolor: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: '2fr 2.5fr 2fr 2fr 1.5fr', px: 2.5, py: 1.5, borderBottom: '1px solid #E5E7EB' }}>
                {['Nombre', 'Email', 'Rol APS', 'Acceso', 'Último Acceso'].map(h => (
                  <Typography key={h} sx={{ color: '#64748B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</Typography>
                ))}
              </Box>
              {usuarios.map((u, i) => (
                <Box key={i} sx={{ display: 'grid', gridTemplateColumns: '2fr 2.5fr 2fr 2fr 1.5fr', px: 2.5, py: 2, borderBottom: '1px solid #E5E7EB', alignItems: 'center', '&:hover': { bgcolor: '#F8FAFC' } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg, ${APS_COLOR} 0%, #6D28D9 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Typography sx={{ color: '#FFF', fontSize: 11, fontWeight: 800 }}>{u.nombre.split(' ').map(n => n[0]).join('').slice(0, 2)}</Typography>
                    </Box>
                    <Typography sx={{ color: '#1E293B', fontSize: 13, fontWeight: 600 }}>{u.nombre}</Typography>
                  </Box>
                  <Typography sx={{ color: '#64748B', fontSize: 12 }}>{u.email}</Typography>
                  <Typography sx={{ color: APS_COLOR, fontSize: 12, fontWeight: 500 }}>{u.rol}</Typography>
                  <Typography sx={{ color: '#334155', fontSize: 12 }}>{u.acceso}</Typography>
                  <Typography sx={{ color: '#64748B', fontSize: 12 }}>{u.ultimo}</Typography>
                </Box>
              ))}
            </Paper>
          </>
        )}
      </Box>
    </Layout>
  )
}
