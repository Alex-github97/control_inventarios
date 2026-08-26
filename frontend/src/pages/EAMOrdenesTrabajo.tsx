/**
 * CMMS · Órdenes de trabajo
 *
 * Antes el módulo entero vivía en memoria: los activos, los técnicos, los
 * centros de costo y las OTs mismas estaban escritos en este archivo, así que
 * una OT creada aquí no tenía nada que ver con los activos dados de alta.
 *
 * Ahora todo sale de la API: las OTs de /eam/ots y los activos de /eam/activos.
 * El número de la OT lo asigna el servidor y los costos se calculan desde las
 * líneas de trabajos y repuestos — no se escriben a mano.
 */
import React, { useMemo, useState } from 'react'
import {
  Box, Typography, Card, CardContent, Chip, Button, Tab, Tabs, TextField,
  MenuItem, Table, TableBody, TableCell, TableHead, TableRow, Paper, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Tooltip, Alert,
  LinearProgress, Divider, Switch, FormControlLabel, InputAdornment, Stack,
  Autocomplete, createFilterOptions,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Handyman, Add, Edit, DeleteForever, Close, Search, FilterAltOff,
  Build, Inventory2, WarningAmber,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient as api } from '@/api/client'
import { SelectorCatalogo } from '@/components/catalogo/SelectorCatalogo'

const EAM_COLOR = '#32AC5C'
const EAM_DARK = '#27884A'

type OTEstado = 'PENDIENTE' | 'ASIGNADA' | 'EN_EJECUCION' | 'EN_ESPERA_REPUESTOS' | 'COMPLETADA'
type OTPrioridad = 'URGENTE' | 'ALTA' | 'MEDIA' | 'BAJA'
type OTTipo = 'PREVENTIVA' | 'CORRECTIVA' | 'PREDICTIVA' | 'EMERGENCIA'

/** Línea de eam_ot_mano_obra. `contratista_id` en null = taller interno. */
interface TrabajoLinea {
  id?: number
  actividad: string
  tecnico?: string | null
  contratista_id?: number | null
  tipo_trabajo_id?: number | null
  sistema?: string | null
  subsistema?: string | null
  horas?: number | null
  tarifa_hora?: number | null
  costo_total: number
  observaciones?: string | null
}

/** Línea de eam_ot_material. `contratista_id` en null = taller interno. */
interface RepuestoLinea {
  id?: number
  repuesto_id?: number | null
  contratista_id?: number | null
  descripcion: string
  cantidad: number
  unidad?: string | null
  costo_unit: number
  costo_total: number
}

interface OT {
  id: number
  numero: string
  activo_id: number
  tipo_ot?: string | null
  tipo_trabajo_id?: number | null
  /** Rutina programada que esta OT viene a cumplir. */
  plan_id?: number | null
  estado?: string | null
  prioridad?: string | null
  descripcion: string
  falla_id?: number | null
  causa_id?: number | null
  solucion_id?: number | null
  contratista_id?: number | null
  tecnico_asignado?: string | null
  fecha_requerida?: string | null
  fecha_inicio?: string | null
  fecha_fin?: string | null
  fecha_posible_cierre?: string | null
  odometro?: number | null
  horometro?: number | null
  observaciones?: string | null
  centro_costo?: string | null
  ciudad?: string | null
  afecta_disponibilidad?: boolean
  es_falla?: boolean
  costo_mano_obra: number
  costo_repuestos: number
  costo_servicios: number
  costo_total: number
  trabajos: TrabajoLinea[]
  repuestos: RepuestoLinea[]
}

interface Activo {
  id: number
  codigo?: string | null
  nombre?: string | null
  tipo_activo?: string | null
  placa?: string | null
  centro_costo?: string | null
  ubicacion?: string | null
  sede?: string | null
  odometro_actual?: number | null
  horometro_actual?: number | null
}
interface CatalogoItem {
  id: number
  nombre?: string | null
  descripcion?: string | null
  categoria?: string | null
}
interface Contratista { id: number; nombre: string; ciudad?: string | null }

/**
 * Cumplimiento de una rutina en un activo, ya calculado por el servidor.
 *
 * Una rutina cubre a varios activos por jerarquía (tipo → marca → línea), así
 * que lo que interesa acá es la fila del activo elegido, no el plan suelto.
 */
interface CumplimientoRutina {
  plan_id: number
  plan_nombre: string
  frecuencia?: number | null
  unidad?: string | null
  tipo_ot?: string | null
  activo_id: number
  ultima_ejecucion_fecha?: string | null
  ultima_ejecucion_odometro?: number | null
  proximo_odometro?: number | null
  proximo_horometro?: number | null
  proxima_fecha?: string | null
  odometro_activo?: number | null
  faltante?: number | null
  unidad_faltante?: string | null
  estado_rutina: 'SIN_EJECUTAR' | 'AL_DIA' | 'PROXIMA' | 'VENCIDA'
}

const RUTINA_COLOR: Record<string, string> = {
  VENCIDA: '#DC2626', PROXIMA: '#F59E0B', AL_DIA: '#16A34A', SIN_EJECUTAR: '#6B7280',
}
const RUTINA_LABEL: Record<string, string> = {
  VENCIDA: 'Vencida', PROXIMA: 'Próxima', AL_DIA: 'Al día', SIN_EJECUTAR: 'Sin ejecutar',
}

/** "faltan 1.200 KM" / "vencida por 300 KM". */
const textoFaltante = (p: CumplimientoRutina): string => {
  if (p.faltante == null || !p.unidad_faltante) return 'nunca se ha ejecutado'
  const u = p.unidad_faltante === 'DIAS' ? 'días' : p.unidad_faltante.toLowerCase()
  return p.faltante < 0
    ? `vencida por ${Math.abs(p.faltante).toLocaleString('es-CO')} ${u}`
    : `faltan ${p.faltante.toLocaleString('es-CO')} ${u}`
}

/** Fila de eam_repuesto: al elegirla se copian precio y unidad a la línea. */
interface RepuestoCatalogo {
  id: number
  codigo: string
  nombre: string
  categoria?: string | null
  unidad_medida?: string | null
  costo_unitario?: number | null
}

const PRIORIDADES: OTPrioridad[] = ['URGENTE', 'ALTA', 'MEDIA', 'BAJA']
const TIPOS_OT: OTTipo[] = ['PREVENTIVA', 'CORRECTIVA', 'PREDICTIVA', 'EMERGENCIA']

const PRIORIDAD_COLOR: Record<string, string> = {
  URGENTE: '#DC2626', ALTA: EAM_COLOR, MEDIA: '#F59E0B', BAJA: '#6B7280',
}
const TIPO_COLOR: Record<string, string> = {
  PREVENTIVA: '#16A34A', CORRECTIVA: '#DC2626', PREDICTIVA: '#3B82F6', EMERGENCIA: '#7F1D1D',
}
const ESTADO_COLOR: Record<string, string> = {
  PENDIENTE: EAM_COLOR, ASIGNADA: '#3B82F6', EN_EJECUCION: '#16A34A',
  EN_ESPERA_REPUESTOS: '#F59E0B', COMPLETADA: '#6B7280',
}
const KANBAN_COLUMNS: { estado: OTEstado; label: string; color: string }[] = [
  { estado: 'PENDIENTE', label: 'PENDIENTE', color: EAM_COLOR },
  { estado: 'ASIGNADA', label: 'ASIGNADA', color: '#3B82F6' },
  { estado: 'EN_EJECUCION', label: 'EN EJECUCIÓN', color: '#16A34A' },
  { estado: 'EN_ESPERA_REPUESTOS', label: 'ESP. REPUESTOS', color: '#F59E0B' },
  { estado: 'COMPLETADA', label: 'COMPLETADA', color: '#6B7280' },
]

const pesos = (n: number) => `$${Math.round(n || 0).toLocaleString('es-CO')}`
const soloFecha = (v?: string | null) => (v ? v.slice(0, 10) : '—')

/** Los inputs datetime-local quieren "YYYY-MM-DDTHH:mm" sin zona. */
const aLocal = (v?: string | null) => (v ? v.slice(0, 16) : '')
const deLocal = (v: string) => (v ? `${v}:00`.slice(0, 19) : null)
const deFecha = (v: string) => (v ? `${v}T00:00:00` : null)

const diasDesde = (v?: string | null) => {
  if (!v) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(v).getTime()) / 86_400_000))
}

/** En los selectores el taller interno es la opción vacía. */
const idProveedor = (v: string): number | null => (v ? Number(v) : null)

const nuevoFormulario = () => ({
  activo_id: '', tipo_ot: 'PREVENTIVA', prioridad: 'MEDIA', estado: 'PENDIENTE',
  descripcion: '', tecnico_asignado: '', contratista_id: '', tipo_trabajo_id: '', plan_id: '',
  falla_id: '', causa_id: '', solucion_id: '',
  fecha_requerida: '', fecha_inicio: '', fecha_fin: '', fecha_posible_cierre: '',
  centro_costo: '', ciudad: '', odometro: '', horometro: '',
  costo_servicios: '', observaciones: '',
  afecta_disponibilidad: true, es_falla: false,
})
type Formulario = ReturnType<typeof nuevoFormulario>
type SetFormulario = React.Dispatch<React.SetStateAction<Formulario>>

const otAFormulario = (ot: OT): Formulario => ({
  activo_id: String(ot.activo_id),
  tipo_ot: ot.tipo_ot ?? 'PREVENTIVA',
  prioridad: ot.prioridad ?? 'MEDIA',
  estado: ot.estado ?? 'PENDIENTE',
  descripcion: ot.descripcion ?? '',
  tecnico_asignado: ot.tecnico_asignado ?? '',
  contratista_id: ot.contratista_id != null ? String(ot.contratista_id) : '',
  tipo_trabajo_id: ot.tipo_trabajo_id != null ? String(ot.tipo_trabajo_id) : '',
  plan_id: ot.plan_id != null ? String(ot.plan_id) : '',
  falla_id: ot.falla_id != null ? String(ot.falla_id) : '',
  causa_id: ot.causa_id != null ? String(ot.causa_id) : '',
  solucion_id: ot.solucion_id != null ? String(ot.solucion_id) : '',
  fecha_requerida: ot.fecha_requerida ? ot.fecha_requerida.slice(0, 10) : '',
  fecha_inicio: aLocal(ot.fecha_inicio),
  fecha_fin: aLocal(ot.fecha_fin),
  fecha_posible_cierre: aLocal(ot.fecha_posible_cierre),
  centro_costo: ot.centro_costo ?? '',
  ciudad: ot.ciudad ?? '',
  odometro: ot.odometro != null ? String(ot.odometro) : '',
  horometro: ot.horometro != null ? String(ot.horometro) : '',
  costo_servicios: ot.costo_servicios ? String(ot.costo_servicios) : '',
  observaciones: ot.observaciones ?? '',
  afecta_disponibilidad: ot.afecta_disponibilidad ?? true,
  es_falla: ot.es_falla ?? false,
})

/** Lo que los formularios necesitan de la página. Se pasa como prop porque
 *  estos componentes viven a nivel de módulo — ver la nota en EditorLineas. */
interface ContextoOT {
  activos: Activo[]
  contratistas: Contratista[]
  tiposTrabajo: CatalogoItem[]
  fallas: CatalogoItem[]
  causas: CatalogoItem[]
  soluciones: CatalogoItem[]
  etiquetaActivo: (id: number) => string
  elegirActivo: (id: string, set: SetFormulario) => void
  /** Cumplimiento de cada rutina en cada activo cubierto. */
  cumplimientos: CumplimientoRutina[]
}

// ─── Tarjeta del Kanban ───────────────────────────────────────────────────────

function OTCard({ ot, etiquetaActivo, responsable, onOpen, onDragStart, onDragEnd, isDragging }: {
  ot: OT
  etiquetaActivo: string
  /** Técnico del taller propio, o el contratista que atiende la OT. */
  responsable: string
  onOpen: () => void
  onDragStart: () => void
  onDragEnd: () => void
  isDragging: boolean
}) {
  const pc = PRIORIDAD_COLOR[ot.prioridad ?? ''] ?? '#6B7280'
  return (
    <Card
      draggable onDragStart={onDragStart} onDragEnd={onDragEnd} onClick={onOpen}
      sx={{
        mb: 1, cursor: 'grab', borderLeft: `3px solid ${pc}`, borderRadius: 1.5,
        opacity: isDragging ? 0.4 : 1,
        '&:hover': { boxShadow: 3 }, transition: 'box-shadow .15s, opacity .15s',
      }}
    >
      <CardContent sx={{ p: '10px !important' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography sx={{ fontSize: 10, fontFamily: 'monospace', color: EAM_DARK, fontWeight: 700 }}>
            {ot.numero}
          </Typography>
          <Chip label={ot.prioridad} size="small" sx={{
            fontSize: 8, height: 16, fontWeight: 700, bgcolor: `${pc}22`, color: pc,
          }} />
        </Box>
        <Typography sx={{ fontSize: 12, fontWeight: 600, lineHeight: 1.3, mb: 0.5 }}>
          {etiquetaActivo}
        </Typography>
        <Typography sx={{
          fontSize: 11, color: 'text.secondary', mb: 0.75,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {ot.descripcion}
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Chip label={ot.tipo_ot} size="small" sx={{
            fontSize: 8, height: 16,
            bgcolor: `${TIPO_COLOR[ot.tipo_ot ?? ''] ?? '#6B7280'}18`,
            color: TIPO_COLOR[ot.tipo_ot ?? ''] ?? '#6B7280',
          }} />
          <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{pesos(ot.costo_total)}</Typography>
        </Box>
        <Typography sx={{ fontSize: 9.5, color: 'text.disabled', mt: 0.5 }}>
          {responsable} · req. {soloFecha(ot.fecha_requerida)}
        </Typography>
      </CardContent>
    </Card>
  )
}

// ─── Editor de líneas ─────────────────────────────────────────────────────────

/**
 * Va a nivel de módulo a propósito: definido dentro del componente de página,
 * React lo trataría como un tipo nuevo en cada render, desmontaría los campos y
 * el foco se perdería con cada tecla.
 */
/** Deja escribir para filtrar, y también texto libre para lo que no esté
 *  todavía en el catálogo. */
const filtrarOpciones = createFilterOptions<string>({ trim: true, limit: 50 })

function EditorLineas({
  ts, rs, setTs, setRs, servicios, tiposTrabajo, contratistas, proveedorPrincipal,
  actividades, repuestosCatalogo,
}: {
  ts: TrabajoLinea[]
  rs: RepuestoLinea[]
  setTs: React.Dispatch<React.SetStateAction<TrabajoLinea[]>>
  setRs: React.Dispatch<React.SetStateAction<RepuestoLinea[]>>
  servicios: number
  tiposTrabajo: CatalogoItem[]
  contratistas: Contratista[]
  /** '' = taller interno. Las líneas nuevas lo heredan. */
  proveedorPrincipal: string
  actividades: CatalogoItem[]
  repuestosCatalogo: RepuestoCatalogo[]
}) {
  const nombresActividad = actividades.map(a => a.nombre ?? '').filter(Boolean)
  const nombresRepuesto = repuestosCatalogo.map(r => r.nombre)
  const totalMO = ts.reduce(
    (s, t) => s + (t.horas && t.tarifa_hora ? t.horas * t.tarifa_hora : t.costo_total || 0), 0)
  const totalRep = rs.reduce((s, r) => s + (r.cantidad || 0) * (r.costo_unit || 0), 0)

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Build sx={{ fontSize: 16, color: EAM_COLOR }} />
        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Trabajos</Typography>
        <Button size="small" startIcon={<Add />}
          onClick={() => setTs(p => [...p, {
            actividad: '', costo_total: 0, contratista_id: idProveedor(proveedorPrincipal),
          }])}>
          Agregar
        </Button>
      </Box>
      {ts.length === 0 && (
        <Typography sx={{ fontSize: 12, color: 'text.disabled', mb: 1.5 }}>
          Sin trabajos registrados.
        </Typography>
      )}
      {ts.map((t, i) => {
        const interno = !t.contratista_id
        return (
          <Box key={t.id ?? `t-${i}`} sx={{
            mb: 1.5, p: 1.5, border: '1px solid #E5E7EB', borderRadius: 1.5,
            borderLeft: `3px solid ${interno ? EAM_COLOR : '#F59E0B'}`,
          }}>
            <Grid container spacing={1}>
              <Grid size={{ xs: 12, sm: 5 }}>
                {/* Sale del catálogo de actividades de la configuración; se
                    puede escribir para filtrar y también dejar texto libre. */}
                <Autocomplete
                  freeSolo options={nombresActividad} filterOptions={filtrarOpciones}
                  value={t.actividad}
                  onInputChange={(_e, v) => setTs(p => p.map((x, j) => j === i
                    ? { ...x, actividad: v ?? '' } : x))}
                  renderInput={params => (
                    <TextField {...params} label="Trabajo" size="small" fullWidth
                      helperText={nombresActividad.length === 0
                        ? 'Sin actividades. Agréguelas en CMMS · Configuración.' : undefined} />
                  )} />
              </Grid>
              <Grid size={{ xs: 6, sm: 4 }}>
                <TextField select label="Tipo de trabajo" size="small" fullWidth
                  value={t.tipo_trabajo_id != null ? String(t.tipo_trabajo_id) : ''}
                  onChange={e => setTs(p => p.map((x, j) => j === i
                    ? { ...x, tipo_trabajo_id: e.target.value ? Number(e.target.value) : null } : x))}>
                  <MenuItem value="">Sin especificar</MenuItem>
                  {tiposTrabajo.map(tt => <MenuItem key={tt.id} value={String(tt.id)}>{tt.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <TextField label="Sistema" size="small" fullWidth value={t.sistema ?? ''}
                  onChange={e => setTs(p => p.map((x, j) => j === i ? { ...x, sistema: e.target.value } : x))} />
              </Grid>

              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField select label="Ejecuta" size="small" fullWidth
                  value={t.contratista_id != null ? String(t.contratista_id) : ''}
                  onChange={e => {
                    const id = e.target.value ? Number(e.target.value) : null
                    // Si pasa a un contratista, el técnico propio deja de aplicar.
                    setTs(p => p.map((x, j) => j === i
                      ? { ...x, contratista_id: id, tecnico: id ? null : x.tecnico } : x))
                  }}>
                  <MenuItem value="">Taller interno</MenuItem>
                  {contratistas.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.nombre}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                {/* El técnico solo tiene sentido cuando lo hace el taller propio. */}
                <SelectorCatalogo modulo="EAM" tipo="TECNICO" label="Técnico"
                  valor={t.tecnico ?? ''} deshabilitado={!interno}
                  ayuda={interno ? undefined : 'Lo ejecuta un contratista'}
                  onChange={v => setTs(p => p.map((x, j) => j === i ? { ...x, tecnico: v } : x))} />
              </Grid>
              <Grid size={{ xs: 9, sm: 3 }}>
                <TextField label="Mano de obra" size="small" fullWidth type="number"
                  value={t.costo_total || ''}
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  onChange={e => setTs(p => p.map((x, j) => j === i
                    ? { ...x, costo_total: Number(e.target.value || 0) } : x))} />
              </Grid>
              <Grid size={{ xs: 3, sm: 1 }}>
                <IconButton size="small" onClick={() => setTs(p => p.filter((_, j) => j !== i))}>
                  <DeleteForever sx={{ fontSize: 16, color: '#DC2626' }} />
                </IconButton>
              </Grid>
            </Grid>
          </Box>
        )
      })}

      <Divider sx={{ my: 1.5 }} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Inventory2 sx={{ fontSize: 16, color: EAM_COLOR }} />
        <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Repuestos</Typography>
        <Button size="small" startIcon={<Add />}
          onClick={() => setRs(p => [...p, {
            descripcion: '', cantidad: 1, costo_unit: 0, costo_total: 0,
            contratista_id: idProveedor(proveedorPrincipal),
          }])}>
          Agregar
        </Button>
      </Box>
      {rs.length === 0 && (
        <Typography sx={{ fontSize: 12, color: 'text.disabled', mb: 1.5 }}>
          Sin repuestos registrados.
        </Typography>
      )}
      {rs.map((r, i) => (
        <Box key={r.id ?? `r-${i}`} sx={{
          mb: 1.5, p: 1.5, border: '1px solid #E5E7EB', borderRadius: 1.5,
          borderLeft: `3px solid ${r.contratista_id ? '#F59E0B' : EAM_COLOR}`,
        }}>
          <Grid container spacing={1}>
            <Grid size={{ xs: 12, sm: 4 }}>
              {/* Al elegir uno del catálogo se copian su id, su unidad y su
                  precio; si se escribe libre, la línea queda sin repuesto_id. */}
              <Autocomplete
                freeSolo options={nombresRepuesto} filterOptions={filtrarOpciones}
                value={r.descripcion}
                onInputChange={(_e, v) => {
                  const texto = v ?? ''
                  const cat = repuestosCatalogo.find(x => x.nombre === texto)
                  setRs(p => p.map((x, j) => j === i ? {
                    ...x,
                    descripcion: texto,
                    repuesto_id: cat?.id ?? null,
                    unidad: cat?.unidad_medida ?? x.unidad,
                    // El precio del catálogo solo se propone; si ya se escribió
                    // uno en la línea, se respeta.
                    costo_unit: cat && !x.costo_unit ? (cat.costo_unitario ?? 0) : x.costo_unit,
                  } : x))
                }}
                renderInput={params => (
                  <TextField {...params} label="Repuesto" size="small" fullWidth
                    helperText={nombresRepuesto.length === 0
                      ? 'Sin repuestos. Agréguelos en CMMS · Configuración.' : undefined} />
                )} />
            </Grid>
            <Grid size={{ xs: 12, sm: 3 }}>
              <TextField select label="Suministra" size="small" fullWidth
                value={r.contratista_id != null ? String(r.contratista_id) : ''}
                onChange={e => setRs(p => p.map((x, j) => j === i
                  ? { ...x, contratista_id: e.target.value ? Number(e.target.value) : null } : x))}>
                <MenuItem value="">Taller interno</MenuItem>
                {contratistas.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.nombre}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 4, sm: 2 }}>
              <TextField label="Cantidad" size="small" fullWidth type="number" value={r.cantidad}
                onChange={e => setRs(p => p.map((x, j) => j === i
                  ? { ...x, cantidad: Number(e.target.value || 0) } : x))} />
            </Grid>
            <Grid size={{ xs: 5, sm: 2 }}>
              <TextField label="Precio unitario" size="small" fullWidth type="number"
                value={r.costo_unit || ''}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                onChange={e => setRs(p => p.map((x, j) => j === i
                  ? { ...x, costo_unit: Number(e.target.value || 0) } : x))} />
            </Grid>
            <Grid size={{ xs: 2, sm: 0.5 }}>
              <Typography sx={{ fontSize: 12, pt: 1.2, fontWeight: 600 }}>
                {pesos((r.cantidad || 0) * (r.costo_unit || 0))}
              </Typography>
            </Grid>
            <Grid size={{ xs: 1, sm: 0.5 }}>
              <IconButton size="small" onClick={() => setRs(p => p.filter((_, j) => j !== i))}>
                <DeleteForever sx={{ fontSize: 16, color: '#DC2626' }} />
              </IconButton>
            </Grid>
          </Grid>
        </Box>
      ))}

      <Box sx={{ mt: 2, p: 1.5, bgcolor: `${EAM_COLOR}0F`, borderRadius: 1.5 }}>
        <Stack direction="row" justifyContent="space-between">
          <Typography sx={{ fontSize: 12 }}>Mano de obra</Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{pesos(totalMO)}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Typography sx={{ fontSize: 12 }}>Repuestos</Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{pesos(totalRep)}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Typography sx={{ fontSize: 12 }}>Servicios externos</Typography>
          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{pesos(servicios)}</Typography>
        </Stack>
        <Divider sx={{ my: 0.75 }} />
        <Stack direction="row" justifyContent="space-between">
          <Typography sx={{ fontSize: 13, fontWeight: 700 }}>Total</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 800, color: EAM_DARK }}>
            {pesos(totalMO + totalRep + servicios)}
          </Typography>
        </Stack>
        <Typography sx={{ fontSize: 10.5, color: 'text.secondary', mt: 0.5 }}>
          El servidor recalcula estos totales al guardar.
        </Typography>
      </Box>
    </Box>
  )
}

// ─── Campos de la OT ──────────────────────────────────────────────────────────

function CamposOT({ f, set, ctx }: { f: Formulario; set: SetFormulario; ctx: ContextoOT }) {
  const { activos, contratistas, tiposTrabajo, fallas, causas, soluciones,
    etiquetaActivo, elegirActivo, cumplimientos } = ctx
  // Las rutinas que le aplican al activo elegido, según el alcance del plan.
  const rutinas = f.activo_id
    ? cumplimientos.filter(c => String(c.activo_id) === f.activo_id)
    : []
  const rutina = rutinas.find(c => String(c.plan_id) === f.plan_id)
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <TextField select label="Activo *" size="small" fullWidth value={f.activo_id}
          onChange={e => elegirActivo(e.target.value, set)}
          helperText={activos.length === 0
            ? 'No hay activos dados de alta. Créelos en CMMS · Activos.' : undefined}>
          <MenuItem value=""><em>Seleccionar activo…</em></MenuItem>
          {activos.map(a => (
            <MenuItem key={a.id} value={String(a.id)}>{etiquetaActivo(a.id)}</MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <TextField select label="Tipo de OT" size="small" fullWidth value={f.tipo_ot}
          onChange={e => set(p => ({ ...p, tipo_ot: e.target.value }))}>
          {TIPOS_OT.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <TextField select label="Prioridad" size="small" fullWidth value={f.prioridad}
          onChange={e => set(p => ({ ...p, prioridad: e.target.value }))}>
          {PRIORIDADES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
        </TextField>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <TextField select label="Proveedor principal *" size="small" fullWidth
          value={f.contratista_id}
          onChange={e => {
            const v = e.target.value
            // Al entregarle la OT a un contratista, el técnico propio deja de
            // aplicar: el responsable pasa a ser el proveedor.
            set(p => ({ ...p, contratista_id: v, tecnico_asignado: v ? '' : p.tecnico_asignado }))
          }}
          helperText={contratistas.length === 0
            ? 'Sin contratistas cargados. Agréguelos en CMMS · Configuración.'
            : 'Quién responde por la OT'}>
          <MenuItem value="">Taller interno</MenuItem>
          {contratistas.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.nombre}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        {/* El técnico responsable solo existe cuando la atiende el taller propio. */}
        <SelectorCatalogo modulo="EAM" tipo="TECNICO" label="Técnico responsable"
          valor={f.tecnico_asignado} deshabilitado={Boolean(f.contratista_id)}
          ayuda={f.contratista_id
            ? 'La OT la atiende un contratista'
            : 'Los técnicos se dan de alta en CMMS · Configuración · Catálogos'}
          onChange={v => set(p => ({ ...p, tecnico_asignado: v }))} />
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <TextField select label="Tipo de trabajo" size="small" fullWidth value={f.tipo_trabajo_id}
          onChange={e => set(p => ({ ...p, tipo_trabajo_id: e.target.value }))}>
          <MenuItem value="">Sin especificar</MenuItem>
          {tiposTrabajo.map(t => <MenuItem key={t.id} value={String(t.id)}>{t.nombre}</MenuItem>)}
        </TextField>
      </Grid>

      {/* Al completar la OT, la rutina elegida sella su cumplimiento y el
          servidor recalcula el próximo vencimiento con esta lectura. */}
      <Grid size={{ xs: 12 }}>
        <TextField select label="Rutina de mantenimiento que cumple" size="small" fullWidth
          value={f.plan_id}
          onChange={e => set(p => ({ ...p, plan_id: e.target.value }))}
          disabled={!f.activo_id}
          helperText={!f.activo_id
            ? 'Elija primero el activo'
            : rutinas.length === 0
              ? 'Este activo no tiene rutinas programadas. Créelas en CMMS · Planes de Mant.'
              : 'Se marca como cumplida cuando la OT pase a COMPLETADA'}>
          <MenuItem value="">Ninguna · es un trabajo suelto</MenuItem>
          {rutinas.map(p => (
            <MenuItem key={p.plan_id} value={String(p.plan_id)}>
              {p.plan_nombre}
              <Typography component="span" variant="caption"
                sx={{ ml: 1, color: RUTINA_COLOR[p.estado_rutina] }}>
                · {RUTINA_LABEL[p.estado_rutina]} · {textoFaltante(p)}
              </Typography>
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      {rutina && (
        <Grid size={{ xs: 12 }}>
          <Alert severity={rutina.estado_rutina === 'VENCIDA' ? 'warning' : 'info'}
            sx={{ fontSize: 12, py: 0.25 }}>
            Cada {rutina.frecuencia} {(rutina.unidad ?? '').toLowerCase()}.
            {rutina.ultima_ejecucion_fecha
              ? ` Última vez el ${rutina.ultima_ejecucion_fecha.slice(0, 10)}`
              : ' Nunca se ha ejecutado'}
            {rutina.proximo_odometro != null && ` · vence a los ${rutina.proximo_odometro.toLocaleString('es-CO')} km`}
            {rutina.proxima_fecha != null && ` · vence el ${rutina.proxima_fecha.slice(0, 10)}`}
            {rutina.odometro_activo != null && ` · el activo va en ${rutina.odometro_activo.toLocaleString('es-CO')} km`}.
          </Alert>
        </Grid>
      )}
      <Grid size={{ xs: 12, md: 4 }}>
        <SelectorCatalogo modulo="GLOBAL" tipo="CENTRO_COSTO" label="Centro de costo"
          valor={f.centro_costo} onChange={v => set(p => ({ ...p, centro_costo: v }))} />
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <SelectorCatalogo modulo="GLOBAL" tipo="CIUDAD" label="Ciudad"
          valor={f.ciudad} onChange={v => set(p => ({ ...p, ciudad: v }))} />
      </Grid>

      <Grid size={{ xs: 12, md: 4 }}>
        <TextField select label="Falla" size="small" fullWidth value={f.falla_id}
          onChange={e => set(p => ({ ...p, falla_id: e.target.value }))}>
          <MenuItem value="">Sin especificar</MenuItem>
          {fallas.map(x => <MenuItem key={x.id} value={String(x.id)}>{x.descripcion}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField select label="Causa" size="small" fullWidth value={f.causa_id}
          onChange={e => set(p => ({ ...p, causa_id: e.target.value }))}>
          <MenuItem value="">Sin especificar</MenuItem>
          {causas.map(x => <MenuItem key={x.id} value={String(x.id)}>{x.descripcion}</MenuItem>)}
        </TextField>
      </Grid>
      <Grid size={{ xs: 12, md: 4 }}>
        <TextField select label="Solución" size="small" fullWidth value={f.solucion_id}
          onChange={e => set(p => ({ ...p, solucion_id: e.target.value }))}>
          <MenuItem value="">Sin especificar</MenuItem>
          {soluciones.map(x => <MenuItem key={x.id} value={String(x.id)}>{x.descripcion}</MenuItem>)}
        </TextField>
      </Grid>

      <Grid size={{ xs: 12, md: 3 }}>
        <TextField label="Fecha requerida" type="date" size="small" fullWidth
          InputLabelProps={{ shrink: true }} value={f.fecha_requerida}
          onChange={e => set(p => ({ ...p, fecha_requerida: e.target.value }))} />
      </Grid>
      <Grid size={{ xs: 12, md: 3 }}>
        <TextField label="Apertura" type="datetime-local" size="small" fullWidth
          InputLabelProps={{ shrink: true }} value={f.fecha_inicio}
          onChange={e => set(p => ({ ...p, fecha_inicio: e.target.value }))} />
      </Grid>
      <Grid size={{ xs: 12, md: 3 }}>
        <TextField label="Posible cierre" type="datetime-local" size="small" fullWidth
          InputLabelProps={{ shrink: true }} value={f.fecha_posible_cierre}
          onChange={e => set(p => ({ ...p, fecha_posible_cierre: e.target.value }))} />
      </Grid>
      <Grid size={{ xs: 12, md: 3 }}>
        <TextField label="Cierre real" type="datetime-local" size="small" fullWidth
          InputLabelProps={{ shrink: true }} value={f.fecha_fin}
          onChange={e => set(p => ({ ...p, fecha_fin: e.target.value }))} />
      </Grid>

      <Grid size={{ xs: 6, md: 3 }}>
        {/* Esta lectura queda como odómetro del activo y es la base del
            próximo vencimiento de sus rutinas. */}
        <TextField label="Odómetro" type="number" size="small" fullWidth value={f.odometro}
          onChange={e => set(p => ({ ...p, odometro: e.target.value }))}
          helperText="Actualiza el kilometraje del activo" />
      </Grid>
      <Grid size={{ xs: 6, md: 3 }}>
        <TextField label="Horómetro" type="number" size="small" fullWidth value={f.horometro}
          onChange={e => set(p => ({ ...p, horometro: e.target.value }))}
          helperText="Actualiza las horas del activo" />
      </Grid>
      <Grid size={{ xs: 12, md: 3 }}>
        <TextField label="Servicios externos" type="number" size="small" fullWidth
          value={f.costo_servicios}
          InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
          onChange={e => set(p => ({ ...p, costo_servicios: e.target.value }))} />
      </Grid>
      <Grid size={{ xs: 12, md: 3 }}>
        <TextField select label="Estado" size="small" fullWidth value={f.estado}
          onChange={e => set(p => ({ ...p, estado: e.target.value }))}>
          {KANBAN_COLUMNS.map(c => <MenuItem key={c.estado} value={c.estado}>{c.label}</MenuItem>)}
        </TextField>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <FormControlLabel
          control={<Switch checked={f.afecta_disponibilidad}
            onChange={e => set(p => ({ ...p, afecta_disponibilidad: e.target.checked }))} />}
          label="Afecta la disponibilidad del activo" />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <FormControlLabel
          control={<Switch checked={f.es_falla}
            onChange={e => set(p => ({ ...p, es_falla: e.target.checked }))} />}
          label="Se originó en una falla" />
      </Grid>

      <Grid size={{ xs: 12 }}>
        <TextField label="Descripción del trabajo *" size="small" fullWidth multiline rows={3}
          value={f.descripcion}
          onChange={e => set(p => ({ ...p, descripcion: e.target.value }))} />
      </Grid>
      <Grid size={{ xs: 12 }}>
        <TextField label="Observaciones" size="small" fullWidth multiline rows={2}
          value={f.observaciones}
          onChange={e => set(p => ({ ...p, observaciones: e.target.value }))} />
      </Grid>
    </Grid>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function EAMOrdenesTrabajo() {
  const qc = useQueryClient()
  const [tab, setTab] = useState(0)

  const [draggedOT, setDraggedOT] = useState<OT | null>(null)
  const [dragOverCol, setDragOverCol] = useState<OTEstado | null>(null)

  const [filtroBusqueda, setFiltroBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Todos')
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [filtroPrioridad, setFiltroPrioridad] = useState('Todos')
  /** 'Todos' | 'interno' | id de contratista. */
  const [filtroProveedor, setFiltroProveedor] = useState('Todos')
  const [filtroActivo, setFiltroActivo] = useState('Todos')

  const resetFiltros = () => {
    setFiltroBusqueda(''); setFiltroEstado('Todos'); setFiltroTipo('Todos')
    setFiltroPrioridad('Todos'); setFiltroProveedor('Todos'); setFiltroActivo('Todos')
  }

  const [form, setForm] = useState<Formulario>(nuevoFormulario())
  const [trabajos, setTrabajos] = useState<TrabajoLinea[]>([])
  const [repuestos, setRepuestos] = useState<RepuestoLinea[]>([])

  const [dlg, setDlg] = useState<{ abierta: OT | null; modo: 'ver' | 'editar' | 'borrar' }>(
    { abierta: null, modo: 'ver' })
  const [dlgForm, setDlgForm] = useState<Formulario>(nuevoFormulario())
  const [dlgTrabajos, setDlgTrabajos] = useState<TrabajoLinea[]>([])
  const [dlgRepuestos, setDlgRepuestos] = useState<RepuestoLinea[]>([])

  const { data: ots = [], isLoading } = useQuery<OT[]>({
    queryKey: ['eam-ots'],
    queryFn: () => api.get('/eam/ots').then(r => r.data),
  })
  const { data: activos = [] } = useQuery<Activo[]>({
    queryKey: ['eam-activos-selector'],
    queryFn: () => api.get('/eam/activos').then(r => r.data),
  })
  const { data: tiposTrabajo = [] } = useQuery<CatalogoItem[]>({
    queryKey: ['eam-tipos-trabajo'],
    queryFn: () => api.get('/eam/catalogos/tipos-trabajo').then(r => r.data),
  })
  const { data: fallas = [] } = useQuery<CatalogoItem[]>({
    queryKey: ['eam-fallas'],
    queryFn: () => api.get('/eam/catalogos/fallas').then(r => r.data),
  })
  const { data: causas = [] } = useQuery<CatalogoItem[]>({
    queryKey: ['eam-causas'],
    queryFn: () => api.get('/eam/catalogos/causas').then(r => r.data),
  })
  const { data: soluciones = [] } = useQuery<CatalogoItem[]>({
    queryKey: ['eam-soluciones'],
    queryFn: () => api.get('/eam/catalogos/soluciones').then(r => r.data),
  })
  const { data: contratistas = [] } = useQuery<Contratista[]>({
    queryKey: ['eam-contratistas'],
    queryFn: () => api.get('/eam/contratistas').then(r => r.data),
  })
  // Lo que se ofrece al armar el detalle: sale de CMMS · Configuración.
  const { data: actividades = [] } = useQuery<CatalogoItem[]>({
    queryKey: ['eam-actividades'],
    queryFn: () => api.get('/eam/catalogos/actividades').then(r => r.data),
  })
  const { data: repuestosCatalogo = [] } = useQuery<RepuestoCatalogo[]>({
    queryKey: ['eam-repuestos-catalogo'],
    queryFn: () => api.get('/eam/catalogos/repuestos').then(r => r.data),
  })
  const { data: cumplimientos = [] } = useQuery<CumplimientoRutina[]>({
    queryKey: ['eam-cumplimiento'],
    queryFn: () => api.get('/eam/planes/cumplimiento').then(r => r.data),
  })

  const activoPorId = useMemo(() => {
    const m = new Map<number, Activo>()
    activos.forEach(a => m.set(a.id, a))
    return m
  }, [activos])

  const etiquetaActivo = (id: number) => {
    const a = activoPorId.get(id)
    if (!a) return `Activo #${id}`
    const nombre = a.nombre ?? a.placa ?? `Activo #${id}`
    return a.codigo ? `${a.codigo} — ${nombre}` : nombre
  }

  /** Sin contratista, lo hace el taller propio. */
  const nombreProveedor = (id?: number | null) =>
    (id ? contratistas.find(c => c.id === id)?.nombre ?? `Contratista #${id}` : 'Taller interno')

  /** Quién responde: el contratista, o el técnico propio si es taller interno. */
  const responsableDe = (ot: OT) =>
    (ot.contratista_id ? nombreProveedor(ot.contratista_id)
      : ot.tecnico_asignado || 'Taller interno · sin técnico')

  const err = (e: any) => {
    const d = e?.response?.data?.detail
    toast.error(typeof d === 'string' ? d : 'No se pudo guardar la OT')
  }
  /** Una OT mueve la lectura del activo y el vencimiento de su rutina, así que
   *  las tres consultas se refrescan juntas. */
  const invalidar = () => {
    qc.invalidateQueries({ queryKey: ['eam-ots'] })
    qc.invalidateQueries({ queryKey: ['eam-cumplimiento'] })
    qc.invalidateQueries({ queryKey: ['eam-activos-selector'] })
  }

  const cuerpoDe = (f: Formulario, ts: TrabajoLinea[], rs: RepuestoLinea[]) => {
    const num = (v: string) => (v.trim() === '' ? null : Number(v))
    return {
      activo_id: Number(f.activo_id),
      tipo_ot: f.tipo_ot, prioridad: f.prioridad, estado: f.estado,
      descripcion: f.descripcion.trim(),
      tecnico_asignado: f.tecnico_asignado.trim() || null,
      contratista_id: num(f.contratista_id),
      tipo_trabajo_id: num(f.tipo_trabajo_id),
      plan_id: num(f.plan_id),
      falla_id: num(f.falla_id), causa_id: num(f.causa_id), solucion_id: num(f.solucion_id),
      fecha_requerida: deFecha(f.fecha_requerida),
      fecha_inicio: deLocal(f.fecha_inicio),
      fecha_fin: deLocal(f.fecha_fin),
      fecha_posible_cierre: deLocal(f.fecha_posible_cierre),
      centro_costo: f.centro_costo || null,
      ciudad: f.ciudad || null,
      odometro: num(f.odometro), horometro: num(f.horometro),
      costo_servicios: Number(f.costo_servicios || 0),
      observaciones: f.observaciones.trim() || null,
      afecta_disponibilidad: f.afecta_disponibilidad,
      es_falla: f.es_falla,
      trabajos: ts.filter(t => t.actividad.trim()),
      repuestos: rs.filter(r => r.descripcion.trim()),
    }
  }

  const mutCrear = useMutation({
    mutationFn: () => api.post('/eam/ots', cuerpoDe(form, trabajos, repuestos)).then(r => r.data),
    onSuccess: (ot: OT) => {
      toast.success(`OT ${ot.numero} creada`)
      invalidar()
      setForm(nuevoFormulario()); setTrabajos([]); setRepuestos([])
      setTab(0)
    },
    onError: err,
  })

  const mutEditar = useMutation({
    mutationFn: () => api.put(`/eam/ots/${dlg.abierta!.id}`,
      cuerpoDe(dlgForm, dlgTrabajos, dlgRepuestos)).then(r => r.data),
    onSuccess: () => {
      toast.success('OT actualizada'); invalidar()
      setDlg({ abierta: null, modo: 'ver' })
    },
    onError: err,
  })

  const mutBorrar = useMutation({
    mutationFn: (id: number) => api.delete(`/eam/ots/${id}`),
    onSuccess: () => {
      toast.success('OT eliminada'); invalidar()
      setDlg({ abierta: null, modo: 'ver' })
    },
    onError: err,
  })

  /** El arrastre del Kanban solo mueve el estado. */
  const mutEstado = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado: OTEstado }) => {
      const cuerpo: Record<string, unknown> = { estado }
      // Al completar se sella el cierre si aún no lo tiene.
      const ot = ots.find(o => o.id === id)
      if (estado === 'COMPLETADA' && ot && !ot.fecha_fin) {
        cuerpo.fecha_fin = new Date().toISOString().slice(0, 19)
      }
      return api.put(`/eam/ots/${id}/estado`, cuerpo).then(r => r.data)
    },
    onSuccess: () => invalidar(),
    onError: err,
  })

  const soltarEn = (estado: OTEstado) => {
    if (draggedOT && draggedOT.estado !== estado) {
      mutEstado.mutate({ id: draggedOT.id, estado })
    }
    setDraggedOT(null); setDragOverCol(null)
  }

  const filtradas = useMemo(() => {
    const q = filtroBusqueda.trim().toLowerCase()
    return ots.filter(o => {
      if (filtroEstado !== 'Todos' && o.estado !== filtroEstado) return false
      if (filtroTipo !== 'Todos' && o.tipo_ot !== filtroTipo) return false
      if (filtroPrioridad !== 'Todos' && o.prioridad !== filtroPrioridad) return false
      if (filtroProveedor === 'interno' && o.contratista_id) return false
      if (filtroProveedor !== 'Todos' && filtroProveedor !== 'interno'
        && String(o.contratista_id ?? '') !== filtroProveedor) return false
      if (filtroActivo !== 'Todos' && String(o.activo_id) !== filtroActivo) return false
      if (!q) return true
      return [o.numero, o.descripcion, etiquetaActivo(o.activo_id), o.tecnico_asignado ?? '']
        .join(' ').toLowerCase().includes(q)
    })
  }, [ots, filtroBusqueda, filtroEstado, filtroTipo, filtroPrioridad, filtroProveedor,
      filtroActivo, activoPorId])

  const kpis = useMemo(() => ([
    { label: 'Abiertas', value: String(ots.filter(o => o.estado !== 'COMPLETADA').length), color: EAM_COLOR },
    { label: 'Urgentes', value: String(ots.filter(o => o.prioridad === 'URGENTE' && o.estado !== 'COMPLETADA').length), color: '#DC2626' },
    // Ni contratista ni técnico propio: no hay a quién reclamarle la OT.
    { label: 'Sin responsable', value: String(ots.filter(o => !o.contratista_id && !o.tecnico_asignado && o.estado !== 'COMPLETADA').length), color: '#F59E0B' },
    { label: 'Costo acumulado', value: pesos(ots.reduce((s, o) => s + (o.costo_total || 0), 0)), color: '#3B82F6' },
  ]), [ots])

  /** Al elegir el activo se hereda su centro de costo, que ya viene con él. */
  const elegirActivo = (id: string, set: SetFormulario) => {
    const a = activoPorId.get(Number(id))
    set(f => ({
      ...f,
      activo_id: id,
      centro_costo: a?.centro_costo || f.centro_costo,
      ciudad: a?.sede || a?.ubicacion || f.ciudad,
      odometro: a?.odometro_actual != null && !f.odometro ? String(a.odometro_actual) : f.odometro,
      horometro: a?.horometro_actual != null && !f.horometro ? String(a.horometro_actual) : f.horometro,
    }))
  }

  const ctx: ContextoOT = {
    activos, contratistas, tiposTrabajo, fallas, causas, soluciones,
    etiquetaActivo, elegirActivo, cumplimientos,
  }

  const abrirOT = (ot: OT) => {
    setDlg({ abierta: ot, modo: 'ver' })
    setDlgForm(otAFormulario(ot))
    setDlgTrabajos(ot.trabajos ?? [])
    setDlgRepuestos(ot.repuestos ?? [])
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Handyman sx={{ color: EAM_COLOR, fontSize: 28 }} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1 }}>Órdenes de Trabajo</Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                CMMS · Kanban, tabla y creación
              </Typography>
            </Box>
          </Box>
          <Button startIcon={<Add />} variant="contained" onClick={() => setTab(2)}
            sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK }, borderRadius: 2 }}>
            Nueva OT
          </Button>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {kpis.map(k => (
            <Grid key={k.label} size={{ xs: 6, md: 3 }}>
              <Card sx={{ border: `1px solid ${k.color}44`, borderRadius: 2 }}>
                <CardContent sx={{ p: '14px !important', textAlign: 'center' }}>
                  <Typography sx={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{k.label}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
          mb: 2, borderBottom: '1px solid #F1F5F9',
          '& .MuiTab-root': { color: 'text.secondary', fontSize: 13 },
          '& .Mui-selected': { color: EAM_COLOR },
          '& .MuiTabs-indicator': { bgcolor: EAM_COLOR },
        }}>
          <Tab label="Kanban" />
          <Tab label={`Tabla (${ots.length})`} />
          <Tab label="Crear OT" />
        </Tabs>

        {isLoading && <LinearProgress sx={{ mb: 1 }} />}
        {activos.length === 0 && (
          <Alert severity="warning" icon={<WarningAmber />} sx={{ mb: 2 }}>
            No hay activos dados de alta. Una OT siempre va contra un activo, así que primero
            créelos en <strong>CMMS · Activos</strong>.
          </Alert>
        )}

        {/* ── Filtros, compartidos por Kanban y Tabla ── */}
        {tab !== 2 && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <TextField size="small" placeholder="Buscar por número, activo, descripción…"
              value={filtroBusqueda} onChange={e => setFiltroBusqueda(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16 }} /></InputAdornment> }}
              sx={{ minWidth: 260, flex: 1 }} />
            <TextField select size="small" label="Estado" value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)} sx={{ minWidth: 150 }}>
              <MenuItem value="Todos">Todos</MenuItem>
              {KANBAN_COLUMNS.map(c => <MenuItem key={c.estado} value={c.estado}>{c.label}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Tipo" value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value)} sx={{ minWidth: 140 }}>
              <MenuItem value="Todos">Todos</MenuItem>
              {TIPOS_OT.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Prioridad" value={filtroPrioridad}
              onChange={e => setFiltroPrioridad(e.target.value)} sx={{ minWidth: 130 }}>
              <MenuItem value="Todos">Todas</MenuItem>
              {PRIORIDADES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </TextField>
            {/* El técnico se busca por texto; acá pesa más quién responde. */}
            <TextField select size="small" label="Proveedor" value={filtroProveedor}
              onChange={e => setFiltroProveedor(e.target.value)} sx={{ minWidth: 180 }}>
              <MenuItem value="Todos">Todos</MenuItem>
              <MenuItem value="interno">Taller interno</MenuItem>
              {contratistas.map(c => <MenuItem key={c.id} value={String(c.id)}>{c.nombre}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Activo" value={filtroActivo}
              onChange={e => setFiltroActivo(e.target.value)} sx={{ minWidth: 200 }}>
              <MenuItem value="Todos">Todos</MenuItem>
              {activos.map(a => (
                <MenuItem key={a.id} value={String(a.id)}>{etiquetaActivo(a.id)}</MenuItem>
              ))}
            </TextField>
            <Tooltip title="Limpiar filtros">
              <IconButton size="small" onClick={resetFiltros}><FilterAltOff sx={{ fontSize: 18 }} /></IconButton>
            </Tooltip>
          </Box>
        )}

        {/* ── KANBAN ── */}
        {tab === 0 && (
          !isLoading && ots.length === 0 ? (
            <Alert severity="info">
              No hay órdenes de trabajo. Use <strong>Nueva OT</strong> para crear la primera.
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 1 }}>
              {KANBAN_COLUMNS.map(col => {
                const items = filtradas.filter(o => o.estado === col.estado)
                return (
                  <Box key={col.estado}
                    onDragOver={e => { e.preventDefault(); setDragOverCol(col.estado) }}
                    onDragLeave={() => setDragOverCol(null)}
                    onDrop={() => soltarEn(col.estado)}
                    sx={{
                      minWidth: 250, flex: 1, p: 1, borderRadius: 2,
                      bgcolor: dragOverCol === col.estado ? `${col.color}14` : '#F8FAFC',
                      border: `1px dashed ${dragOverCol === col.estado ? col.color : 'transparent'}`,
                      transition: 'background-color .15s',
                    }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, px: 0.5 }}>
                      <Typography sx={{ fontSize: 11, fontWeight: 800, color: col.color, letterSpacing: '0.04em' }}>
                        {col.label}
                      </Typography>
                      <Chip label={items.length} size="small" sx={{
                        height: 18, fontSize: 10, bgcolor: `${col.color}22`, color: col.color, fontWeight: 700,
                      }} />
                    </Box>
                    {items.map(ot => (
                      <OTCard key={ot.id} ot={ot} etiquetaActivo={etiquetaActivo(ot.activo_id)}
                        responsable={responsableDe(ot)}
                        onOpen={() => abrirOT(ot)}
                        onDragStart={() => setDraggedOT(ot)}
                        onDragEnd={() => { setDraggedOT(null); setDragOverCol(null) }}
                        isDragging={draggedOT?.id === ot.id} />
                    ))}
                  </Box>
                )
              })}
            </Box>
          )
        )}

        {/* ── TABLA ── */}
        {tab === 1 && (
          !isLoading && ots.length === 0 ? (
            <Alert severity="info">
              No hay órdenes de trabajo. Use <strong>Nueva OT</strong> para crear la primera.
            </Alert>
          ) : (
            <Paper sx={{ bgcolor: 'transparent', overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { borderColor: '#E5E7EB', color: 'text.secondary', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' } }}>
                    <TableCell>OT</TableCell><TableCell>Activo</TableCell>
                    <TableCell>Tipo</TableCell><TableCell>Prioridad</TableCell>
                    <TableCell>Estado</TableCell><TableCell>Responsable</TableCell>
                    <TableCell>Requerida</TableCell><TableCell>Días</TableCell>
                    <TableCell align="right">Costo</TableCell>
                    <TableCell sx={{ width: 80 }}>Acc.</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtradas.map(ot => (
                    <TableRow key={ot.id} hover sx={{ '& td': { borderColor: '#E5E7EB', fontSize: 12 } }}>
                      <TableCell>
                        <Typography sx={{ fontSize: 11, fontFamily: 'monospace', color: EAM_DARK, fontWeight: 700 }}>
                          {ot.numero}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{etiquetaActivo(ot.activo_id)}</TableCell>
                      <TableCell>
                        <Chip label={ot.tipo_ot} size="small" sx={{
                          fontSize: 9, height: 18,
                          bgcolor: `${TIPO_COLOR[ot.tipo_ot ?? ''] ?? '#6B7280'}18`,
                          color: TIPO_COLOR[ot.tipo_ot ?? ''] ?? '#6B7280',
                        }} />
                      </TableCell>
                      <TableCell>
                        <Chip label={ot.prioridad} size="small" sx={{
                          fontSize: 9, height: 18, fontWeight: 700,
                          bgcolor: `${PRIORIDAD_COLOR[ot.prioridad ?? ''] ?? '#6B7280'}22`,
                          color: PRIORIDAD_COLOR[ot.prioridad ?? ''] ?? '#6B7280',
                        }} />
                      </TableCell>
                      <TableCell>
                        <Chip label={ot.estado} size="small" sx={{
                          fontSize: 9, height: 18,
                          bgcolor: `${ESTADO_COLOR[ot.estado ?? ''] ?? '#6B7280'}18`,
                          color: ESTADO_COLOR[ot.estado ?? ''] ?? '#6B7280',
                        }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{responsableDe(ot)}</TableCell>
                      <TableCell sx={{ fontSize: 11 }}>{soloFecha(ot.fecha_requerida)}</TableCell>
                      <TableCell sx={{ fontSize: 11 }}>
                        {ot.estado === 'COMPLETADA' ? '—' : diasDesde(ot.fecha_inicio)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{pesos(ot.costo_total)}</TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={() => abrirOT(ot)}>
                          <Edit sx={{ fontSize: 14 }} />
                        </IconButton>
                        <IconButton size="small" onClick={() => {
                          if (window.confirm(`¿Eliminar la ${ot.numero}?`)) mutBorrar.mutate(ot.id)
                        }}>
                          <DeleteForever sx={{ fontSize: 14, color: '#DC2626' }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          )
        )}

        {/* ── CREAR ── */}
        {tab === 2 && (
          <Card sx={{ borderRadius: 2, border: '1px solid #E5E7EB' }}>
            <CardContent>
              <Typography sx={{ fontWeight: 700, mb: 2 }}>
                Nueva orden de trabajo
                <Typography component="span" sx={{ fontSize: 12, color: 'text.secondary', ml: 1 }}>
                  el número lo asigna el sistema al guardar
                </Typography>
              </Typography>
              <CamposOT f={form} set={setForm} ctx={ctx} />
              <Divider sx={{ my: 2.5 }} />
              <EditorLineas ts={trabajos} rs={repuestos} setTs={setTrabajos} setRs={setRepuestos}
                servicios={Number(form.costo_servicios || 0)} tiposTrabajo={tiposTrabajo}
                contratistas={contratistas} proveedorPrincipal={form.contratista_id}
                actividades={actividades} repuestosCatalogo={repuestosCatalogo} />
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                <Button onClick={() => { setForm(nuevoFormulario()); setTrabajos([]); setRepuestos([]) }}>
                  Limpiar
                </Button>
                <Button variant="contained"
                  disabled={!form.activo_id || !form.descripcion.trim() || mutCrear.isPending}
                  onClick={() => mutCrear.mutate()}
                  sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>
                  {mutCrear.isPending ? 'Creando…' : 'Crear OT'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        )}

        {/* ── DETALLE / EDICIÓN / BORRADO ── */}
        <Dialog open={Boolean(dlg.abierta)} onClose={() => setDlg({ abierta: null, modo: 'ver' })}
          maxWidth="lg" fullWidth>
          {dlg.abierta && (
            <>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, fontSize: 16, fontWeight: 700 }}>
                <span style={{ fontFamily: 'monospace', color: EAM_DARK }}>{dlg.abierta.numero}</span>
                <Chip label={dlg.abierta.estado} size="small" sx={{
                  fontSize: 10, height: 20,
                  bgcolor: `${ESTADO_COLOR[dlg.abierta.estado ?? ''] ?? '#6B7280'}18`,
                  color: ESTADO_COLOR[dlg.abierta.estado ?? ''] ?? '#6B7280',
                }} />
                <Box sx={{ flex: 1 }} />
                <IconButton size="small" onClick={() => setDlg({ abierta: null, modo: 'ver' })}>
                  <Close fontSize="small" />
                </IconButton>
              </DialogTitle>
              <DialogContent dividers>
                {dlg.modo === 'ver' && (
                  <Grid container spacing={2}>
                    {([
                      ['Activo', etiquetaActivo(dlg.abierta.activo_id)],
                      ['Tipo', dlg.abierta.tipo_ot ?? '—'],
                      ['Prioridad', dlg.abierta.prioridad ?? '—'],
                      ['Proveedor principal', nombreProveedor(dlg.abierta.contratista_id)],
                      ['Técnico', dlg.abierta.contratista_id
                        ? '—' : (dlg.abierta.tecnico_asignado || 'Sin asignar')],
                      ['Centro de costo', dlg.abierta.centro_costo ?? '—'],
                      ['Ciudad', dlg.abierta.ciudad ?? '—'],
                      ['Requerida', soloFecha(dlg.abierta.fecha_requerida)],
                      ['Apertura', soloFecha(dlg.abierta.fecha_inicio)],
                      ['Cierre', soloFecha(dlg.abierta.fecha_fin)],
                      ['Afecta disponibilidad', dlg.abierta.afecta_disponibilidad ? 'Sí' : 'No'],
                      ['Origen', dlg.abierta.es_falla ? 'Falla' : 'Programado'],
                      ['Odómetro', dlg.abierta.odometro != null
                        ? `${dlg.abierta.odometro.toLocaleString('es-CO')} km` : '—'],
                      ['Rutina', cumplimientos.find(c => c.plan_id === dlg.abierta!.plan_id)
                        ?.plan_nombre ?? '—'],
                    ] as [string, string][]).map(([k, v]) => (
                      <Grid key={k} size={{ xs: 6, md: 3 }}>
                        <Typography sx={{ fontSize: 10, color: 'text.secondary', textTransform: 'uppercase' }}>{k}</Typography>
                        <Typography sx={{ fontSize: 13 }}>{v}</Typography>
                      </Grid>
                    ))}
                    <Grid size={{ xs: 12 }}>
                      <Typography sx={{ fontSize: 10, color: 'text.secondary', textTransform: 'uppercase' }}>Descripción</Typography>
                      <Typography sx={{ fontSize: 13 }}>{dlg.abierta.descripcion}</Typography>
                    </Grid>

                    <Grid size={{ xs: 12, md: 7 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>Trabajos</Typography>
                      {dlg.abierta.trabajos.length === 0 ? (
                        <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>Sin trabajos registrados.</Typography>
                      ) : (
                        <Table size="small">
                          <TableBody>
                            {dlg.abierta.trabajos.map((t, i) => (
                              <TableRow key={t.id ?? i}>
                                <TableCell sx={{ fontSize: 12 }}>{t.actividad}</TableCell>
                                <TableCell sx={{ fontSize: 11, color: 'text.secondary' }}>
                                  {nombreProveedor(t.contratista_id)}
                                  {!t.contratista_id && t.tecnico ? ` · ${t.tecnico}` : ''}
                                </TableCell>
                                <TableCell align="right" sx={{ fontSize: 12 }}>{pesos(t.costo_total)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                      <Typography sx={{ fontSize: 13, fontWeight: 700, mt: 2, mb: 1 }}>Repuestos</Typography>
                      {dlg.abierta.repuestos.length === 0 ? (
                        <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>Sin repuestos registrados.</Typography>
                      ) : (
                        <Table size="small">
                          <TableBody>
                            {dlg.abierta.repuestos.map((r, i) => (
                              <TableRow key={r.id ?? i}>
                                <TableCell sx={{ fontSize: 12 }}>{r.descripcion}</TableCell>
                                <TableCell sx={{ fontSize: 11, color: 'text.secondary' }}>
                                  {nombreProveedor(r.contratista_id)}
                                </TableCell>
                                <TableCell sx={{ fontSize: 11 }}>{r.cantidad} × {pesos(r.costo_unit)}</TableCell>
                                <TableCell align="right" sx={{ fontSize: 12 }}>{pesos(r.costo_total)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </Grid>
                    <Grid size={{ xs: 12, md: 5 }}>
                      <Box sx={{ p: 2, bgcolor: `${EAM_COLOR}0F`, borderRadius: 2 }}>
                        {([
                          ['Mano de obra', dlg.abierta.costo_mano_obra],
                          ['Repuestos', dlg.abierta.costo_repuestos],
                          ['Servicios externos', dlg.abierta.costo_servicios],
                        ] as [string, number][]).map(([k, v]) => (
                          <Stack key={k} direction="row" justifyContent="space-between">
                            <Typography sx={{ fontSize: 12 }}>{k}</Typography>
                            <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{pesos(v)}</Typography>
                          </Stack>
                        ))}
                        <Divider sx={{ my: 1 }} />
                        <Stack direction="row" justifyContent="space-between">
                          <Typography sx={{ fontSize: 14, fontWeight: 700 }}>Total</Typography>
                          <Typography sx={{ fontSize: 14, fontWeight: 800, color: EAM_DARK }}>
                            {pesos(dlg.abierta.costo_total)}
                          </Typography>
                        </Stack>
                      </Box>
                    </Grid>
                  </Grid>
                )}
                {dlg.modo === 'editar' && (
                  <>
                    <CamposOT f={dlgForm} set={setDlgForm} ctx={ctx} />
                    <Divider sx={{ my: 2.5 }} />
                    <EditorLineas ts={dlgTrabajos} rs={dlgRepuestos}
                      setTs={setDlgTrabajos} setRs={setDlgRepuestos}
                      servicios={Number(dlgForm.costo_servicios || 0)} tiposTrabajo={tiposTrabajo}
                      contratistas={contratistas} proveedorPrincipal={dlgForm.contratista_id}
                      actividades={actividades} repuestosCatalogo={repuestosCatalogo} />
                  </>
                )}
                {dlg.modo === 'borrar' && (
                  <Alert severity="error">
                    Se va a eliminar la <strong>{dlg.abierta.numero}</strong> junto con sus
                    trabajos y repuestos. Esta acción no se puede deshacer.
                  </Alert>
                )}
              </DialogContent>
              <DialogActions sx={{ px: 3, py: 2 }}>
                {dlg.modo === 'ver' && (
                  <>
                    <Button color="error" startIcon={<DeleteForever />}
                      onClick={() => setDlg(p => ({ ...p, modo: 'borrar' }))}>
                      Eliminar
                    </Button>
                    <Box sx={{ flex: 1 }} />
                    <Button onClick={() => setDlg({ abierta: null, modo: 'ver' })}>Cerrar</Button>
                    <Button variant="contained" startIcon={<Edit />}
                      onClick={() => setDlg(p => ({ ...p, modo: 'editar' }))}
                      sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>
                      Editar
                    </Button>
                  </>
                )}
                {dlg.modo === 'editar' && (
                  <>
                    <Button onClick={() => setDlg(p => ({ ...p, modo: 'ver' }))}>Cancelar</Button>
                    <Button variant="contained"
                      disabled={!dlgForm.activo_id || !dlgForm.descripcion.trim() || mutEditar.isPending}
                      onClick={() => mutEditar.mutate()}
                      sx={{ bgcolor: EAM_COLOR, '&:hover': { bgcolor: EAM_DARK } }}>
                      {mutEditar.isPending ? 'Guardando…' : 'Guardar cambios'}
                    </Button>
                  </>
                )}
                {dlg.modo === 'borrar' && (
                  <>
                    <Button onClick={() => setDlg(p => ({ ...p, modo: 'ver' }))}>Cancelar</Button>
                    <Button variant="contained" color="error" disabled={mutBorrar.isPending}
                      onClick={() => mutBorrar.mutate(dlg.abierta!.id)}>
                      {mutBorrar.isPending ? 'Eliminando…' : 'Eliminar definitivamente'}
                    </Button>
                  </>
                )}
              </DialogActions>
            </>
          )}
        </Dialog>
      </Box>
    </Layout>
  )
}
