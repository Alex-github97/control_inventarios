/**
 * TMS · Configuración
 *
 * Era maqueta entera: siete zonas y seis tipos de servicio escritos a mano que
 * se «guardaban» solo en la memoria del navegador, una pestaña de rutas cuyo
 * botón mostraba un aviso en vez de navegar, y seis parámetros que ningún
 * cálculo leía (horas de conducción, costo por km «de referencia», una lista
 * de filiales inventadas).
 *
 * Lo que quedó:
 *  - Zonas, guardadas en el servidor, con cuántos viajes pasan por cada una y
 *    qué ciudades con viajes no caen en ninguna.
 *  - Tipos de servicio: la lista la fija el sistema —viajes y rutas guardan
 *    uno de esos valores—, así que se muestra con su uso en vez de dejar crear
 *    tipos que ningún formulario puede escoger.
 *  - Un solo parámetro, la tolerancia de puntualidad, porque es el único que
 *    decide algo: si una entrega cuenta como a tiempo en el OTIF.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Paper, Typography, Tabs, Tab, Chip, Button, TextField, InputAdornment, Alert, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material'
import { Settings, Save } from '@mui/icons-material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { apiClient } from '@/api/client'
import { AdminCatalogos } from '@/components/catalogo/AdminCatalogos'
import { Encabezado, FormularioRegistro, TablaRegistros, useCrud, Etiqueta, legible, errorApi, type Campo } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const TMS_COLOR = COLOR_MODULO

interface Zona { id: number; nombre: string; descripcion?: string | null; ciudades?: string | null; activo: boolean }
interface UsoZonas { zonas: { zona_id: number; viajes: number }[]; ciudades_sin_zona: { ciudad: string; viajes: number }[] }
interface Parametro { clave: string; valor: number; defecto: number; min: number; max: number; descripcion: string }
interface Servicio { tipo: string; viajes: number; rutas: number }

/** Las ciudades se guardaron separadas por barra o como lista JSON. */
const ciudadesDe = (t?: string | null): string[] => {
  if (!t) return []
  if (t.trim().startsWith('[')) { try { return JSON.parse(t).map(String) } catch { /* sigue */ } }
  return t.replace(/,/g, '|').split('|').map(c => c.trim()).filter(Boolean)
}

const zonasApi = {
  listar: () => apiClient.get<Zona[]>('/tms/config/zonas').then(r => r.data),
  crear: (d: any) => apiClient.post<Zona>('/tms/config/zonas', d).then(r => r.data),
  editar: (id: number, d: any) => apiClient.put<Zona>(`/tms/config/zonas/${id}`, d).then(r => r.data),
  retirar: (id: number) => apiClient.delete(`/tms/config/zonas/${id}`),
}

const CAMPOS_ZONA: Campo[] = [
  { clave: 'nombre', etiqueta: 'Zona', obligatorio: true },
  { clave: 'descripcion', etiqueta: 'Descripción' },
  { clave: 'ciudades', etiqueta: 'Ciudades', tipo: 'area', ayuda: 'Separadas por coma. Se cruzan con el origen y destino de los viajes, sin importar tildes.' },
  { clave: 'activo', etiqueta: 'Activa', tipo: 'interruptor' },
]

function Zonas() {
  const crud = useCrud<Zona>(['tms-zonas'], zonasApi, 'Zona', [['tms-zonas-uso']], true)
  const { data: uso } = useQuery({ queryKey: ['tms-zonas-uso'], queryFn: () => apiClient.get<UsoZonas>('/tms/config/zonas-uso').then(r => r.data) })
  const [editar, setEditar] = useState<Zona | null | undefined>(undefined)
  const viajes = (id: number) => uso?.zonas.find(z => z.zona_id === id)?.viajes ?? 0

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <Button variant="contained" onClick={() => setEditar(null)} sx={{ bgcolor: TMS_COLOR }}>Nueva zona</Button>
      </Box>
      <TablaRegistros<Zona>
        filas={crud.datos} cargando={crud.isLoading} vacio="Sin zonas registradas" etiqueta={z => z.nombre}
        onEditar={setEditar} onRetirar={z => crud.retirar.mutate(z.id)}
        columnas={[
          { titulo: 'Zona', valor: z => <b>{z.nombre}</b> },
          { titulo: 'Descripción', valor: z => z.descripcion || '—' },
          { titulo: 'Ciudades', valor: z => <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>{ciudadesDe(z.ciudades).map(c => <Chip key={c} size="small" variant="outlined" label={c} />)}</Box> },
          { titulo: 'Viajes', alinear: 'right', valor: z => viajes(z.id) },
          { titulo: 'Estado', valor: z => <Etiqueta texto={z.activo ? 'Activa' : 'Inactiva'} color={z.activo ? '#16A34A' : '#64748B'} /> },
        ]} />
      {!!uso?.ciudades_sin_zona.length && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <b>Ciudades con viajes que no caen en ninguna zona:</b>{' '}
          {uso.ciudades_sin_zona.map(c => `${c.ciudad} (${c.viajes})`).join(', ')}
        </Alert>
      )}
      <FormularioRegistro
        abierto={editar !== undefined} titulo={editar ? 'Editar zona' : 'Nueva zona'} campos={CAMPOS_ZONA}
        registro={editar ? { ...editar, ciudades: ciudadesDe(editar.ciudades).join(', ') } : null}
        valoresIniciales={{ activo: true }}
        onGuardar={c => crud.guardar(editar ?? null, { ...c, ciudades: ciudadesDe(c.ciudades).join('|') || null })}
        onCerrar={() => setEditar(undefined)} />
    </Box>
  )
}

function Servicios() {
  const nav = useNavigate()
  const { data = [] } = useQuery({ queryKey: ['tms-servicios-uso'], queryFn: () => apiClient.get<Servicio[]>('/tms/config/servicios-en-uso').then(r => r.data) })
  return (
    <Box sx={{ p: 3 }}>
      <Typography fontSize={13} color="text.secondary" mb={2}>
        Estos son los tipos que un viaje o una ruta pueden llevar. La lista la fija el sistema; aquí se ve cuánto se usa cada uno.
      </Typography>
      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead><TableRow sx={{ '& th': { fontWeight: 700, fontSize: 12 } }}>
            <TableCell>Tipo de servicio</TableCell><TableCell align="right">Rutas</TableCell><TableCell align="right">Viajes</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {data.map(s => (
              <TableRow key={s.tipo} sx={{ '& td': { fontSize: 12 } }}>
                <TableCell>{legible(s.tipo)}</TableCell>
                <TableCell align="right">{s.rutas}</TableCell>
                <TableCell align="right">{s.viajes}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
      <Button sx={{ mt: 2 }} onClick={() => nav('/tms/rutas')}>Ir a rutas</Button>
    </Box>
  )
}

function Parametros() {
  const qc = useQueryClient()
  const { data = [] } = useQuery({ queryKey: ['tms-parametros'], queryFn: () => apiClient.get<Parametro[]>('/tms/config/parametros').then(r => r.data) })
  const [valores, setValores] = useState<Record<string, string>>({})
  const valor = (p: Parametro) => valores[p.clave] ?? String(p.valor)
  const fuera = (p: Parametro) => { const n = Number(valor(p)); return valor(p) === '' || !Number.isFinite(n) || n < p.min || n > p.max }

  const guardar = async () => {
    try {
      await apiClient.put('/tms/config/parametros', Object.fromEntries(data.map(p => [p.clave, Number(valor(p))])))
      toast.success('Parámetros guardados')
      setValores({})
      qc.invalidateQueries({ queryKey: ['tms-parametros'] })
    } catch (e) { toast.error(errorApi(e)) }
  }

  return (
    <Box sx={{ p: 3, maxWidth: 560 }}>
      {data.map(p => (
        <TextField key={p.clave} fullWidth type="number" sx={{ mb: 2 }}
          label="Tolerancia de puntualidad (OTIF)" value={valor(p)}
          onChange={e => setValores(v => ({ ...v, [p.clave]: e.target.value }))}
          error={fuera(p)} helperText={fuera(p) ? `Entre ${p.min} y ${p.max}` : `${p.descripcion}. Con 0, cualquier minuto tarde cuenta como incumplido.`}
          InputProps={{ endAdornment: <InputAdornment position="end">min</InputAdornment> }}
          inputProps={{ min: p.min, max: p.max }} />
      ))}
      <Typography fontSize={12} color="text.secondary" mb={2}>
        Se aplica al OTIF por viaje y al análisis de corredores al consultarlos, y a los viajes que se entreguen desde ahora.
      </Typography>
      <Button variant="contained" startIcon={<Save />} disabled={data.some(fuera)} onClick={guardar} sx={{ bgcolor: TMS_COLOR }}>Guardar parámetros</Button>
    </Box>
  )
}

export default function TMSConfig() {
  const [tab, setTab] = useState(0)
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Settings sx={{ fontSize: 28 }} />} titulo="Configuración TMS" subtitulo="Zonas, tipos de servicio y parámetros" color={TMS_COLOR} />
        <Paper elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid #E2E8F0', px: 2 }}>
            <Tab label="Zonas" />
            <Tab label="Tipos de servicio" />
            <Tab label="Parámetros" />
            <Tab label="Catálogos" />
          </Tabs>
          {tab === 0 && <Zonas />}
          {tab === 1 && <Servicios />}
          {tab === 2 && <Parametros />}
          {tab === 3 && <AdminCatalogos modulo="TMS" color={COLOR_MODULO} />}
        </Paper>
      </Box>
    </Layout>
  )
}
