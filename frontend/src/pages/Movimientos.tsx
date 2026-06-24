import React, { useState, useRef, useEffect, useCallback } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import QRCode from 'qrcode'
import {
  Box, Card, Typography, Button, ButtonGroup, Menu, TextField, InputAdornment,
  Table, TableBody, TableCell, TableHead, TableRow,
  Chip, Skeleton, Dialog, DialogTitle, DialogContent, DialogActions,
  Grid, FormControl, InputLabel, Select, MenuItem, Autocomplete, alpha,
  IconButton, Tooltip, Divider, CircularProgress, Alert,
} from '@mui/material'
import {
  Add, ArrowDropDown, UploadFile, DocumentScanner, DeleteOutline,
  CheckCircle, ArrowForward, ArrowBack, QrCodeScanner, Close,
  Videocam, VideocamOff, KeyboardAlt, SwapHoriz, SwitchCamera,
  Refresh, Usb, Bluetooth, PhoneAndroid, QrCode2, WifiTethering, ContentCopy,
  Warning, Edit,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import { StatusChip } from '@/components/common/StatusChip'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

const PRIMARY = '#32AC5C'
const PURPLE  = '#8B5CF6'
const CYAN    = '#06B6D4'

const NIVEL_DANO_COLORS: Record<string, string> = {
  LEVE: '#F59E0B', MODERADO: '#F97316', GRAVE: '#EF4444', TOTAL: '#7F1D1D',
}

const EMPTY_DANO = {
  codigo_dano_id: '', nivel_dano: 'GRAVE', responsable: 'DESCONOCIDO',
  accion_recomendada: 'DAR_BAJA', descripcion_detalle: '', costo_reparacion: '',
}

const TIPOS_MOVIMIENTO = [
  'CARGA', 'DESCARGA', 'TRANSFERENCIA', 'RETORNO', 'RECEPCION',
  'REPARACION', 'BAJA', 'DISPOSICION_FINAL', 'INVENTARIO',
]
const TIPO_COLORS: Record<string, string> = {
  CARGA: '#3B82F6', DESCARGA: '#32AC5C', TRANSFERENCIA: '#8B5CF6',
  RETORNO: '#F59E0B', BAJA: '#EF4444', REPARACION: '#F97316', RECEPCION: '#06B6D4',
}
const ESTADO_MAN_COLOR: Record<string, string> = {
  PROGRAMADO: '#64748B', EN_CARGUE: '#F59E0B', EN_TRANSITO: '#3B82F6',
  ENTREGADO: '#22C55E', CANCELADO: '#EF4444', CON_NOVEDAD: '#F97316',
}

type DeviceMode = 'scanner' | 'camera' | 'mobile'

interface ScannedItem {
  id: number; codigo_interno: string; estado: string
}

export default function Movimientos() {
  const navigate    = useNavigate()
  const queryClient = useQueryClient()

  // ── Listado ───────────────────────────────────────────────────────────────
  const [pageSize,   setPageSize]   = useState(50)
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)

  // ── Diálogo individual ────────────────────────────────────────────────────
  const [openDialog,     setOpenDialog]     = useState(false)
  const [form,           setForm]           = useState({ tipo: 'CARGA', ubicacion_destino_id: '', observaciones: '', manifiesto_id: '', vehiculo_id: '' })
  const [estibaSearch,   setEstibaSearch]   = useState('')
  const [selectedEstiba, setSelectedEstiba] = useState<any>(null)

  // ── Daños (diálogo BAJA) ──────────────────────────────────────────────────
  const [danoForm,      setDanoForm]      = useState({ ...EMPTY_DANO })
  const [editingDanoId, setEditingDanoId] = useState<number | null>(null)
  const [showDanoForm,  setShowDanoForm]  = useState(false)

  // ── Diálogo masivo ────────────────────────────────────────────────────────
  const [openMasivo,   setOpenMasivo]   = useState(false)
  const [masivoStep,   setMasivoStep]   = useState(0)
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([])
  const [masivoForm,   setMasivoForm]   = useState({ tipo: 'DESCARGA', ubicacion_destino_id: '', observaciones: '', manifiesto_id: '', vehiculo_id: '' })

  // ── Dispositivo ───────────────────────────────────────────────────────────
  const [deviceMode,       setDeviceMode]       = useState<DeviceMode>('scanner')
  const [cameras,          setCameras]          = useState<MediaDeviceInfo[]>([])
  const [selectedCameraId, setSelectedCameraId] = useState('')
  const [cameraRunning,    setCameraRunning]     = useState(false)
  const [cameraError,      setCameraError]       = useState('')
  const [detectingCameras, setDetectingCameras] = useState(false)
  const [flashDetect,      setFlashDetect]       = useState(false)
  const [scanActivity,     setScanActivity]      = useState(false)   // pulso en input escáner

  // ── Modo celular / QR ─────────────────────────────────────────────────────
  const [sessionId,       setSessionId]       = useState('')
  const [qrDataUrl,       setQrDataUrl]       = useState('')
  const [qrUrl,           setQrUrl]           = useState('')
  const [mobileActive,    setMobileActive]    = useState(false)   // celular conectó y envió ≥1 código
  const [creatingSession, setCreatingSession] = useState(false)
  const [mobileSubMode,   setMobileSubMode]   = useState<'wifi' | 'usb'>('wifi')
  const [localIP,         setLocalIP]         = useState('')      // IP LAN detectada via WebRTC
  const pollSinceRef = useRef(0)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Escáner manual ────────────────────────────────────────────────────────
  const [scanCode,    setScanCode]    = useState('')
  const [scanLoading, setScanLoading] = useState(false)
  const [scanError,   setScanError]   = useState('')
  const [lastOk,      setLastOk]      = useState('')

  // ── Refs ──────────────────────────────────────────────────────────────────
  const scanInputRef   = useRef<HTMLInputElement>(null)
  const videoRef       = useRef<HTMLVideoElement>(null)
  const controlsRef    = useRef<any>(null)
  const lastCodeRef    = useRef('')
  const processCodeRef = useRef<(code: string) => void>(() => {})

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: movimientos, isLoading } = useQuery({
    queryKey: ['movimientos-recientes', pageSize],
    queryFn: () => apiClient.get('/movimientos/recientes', { params: { limit: pageSize } }).then((r: any) => r.data),
  })
  const { data: ubicaciones } = useQuery({
    queryKey: ['ubicaciones'],
    queryFn: () => apiClient.get('/ubicaciones').then((r: any) => r.data),
  })
  const { data: estibasEncontradas } = useQuery({
    queryKey: ['estibas-search', estibaSearch],
    queryFn: () => apiClient.get('/estibas', { params: { search: estibaSearch, page_size: 20 } }).then((r: any) => r.data.items ?? []),
    enabled: estibaSearch.length >= 2,
  })
  const { data: manifiestos = [] } = useQuery({
    queryKey: ['manifiestos-select'],
    queryFn: () => apiClient.get('/manifiestos/', { params: { limit: 200 } }).then((r: any) => r.data ?? []),
    staleTime: 30000,
  })
  const { data: codigosDano = [] } = useQuery({
    queryKey: ['codigos-dano'],
    queryFn: () => apiClient.get('/danos/codigos').then((r: any) => r.data ?? []),
    staleTime: 60000,
  })
  const { data: eventosDano = [] } = useQuery({
    queryKey: ['eventos-dano', selectedEstiba?.id],
    queryFn: () => apiClient.get('/danos/eventos', { params: { estiba_id: selectedEstiba!.id } }).then((r: any) => r.data ?? []),
    enabled: !!selectedEstiba && form.tipo === 'BAJA',
  })

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/movimientos', data).then((r: any) => r.data),
    onSuccess: () => {
      toast.success('Movimiento registrado')
      queryClient.invalidateQueries({ queryKey: ['movimientos-recientes'] })
      handleClose()
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error registrando movimiento'),
  })
  const masivoMutation = useMutation({
    mutationFn: (items: any[]) =>
      apiClient.post('/movimientos/bulk', { items }).then((r: any) => r.data),
    onSuccess: (data: any) => {
      toast.success(`${data.exitosos} de ${data.total} movimientos registrados`)
      if (data.errores?.length > 0) toast.error(`${data.errores.length} con error`)
      queryClient.invalidateQueries({ queryKey: ['movimientos-recientes'] })
      resetMasivo()
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error en movimientos masivos'),
  })

  const createDanoMutation = useMutation({
    mutationFn: (data: any) => apiClient.post('/danos/eventos', data).then((r: any) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos-dano'] })
      setDanoForm({ ...EMPTY_DANO }); setShowDanoForm(false); setEditingDanoId(null)
      toast.success('Daño registrado')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error al registrar daño'),
  })
  const updateDanoMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => apiClient.put(`/danos/eventos/${id}`, data).then((r: any) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eventos-dano'] })
      setDanoForm({ ...EMPTY_DANO }); setShowDanoForm(false); setEditingDanoId(null)
      toast.success('Daño actualizado')
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error al actualizar daño'),
  })
  const deleteDanoMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/danos/eventos/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['eventos-dano'] }); toast.success('Daño eliminado') },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error al eliminar daño'),
  })

  // ── Procesamiento de código ───────────────────────────────────────────────
  const processCode = useCallback(async (code: string) => {
    const trimmed = code.trim()
    if (!trimmed) return
    setScanLoading(true); setScanError(''); setLastOk('')
    // Pulso visual en modo escáner
    setScanActivity(true); setTimeout(() => setScanActivity(false), 600)
    try {
      const res = await apiClient.get(`/estibas/buscar/${encodeURIComponent(trimmed)}`)
      const estiba = res.data
      setScannedItems(prev => {
        if (prev.some(i => i.id === estiba.id)) {
          setScanError(`"${trimmed}" ya está en la lista`)
          return prev
        }
        setLastOk(estiba.codigo_interno)
        setScanCode('')
        return [...prev, { id: estiba.id, codigo_interno: estiba.codigo_interno, estado: estiba.estado }]
      })
    } catch (err: any) {
      const raw = err?.response?.data?.detail
      setScanError(typeof raw === 'string' ? raw : `No se encontró "${trimmed}"`)
    } finally {
      setScanLoading(false)
      if (deviceMode === 'scanner') setTimeout(() => scanInputRef.current?.focus(), 50)
    }
  }, [deviceMode])
  useEffect(() => { processCodeRef.current = processCode }, [processCode])

  // ── Cámara: detener ───────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    if (controlsRef.current) {
      try { controlsRef.current.stop() } catch { /**/ }
      controlsRef.current = null
    }
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraRunning(false)
    lastCodeRef.current = ''
  }, [])

  // ── Celular/QR: obtener IP LAN del PC desde Vite (Node.js en el host) ────
  // Chrome/Edge bloquean WebRTC; el backend corre en Docker y no ve la IP
  // real de la red. Vite sí corre en el host de Windows y expone /server-ip.
  const detectLocalIP = useCallback((): Promise<string> => {
    return fetch('/server-ip')
      .then(r => r.json())
      .then((d: any) => d?.ip ?? '')
      .catch(() => '')
  }, [])

  // ── Celular/QR: generar QR según subMode + IP ─────────────────────────────
  const generateQR = useCallback(async (sid: string, subMode: 'wifi' | 'usb', ip: string) => {
    const port = window.location.port || '5173'
    const host = ip || window.location.hostname
    const url  = `http://${host}:${port}/scanner-movil?session=${sid}`
    setQrUrl(url)
    const dataUrl = await QRCode.toDataURL(url, {
      width: 240, margin: 1,
      color: { dark: '#0D1117', light: '#FFFFFF' },
    })
    setQrDataUrl(dataUrl)
  }, [])

  // ── Celular/QR: crear sesión ──────────────────────────────────────────────
  const startMobileSession = useCallback(async (subMode?: 'wifi' | 'usb') => {
    const currentSubMode = subMode ?? mobileSubMode
    setCreatingSession(true); setScanError(''); setQrDataUrl(''); setQrUrl('')
    try {
      const [res, ip] = await Promise.all([
        apiClient.post('/scan-sessions'),
        detectLocalIP(),
      ])
      const id: string = res.data.id
      setSessionId(id)
      if (currentSubMode === 'wifi') setLocalIP(ip)
      pollSinceRef.current = 0
      await generateQR(id, currentSubMode, ip)
    } catch {
      setScanError('No se pudo crear la sesión de escaneo')
    } finally {
      setCreatingSession(false)
    }
  }, [mobileSubMode, detectLocalIP, generateQR])

  // Regenerar QR cuando cambia el sub-modo (WiFi ↔ USB)
  useEffect(() => {
    if (!sessionId) return
    detectLocalIP().then(ip => { setLocalIP(ip); generateQR(sessionId, mobileSubMode, ip) })
  }, [mobileSubMode])  // eslint-disable-line

  // Regenerar QR cuando el usuario edita la IP manualmente
  const handleIPChange = useCallback((ip: string) => {
    setLocalIP(ip)
    if (sessionId) generateQR(sessionId, 'wifi', ip)
  }, [sessionId, generateQR])

  // Polling — cada 2 s cuando modo es 'mobile' y hay sesión activa
  useEffect(() => {
    if (deviceMode !== 'mobile' || !sessionId) {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
      return
    }
    const poll = async () => {
      try {
        const res = await apiClient.get(`/scan-sessions/${sessionId}/codes`, {
          params: { since: pollSinceRef.current },
        })
        const newCodes: string[] = res.data.codes ?? []
        if (newCodes.length > 0) {
          setMobileActive(true)
          pollSinceRef.current = res.data.total
          for (const code of newCodes) processCodeRef.current(code)
        }
      } catch { /**/ }
    }
    poll()
    pollTimerRef.current = setInterval(poll, 2000)
    return () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current) }
  }, [deviceMode, sessionId])

  // Auto-crear sesión al cambiar a modo móvil
  useEffect(() => {
    if (openMasivo && masivoStep === 0 && deviceMode === 'mobile' && !sessionId) {
      startMobileSession()
    }
  }, [openMasivo, masivoStep, deviceMode])  // eslint-disable-line

  // ── Cámara: detectar dispositivos ─────────────────────────────────────────
  const enumerateCameras = useCallback(async () => {
    setDetectingCameras(true)
    setCameraError('')
    try {
      // Solicitar permiso primero para que los labels no sean vacíos
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach(t => t.stop())

      const devs = await BrowserMultiFormatReader.listVideoInputDevices()
      setCameras(devs)
      if (devs.length > 0) {
        // Preferir cámara trasera en móviles
        const back = devs.find(d => /back|rear|environment/i.test(d.label))
        setSelectedCameraId(back?.deviceId ?? devs[0].deviceId)
      }
      if (devs.length === 0) setCameraError('No se detectaron cámaras en este dispositivo')
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Permiso denegado — habilita el acceso a la cámara en la barra del navegador'
        : 'No se pudo acceder a la cámara'
      setCameraError(msg)
    } finally {
      setDetectingCameras(false)
    }
  }, [])

  // Auto-detectar al cambiar a modo cámara
  useEffect(() => {
    if (openMasivo && masivoStep === 0 && deviceMode === 'camera' && cameras.length === 0) {
      enumerateCameras()
    }
  }, [openMasivo, masivoStep, deviceMode])  // eslint-disable-line

  // Limpiar cámara al cambiar
  useEffect(() => {
    if (!openMasivo || masivoStep !== 0 || deviceMode !== 'camera') stopCamera()
  }, [openMasivo, masivoStep, deviceMode, stopCamera])

  // Foco en input modo escáner
  useEffect(() => {
    if (openMasivo && masivoStep === 0 && deviceMode === 'scanner') {
      const t = setTimeout(() => scanInputRef.current?.focus(), 150)
      return () => clearTimeout(t)
    }
  }, [openMasivo, masivoStep, deviceMode])

  // ── Cámara: iniciar ───────────────────────────────────────────────────────
  const startCamera = useCallback(async (deviceId?: string) => {
    setCameraError('')
    stopCamera()
    const reader = new BrowserMultiFormatReader()
    try {
      const controls = await reader.decodeFromVideoDevice(
        deviceId || null,
        videoRef.current!,
        (result: any) => {
          if (!result) return
          const val = result.getText?.()?.trim()
          if (!val || val === lastCodeRef.current) return
          lastCodeRef.current = val
          setFlashDetect(true)
          setTimeout(() => setFlashDetect(false), 380)
          setTimeout(() => { lastCodeRef.current = '' }, 2400)
          processCodeRef.current(val)
        }
      )
      controlsRef.current = controls
      setCameraRunning(true)
      // Forzar play por si el navegador bloqueó autoplay
      if (videoRef.current) videoRef.current.play().catch(() => {/**/})
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Permiso de cámara denegado'
        : err?.message || 'No se pudo iniciar la cámara'
      setCameraError(msg)
    }
  }, [stopCamera])

  const switchCamera = () => {
    const idx  = cameras.findIndex(c => c.deviceId === selectedCameraId)
    const next = cameras[(idx + 1) % cameras.length]
    setSelectedCameraId(next.deviceId)
    startCamera(next.deviceId)
  }

  // ── Handlers generales ────────────────────────────────────────────────────
  const handleSaveDano = () => {
    if (!danoForm.codigo_dano_id) { toast.error('Selecciona un código de daño'); return }
    if (!selectedEstiba) return
    const payload = {
      estiba_id:          selectedEstiba.id,
      codigo_dano_id:     parseInt(danoForm.codigo_dano_id),
      nivel_dano:         danoForm.nivel_dano,
      responsable:        danoForm.responsable,
      ...(danoForm.accion_recomendada ? { accion_recomendada: danoForm.accion_recomendada } : {}),
      ...(danoForm.descripcion_detalle ? { descripcion_detalle: danoForm.descripcion_detalle } : {}),
      ...(danoForm.costo_reparacion   ? { costo_reparacion: parseFloat(danoForm.costo_reparacion) } : {}),
    }
    if (editingDanoId) {
      updateDanoMutation.mutate({ id: editingDanoId, ...payload })
    } else {
      createDanoMutation.mutate(payload)
    }
  }

  const handleClose = () => {
    setOpenDialog(false); setEstibaSearch(''); setSelectedEstiba(null)
    setForm({ tipo: 'CARGA', ubicacion_destino_id: '', observaciones: '', manifiesto_id: '', vehiculo_id: '' })
    setDanoForm({ ...EMPTY_DANO }); setShowDanoForm(false); setEditingDanoId(null)
  }

  const handleManifiestoIndividual = (manifiestoId: string) => {
    const m = (manifiestos as any[]).find(x => String(x.id) === manifiestoId)
    setForm(f => ({
      ...f,
      manifiesto_id: manifiestoId,
      vehiculo_id: m ? String(m.vehiculo_id) : '',
    }))
  }

  const handleManifiestoMasivo = (manifiestoId: string) => {
    const m = (manifiestos as any[]).find(x => String(x.id) === manifiestoId)
    setMasivoForm(f => ({
      ...f,
      manifiesto_id: manifiestoId,
      vehiculo_id: m ? String(m.vehiculo_id) : '',
      ...(f.tipo === 'DESCARGA' && m && !f.ubicacion_destino_id ? { ubicacion_destino_id: String(m.destino_id) } : {}),
    }))
  }

  const handleSubmit = () => {
    if (!selectedEstiba) { toast.error('Selecciona una estiba'); return }
    const manifId = form.manifiesto_id ? parseInt(form.manifiesto_id) : undefined
    const vehicId = form.vehiculo_id ? parseInt(form.vehiculo_id) : undefined
    const manifest = manifId ? (manifiestos as any[]).find(m => m.id === manifId) : null
    createMutation.mutate({
      estiba_id:            selectedEstiba.id,
      tipo:                 form.tipo,
      ...(form.ubicacion_destino_id ? { ubicacion_destino_id: parseInt(form.ubicacion_destino_id) } : {}),
      ...(form.tipo === 'CARGA' && manifest ? { ubicacion_origen_id: manifest.origen_id } : {}),
      ...(manifId ? { manifiesto_id: manifId } : {}),
      ...(vehicId ? { vehiculo_id: vehicId } : {}),
      observaciones: form.observaciones,
    })
  }
  const resetMasivo = () => {
    stopCamera()
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null }
    if (sessionId) apiClient.delete(`/scan-sessions/${sessionId}`).catch(() => {/**/})
    setOpenMasivo(false); setMasivoStep(0)
    setScanCode(''); setScanError(''); setLastOk('')
    setScannedItems([])
    setMasivoForm({ tipo: 'DESCARGA', ubicacion_destino_id: '', observaciones: '', manifiesto_id: '', vehiculo_id: '' })
    setCameraError(''); setCameraRunning(false); setCameras([])
    setSessionId(''); setQrDataUrl(''); setQrUrl(''); setMobileActive(false); setLocalIP('')
  }
  const removeScanned = (id: number) => setScannedItems(prev => prev.filter(i => i.id !== id))
  const handleSubmitMasivo = () => {
    if (scannedItems.length === 0) return
    const manifId = masivoForm.manifiesto_id ? parseInt(masivoForm.manifiesto_id) : undefined
    const vehicId = masivoForm.vehiculo_id ? parseInt(masivoForm.vehiculo_id) : undefined
    const manifest = manifId ? (manifiestos as any[]).find(m => m.id === manifId) : null
    const bodegaId = masivoForm.ubicacion_destino_id ? parseInt(masivoForm.ubicacion_destino_id) : undefined
    masivoMutation.mutate(scannedItems.map(e => ({
      estiba_id: e.id,
      tipo:      masivoForm.tipo,
      ...(masivoForm.tipo === 'CARGA' && manifest ? { ubicacion_origen_id: manifest.origen_id } : {}),
      ...(bodegaId
        ? { ubicacion_destino_id: bodegaId }
        : masivoForm.tipo === 'DESCARGA' && manifest ? { ubicacion_destino_id: manifest.destino_id } : {}),
      ...(manifId ? { manifiesto_id: manifId } : {}),
      ...(vehicId ? { vehiculo_id: vehicId } : {}),
      ...(masivoForm.observaciones ? { observaciones: masivoForm.observaciones } : {}),
    })))
  }

  // ── Manifiestos seleccionados (computed para evitar IIFE en JSX) ────────
  const manifiestoFormSel: any = form.manifiesto_id
    ? (manifiestos as any[]).find(x => String(x.id) === form.manifiesto_id) ?? null
    : null
  const manifiestoMasivoSel: any = masivoForm.manifiesto_id
    ? (manifiestos as any[]).find(x => String(x.id) === masivoForm.manifiesto_id) ?? null
    : null

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Layout title="Movimientos">

      {/* Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2.5, alignItems: 'center' }}>
        <Typography variant="body2" sx={{ color: '#64748B' }}>
          Registro de todos los movimientos de estibas
        </Typography>
        <ButtonGroup variant="contained" disableElevation>
          <Button startIcon={<Add />} onClick={() => setOpenDialog(true)}>Registrar Movimiento</Button>
          <Button size="small" sx={{ px: 0.75 }} onClick={e => setMenuAnchor(e.currentTarget)}>
            <ArrowDropDown />
          </Button>
        </ButtonGroup>
        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          PaperProps={{ elevation: 3, sx: { mt: 0.5, minWidth: 260, borderRadius: '10px' } }}>
          <MenuItem onClick={() => { setMenuAnchor(null); navigate('/movimientos/cargue-masivo') }}
            sx={{ py: 1.25, px: 2 }}>
            <UploadFile sx={{ fontSize: 18, mr: 1.5, color: PRIMARY }} />
            <Box>
              <Typography sx={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.2 }}>Cargue Masivo</Typography>
              <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>Importar desde Excel</Typography>
            </Box>
          </MenuItem>
          <Divider sx={{ my: 0.5 }} />
          <MenuItem onClick={() => { setMenuAnchor(null); setOpenMasivo(true) }} sx={{ py: 1.25, px: 2 }}>
            <QrCodeScanner sx={{ fontSize: 18, mr: 1.5, color: PURPLE }} />
            <Box>
              <Typography sx={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.2 }}>Movimientos Masivos</Typography>
              <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>Cámara · escáner · manual</Typography>
            </Box>
          </MenuItem>
        </Menu>
      </Box>

      {/* Tabla */}
      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['ID', 'Tipo', 'Estiba', 'Destino', 'Usuario', 'Fecha'].map(h => <TableCell key={h}>{h}</TableCell>)}
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><Skeleton /></TableCell>)}</TableRow>
                  ))
                : (Array.isArray(movimientos) ? movimientos : []).map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700 }}>#{m.id}</Typography></TableCell>
                      <TableCell><Chip label={m.tipo} size="small" sx={{ bgcolor: TIPO_COLORS[m.tipo] || '#64748B', color: '#FFF', fontWeight: 700, fontSize: 11 }} /></TableCell>
                      <TableCell><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>#{m.estiba_id}</Typography></TableCell>
                      <TableCell><Typography variant="body2" sx={{ fontSize: 12 }}>{m.ubicacion_destino ?? '—'}</Typography></TableCell>
                      <TableCell><Typography variant="body2" sx={{ fontSize: 12 }}>{m.usuario}</Typography></TableCell>
                      <TableCell><Typography variant="body2" sx={{ fontSize: 12 }}>{format(new Date(m.fecha), 'dd/MM/yyyy HH:mm', { locale: es })}</Typography></TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </Box>
      </Card>

      {/* ── Diálogo individual ───────────────────────────────────────────── */}
      <Dialog open={openDialog} onClose={handleClose} maxWidth={form.tipo === 'BAJA' ? 'md' : 'sm'} fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Registrar Movimiento</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <Autocomplete
                options={estibasEncontradas ?? []}
                getOptionLabel={(o: any) => `${o.codigo_interno} — ${o.estado}`}
                inputValue={estibaSearch}
                onInputChange={(_: any, v: string) => setEstibaSearch(v)}
                onChange={(_: any, v: any) => setSelectedEstiba(v)}
                noOptionsText={estibaSearch.length < 2 ? 'Escriba al menos 2 caracteres' : 'No encontrado'}
                renderInput={(params: any) => (
                  <TextField {...params} label="Buscar estiba" size="small" required placeholder="Ej: PRUEBA-001" />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo de Movimiento</InputLabel>
                <Select value={form.tipo} label="Tipo de Movimiento" onChange={(e: any) => setForm({ ...form, tipo: e.target.value })}>
                  {TIPOS_MOVIMIENTO.map(t => (
                    <MenuItem key={t} value={t}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: TIPO_COLORS[t] || '#64748B' }} />
                        {t.replace(/_/g, ' ')}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Manifiesto (opcional)</InputLabel>
                <Select
                  value={form.manifiesto_id}
                  label="Manifiesto (opcional)"
                  onChange={(e: any) => handleManifiestoIndividual(e.target.value)}
                  renderValue={(v: any) => {
                    if (!v) return 'Sin manifiesto'
                    const m = (manifiestos as any[]).find(x => String(x.id) === v)
                    return m ? `${m.numero} · ${m.estado}` : String(v)
                  }}
                >
                  <MenuItem value="">Sin manifiesto</MenuItem>
                  {(manifiestos as any[]).map((m: any) => (
                    <MenuItem key={m.id} value={String(m.id)}>
                      {m.numero} · {m.estado}{m.cliente_nombre ? ` · ${m.cliente_nombre}` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Info card manifiesto seleccionado */}
            {manifiestoFormSel && (
              <Grid item xs={12}>
                <Box sx={{ px: 1.75, py: 1.25, bgcolor: alpha('#3B82F6', 0.06), border: '1px solid', borderColor: alpha('#3B82F6', 0.2), borderRadius: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Chip label={manifiestoFormSel.estado} size="small" sx={{ height: 20, fontSize: 10, bgcolor: alpha(ESTADO_MAN_COLOR[manifiestoFormSel.estado] ?? '#64748B', 0.15), color: ESTADO_MAN_COLOR[manifiestoFormSel.estado] ?? '#64748B', fontWeight: 700 }} />
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#1E40AF' }}>{manifiestoFormSel.numero}</Typography>
                    {manifiestoFormSel.cliente_nombre && <Typography sx={{ fontSize: 12, color: '#64748B' }}>· {manifiestoFormSel.cliente_nombre}</Typography>}
                  </Box>
                  <Typography sx={{ fontSize: 11.5, color: '#475569' }}>
                    {form.tipo === 'CARGA'
                      ? 'Las estibas quedarán EN TRÁNSITO vinculadas a este manifiesto y al vehículo asignado.'
                      : form.tipo === 'DESCARGA'
                      ? 'Las estibas se descargarán y quedarán EN CLIENTE con referencia al manifiesto.'
                      : 'El movimiento quedará vinculado a este manifiesto.'}
                  </Typography>
                </Box>
              </Grid>
            )}

            {/* Bodega destino: solo cuando NO es CARGA con manifiesto */}
            {form.tipo === 'CARGA' && manifiestoFormSel ? (
              <Grid item xs={12}>
                <Box sx={{ display:'flex', alignItems:'center', gap:1.5, px:1.75, py:1.25,
                  bgcolor:'rgba(59,130,246,0.04)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:1.5 }}>
                  <Box sx={{ fontSize:20 }}>🚛</Box>
                  <Box>
                    <Typography sx={{ fontSize:12.5, fontWeight:700, color:'#1E40AF' }}>
                      Ubicación temporal: vehículo del manifiesto
                    </Typography>
                    <Typography sx={{ fontSize:11.5, color:'#475569' }}>
                      La estiba no tiene bodega asignada mientras viaja. La ubicación se actualizará al registrar la DESCARGA en destino.
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ) : (
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>
                    {form.tipo === 'DESCARGA' && manifiestoFormSel ? 'Bodega de llegada *' : 'Ubicación Destino'}
                  </InputLabel>
                  <Select
                    value={form.ubicacion_destino_id}
                    label={form.tipo === 'DESCARGA' && manifiestoFormSel ? 'Bodega de llegada *' : 'Ubicación Destino'}
                    onChange={(e: any) => setForm({ ...form, ubicacion_destino_id: e.target.value })}
                  >
                    <MenuItem value="">
                      {form.tipo === 'DESCARGA' && manifiestoFormSel ? 'Usar bodega del manifiesto' : 'Sin ubicación específica'}
                    </MenuItem>
                    {(ubicaciones || []).map((u: any) => <MenuItem key={u.id} value={u.id}>{u.nombre}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={12}>
              <TextField fullWidth label="Observaciones" size="small" multiline rows={2}
                value={form.observaciones} onChange={(e: any) => setForm({ ...form, observaciones: e.target.value })} />
            </Grid>

            {/* ── Sección daños — solo visible al dar de BAJA ── */}
            {form.tipo === 'BAJA' && selectedEstiba && (
              <Grid item xs={12}>
                <Box sx={{ borderTop: '1.5px solid', borderColor: alpha('#EF4444', 0.25), pt: 2, mt: 0.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.25 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Warning sx={{ fontSize: 17, color: '#EF4444' }} />
                      <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: '#EF4444' }}>
                        Daños de la estiba
                      </Typography>
                      {(eventosDano as any[]).length > 0 && (
                        <Chip label={(eventosDano as any[]).length} size="small"
                          sx={{ height: 18, fontSize: 11, bgcolor: alpha('#EF4444', 0.12), color: '#EF4444', fontWeight: 700 }} />
                      )}
                    </Box>
                    {!showDanoForm && (
                      <Button size="small" startIcon={<Add />}
                        onClick={() => { setShowDanoForm(true); setEditingDanoId(null); setDanoForm({ ...EMPTY_DANO }) }}>
                        Agregar daño
                      </Button>
                    )}
                  </Box>

                  {/* Lista de daños existentes */}
                  {(eventosDano as any[]).map((ev: any) => (
                    <Box key={ev.id} sx={{
                      display: 'flex', alignItems: 'flex-start', gap: 1, p: 1.25, mb: 0.75,
                      bgcolor: alpha('#EF4444', 0.04), border: '1px solid', borderColor: alpha('#EF4444', 0.15),
                      borderRadius: 1.5,
                    }}>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#1E293B' }}>
                          {ev.codigo_dano?.codigo} — {ev.codigo_dano?.descripcion}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.4 }}>
                          <Chip label={ev.nivel_dano} size="small" sx={{
                            height: 18, fontSize: 10, fontWeight: 700,
                            bgcolor: NIVEL_DANO_COLORS[ev.nivel_dano] ?? '#64748B', color: '#FFF',
                          }} />
                          <Chip label={ev.responsable?.replace(/_/g, ' ')} size="small" sx={{ height: 18, fontSize: 10 }} />
                          {ev.accion_recomendada && (
                            <Chip label={ev.accion_recomendada.replace(/_/g, ' ')} size="small" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                          )}
                        </Box>
                        {ev.descripcion_detalle && (
                          <Typography sx={{ fontSize: 11, color: '#64748B', mt: 0.4 }}>{ev.descripcion_detalle}</Typography>
                        )}
                        {ev.costo_reparacion && (
                          <Typography sx={{ fontSize: 11, color: '#64748B', mt: 0.25 }}>
                            Costo: ${ev.costo_reparacion.toLocaleString('es-CO')}
                          </Typography>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.25, flexShrink: 0 }}>
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => {
                            setEditingDanoId(ev.id)
                            setDanoForm({
                              codigo_dano_id:     String(ev.codigo_dano_id),
                              nivel_dano:         ev.nivel_dano,
                              responsable:        ev.responsable,
                              accion_recomendada: ev.accion_recomendada ?? '',
                              descripcion_detalle: ev.descripcion_detalle ?? '',
                              costo_reparacion:   ev.costo_reparacion ? String(ev.costo_reparacion) : '',
                            })
                            setShowDanoForm(true)
                          }}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton size="small"
                            onClick={() => deleteDanoMutation.mutate(ev.id)}
                            disabled={deleteDanoMutation.isPending}
                            sx={{ color: '#EF4444' }}>
                            <DeleteOutline fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  ))}

                  {(eventosDano as any[]).length === 0 && !showDanoForm && (
                    <Typography sx={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', py: 1.5 }}>
                      Sin daños registrados. Agrega los daños antes de dar de baja la estiba.
                    </Typography>
                  )}

                  {/* Formulario agregar / editar daño */}
                  {showDanoForm && (
                    <Box sx={{ p: 2, bgcolor: '#FAFAFA', border: '1px solid #E2E8F0', borderRadius: 1.5, mt: 0.5 }}>
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#475569', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {editingDanoId ? 'Editar daño' : 'Nuevo daño'}
                      </Typography>
                      <Grid container spacing={1.5}>
                        <Grid item xs={12}>
                          <FormControl fullWidth size="small" required>
                            <InputLabel>Código de daño *</InputLabel>
                            <Select value={danoForm.codigo_dano_id} label="Código de daño *"
                              onChange={(e: any) => setDanoForm((f: any) => ({ ...f, codigo_dano_id: e.target.value }))}>
                              {(codigosDano as any[]).map((c: any) => (
                                <MenuItem key={c.id} value={String(c.id)}>
                                  {`${c.codigo} — ${c.descripcion}`}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Nivel de daño *</InputLabel>
                            <Select value={danoForm.nivel_dano} label="Nivel de daño *"
                              onChange={(e: any) => setDanoForm((f: any) => ({ ...f, nivel_dano: e.target.value }))}>
                              {['LEVE', 'MODERADO', 'GRAVE', 'TOTAL'].map(n => (
                                <MenuItem key={n} value={n}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: NIVEL_DANO_COLORS[n] }} />
                                    {n}
                                  </Box>
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Responsable</InputLabel>
                            <Select value={danoForm.responsable} label="Responsable"
                              onChange={(e: any) => setDanoForm((f: any) => ({ ...f, responsable: e.target.value }))}>
                              {['CLIENTE', 'TRANSPORTADORA', 'PROVEEDOR', 'OPERACION_INTERNA', 'DESCONOCIDO'].map(r => (
                                <MenuItem key={r} value={r}>{r.replace(/_/g, ' ')}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                          <FormControl fullWidth size="small">
                            <InputLabel>Acción recomendada</InputLabel>
                            <Select value={danoForm.accion_recomendada} label="Acción recomendada"
                              onChange={(e: any) => setDanoForm((f: any) => ({ ...f, accion_recomendada: e.target.value }))}>
                              <MenuItem value="">Sin acción específica</MenuItem>
                              {['REPARAR', 'DAR_BAJA', 'DISPOSICION_FINAL', 'MONITOREAR', 'REPONER'].map(a => (
                                <MenuItem key={a} value={a}>{a.replace(/_/g, ' ')}</MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                          <TextField fullWidth size="small" label="Costo reparación (COP)" type="number"
                            value={danoForm.costo_reparacion}
                            onChange={(e: any) => setDanoForm((f: any) => ({ ...f, costo_reparacion: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12}>
                          <TextField fullWidth size="small" label="Descripción del daño" multiline rows={2}
                            value={danoForm.descripcion_detalle}
                            onChange={(e: any) => setDanoForm((f: any) => ({ ...f, descripcion_detalle: e.target.value }))} />
                        </Grid>
                        <Grid item xs={12}>
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                            <Button size="small" onClick={() => { setShowDanoForm(false); setEditingDanoId(null); setDanoForm({ ...EMPTY_DANO }) }}>
                              Cancelar
                            </Button>
                            <Button size="small" variant="contained" onClick={handleSaveDano}
                              disabled={createDanoMutation.isPending || updateDanoMutation.isPending}
                              sx={{ bgcolor: '#EF4444', '&:hover': { bgcolor: '#DC2626' } }}>
                              {editingDanoId ? 'Actualizar daño' : 'Agregar daño'}
                            </Button>
                          </Box>
                        </Grid>
                      </Grid>
                    </Box>
                  )}
                </Box>
              </Grid>
            )}

          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit} disabled={createMutation.isPending || !selectedEstiba}>
            {createMutation.isPending ? 'Registrando...' : 'Registrar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Diálogo: Movimientos Masivos ─────────────────────────────────── */}
      <Dialog
        open={openMasivo}
        onClose={() => { if (!masivoMutation.isPending) resetMasivo() }}
        maxWidth="md" fullWidth
        PaperProps={{ sx: { borderRadius: 2.5, overflow: 'hidden', maxHeight: '94vh' } }}
      >
        {/* Header */}
        <Box sx={{ px: 3, pt: 2.5, pb: 2, borderBottom: '1px solid #F1F5F9',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.02em' }}>
              Movimientos Masivos
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: '#64748B', mt: 0.25 }}>
              {masivoStep === 0
                ? 'Paso 1 de 2 — Selecciona el dispositivo y escanea las estibas'
                : 'Paso 2 de 2 — Configura el tipo de movimiento y bodega destino'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            {[0, 1].map(s => (
              <Box key={s} sx={{
                width: s === masivoStep ? 32 : 8, height: 8, borderRadius: 4,
                bgcolor: s === masivoStep ? PURPLE : s < masivoStep ? PRIMARY : '#E2E8F0',
                transition: 'all 0.25s ease',
              }} />
            ))}
            <IconButton size="small" onClick={resetMasivo} disabled={masivoMutation.isPending} sx={{ ml: 0.5, color: '#94A3B8' }}>
              <Close fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <DialogContent sx={{ p: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* ═══════════════════════════════════════════════════════════════
              PASO 0: Escaneo
          ═══════════════════════════════════════════════════════════════ */}
          {masivoStep === 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

              {/* ── Selector de tipo de dispositivo ── */}
              <Box sx={{ px: 3, pt: 2, pb: 1.5, borderBottom: '1px solid #F1F5F9', bgcolor: '#FAFAFA' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94A3B8',
                  textTransform: 'uppercase', letterSpacing: '0.08em', mb: 1.25 }}>
                  Dispositivo de lectura
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>

                  {/* Escáner / Manual */}
                  <Box onClick={() => { stopCamera(); setDeviceMode('scanner'); setScanError(''); setCameraError('') }}
                    sx={{
                      flex: 1, px: 2, py: 1.25, borderRadius: 1.5, cursor: 'pointer',
                      border: `1.5px solid ${deviceMode === 'scanner' ? PURPLE : '#E2E8F0'}`,
                      bgcolor: deviceMode === 'scanner' ? alpha(PURPLE, 0.06) : '#FFF',
                      display: 'flex', alignItems: 'center', gap: 1.25, transition: 'all 0.15s ease',
                      '&:hover': { borderColor: PURPLE, bgcolor: alpha(PURPLE, 0.04) },
                    }}>
                    <KeyboardAlt sx={{ fontSize: 20, color: deviceMode === 'scanner' ? PURPLE : '#94A3B8' }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2, color: deviceMode === 'scanner' ? PURPLE : '#475569' }}>
                        Escáner / Manual
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>USB · Bluetooth HID · teclado</Typography>
                    </Box>
                    {deviceMode === 'scanner' && <CheckCircle sx={{ fontSize: 16, color: PURPLE }} />}
                  </Box>

                  {/* Cámara */}
                  <Box onClick={() => { setDeviceMode('camera'); setScanError('') }}
                    sx={{
                      flex: 1, px: 2, py: 1.25, borderRadius: 1.5, cursor: 'pointer',
                      border: `1.5px solid ${deviceMode === 'camera' ? CYAN : '#E2E8F0'}`,
                      bgcolor: deviceMode === 'camera' ? alpha(CYAN, 0.06) : '#FFF',
                      display: 'flex', alignItems: 'center', gap: 1.25, transition: 'all 0.15s ease',
                      '&:hover': { borderColor: CYAN, bgcolor: alpha(CYAN, 0.04) },
                    }}>
                    <Videocam sx={{ fontSize: 20, color: deviceMode === 'camera' ? CYAN : '#94A3B8' }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2, color: deviceMode === 'camera' ? CYAN : '#475569' }}>
                        Cámara
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>QR · código de barras · DataMatrix</Typography>
                    </Box>
                    {deviceMode === 'camera' && <CheckCircle sx={{ fontSize: 16, color: CYAN }} />}
                  </Box>
                </Box>

                {/* Fila 2: Celular / QR */}
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                  <Box onClick={() => {
                    stopCamera()
                    setDeviceMode('mobile')
                    setScanError('')
                    if (!sessionId) startMobileSession(mobileSubMode)
                  }}
                    sx={{
                      flex: 1, px: 2, py: 1.25, borderRadius: 1.5, cursor: 'pointer',
                      border: `1.5px solid ${deviceMode === 'mobile' ? '#F59E0B' : '#E2E8F0'}`,
                      bgcolor: deviceMode === 'mobile' ? alpha('#F59E0B', 0.06) : '#FFF',
                      display: 'flex', alignItems: 'center', gap: 1.25, transition: 'all 0.15s ease',
                      '&:hover': { borderColor: '#F59E0B', bgcolor: alpha('#F59E0B', 0.04) },
                    }}>
                    <PhoneAndroid sx={{ fontSize: 20, color: deviceMode === 'mobile' ? '#F59E0B' : '#94A3B8' }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, lineHeight: 1.2, color: deviceMode === 'mobile' ? '#D97706' : '#475569' }}>
                        Celular vía código QR
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: '#94A3B8' }}>
                        Escanea con la cámara del celular conectado por red local
                      </Typography>
                    </Box>
                    {deviceMode === 'mobile' && mobileActive && (
                      <Chip label="Activo" size="small"
                        sx={{ height: 18, fontSize: 10, bgcolor: alpha(PRIMARY, 0.15), color: PRIMARY, fontWeight: 700 }} />
                    )}
                    {deviceMode === 'mobile' && !mobileActive && <CheckCircle sx={{ fontSize: 16, color: '#F59E0B' }} />}
                  </Box>
                </Box>
              </Box>

              {/* ══════════════════════════════════════════════
                  MODO: Escáner HID / Manual
              ══════════════════════════════════════════════ */}
              {deviceMode === 'scanner' && (
                <Box>
                  {/* Estado del lector */}
                  <Box sx={{
                    px: 3, py: 1.5,
                    bgcolor: scanActivity ? alpha(PRIMARY, 0.06) : '#F0FDF4',
                    borderBottom: '1px solid #DCFCE7',
                    display: 'flex', alignItems: 'center', gap: 2,
                    transition: 'background-color 0.2s ease',
                  }}>
                    <Box sx={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      bgcolor: PRIMARY,
                      boxShadow: scanActivity ? `0 0 0 4px ${alpha(PRIMARY, 0.3)}` : 'none',
                      transition: 'box-shadow 0.15s ease',
                    }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#166534' }}>
                        Listo para recibir lecturas
                      </Typography>
                      <Typography sx={{ fontSize: 11.5, color: '#4ADE80' }}>
                        El cursor está activo — escanea con tu lector o escribe el código
                      </Typography>
                    </Box>
                    {/* Iconos de tipos compatibles */}
                    <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
                      <Tooltip title="Escáner USB HID compatible">
                        <Usb sx={{ fontSize: 16, color: '#4ADE80' }} />
                      </Tooltip>
                      <Tooltip title="Escáner Bluetooth HID compatible">
                        <Bluetooth sx={{ fontSize: 16, color: '#4ADE80' }} />
                      </Tooltip>
                    </Box>
                  </Box>

                  {/* Input de escaneo */}
                  <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #F1F5F9', bgcolor: '#FAFAFA' }}>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      <TextField
                        inputRef={scanInputRef}
                        value={scanCode}
                        onChange={e => { setScanCode(e.target.value); setScanError(''); setLastOk('') }}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); processCode(scanCode) } }}
                        placeholder="Apunta el lector aquí o escribe el código y presiona Enter..."
                        size="small" fullWidth disabled={scanLoading} autoComplete="off"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              {scanLoading
                                ? <CircularProgress size={16} sx={{ color: PURPLE }} />
                                : <QrCodeScanner sx={{ color: '#94A3B8', fontSize: 20 }} />}
                            </InputAdornment>
                          ),
                          sx: {
                            fontFamily: 'monospace', fontSize: 14, bgcolor: '#FFF',
                            '& fieldset': { borderColor: scanError ? '#EF4444' : lastOk ? PRIMARY : '#E2E8F0' },
                            '&:hover fieldset': { borderColor: scanError ? '#EF4444' : PURPLE },
                            '&.Mui-focused fieldset': { borderColor: PURPLE },
                          },
                        }}
                      />
                      <Button variant="contained" onClick={() => processCode(scanCode)}
                        disabled={!scanCode.trim() || scanLoading}
                        sx={{ minWidth: 90, fontWeight: 700, bgcolor: PURPLE, '&:hover': { bgcolor: '#7C3AED' } }}>
                        Agregar
                      </Button>
                    </Box>

                    {scanError && (
                      <Box sx={{ mt: 0.75, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#EF4444', flexShrink: 0 }} />
                        <Typography sx={{ fontSize: 12, color: '#DC2626', fontFamily: 'monospace' }}>{scanError}</Typography>
                      </Box>
                    )}
                    {lastOk && !scanError && (
                      <Box sx={{ mt: 0.75, display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <CheckCircle sx={{ fontSize: 14, color: PRIMARY }} />
                        <Typography sx={{ fontSize: 12, color: PRIMARY, fontFamily: 'monospace', fontWeight: 600 }}>{lastOk} — añadida</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              )}

              {/* ══════════════════════════════════════════════
                  MODO: Cámara
              ══════════════════════════════════════════════ */}
              {deviceMode === 'camera' && (
                <Box>
                  {/*
                    El <video> está SIEMPRE en el DOM cuando deviceMode === 'camera'.
                    startCamera() necesita videoRef.current no-null, pero el elemento
                    solo existiría cuando cameraRunning=true (demasiado tarde).
                    Solución: renderizar siempre, solo ocultar/mostrar el contenedor.
                  */}
                  <Box sx={{ position: 'relative', bgcolor: '#000',
                    borderBottom: cameraRunning ? '1px solid #1E293B' : 'none',
                    display: cameraRunning ? 'block' : 'none' }}>
                    <video ref={videoRef} playsInline muted autoPlay
                      style={{ width: '100%', maxHeight: 240, objectFit: 'cover', display: 'block' }} />

                    {/* Overlay — solo visible cuando cámara activa */}
                    {cameraRunning && (
                      <>
                        <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', pointerEvents: 'none' }}>
                          <Box sx={{ position: 'absolute', inset: 0, bgcolor: alpha(PRIMARY, flashDetect ? 0.28 : 0),
                            transition: 'background-color 0.08s ease' }} />
                          <Box sx={{ width: 200, height: 140, position: 'relative',
                            border: `2px solid ${flashDetect ? PRIMARY : 'rgba(255,255,255,0.5)'}`,
                            borderRadius: '6px', transition: 'border-color 0.08s, box-shadow 0.08s',
                            boxShadow: flashDetect ? `0 0 28px ${alpha(PRIMARY, 0.7)}` : 'none' }}>
                            <Box sx={{ position: 'absolute', left: 4, right: 4, height: 2,
                              background: `linear-gradient(90deg, transparent, ${PRIMARY}, transparent)`,
                              animation: 'scanline 1.6s ease-in-out infinite',
                              '@keyframes scanline': {
                                '0%': { top: '8%', opacity: 0 }, '10%': { opacity: 1 },
                                '90%': { opacity: 1 }, '100%': { top: '92%', opacity: 0 },
                              }}} />
                            {[
                              { top:-2,left:-2, borderTop:`3px solid ${PRIMARY}`,borderLeft:`3px solid ${PRIMARY}`,borderRadius:'4px 0 0 0' },
                              { top:-2,right:-2,borderTop:`3px solid ${PRIMARY}`,borderRight:`3px solid ${PRIMARY}`,borderRadius:'0 4px 0 0' },
                              { bottom:-2,left:-2,borderBottom:`3px solid ${PRIMARY}`,borderLeft:`3px solid ${PRIMARY}`,borderRadius:'0 0 0 4px' },
                              { bottom:-2,right:-2,borderBottom:`3px solid ${PRIMARY}`,borderRight:`3px solid ${PRIMARY}`,borderRadius:'0 0 4px 0' },
                            ].map((s,i) => <Box key={i} sx={{ position:'absolute',width:20,height:20,...s }} />)}
                          </Box>
                          <Typography sx={{ position:'absolute',bottom:8,left:0,right:0,textAlign:'center',
                            fontSize:11,color:'rgba(255,255,255,0.65)',textShadow:'0 1px 3px rgba(0,0,0,0.8)' }}>
                            Apunta la cámara al código
                          </Typography>
                        </Box>

                        <Box sx={{ position:'absolute',top:8,right:8,display:'flex',gap:0.75 }}>
                          {cameras.length > 1 && (
                            <Tooltip title="Cambiar cámara">
                              <IconButton size="small" onClick={switchCamera}
                                sx={{ bgcolor:'rgba(0,0,0,0.55)',color:'#FFF','&:hover':{bgcolor:'rgba(0,0,0,0.8)'} }}>
                                <SwitchCamera fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Detener y volver a selección">
                            <IconButton size="small" onClick={stopCamera}
                              sx={{ bgcolor:'rgba(0,0,0,0.55)',color:'#EF4444','&:hover':{bgcolor:'rgba(0,0,0,0.8)'} }}>
                              <VideocamOff fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                        <Box sx={{ position:'absolute',top:8,left:8,bgcolor:'rgba(0,0,0,0.55)',
                          borderRadius:999,px:1.25,py:0.4,display:'flex',alignItems:'center',gap:0.6 }}>
                          <Box sx={{ width:6,height:6,borderRadius:'50%',bgcolor:'#EF4444',
                            animation:'blink 1.2s ease-in-out infinite',
                            '@keyframes blink':{'0%,100%':{opacity:1},'50%':{opacity:0.2}} }} />
                          <Typography sx={{ fontSize:10.5,color:'#FFF',fontWeight:600 }}>EN VIVO</Typography>
                        </Box>

                        {/* Notificación: último código leído — overlay en la base del video */}
                        {(lastOk || scanError) && (
                          <Box sx={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            px: 2, py: 0.75,
                            bgcolor: scanError ? 'rgba(185,28,28,0.88)' : 'rgba(20,83,45,0.88)',
                            backdropFilter: 'blur(4px)',
                            display: 'flex', alignItems: 'center', gap: 0.75,
                          }}>
                            {scanError
                              ? <Box sx={{ width:6,height:6,borderRadius:'50%',bgcolor:'#FCA5A5',flexShrink:0 }} />
                              : <CheckCircle sx={{ fontSize:14,color:'#86EFAC' }} />
                            }
                            <Typography sx={{ fontSize:11.5,color:'#FFF',fontFamily:'monospace',fontWeight:600,
                              overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1 }}>
                              {scanError || `${lastOk} — añadida`}
                            </Typography>
                          </Box>
                        )}
                      </>
                    )}
                  </Box>

                  {/* ─── Selección de cámara (solo visible cuando NO corre) ─── */}
                  {!cameraRunning && (
                    <Box sx={{ borderBottom: '1px solid #F1F5F9' }}>

                      {cameraError && (
                        <Alert severity="error" sx={{ mx: 2, mt: 2, borderRadius: 1.5 }}
                          action={<Button size="small" onClick={enumerateCameras} disabled={detectingCameras}>Reintentar</Button>}>
                          {cameraError}
                        </Alert>
                      )}

                      {cameras.length === 0 && (
                        <Box sx={{ display:'flex',flexDirection:'column',alignItems:'center',
                          justifyContent:'center',py:3.5,px:3,bgcolor:'#0D1117',gap:2 }}>
                          {detectingCameras ? (
                            <>
                              <CircularProgress size={36} sx={{ color: CYAN }} />
                              <Typography sx={{ fontSize:13,color:'#94A3B8' }}>Detectando cámaras...</Typography>
                            </>
                          ) : (
                            <>
                              <Videocam sx={{ fontSize:40,color:'#334155' }} />
                              <Typography sx={{ fontSize:13,color:'#94A3B8',textAlign:'center' }}>
                                Detecta las cámaras disponibles en este dispositivo
                              </Typography>
                              <Button variant="contained" startIcon={<Refresh />} onClick={enumerateCameras}
                                sx={{ bgcolor:CYAN,'&:hover':{bgcolor:'#0891B2'},fontWeight:700 }}>
                                Detectar cámaras
                              </Button>
                            </>
                          )}
                        </Box>
                      )}

                      {cameras.length > 0 && (
                        <>
                          <Box sx={{ px:3,py:1.25,bgcolor:'#F8FAFC',borderBottom:'1px solid #F1F5F9',
                            display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                            <Typography sx={{ fontSize:11,fontWeight:700,color:'#475569',
                              textTransform:'uppercase',letterSpacing:'0.06em' }}>
                              Cámaras disponibles
                              <Box component="span" sx={{ ml:1,bgcolor:'#E2E8F0',color:'#64748B',
                                px:0.75,py:0.15,borderRadius:1,fontSize:10.5 }}>
                                {cameras.length}
                              </Box>
                            </Typography>
                            <Tooltip title="Volver a detectar">
                              <IconButton size="small" onClick={enumerateCameras} disabled={detectingCameras}
                                sx={{ color:'#94A3B8' }}>
                                <Refresh fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>

                          {cameras.map((cam, idx) => {
                            const isSelected = selectedCameraId === cam.deviceId
                            const isExternal = /usb|external|logitech|trust|genius|razer|elgato|droidcam|ivcam|epoc/i.test(cam.label)
                            const isBack     = /back|rear|environment|trasera/i.test(cam.label)
                            const label = cam.label || `Cámara ${idx + 1}`
                            return (
                              <Box key={cam.deviceId} onClick={() => setSelectedCameraId(cam.deviceId)}
                                sx={{
                                  px:3,py:1.5,cursor:'pointer',borderBottom:'1px solid #F1F5F9',
                                  bgcolor: isSelected ? alpha(CYAN,0.05) : '#FFF',
                                  borderLeft: isSelected ? `3px solid ${CYAN}` : '3px solid transparent',
                                  display:'flex',alignItems:'center',gap:2,transition:'all 0.15s ease',
                                  '&:hover':{ bgcolor: alpha(CYAN,0.03) },
                                }}>
                                <Box sx={{ width:40,height:40,borderRadius:'10px',flexShrink:0,
                                  bgcolor: isSelected ? alpha(CYAN,0.12) : '#F1F5F9',
                                  border:`1px solid ${isSelected ? alpha(CYAN,0.3) : '#E2E8F0'}`,
                                  display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s ease' }}>
                                  <Videocam sx={{ fontSize:20,color: isSelected ? CYAN : '#94A3B8' }} />
                                </Box>
                                <Box sx={{ flex:1,minWidth:0 }}>
                                  <Typography sx={{ fontSize:13.5,fontWeight:700,color:'#0D1117',
                                    overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                                    {label}
                                  </Typography>
                                  <Box sx={{ display:'flex',gap:0.75,mt:0.4,flexWrap:'wrap' }}>
                                    {isExternal && <Chip label="Externa / USB" size="small"
                                      sx={{ height:18,fontSize:10,bgcolor:alpha(PURPLE,0.1),color:PURPLE,
                                        border:`1px solid ${alpha(PURPLE,0.25)}` }} />}
                                    {isBack && <Chip label="Trasera" size="small"
                                      sx={{ height:18,fontSize:10,bgcolor:alpha(PRIMARY,0.1),color:PRIMARY,
                                        border:`1px solid ${alpha(PRIMARY,0.25)}` }} />}
                                    {!isExternal && !isBack && (
                                      <Typography sx={{ fontSize:11,color:'#94A3B8' }}>Integrada</Typography>
                                    )}
                                  </Box>
                                </Box>
                                {isSelected
                                  ? <CheckCircle sx={{ color:CYAN,fontSize:20,flexShrink:0 }} />
                                  : <Box sx={{ width:20,height:20,borderRadius:'50%',border:'2px solid #E2E8F0',flexShrink:0 }} />}
                              </Box>
                            )
                          })}

                          <Box sx={{ px:3,py:2,bgcolor:'#F8FAFC' }}>
                            <Button variant="contained" fullWidth startIcon={<Videocam />}
                              onClick={() => startCamera(selectedCameraId || undefined)}
                              disabled={!selectedCameraId}
                              sx={{ bgcolor:CYAN,'&:hover':{bgcolor:'#0891B2'},fontWeight:700,py:1.25,fontSize:13.5 }}>
                              Iniciar{' '}
                              {cameras.find(c => c.deviceId === selectedCameraId)?.label
                                ? `— ${cameras.find(c => c.deviceId === selectedCameraId)!.label.substring(0, 36)}`
                                : 'cámara seleccionada'}
                            </Button>
                          </Box>
                        </>
                      )}
                    </Box>
                  )}

                </Box>
              )}

              {/* ══════════════════════════════════════════════
                  MODO: Celular / QR
              ══════════════════════════════════════════════ */}
              {deviceMode === 'mobile' && (
                <Box sx={{ borderBottom: '1px solid #F1F5F9' }}>

                  {/* Toggle WiFi / USB */}
                  <Box sx={{ px: 3, pt: 1.75, pb: 1.5, bgcolor: '#FAFAFA',
                    borderBottom: '1px solid #F1F5F9', display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: '#94A3B8',
                      textTransform: 'uppercase', letterSpacing: '0.06em', mr: 1 }}>
                      Tipo de conexión:
                    </Typography>
                    {(['wifi', 'usb'] as const).map(sub => (
                      <Button key={sub} size="small"
                        onClick={() => {
                          setMobileSubMode(sub)
                          if (!sessionId) startMobileSession(sub)
                        }}
                        variant={mobileSubMode === sub ? 'contained' : 'outlined'}
                        startIcon={sub === 'wifi'
                          ? <WifiTethering sx={{ fontSize: 15 }} />
                          : <Usb sx={{ fontSize: 15 }} />}
                        sx={{
                          fontSize: 12, fontWeight: 700, py: 0.5, px: 1.5, borderRadius: 1.5,
                          textTransform: 'none',
                          ...(mobileSubMode === sub
                            ? { bgcolor: '#F59E0B', color: '#FFF', '&:hover': { bgcolor: '#D97706' }, border: 'none' }
                            : { borderColor: '#E2E8F0', color: '#64748B' }),
                        }}>
                        {sub === 'wifi' ? 'Wi-Fi (red local)' : 'USB / Cable'}
                      </Button>
                    ))}
                    {sessionId && (
                      <Tooltip title="Crear nueva sesión">
                        <IconButton size="small" onClick={() => startMobileSession()} disabled={creatingSession}
                          sx={{ ml: 'auto', color: '#94A3B8' }}>
                          <Refresh fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>

                  {/* Estado de conexión */}
                  <Box sx={{
                    px: 3, py: 1.25, display: 'flex', alignItems: 'center', gap: 1.5,
                    bgcolor: mobileActive ? '#F0FDF4' : alpha('#F59E0B', 0.04),
                    borderBottom: `1px solid ${mobileActive ? '#DCFCE7' : alpha('#F59E0B', 0.15)}`,
                  }}>
                    <Box sx={{
                      width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                      bgcolor: mobileActive ? PRIMARY : '#F59E0B',
                      animation: 'blinkDot 1.8s ease-in-out infinite',
                      '@keyframes blinkDot': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.2 } },
                    }} />
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700,
                      color: mobileActive ? '#166534' : '#92400E', flex: 1 }}>
                      {mobileActive
                        ? 'Celular conectado — códigos llegando en tiempo real'
                        : mobileSubMode === 'wifi'
                        ? 'Esperando que el celular escanee el QR...'
                        : 'Esperando que el celular escanee el QR vía cable USB...'}
                    </Typography>
                  </Box>

                  {/* Cuerpo: QR + instrucciones */}
                  <Box sx={{ display: 'flex', gap: 0, px: 3, py: 2, alignItems: 'flex-start' }}>

                    {/* QR Code */}
                    <Box sx={{ flexShrink: 0, mr: 2.5 }}>
                      {creatingSession ? (
                        <Box sx={{ width: 126, height: 126, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', bgcolor: '#F8FAFC', borderRadius: 2,
                          border: '1px solid #E2E8F0' }}>
                          <CircularProgress size={26} sx={{ color: '#F59E0B' }} />
                        </Box>
                      ) : qrDataUrl ? (
                        <Box sx={{ position: 'relative' }}>
                          <img src={qrDataUrl} alt="QR Escáner" width={126} height={126}
                            style={{ borderRadius: 8, display: 'block',
                              border: `2px solid ${mobileActive ? PRIMARY : '#F59E0B'}`,
                              transition: 'border-color 0.3s' }} />
                          {mobileActive && (
                            <Box sx={{ position: 'absolute', inset: 0, display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              bgcolor: alpha(PRIMARY, 0.12), borderRadius: '6px' }}>
                              <CheckCircle sx={{ color: PRIMARY, fontSize: 34 }} />
                            </Box>
                          )}
                        </Box>
                      ) : (
                        <Box sx={{ width: 126, height: 126, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', bgcolor: '#F8FAFC', borderRadius: 2,
                          border: '1px dashed #CBD5E1' }}>
                          <QrCode2 sx={{ fontSize: 38, color: '#CBD5E1' }} />
                        </Box>
                      )}
                    </Box>

                    {/* Instrucciones según sub-modo */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>

                      {/* ── WiFi ── */}
                      {mobileSubMode === 'wifi' && (
                        <>
                          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#0D1117', mb: 1.25 }}>
                            Conexión por Wi-Fi — misma red
                          </Typography>
                          {[
                            'Celular y PC en la misma red Wi-Fi',
                            'Abre la cámara del celular y escanea el QR',
                            'Presiona "Iniciar cámara" en el celular',
                            'Los códigos aparecerán aquí automáticamente',
                          ].map((t, i) => (
                            <Box key={i} sx={{ display: 'flex', gap: 1, mb: 0.6, alignItems: 'flex-start' }}>
                              <Box sx={{ width: 17, height: 17, borderRadius: '50%', flexShrink: 0,
                                bgcolor: '#E2E8F0', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: 9.5, fontWeight: 800, color: '#475569', mt: 0.15 }}>
                                {i + 1}
                              </Box>
                              <Typography sx={{ fontSize: 11.5, color: '#64748B', lineHeight: 1.4 }}>{t}</Typography>
                            </Box>
                          ))}

                          {/* IP editable */}
                          <Box sx={{ mt: 1.5 }}>
                            <Typography sx={{ fontSize: 10.5, color: '#94A3B8', mb: 0.5 }}>
                              IP del computador (editable si WebRTC no la detectó correctamente):
                            </Typography>
                            <TextField
                              value={localIP}
                              onChange={e => handleIPChange(e.target.value)}
                              placeholder="Ej: 192.168.1.100"
                              size="small" fullWidth
                              InputProps={{
                                sx: { fontFamily: 'monospace', fontSize: 13, bgcolor: '#FFF' },
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <WifiTethering sx={{ fontSize: 16, color: localIP ? '#F59E0B' : '#94A3B8' }} />
                                  </InputAdornment>
                                ),
                              }}
                            />
                          </Box>
                        </>
                      )}

                      {/* ── USB / Anclaje de red ── */}
                      {mobileSubMode === 'usb' && (
                        <>
                          <Typography sx={{ fontSize: 12, fontWeight: 700, color: '#0D1117', mb: 1.25 }}>
                            Cable USB + Anclaje de red (sin instalar nada)
                          </Typography>
                          {[
                            'Conecta el celular al PC con el cable USB',
                            'En el celular: Configuración → Conexiones → Punto de acceso → Anclaje de red USB (activar)',
                            'El celular crea una red directa con el PC automáticamente',
                            'Escanea el QR — el celular accede al PC por el cable',
                          ].map((t, i) => (
                            <Box key={i} sx={{ display: 'flex', gap: 1, mb: 0.6, alignItems: 'flex-start' }}>
                              <Box sx={{ width: 17, height: 17, borderRadius: '50%', flexShrink: 0,
                                bgcolor: '#E2E8F0', display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: 9.5, fontWeight: 800, color: '#475569', mt: 0.15 }}>
                                {i + 1}
                              </Box>
                              <Typography sx={{ fontSize: 11.5, color: '#64748B', lineHeight: 1.4 }}>{t}</Typography>
                            </Box>
                          ))}

                          {/* IP editable */}
                          <Box sx={{ mt: 1.5 }}>
                            <Typography sx={{ fontSize: 10.5, color: '#94A3B8', mb: 0.5 }}>
                              IP del computador — se detecta automáticamente (edítala si el QR no carga):
                            </Typography>
                            <TextField
                              value={localIP}
                              onChange={e => handleIPChange(e.target.value)}
                              placeholder="Ej: 192.168.42.xx — busca con ipconfig"
                              size="small" fullWidth
                              InputProps={{
                                sx: { fontFamily: 'monospace', fontSize: 13, bgcolor: '#FFF' },
                                startAdornment: (
                                  <InputAdornment position="start">
                                    <Usb sx={{ fontSize: 16, color: localIP ? '#F59E0B' : '#94A3B8' }} />
                                  </InputAdornment>
                                ),
                              }}
                            />
                          </Box>

                          {!localIP && (
                            <Box sx={{ mt: 1, p: 1, bgcolor: alpha('#F59E0B', 0.06), borderRadius: 1,
                              border: `1px solid ${alpha('#F59E0B', 0.2)}` }}>
                              <Typography sx={{ fontSize: 11, color: '#92400E' }}>
                                No se detectó IP. Activa el anclaje USB en el celular, luego haz clic en <strong>↺</strong> para regenerar el QR. Si sigue sin aparecer, abre CMD en el PC, escribe <strong>ipconfig</strong> y busca el adaptador Ethernet del celular.
                              </Typography>
                            </Box>
                          )}
                        </>
                      )}
                    </Box>
                  </Box>
                </Box>
              )}

              {/* ── Lista de escaneados ── */}
              {scannedItems.length === 0 ? (
                <Box sx={{ px:3,py:4,textAlign:'center',flex:1 }}>
                  <DocumentScanner sx={{ fontSize:42,color:'#E2E8F0',mb:1 }} />
                  <Typography sx={{ fontSize:14,color:'#94A3B8',fontWeight:500 }}>
                    Aún no has escaneado ninguna estiba
                  </Typography>
                  <Typography sx={{ fontSize:12,color:'#CBD5E1',mt:0.5 }}>
                    {deviceMode === 'camera'
                      ? 'Selecciona una cámara e iníciala para comenzar'
                      : deviceMode === 'mobile'
                      ? 'Escanea el código QR con el celular para comenzar'
                      : 'El cursor está listo — apunta el lector o escribe y presiona Enter'}
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ flex:1,overflow:'hidden',display:'flex',flexDirection:'column' }}>
                  <Box sx={{ px:3,py:1.25,bgcolor:'#F8FAFC',borderBottom:'1px solid #F1F5F9',
                    display:'flex',alignItems:'center',justifyContent:'space-between' }}>
                    <Typography sx={{ fontSize:11,fontWeight:700,color:'#475569',
                      textTransform:'uppercase',letterSpacing:'0.06em' }}>
                      Estibas escaneadas
                    </Typography>
                    <Chip label={scannedItems.length} size="small"
                      sx={{ bgcolor:PURPLE,color:'#FFF',fontWeight:800,fontSize:12,height:22 }} />
                  </Box>
                  <Box sx={{ overflowY:'auto',maxHeight:220 }}>
                    <Table size="small">
                      <TableBody>
                        {scannedItems.map((item, idx) => (
                          <TableRow key={item.id} sx={{ '&:hover':{ bgcolor:'#F8FAFC' } }}>
                            <TableCell sx={{ width:40,color:'#94A3B8',fontSize:11,pl:2 }}>{idx+1}</TableCell>
                            <TableCell>
                              <Typography sx={{ fontFamily:'monospace',fontWeight:700,fontSize:13 }}>
                                {item.codigo_interno}
                              </Typography>
                            </TableCell>
                            <TableCell><StatusChip status={item.estado} /></TableCell>
                            <TableCell align="right" sx={{ pr:1.5 }}>
                              <Tooltip title="Quitar">
                                <IconButton size="small" onClick={() => removeScanned(item.id)}
                                  sx={{ color:'#94A3B8','&:hover':{color:'#EF4444'} }}>
                                  <DeleteOutline fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              PASO 1: Configuración
          ═══════════════════════════════════════════════════════════════ */}
          {masivoStep === 1 && (
            <Box sx={{ px:3,py:2.5 }}>
              <Box sx={{ display:'flex',alignItems:'center',gap:1.5,
                bgcolor:alpha(PURPLE,0.06),border:`1px solid ${alpha(PURPLE,0.2)}`,
                borderRadius:1.5,px:2,py:1.5,mb:2.5 }}>
                <CheckCircle sx={{ color:PRIMARY,fontSize:20,flexShrink:0 }} />
                <Box>
                  <Typography sx={{ fontSize:13.5,fontWeight:700 }}>
                    {scannedItems.length} estibas listas para mover
                  </Typography>
                  <Typography sx={{ fontSize:11.5,color:'#64748B',fontFamily:'monospace',mt:0.25 }}>
                    {scannedItems.slice(0,5).map(i => i.codigo_interno).join(' · ')}
                    {scannedItems.length > 5 && ` · +${scannedItems.length - 5} más`}
                  </Typography>
                </Box>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Tipo de Movimiento *</InputLabel>
                    <Select value={masivoForm.tipo} label="Tipo de Movimiento *"
                      onChange={e => setMasivoForm(f => ({ ...f, tipo: e.target.value }))}>
                      {TIPOS_MOVIMIENTO.map(t => (
                        <MenuItem key={t} value={t}>
                          <Box sx={{ display:'flex',alignItems:'center',gap:1 }}>
                            <Box sx={{ width:8,height:8,borderRadius:'50%',bgcolor:TIPO_COLORS[t] || '#64748B' }} />
                            {t.replace(/_/g,' ')}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* ── Manifiesto ── */}
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Manifiesto (opcional)</InputLabel>
                    <Select
                      value={masivoForm.manifiesto_id}
                      label="Manifiesto (opcional)"
                      onChange={e => handleManifiestoMasivo(e.target.value)}
                      renderValue={(v: any) => {
                        if (!v) return 'Sin manifiesto'
                        const m = (manifiestos as any[]).find(x => String(x.id) === v)
                        return m ? `${m.numero} · ${m.estado}` : String(v)
                      }}
                    >
                      <MenuItem value="">Sin manifiesto</MenuItem>
                      {(manifiestos as any[]).map((m: any) => (
                        <MenuItem key={m.id} value={String(m.id)}>
                          {m.numero} · {m.estado}{m.cliente_nombre ? ` · ${m.cliente_nombre}` : ''}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                {/* Info card manifiesto seleccionado */}
                {manifiestoMasivoSel && (
                  <Grid item xs={12}>
                    <Box sx={{ px:1.75,py:1.25,bgcolor:alpha(PURPLE,0.06),border:`1px solid ${alpha(PURPLE,0.2)}`,borderRadius:1.5 }}>
                      <Box sx={{ display:'flex',alignItems:'center',gap:1,mb:0.5 }}>
                        <Chip
                          label={manifiestoMasivoSel.estado}
                          size="small"
                          sx={{ height:20,fontSize:10,fontWeight:700,bgcolor:alpha(ESTADO_MAN_COLOR[manifiestoMasivoSel.estado]??'#64748B',0.15),color:ESTADO_MAN_COLOR[manifiestoMasivoSel.estado]??'#64748B' }}
                        />
                        <Typography sx={{ fontSize:12.5,fontWeight:700,color:PURPLE }}>{manifiestoMasivoSel.numero}</Typography>
                        {manifiestoMasivoSel.cliente_nombre && (
                          <Typography sx={{ fontSize:12,color:'#64748B' }}>· {manifiestoMasivoSel.cliente_nombre}</Typography>
                        )}
                      </Box>
                      <Typography sx={{ fontSize:11.5,color:'#475569' }}>
                        {masivoForm.tipo === 'CARGA'
                          ? 'Las estibas quedarán EN TRÁNSITO vinculadas a este manifiesto. La bodega origen se toma del manifiesto.'
                          : masivoForm.tipo === 'DESCARGA'
                          ? 'Las estibas quedarán EN CLIENTE. Si no seleccionas bodega destino abajo, se usa la del manifiesto.'
                          : 'Los movimientos quedarán vinculados a este manifiesto.'}
                      </Typography>
                    </Box>
                  </Grid>
                )}

                {/* Bodega destino: vehículo para CARGA+manifiesto, bodega para el resto */}
                {masivoForm.tipo === 'CARGA' && manifiestoMasivoSel ? (
                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display:'flex', alignItems:'center', gap:1.25, px:1.5, py:1.25,
                      bgcolor:'rgba(59,130,246,0.04)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:1.5, height:'100%' }}>
                      <Box sx={{ fontSize:18, lineHeight:1 }}>🚛</Box>
                      <Box>
                        <Typography sx={{ fontSize:12, fontWeight:700, color:'#1E40AF', lineHeight:1.2 }}>
                          Ubicación: vehículo en tránsito
                        </Typography>
                        <Typography sx={{ fontSize:11, color:'#64748B', mt:0.25 }}>
                          Sin bodega hasta la descarga en destino
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                ) : (
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>
                        {masivoForm.tipo === 'DESCARGA' && manifiestoMasivoSel ? 'Bodega de llegada' : 'Bodega Destino'}
                      </InputLabel>
                      <Select
                        value={masivoForm.ubicacion_destino_id}
                        label={masivoForm.tipo === 'DESCARGA' && manifiestoMasivoSel ? 'Bodega de llegada' : 'Bodega Destino'}
                        onChange={(e: any) => setMasivoForm((f: any) => ({ ...f, ubicacion_destino_id: e.target.value }))}
                      >
                        <MenuItem value="">
                          {masivoForm.tipo === 'DESCARGA' && manifiestoMasivoSel
                            ? 'Usar bodega destino del manifiesto'
                            : 'Sin ubicación específica'}
                        </MenuItem>
                        {(ubicaciones || []).map((u: any) => (
                          <MenuItem key={u.id} value={u.id}>{u.nombre} {u.codigo ? `(${u.codigo})` : ''}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                <Grid item xs={12} sm={6}>
                  <TextField fullWidth label="Observaciones" size="small" multiline rows={2}
                    value={masivoForm.observaciones}
                    onChange={e => setMasivoForm(f => ({ ...f, observaciones: e.target.value }))}
                    placeholder="Opcional — aplica a todos los movimientos del lote" />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>

        {/* Footer */}
        <Box sx={{ px:3,py:2,borderTop:'1px solid #F1F5F9',
          display:'flex',justifyContent:'space-between',alignItems:'center' }}>
          <Button startIcon={masivoStep === 1 ? <ArrowBack /> : undefined}
            onClick={() => masivoStep === 0 ? resetMasivo() : setMasivoStep(0)}
            disabled={masivoMutation.isPending} sx={{ color:'#64748B' }}>
            {masivoStep === 0 ? 'Cancelar' : 'Volver al escaneo'}
          </Button>
          {masivoStep === 0 ? (
            <Button variant="contained" endIcon={<ArrowForward />}
              disabled={scannedItems.length === 0}
              onClick={() => { stopCamera(); setMasivoStep(1) }}
              sx={{ bgcolor:PURPLE,fontWeight:700,'&:hover':{bgcolor:'#7C3AED'} }}>
              Continuar ({scannedItems.length})
            </Button>
          ) : (
            <Button variant="contained" endIcon={<SwapHoriz />}
              onClick={handleSubmitMasivo} disabled={masivoMutation.isPending}
              sx={{ bgcolor:PRIMARY,fontWeight:700,px:3,'&:hover':{bgcolor:'#27884A'} }}>
              {masivoMutation.isPending ? 'Registrando...' : `Registrar ${scannedItems.length} movimientos`}
            </Button>
          )}
        </Box>
      </Dialog>
    </Layout>
  )
}
