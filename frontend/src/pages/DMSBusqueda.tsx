import React, { useState, KeyboardEvent } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Chip,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  Switch,
  Alert,
  Stack,
  Divider,
  Tabs,
  Tab,
  alpha,
  SelectChangeEvent,
} from '@mui/material'
import {
  Search,
  FilterList,
  PictureAsPdf,
  Description,
  TableChart,
  Image,
  Article,
  Clear,
  History,
  TravelExplore,
  Scanner,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const DMS_COLOR = '#0E7490'

// ─── Interfaces ─────────────────────────────────────────────────────────────

interface DocResult {
  id: string
  code: string
  name: string
  category: string
  status: 'Vigente' | 'Archivado' | 'Vencido' | 'Pendiente'
  area: string
  date: string
  owner: string
  snippet: string
  fileType: 'pdf' | 'word' | 'excel' | 'imagen' | 'otro'
  type: 'documento' | 'expediente' | 'version'
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const CONTRATO_RESULTS: DocResult[] = [
  {
    id: '1',
    code: 'CL-2024-0145',
    name: 'Contrato Laboral CL-2024-0145',
    category: 'Contratos',
    status: 'Vigente',
    area: 'RRHH',
    date: '2024-03-15',
    owner: 'Carlos Martínez',
    snippet:
      'Contrato laboral indefinido para el cargo de Auxiliar de Logística. Cláusula de confidencialidad aplicada.',
    fileType: 'pdf',
    type: 'documento',
  },
  {
    id: '2',
    code: 'CL-2024-0146',
    name: 'Contrato Laboral CL-2024-0146',
    category: 'Contratos',
    status: 'Vigente',
    area: 'RRHH',
    date: '2024-04-01',
    owner: 'María Rodríguez',
    snippet:
      'Contrato laboral a término fijo por seis meses. Aplica período de prueba de dos meses.',
    fileType: 'pdf',
    type: 'documento',
  },
  {
    id: '3',
    code: 'CL-2024-0147',
    name: 'Contrato Laboral CL-2024-0147',
    category: 'Contratos',
    status: 'Archivado',
    area: 'RRHH',
    date: '2023-12-01',
    owner: 'Juan Pérez',
    snippet:
      'Contrato laboral finalizado. Liquidación de prestaciones sociales completada el 28 de febrero de 2024.',
    fileType: 'pdf',
    type: 'documento',
  },
  {
    id: '4',
    code: 'CP-2024-0067',
    name: 'Contrato Proveedor CP-2024-0067',
    category: 'Contratos',
    status: 'Vigente',
    area: 'Compras',
    date: '2024-01-10',
    owner: 'Grupo Colgas',
    snippet:
      'Contrato de suministro de combustible para flota vehicular. Precio fijo por galón durante 12 meses.',
    fileType: 'pdf',
    type: 'documento',
  },
  {
    id: '5',
    code: 'CP-2024-0068',
    name: 'Contrato Proveedor Llantas CP-2024-0068',
    category: 'Contratos',
    status: 'Pendiente',
    area: 'Compras',
    date: '2024-06-01',
    owner: 'Michelin Colombia',
    snippet:
      'Contrato de suministro de llantas para vehículos de carga. Pendiente de firma por parte jurídica.',
    fileType: 'word',
    type: 'documento',
  },
  {
    id: '6',
    code: 'CST-2024-0023',
    name: 'Contrato Servicio Transporte CST-2024-0023',
    category: 'Contratos',
    status: 'Vigente',
    area: 'Operaciones',
    date: '2024-02-20',
    owner: 'Almacenes Éxito',
    snippet:
      'Contrato de transporte de carga a nivel nacional. Cobertura en 15 ciudades principales de Colombia.',
    fileType: 'pdf',
    type: 'documento',
  },
]

const GENERIC_RESULTS: DocResult[] = [
  {
    id: 'g1',
    code: 'FAC-2024-1890',
    name: 'Factura Proveedor Combustible FAC-2024-1890',
    category: 'Facturas',
    status: 'Archivado',
    area: 'Finanzas',
    date: '2024-05-30',
    owner: 'Terpel S.A.',
    snippet:
      'Factura de compra de combustible ACPM para flota de camiones. Total: $12.450.000 COP.',
    fileType: 'pdf',
    type: 'documento',
  },
  {
    id: 'g2',
    code: 'POL-2024-0034',
    name: 'Póliza SOAT Vehículos POL-2024-0034',
    category: 'Pólizas',
    status: 'Vencido',
    area: 'Operaciones',
    date: '2024-01-31',
    owner: 'Seguros Bolívar',
    snippet:
      'Póliza SOAT para flota de 12 vehículos. Renovación requerida antes del 31 de enero de 2025.',
    fileType: 'pdf',
    type: 'documento',
  },
  {
    id: 'g3',
    code: 'EXP-2024-0089',
    name: 'Expediente Personal EXP-2024-0089',
    category: 'Expedientes',
    status: 'Vigente',
    area: 'RRHH',
    date: '2024-03-10',
    owner: 'Luz Adriana Gómez',
    snippet:
      'Expediente de empleado con documentos de ingreso, certificaciones y evaluaciones de desempeño.',
    fileType: 'otro',
    type: 'expediente',
  },
  {
    id: 'g4',
    code: 'INF-2024-0015',
    name: 'Informe Gestión Flota Q1-2024',
    category: 'Informes',
    status: 'Archivado',
    area: 'Operaciones',
    date: '2024-04-05',
    owner: 'Andrés Castellanos',
    snippet:
      'Informe trimestral de gestión de flota. Indicadores de eficiencia, consumo y mantenimiento preventivo.',
    fileType: 'excel',
    type: 'documento',
  },
  {
    id: 'g5',
    code: 'NOR-2024-0007',
    name: 'Normativa Transporte Carga Especial',
    category: 'Normativa',
    status: 'Vigente',
    area: 'Legal',
    date: '2024-02-01',
    owner: 'Ministerio de Transporte',
    snippet:
      'Resolución 001234 de 2024. Regula el transporte de carga de dimensiones especiales en vías nacionales.',
    fileType: 'pdf',
    type: 'documento',
  },
  {
    id: 'g6',
    code: 'FAC-2024-2001',
    name: 'Factura Servicio Mantenimiento FAC-2024-2001',
    category: 'Facturas',
    status: 'Vigente',
    area: 'Operaciones',
    date: '2024-06-10',
    owner: 'Tecnicar Ltda.',
    snippet:
      'Factura por mantenimiento preventivo de tractocamiones. Incluye cambio de aceite y filtros.',
    fileType: 'pdf',
    type: 'documento',
  },
  {
    id: 'g7',
    code: 'POL-2024-0041',
    name: 'Póliza Responsabilidad Civil POL-2024-0041',
    category: 'Pólizas',
    status: 'Vigente',
    area: 'Legal',
    date: '2024-05-01',
    owner: 'Allianz Seguros',
    snippet:
      'Póliza de responsabilidad civil extracontractual para actividades de carga y transporte en Colombia.',
    fileType: 'pdf',
    type: 'documento',
  },
  {
    id: 'g8',
    code: 'EXP-2024-0102',
    name: 'Expediente Ruta Bogotá-Medellín EXP-2024-0102',
    category: 'Expedientes',
    status: 'Vigente',
    area: 'Operaciones',
    date: '2024-06-15',
    owner: 'Coordinador de Rutas',
    snippet:
      'Expediente de ruta con manifiestos de carga, guías y documentos de despacho para el corredor Bogotá-Medellín.',
    fileType: 'otro',
    type: 'expediente',
  },
]

const RECENT_SEARCHES = [
  'contratos 2024',
  'SOAT vencidos',
  'facturas proveedores',
  'expedientes empleados',
  'pólizas seguro',
]

const STATUS_COLORS: Record<string, 'success' | 'default' | 'error' | 'warning'> = {
  Vigente: 'success',
  Archivado: 'default',
  Vencido: 'error',
  Pendiente: 'warning',
}

// ─── Helper Components ────────────────────────────────────────────────────────

function FileIcon({ type }: { type: DocResult['fileType'] }) {
  const sx = { fontSize: 32 }
  switch (type) {
    case 'pdf':
      return <PictureAsPdf sx={{ ...sx, color: '#EF4444' }} />
    case 'word':
      return <Description sx={{ ...sx, color: '#2563EB' }} />
    case 'excel':
      return <TableChart sx={{ ...sx, color: '#16A34A' }} />
    case 'imagen':
      return <Image sx={{ ...sx, color: '#9333EA' }} />
    default:
      return <Article sx={{ ...sx, color: DMS_COLOR }} />
  }
}

function HighlightedText({ text, term }: { text: string; term: string }) {
  if (!term.trim()) return <>{text}</>
  const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <span key={i} style={{ backgroundColor: '#FEF08A' }}>
            {part}
          </span>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DMSBusqueda() {
  const [searchTerm, setSearchTerm] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [activeTab, setActiveTab] = useState(0)
  const [sortBy, setSortBy] = useState('relevancia')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [statuses, setStatuses] = useState<Record<string, boolean>>({
    Vigente: false,
    Archivado: false,
    Vencido: false,
    Pendiente: false,
  })
  const [area, setArea] = useState('')
  const [owner, setOwner] = useState('')
  const [fileTypes, setFileTypes] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [ocrEnabled, setOcrEnabled] = useState(false)

  // ── Derived results ────────────────────────────────────────────────────────

  const allResults: DocResult[] = (() => {
    if (!searchTerm.trim()) return []
    if (searchTerm.toLowerCase().includes('contrato')) return CONTRATO_RESULTS
    return GENERIC_RESULTS
  })()

  const filteredResults = allResults.filter((r) => {
    if (activeTab === 1 && r.type !== 'documento') return false
    if (activeTab === 2 && r.type !== 'expediente') return false
    if (activeTab === 3 && r.type !== 'version') return false
    return true
  })

  const sortedResults = [...filteredResults].sort((a, b) => {
    if (sortBy === 'fecha') return b.date.localeCompare(a.date)
    if (sortBy === 'nombre') return a.name.localeCompare(b.name)
    return 0
  })

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleSearch() {
    setSearchTerm(inputValue)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSearch()
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && tagInput.trim()) {
      setTags((prev) => [...prev, tagInput.trim()])
      setTagInput('')
    }
  }

  function handleStatusChange(status: string) {
    setStatuses((prev) => ({ ...prev, [status]: !prev[status] }))
  }

  function handleClearFilters() {
    setDateFrom('')
    setDateTo('')
    setCategories([])
    setStatuses({ Vigente: false, Archivado: false, Vencido: false, Pendiente: false })
    setArea('')
    setOwner('')
    setFileTypes([])
    setTags([])
  }

  function handleRecentSearch(term: string) {
    setInputValue(term)
    setSearchTerm(term)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Layout title="Búsqueda Avanzada">
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

        {/* ── Search Bar ─────────────────────────────────────────────────── */}
        <Box
          sx={{
            px: 3,
            py: 2,
            borderBottom: `1px solid`,
            borderColor: 'divider',
            backgroundColor: 'background.paper',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, maxWidth: 900 }}>
            <TextField
              fullWidth
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Buscar documentos, expedientes, contenido... (OCR)"
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  height: 56,
                  fontSize: '1rem',
                  '&.Mui-focused fieldset': { borderColor: DMS_COLOR },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: DMS_COLOR }} />
                  </InputAdornment>
                ),
                endAdornment: inputValue ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => { setInputValue(''); setSearchTerm('') }}>
                      <Clear fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />
            <Button
              variant="contained"
              size="large"
              onClick={handleSearch}
              sx={{
                height: 56,
                px: 3,
                backgroundColor: DMS_COLOR,
                '&:hover': { backgroundColor: alpha(DMS_COLOR, 0.85) },
                whiteSpace: 'nowrap',
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Buscar
            </Button>
          </Box>
        </Box>

        {/* ── Main Content ───────────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* ── Left Panel: Filtros ──────────────────────────────────────── */}
          <Box
            sx={{
              width: 240,
              flexShrink: 0,
              overflowY: 'auto',
              borderRight: `1px solid`,
              borderColor: 'divider',
              backgroundColor: 'background.paper',
              p: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <FilterList sx={{ color: DMS_COLOR, fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight={700} color={DMS_COLOR}>
                Filtros Avanzados
              </Typography>
            </Box>

            <Stack spacing={2.5} divider={<Divider />}>
              {/* Rango de fechas */}
              <Box>
                <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Rango de Fechas
                </Typography>
                <Stack spacing={1} mt={1}>
                  <TextField
                    label="Desde"
                    type="date"
                    size="small"
                    fullWidth
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ '& .Mui-focused fieldset': { borderColor: DMS_COLOR } }}
                  />
                  <TextField
                    label="Hasta"
                    type="date"
                    size="small"
                    fullWidth
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ '& .Mui-focused fieldset': { borderColor: DMS_COLOR } }}
                  />
                </Stack>
              </Box>

              {/* Categoría */}
              <Box>
                <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Categoría
                </Typography>
                <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                  <InputLabel>Seleccionar</InputLabel>
                  <Select
                    multiple
                    value={categories}
                    label="Seleccionar"
                    onChange={(e: SelectChangeEvent<string[]>) =>
                      setCategories(typeof e.target.value === 'string' ? [e.target.value] : e.target.value)
                    }
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
                        {(selected as string[]).map((val) => (
                          <Chip key={val} label={val} size="small" />
                        ))}
                      </Box>
                    )}
                    sx={{ '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: DMS_COLOR } }}
                  >
                    {['Contratos', 'Facturas', 'Pólizas', 'Expedientes', 'Informes', 'Normativa'].map((cat) => (
                      <MenuItem key={cat} value={cat}>
                        {cat}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Estado */}
              <Box>
                <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Estado
                </Typography>
                <FormGroup sx={{ mt: 0.5 }}>
                  {Object.keys(statuses).map((s) => (
                    <FormControlLabel
                      key={s}
                      control={
                        <Checkbox
                          size="small"
                          checked={statuses[s]}
                          onChange={() => handleStatusChange(s)}
                          sx={{ '&.Mui-checked': { color: DMS_COLOR } }}
                        />
                      }
                      label={<Typography variant="body2">{s}</Typography>}
                    />
                  ))}
                </FormGroup>
              </Box>

              {/* Área/Carpeta */}
              <Box>
                <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Área / Carpeta
                </Typography>
                <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                  <InputLabel>Área</InputLabel>
                  <Select
                    value={area}
                    label="Área"
                    onChange={(e) => setArea(e.target.value)}
                    sx={{ '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: DMS_COLOR } }}
                  >
                    <MenuItem value="">Todas</MenuItem>
                    {['Operaciones', 'Finanzas', 'RRHH', 'Legal', 'Gerencia'].map((a) => (
                      <MenuItem key={a} value={a}>{a}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              {/* Propietario */}
              <Box>
                <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Propietario
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Nombre o empresa"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  sx={{ mt: 1, '& .Mui-focused fieldset': { borderColor: DMS_COLOR } }}
                />
              </Box>

              {/* Tipo de archivo */}
              <Box>
                <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Tipo de Archivo
                </Typography>
                <ToggleButtonGroup
                  value={fileTypes}
                  onChange={(_e, val) => setFileTypes(val)}
                  size="small"
                  sx={{
                    mt: 1,
                    flexWrap: 'wrap',
                    gap: 0.5,
                    '& .MuiToggleButton-root.Mui-selected': {
                      backgroundColor: alpha(DMS_COLOR, 0.15),
                      color: DMS_COLOR,
                      borderColor: DMS_COLOR,
                    },
                  }}
                >
                  {[
                    { val: 'pdf', label: 'PDF' },
                    { val: 'word', label: 'Word' },
                    { val: 'excel', label: 'Excel' },
                    { val: 'imagen', label: 'Imagen' },
                    { val: 'otro', label: 'Otro' },
                  ].map(({ val, label }) => (
                    <ToggleButton key={val} value={val} sx={{ fontSize: '0.7rem', px: 1, py: 0.4 }}>
                      {label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Box>

              {/* Tags */}
              <Box>
                <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Etiquetas
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Agregar tag + Enter"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  sx={{ mt: 1, '& .Mui-focused fieldset': { borderColor: DMS_COLOR } }}
                />
                {tags.length > 0 && (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                    {tags.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        onDelete={() => setTags((prev) => prev.filter((t) => t !== tag))}
                        sx={{ backgroundColor: alpha(DMS_COLOR, 0.1), color: DMS_COLOR }}
                      />
                    ))}
                  </Box>
                )}
              </Box>

              {/* Limpiar filtros */}
              <Button
                fullWidth
                variant="outlined"
                size="small"
                onClick={handleClearFilters}
                startIcon={<Clear />}
                sx={{
                  textTransform: 'none',
                  borderColor: DMS_COLOR,
                  color: DMS_COLOR,
                  '&:hover': { backgroundColor: alpha(DMS_COLOR, 0.05) },
                }}
              >
                Limpiar filtros
              </Button>
            </Stack>
          </Box>

          {/* ── Right Panel: Resultados ──────────────────────────────────── */}
          <Box sx={{ flex: 1, overflowY: 'auto', p: 3, backgroundColor: (theme) => theme.palette.grey[50] }}>

            {searchTerm ? (
              <>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" fontWeight={700}>
                    <Box component="span" sx={{ color: DMS_COLOR }}>{sortedResults.length}</Box>{' '}
                    documento{sortedResults.length !== 1 ? 's' : ''} encontrado{sortedResults.length !== 1 ? 's' : ''}
                  </Typography>
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Ordenar por</InputLabel>
                    <Select
                      value={sortBy}
                      label="Ordenar por"
                      onChange={(e) => setSortBy(e.target.value)}
                      sx={{ '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: DMS_COLOR } }}
                    >
                      <MenuItem value="relevancia">Relevancia</MenuItem>
                      <MenuItem value="fecha">Fecha</MenuItem>
                      <MenuItem value="nombre">Nombre</MenuItem>
                    </Select>
                  </FormControl>
                </Box>

                {/* Tabs */}
                <Tabs
                  value={activeTab}
                  onChange={(_e, val) => setActiveTab(val)}
                  sx={{
                    mb: 2,
                    borderBottom: `1px solid`,
                    borderColor: 'divider',
                    '& .MuiTab-root.Mui-selected': { color: DMS_COLOR },
                    '& .MuiTabs-indicator': { backgroundColor: DMS_COLOR },
                  }}
                >
                  <Tab label="Todos" sx={{ textTransform: 'none', fontWeight: 600 }} />
                  <Tab label="Documentos" sx={{ textTransform: 'none', fontWeight: 600 }} />
                  <Tab label="Expedientes" sx={{ textTransform: 'none', fontWeight: 600 }} />
                  <Tab label="Versiones" sx={{ textTransform: 'none', fontWeight: 600 }} />
                </Tabs>

                {/* Results list */}
                {sortedResults.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 8 }}>
                    <TravelExplore sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                    <Typography color="text.secondary">No se encontraron resultados en esta categoría</Typography>
                  </Box>
                ) : (
                  <Stack spacing={1.5}>
                    {sortedResults.map((doc) => (
                      <Card
                        key={doc.id}
                        variant="outlined"
                        sx={{
                          cursor: 'pointer',
                          transition: 'box-shadow 0.2s',
                          '&:hover': { boxShadow: `0 0 0 2px ${alpha(DMS_COLOR, 0.4)}` },
                        }}
                      >
                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                            <Box sx={{ pt: 0.5, flexShrink: 0 }}>
                              <FileIcon type={doc.fileType} />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.4 }}>
                                <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                                  {doc.code}
                                </Typography>
                                <Chip
                                  label={doc.status}
                                  size="small"
                                  color={STATUS_COLORS[doc.status]}
                                  sx={{ height: 18, fontSize: '0.65rem' }}
                                />
                                <Chip
                                  label={doc.category}
                                  size="small"
                                  variant="outlined"
                                  sx={{ height: 18, fontSize: '0.65rem', borderColor: DMS_COLOR, color: DMS_COLOR }}
                                />
                              </Box>
                              <Typography variant="subtitle2" fontWeight={700} noWrap>
                                <HighlightedText text={doc.name} term={searchTerm} />
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.4, lineHeight: 1.4 }}>
                                <HighlightedText text={doc.snippet} term={searchTerm} />
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 2, mt: 0.8, flexWrap: 'wrap' }}>
                                <Typography variant="caption" color="text.secondary">
                                  Área: <strong>{doc.area}</strong>
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Propietario: <strong>{doc.owner}</strong>
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Fecha: <strong>{doc.date}</strong>
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                )}
              </>
            ) : (
              /* Empty state */
              <Box>
                {/* Búsquedas recientes */}
                <Card variant="outlined" sx={{ mb: 3 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <History sx={{ color: DMS_COLOR }} />
                      <Typography variant="subtitle1" fontWeight={700}>
                        Búsquedas Recientes
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {RECENT_SEARCHES.map((term) => (
                        <Chip
                          key={term}
                          label={term}
                          clickable
                          onClick={() => handleRecentSearch(term)}
                          icon={<History />}
                          sx={{
                            backgroundColor: alpha(DMS_COLOR, 0.08),
                            color: DMS_COLOR,
                            '& .MuiChip-icon': { color: DMS_COLOR },
                            '&:hover': { backgroundColor: alpha(DMS_COLOR, 0.16) },
                          }}
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>

                {/* OCR Section */}
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Scanner sx={{ color: DMS_COLOR }} />
                      <Typography variant="subtitle1" fontWeight={700}>
                        Búsqueda OCR
                      </Typography>
                    </Box>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={ocrEnabled}
                          onChange={(e) => setOcrEnabled(e.target.checked)}
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': { color: DMS_COLOR },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                              backgroundColor: DMS_COLOR,
                            },
                          }}
                        />
                      }
                      label={<Typography variant="body2">Activar búsqueda OCR</Typography>}
                    />
                    {ocrEnabled && (
                      <Alert
                        severity="info"
                        icon={<Scanner />}
                        sx={{ mt: 2, '& .MuiAlert-icon': { color: DMS_COLOR } }}
                      >
                        El texto en imágenes y PDFs escaneados también se busca
                      </Alert>
                    )}

                    <Box sx={{ mt: 2, p: 2, borderRadius: 1, backgroundColor: alpha(DMS_COLOR, 0.04), border: `1px dashed ${alpha(DMS_COLOR, 0.3)}` }}>
                      <Typography variant="body2" color="text.secondary" textAlign="center">
                        Ingrese un término en la barra de búsqueda para comenzar.<br />
                        Puede buscar por nombre, código, contenido o propietario del documento.
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    </Layout>
  )
}
