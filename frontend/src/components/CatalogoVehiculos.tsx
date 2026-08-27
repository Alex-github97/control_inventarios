/**
 * Administración del catálogo de vehículos: tipo → marca → línea → modelo,
 * más los catálogos planos de motores y combustibles.
 *
 * Se navega por columnas: al elegir una marca aparecen sus líneas, y al elegir
 * una línea sus modelos. El modelo es la hoja y es donde se guarda la ficha
 * técnica que después heredan los activos.
 */
import { useState } from 'react'
import {
  Box, Card, CardContent, Typography, Stack, Chip, Button, TextField, MenuItem,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableHead,
  TableBody, TableRow, TableCell, alpha, Tooltip, Switch, FormControlLabel,
  InputAdornment, Alert, Divider,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Add as AddIcon, Edit as EditIcon, DeleteForever as DeleteIcon,
  ChevronRight, Settings as MotorIcon, LocalGasStation,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient as api } from '@/api/client'
import { AdminCatalogos } from './catalogo/AdminCatalogos'
import type {
  MarcaActivo, LineaActivo, ModeloActivo, MotorActivo, CombustibleActivo,
} from './SelectorCatalogoVehiculo'

interface TipoActivoCat { id: number; codigo: string; nombre: string; usa_llantas: boolean }

const MODELO_VACIO = {
  nombre: '', anio_desde: '', anio_hasta: '', motor_id: '',
  tipo_combustible: '', capacidad_combustible: '', numero_ejes: '',
  vida_util_anios: '', vida_util_km: '', capacidad_kg: '', activo: true,
}

export function CatalogoVehiculos({ color = '#32AC5C' }: { color?: string }) {
  const qc = useQueryClient()
  const [tipoSel, setTipoSel] = useState('')
  const [marcaSel, setMarcaSel] = useState<MarcaActivo | null>(null)
  const [lineaSel, setLineaSel] = useState<LineaActivo | null>(null)

  // El tipo es el primer nivel de la jerarquía, así que se administra acá y no
  // solo se filtra por él.
  const [dlgTipo, setDlgTipo] = useState<{ abierto: boolean; item: TipoActivoCat | null }>(
    { abierto: false, item: null })
  const [formTipo, setFormTipo] = useState({ codigo: '', nombre: '', usa_llantas: false })
  const [tipoWasOpen, setTipoWasOpen] = useState(false)

  if (dlgTipo.abierto && !tipoWasOpen) {
    setTipoWasOpen(true)
    const it = dlgTipo.item
    setFormTipo(it
      ? { codigo: it.codigo, nombre: it.nombre, usa_llantas: Boolean(it.usa_llantas) }
      : { codigo: '', nombre: '', usa_llantas: false })
  }
  if (!dlgTipo.abierto && tipoWasOpen) setTipoWasOpen(false)

  const [dlgMarca, setDlgMarca] = useState(false)
  const [formMarca, setFormMarca] = useState({ nombre: '', tipo_activo: '' })
  const [dlgLinea, setDlgLinea] = useState(false)
  const [formLinea, setFormLinea] = useState({ nombre: '' })
  const [dlgModelo, setDlgModelo] = useState<{ abierto: boolean; item: ModeloActivo | null }>(
    { abierto: false, item: null })
  const [formModelo, setFormModelo] = useState({ ...MODELO_VACIO })
  const [modeloWasOpen, setModeloWasOpen] = useState(false)
  const [dlgMotor, setDlgMotor] = useState(false)
  const [formMotor, setFormMotor] = useState({ nombre: '', marca: '', cilindraje_cc: '', potencia_hp: '' })
  const [dlgComb, setDlgComb] = useState(false)
  const [formComb, setFormComb] = useState({ nombre: '' })

  if (dlgModelo.abierto && !modeloWasOpen) {
    setModeloWasOpen(true)
    const it = dlgModelo.item
    setFormModelo(it ? {
      nombre: it.nombre,
      anio_desde: it.anio_desde != null ? String(it.anio_desde) : '',
      anio_hasta: it.anio_hasta != null ? String(it.anio_hasta) : '',
      motor_id: it.motor_id != null ? String(it.motor_id) : '',
      tipo_combustible: it.tipo_combustible ?? '',
      capacidad_combustible: it.capacidad_combustible != null ? String(it.capacidad_combustible) : '',
      numero_ejes: it.numero_ejes != null ? String(it.numero_ejes) : '',
      vida_util_anios: it.vida_util_anios != null ? String(it.vida_util_anios) : '',
      vida_util_km: it.vida_util_km != null ? String(it.vida_util_km) : '',
      capacidad_kg: it.capacidad_kg != null ? String(it.capacidad_kg) : '',
      activo: it.activo !== false,
    } : { ...MODELO_VACIO })
  }
  if (!dlgModelo.abierto && modeloWasOpen) setModeloWasOpen(false)

  const { data: tipos = [] } = useQuery<TipoActivoCat[]>({
    queryKey: ['eam-tipos-activo'],
    queryFn: () => api.get('/eam/tipos-activo').then(r => r.data),
  })
  const { data: marcas = [] } = useQuery<MarcaActivo[]>({
    queryKey: ['eam-cat-veh-marcas-admin', tipoSel],
    queryFn: () => api.get('/eam/catalogo-vehiculos/marcas', {
      params: tipoSel ? { tipo_activo: tipoSel } : {},
    }).then(r => r.data),
  })
  const { data: lineas = [] } = useQuery<LineaActivo[]>({
    queryKey: ['eam-cat-veh-lineas-admin', marcaSel?.id],
    queryFn: () => api.get('/eam/catalogo-vehiculos/lineas', {
      params: { marca_id: marcaSel!.id },
    }).then(r => r.data),
    enabled: !!marcaSel,
  })
  const { data: modelos = [] } = useQuery<ModeloActivo[]>({
    queryKey: ['eam-cat-veh-modelos-admin', lineaSel?.id],
    queryFn: () => api.get('/eam/catalogo-vehiculos/modelos', {
      params: { linea_id: lineaSel!.id },
    }).then(r => r.data),
    enabled: !!lineaSel,
  })
  const { data: motores = [] } = useQuery<MotorActivo[]>({
    queryKey: ['eam-cat-veh-motores'],
    queryFn: () => api.get('/eam/catalogo-vehiculos/motores').then(r => r.data),
  })

  const { data: combustibles = [] } = useQuery<CombustibleActivo[]>({
    queryKey: ['eam-cat-veh-combustibles'],
    queryFn: () => api.get('/eam/catalogo-vehiculos/combustibles').then(r => r.data),
  })

  const invalidar = (...claves: string[]) => {
    for (const k of claves) qc.invalidateQueries({ queryKey: [k] })
    // El selector del formulario de activos usa otras claves
    qc.invalidateQueries({ queryKey: ['eam-cat-veh-marcas'] })
    qc.invalidateQueries({ queryKey: ['eam-cat-veh-lineas'] })
    qc.invalidateQueries({ queryKey: ['eam-cat-veh-modelos'] })
  }
  const err = (e: any) => toast.error(e?.response?.data?.detail ?? 'No se pudo guardar')

  const mutTipo = useMutation({
    mutationFn: () => {
      const cuerpo = {
        // El código es la llave con la que los activos guardan su tipo, así que
        // se normaliza: sin espacios ni minúsculas.
        codigo: formTipo.codigo.trim().toUpperCase().replace(/\s+/g, '_'),
        nombre: formTipo.nombre.trim(),
        usa_llantas: formTipo.usa_llantas,
      }
      return dlgTipo.item
        ? api.put(`/eam/tipos-activo/${dlgTipo.item.id}`, cuerpo).then(r => r.data)
        : api.post('/eam/tipos-activo', cuerpo).then(r => r.data)
    },
    onSuccess: () => {
      toast.success(dlgTipo.item ? 'Tipo actualizado' : 'Tipo agregado')
      invalidar('eam-tipos-activo')
      setDlgTipo({ abierto: false, item: null })
    },
    onError: err,
  })
  const mutBorrarTipo = useMutation({
    mutationFn: (id: number) => api.delete(`/eam/tipos-activo/${id}`),
    onSuccess: () => { toast.success('Tipo eliminado'); invalidar('eam-tipos-activo') },
    onError: err,
  })

  const mutMarca = useMutation({
    mutationFn: () => api.post('/eam/catalogo-vehiculos/marcas', {
      nombre: formMarca.nombre.trim(),
      tipo_activo: formMarca.tipo_activo || null,
    }).then(r => r.data),
    onSuccess: () => {
      toast.success('Marca agregada'); invalidar('eam-cat-veh-marcas-admin')
      setDlgMarca(false); setFormMarca({ nombre: '', tipo_activo: '' })
    },
    onError: err,
  })
  const mutBorrarMarca = useMutation({
    mutationFn: (id: number) => api.delete(`/eam/catalogo-vehiculos/marcas/${id}`),
    onSuccess: () => {
      toast.success('Marca eliminada. Si ya estaba en uso, quedó desactivada.')
      invalidar('eam-cat-veh-marcas-admin'); setMarcaSel(null); setLineaSel(null)
    },
    onError: err,
  })
  const mutLinea = useMutation({
    mutationFn: () => api.post('/eam/catalogo-vehiculos/lineas', {
      marca_id: marcaSel!.id, nombre: formLinea.nombre.trim(),
    }).then(r => r.data),
    onSuccess: () => {
      toast.success('Línea agregada'); invalidar('eam-cat-veh-lineas-admin', 'eam-cat-veh-marcas-admin')
      setDlgLinea(false); setFormLinea({ nombre: '' })
    },
    onError: err,
  })
  const mutBorrarLinea = useMutation({
    mutationFn: (id: number) => api.delete(`/eam/catalogo-vehiculos/lineas/${id}`),
    onSuccess: () => {
      toast.success('Línea eliminada'); invalidar('eam-cat-veh-lineas-admin'); setLineaSel(null)
    },
    onError: err,
  })
  const mutModelo = useMutation({
    mutationFn: () => {
      const n = (v: string) => (v.trim() === '' ? null : Number(v))
      const cuerpo = {
        linea_id: lineaSel!.id, nombre: formModelo.nombre.trim(),
        anio_desde: n(formModelo.anio_desde), anio_hasta: n(formModelo.anio_hasta),
        motor_id: n(formModelo.motor_id),
        tipo_combustible: formModelo.tipo_combustible || null,
        capacidad_combustible: n(formModelo.capacidad_combustible),
        numero_ejes: n(formModelo.numero_ejes),
        vida_util_anios: n(formModelo.vida_util_anios),
        vida_util_km: n(formModelo.vida_util_km),
        capacidad_kg: n(formModelo.capacidad_kg),
        activo: formModelo.activo,
      }
      return dlgModelo.item
        ? api.put(`/eam/catalogo-vehiculos/modelos/${dlgModelo.item.id}`, cuerpo).then(r => r.data)
        : api.post('/eam/catalogo-vehiculos/modelos', cuerpo).then(r => r.data)
    },
    onSuccess: () => {
      toast.success(dlgModelo.item ? 'Modelo actualizado' : 'Modelo agregado')
      invalidar('eam-cat-veh-modelos-admin', 'eam-cat-veh-lineas-admin')
      setDlgModelo({ abierto: false, item: null })
    },
    onError: err,
  })
  const mutBorrarModelo = useMutation({
    mutationFn: (id: number) => api.delete(`/eam/catalogo-vehiculos/modelos/${id}`),
    onSuccess: () => { toast.success('Modelo eliminado'); invalidar('eam-cat-veh-modelos-admin') },
    onError: err,
  })
  const mutMotor = useMutation({
    mutationFn: () => api.post('/eam/catalogo-vehiculos/motores', {
      nombre: formMotor.nombre.trim(), marca: formMotor.marca || null,
      cilindraje_cc: formMotor.cilindraje_cc ? Number(formMotor.cilindraje_cc) : null,
      potencia_hp: formMotor.potencia_hp ? Number(formMotor.potencia_hp) : null,
    }).then(r => r.data),
    onSuccess: () => {
      toast.success('Motor agregado'); invalidar('eam-cat-veh-motores')
      setDlgMotor(false); setFormMotor({ nombre: '', marca: '', cilindraje_cc: '', potencia_hp: '' })
    },
    onError: err,
  })
  const mutComb = useMutation({
    mutationFn: () => api.post('/eam/catalogo-vehiculos/combustibles', {
      nombre: formComb.nombre.trim(),
    }).then(r => r.data),
    onSuccess: () => {
      toast.success('Combustible agregado'); invalidar('eam-cat-veh-combustibles')
      setDlgComb(false); setFormComb({ nombre: '' })
    },
    onError: err,
  })


  const columna = (titulo: string, sub: string, accion: React.ReactNode, contenido: React.ReactNode) => (
    <Card sx={{ height: '100%', bgcolor: '#FFFFFF', border: `1px solid ${alpha(color, 0.2)}` }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={800}>{titulo}</Typography>
            <Typography variant="caption" color="text.secondary">{sub}</Typography>
          </Box>
          {accion}
        </Stack>
        {contenido}
      </CardContent>
    </Card>
  )

  const fila = (
    activa: boolean, etiqueta: string, detalle: string,
    onClick?: () => void, onBorrar?: () => void, inactivo?: boolean,
  ) => (
    <Stack
      direction="row" alignItems="center" gap={0.5}
      onClick={onClick}
      sx={{
        px: 1, py: 0.7, borderRadius: 1, cursor: onClick ? 'pointer' : 'default',
        border: '1px solid', borderColor: activa ? color : 'transparent',
        bgcolor: activa ? alpha(color, 0.07) : 'transparent',
        opacity: inactivo ? 0.5 : 1,
        '&:hover': onClick ? { bgcolor: alpha(color, 0.05) } : {},
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography fontSize={13} fontWeight={activa ? 800 : 600} noWrap>{etiqueta}</Typography>
        {detalle && <Typography fontSize={10.5} color="text.secondary" noWrap>{detalle}</Typography>}
      </Box>
      {onBorrar && (
        <IconButton size="small" onClick={e => { e.stopPropagation(); onBorrar() }}>
          <DeleteIcon sx={{ fontSize: 15 }} />
        </IconButton>
      )}
      {onClick && <ChevronRight sx={{ fontSize: 15, color: 'text.disabled' }} />}
    </Stack>
  )

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2, py: 0.5 }}>
        Lo que se configure acá es lo único que se podrá elegir al crear un activo. Es lo que
        evita que la misma marca quede escrita de tres formas distintas y arruine los reportes.
      </Alert>

      <Grid container spacing={2}>
        {/* Tipos de activo — primer nivel de la jerarquía */}
        <Grid size={{ xs: 12, md: 3 }}>
          {columna(
            'Tipos de activo', `${tipos.length} en el catálogo`,
            <Button size="small" startIcon={<AddIcon />}
              onClick={() => setDlgTipo({ abierto: true, item: null })}
              sx={{ color, textTransform: 'none' }}>Agregar</Button>,
            <Stack spacing={0.4} sx={{ maxHeight: 380, overflowY: 'auto' }}>
              {tipos.length === 0 && (
                <Typography fontSize={12} color="text.disabled" textAlign="center" py={2}>
                  Sin tipos. Agregue el primero para poder colgarle marcas.
                </Typography>
              )}
              {/* Ver todas las marcas sin acotar por tipo. */}
              {fila(
                tipoSel === '', 'Todos los tipos',
                `${marcas.length} marca(s) en total`,
                () => { setTipoSel(''); setMarcaSel(null); setLineaSel(null) },
              )}
              {tipos.map(t => (
                <Stack key={t.id} direction="row" alignItems="center" gap={0.25}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    {fila(
                      tipoSel === t.codigo, t.nombre,
                      `${t.codigo}${t.usa_llantas ? ' · usa llantas' : ''}`,
                      () => { setTipoSel(t.codigo); setMarcaSel(null); setLineaSel(null) },
                      () => {
                        if (window.confirm(`¿Eliminar el tipo "${t.nombre}"?`)) mutBorrarTipo.mutate(t.id)
                      },
                    )}
                  </Box>
                  <IconButton size="small" onClick={() => setDlgTipo({ abierto: true, item: t })}>
                    <EditIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Stack>
              ))}
            </Stack>,
          )}
        </Grid>

        {/* Marcas */}
        <Grid size={{ xs: 12, md: 3 }}>
          {columna(
            'Marcas',
            tipoSel
              ? `de ${tipos.find(t => t.codigo === tipoSel)?.nombre ?? tipoSel}`
              : `${marcas.length} en el catálogo`,
            <Button size="small" startIcon={<AddIcon />} onClick={() => {
              setFormMarca({ nombre: '', tipo_activo: tipoSel }); setDlgMarca(true)
            }} sx={{ color, textTransform: 'none' }}>Agregar</Button>,
            <Stack spacing={0.4} sx={{ maxHeight: 380, overflowY: 'auto' }}>
              {marcas.length === 0 && (
                <Typography fontSize={12} color="text.disabled" textAlign="center" py={2}>
                  Sin marcas para este tipo
                </Typography>
              )}
              {marcas.map(m => fila(
                marcaSel?.id === m.id, m.nombre,
                `${m.tipo_activo ?? 'general'} · ${m.total_lineas ?? 0} línea(s)`,
                () => { setMarcaSel(m); setLineaSel(null) },
                () => { if (window.confirm(`¿Eliminar la marca "${m.nombre}"?`)) mutBorrarMarca.mutate(m.id) },
                m.activo === false,
              ))}
            </Stack>,
          )}
        </Grid>

        {/* Líneas */}
        <Grid size={{ xs: 12, md: 3 }}>
          {columna(
            'Líneas', marcaSel ? `de ${marcaSel.nombre}` : 'elija una marca',
            marcaSel ? (
              <Button size="small" startIcon={<AddIcon />} onClick={() => setDlgLinea(true)}
                sx={{ color, textTransform: 'none' }}>Agregar</Button>
            ) : null,
            !marcaSel ? (
              <Typography fontSize={12} color="text.disabled" textAlign="center" py={4}>
                Seleccione una marca a la izquierda
              </Typography>
            ) : (
              <Stack spacing={0.4} sx={{ maxHeight: 380, overflowY: 'auto' }}>
                {lineas.length === 0 && (
                  <Typography fontSize={12} color="text.disabled" textAlign="center" py={2}>
                    {marcaSel.nombre} no tiene líneas
                  </Typography>
                )}
                {lineas.map(l => fila(
                  lineaSel?.id === l.id, l.nombre,
                  `${l.total_modelos ?? 0} modelo(s)`,
                  () => setLineaSel(l),
                  () => { if (window.confirm(`¿Eliminar la línea "${l.nombre}"?`)) mutBorrarLinea.mutate(l.id) },
                  l.activo === false,
                ))}
              </Stack>
            ),
          )}
        </Grid>

        {/* Modelos */}
        <Grid size={{ xs: 12, md: 3 }}>
          {columna(
            'Modelos', lineaSel ? `de ${lineaSel.marca ?? ''} ${lineaSel.nombre}` : 'elija una línea',
            lineaSel ? (
              <Button size="small" startIcon={<AddIcon />}
                onClick={() => setDlgModelo({ abierto: true, item: null })}
                sx={{ color, textTransform: 'none' }}>Agregar</Button>
            ) : null,
            !lineaSel ? (
              <Typography fontSize={12} color="text.disabled" textAlign="center" py={4}>
                Seleccione una línea
              </Typography>
            ) : (
              <Stack spacing={0.4} sx={{ maxHeight: 380, overflowY: 'auto' }}>
                {modelos.length === 0 && (
                  <Typography fontSize={12} color="text.disabled" textAlign="center" py={2}>
                    Sin modelos. Agregue uno con su ficha técnica.
                  </Typography>
                )}
                {modelos.map(mo => (
                  <Stack
                    key={mo.id} direction="row" alignItems="center" gap={0.5}
                    sx={{
                      px: 1, py: 0.7, borderRadius: 1, border: '1px solid #E5E7EB',
                      opacity: mo.activo === false ? 0.5 : 1,
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography fontSize={13} fontWeight={700} noWrap>{mo.nombre}</Typography>
                      <Typography fontSize={10.5} color="text.secondary" noWrap>
                        {[
                          mo.motor,
                          mo.tipo_combustible,
                          mo.numero_ejes != null ? `${mo.numero_ejes} ejes` : null,
                        ].filter(Boolean).join(' · ') || 'sin ficha técnica'}
                      </Typography>
                    </Box>
                    <Tooltip title="Editar ficha técnica">
                      <IconButton size="small" onClick={() => setDlgModelo({ abierto: true, item: mo })}>
                        <EditIcon sx={{ fontSize: 15 }} />
                      </IconButton>
                    </Tooltip>
                    <IconButton size="small" onClick={() => {
                      if (window.confirm(`¿Eliminar el modelo "${mo.nombre}"?`)) mutBorrarModelo.mutate(mo.id)
                    }}>
                      <DeleteIcon sx={{ fontSize: 15 }} />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
            ),
          )}
        </Grid>

        {/* Motores y combustibles */}
        <Grid size={{ xs: 12, md: 7 }}>
          {columna(
            'Motores', `${motores.length} configurados · se comparten entre modelos`,
            <Button size="small" startIcon={<AddIcon />} onClick={() => setDlgMotor(true)}
              sx={{ color, textTransform: 'none' }}>Agregar</Button>,
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Motor</TableCell>
                  <TableCell>Marca</TableCell>
                  <TableCell align="right">Cilindraje</TableCell>
                  <TableCell align="right">HP</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {motores.map(mo => (
                  <TableRow key={mo.id} hover sx={{ opacity: mo.activo === false ? 0.5 : 1 }}>
                    <TableCell sx={{ fontWeight: 600 }}>{mo.nombre}</TableCell>
                    <TableCell>{mo.marca ?? '—'}</TableCell>
                    <TableCell align="right">
                      {mo.cilindraje_cc != null ? `${mo.cilindraje_cc.toLocaleString('es-CO')} cc` : '—'}
                    </TableCell>
                    <TableCell align="right">{mo.potencia_hp ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>,
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          {columna(
            'Combustibles', `${combustibles.length} configurados`,
            <Button size="small" startIcon={<AddIcon />} onClick={() => setDlgComb(true)}
              sx={{ color, textTransform: 'none' }}>Agregar</Button>,
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.7 }}>
              {combustibles.map(c => (
                <Chip
                  key={c.id} size="small" label={c.nombre}
                  icon={<LocalGasStation sx={{ fontSize: 13 }} />}
                  sx={{ opacity: c.activo === false ? 0.5 : 1 }}
                />
              ))}
            </Box>,
          )}
        </Grid>
      </Grid>

      {/* Catálogos del módulo y compartidos, desde el catálogo maestro. Antes
          esta sección tenía su propia tabla, en paralelo a la de la plataforma:
          dos listas de áreas y de centros de costo para lo mismo. */}
      <Box mt={3}>
        <Typography variant="subtitle2" fontWeight={800} mb={0.5}>
          Otros catálogos del CMMS
        </Typography>
        <Typography variant="caption" color="text.secondary" display="block" mb={1.5}>
          Tipos y especialidades de contratista, más los catálogos compartidos con el resto
          de la plataforma (ciudades, sedes, áreas, cargos, centros de costo, cuentas).
        </Typography>
        <AdminCatalogos modulo="EAM" color={color} />
      </Box>

      {/* ── Diálogos ── */}
      <Dialog open={dlgTipo.abierto} onClose={() => setDlgTipo({ abierto: false, item: null })}
        maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
          {dlgTipo.item ? `Editar ${dlgTipo.item.nombre}` : 'Nuevo tipo de activo'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 0.5 }}>
            <TextField label="Nombre *" size="small" fullWidth autoFocus value={formTipo.nombre}
              onChange={e => {
                const nombre = e.target.value
                // El código se propone del nombre mientras no se toque a mano y
                // el tipo sea nuevo: editarlo en uno existente dejaría a sus
                // activos apuntando a un código que ya no existe.
                setFormTipo(f => ({
                  ...f,
                  nombre,
                  codigo: dlgTipo.item ? f.codigo
                    : nombre.trim().toUpperCase().replace(/\s+/g, '_'),
                }))
              }} />
            <TextField label="Código *" size="small" fullWidth value={formTipo.codigo}
              disabled={Boolean(dlgTipo.item)}
              onChange={e => setFormTipo(f => ({ ...f, codigo: e.target.value }))}
              helperText={dlgTipo.item
                ? 'No se cambia: los activos ya creados guardan este código'
                : 'Con el que los activos guardan su tipo'} />
            <FormControlLabel
              control={<Switch checked={formTipo.usa_llantas}
                onChange={e => setFormTipo(f => ({ ...f, usa_llantas: e.target.checked }))} />}
              label="Usa llantas" />
            <Typography fontSize={11} color="text.secondary">
              Los tipos que usan llantas son los que aparecen como vehículo en el módulo de
              Neumáticos.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDlgTipo({ abierto: false, item: null })}>Cancelar</Button>
          <Button variant="contained" sx={{ bgcolor: color }}
            disabled={!formTipo.nombre.trim() || !formTipo.codigo.trim() || mutTipo.isPending}
            onClick={() => mutTipo.mutate()}>
            {mutTipo.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dlgMarca} onClose={() => setDlgMarca(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Nueva marca</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={0.5}>
            <TextField label="Nombre *" size="small" fullWidth autoFocus
              value={formMarca.nombre}
              onChange={e => setFormMarca(f => ({ ...f, nombre: e.target.value }))} />
            <TextField select label="Tipo de activo" size="small" fullWidth
              value={formMarca.tipo_activo}
              onChange={e => setFormMarca(f => ({ ...f, tipo_activo: e.target.value }))}
              helperText="Vacío = la marca sirve para cualquier tipo">
              <MenuItem value="">General (todos)</MenuItem>
              {tipos.map(t => <MenuItem key={t.codigo} value={t.codigo}>{t.nombre}</MenuItem>)}
            </TextField>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDlgMarca(false)}>Cancelar</Button>
          <Button variant="contained" disabled={!formMarca.nombre.trim() || mutMarca.isPending}
            onClick={() => mutMarca.mutate()} sx={{ bgcolor: color }}>Agregar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dlgLinea} onClose={() => setDlgLinea(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
          Nueva línea de {marcaSel?.nombre}
        </DialogTitle>
        <DialogContent dividers>
          <TextField label="Nombre *" size="small" fullWidth autoFocus sx={{ mt: 0.5 }}
            placeholder="T880, Cascadia, NPR…"
            value={formLinea.nombre}
            onChange={e => setFormLinea({ nombre: e.target.value })} />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDlgLinea(false)}>Cancelar</Button>
          <Button variant="contained" disabled={!formLinea.nombre.trim() || mutLinea.isPending}
            onClick={() => mutLinea.mutate()} sx={{ bgcolor: color }}>Agregar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dlgModelo.abierto} onClose={() => setDlgModelo({ abierto: false, item: null })}
        maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
          {dlgModelo.item ? `Editar ${dlgModelo.item.nombre}` : 'Nuevo modelo'}
          <Typography variant="caption" color="text.secondary" display="block">
            {lineaSel?.marca} {lineaSel?.nombre} · la ficha técnica la heredan los activos
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ pt: 0.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Nombre del modelo *" size="small" fullWidth autoFocus
                value={formModelo.nombre}
                onChange={e => setFormModelo(f => ({ ...f, nombre: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField label="Año desde" type="number" size="small" fullWidth
                value={formModelo.anio_desde}
                onChange={e => setFormModelo(f => ({ ...f, anio_desde: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField label="Año hasta" type="number" size="small" fullWidth
                value={formModelo.anio_hasta}
                onChange={e => setFormModelo(f => ({ ...f, anio_hasta: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12 }}><Divider><Typography variant="caption" fontWeight={700}>FICHA TÉCNICA</Typography></Divider></Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select label="Motor" size="small" fullWidth value={formModelo.motor_id}
                onChange={e => setFormModelo(f => ({ ...f, motor_id: e.target.value }))}>
                <MenuItem value="">Sin especificar</MenuItem>
                {motores.map(mo => (
                  <MenuItem key={mo.id} value={String(mo.id)}>
                    {mo.nombre}{mo.cilindraje_cc ? ` · ${mo.cilindraje_cc} cc` : ''}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select label="Combustible" size="small" fullWidth
                value={formModelo.tipo_combustible}
                onChange={e => setFormModelo(f => ({ ...f, tipo_combustible: e.target.value }))}>
                <MenuItem value="">Sin especificar</MenuItem>
                {combustibles.map(c => <MenuItem key={c.id} value={c.nombre}>{c.nombre}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField label="N.º de ejes" type="number" size="small" fullWidth
                value={formModelo.numero_ejes}
                onChange={e => setFormModelo(f => ({ ...f, numero_ejes: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField label="Capacidad (kg)" type="number" size="small" fullWidth
                value={formModelo.capacidad_kg}
                onChange={e => setFormModelo(f => ({ ...f, capacidad_kg: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField label="Tanque (gal)" type="number" size="small" fullWidth
                value={formModelo.capacidad_combustible}
                onChange={e => setFormModelo(f => ({ ...f, capacidad_combustible: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField label="Vida útil (años)" type="number" size="small" fullWidth
                value={formModelo.vida_util_anios}
                onChange={e => setFormModelo(f => ({ ...f, vida_util_anios: e.target.value }))} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <FormControlLabel
                control={<Switch checked={formModelo.activo}
                  onChange={e => setFormModelo(f => ({ ...f, activo: e.target.checked }))} />}
                label={<Typography variant="body2">Activo</Typography>} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDlgModelo({ abierto: false, item: null })}>Cancelar</Button>
          <Button variant="contained" disabled={!formModelo.nombre.trim() || mutModelo.isPending}
            onClick={() => mutModelo.mutate()} sx={{ bgcolor: color }}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dlgMotor} onClose={() => setDlgMotor(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Nuevo motor</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={0.5}>
            <TextField label="Nombre *" size="small" fullWidth autoFocus
              placeholder="Cummins ISX15"
              value={formMotor.nombre}
              onChange={e => setFormMotor(f => ({ ...f, nombre: e.target.value }))} />
            <TextField label="Marca del motor" size="small" fullWidth
              value={formMotor.marca}
              onChange={e => setFormMotor(f => ({ ...f, marca: e.target.value }))} />
            <TextField label="Cilindraje (cc)" type="number" size="small" fullWidth
              value={formMotor.cilindraje_cc}
              onChange={e => setFormMotor(f => ({ ...f, cilindraje_cc: e.target.value }))} />
            <TextField label="Potencia (HP)" type="number" size="small" fullWidth
              value={formMotor.potencia_hp}
              onChange={e => setFormMotor(f => ({ ...f, potencia_hp: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDlgMotor(false)}>Cancelar</Button>
          <Button variant="contained" disabled={!formMotor.nombre.trim() || mutMotor.isPending}
            onClick={() => mutMotor.mutate()} sx={{ bgcolor: color }}>Agregar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={dlgComb} onClose={() => setDlgComb(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Nuevo combustible</DialogTitle>
        <DialogContent dividers>
          <TextField label="Nombre *" size="small" fullWidth autoFocus sx={{ mt: 0.5 }}
            value={formComb.nombre}
            onChange={e => setFormComb({ nombre: e.target.value })} />
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDlgComb(false)}>Cancelar</Button>
          <Button variant="contained" disabled={!formComb.nombre.trim() || mutComb.isPending}
            onClick={() => mutComb.mutate()} sx={{ bgcolor: color }}>Agregar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
