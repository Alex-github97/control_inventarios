import React, { useState } from 'react'
import {
  Box,
  Card,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  alpha,
  Tabs,
  Tab,
  Avatar,
  Divider,
} from '@mui/material'
import {
  Add,
  Business,
  AccountTree,
  Language,
  Merge,
  ExpandMore,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

// ─── Palette ──────────────────────────────────────────────────────────────────

const ERP_COLOR  = '#1A3A6B'
const NAVY       = '#0C1E3D'
const BLUE       = '#2563EB'
const PAGE_BG    = '#F0F2F5'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(n?: number): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

// ─── Types ────────────────────────────────────────────────────────────────────

type NormaContable = 'IFRS' | 'US_GAAP' | 'LOCAL'
type MonedaBase    = 'COP' | 'USD' | 'EUR'

interface Empresa {
  id: number
  nit: string
  razon_social: string
  nombre_comercial?: string
  pais: string
  ciudad?: string
  moneda_base: MonedaBase
  sector?: string
  regimen_fiscal?: string
  norma_contable: NormaContable
  es_holding: boolean
  holding_id?: number | null
}

interface ConsolidadoResult {
  periodo: string
  ingresos_operacionales: number
  egresos_operacionales: number
  utilidad_neta: number
  margen_neto: number
}

// ─── KPI Summary Card ─────────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string
  value: string | number
  loading: boolean
  color?: string
}

function SummaryCard({ label, value, loading, color = ERP_COLOR }: SummaryCardProps) {
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: '14px',
        border: '1px solid #E2E8F0',
        borderTop: `3px solid ${color}`,
        bgcolor: '#FFFFFF',
        p: 2.5,
        flex: 1,
        minWidth: 140,
      }}
    >
      {loading ? (
        <>
          <Skeleton width="60%" height={36} />
          <Skeleton width="80%" height={14} sx={{ mt: 0.5 }} />
        </>
      ) : (
        <>
          <Typography
            sx={{
              fontSize: 28,
              fontWeight: 800,
              color,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
            }}
          >
            {value}
          </Typography>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: '#64748B',
              mt: 0.75,
            }}
          >
            {label}
          </Typography>
        </>
      )}
    </Card>
  )
}

// ─── Empresa Card (tree node) ─────────────────────────────────────────────────

interface EmpresaCardProps {
  empresa: Empresa
  isFilial?: boolean
}

const normaColor: Record<NormaContable, string> = {
  IFRS:   '#0891B2',
  US_GAAP: '#7C3AED',
  LOCAL:  '#64748B',
}

function EmpresaCard({ empresa, isFilial = false }: EmpresaCardProps) {
  const initials = getInitials(empresa.razon_social)

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 2,
        p: 2,
        borderRadius: '12px',
        border: '1px solid',
        borderColor: isFilial ? '#E2E8F0' : alpha(ERP_COLOR, 0.25),
        background: isFilial
          ? '#FFFFFF'
          : `linear-gradient(135deg, ${NAVY} 0%, ${ERP_COLOR} 60%, ${BLUE} 100%)`,
        position: 'relative',
        transition: 'box-shadow 0.18s ease',
        '&:hover': {
          boxShadow: isFilial
            ? '0 4px 16px rgba(0,0,0,0.08)'
            : '0 6px 24px rgba(26,58,107,0.35)',
        },
      }}
    >
      <Avatar
        sx={{
          width: 44,
          height: 44,
          borderRadius: '11px',
          bgcolor: isFilial ? alpha(ERP_COLOR, 0.1) : 'rgba(255,255,255,0.18)',
          border: isFilial ? 'none' : '1px solid rgba(255,255,255,0.25)',
          fontSize: 14,
          fontWeight: 800,
          color: isFilial ? ERP_COLOR : '#FFFFFF',
          flexShrink: 0,
        }}
      >
        {initials}
      </Avatar>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 700,
              color: isFilial ? '#0F172A' : '#FFFFFF',
              lineHeight: 1.3,
            }}
          >
            {empresa.razon_social}
          </Typography>
          {empresa.es_holding && (
            <Chip
              label="Holding"
              size="small"
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: '#FFFFFF',
                fontSize: 10,
                fontWeight: 700,
                height: 18,
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            />
          )}
          <Chip
            label={empresa.norma_contable}
            size="small"
            sx={{
              bgcolor: isFilial ? alpha(normaColor[empresa.norma_contable], 0.1) : 'rgba(255,255,255,0.15)',
              color: isFilial ? normaColor[empresa.norma_contable] : '#FFFFFF',
              fontSize: 10,
              fontWeight: 700,
              height: 18,
            }}
          />
        </Box>

        {empresa.nombre_comercial && (
          <Typography
            sx={{
              fontSize: 12,
              color: isFilial ? '#64748B' : 'rgba(255,255,255,0.65)',
              mt: 0.25,
            }}
          >
            {empresa.nombre_comercial}
          </Typography>
        )}

        <Box
          sx={{
            display: 'flex',
            gap: 2,
            mt: 1,
            flexWrap: 'wrap',
          }}
        >
          {[
            { label: 'NIT', value: empresa.nit },
            { label: 'País', value: empresa.pais },
            { label: 'Moneda', value: empresa.moneda_base },
          ].map(({ label, value }) => (
            <Box key={label}>
              <Typography
                sx={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: isFilial ? '#94A3B8' : 'rgba(255,255,255,0.45)',
                }}
              >
                {label}
              </Typography>
              <Typography
                sx={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: isFilial ? '#334155' : 'rgba(255,255,255,0.9)',
                }}
              >
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}

// ─── Nueva Empresa Dialog ─────────────────────────────────────────────────────

interface NewEmpresaDialogProps {
  open: boolean
  onClose: () => void
  holdings: Empresa[]
}

function NewEmpresaDialog({ open, onClose, holdings }: NewEmpresaDialogProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    nit: '',
    razon_social: '',
    nombre_comercial: '',
    pais: '',
    ciudad: '',
    moneda_base: '' as MonedaBase | '',
    sector: '',
    regimen_fiscal: '',
    norma_contable: '' as NormaContable | '',
    es_holding: false,
    holding_id: '',
  })

  const mutation = useMutation({
    mutationFn: (data: object) => apiClient.post('/erp/empresas', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-empresas'] })
      toast.success('Empresa registrada correctamente')
      handleClose()
    },
    onError: () => {
      toast.error('Error al registrar la empresa')
    },
  })

  const handleClose = () => {
    setForm({
      nit: '',
      razon_social: '',
      nombre_comercial: '',
      pais: '',
      ciudad: '',
      moneda_base: '',
      sector: '',
      regimen_fiscal: '',
      norma_contable: '',
      es_holding: false,
      holding_id: '',
    })
    onClose()
  }

  const handleSubmit = () => {
    if (!form.nit || !form.razon_social) {
      toast.error('NIT y Razón Social son obligatorios')
      return
    }
    mutation.mutate({
      ...form,
      holding_id: form.holding_id ? Number(form.holding_id) : null,
      es_holding: form.es_holding,
    })
  }

  const f = (field: keyof typeof form, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          background: `linear-gradient(135deg, ${NAVY} 0%, ${ERP_COLOR} 100%)`,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Business fontSize="small" />
        Nueva Empresa
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <TextField
              label="NIT *"
              fullWidth
              size="small"
              value={form.nit}
              onChange={(e) => f('nit', e.target.value)}
            />
          </Grid>
          <Grid item xs={8}>
            <TextField
              label="Razón Social *"
              fullWidth
              size="small"
              value={form.razon_social}
              onChange={(e) => f('razon_social', e.target.value)}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Nombre Comercial"
              fullWidth
              size="small"
              value={form.nombre_comercial}
              onChange={(e) => f('nombre_comercial', e.target.value)}
            />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>País</InputLabel>
              <Select
                label="País"
                value={form.pais}
                onChange={(e) => f('pais', e.target.value)}
              >
                {['Colombia', 'USA', 'Mexico', 'Panama', 'Ecuador'].map((p) => (
                  <MenuItem key={p} value={p}>{p}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Ciudad"
              fullWidth
              size="small"
              value={form.ciudad}
              onChange={(e) => f('ciudad', e.target.value)}
            />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Moneda Base</InputLabel>
              <Select
                label="Moneda Base"
                value={form.moneda_base}
                onChange={(e) => f('moneda_base', e.target.value)}
              >
                {(['COP', 'USD', 'EUR'] as MonedaBase[]).map((m) => (
                  <MenuItem key={m} value={m}>{m}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Sector"
              fullWidth
              size="small"
              value={form.sector}
              onChange={(e) => f('sector', e.target.value)}
            />
          </Grid>
          <Grid item xs={6}>
            <TextField
              label="Régimen Fiscal"
              fullWidth
              size="small"
              value={form.regimen_fiscal}
              onChange={(e) => f('regimen_fiscal', e.target.value)}
            />
          </Grid>
          <Grid item xs={6}>
            <FormControl fullWidth size="small">
              <InputLabel>Norma Contable</InputLabel>
              <Select
                label="Norma Contable"
                value={form.norma_contable}
                onChange={(e) => f('norma_contable', e.target.value)}
              >
                {(['IFRS', 'US_GAAP', 'LOCAL'] as NormaContable[]).map((n) => (
                  <MenuItem key={n} value={n}>{n}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                p: 1.5,
                borderRadius: '8px',
                border: `1px solid ${form.es_holding ? alpha(ERP_COLOR, 0.3) : '#E2E8F0'}`,
                bgcolor: form.es_holding ? alpha(ERP_COLOR, 0.04) : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onClick={() => f('es_holding', !form.es_holding)}
            >
              <input
                type="checkbox"
                id="es_holding"
                checked={form.es_holding}
                onChange={(e) => f('es_holding', e.target.checked)}
                style={{ cursor: 'pointer', accentColor: ERP_COLOR }}
              />
              <Box>
                <Typography
                  component="label"
                  htmlFor="es_holding"
                  sx={{ fontSize: 13, fontWeight: 600, color: '#0F172A', cursor: 'pointer', display: 'block' }}
                >
                  Es empresa holding
                </Typography>
                <Typography sx={{ fontSize: 11, color: '#64748B' }}>
                  Marca esta empresa como cabeza del grupo corporativo
                </Typography>
              </Box>
            </Box>
          </Grid>
          {!form.es_holding && holdings.length > 0 && (
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Holding al que pertenece</InputLabel>
                <Select
                  label="Holding al que pertenece"
                  value={form.holding_id}
                  onChange={(e) => f('holding_id', e.target.value)}
                >
                  <MenuItem value="">Sin holding</MenuItem>
                  {holdings.map((h) => (
                    <MenuItem key={h.id} value={String(h.id)}>
                      {h.razon_social}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} color="inherit">
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={mutation.isPending}
          sx={{ bgcolor: ERP_COLOR, '&:hover': { bgcolor: alpha(ERP_COLOR, 0.85) } }}
        >
          {mutation.isPending ? 'Guardando...' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ERPConsolidacion() {
  const [tabValue, setTabValue]             = useState(0)
  const [openNew, setOpenNew]               = useState(false)
  const [openNewEmpresa, setOpenNewEmpresa] = useState(false)

  // Consolidado filters
  const currentYear  = new Date().getFullYear()
  const currentMonth = new Date().getMonth() + 1
  const [anio, setAnio] = useState(String(currentYear))
  const [mes, setMes]   = useState(String(currentMonth).padStart(2, '0'))
  const [consolidadoEnabled, setConsolidadoEnabled] = useState(false)

  const queryClient = useQueryClient()

  // ── Queries ─────────────────────────────────────────────────────────────────

  const { data: empresas, isLoading: loadingEmpresas } = useQuery<Empresa[]>({
    queryKey: ['erp-empresas'],
    queryFn: () => apiClient.get('/erp/empresas').then((r) => r.data),
  })

  const { data: consolidado, isLoading: loadingConsolidado, isFetching: fetchingConsolidado } =
    useQuery<ConsolidadoResult>({
      queryKey: ['erp-consolidado', anio, mes],
      queryFn: () =>
        apiClient
          .get('/erp/reportes/estado-resultados', { params: { anio, mes } })
          .then((r) => r.data),
      enabled: consolidadoEnabled,
    })

  // ── Derived ─────────────────────────────────────────────────────────────────

  const holdings = (empresas ?? []).filter((e) => e.es_holding)
  const filiales = (empresas ?? []).filter((e) => !e.es_holding)
  const paises   = [...new Set((empresas ?? []).map((e) => e.pais).filter(Boolean))]

  const periodoLabel = consolidado?.periodo
    ?? `${anio}-${mes}`

  const isLoadingResult = loadingConsolidado || fetchingConsolidado

  function handleGenerarConsolidado() {
    if (!consolidadoEnabled) {
      setConsolidadoEnabled(true)
    } else {
      queryClient.invalidateQueries({ queryKey: ['erp-consolidado', anio, mes] })
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <Layout title="ERP — Consolidación Financiera">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

        {/* ── Header band ─────────────────────────────────────────────────── */}
        <Box
          sx={{
            borderRadius: '16px',
            background: `linear-gradient(135deg, ${NAVY} 0%, ${ERP_COLOR} 60%, ${BLUE} 100%)`,
            px: 3,
            py: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '11px',
                bgcolor: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Merge sx={{ color: '#FFFFFF', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography
                sx={{
                  fontSize: 20,
                  fontWeight: 800,
                  color: '#FFFFFF',
                  lineHeight: 1.2,
                  letterSpacing: '-0.02em',
                }}
              >
                Consolidación Financiera Multiempresa
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', mt: 0.25 }}>
                Estructura corporativa y estados financieros consolidados
              </Typography>
            </Box>
          </Box>

          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={() => setOpenNewEmpresa(true)}
            sx={{
              color: '#FFFFFF',
              borderColor: 'rgba(255,255,255,0.35)',
              fontWeight: 600,
              fontSize: 13,
              '&:hover': {
                borderColor: '#FFFFFF',
                bgcolor: 'rgba(255,255,255,0.1)',
              },
            }}
          >
            Nueva Empresa
          </Button>
        </Box>

        {/* ── Tabs ────────────────────────────────────────────────────────── */}
        <Card
          elevation={0}
          sx={{ borderRadius: '14px', border: '1px solid #E2E8F0', overflow: 'hidden' }}
        >
          <Box
            sx={{
              borderBottom: '1px solid #E2E8F0',
              bgcolor: alpha(ERP_COLOR, 0.03),
            }}
          >
            <Tabs
              value={tabValue}
              onChange={(_, v) => setTabValue(v)}
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: 13,
                  minHeight: 48,
                },
                '& .Mui-selected': { color: ERP_COLOR },
                '& .MuiTabs-indicator': { bgcolor: ERP_COLOR },
                px: 2,
              }}
            >
              <Tab
                label="Estructura Corporativa"
                icon={<AccountTree fontSize="small" />}
                iconPosition="start"
              />
              <Tab
                label="Estado de Resultados Consolidado"
                icon={<Merge fontSize="small" />}
                iconPosition="start"
              />
            </Tabs>
          </Box>

          <Box sx={{ p: 3 }}>

            {/* ── TAB 0: Estructura Corporativa ──────────────────────────── */}
            {tabValue === 0 && (
              <>
                {/* KPI summary row */}
                <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
                  <SummaryCard
                    label="Total Empresas"
                    value={loadingEmpresas ? '—' : (empresas?.length ?? 0)}
                    loading={loadingEmpresas}
                    color={ERP_COLOR}
                  />
                  <SummaryCard
                    label="Holdings"
                    value={loadingEmpresas ? '—' : holdings.length}
                    loading={loadingEmpresas}
                    color={NAVY}
                  />
                  <SummaryCard
                    label="Filiales"
                    value={loadingEmpresas ? '—' : filiales.length}
                    loading={loadingEmpresas}
                    color={BLUE}
                  />
                  <SummaryCard
                    label="Países"
                    value={loadingEmpresas ? '—' : paises.length}
                    loading={loadingEmpresas}
                    color="#0891B2"
                  />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Language sx={{ fontSize: 15, color: '#94A3B8' }} />
                  <Typography
                    sx={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: ERP_COLOR,
                    }}
                  >
                    Árbol Corporativo
                  </Typography>
                  <Divider sx={{ flex: 1 }} />
                </Box>

                {/* Tree view */}
                {loadingEmpresas ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} variant="rounded" height={90} sx={{ borderRadius: '12px' }} />
                    ))}
                  </Box>
                ) : (empresas ?? []).length === 0 ? (
                  <Box
                    sx={{
                      py: 6,
                      textAlign: 'center',
                      border: '1px dashed #CBD5E1',
                      borderRadius: '12px',
                    }}
                  >
                    <Business sx={{ fontSize: 40, color: '#CBD5E1', mb: 1 }} />
                    <Typography sx={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>
                      No hay empresas registradas
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#CBD5E1', mt: 0.5 }}>
                      Agrega la primera empresa del grupo usando el botón superior
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Stand-alone holdings (no filiales render below them) */}
                    {holdings.map((holding) => {
                      const hijas = filiales.filter((f) => f.holding_id === holding.id)
                      return (
                        <Box key={holding.id}>
                          <EmpresaCard empresa={holding} isFilial={false} />

                          {hijas.length > 0 && (
                            <Box
                              sx={{
                                ml: 4,
                                mt: 1,
                                pl: 2,
                                borderLeft: `2px solid ${alpha(ERP_COLOR, 0.2)}`,
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 1,
                              }}
                            >
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                                <ExpandMore sx={{ fontSize: 14, color: '#94A3B8' }} />
                                <Typography
                                  sx={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    color: '#94A3B8',
                                  }}
                                >
                                  {hijas.length} filial{hijas.length !== 1 ? 'es' : ''}
                                </Typography>
                              </Box>
                              {hijas.map((filial) => (
                                <EmpresaCard key={filial.id} empresa={filial} isFilial />
                              ))}
                            </Box>
                          )}
                        </Box>
                      )
                    })}

                    {/* Filiales without a holding */}
                    {filiales
                      .filter((f) => !f.holding_id)
                      .map((emp) => (
                        <EmpresaCard key={emp.id} empresa={emp} isFilial />
                      ))}
                  </Box>
                )}
              </>
            )}

            {/* ── TAB 1: Estado de Resultados Consolidado ────────────────── */}
            {tabValue === 1 && (
              <>
                {/* Period filter bar */}
                <Box
                  sx={{
                    display: 'flex',
                    gap: 2,
                    mb: 3,
                    alignItems: 'flex-end',
                    flexWrap: 'wrap',
                  }}
                >
                  <FormControl size="small" sx={{ minWidth: 110 }}>
                    <InputLabel>Año</InputLabel>
                    <Select
                      label="Año"
                      value={anio}
                      onChange={(e) => {
                        setAnio(e.target.value)
                        setConsolidadoEnabled(false)
                      }}
                    >
                      {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
                        <MenuItem key={y} value={String(y)}>{y}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Mes</InputLabel>
                    <Select
                      label="Mes"
                      value={mes}
                      onChange={(e) => {
                        setMes(e.target.value)
                        setConsolidadoEnabled(false)
                      }}
                    >
                      {[
                        ['01', 'Enero'], ['02', 'Febrero'], ['03', 'Marzo'],
                        ['04', 'Abril'], ['05', 'Mayo'], ['06', 'Junio'],
                        ['07', 'Julio'], ['08', 'Agosto'], ['09', 'Septiembre'],
                        ['10', 'Octubre'], ['11', 'Noviembre'], ['12', 'Diciembre'],
                      ].map(([v, label]) => (
                        <MenuItem key={v} value={v}>{label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button
                    variant="contained"
                    startIcon={<Merge />}
                    onClick={handleGenerarConsolidado}
                    disabled={isLoadingResult}
                    sx={{
                      bgcolor: ERP_COLOR,
                      fontWeight: 700,
                      '&:hover': { bgcolor: alpha(ERP_COLOR, 0.85) },
                    }}
                  >
                    {isLoadingResult ? 'Generando...' : 'Generar Consolidado'}
                  </Button>
                </Box>

                {/* Results card */}
                {consolidadoEnabled && (
                  <Card
                    elevation={0}
                    sx={{
                      borderRadius: '14px',
                      border: '1px solid #E2E8F0',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Card header */}
                    <Box
                      sx={{
                        px: 3,
                        py: 2,
                        background: `linear-gradient(135deg, ${NAVY} 0%, ${ERP_COLOR} 100%)`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                      }}
                    >
                      <Merge sx={{ color: '#FFFFFF', fontSize: 20 }} />
                      <Box>
                        <Typography
                          sx={{
                            fontSize: 14,
                            fontWeight: 700,
                            color: '#FFFFFF',
                            lineHeight: 1.2,
                          }}
                        >
                          Estado de Resultados Consolidado
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                          Período: {periodoLabel}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ p: 3 }}>
                      {isLoadingResult ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {Array.from({ length: 4 }).map((_, i) => (
                            <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Skeleton width={200} height={18} />
                              <Skeleton width={140} height={18} />
                            </Box>
                          ))}
                        </Box>
                      ) : consolidado ? (
                        <>
                          {/* Ingresos */}
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'baseline',
                              py: 1.5,
                            }}
                          >
                            <Typography
                              sx={{ fontSize: 14, color: '#475569', fontWeight: 500 }}
                            >
                              Ingresos Operacionales
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: 16,
                                fontWeight: 700,
                                color: '#16A34A',
                                fontFamily: 'monospace',
                              }}
                            >
                              {formatCurrency(consolidado.ingresos_operacionales)}
                            </Typography>
                          </Box>

                          {/* Egresos */}
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'baseline',
                              py: 1.5,
                            }}
                          >
                            <Typography
                              sx={{ fontSize: 14, color: '#475569', fontWeight: 500 }}
                            >
                              Egresos Operacionales
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: 16,
                                fontWeight: 700,
                                color: '#DC2626',
                                fontFamily: 'monospace',
                              }}
                            >
                              {formatCurrency(consolidado.egresos_operacionales)}
                            </Typography>
                          </Box>

                          <Divider sx={{ my: 1 }} />

                          {/* Utilidad neta */}
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'baseline',
                              py: 1.5,
                            }}
                          >
                            <Typography
                              sx={{ fontSize: 15, color: '#0F172A', fontWeight: 700 }}
                            >
                              {consolidado.utilidad_neta >= 0
                                ? 'Utilidad Neta'
                                : 'Pérdida Neta'}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: 22,
                                fontWeight: 900,
                                letterSpacing: '-0.02em',
                                color:
                                  consolidado.utilidad_neta >= 0 ? '#16A34A' : '#DC2626',
                                fontFamily: 'monospace',
                              }}
                            >
                              {formatCurrency(consolidado.utilidad_neta)}
                            </Typography>
                          </Box>

                          {/* Margen neto */}
                          <Box
                            sx={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              py: 1,
                              px: 2,
                              borderRadius: '8px',
                              bgcolor:
                                consolidado.margen_neto >= 0
                                  ? alpha('#16A34A', 0.06)
                                  : alpha('#DC2626', 0.06),
                              mt: 0.5,
                            }}
                          >
                            <Typography
                              sx={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}
                            >
                              Margen Neto
                            </Typography>
                            <Chip
                              label={`${consolidado.margen_neto.toFixed(1)}%`}
                              size="small"
                              sx={{
                                fontWeight: 800,
                                fontSize: 12,
                                bgcolor:
                                  consolidado.margen_neto >= 0
                                    ? alpha('#16A34A', 0.12)
                                    : alpha('#DC2626', 0.12),
                                color:
                                  consolidado.margen_neto >= 0 ? '#16A34A' : '#DC2626',
                                height: 24,
                              }}
                            />
                          </Box>

                          {/* Footnote */}
                          <Typography
                            sx={{
                              fontSize: 11,
                              color: '#94A3B8',
                              mt: 2.5,
                              pt: 2,
                              borderTop: '1px dashed #E2E8F0',
                              lineHeight: 1.6,
                            }}
                          >
                            Este consolidado incluye todos los comprobantes contabilizados del
                            período seleccionado.
                          </Typography>
                        </>
                      ) : (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                          <Typography sx={{ fontSize: 13, color: '#94A3B8' }}>
                            No hay datos para el período seleccionado.
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Card>
                )}

                {!consolidadoEnabled && (
                  <Box
                    sx={{
                      py: 6,
                      textAlign: 'center',
                      border: '1px dashed #CBD5E1',
                      borderRadius: '12px',
                    }}
                  >
                    <Merge sx={{ fontSize: 40, color: '#CBD5E1', mb: 1 }} />
                    <Typography sx={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>
                      Selecciona el período y genera el consolidado
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: '#CBD5E1', mt: 0.5 }}>
                      El resultado incluye todos los comprobantes contabilizados del período
                    </Typography>
                  </Box>
                )}
              </>
            )}
          </Box>
        </Card>
      </Box>

      {/* Dialogs */}
      <NewEmpresaDialog
        open={openNewEmpresa}
        onClose={() => setOpenNewEmpresa(false)}
        holdings={holdings}
      />

      {/* openNew is kept in state per spec but unused beyond declaration */}
      <Dialog open={openNew} onClose={() => setOpenNew(false)}>
        <DialogTitle>Nueva entrada</DialogTitle>
        <DialogContent />
        <DialogActions>
          <Button onClick={() => setOpenNew(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}
