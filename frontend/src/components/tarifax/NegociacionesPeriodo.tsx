/**
 * Tarifas negociadas por cliente y periodo: plantilla descargable, carga desde
 * un mes (año y mes en pantalla, o columnas AÑO/MES en el archivo) y la lista
 * de cargas. Cada carga reemplaza las tarifas de esos clientes desde ese mes;
 * cada mes de SICETAC se compara con la carga más reciente del cliente en ese
 * mes o antes (o con el consolidado general si no tiene ninguna).
 */
import { useRef, useState } from 'react'
import {
  Box, Button, IconButton, LinearProgress, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow,
  TextField, Tooltip, Typography,
} from '@mui/material'
import { CloudUpload, Delete, FileDownload } from '@mui/icons-material'
import toast from 'react-hot-toast'
import { apiClient as api } from '@/api/client'
import { errorApi } from '@/components/comun/Registro'

const BASE = '/tarifax/comparativo'
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
// Recalcular el cruce de varios meses puede tardar.
const LARGO = { timeout: 600000 }

export interface CargaNegociacion { periodo: string; nombre: string; cliente: string; tarifas: number; archivo: string | null; cargado_en: string | null }

const fecha = (s?: string | null) => s ? new Date(s).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : ''

export function NegociacionesPeriodo({ cargas, onCambio, color, deshabilitado }: {
  cargas: CargaNegociacion[]; onCambio: () => void; color: string; deshabilitado?: boolean
}) {
  const hoy = new Date()
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const entrada = useRef<HTMLInputElement>(null)
  const anios = Array.from(new Set([hoy.getFullYear() - 1, hoy.getFullYear(), hoy.getFullYear() + 1,
    ...cargas.map(c => Number(c.periodo.slice(0, 4)))])).sort()

  const plantilla = async () => {
    try {
      const r = await api.get(`${BASE}/negociaciones/plantilla`, { responseType: 'blob' })
      const url = URL.createObjectURL(r.data as Blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'plantilla_negociaciones_tarifax.xlsx'; a.click()
      URL.revokeObjectURL(url)
    } catch (e) { toast.error(errorApi(e, 'No se pudo descargar la plantilla')) }
  }

  const subir = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const campo = ev.target, archivo = campo.files?.[0]
    if (!archivo) return
    const datos = new FormData()
    datos.append('archivo', archivo)
    setOcupado('subir')
    try {
      const r = await api.post(`${BASE}/negociaciones/periodo/${anio}/${mes}`, datos, LARGO).then(x => x.data)
      toast.success(`${r.filas} tarifas de ${r.clientes} cliente${r.clientes === 1 ? '' : 's'} · rigen desde ${r.periodos.join(', ')}`, { duration: 7000 })
      onCambio()
    } catch (e) { toast.error(errorApi(e, 'No se pudo cargar el archivo')) } finally { setOcupado(null); campo.value = '' }
  }

  const quitar = async (c: CargaNegociacion) => {
    if (!window.confirm(`¿Quitar las ${c.tarifas} tarifas de ${c.cliente} que rigen desde ${c.nombre}? Vuelven a regir las anteriores.`)) return
    setOcupado(`${c.periodo}|${c.cliente}`)
    try {
      await api.delete(`${BASE}/negociaciones/periodo`, { params: { periodo: c.periodo, cliente: c.cliente }, ...LARGO })
      toast.success(`${c.cliente} · ${c.nombre} quitado`)
      onCambio()
    } catch (e) { toast.error(errorApi(e)) } finally { setOcupado(null) }
  }

  return (
    <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
      <input ref={entrada} type="file" hidden accept=".xlsx,.xls,.csv" onChange={subir} />
      <Typography fontWeight={700} fontSize={14}>Por cliente y periodo</Typography>
      <Typography fontSize={12.5} color="text.secondary" mb={1.5}>
        Cargue las tarifas de uno o varios clientes desde un mes. Cada carga reemplaza las tarifas de esos clientes desde ese mes,
        y cada mes de SICETAC se compara con las que rigen en ese mes. Si el archivo trae AÑO y MES, se usan los de cada fila.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.5} alignItems={{ sm: 'center' }}>
        <TextField select size="small" label="Rige desde: año" value={anio} onChange={e => setAnio(Number(e.target.value))} sx={{ minWidth: 150 }}>
          {anios.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Mes" value={mes} onChange={e => setMes(Number(e.target.value))} sx={{ minWidth: 150 }}>
          {MESES.map((m, i) => <MenuItem key={m} value={i + 1}>{m}</MenuItem>)}
        </TextField>
        <Box flex={1} />
        <Button variant="outlined" startIcon={<FileDownload />} onClick={plantilla}>Descargar plantilla</Button>
        <Button variant="contained" startIcon={<CloudUpload />} disabled={!!ocupado || deshabilitado} sx={{ bgcolor: color }}
          onClick={() => entrada.current?.click()}>
          {ocupado === 'subir' ? 'Cargando…' : `Cargar tarifas de ${MESES[mes - 1].toLowerCase()} ${anio}`}
        </Button>
      </Stack>
      {!!ocupado && <LinearProgress sx={{ mt: 1.5 }} />}
      {cargas.length > 0 && <Box sx={{ mt: 1.5, maxHeight: 280, overflow: 'auto' }}>
        <Table size="small" stickyHeader>
          <TableHead><TableRow>{['Rige desde', 'Cliente', 'Tarifas', 'Archivo', 'Cargado', ''].map((h, i) =>
            <TableCell key={i} align={i === 2 ? 'right' : 'left'} sx={{ fontWeight: 700, fontSize: 12 }}>{h}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {cargas.map(c => (
              <TableRow key={`${c.periodo}|${c.cliente}`} hover>
                <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{c.nombre}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{c.cliente}</TableCell>
                <TableCell align="right" sx={{ fontSize: 12 }}>{c.tarifas.toLocaleString('es-CO')}</TableCell>
                <TableCell sx={{ fontSize: 12 }}>{c.archivo}</TableCell>
                <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>{fecha(c.cargado_en)}</TableCell>
                <TableCell align="right" sx={{ py: 0 }}>
                  <Tooltip title="Quitar esta carga">
                    <span><IconButton size="small" aria-label={`Quitar ${c.cliente} ${c.nombre}`} disabled={!!ocupado} onClick={() => quitar(c)}>
                      <Delete fontSize="small" />
                    </IconButton></span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>}
    </Box>
  )
}
