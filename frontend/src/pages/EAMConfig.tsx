import React, { useState } from 'react'
import {
  Box, Typography, Tabs, Tab, Grid, Card, CardContent, Chip,
  Stack, alpha, Divider, IconButton, Button, TextField,
  Switch, FormControlLabel, InputAdornment, Avatar, Rating,
  List, ListItem, ListItemText, ListItemSecondaryAction,
} from '@mui/material'
import {
  Settings as SettingsIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Build as BuildIcon,
  NotificationsActive as AlertIcon,
  Link as LinkIcon,
  Search as SearchIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  Sync as SyncIcon,
  Warning as WarnIcon,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const EAM_COLOR = '#EA580C'
const CARD_BG = '#0F1E35'
const DARK_BG = '#060C1A'

// ── Catalogos mock ────────────────────────────────────────────────────────────

const TIPOS_TRABAJO = ['Mantenimiento Preventivo', 'Mantenimiento Correctivo', 'Mantenimiento Predictivo', 'Inspección Visual', 'Cambio de Aceite', 'Servicio Eléctrico', 'Servicio Mecánico', 'Servicio Hidráulico', 'Pintura y Carrocería', 'Soldadura', 'Calibración', 'Lubricación']
const ACTIVIDADES = ['Revisión de frenos', 'Cambio de filtros', 'Alineación y balanceo', 'Diagnóstico electrónico', 'Revisión sistema eléctrico', 'Cambio de correas', 'Revisión de suspensión', 'Lavado y engrase', 'Revisión de neumáticos', 'Cambio de aceite motor', 'Revisión de batería', 'Ajuste de frenos', 'Revisión de luces', 'Revisión de niveles', 'Revisión de embrague', 'Revisión de dirección', 'Prueba de ruta', 'Documentación técnica']
const REPUESTOS_CAT = ['Filtro de aire CUMMINS', 'Filtro de aceite CUMMINS', 'Correa de distribución', 'Bujías NGK', 'Pastillas de freno', 'Aceite sintético 15W-40', 'Líquido de frenos DOT4', 'Batería 12V 100Ah', 'Amortiguador trasero', 'Correa alternador', 'Termostato motor', 'Bomba de agua']
const FALLAS = ['Fuga de aceite', 'Sobrecalentamiento motor', 'Falla eléctrica', 'Desgaste prematuro frenos', 'Vibración en marcha', 'Ruido en caja de cambios', 'Pérdida de potencia', 'Humo excesivo', 'Falla de arranque', 'Consumo excesivo combustible', 'Fuga hidráulica', 'Falla de suspensión']
const CAUSAS = ['Falta de mantenimiento', 'Uso inadecuado', 'Desgaste natural', 'Defecto de fabricación', 'Corrosión', 'Sobrecarga', 'Contaminación fluidos', 'Falla eléctrica', 'Temperatura extrema', 'Vibración', 'Fatiga de material', 'Accidente']
const SOLUCIONES = ['Reemplazo de componente', 'Reparación in situ', 'Ajuste y calibración', 'Limpieza profunda', 'Lubricación', 'Soldadura', 'Reemplazo de fluidos', 'Reprogramación ECU', 'Rebobinado eléctrico', 'Rectificación', 'Templado de frenos', 'Cambio de eje']

interface Contratista {
  id: number
  nombre: string
  tipo: 'TALLER' | 'PROVEEDOR' | 'TECNICO_EXTERNO'
  especialidad: string
  ciudad: string
  calificacion: number
  activo: boolean
}

const CONTRATISTAS: Contratista[] = [
  { id: 1, nombre: 'AutoTaller Express S.A.', tipo: 'TALLER', especialidad: 'Mecánica automotriz general', ciudad: 'Bogotá', calificacion: 4.5, activo: true },
  { id: 2, nombre: 'Cummins Service Center', tipo: 'PROVEEDOR', especialidad: 'Motores CUMMINS y garantías', ciudad: 'Bogotá', calificacion: 4.8, activo: true },
  { id: 3, nombre: 'ElectrAuto Ltda.', tipo: 'TALLER', especialidad: 'Sistemas eléctricos y electrónicos', ciudad: 'Medellín', calificacion: 4.2, activo: true },
  { id: 4, nombre: 'Ing. Carlos Pérez', tipo: 'TECNICO_EXTERNO', especialidad: 'Diagnóstico avanzado y ECU', ciudad: 'Cali', calificacion: 4.7, activo: true },
  { id: 5, nombre: 'HydroTech SAS', tipo: 'PROVEEDOR', especialidad: 'Sistemas hidráulicos industriales', ciudad: 'Bogotá', calificacion: 4.0, activo: false },
  { id: 6, nombre: 'Frenos y Suspensión del Valle', tipo: 'TALLER', especialidad: 'Frenos, suspensión y dirección', ciudad: 'Cali', calificacion: 3.8, activo: true },
]

interface Integracion {
  codigo: string
  nombre: string
  descripcion: string
  estado: 'ACTIVO' | 'PENDIENTE' | 'CONFIGURAR'
  ultimaSync?: string
  color: string
}

const INTEGRACIONES: Integracion[] = [
  { codigo: 'TMS', nombre: 'Sistema de Transporte', descripcion: 'Vehículos registrados, kilómetros y rutas en tiempo real', estado: 'ACTIVO', ultimaSync: 'Hace 5 min', color: '#32AC5C' },
  { codigo: 'HCM', nombre: 'Recursos Humanos', descripcion: 'Técnicos, certificaciones y disponibilidad de personal', estado: 'ACTIVO', ultimaSync: 'Hace 1 hora', color: '#32AC5C' },
  { codigo: 'WMS', nombre: 'Gestión de Almacén', descripcion: 'Equipos logísticos, inventario y ubicaciones físicas', estado: 'ACTIVO', ultimaSync: 'Hace 30 min', color: '#32AC5C' },
  { codigo: 'DMS', nombre: 'Gestión de Documentos', descripcion: 'Manuales técnicos, planos y garantías digitales', estado: 'PENDIENTE', color: '#F59E0B' },
  { codigo: 'QMS', nombre: 'Gestión de Calidad', descripcion: 'Hallazgos de auditoría y no conformidades', estado: 'ACTIVO', ultimaSync: 'Ayer 18:00', color: '#32AC5C' },
  { codigo: 'GRC', nombre: 'Gestión de Riesgos', descripcion: 'Activos críticos, valoración de riesgos y controles', estado: 'PENDIENTE', color: '#F59E0B' },
  { codigo: 'ERP', nombre: 'Planificación Empresarial', descripcion: 'Órdenes de compra, facturas y centros de costo', estado: 'ACTIVO', ultimaSync: 'Hace 15 min', color: '#32AC5C' },
  { codigo: 'GPS', nombre: 'GPS / Telemetría CANBUS', descripcion: 'Posicionamiento, velocidad, temperatura motor y consumo', estado: 'CONFIGURAR', color: '#3B82F6' },
]

const tipoContColor = (t: string) => ({ TALLER: '#3B82F6', PROVEEDOR: '#32AC5C', TECNICO_EXTERNO: '#8B5CF6' })[t] ?? '#9CA3AF'

interface UmbralState {
  pmAntesDias: number
  pmActive: boolean
  profNeumatico: number
  profActive: boolean
  stockMin: boolean
  mttrHrs: number
  mttrActive: boolean
  combustiblePct: number
  combustibleActive: boolean
  garantiaDias: number
  garantiaActive: boolean
  calibracionDias: number
  calibracionActive: boolean
}

export default function EAMConfig() {
  const [tab, setTab] = useState(0)
  const [catSearch, setCatSearch] = useState<Record<string, string>>({})
  const [intToggles, setIntToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(INTEGRACIONES.map(i => [i.codigo, i.estado === 'ACTIVO']))
  )
  const [umbrales, setUmbrales] = useState<UmbralState>({
    pmAntesDias: 7, pmActive: true,
    profNeumatico: 3, profActive: true,
    stockMin: true,
    mttrHrs: 8, mttrActive: true,
    combustiblePct: 15, combustibleActive: true,
    garantiaDias: 30, garantiaActive: true,
    calibracionDias: 14, calibracionActive: true,
  })

  const setU = <K extends keyof UmbralState>(k: K, v: UmbralState[K]) =>
    setUmbrales(prev => ({ ...prev, [k]: v }))

  const getSearch = (cat: string) => catSearch[cat] ?? ''
  const setSearch = (cat: string, val: string) => setCatSearch(prev => ({ ...prev, [cat]: val }))
  const filterCat = (items: string[], cat: string) =>
    items.filter(i => i.toLowerCase().includes(getSearch(cat).toLowerCase())).slice(0, 5)

  const CatalogCard = ({ title, items, catKey, total }: { title: string; items: string[]; catKey: string; total: number }) => (
    <Card sx={{ background: CARD_BG, border: `1px solid ${alpha('#fff', 0.08)}` }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
          <Box>
            <Typography variant="subtitle2" fontWeight={700} color="white">{title}</Typography>
            <Typography variant="caption" color="grey.500">{total} registros</Typography>
          </Box>
          <Button size="small" startIcon={<AddIcon />} variant="outlined" sx={{ textTransform: 'none', borderColor: alpha(EAM_COLOR, 0.4), color: EAM_COLOR, fontSize: 11, '&:hover': { borderColor: EAM_COLOR, background: alpha(EAM_COLOR, 0.1) } }}>
            Agregar
          </Button>
        </Stack>
        <TextField
          fullWidth size="small" placeholder="Buscar..." value={getSearch(catKey)}
          onChange={e => setSearch(catKey, e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'grey.600', fontSize: 16 }} /></InputAdornment> }}
          sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { background: alpha('#fff', 0.03), '& fieldset': { borderColor: alpha('#fff', 0.12) }, '&:hover fieldset': { borderColor: alpha(EAM_COLOR, 0.4) }, color: 'white', fontSize: 13 } }}
        />
        <List dense disablePadding>
          {filterCat(items, catKey).map((item, i) => (
            <ListItem key={i} disablePadding sx={{ py: 0.25, '&:hover .actions': { opacity: 1 } }}>
              <ListItemText primary={<Typography variant="body2" color="grey.300">{item}</Typography>} />
              <ListItemSecondaryAction className="actions" sx={{ opacity: 0, transition: 'opacity 0.2s' }}>
                <IconButton size="small" sx={{ color: 'grey.500', mr: 0.5 }}><EditIcon sx={{ fontSize: 14 }} /></IconButton>
                <IconButton size="small" sx={{ color: '#EF4444' }}><DeleteIcon sx={{ fontSize: 14 }} /></IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
        {items.length > 5 && (
          <Typography variant="caption" color={EAM_COLOR} sx={{ cursor: 'pointer', mt: 0.5, display: 'block' }}>
            +{items.length - 5} más →
          </Typography>
        )}
      </CardContent>
    </Card>
  )

  return (
    <Layout>
      <Box sx={{ p: 3, background: DARK_BG, minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <Box sx={{ p: 1.5, borderRadius: 2, background: alpha(EAM_COLOR, 0.15), color: EAM_COLOR }}>
            <SettingsIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="white">Configuración EAM</Typography>
            <Typography variant="body2" color="grey.400">Catálogos, contratistas, umbrales de alerta e integraciones</Typography>
          </Box>
        </Stack>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ '& .MuiTab-root': { color: 'grey.400', textTransform: 'none', fontWeight: 600 }, '& .Mui-selected': { color: EAM_COLOR }, '& .MuiTabs-indicator': { backgroundColor: EAM_COLOR } }}>
            {['Catálogos', 'Contratistas', 'Umbrales & Alertas', 'Integraciones'].map((l, i) => <Tab key={i} label={l} />)}
          </Tabs>
        </Box>

        {/* Tab 0: Catálogos */}
        {tab === 0 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <CatalogCard title="Tipos de Trabajo" items={TIPOS_TRABAJO} catKey="tipos" total={12} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <CatalogCard title="Actividades" items={ACTIVIDADES} catKey="actividades" total={18} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <CatalogCard title="Repuestos" items={REPUESTOS_CAT} catKey="repuestos" total={324} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <CatalogCard title="Fallas" items={FALLAS} catKey="fallas" total={45} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <CatalogCard title="Causas" items={CAUSAS} catKey="causas" total={32} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <CatalogCard title="Soluciones" items={SOLUCIONES} catKey="soluciones" total={28} />
            </Grid>
          </Grid>
        )}

        {/* Tab 1: Contratistas */}
        {tab === 1 && (
          <Box>
            <Stack direction="row" justifyContent="flex-end" mb={2}>
              <Button startIcon={<AddIcon />} variant="contained" sx={{ textTransform: 'none', background: EAM_COLOR, '&:hover': { background: '#C2410C' } }}>
                Agregar Contratista
              </Button>
            </Stack>
            <Grid container spacing={2}>
              {CONTRATISTAS.map(c => (
                <Grid key={c.id} size={{ xs: 12, md: 6, lg: 4 }}>
                  <Card sx={{ background: CARD_BG, border: `1px solid ${alpha(c.activo ? tipoContColor(c.tipo) : '#4B5563', 0.3)}`, opacity: c.activo ? 1 : 0.6 }}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar sx={{ width: 40, height: 40, background: alpha(tipoContColor(c.tipo), 0.15) }}>
                            {c.tipo === 'TECNICO_EXTERNO' ? <PersonIcon sx={{ color: tipoContColor(c.tipo) }} /> : c.tipo === 'TALLER' ? <BuildIcon sx={{ color: tipoContColor(c.tipo) }} /> : <BusinessIcon sx={{ color: tipoContColor(c.tipo) }} />}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={700} color="white">{c.nombre}</Typography>
                            <Typography variant="caption" color="grey.500">{c.ciudad}</Typography>
                          </Box>
                        </Stack>
                        {c.activo
                          ? <ActiveIcon sx={{ color: '#32AC5C', fontSize: 18 }} />
                          : <InactiveIcon sx={{ color: '#9CA3AF', fontSize: 18 }} />}
                      </Stack>

                      <Chip label={c.tipo.replace('_', ' ')} size="small" sx={{ background: alpha(tipoContColor(c.tipo), 0.12), color: tipoContColor(c.tipo), fontWeight: 600, fontSize: 10, mb: 1 }} />

                      <Typography variant="caption" color="grey.400" display="block" mb={1}>{c.especialidad}</Typography>

                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Rating value={c.calificacion} precision={0.5} readOnly size="small" sx={{ '& .MuiRating-iconFilled': { color: '#F59E0B' }, '& .MuiRating-iconEmpty': { color: alpha('#fff', 0.2) } }} />
                          <Typography variant="caption" color="grey.400">{c.calificacion}</Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" sx={{ color: 'grey.500' }}><EditIcon sx={{ fontSize: 14 }} /></IconButton>
                          <IconButton size="small" sx={{ color: '#EF4444' }}><DeleteIcon sx={{ fontSize: 14 }} /></IconButton>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Tab 2: Umbrales & Alertas */}
        {tab === 2 && (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ background: CARD_BG, border: `1px solid ${alpha('#fff', 0.08)}` }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                    <AlertIcon sx={{ color: EAM_COLOR, fontSize: 20 }} />
                    <Typography variant="subtitle2" fontWeight={700} color="white">Alertas de Mantenimiento</Typography>
                  </Stack>
                  <Stack spacing={2.5} divider={<Divider sx={{ borderColor: alpha('#fff', 0.06) }} />}>
                    {/* PM Vencido */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Box flex={1}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Switch checked={umbrales.pmActive} onChange={e => setU('pmActive', e.target.checked)} size="small" sx={{ '& .Mui-checked .MuiSwitch-thumb': { color: EAM_COLOR }, '& .Mui-checked + .MuiSwitch-track': { backgroundColor: EAM_COLOR } }} />
                          <Typography variant="body2" color={umbrales.pmActive ? 'white' : 'grey.500'} fontWeight={600}>Alerta PM por vencer</Typography>
                        </Stack>
                        <Typography variant="caption" color="grey.500" ml={5}>Notificar X días antes del vencimiento del PM</Typography>
                      </Box>
                      <TextField
                        type="number" size="small" value={umbrales.pmAntesDias}
                        onChange={e => setU('pmAntesDias', Number(e.target.value))}
                        disabled={!umbrales.pmActive}
                        InputProps={{ endAdornment: <InputAdornment position="end"><Typography variant="caption" color="grey.500">días</Typography></InputAdornment> }}
                        sx={{ width: 100, '& .MuiOutlinedInput-root': { background: alpha('#fff', 0.04), '& fieldset': { borderColor: alpha('#fff', 0.12) }, color: 'white', fontSize: 13 } }}
                      />
                    </Stack>

                    {/* Profundidad neumático */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Box flex={1}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Switch checked={umbrales.profActive} onChange={e => setU('profActive', e.target.checked)} size="small" sx={{ '& .Mui-checked .MuiSwitch-thumb': { color: EAM_COLOR }, '& .Mui-checked + .MuiSwitch-track': { backgroundColor: EAM_COLOR } }} />
                          <Typography variant="body2" color={umbrales.profActive ? 'white' : 'grey.500'} fontWeight={600}>Profundidad mínima neumático</Typography>
                        </Stack>
                        <Typography variant="caption" color="grey.500" ml={5}>Alerta cuando la profundidad sea menor a X mm</Typography>
                      </Box>
                      <TextField
                        type="number" size="small" value={umbrales.profNeumatico}
                        onChange={e => setU('profNeumatico', Number(e.target.value))}
                        disabled={!umbrales.profActive}
                        InputProps={{ endAdornment: <InputAdornment position="end"><Typography variant="caption" color="grey.500">mm</Typography></InputAdornment> }}
                        sx={{ width: 100, '& .MuiOutlinedInput-root': { background: alpha('#fff', 0.04), '& fieldset': { borderColor: alpha('#fff', 0.12) }, color: 'white', fontSize: 13 } }}
                      />
                    </Stack>

                    {/* Stock mínimo */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Box flex={1}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Switch checked={umbrales.stockMin} onChange={e => setU('stockMin', e.target.checked)} size="small" sx={{ '& .Mui-checked .MuiSwitch-thumb': { color: EAM_COLOR }, '& .Mui-checked + .MuiSwitch-track': { backgroundColor: EAM_COLOR } }} />
                          <Typography variant="body2" color={umbrales.stockMin ? 'white' : 'grey.500'} fontWeight={600}>Alerta stock mínimo repuestos</Typography>
                        </Stack>
                        <Typography variant="caption" color="grey.500" ml={5}>Notificar cuando repuesto crítico esté por debajo del mínimo</Typography>
                      </Box>
                      <Chip label={umbrales.stockMin ? 'ACTIVO' : 'INACTIVO'} size="small" sx={{ background: alpha(umbrales.stockMin ? '#32AC5C' : '#9CA3AF', 0.15), color: umbrales.stockMin ? '#32AC5C' : '#9CA3AF', fontWeight: 700 }} />
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ background: CARD_BG, border: `1px solid ${alpha('#fff', 0.08)}` }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                    <WarnIcon sx={{ color: '#F59E0B', fontSize: 20 }} />
                    <Typography variant="subtitle2" fontWeight={700} color="white">Umbrales Operativos</Typography>
                  </Stack>
                  <Stack spacing={2.5} divider={<Divider sx={{ borderColor: alpha('#fff', 0.06) }} />}>
                    {/* MTTR */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Box flex={1}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Switch checked={umbrales.mttrActive} onChange={e => setU('mttrActive', e.target.checked)} size="small" sx={{ '& .Mui-checked .MuiSwitch-thumb': { color: '#F59E0B' }, '& .Mui-checked + .MuiSwitch-track': { backgroundColor: '#F59E0B' } }} />
                          <Typography variant="body2" color={umbrales.mttrActive ? 'white' : 'grey.500'} fontWeight={600}>MTTR excedido</Typography>
                        </Stack>
                        <Typography variant="caption" color="grey.500" ml={5}>Alerta cuando el MTTR supere el umbral</Typography>
                      </Box>
                      <TextField
                        type="number" size="small" value={umbrales.mttrHrs}
                        onChange={e => setU('mttrHrs', Number(e.target.value))}
                        disabled={!umbrales.mttrActive}
                        InputProps={{ endAdornment: <InputAdornment position="end"><Typography variant="caption" color="grey.500">hrs</Typography></InputAdornment> }}
                        sx={{ width: 100, '& .MuiOutlinedInput-root': { background: alpha('#fff', 0.04), '& fieldset': { borderColor: alpha('#fff', 0.12) }, color: 'white', fontSize: 13 } }}
                      />
                    </Stack>

                    {/* Consumo combustible */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Box flex={1}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Switch checked={umbrales.combustibleActive} onChange={e => setU('combustibleActive', e.target.checked)} size="small" sx={{ '& .Mui-checked .MuiSwitch-thumb': { color: '#F59E0B' }, '& .Mui-checked + .MuiSwitch-track': { backgroundColor: '#F59E0B' } }} />
                          <Typography variant="body2" color={umbrales.combustibleActive ? 'white' : 'grey.500'} fontWeight={600}>Desviación consumo combustible</Typography>
                        </Stack>
                        <Typography variant="caption" color="grey.500" ml={5}>Alerta cuando el consumo supere en X% el promedio</Typography>
                      </Box>
                      <TextField
                        type="number" size="small" value={umbrales.combustiblePct}
                        onChange={e => setU('combustiblePct', Number(e.target.value))}
                        disabled={!umbrales.combustibleActive}
                        InputProps={{ endAdornment: <InputAdornment position="end"><Typography variant="caption" color="grey.500">%</Typography></InputAdornment> }}
                        sx={{ width: 100, '& .MuiOutlinedInput-root': { background: alpha('#fff', 0.04), '& fieldset': { borderColor: alpha('#fff', 0.12) }, color: 'white', fontSize: 13 } }}
                      />
                    </Stack>

                    {/* Garantía por vencer */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Box flex={1}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Switch checked={umbrales.garantiaActive} onChange={e => setU('garantiaActive', e.target.checked)} size="small" sx={{ '& .Mui-checked .MuiSwitch-thumb': { color: '#F59E0B' }, '& .Mui-checked + .MuiSwitch-track': { backgroundColor: '#F59E0B' } }} />
                          <Typography variant="body2" color={umbrales.garantiaActive ? 'white' : 'grey.500'} fontWeight={600}>Garantía por vencer</Typography>
                        </Stack>
                        <Typography variant="caption" color="grey.500" ml={5}>Alertar X días antes del vencimiento de garantía</Typography>
                      </Box>
                      <TextField
                        type="number" size="small" value={umbrales.garantiaDias}
                        onChange={e => setU('garantiaDias', Number(e.target.value))}
                        disabled={!umbrales.garantiaActive}
                        InputProps={{ endAdornment: <InputAdornment position="end"><Typography variant="caption" color="grey.500">días</Typography></InputAdornment> }}
                        sx={{ width: 100, '& .MuiOutlinedInput-root': { background: alpha('#fff', 0.04), '& fieldset': { borderColor: alpha('#fff', 0.12) }, color: 'white', fontSize: 13 } }}
                      />
                    </Stack>

                    {/* Calibración */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Box flex={1}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Switch checked={umbrales.calibracionActive} onChange={e => setU('calibracionActive', e.target.checked)} size="small" sx={{ '& .Mui-checked .MuiSwitch-thumb': { color: '#F59E0B' }, '& .Mui-checked + .MuiSwitch-track': { backgroundColor: '#F59E0B' } }} />
                          <Typography variant="body2" color={umbrales.calibracionActive ? 'white' : 'grey.500'} fontWeight={600}>Calibración por vencer</Typography>
                        </Stack>
                        <Typography variant="caption" color="grey.500" ml={5}>Alertar X días antes del vencimiento de calibración</Typography>
                      </Box>
                      <TextField
                        type="number" size="small" value={umbrales.calibracionDias}
                        onChange={e => setU('calibracionDias', Number(e.target.value))}
                        disabled={!umbrales.calibracionActive}
                        InputProps={{ endAdornment: <InputAdornment position="end"><Typography variant="caption" color="grey.500">días</Typography></InputAdornment> }}
                        sx={{ width: 100, '& .MuiOutlinedInput-root': { background: alpha('#fff', 0.04), '& fieldset': { borderColor: alpha('#fff', 0.12) }, color: 'white', fontSize: 13 } }}
                      />
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* Tab 3: Integraciones */}
        {tab === 3 && (
          <Box>
            <Typography variant="subtitle1" color="grey.300" mb={2} fontWeight={600}>
              Integraciones con sistemas corporativos ICOLTRANS
            </Typography>
            <Grid container spacing={2}>
              {INTEGRACIONES.map(intg => {
                const isOn = intToggles[intg.codigo] ?? false
                const statusColor = intg.estado === 'ACTIVO' ? '#32AC5C' : intg.estado === 'CONFIGURAR' ? '#3B82F6' : '#F59E0B'
                return (
                  <Grid key={intg.codigo} size={{ xs: 12, md: 6, lg: 4 }}>
                    <Card sx={{ background: CARD_BG, border: `1px solid ${alpha(isOn ? intg.color : '#4B5563', 0.3)}`, transition: 'border-color 0.3s' }}>
                      <CardContent>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box sx={{ px: 1.5, py: 0.5, borderRadius: 1, background: alpha(intg.color, 0.15), border: `1px solid ${alpha(intg.color, 0.3)}` }}>
                              <Typography variant="body2" fontWeight={800} color={intg.color}>{intg.codigo}</Typography>
                            </Box>
                            <Box>
                              <Typography variant="body2" fontWeight={700} color="white">{intg.nombre}</Typography>
                            </Box>
                          </Stack>
                          <Switch
                            checked={isOn}
                            onChange={e => setIntToggles(prev => ({ ...prev, [intg.codigo]: e.target.checked }))}
                            size="small"
                            sx={{ '& .Mui-checked .MuiSwitch-thumb': { color: intg.color }, '& .Mui-checked + .MuiSwitch-track': { backgroundColor: intg.color } }}
                          />
                        </Stack>

                        <Typography variant="caption" color="grey.400" display="block" mb={1.5}>{intg.descripcion}</Typography>

                        <Stack direction="row" alignItems="center" justifyContent="space-between">
                          <Chip
                            label={intg.estado}
                            size="small"
                            icon={intg.estado === 'ACTIVO' ? <ActiveIcon sx={{ fontSize: '12px !important', color: `${statusColor} !important` }} /> : intg.estado === 'CONFIGURAR' ? <SyncIcon sx={{ fontSize: '12px !important', color: `${statusColor} !important` }} /> : <WarnIcon sx={{ fontSize: '12px !important', color: `${statusColor} !important` }} />}
                            sx={{ background: alpha(statusColor, 0.12), color: statusColor, fontWeight: 700, fontSize: 10 }}
                          />
                          {intg.ultimaSync && (
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <SyncIcon sx={{ fontSize: 12, color: 'grey.600' }} />
                              <Typography variant="caption" color="grey.500">{intg.ultimaSync}</Typography>
                            </Stack>
                          )}
                          {!intg.ultimaSync && (
                            <Button size="small" variant="outlined" sx={{ textTransform: 'none', fontSize: 11, borderColor: alpha(intg.color, 0.4), color: intg.color, py: 0.25, '&:hover': { borderColor: intg.color, background: alpha(intg.color, 0.1) } }}>
                              {intg.estado === 'CONFIGURAR' ? 'Configurar' : 'Activar'}
                            </Button>
                          )}
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                )
              })}
            </Grid>
          </Box>
        )}
      </Box>
    </Layout>
  )
}
