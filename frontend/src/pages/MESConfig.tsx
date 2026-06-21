import React, { useState } from 'react'
import {
  Box, Typography, Tabs, Tab, Grid, Paper, Chip, Switch,
  TextField, IconButton, Button, Stack, alpha, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material'
import {
  Settings as SettingsIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Link as LinkIcon,
  People as PeopleIcon,
  Tune as TuneIcon,
  MenuBook as CatalogIcon,
  CheckCircle as ActiveIcon,
  Cancel as InactiveIcon,
  HourglassEmpty as PendingIcon,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const MES_COLOR = '#0891B2'
const CARD_BG = '#0F1E35'
const DARK_BG = '#060C1A'

// ── Interfaces ───────────────────────────────────────────────────────────────
interface CatalogItem {
  id: number
  nombre: string
  activo: boolean
}

interface Catalogo {
  titulo: string
  registros: number
  items: CatalogItem[]
}

interface Parametro {
  label: string
  descripcion: string
  valor: string
  unidad: string
  activo: boolean
}

interface Integracion {
  nombre: string
  sigla: string
  descripcion: string
  estado: 'activo' | 'inactivo' | 'pendiente'
  ultimaSync: string
  activo: boolean
}

interface UsuarioMES {
  id: number
  nombre: string
  email: string
  rol: 'Administrador' | 'Supervisor' | 'Operario' | 'Analista'
  planta: string
  lineas: string[]
  activo: boolean
  ultimaSesion: string
}

// ── Mock Data ────────────────────────────────────────────────────────────────
const CATALOGOS_DATA: Catalogo[] = [
  {
    titulo: 'Motivos de Parada',
    registros: 18,
    items: [
      { id: 1, nombre: 'Mantenimiento Correctivo', activo: true },
      { id: 2, nombre: 'Mantenimiento Preventivo', activo: true },
      { id: 3, nombre: 'Falta de Material', activo: true },
      { id: 4, nombre: 'Cambio de Referencia (Changeover)', activo: true },
      { id: 5, nombre: 'Avería Eléctrica', activo: false },
    ],
  },
  {
    titulo: 'Tipos de Defecto',
    registros: 24,
    items: [
      { id: 1, nombre: 'Dimensión fuera de tolerancia', activo: true },
      { id: 2, nombre: 'Porosidad / Inclusión', activo: true },
      { id: 3, nombre: 'Acabado superficial', activo: true },
      { id: 4, nombre: 'Falla en sellado', activo: true },
      { id: 5, nombre: 'Deformación plástica', activo: false },
    ],
  },
  {
    titulo: 'Causas de Scrap',
    registros: 12,
    items: [
      { id: 1, nombre: 'Error de máquina CNC', activo: true },
      { id: 2, nombre: 'Materia prima fuera de spec', activo: true },
      { id: 3, nombre: 'Error operario', activo: true },
      { id: 4, nombre: 'Desgaste de herramienta', activo: true },
      { id: 5, nombre: 'Temperatura de proceso', activo: false },
    ],
  },
  {
    titulo: 'Tipos de Inspección',
    registros: 9,
    items: [
      { id: 1, nombre: 'Inspección 100%', activo: true },
      { id: 2, nombre: 'Muestreo AQL 1.0', activo: true },
      { id: 3, nombre: 'Muestreo AQL 2.5', activo: true },
      { id: 4, nombre: 'Dimensional por CMM', activo: true },
      { id: 5, nombre: 'Visual subjetiva', activo: false },
    ],
  },
  {
    titulo: 'Operaciones',
    registros: 31,
    items: [
      { id: 1, nombre: 'Torneado CNC', activo: true },
      { id: 2, nombre: 'Fresado', activo: true },
      { id: 3, nombre: 'Rectificado', activo: true },
      { id: 4, nombre: 'Soldadura MIG', activo: true },
      { id: 5, nombre: 'Pintura electrostática', activo: false },
    ],
  },
  {
    titulo: 'Actividades',
    registros: 14,
    items: [
      { id: 1, nombre: 'Configuración de máquina', activo: true },
      { id: 2, nombre: 'Limpieza de área', activo: true },
      { id: 3, nombre: 'Calibración de instrumento', activo: true },
      { id: 4, nombre: 'Registro de trazabilidad', activo: true },
      { id: 5, nombre: 'Inventario de WIP', activo: false },
    ],
  },
]

const PARAMETROS_INIT: Parametro[] = [
  { label: 'OEE Mínimo aceptable', descripcion: 'Umbral para alerta roja en dashboard ejecutivo', valor: '70', unidad: '%', activo: true },
  { label: 'Alerta scrap rate', descripcion: 'Dispara notificación al supervisor de calidad', valor: '3', unidad: '%', activo: true },
  { label: 'Alerta tiempo de parada', descripcion: 'Tiempo sin producción que genera alerta crítica', valor: '30', unidad: 'min', activo: true },
  { label: 'WIP máximo por celda', descripcion: 'Límite de unidades en proceso simultáneas por celda', valor: '500', unidad: 'un', activo: true },
  { label: 'Lead time máximo', descripcion: 'Tiempo total de ciclo esperado por OP en producción', valor: '8', unidad: 'h', activo: true },
  { label: 'Inspección obligatoria si defectos >', descripcion: 'Activa protocolo de inspección 100% al superar umbral', valor: '5', unidad: 'defectos', activo: true },
  { label: 'Bloqueo automático lote si rechazos >', descripcion: 'Congela liberación del lote para revisión de calidad', valor: '2', unidad: 'rechazos', activo: false },
]

const INTEGRACIONES_INIT: Integracion[] = [
  { nombre: 'Enterprise Resource Planning', sigla: 'ERP', descripcion: 'Sync órdenes de producción, listas de materiales y costos', estado: 'activo', ultimaSync: '2026-06-20 08:45', activo: true },
  { nombre: 'Warehouse Management System', sigla: 'WMS', descripcion: 'Entradas y salidas de inventario de materias primas y PT', estado: 'activo', ultimaSync: '2026-06-20 09:12', activo: true },
  { nombre: 'Quality Management System', sigla: 'QMS', descripcion: 'Registros de calidad, NCR y planes de control', estado: 'activo', ultimaSync: '2026-06-20 07:30', activo: true },
  { nombre: 'Computerized Maint. Mgmt.', sigla: 'CMMS/EAM', descripcion: 'OTs de mantenimiento, disponibilidad de equipos', estado: 'activo', ultimaSync: '2026-06-20 06:00', activo: true },
  { nombre: 'Human Capital Management', sigla: 'HCM', descripcion: 'Turnos, asistencia y horas de operario por celda', estado: 'activo', ultimaSync: '2026-06-20 05:00', activo: true },
  { nombre: 'Transportation Mgmt. System', sigla: 'TMS', descripcion: 'Despachos de producto terminado y OTIF de entrega', estado: 'inactivo', ultimaSync: 'Sin sincronizar', activo: false },
  { nombre: 'Document Mgmt. System', sigla: 'DMS', descripcion: 'Planos, instrucciones de trabajo y formatos digitales', estado: 'inactivo', ultimaSync: 'Sin sincronizar', activo: false },
  { nombre: 'Governance, Risk & Compliance', sigla: 'GRC', descripcion: 'Auditorías, riesgos de proceso y cumplimiento normativo', estado: 'pendiente', ultimaSync: 'Pendiente configuración', activo: false },
]

const USUARIOS_DATA: UsuarioMES[] = [
  { id: 1, nombre: 'Carlos Mendoza', email: 'c.mendoza@icoltrans.com.co', rol: 'Administrador', planta: 'Bogotá', lineas: ['Todas'], activo: true, ultimaSesion: '2026-06-20 08:12' },
  { id: 2, nombre: 'Luisa Fernanda Torres', email: 'l.torres@icoltrans.com.co', rol: 'Supervisor', planta: 'Bogotá', lineas: ['L1', 'L2', 'L3'], activo: true, ultimaSesion: '2026-06-20 07:45' },
  { id: 3, nombre: 'Andrés Felipe Ríos', email: 'a.rios@icoltrans.com.co', rol: 'Supervisor', planta: 'Medellín', lineas: ['L4', 'L5'], activo: true, ultimaSesion: '2026-06-19 16:30' },
  { id: 4, nombre: 'María Camila Gómez', email: 'm.gomez@icoltrans.com.co', rol: 'Analista', planta: 'Bogotá', lineas: ['L1', 'L2'], activo: true, ultimaSesion: '2026-06-20 09:05' },
  { id: 5, nombre: 'Jorge Ernesto Vargas', email: 'j.vargas@icoltrans.com.co', rol: 'Operario', planta: 'Bogotá', lineas: ['L1'], activo: true, ultimaSesion: '2026-06-20 06:00' },
  { id: 6, nombre: 'Sandra Milena Patiño', email: 's.patino@icoltrans.com.co', rol: 'Operario', planta: 'Cali', lineas: ['L6'], activo: true, ultimaSesion: '2026-06-20 05:55' },
  { id: 7, nombre: 'Ricardo Leal', email: 'r.leal@icoltrans.com.co', rol: 'Analista', planta: 'Medellín', lineas: ['L3', 'L4', 'L5'], activo: false, ultimaSesion: '2026-06-10 14:22' },
  { id: 8, nombre: 'Diana Marcela Ortiz', email: 'd.ortiz@icoltrans.com.co', rol: 'Operario', planta: 'Barranquilla', lineas: ['L2'], activo: true, ultimaSesion: '2026-06-20 06:15' },
]

// ── Color helpers ─────────────────────────────────────────────────────────────
const rolColor = (r: string) =>
  ({ Administrador: '#EF4444', Supervisor: '#F59E0B', Analista: MES_COLOR, Operario: '#32AC5C' })[r] ?? '#9CA3AF'

const integColor = (e: string) =>
  ({ activo: '#32AC5C', inactivo: '#9CA3AF', pendiente: '#F59E0B' })[e] ?? '#9CA3AF'

const integIcon = (e: string) =>
  ({ activo: <ActiveIcon sx={{ fontSize: 14 }} />, inactivo: <InactiveIcon sx={{ fontSize: 14 }} />, pendiente: <PendingIcon sx={{ fontSize: 14 }} /> })[e]

// ── Main Component ────────────────────────────────────────────────────────────
export default function MESConfig() {
  const [tab, setTab] = useState(0)

  // Catálogos state
  const [searchCat, setSearchCat] = useState<string[]>(CATALOGOS_DATA.map(() => ''))

  // Parámetros state
  const [parametros, setParametros] = useState<Parametro[]>(PARAMETROS_INIT)

  // Integraciones state
  const [integraciones, setIntegraciones] = useState<Integracion[]>(INTEGRACIONES_INIT)

  // Usuarios state
  const [usuarios, setUsuarios] = useState<UsuarioMES[]>(USUARIOS_DATA)

  // Handlers
  const handleParamSwitch = (idx: number, val: boolean) => {
    setParametros(prev => prev.map((p, i) => i === idx ? { ...p, activo: val } : p))
  }
  const handleParamValor = (idx: number, val: string) => {
    setParametros(prev => prev.map((p, i) => i === idx ? { ...p, valor: val } : p))
  }
  const handleIntegSwitch = (idx: number, val: boolean) => {
    setIntegraciones(prev => prev.map((g, i) => i === idx ? { ...g, activo: val, estado: val ? 'activo' : 'inactivo' } : g))
  }
  const handleUserSwitch = (id: number, val: boolean) => {
    setUsuarios(prev => prev.map(u => u.id === id ? { ...u, activo: val } : u))
  }

  return (
    <Layout>
      <Box sx={{ p: 3, background: DARK_BG, minHeight: '100vh' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} mb={3}>
          <Box sx={{ p: 1.5, borderRadius: 2, background: alpha(MES_COLOR, 0.15), color: MES_COLOR }}>
            <SettingsIcon sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={700} color="white">Configuración MES</Typography>
            <Typography variant="body2" color="grey.400">Catálogos, parámetros, integraciones y usuarios del sistema</Typography>
          </Box>
        </Stack>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              '& .MuiTab-root': { color: 'grey.400', textTransform: 'none', fontWeight: 600 },
              '& .Mui-selected': { color: MES_COLOR },
              '& .MuiTabs-indicator': { backgroundColor: MES_COLOR },
            }}
          >
            {[
              <Stack key={0} direction="row" alignItems="center" spacing={0.7}><CatalogIcon sx={{ fontSize: 16 }} /><span>Catálogos</span></Stack>,
              <Stack key={1} direction="row" alignItems="center" spacing={0.7}><TuneIcon sx={{ fontSize: 16 }} /><span>Parámetros</span></Stack>,
              <Stack key={2} direction="row" alignItems="center" spacing={0.7}><LinkIcon sx={{ fontSize: 16 }} /><span>Integraciones</span></Stack>,
              <Stack key={3} direction="row" alignItems="center" spacing={0.7}><PeopleIcon sx={{ fontSize: 16 }} /><span>Usuarios MES</span></Stack>,
            ].map((label, i) => <Tab key={i} label={label} />)}
          </Tabs>
        </Box>

        {/* ── Tab 0: Catálogos ─────────────────────────────────────────────── */}
        {tab === 0 && (
          <Grid container spacing={2.5}>
            {CATALOGOS_DATA.map((cat, ci) => {
              const filtered = cat.items.filter(it =>
                it.nombre.toLowerCase().includes(searchCat[ci].toLowerCase())
              )
              return (
                <Grid key={ci} size={{ xs: 12, md: 4 }}>
                  <Paper sx={{ background: CARD_BG, border: `1px solid ${alpha('#fff', 0.08)}`, height: '100%' }}>
                    <Box sx={{ p: 2, borderBottom: `1px solid ${alpha('#fff', 0.08)}` }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle2" color="white" fontWeight={700}>{cat.titulo}</Typography>
                          <Typography variant="caption" color="grey.500">{cat.registros} registros en total</Typography>
                        </Box>
                        <Button
                          size="small"
                          startIcon={<AddIcon />}
                          sx={{ color: MES_COLOR, textTransform: 'none', fontSize: 12, fontWeight: 600, '&:hover': { background: alpha(MES_COLOR, 0.1) } }}
                        >
                          Agregar
                        </Button>
                      </Stack>
                      <TextField
                        size="small"
                        placeholder="Buscar..."
                        value={searchCat[ci]}
                        onChange={e => {
                          const copy = [...searchCat]
                          copy[ci] = e.target.value
                          setSearchCat(copy)
                        }}
                        fullWidth
                        sx={{
                          mt: 1.5,
                          '& .MuiInputBase-root': { background: alpha('#fff', 0.04), color: 'grey.200', fontSize: 13 },
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha('#fff', 0.1) },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: alpha(MES_COLOR, 0.5) },
                        }}
                      />
                    </Box>
                    <Box sx={{ p: 1 }}>
                      {filtered.map((item, ii) => (
                        <Box
                          key={ii}
                          sx={{
                            px: 1.5, py: 1, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            '&:hover': { background: alpha('#fff', 0.04), '& .item-actions': { opacity: 1 } },
                          }}
                        >
                          <Stack direction="row" spacing={1} alignItems="center" flex={1} minWidth={0}>
                            <Chip
                              label={item.activo ? 'ACTIVO' : 'INACTIVO'}
                              size="small"
                              sx={{
                                fontSize: 9, fontWeight: 700, height: 18,
                                background: alpha(item.activo ? '#32AC5C' : '#9CA3AF', 0.15),
                                color: item.activo ? '#32AC5C' : '#9CA3AF',
                              }}
                            />
                            <Typography variant="caption" color="grey.200" noWrap>{item.nombre}</Typography>
                          </Stack>
                          <Stack className="item-actions" direction="row" sx={{ opacity: 0, transition: 'opacity 0.2s' }}>
                            <IconButton size="small" sx={{ color: MES_COLOR, p: 0.4 }}><EditIcon sx={{ fontSize: 14 }} /></IconButton>
                            <IconButton size="small" sx={{ color: '#EF4444', p: 0.4 }}><DeleteIcon sx={{ fontSize: 14 }} /></IconButton>
                          </Stack>
                        </Box>
                      ))}
                      {filtered.length === 0 && (
                        <Typography variant="caption" color="grey.600" sx={{ px: 1.5, py: 1, display: 'block' }}>Sin resultados</Typography>
                      )}
                    </Box>
                  </Paper>
                </Grid>
              )
            })}
          </Grid>
        )}

        {/* ── Tab 1: Parámetros ────────────────────────────────────────────── */}
        {tab === 1 && (
          <Box>
            <Typography variant="body2" color="grey.400" mb={3}>
              Configure los umbrales y reglas de negocio que controlan alertas, bloqueos y comportamiento automático del MES.
            </Typography>
            <Paper sx={{ background: CARD_BG, border: `1px solid ${alpha('#fff', 0.08)}` }}>
              <Stack divider={<Divider sx={{ borderColor: alpha('#fff', 0.06) }} />}>
                {parametros.map((p, i) => (
                  <Box key={i} sx={{ px: 3, py: 2, '&:hover': { background: alpha('#fff', 0.02) } }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Switch
                        checked={p.activo}
                        onChange={e => handleParamSwitch(i, e.target.checked)}
                        size="small"
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': { color: MES_COLOR },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: MES_COLOR },
                        }}
                      />
                      <Box flex={1}>
                        <Typography variant="body2" fontWeight={600} color={p.activo ? 'white' : 'grey.500'}>{p.label}</Typography>
                        <Typography variant="caption" color="grey.500">{p.descripcion}</Typography>
                      </Box>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <TextField
                          size="small"
                          value={p.valor}
                          onChange={e => handleParamValor(i, e.target.value)}
                          disabled={!p.activo}
                          sx={{
                            width: 80,
                            '& .MuiInputBase-root': { background: alpha('#fff', 0.04), color: 'white', fontSize: 14, fontWeight: 700, textAlign: 'right' },
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha(MES_COLOR, p.activo ? 0.4 : 0.1) },
                            '& input': { textAlign: 'center' },
                          }}
                        />
                        <Typography variant="caption" color="grey.400" sx={{ width: 56 }}>{p.unidad}</Typography>
                      </Stack>
                      <Chip
                        label={p.activo ? 'Activo' : 'Inactivo'}
                        size="small"
                        sx={{
                          background: alpha(p.activo ? '#32AC5C' : '#9CA3AF', 0.12),
                          color: p.activo ? '#32AC5C' : '#9CA3AF',
                          fontWeight: 700, fontSize: 10, width: 62,
                        }}
                      />
                    </Stack>
                  </Box>
                ))}
              </Stack>
              <Box sx={{ p: 2.5, borderTop: `1px solid ${alpha('#fff', 0.06)}` }}>
                <Stack direction="row" justifyContent="flex-end" spacing={2}>
                  <Button variant="outlined" size="small" sx={{ textTransform: 'none', borderColor: alpha('#fff', 0.15), color: 'grey.300' }}>
                    Restablecer valores
                  </Button>
                  <Button variant="contained" size="small" sx={{ textTransform: 'none', background: MES_COLOR, '&:hover': { background: '#0E7490' } }}>
                    Guardar parámetros
                  </Button>
                </Stack>
              </Box>
            </Paper>
          </Box>
        )}

        {/* ── Tab 2: Integraciones ─────────────────────────────────────────── */}
        {tab === 2 && (
          <Box>
            <Typography variant="body2" color="grey.400" mb={3}>
              Gestione las conexiones del MES con los sistemas empresariales. Cada integración sincroniza datos en tiempo real o por lotes programados.
            </Typography>
            <Grid container spacing={2.5}>
              {integraciones.map((g, i) => (
                <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
                  <Paper sx={{ background: CARD_BG, border: `1px solid ${alpha(integColor(g.estado), 0.3)}`, height: '100%' }}>
                    <Box sx={{ p: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                        <Box sx={{ p: 1, borderRadius: 1.5, background: alpha(integColor(g.estado), 0.12) }}>
                          <Typography variant="h6" fontWeight={800} color={integColor(g.estado)} sx={{ lineHeight: 1 }}>{g.sigla}</Typography>
                        </Box>
                        <Switch
                          checked={g.activo}
                          onChange={e => handleIntegSwitch(i, e.target.checked)}
                          size="small"
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': { color: MES_COLOR },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: MES_COLOR },
                          }}
                        />
                      </Stack>
                      <Typography variant="body2" fontWeight={700} color="white" mb={0.5}>{g.nombre}</Typography>
                      <Typography variant="caption" color="grey.400" display="block" mb={1.5} sx={{ lineHeight: 1.4 }}>{g.descripcion}</Typography>
                      <Stack direction="row" alignItems="center" spacing={0.7} mb={0.5}>
                        <Box sx={{ color: integColor(g.estado) }}>{integIcon(g.estado)}</Box>
                        <Chip
                          label={g.estado.charAt(0).toUpperCase() + g.estado.slice(1)}
                          size="small"
                          sx={{ background: alpha(integColor(g.estado), 0.12), color: integColor(g.estado), fontWeight: 700, fontSize: 10 }}
                        />
                      </Stack>
                      <Typography variant="caption" color="grey.600" display="block" mb={1.5}>Últ. sync: {g.ultimaSync}</Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        fullWidth
                        sx={{ textTransform: 'none', borderColor: alpha(MES_COLOR, 0.4), color: MES_COLOR, fontSize: 12, fontWeight: 600, '&:hover': { background: alpha(MES_COLOR, 0.08), borderColor: MES_COLOR } }}
                      >
                        Configurar
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* ── Tab 3: Usuarios MES ──────────────────────────────────────────── */}
        {tab === 3 && (
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="body2" color="grey.400">
                {usuarios.filter(u => u.activo).length} usuarios activos de {usuarios.length} registrados
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                sx={{ textTransform: 'none', background: MES_COLOR, fontWeight: 600, '&:hover': { background: '#0E7490' } }}
              >
                Agregar Usuario
              </Button>
            </Stack>
            <Paper sx={{ background: CARD_BG, border: `1px solid ${alpha('#fff', 0.08)}` }}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { color: 'grey.400', fontWeight: 700, borderBottom: `1px solid ${alpha('#fff', 0.1)}`, py: 1.5 } }}>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell align="center">Rol MES</TableCell>
                      <TableCell>Planta</TableCell>
                      <TableCell>Líneas asignadas</TableCell>
                      <TableCell align="center">Activo</TableCell>
                      <TableCell>Última sesión</TableCell>
                      <TableCell align="center">Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {usuarios.map((u, i) => (
                      <TableRow
                        key={u.id}
                        sx={{
                          '& td': { color: 'grey.200', borderBottom: `1px solid ${alpha('#fff', 0.05)}`, py: 1 },
                          '&:hover': { background: alpha('#fff', 0.02) },
                          opacity: u.activo ? 1 : 0.55,
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} color="white">{u.nombre}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="grey.400">{u.email}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={u.rol}
                            size="small"
                            sx={{ background: alpha(rolColor(u.rol), 0.15), color: rolColor(u.rol), fontWeight: 700, fontSize: 10 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{u.planta}</Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                            {u.lineas.map((l, li) => (
                              <Chip
                                key={li}
                                label={l}
                                size="small"
                                sx={{ background: alpha(MES_COLOR, 0.12), color: MES_COLOR, fontSize: 10, height: 18 }}
                              />
                            ))}
                          </Stack>
                        </TableCell>
                        <TableCell align="center">
                          <Switch
                            checked={u.activo}
                            onChange={e => handleUserSwitch(u.id, e.target.checked)}
                            size="small"
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': { color: MES_COLOR },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: MES_COLOR },
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="grey.500">{u.ultimaSesion}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" justifyContent="center">
                            <IconButton size="small" sx={{ color: MES_COLOR, p: 0.5 }}><EditIcon sx={{ fontSize: 16 }} /></IconButton>
                            <IconButton size="small" sx={{ color: '#EF4444', p: 0.5 }}><DeleteIcon sx={{ fontSize: 16 }} /></IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        )}
      </Box>
    </Layout>
  )
}
