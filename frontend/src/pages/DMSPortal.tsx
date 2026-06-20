import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Paper,
  alpha,
  Grid,
  Avatar,
  Button,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Badge,
} from '@mui/material'
import {
  Search,
  CloudDownload,
  Visibility,
  Description,
  Policy,
  Security,
  Emergency,
  Folder,
  FolderSpecial,
  Article,
  Assignment,
  Gavel,
  Engineering,
  People,
  NewReleases,
  Update,
  Draw,
  CheckCircle,
  AccessTime,
  Star,
  PersonOutline,
  Public,
  Shield,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const DMS_COLOR = '#0E7490'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocDestacado {
  id: string
  nombre: string
  descripcion: string
  fechaActualizacion: string
  descargas: number
  icon: React.ReactNode
  color: string
  area: string
  version: string
}

interface Categoria {
  nombre: string
  icon: React.ReactNode
  color: string
  cantidad: number
}

interface DocNovedad {
  nombre: string
  fecha: string
  estado: 'NUEVO' | 'ACTUALIZADO'
  area: string
}

interface DocObligatorio {
  nombre: string
  tipo: string
  accion: string
  vencimiento: string
  urgente: boolean
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const DOCS_DESTACADOS: DocDestacado[] = [
  {
    id: 'DD-001',
    nombre: 'Manual de Calidad ICOLTRANS',
    descripcion: 'Manual del sistema de gestión de calidad, procesos, procedimientos y estándares de la organización.',
    fechaActualizacion: '01/06/2026',
    descargas: 142,
    icon: <Star />,
    color: DMS_COLOR,
    area: 'Calidad',
    version: 'v5.0',
  },
  {
    id: 'DD-002',
    nombre: 'Reglamento Interno de Trabajo',
    descripcion: 'Normas, derechos y deberes de los colaboradores de ICOLTRANS. Lectura obligatoria para todos los empleados.',
    fechaActualizacion: '15/03/2026',
    descargas: 387,
    icon: <Gavel />,
    color: '#7c3aed',
    area: 'RRHH',
    version: 'v2.0',
  },
  {
    id: 'DD-003',
    nombre: 'Política de Seguridad Vial',
    descripcion: 'Lineamientos y compromisos de seguridad vial para conductores y personal que opera vehículos.',
    fechaActualizacion: '14/06/2026',
    descargas: 98,
    icon: <Shield />,
    color: '#059669',
    area: 'SST',
    version: 'v2.1',
  },
  {
    id: 'DD-004',
    nombre: 'Procedimiento de Emergencias',
    descripcion: 'Protocolo de actuación ante emergencias, evacuación, primeros auxilios e incidentes críticos.',
    fechaActualizacion: '01/04/2026',
    descargas: 215,
    icon: <Emergency />,
    color: '#dc2626',
    area: 'SST',
    version: 'v3.0',
  },
]

const CATEGORIAS: Categoria[] = [
  { nombre: 'Contratos', icon: <Description />, color: DMS_COLOR, cantidad: 127 },
  { nombre: 'Políticas', icon: <Policy />, color: '#7c3aed', cantidad: 34 },
  { nombre: 'Procedimientos', icon: <Assignment />, color: '#059669', cantidad: 89 },
  { nombre: 'Manuales', icon: <Article />, color: '#d97706', cantidad: 23 },
  { nombre: 'Normativa Legal', icon: <Gavel />, color: '#dc2626', cantidad: 56 },
  { nombre: 'Técnico / Ingeniería', icon: <Engineering />, color: '#0369a1', cantidad: 41 },
]

const NOVEDADES: DocNovedad[] = [
  { nombre: 'Procedimiento SST-045 Trabajo en Alturas', fecha: '20/06/2026', estado: 'NUEVO', area: 'SST' },
  { nombre: 'Política de Seguridad Vial v2.1', fecha: '14/06/2026', estado: 'ACTUALIZADO', area: 'SST' },
  { nombre: 'Manual de Mantenimiento Preventivo Flota v3.0', fecha: '13/06/2026', estado: 'NUEVO', area: 'Flota' },
  { nombre: 'Reglamento Interno de Trabajo v2.0', fecha: '15/03/2026', estado: 'ACTUALIZADO', area: 'RRHH' },
  { nombre: 'Contrato Marco Logístico — Almacenes Éxito 2026', fecha: '01/06/2026', estado: 'NUEVO', area: 'Comercial' },
]

const DOCS_OBLIGATORIOS: DocObligatorio[] = [
  {
    nombre: 'Política de Seguridad Vial v2.1',
    tipo: 'Política',
    accion: 'Firma requerida',
    vencimiento: '30/06/2026',
    urgente: true,
  },
  {
    nombre: 'Reglamento Interno de Trabajo v2.0',
    tipo: 'Reglamento',
    accion: 'Revisión requerida',
    vencimiento: '15/07/2026',
    urgente: false,
  },
  {
    nombre: 'Procedimiento SST-045 Trabajo en Alturas',
    tipo: 'Procedimiento',
    accion: 'Confirmación de lectura',
    vencimiento: '25/06/2026',
    urgente: true,
  },
]

// ─── Subcomponents ────────────────────────────────────────────────────────────

function DocDestacadoCard({ doc }: { doc: DocDestacado }) {
  return (
    <Card
      sx={{
        borderRadius: 2,
        height: '100%',
        transition: 'box-shadow 0.2s, transform 0.2s',
        '&:hover': { boxShadow: 6, transform: 'translateY(-2px)' },
        borderTop: `4px solid ${doc.color}`,
      }}
    >
      <CardContent>
        <Stack direction="row" alignItems="center" gap={1.5} mb={1.5}>
          <Avatar sx={{ bgcolor: alpha(doc.color, 0.12), color: doc.color, width: 44, height: 44 }}>
            {doc.icon}
          </Avatar>
          <Box flex={1}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2 }}>
              {doc.nombre}
            </Typography>
            <Stack direction="row" gap={0.5} mt={0.5} flexWrap="wrap">
              <Chip label={doc.area} size="small" sx={{ fontSize: '0.6rem', height: 18 }} />
              <Chip label={doc.version} size="small" sx={{ bgcolor: alpha(doc.color, 0.1), color: doc.color, fontSize: '0.6rem', height: 18, fontWeight: 700 }} />
            </Stack>
          </Box>
        </Stack>

        <Typography variant="caption" color="text.secondary" display="block" mb={2} sx={{ lineHeight: 1.5 }}>
          {doc.descripcion}
        </Typography>

        <Stack direction="row" alignItems="center" gap={2} mb={2}>
          <Stack direction="row" alignItems="center" gap={0.5}>
            <AccessTime sx={{ fontSize: 13, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.secondary">{doc.fechaActualizacion}</Typography>
          </Stack>
          <Stack direction="row" alignItems="center" gap={0.5}>
            <CloudDownload sx={{ fontSize: 13, color: 'text.disabled' }} />
            <Typography variant="caption" color="text.secondary">{doc.descargas} descargas</Typography>
          </Stack>
        </Stack>

        <Stack direction="row" gap={1}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<Visibility />}
            sx={{ flex: 1, borderColor: doc.color, color: doc.color, fontSize: '0.72rem' }}
          >
            Ver
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<CloudDownload />}
            sx={{ flex: 1, bgcolor: doc.color, '&:hover': { bgcolor: alpha(doc.color, 0.85) }, fontSize: '0.72rem' }}
          >
            Descargar
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DMSPortal() {
  const [vista, setVista] = useState<'personal' | 'todos'>('todos')
  const [searchVal, setSearchVal] = useState('')

  return (
    <Layout>
      <Box>
        {/* Portal Header */}
        <Box
          sx={{
            background: `linear-gradient(135deg, #060C1A 0%, ${DMS_COLOR} 100%)`,
            p: 3,
            mb: 0,
          }}
        >
          <Stack direction="row" alignItems="center" gap={2} mb={2.5} flexWrap="wrap">
            {/* Logo placeholder */}
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 1.5,
                bgcolor: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FolderSpecial sx={{ color: '#fff', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={800} color="#fff">
                Portal Documental ICOLTRANS
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Sistema de Gestión Documental Empresarial · DMS v2.1
              </Typography>
            </Box>
            <Box flex={1} />
            <ToggleButtonGroup
              value={vista}
              exclusive
              onChange={(_, v) => v && setVista(v)}
              size="small"
              sx={{
                '& .MuiToggleButton-root': { color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.3)', fontSize: '0.75rem' },
                '& .Mui-selected': { bgcolor: 'rgba(255,255,255,0.2) !important', color: '#fff !important' },
              }}
            >
              <ToggleButton value="personal">
                <PersonOutline sx={{ fontSize: 16, mr: 0.5 }} />
                Para mí
              </ToggleButton>
              <ToggleButton value="todos">
                <Public sx={{ fontSize: 16, mr: 0.5 }} />
                Todos
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>

          {/* Search bar */}
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar documentos en el portal..."
            value={searchVal}
            onChange={e => setSearchVal(e.target.value)}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: 'rgba(255,255,255,0.6)', fontSize: 20 }} />,
              sx: {
                bgcolor: 'rgba(255,255,255,0.12)',
                color: '#fff',
                borderRadius: 2,
                '& fieldset': { borderColor: 'rgba(255,255,255,0.25)' },
                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                '& input': { color: '#fff' },
                '& input::placeholder': { color: 'rgba(255,255,255,0.5)', opacity: 1 },
              },
            }}
          />
        </Box>

        <Box sx={{ p: 3 }}>
          {/* Documentos Obligatorios — show for personal view */}
          {(vista === 'personal') && (
            <Box mb={4}>
              <Stack direction="row" alignItems="center" gap={1} mb={2}>
                <Badge badgeContent={3} color="error">
                  <Draw sx={{ color: '#dc2626' }} />
                </Badge>
                <Typography variant="h6" fontWeight={700} color="#dc2626">
                  Documentos que requieren tu atención
                </Typography>
              </Stack>
              <Stack gap={1.5}>
                {DOCS_OBLIGATORIOS.map((doc, i) => (
                  <Paper
                    key={i}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      borderLeft: `4px solid ${doc.urgente ? '#dc2626' : '#d97706'}`,
                      bgcolor: doc.urgente ? alpha('#dc2626', 0.04) : alpha('#d97706', 0.04),
                    }}
                  >
                    <Stack direction="row" alignItems="center" gap={2} flexWrap="wrap">
                      <Box flex={1}>
                        <Stack direction="row" alignItems="center" gap={1} mb={0.5} flexWrap="wrap">
                          <Typography variant="body2" fontWeight={700}>{doc.nombre}</Typography>
                          <Chip
                            label={doc.urgente ? 'URGENTE' : 'PENDIENTE'}
                            size="small"
                            sx={{
                              bgcolor: doc.urgente ? alpha('#dc2626', 0.1) : alpha('#d97706', 0.1),
                              color: doc.urgente ? '#dc2626' : '#d97706',
                              fontWeight: 700,
                              fontSize: '0.62rem',
                            }}
                          />
                        </Stack>
                        <Stack direction="row" gap={2}>
                          <Typography variant="caption" color="text.secondary">{doc.accion}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Vence: {doc.vencimiento}
                          </Typography>
                        </Stack>
                      </Box>
                      <Stack direction="row" gap={1}>
                        <Button size="small" variant="outlined" sx={{ borderColor: doc.urgente ? '#dc2626' : '#d97706', color: doc.urgente ? '#dc2626' : '#d97706', fontSize: '0.72rem' }}>
                          Ver documento
                        </Button>
                        <Button size="small" variant="contained" sx={{ bgcolor: doc.urgente ? '#dc2626' : '#d97706', '&:hover': { bgcolor: doc.urgente ? '#b91c1c' : '#b45309' }, fontSize: '0.72rem' }}>
                          {doc.accion.split(' ')[0]}
                        </Button>
                      </Stack>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}

          {/* Documentos Destacados */}
          <Box mb={4}>
            <Stack direction="row" alignItems="center" gap={1} mb={2}>
              <Star sx={{ color: DMS_COLOR }} />
              <Typography variant="h6" fontWeight={700}>Documentos Destacados</Typography>
            </Stack>
            <Grid container spacing={2}>
              {DOCS_DESTACADOS.map(doc => (
                <Grid key={doc.id} size={{ xs: 12, sm: 6, md: 3 }}>
                  <DocDestacadoCard doc={doc} />
                </Grid>
              ))}
            </Grid>
          </Box>

          <Grid container spacing={3}>
            {/* Categorías */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Stack direction="row" alignItems="center" gap={1} mb={2}>
                <Folder sx={{ color: DMS_COLOR }} />
                <Typography variant="h6" fontWeight={700}>Categorías</Typography>
              </Stack>
              <Grid container spacing={2}>
                {CATEGORIAS.map(cat => (
                  <Grid key={cat.nombre} size={{ xs: 6, sm: 4 }}>
                    <Card
                      sx={{
                        borderRadius: 2,
                        cursor: 'pointer',
                        transition: 'box-shadow 0.2s, transform 0.2s',
                        '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
                      }}
                    >
                      <CardContent sx={{ textAlign: 'center', py: 3 }}>
                        <Avatar sx={{ bgcolor: alpha(cat.color, 0.12), color: cat.color, width: 52, height: 52, mx: 'auto', mb: 1.5 }}>
                          {cat.icon}
                        </Avatar>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ lineHeight: 1.2 }}>
                          {cat.nombre}
                        </Typography>
                        <Typography variant="caption" color={cat.color} fontWeight={700}>
                          {cat.cantidad} documentos
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>

            {/* Novedades */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Stack direction="row" alignItems="center" gap={1} mb={2}>
                <NewReleases sx={{ color: '#7c3aed' }} />
                <Typography variant="h6" fontWeight={700}>Novedades</Typography>
              </Stack>
              <Card sx={{ borderRadius: 2 }}>
                <List disablePadding>
                  {NOVEDADES.map((doc, i) => (
                    <React.Fragment key={i}>
                      <ListItem alignItems="flex-start" sx={{ py: 1.5 }}>
                        <ListItemAvatar>
                          <Avatar
                            sx={{
                              bgcolor: doc.estado === 'NUEVO' ? alpha('#16a34a', 0.12) : alpha('#d97706', 0.12),
                              color: doc.estado === 'NUEVO' ? '#16a34a' : '#d97706',
                              width: 36,
                              height: 36,
                            }}
                          >
                            {doc.estado === 'NUEVO' ? <NewReleases sx={{ fontSize: 18 }} /> : <Update sx={{ fontSize: 18 }} />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Stack direction="row" alignItems="center" gap={0.5} flexWrap="wrap">
                              <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.82rem' }}>
                                {doc.nombre}
                              </Typography>
                              <Chip
                                label={doc.estado === 'NUEVO' ? 'NUEVO' : 'ACTUALIZADO'}
                                size="small"
                                sx={{
                                  bgcolor: doc.estado === 'NUEVO' ? alpha('#16a34a', 0.1) : alpha('#d97706', 0.1),
                                  color: doc.estado === 'NUEVO' ? '#16a34a' : '#d97706',
                                  fontWeight: 700,
                                  fontSize: '0.6rem',
                                  height: 18,
                                }}
                              />
                            </Stack>
                          }
                          secondary={
                            <Stack direction="row" gap={1.5} mt={0.5}>
                              <Typography variant="caption" color="text.secondary">{doc.area}</Typography>
                              <Typography variant="caption" color="text.secondary">{doc.fecha}</Typography>
                            </Stack>
                          }
                        />
                      </ListItem>
                      {i < NOVEDADES.length - 1 && <Divider variant="inset" component="li" />}
                    </React.Fragment>
                  ))}
                </List>
              </Card>
            </Grid>
          </Grid>

          {/* Obligatorios (public view) */}
          {vista === 'todos' && (
            <Box mt={4}>
              <Stack direction="row" alignItems="center" gap={1} mb={2}>
                <CheckCircle sx={{ color: DMS_COLOR }} />
                <Typography variant="h6" fontWeight={700}>Documentos Obligatorios</Typography>
                <Typography variant="body2" color="text.secondary">
                  — Los siguientes documentos requieren tu firma o revisión
                </Typography>
              </Stack>
              <Stack gap={1.5}>
                {DOCS_OBLIGATORIOS.map((doc, i) => (
                  <Paper key={i} sx={{ p: 2, borderRadius: 2, borderLeft: `4px solid ${doc.urgente ? '#dc2626' : '#d97706'}` }}>
                    <Stack direction="row" alignItems="center" gap={2} flexWrap="wrap">
                      <Box flex={1}>
                        <Typography variant="body2" fontWeight={700}>{doc.nombre}</Typography>
                        <Stack direction="row" gap={2} mt={0.5}>
                          <Chip label={doc.tipo} size="small" variant="outlined" sx={{ fontSize: '0.62rem', height: 18 }} />
                          <Typography variant="caption" color="text.secondary">{doc.accion}</Typography>
                          <Typography variant="caption" color="text.secondary">Vence: {doc.vencimiento}</Typography>
                        </Stack>
                      </Box>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<Draw />}
                        sx={{ bgcolor: doc.urgente ? '#dc2626' : DMS_COLOR, '&:hover': { opacity: 0.9 }, fontSize: '0.72rem' }}
                      >
                        Firmar / Revisar
                      </Button>
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      </Box>
    </Layout>
  )
}
