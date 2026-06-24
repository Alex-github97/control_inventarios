import React, { useState } from 'react'
import {
  Box, Card, Typography, Button, Table, TableBody, TableCell,
  TableHead, TableRow, Chip, Skeleton, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, TextField, FormControl,
  InputLabel, Select, MenuItem, Autocomplete, Tooltip, IconButton,
  Checkbox, Alert, alpha, Collapse,
} from '@mui/material'
import {
  Add, Assignment, OpenInNew, LocalShipping, ArrowForward,
  CheckCircle, Close, Unarchive, Undo, ExpandMore, ExpandLess, PictureAsPdf,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import { useAuthStore } from '@/store/authStore'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

const ROLES_SUPERVISION = new Set(['ADMINISTRADOR', 'SUPERVISOR_LOGISTICO'])

const ESTADO_COLORS: Record<string, { bg: string; color: string }> = {
  PROGRAMADO:        { bg: '#EFF6FF', color: '#2563EB' },
  EN_CARGUE:         { bg: '#FEF3C7', color: '#D97706' },
  EN_TRANSITO:       { bg: '#EDE9FE', color: '#7C3AED' },
  ENTREGADO:         { bg: '#DCFCE7', color: '#16A34A' },
  CANCELADO:         { bg: '#FEE2E2', color: '#DC2626' },
  CON_NOVEDAD:       { bg: '#FCE7F3', color: '#DB2777' },
}

const ESTADO_COLORS_ESTIBA: Record<string, { bg: string; color: string }> = {
  EN_INVENTARIO:     { bg: '#DCFCE7', color: '#16A34A' },
  DISPONIBLE:        { bg: '#DCFCE7', color: '#16A34A' },
  EN_TRANSITO:       { bg: '#EDE9FE', color: '#7C3AED' },
  CARGADA:           { bg: '#DBEAFE', color: '#2563EB' },
  EN_CLIENTE:        { bg: '#FEF9C3', color: '#CA8A04' },
  PENDIENTE_RETORNO: { bg: '#FEF3C7', color: '#D97706' },
  EN_REPARACION:     { bg: '#FFF7ED', color: '#C2410C' },
  DANADA:            { bg: '#FEE2E2', color: '#DC2626' },
  BAJA:              { bg: '#F1F5F9', color: '#64748B' },
}

const TRANS_NEXT: Record<string, Array<{ estado: string; label: string; color: string; outlined?: boolean }>> = {
  PROGRAMADO:  [
    { estado: 'EN_CARGUE',   label: 'Iniciar cargue',        color: '#D97706' },
    { estado: 'CANCELADO',   label: 'Cancelar manifiesto',   color: '#DC2626', outlined: true },
  ],
  EN_CARGUE:   [
    { estado: 'EN_TRANSITO', label: 'Salir en tránsito',     color: '#7C3AED' },
    { estado: 'CON_NOVEDAD', label: 'Registrar novedad',     color: '#DB2777', outlined: true },
    { estado: 'CANCELADO',   label: 'Cancelar',              color: '#DC2626', outlined: true },
  ],
  EN_TRANSITO: [
    { estado: 'ENTREGADO',   label: 'Registrar entrega',     color: '#16A34A' },
    { estado: 'CON_NOVEDAD', label: 'Registrar novedad',     color: '#DB2777', outlined: true },
  ],
  CON_NOVEDAD: [
    { estado: 'EN_TRANSITO', label: 'Continuar en tránsito', color: '#7C3AED' },
    { estado: 'ENTREGADO',   label: 'Registrar entrega',     color: '#16A34A' },
  ],
  ENTREGADO:   [],
  CANCELADO:   [],
}

const ESTADO_PUEDE_DESCARGAR = new Set(['EN_TRANSITO', 'ENTREGADO', 'CON_NOVEDAD'])

// Para cada estado indica a cuál se revierte y el texto descriptivo (solo supervisores/admin)
const REVERT_MAP: Record<string, { estado: string; label: string }> = {
  EN_CARGUE:   { estado: 'PROGRAMADO',  label: 'Volver a PROGRAMADO (cancelar inicio de cargue)' },
  EN_TRANSITO: { estado: 'EN_CARGUE',   label: 'Volver a EN CARGUE (cancelar salida en tránsito)' },
  ENTREGADO:   { estado: 'EN_TRANSITO', label: 'Volver a EN TRÁNSITO (anular entrega registrada)' },
  CANCELADO:   { estado: 'PROGRAMADO',  label: 'Reactivar como PROGRAMADO (deshacer cancelación)' },
  CON_NOVEDAD: { estado: 'EN_TRANSITO', label: 'Volver a EN TRÁNSITO (corregir novedad)' },
}

export default function Manifiestos() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const esSupervisor = ROLES_SUPERVISION.has(user?.rol ?? '')

  // ── Crear manifiesto ──────────────────────────────────────────────────────
  const [openCreate, setOpenCreate] = useState(false)
  const [selectedCliente, setSelectedCliente] = useState<any>(null)
  const [form, setForm] = useState({
    numero: '', vehiculo_id: '', origen_id: '', destino_id: '',
    fecha_programada: '', observaciones: '',
  })

  // ── Detalle manifiesto ────────────────────────────────────────────────────
  const [detailManifiesto, setDetailManifiesto] = useState<any>(null)
  const [descargaUbicacionId, setDescargaUbicacionId] = useState('')
  const [seleccionDescarga, setSeleccionDescarga] = useState<Set<number>>(new Set())

  // ── Corrección de estado ──────────────────────────────────────────────────
  const [showCorrection, setShowCorrection] = useState(false)
  const [correctionMotivo, setCorrectionMotivo] = useState('')

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: manifiestos, isLoading } = useQuery({
    queryKey: ['manifiestos'],
    queryFn: () => apiClient.get('/manifiestos').then((r: any) => r.data),
  })
  const { data: vehiculos } = useQuery({
    queryKey: ['vehiculos'],
    queryFn: () => apiClient.get('/vehiculos').then((r: any) => r.data),
  })
  const { data: ubicaciones } = useQuery({
    queryKey: ['ubicaciones'],
    queryFn: () => apiClient.get('/ubicaciones').then((r: any) => r.data),
  })
  const { data: clientes } = useQuery({
    queryKey: ['clientes-manifiestos'],
    queryFn: () => apiClient.get('/manifiestos/clientes').then((r: any) => r.data),
  })
  const { data: estibasManifiesto = [] } = useQuery({
    queryKey: ['estibas-manifiesto', detailManifiesto?.id],
    queryFn: () =>
      apiClient.get(`/manifiestos/${detailManifiesto!.id}/estibas`).then((r: any) => r.data ?? []),
    enabled: !!detailManifiesto,
  })
  const { data: historialManifiesto = [] } = useQuery({
    queryKey: ['historial-manifiesto', detailManifiesto?.id],
    queryFn: () =>
      apiClient.get(`/manifiestos/${detailManifiesto!.id}/historial`).then((r: any) => r.data ?? []),
    enabled: !!detailManifiesto,
  })

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/manifiestos', data).then((r: any) => r.data),
    onSuccess: () => {
      toast.success('Manifiesto creado exitosamente')
      queryClient.invalidateQueries({ queryKey: ['manifiestos'] })
      setOpenCreate(false)
      setSelectedCliente(null)
      setForm({ numero: '', vehiculo_id: '', origen_id: '', destino_id: '', fecha_programada: '', observaciones: '' })
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error creando manifiesto'),
  })

  const cambiarEstadoMutation = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: string }) =>
      apiClient.patch(`/manifiestos/${id}/estado`, null, { params: { nuevo_estado: estado } }).then((r: any) => r.data),
    onSuccess: (data: any) => {
      toast.success(`Estado: ${data.estado.replace(/_/g, ' ')}`)
      queryClient.invalidateQueries({ queryKey: ['manifiestos'] })
      queryClient.invalidateQueries({ queryKey: ['historial-manifiesto'] })
      setDetailManifiesto((prev: any) => (prev ? { ...prev, estado: data.estado } : prev))
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error cambiando estado'),
  })

  const revertirEstadoMutation = useMutation({
    mutationFn: ({ id, observacion }: { id: number; observacion: string }) =>
      apiClient.post(`/manifiestos/${id}/estado/revertir`, { observacion }).then((r: any) => r.data),
    onSuccess: (data: any) => {
      toast.success(`Estado corregido: ${data.estado_anterior.replace(/_/g, ' ')} → ${data.estado.replace(/_/g, ' ')}`)
      queryClient.invalidateQueries({ queryKey: ['manifiestos'] })
      queryClient.invalidateQueries({ queryKey: ['historial-manifiesto'] })
      setDetailManifiesto((prev: any) => (prev ? { ...prev, estado: data.estado } : prev))
      setShowCorrection(false)
      setCorrectionMotivo('')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error corrigiendo estado'),
  })

  const descargarMutation = useMutation({
    mutationFn: (items: any[]) => apiClient.post('/movimientos/bulk', { items }).then((r: any) => r.data),
    onSuccess: (data: any) => {
      toast.success(`${data.exitosos} estibas descargadas`)
      if (data.errores?.length > 0) toast.error(`${data.errores.length} con error`)
      queryClient.invalidateQueries({ queryKey: ['estibas-manifiesto'] })
      queryClient.invalidateQueries({ queryKey: ['manifiestos'] })
      setSeleccionDescarga(new Set())
      setDescargaUbicacionId('')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error registrando descarga'),
  })

  // ── Helpers ───────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    createMutation.mutate({
      numero:          form.numero,
      vehiculo_id:     parseInt(form.vehiculo_id),
      origen_id:       parseInt(form.origen_id),
      destino_id:      parseInt(form.destino_id),
      cliente_nombre:  selectedCliente?.nombre || undefined,
      cliente_nit:     selectedCliente?.nit    || undefined,
      fecha_programada: form.fecha_programada,
      observaciones:   form.observaciones || undefined,
    })
  }

  const getVehiculoPlaca    = (id: number) => (vehiculos  || []).find((v: any) => v.id === id)?.placa  ?? `#${id}`
  const getUbicacionNombre  = (id: number) => (ubicaciones|| []).find((u: any) => u.id === id)?.nombre ?? `#${id}`

  const closeDetail = () => {
    setDetailManifiesto(null)
    setSeleccionDescarga(new Set())
    setDescargaUbicacionId('')
    setShowCorrection(false)
    setCorrectionMotivo('')
    setShowHistorial(false)
  }

  const [showHistorial, setShowHistorial] = useState(false)

  const handleToggle = (id: number) =>
    setSeleccionDescarga(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })

  const handleDescargar = () => {
    if (!descargaUbicacionId)      { toast.error('Selecciona una bodega de destino'); return }
    if (seleccionDescarga.size === 0) { toast.error('Selecciona al menos una estiba');   return }
    descargarMutation.mutate(
      Array.from(seleccionDescarga).map(estiba_id => ({
        estiba_id,
        tipo:                    'DESCARGA',
        ubicacion_destino_id:    parseInt(descargaUbicacionId),
        manifiesto_id:           detailManifiesto?.id,
      }))
    )
  }

  // ── Computed (before return) ──────────────────────────────────────────────
  const estibasPendientes    = (estibasManifiesto as any[]).filter((e: any) => !e.ya_descargada)
  const transicionesPosibles = detailManifiesto ? (TRANS_NEXT[detailManifiesto.estado] ?? []) : []
  const puedeDescargar       = detailManifiesto ? ESTADO_PUEDE_DESCARGAR.has(detailManifiesto.estado) : false
  const todasSeleccionadas   = estibasPendientes.length > 0 && seleccionDescarga.size === estibasPendientes.length
  const revertInfo           = detailManifiesto ? REVERT_MAP[detailManifiesto.estado] : null
  const puedeRevertir        = esSupervisor && !!revertInfo

  // ── PDF ───────────────────────────────────────────────────────────────────
  const handlePrintPDF = async () => {
    if (!detailManifiesto) return
    const m        = detailManifiesto
    const estibas  = estibasManifiesto as any[]
    const historial = historialManifiesto as any[]

    const { jsPDF } = await import('jspdf')
    const { default: autoTable } = await import('jspdf-autotable')

    const fmtDate = (d: string) => {
      try { return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
      catch { return d }
    }
    const fmtDT = (d: string) => {
      try {
        const dt = new Date(d)
        return dt.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
             + ' ' + dt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
      } catch { return d }
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const W = doc.internal.pageSize.getWidth()
    const ACCENT = '#1A3A6B'

    const ESTADO_RGB: Record<string, [number,number,number]> = {
      PROGRAMADO: [37,99,235], EN_CARGUE: [217,119,6], EN_TRANSITO: [124,58,237],
      ENTREGADO: [22,163,74], CANCELADO: [220,38,38], CON_NOVEDAD: [219,39,119],
    }
    const estadoRgb = ESTADO_RGB[m.estado] ?? [100,116,139]

    // ── Franja de cabecera ──────────────────────────────────────────────
    doc.setFillColor(26, 58, 107)
    doc.rect(0, 0, W, 22, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('INFORME DE MOVIMIENTO DE ESTIBAS', 14, 10)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Control de Estibas — Icoltrans', 14, 16.5)

    // ── Número + badge estado ────────────────────────────────────────────
    doc.setTextColor(26, 58, 107)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(18)
    doc.text(m.numero, 14, 33)

    const estadoLabel = m.estado.replace(/_/g, ' ')
    doc.setFillColor(...estadoRgb)
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    const badgeW = doc.getTextWidth(estadoLabel) + 8
    doc.roundedRect(W - 14 - badgeW, 26, badgeW, 6, 1.5, 1.5, 'F')
    doc.text(estadoLabel, W - 14 - badgeW / 2, 30.2, { align: 'center' })

    // ── Fecha de generación ──────────────────────────────────────────────
    doc.setTextColor(148, 163, 184)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text(`Generado: ${fmtDT(new Date().toISOString())}`, W - 14, 37.5, { align: 'right' })

    // ── Línea separadora ─────────────────────────────────────────────────
    doc.setDrawColor(226, 232, 240)
    doc.line(14, 39, W - 14, 39)

    // ── Grilla de datos del viaje ────────────────────────────────────────
    let cy = 43
    const metaItems: [string, string][] = [
      ['Vehículo',           getVehiculoPlaca(m.vehiculo_id)],
      ['Ruta',               `${getUbicacionNombre(m.origen_id)} → ${getUbicacionNombre(m.destino_id)}`],
      ['Fecha programada',   fmtDate(m.fecha_programada)],
      ...(m.cliente_nombre ? [['Cliente', m.cliente_nombre] as [string,string]] : []),
      ...(m.fecha_salida  ? [['Salida real',  fmtDT(m.fecha_salida)]  as [string,string]] : []),
      ...(m.fecha_llegada ? [['Llegada real', fmtDT(m.fecha_llegada)] as [string,string]] : []),
      ['Estibas cargadas',   String(m.total_estibas_cargadas)],
      ['Estibas descargadas',String(m.total_estibas_descargadas)],
    ]
    const colW = (W - 28) / 2
    metaItems.forEach(([label, value], i) => {
      const cx = 14 + (i % 2 === 0 ? 0 : colW + 4)
      if (i % 2 === 0 && i > 0) cy += 10
      doc.setTextColor(148, 163, 184)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.text(label.toUpperCase(), cx, cy)
      doc.setTextColor(30, 41, 59)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(value, cx, cy + 4.5)
    })
    cy += (metaItems.length % 2 === 0 ? 0 : 10) + 8

    // ── Tabla de estibas ─────────────────────────────────────────────────
    doc.setDrawColor(226, 232, 240)
    doc.line(14, cy, W - 14, cy)
    cy += 4
    doc.setTextColor(71, 85, 105)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.text(`ESTIBAS EN EL MANIFIESTO (${estibas.length})`, 14, cy)
    cy += 3

    autoTable(doc, {
      startY: cy,
      margin: { left: 14, right: 14 },
      head: [['Código', 'Estado', 'Fecha de carga', 'Descargada']],
      body: estibas.length === 0
        ? [['Sin estibas asociadas', '', '', '']]
        : estibas.map(e => [
            e.codigo_interno,
            e.estado_actual.replace(/_/g, ' '),
            fmtDT(e.fecha_carga),
            e.ya_descargada ? 'Sí' : 'Pendiente',
          ]),
      headStyles: { fillColor: [26, 58, 107], fontSize: 8, fontStyle: 'bold', cellPadding: 3 },
      bodyStyles: { fontSize: 8.5, cellPadding: 3 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 42 },
        1: { cellWidth: 38 },
        2: { cellWidth: 48 },
        3: { cellWidth: 'auto', halign: 'center' },
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 3) {
          const val = data.cell.raw as string
          data.cell.styles.textColor = val === 'Sí' ? [22, 163, 74] : [217, 119, 6]
          data.cell.styles.fontStyle = 'bold'
        }
      },
    } as any)

    // ── Historial ────────────────────────────────────────────────────────
    if (historial.length > 0) {
      const afterEstibas = (doc as any).lastAutoTable?.finalY ?? cy + 20
      let hy = afterEstibas + 6
      doc.setDrawColor(226, 232, 240)
      doc.line(14, hy, W - 14, hy)
      hy += 4
      doc.setTextColor(71, 85, 105)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.text('HISTORIAL DE CAMBIOS DE ESTADO', 14, hy)
      hy += 3
      autoTable(doc, {
        startY: hy,
        margin: { left: 14, right: 14 },
        head: [['Fecha', 'Transición', 'Usuario', 'Observación']],
        body: historial.map(h => [
          fmtDT(h.fecha),
          `${h.estado_anterior ? h.estado_anterior.replace(/_/g,' ') + ' → ' : ''}${h.estado_nuevo.replace(/_/g,' ')}${h.tipo_cambio === 'CORRECCION' ? ' (CORR.)' : ''}`,
          h.usuario,
          h.observacion ?? '',
        ]),
        headStyles: { fillColor: [71, 85, 105], fontSize: 8, fontStyle: 'bold', cellPadding: 3 },
        bodyStyles: { fontSize: 7.5, cellPadding: 3 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      } as any)
    }

    // ── Pie de página ────────────────────────────────────────────────────
    const pageCount = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      const pageH = doc.internal.pageSize.getHeight()
      doc.setDrawColor(226, 232, 240)
      doc.line(14, pageH - 12, W - 14, pageH - 12)
      doc.setTextColor(148, 163, 184)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.text(`Manifiesto ${m.numero}  ·  Control de Estibas — Icoltrans`, 14, pageH - 7)
      doc.text(`Página ${i} / ${pageCount}`, W - 14, pageH - 7, { align: 'right' })
    }

    // ── Nombre del archivo: NUMERO_YYYYMMDD_HHMM.pdf ────────────────────
    const now = new Date()
    const stamp = now.getFullYear().toString()
      + String(now.getMonth() + 1).padStart(2, '0')
      + String(now.getDate()).padStart(2, '0')
      + '_'
      + String(now.getHours()).padStart(2, '0')
      + String(now.getMinutes()).padStart(2, '0')
    doc.save(`${m.numero}_${stamp}.pdf`)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Layout title="Manifiestos">

      {/* Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2.5 }}>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpenCreate(true)}>
          Nuevo Manifiesto
        </Button>
      </Box>

      {/* Tabla */}
      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Número</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Cliente</TableCell>
                <TableCell>Fecha Programada</TableCell>
                <TableCell>Estibas Cargadas</TableCell>
                <TableCell>Estibas Descargadas</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}
                    </TableRow>
                  ))
                : (manifiestos || []).length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 5, color: '#94A3B8' }}>
                        <Assignment sx={{ fontSize: 36, mb: 1, opacity: 0.3, display: 'block', mx: 'auto' }} />
                        Sin manifiestos registrados
                      </TableCell>
                    </TableRow>
                  )
                : (manifiestos || []).map((m: any) => {
                    const ec = ESTADO_COLORS[m.estado] ?? { bg: '#F1F5F9', color: '#64748B' }
                    return (
                      <TableRow
                        key={m.id}
                        onClick={() => setDetailManifiesto(m)}
                        sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(50,172,92,0.04)' } }}
                      >
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                            {m.numero}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={m.estado.replace(/_/g, ' ')} size="small"
                            sx={{ bgcolor: ec.bg, color: ec.color, fontWeight: 700, fontSize: 11 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{m.cliente_nombre || '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {format(new Date(m.fecha_programada), 'dd/MM/yyyy', { locale: es })}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={m.total_estibas_cargadas} size="small"
                            sx={{ bgcolor: '#DBEAFE', color: '#2563EB', fontWeight: 700 }} />
                        </TableCell>
                        <TableCell align="center">
                          <Chip label={m.total_estibas_descargadas} size="small"
                            sx={{ bgcolor: '#DCFCE7', color: '#16A34A', fontWeight: 700 }} />
                        </TableCell>
                      </TableRow>
                    )
                  })
              }
            </TableBody>
          </Table>
        </Box>
      </Card>

      {/* ── Diálogo detalle manifiesto ───────────────────────────────────── */}
      <Dialog
        open={Boolean(detailManifiesto)}
        onClose={closeDetail}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2.5, maxHeight: '92vh' } }}
      >
        {detailManifiesto && (
          <>
            {/* Cabecera */}
            <DialogTitle sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Typography sx={{ fontWeight: 800, fontSize: 17, fontFamily: 'monospace' }}>
                    {detailManifiesto.numero}
                  </Typography>
                  <Chip
                    label={detailManifiesto.estado.replace(/_/g, ' ')}
                    size="small"
                    sx={{
                      bgcolor: ESTADO_COLORS[detailManifiesto.estado]?.bg,
                      color:   ESTADO_COLORS[detailManifiesto.estado]?.color,
                      fontWeight: 700,
                    }}
                  />
                </Box>
                <IconButton size="small" onClick={closeDetail}><Close fontSize="small" /></IconButton>
              </Box>
            </DialogTitle>

            <DialogContent dividers sx={{ p: 0 }}>

              {/* Info del viaje */}
              <Box sx={{ px: 3, py: 2, bgcolor: '#FAFAFA', borderBottom: '1px solid #F1F5F9' }}>
                <Grid container spacing={2} alignItems="flex-start">
                  <Grid item xs={12} sm={3}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.25 }}>
                      <LocalShipping sx={{ fontSize: 14, color: '#94A3B8' }} />
                      <Typography sx={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Vehículo
                      </Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 700, fontSize: 13.5 }}>
                      {getVehiculoPlaca(detailManifiesto.vehiculo_id)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography sx={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.25 }}>
                      Ruta
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                      <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
                        {getUbicacionNombre(detailManifiesto.origen_id)}
                      </Typography>
                      <ArrowForward sx={{ fontSize: 14, color: '#94A3B8' }} />
                      <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
                        {getUbicacionNombre(detailManifiesto.destino_id)}
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6} sm={2}>
                    <Typography sx={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.25 }}>
                      Programado
                    </Typography>
                    <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
                      {format(new Date(detailManifiesto.fecha_programada), 'dd/MM/yyyy', { locale: es })}
                    </Typography>
                  </Grid>
                  {detailManifiesto.cliente_nombre && (
                    <Grid item xs={6} sm={3}>
                      <Typography sx={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.25 }}>
                        Cliente
                      </Typography>
                      <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
                        {detailManifiesto.cliente_nombre}
                      </Typography>
                    </Grid>
                  )}
                  {detailManifiesto.fecha_salida && (
                    <Grid item xs={6} sm={3}>
                      <Typography sx={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.25 }}>
                        Salida real
                      </Typography>
                      <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
                        {format(new Date(detailManifiesto.fecha_salida), 'dd/MM HH:mm', { locale: es })}
                      </Typography>
                    </Grid>
                  )}
                  {detailManifiesto.fecha_llegada && (
                    <Grid item xs={6} sm={3}>
                      <Typography sx={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.25 }}>
                        Llegada real
                      </Typography>
                      <Typography sx={{ fontWeight: 600, fontSize: 13 }}>
                        {format(new Date(detailManifiesto.fecha_llegada), 'dd/MM HH:mm', { locale: es })}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>

              {/* Máquina de estados */}
              {transicionesPosibles.length > 0 && (
                <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #F1F5F9' }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.25 }}>
                    Cambiar estado del viaje
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {transicionesPosibles.map(t => (
                      <Button
                        key={t.estado}
                        size="small"
                        variant={t.outlined ? 'outlined' : 'contained'}
                        onClick={() => cambiarEstadoMutation.mutate({ id: detailManifiesto.id, estado: t.estado })}
                        disabled={cambiarEstadoMutation.isPending}
                        sx={
                          t.outlined
                            ? { borderColor: t.color, color: t.color, '&:hover': { bgcolor: alpha(t.color, 0.07), borderColor: t.color } }
                            : { bgcolor: t.color, '&:hover': { bgcolor: alpha(t.color, 0.85) } }
                        }
                      >
                        {t.label}
                      </Button>
                    ))}
                  </Box>
                </Box>
              )}

              {transicionesPosibles.length === 0 && (
                <Box sx={{
                  px: 3, py: 1.5, borderBottom: '1px solid #F1F5F9',
                  bgcolor: detailManifiesto.estado === 'ENTREGADO' ? alpha('#16A34A', 0.05) : alpha('#DC2626', 0.05),
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle sx={{ fontSize: 15, color: detailManifiesto.estado === 'ENTREGADO' ? '#16A34A' : '#DC2626' }} />
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: detailManifiesto.estado === 'ENTREGADO' ? '#16A34A' : '#DC2626' }}>
                      {detailManifiesto.estado === 'ENTREGADO' ? 'Viaje completado — manifiesto entregado' : 'Manifiesto cancelado'}
                    </Typography>
                  </Box>
                </Box>
              )}

              {/* Panel de corrección de estado (solo supervisores/admin) */}
              {puedeRevertir && (
                <Box sx={{ px: 3, py: 1.5, borderBottom: '1px solid #F1F5F9', bgcolor: alpha('#D97706', 0.03) }}>
                  <Box
                    onClick={() => setShowCorrection(v => !v)}
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.75, cursor: 'pointer', userSelect: 'none' }}
                  >
                    <Undo sx={{ fontSize: 14, color: '#D97706' }} />
                    <Typography sx={{ fontSize: 11.5, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}>
                      Revertir estado
                    </Typography>
                    {showCorrection
                      ? <ExpandLess sx={{ fontSize: 16, color: '#D97706' }} />
                      : <ExpandMore sx={{ fontSize: 16, color: '#D97706' }} />
                    }
                  </Box>
                  <Collapse in={showCorrection}>
                    <Box sx={{ mt: 1.5, p: 2, border: '1px solid', borderColor: alpha('#D97706', 0.3), borderRadius: 1.5, bgcolor: '#FFFBEB' }}>
                      <Typography sx={{ fontSize: 12, color: '#78350F', mb: 1.5 }}>
                        Esta acción revierte el manifiesto de&nbsp;
                        <strong>{detailManifiesto.estado.replace(/_/g, ' ')}</strong>&nbsp;a&nbsp;
                        <strong>{revertInfo!.estado.replace(/_/g, ' ')}</strong>.
                        Queda registrada en las observaciones del manifiesto con tu nombre y la fecha.
                      </Typography>
                      <TextField
                        fullWidth size="small" multiline rows={2}
                        label="Motivo de la corrección *"
                        placeholder="Ej: Se marcó en tránsito antes de tiempo, el vehículo aún no había salido"
                        value={correctionMotivo}
                        onChange={(e: any) => setCorrectionMotivo(e.target.value)}
                        sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { bgcolor: 'white' } }}
                      />
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                        <Button size="small" onClick={() => { setShowCorrection(false); setCorrectionMotivo('') }}>
                          Cancelar
                        </Button>
                        <Button
                          size="small" variant="contained"
                          startIcon={<Undo />}
                          disabled={!correctionMotivo.trim() || revertirEstadoMutation.isPending}
                          onClick={() => revertirEstadoMutation.mutate({ id: detailManifiesto.id, observacion: correctionMotivo })}
                          sx={{ bgcolor: '#D97706', '&:hover': { bgcolor: '#B45309' } }}
                        >
                          {revertirEstadoMutation.isPending ? 'Revirtiendo...' : 'Confirmar corrección'}
                        </Button>
                      </Box>
                    </Box>
                  </Collapse>
                </Box>
              )}

              {/* Estibas del manifiesto */}
              <Box sx={{ px: 3, py: 2 }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 1.5 }}>
                  Estibas en el manifiesto ({(estibasManifiesto as any[]).length})
                </Typography>

                {(estibasManifiesto as any[]).length === 0 ? (
                  <Typography sx={{ fontSize: 12.5, color: '#94A3B8', textAlign: 'center', py: 2.5 }}>
                    Sin estibas asociadas. Registra movimientos de CARGA vinculados a este manifiesto para verlas aquí.
                  </Typography>
                ) : (
                  <>
                    <Table size="small" sx={{ mb: 2 }}>
                      <TableHead>
                        <TableRow>
                          {puedeDescargar && (
                            <TableCell padding="checkbox">
                              <Tooltip title={todasSeleccionadas ? 'Deseleccionar todo' : 'Seleccionar pendientes'}>
                                <Checkbox
                                  size="small"
                                  checked={todasSeleccionadas}
                                  indeterminate={seleccionDescarga.size > 0 && !todasSeleccionadas}
                                  onChange={() =>
                                    setSeleccionDescarga(todasSeleccionadas
                                      ? new Set()
                                      : new Set(estibasPendientes.map((e: any) => e.estiba_id))
                                    )
                                  }
                                  disabled={estibasPendientes.length === 0}
                                />
                              </Tooltip>
                            </TableCell>
                          )}
                          <TableCell>Código</TableCell>
                          <TableCell>Estado actual</TableCell>
                          <TableCell>Fecha de carga</TableCell>
                          <TableCell>Descarga</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(estibasManifiesto as any[]).map((e: any) => {
                          const ec2 = ESTADO_COLORS_ESTIBA[e.estado_actual] ?? { bg: '#F1F5F9', color: '#64748B' }
                          return (
                            <TableRow
                              key={e.estiba_id}
                              sx={{ opacity: e.ya_descargada ? 0.65 : 1 }}
                            >
                              {puedeDescargar && (
                                <TableCell padding="checkbox">
                                  <Checkbox
                                    size="small"
                                    checked={seleccionDescarga.has(e.estiba_id)}
                                    disabled={e.ya_descargada}
                                    onChange={() => handleToggle(e.estiba_id)}
                                  />
                                </TableCell>
                              )}
                              <TableCell>
                                <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12.5 }}>
                                  {e.codigo_interno}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={e.estado_actual.replace(/_/g, ' ')}
                                  size="small"
                                  sx={{ height: 20, fontSize: 10, bgcolor: ec2.bg, color: ec2.color, fontWeight: 700 }}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography sx={{ fontSize: 11.5, color: '#64748B' }}>
                                  {format(new Date(e.fecha_carga), 'dd/MM/yyyy HH:mm', { locale: es })}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                {e.estado_actual === 'FALTANTE'
                                  ? <Chip label="Faltante" size="small" sx={{ height: 18, fontSize: 10, bgcolor: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA', fontWeight: 700 }} />
                                  : e.ya_descargada
                                    ? <CheckCircle sx={{ fontSize: 16, color: '#16A34A' }} />
                                    : <Chip label="Pendiente" size="small" sx={{ height: 18, fontSize: 10, bgcolor: '#FEF3C7', color: '#D97706', fontWeight: 700 }} />
                                }
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>

                    {/* Panel de descarga */}
                    {puedeDescargar && estibasPendientes.length > 0 && (
                      <Box sx={{ p: 2, bgcolor: alpha('#7C3AED', 0.04), border: '1px solid', borderColor: alpha('#7C3AED', 0.2), borderRadius: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
                          <Unarchive sx={{ fontSize: 16, color: '#7C3AED' }} />
                          <Typography sx={{ fontWeight: 700, fontSize: 13, color: '#7C3AED' }}>
                            Registrar descarga
                            {seleccionDescarga.size > 0 ? ` — ${seleccionDescarga.size} estiba(s) seleccionada(s)` : ''}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                          <FormControl size="small" sx={{ flex: 1, minWidth: 220, maxWidth: 380 }}>
                            <InputLabel>Bodega destino *</InputLabel>
                            <Select
                              value={descargaUbicacionId}
                              label="Bodega destino *"
                              onChange={(e: any) => setDescargaUbicacionId(e.target.value)}
                            >
                              {(ubicaciones || []).map((u: any) => (
                                <MenuItem key={u.id} value={u.id}>{u.nombre}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <Button
                            variant="contained"
                            startIcon={<Unarchive />}
                            onClick={handleDescargar}
                            disabled={descargarMutation.isPending || seleccionDescarga.size === 0}
                            sx={{ bgcolor: '#7C3AED', '&:hover': { bgcolor: '#6D28D9' }, whiteSpace: 'nowrap' }}
                          >
                            {descargarMutation.isPending
                              ? 'Descargando...'
                              : `Descargar ${seleccionDescarga.size > 0 ? seleccionDescarga.size : ''} estibas`}
                          </Button>
                        </Box>
                      </Box>
                    )}

                    {puedeDescargar && estibasPendientes.length === 0 && (
                      <Alert severity="success" sx={{ fontSize: 12.5 }}>
                        Todas las estibas del manifiesto ya fueron descargadas correctamente.
                      </Alert>
                    )}
                  </>
                )}
              </Box>

              {/* Historial de cambios de estado */}
              <Box sx={{ px: 3, py: 2, borderTop: '1px solid #F1F5F9' }}>
                <Box
                  onClick={() => setShowHistorial(v => !v)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.75, cursor: 'pointer', userSelect: 'none', mb: showHistorial ? 1.5 : 0 }}
                >
                  {showHistorial ? <ExpandLess sx={{ fontSize: 16, color: '#64748B' }} /> : <ExpandMore sx={{ fontSize: 16, color: '#64748B' }} />}
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', flex: 1 }}>
                    Historial de cambios de estado ({(historialManifiesto as any[]).length})
                  </Typography>
                </Box>
                <Collapse in={showHistorial}>
                  {(historialManifiesto as any[]).length === 0 ? (
                    <Typography sx={{ fontSize: 12, color: '#94A3B8', py: 1 }}>
                      Sin cambios registrados aún.
                    </Typography>
                  ) : (
                    <Box sx={{ position: 'relative', pl: 2 }}>
                      {/* línea vertical del timeline */}
                      <Box sx={{ position: 'absolute', left: 7, top: 8, bottom: 8, width: 2, bgcolor: '#E2E8F0' }} />
                      {(historialManifiesto as any[]).map((h: any, idx: number) => {
                        const esCorreccion = h.tipo_cambio === 'CORRECCION'
                        const dotColor = esCorreccion ? '#D97706' : (ESTADO_COLORS[h.estado_nuevo]?.color ?? '#64748B')
                        return (
                          <Box key={h.id} sx={{ display: 'flex', gap: 1.5, mb: idx < (historialManifiesto as any[]).length - 1 ? 2 : 0, position: 'relative' }}>
                            {/* dot */}
                            <Box sx={{
                              width: 14, height: 14, borderRadius: '50%', flexShrink: 0, mt: 0.25,
                              bgcolor: dotColor, border: '2px solid white',
                              boxShadow: `0 0 0 2px ${dotColor}`,
                              zIndex: 1,
                            }} />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                {h.estado_anterior && (
                                  <>
                                    <Chip label={h.estado_anterior.replace(/_/g, ' ')} size="small"
                                      sx={{ height: 18, fontSize: 9.5, fontWeight: 700,
                                        bgcolor: ESTADO_COLORS[h.estado_anterior]?.bg ?? '#F1F5F9',
                                        color:   ESTADO_COLORS[h.estado_anterior]?.color ?? '#64748B' }} />
                                    <ArrowForward sx={{ fontSize: 11, color: '#94A3B8' }} />
                                  </>
                                )}
                                <Chip label={h.estado_nuevo.replace(/_/g, ' ')} size="small"
                                  sx={{ height: 18, fontSize: 9.5, fontWeight: 700,
                                    bgcolor: ESTADO_COLORS[h.estado_nuevo]?.bg ?? '#F1F5F9',
                                    color:   ESTADO_COLORS[h.estado_nuevo]?.color ?? '#64748B' }} />
                                {esCorreccion && (
                                  <Chip label="CORRECCIÓN" size="small"
                                    sx={{ height: 18, fontSize: 9, fontWeight: 700, bgcolor: '#FEF3C7', color: '#D97706' }} />
                                )}
                              </Box>
                              <Typography sx={{ fontSize: 11, color: '#64748B', mt: 0.25 }}>
                                {format(new Date(h.fecha), "dd/MM/yyyy HH:mm", { locale: es })} — {h.usuario}
                              </Typography>
                              {h.observacion && (
                                <Typography sx={{ fontSize: 11.5, color: '#374151', mt: 0.5, fontStyle: 'italic' }}>
                                  "{h.observacion}"
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        )
                      })}
                    </Box>
                  )}
                </Collapse>
              </Box>

            </DialogContent>

            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button
                startIcon={<PictureAsPdf />}
                onClick={handlePrintPDF}
                variant="outlined"
                sx={{ borderColor: '#DC2626', color: '#DC2626', '&:hover': { bgcolor: 'rgba(220,38,38,0.06)', borderColor: '#DC2626' } }}
              >
                Descargar PDF
              </Button>
              <Box sx={{ flex: 1 }} />
              <Button onClick={closeDetail}>Cerrar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Diálogo crear manifiesto ─────────────────────────────────────── */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Nuevo Manifiesto</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Número *"
                value={form.numero} onChange={e => setForm({ ...form, numero: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" type="date" label="Fecha Programada *"
                InputLabelProps={{ shrink: true }}
                value={form.fecha_programada} onChange={e => setForm({ ...form, fecha_programada: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>Vehículo *</InputLabel>
                <Select value={form.vehiculo_id} label="Vehículo *" onChange={e => setForm({ ...form, vehiculo_id: e.target.value })}>
                  {(vehiculos || []).map((v: any) => (
                    <MenuItem key={v.id} value={v.id}>{v.placa} — {v.tipo}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Origen *</InputLabel>
                <Select value={form.origen_id} label="Origen *" onChange={e => setForm({ ...form, origen_id: e.target.value })}>
                  {(ubicaciones || []).map((u: any) => <MenuItem key={u.id} value={u.id}>{u.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Destino *</InputLabel>
                <Select value={form.destino_id} label="Destino *" onChange={e => setForm({ ...form, destino_id: e.target.value })}>
                  {(ubicaciones || []).map((u: any) => <MenuItem key={u.id} value={u.id}>{u.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                <Autocomplete
                  sx={{ flex: 1 }}
                  options={clientes ?? []}
                  getOptionLabel={(o: any) => o.nit ? `${o.nombre} — ${o.nit}` : o.nombre}
                  value={selectedCliente}
                  onChange={(_: any, v: any) => setSelectedCliente(v)}
                  noOptionsText="Sin clientes registrados"
                  renderInput={(params: any) => (
                    <TextField {...params} label="Cliente" size="small" placeholder="Seleccione un cliente" />
                  )}
                />
                <Tooltip title="Gestionar clientes">
                  <IconButton size="small" onClick={() => navigate('/clientes')} sx={{ mt: 0.5 }}>
                    <OpenInNew fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth size="small" label="Observaciones" multiline rows={2}
                value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenCreate(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creando...' : 'Crear Manifiesto'}
          </Button>
        </DialogActions>
      </Dialog>

    </Layout>
  )
}
