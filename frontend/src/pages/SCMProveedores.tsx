import React, { useEffect, useState } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, CircularProgress, alpha,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, InputAdornment, IconButton, Tooltip,
} from '@mui/material'
import { Store, Search, Star, StarBorder, Assessment } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import { getProveedoresSCM, ProveedorSCM, ClasificacionProveedor } from '@/api/scm'

const SCM_COLOR = '#0C4D8C'
const PAGE_BG   = '#060C1A'
const CARD_BG   = '#0F1E35'
const CARD_BOR  = `rgba(12,77,140,0.25)`

const CLASIF_COLOR: Record<ClasificacionProveedor, string> = {
  A: '#22c55e', B: '#3b82f6', C: '#f59e0b', D: '#ef4444',
}

function ClasifChip({ c }: { c?: ClasificacionProveedor }) {
  if (!c) return <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>—</Typography>
  return (
    <Chip label={`Clase ${c}`} size="small" sx={{ bgcolor: alpha(CLASIF_COLOR[c], 0.15), color: CLASIF_COLOR[c], fontWeight: 800, fontSize: 11 }} />
  )
}

function ScoreStars({ score }: { score?: number | null }) {
  if (!score) return <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>Sin evaluar</Typography>
  const full = Math.round(score / 2)
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
      {Array.from({ length: 5 }).map((_, i) =>
        i < full
          ? <Star key={i} sx={{ fontSize: 14, color: '#f59e0b' }} />
          : <StarBorder key={i} sx={{ fontSize: 14, color: 'rgba(255,255,255,0.2)' }} />
      )}
      <Typography sx={{ ml: 0.5, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>{score.toFixed(1)}</Typography>
    </Box>
  )
}

export default function SCMProveedores() {
  const [proveedores, setProveedores] = useState<ProveedorSCM[]>([])
  const [total, setTotal]             = useState(0)
  const [search, setSearch]           = useState('')
  const [loading, setLoading]         = useState(true)

  useEffect(() => {
    setLoading(true)
    getProveedoresSCM({ q: search || undefined, page_size: 100 })
      .then(r => { setProveedores(r.items); setTotal(r.total) })
      .finally(() => setLoading(false))
  }, [search])

  return (
    <Layout>
      <Box sx={{ p: 3, background: PAGE_BG, minHeight: '100vh' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Store sx={{ color: SCM_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#FFF', lineHeight: 1 }}>Proveedores SCM</Typography>
              <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{total} proveedor{total !== 1 ? 'es' : ''} registrado{total !== 1 ? 's' : ''}</Typography>
            </Box>
            <Chip label="SCM" size="small" sx={{ bgcolor: alpha(SCM_COLOR, 0.15), color: '#5B9BD5', fontWeight: 700, border: `1px solid ${alpha(SCM_COLOR, 0.35)}` }} />
          </Box>
          <TextField
            size="small"
            placeholder="Buscar proveedor..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 18 }} /></InputAdornment> }}
            sx={{
              width: 240,
              '& .MuiOutlinedInput-root': { color: '#fff', bgcolor: 'rgba(255,255,255,0.05)', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }, '&:hover fieldset': { borderColor: alpha(SCM_COLOR, 0.5) } },
            }}
          />
        </Box>

        <Card sx={{ bgcolor: CARD_BG, border: `1px solid ${CARD_BOR}`, borderRadius: 2 }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 700, borderBottom: '1px solid rgba(255,255,255,0.08)', py: 1.5, bgcolor: CARD_BG } }}>
                  <TableCell>PROVEEDOR</TableCell>
                  <TableCell>NIT</TableCell>
                  <TableCell>CIUDAD</TableCell>
                  <TableCell>CONTACTO</TableCell>
                  <TableCell align="center">ÓC TOTALES</TableCell>
                  <TableCell>CALIFICACIÓN</TableCell>
                  <TableCell align="center">CLASIFICACIÓN</TableCell>
                  <TableCell align="center">ACCIONES</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, bgcolor: CARD_BG }}><CircularProgress size={28} sx={{ color: SCM_COLOR }} /></TableCell></TableRow>
                ) : proveedores.length === 0 ? (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 6, color: 'rgba(255,255,255,0.3)', fontSize: 13, bgcolor: CARD_BG }}>No hay proveedores que coincidan</TableCell></TableRow>
                ) : proveedores.map(p => (
                  <TableRow key={p.id} sx={{ '& td': { borderBottom: '1px solid rgba(255,255,255,0.04)', py: 1.2, bgcolor: CARD_BG }, '&:hover td': { bgcolor: 'rgba(255,255,255,0.025) !important' } }}>
                    <TableCell>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{p.razon_social}</Typography>
                      {p.nombre_comercial && p.nombre_comercial !== p.razon_social && (
                        <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{p.nombre_comercial}</Typography>
                      )}
                    </TableCell>
                    <TableCell><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace' }}>{p.nit ?? '—'}</Typography></TableCell>
                    <TableCell><Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{p.ciudad ?? '—'}</Typography></TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{p.contacto_nombre ?? '—'}</Typography>
                      {p.contacto_email && <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{p.contacto_email}</Typography>}
                    </TableCell>
                    <TableCell align="center"><Typography sx={{ fontSize: 13, fontWeight: 700, color: '#5B9BD5' }}>{p.total_ordenes ?? 0}</Typography></TableCell>
                    <TableCell><ScoreStars score={p.puntaje_promedio} /></TableCell>
                    <TableCell align="center"><ClasifChip c={p.clasificacion} /></TableCell>
                    <TableCell align="center">
                      <Tooltip title="Ver evaluaciones">
                        <IconButton size="small" sx={{ color: 'rgba(255,255,255,0.4)', '&:hover': { color: '#5B9BD5' } }}><Assessment fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Box>
    </Layout>
  )
}
