/**
 * Catálogos propios del CMMS: actividades, repuestos, fallas, causas y
 * soluciones.
 *
 * Van aparte del catálogo maestro porque cada uno tiene su tabla y sus campos
 * — un repuesto lleva código, unidad y precio — y las OTs los referencian por
 * id. Antes esta tarjeta mostraba listas escritas a mano y sus botones no
 * hacían nada.
 */
import { useMemo, useState } from 'react'
import {
  Box, Card, CardContent, Typography, Stack, Button, TextField, InputAdornment,
  List, ListItem, ListItemText, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert, LinearProgress, Chip, alpha,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Add, Search, Edit, DeleteForever } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient as api } from '@/api/client'
import { CargueMasivo, type ColumnaPlantilla } from './CargueMasivo'

/** Lo que distingue a cada catálogo del resto. */
export interface DefinicionCatalogo {
  /** Segmento de /eam/catalogos/… */
  ruta: string
  titulo: string
  /** Columna que se muestra en la lista: unos usan `nombre` y otros `descripcion`. */
  campo: 'nombre' | 'descripcion'
  /** 'no' | 'opcional' | 'requerido' */
  codigo?: 'no' | 'opcional' | 'requerido'
  /** Solo los repuestos llevan unidad, categoría y precio. */
  detalleRepuesto?: boolean
  ayuda?: string
}

export const CATALOGOS_CMMS: DefinicionCatalogo[] = [
  {
    ruta: 'actividades', titulo: 'Actividades', campo: 'nombre',
    ayuda: 'Los trabajos que se pueden registrar en una orden de trabajo.',
  },
  {
    ruta: 'repuestos', titulo: 'Repuestos', campo: 'nombre', codigo: 'requerido',
    detalleRepuesto: true,
    ayuda: 'Lo que se puede consumir en una OT. El precio se propone al elegirlo.',
  },
  {
    ruta: 'fallas', titulo: 'Fallas', campo: 'descripcion', codigo: 'opcional',
    ayuda: 'Qué se dañó. Se elige al abrir la OT.',
  },
  { ruta: 'causas', titulo: 'Causas', campo: 'descripcion', ayuda: 'Por qué se dañó.' },
  { ruta: 'soluciones', titulo: 'Soluciones', campo: 'descripcion', ayuda: 'Qué se hizo.' },
]

interface ItemCatalogo {
  id: number
  nombre?: string | null
  descripcion?: string | null
  codigo?: string | null
  categoria?: string | null
  unidad_medida?: string | null
  costo_unitario?: number | null
  activo?: boolean
}

const VACIO = {
  texto: '', codigo: '', categoria: '', unidad_medida: '', costo_unitario: '',
}

export function CatalogoCMMS({ def, color = '#1A1A1A' }: {
  def: DefinicionCatalogo
  color?: string
}) {
  const qc = useQueryClient()
  const [busqueda, setBusqueda] = useState('')
  const [verTodo, setVerTodo] = useState(false)
  const [dlg, setDlg] = useState<{ abierto: boolean; item: ItemCatalogo | null }>(
    { abierto: false, item: null })
  const [form, setForm] = useState({ ...VACIO })
  const [wasOpen, setWasOpen] = useState(false)

  const clave = ['eam-catalogo', def.ruta]

  if (dlg.abierto && !wasOpen) {
    setWasOpen(true)
    const it = dlg.item
    setForm(it ? {
      texto: (def.campo === 'nombre' ? it.nombre : it.descripcion) ?? '',
      codigo: it.codigo ?? '',
      categoria: it.categoria ?? '',
      unidad_medida: it.unidad_medida ?? '',
      costo_unitario: it.costo_unitario != null ? String(it.costo_unitario) : '',
    } : { ...VACIO })
  }
  if (!dlg.abierto && wasOpen) setWasOpen(false)

  const { data: items = [], isLoading } = useQuery<ItemCatalogo[]>({
    queryKey: clave,
    queryFn: () => api.get(`/eam/catalogos/${def.ruta}`).then(r => r.data),
  })

  // Las columnas de la plantilla las declara el servidor, para que la plantilla
  // y la validación no puedan terminar diciendo cosas distintas.
  const { data: plantilla } = useQuery<{ columnas: ColumnaPlantilla[] }>({
    queryKey: ['plantilla-catalogo', def.ruta],
    queryFn: () => api.get(`/eam/catalogos/${def.ruta}/plantilla`).then(r => r.data),
    staleTime: Infinity,
  })

  const etiqueta = (i: ItemCatalogo) =>
    ((def.campo === 'nombre' ? i.nombre : i.descripcion) ?? '').trim()

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    const base = q
      ? items.filter(i => `${etiqueta(i)} ${i.codigo ?? ''}`.toLowerCase().includes(q))
      : items
    return verTodo ? base : base.slice(0, 5)
  }, [items, busqueda, verTodo])

  const err = (e: any) => {
    const d = e?.response?.data?.detail
    toast.error(typeof d === 'string' ? d : 'No se pudo guardar')
  }
  const invalidar = () => {
    qc.invalidateQueries({ queryKey: clave })
    // La pantalla de OTs lee estos mismos catálogos.
    qc.invalidateQueries({ queryKey: ['eam-actividades'] })
    qc.invalidateQueries({ queryKey: ['eam-repuestos-catalogo'] })
    qc.invalidateQueries({ queryKey: ['eam-fallas'] })
    qc.invalidateQueries({ queryKey: ['eam-causas'] })
    qc.invalidateQueries({ queryKey: ['eam-soluciones'] })
  }

  const cuerpo = () => {
    const base: Record<string, unknown> = { [def.campo]: form.texto.trim() }
    if (def.codigo && def.codigo !== 'no') base.codigo = form.codigo.trim() || null
    if (def.detalleRepuesto) {
      base.categoria = form.categoria.trim() || null
      base.unidad_medida = form.unidad_medida.trim() || null
      base.costo_unitario = Number(form.costo_unitario || 0)
    }
    return base
  }

  const mutGuardar = useMutation({
    mutationFn: () => (dlg.item
      ? api.put(`/eam/catalogos/${def.ruta}/${dlg.item.id}`, cuerpo()).then(r => r.data)
      : api.post(`/eam/catalogos/${def.ruta}`, cuerpo()).then(r => r.data)),
    onSuccess: () => {
      toast.success(dlg.item ? 'Actualizado' : 'Agregado')
      invalidar(); setDlg({ abierto: false, item: null })
    },
    onError: err,
  })

  const mutBorrar = useMutation({
    mutationFn: (id: number) => api.delete(`/eam/catalogos/${def.ruta}/${id}`),
    onSuccess: () => { toast.success('Eliminado'); invalidar() },
    onError: err,
  })

  const codigoFalta = def.codigo === 'requerido' && !form.codigo.trim()

  return (
    <Card sx={{ background: '#FFFFFF', border: '1px solid #E5E7EB', height: '100%' }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
          <Box>
            <Typography variant="subtitle2" fontWeight={700} color="#1E293B">{def.titulo}</Typography>
            <Typography variant="caption" color="grey.500">
              {items.length} {items.length === 1 ? 'registro' : 'registros'}
            </Typography>
          </Box>
          <Button size="small" startIcon={<Add />} variant="outlined"
            onClick={() => setDlg({ abierto: true, item: null })}
            sx={{
              textTransform: 'none', borderColor: alpha(color, 0.4), color, fontSize: 11,
              '&:hover': { borderColor: color, background: alpha(color, 0.1) },
            }}>
            Agregar
          </Button>
        </Stack>

        {plantilla?.columnas && (
          <Box sx={{ mb: 1.5 }}>
            <CargueMasivo
              compacto
              titulo={def.titulo}
              nombreArchivo={`plantilla-${def.ruta}`}
              columnas={plantilla.columnas}
              color={color}
              onImportar={filas =>
                api.post(`/eam/catalogos/${def.ruta}/importar`, { filas }).then(r => r.data)}
              onListo={invalidar}
            />
          </Box>
        )}

        {def.ayuda && (
          <Typography variant="caption" color="grey.600" sx={{ display: 'block', mb: 1.5 }}>
            {def.ayuda}
          </Typography>
        )}

        <TextField fullWidth size="small" placeholder="Buscar..." value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: 'grey.600', fontSize: 16 }} />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { fontSize: 13 } }} />

        {isLoading && <LinearProgress sx={{ mb: 1 }} />}
        {!isLoading && items.length === 0 && (
          <Alert severity="info" sx={{ fontSize: 12 }}>
            Todavía no hay registros. Use <strong>Agregar</strong> para el primero.
          </Alert>
        )}

        <List dense disablePadding>
          {filtrados.map(i => (
            <ListItem key={i.id} disablePadding
              sx={{ py: 0.25, '&:hover .acciones': { opacity: 1 } }}
              secondaryAction={
                <Box className="acciones" sx={{ opacity: 0, transition: 'opacity .2s' }}>
                  <IconButton size="small" sx={{ color: 'grey.500', mr: 0.5 }}
                    onClick={() => setDlg({ abierto: true, item: i })}>
                    <Edit sx={{ fontSize: 14 }} />
                  </IconButton>
                  <IconButton size="small" sx={{ color: '#EF4444' }}
                    onClick={() => {
                      if (window.confirm(`¿Eliminar "${etiqueta(i)}"?`)) mutBorrar.mutate(i.id)
                    }}>
                    <DeleteForever sx={{ fontSize: 14 }} />
                  </IconButton>
                </Box>
              }>
              <ListItemText
                primary={
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <Typography variant="body2" color="#334155">{etiqueta(i)}</Typography>
                    {i.codigo && (
                      <Chip label={i.codigo} size="small"
                        sx={{ height: 16, fontSize: 9, bgcolor: '#F1F5F9', color: '#64748B' }} />
                    )}
                    {def.detalleRepuesto && i.unidad_medida && (
                      <Typography variant="caption" color="grey.500">· {i.unidad_medida}</Typography>
                    )}
                  </Stack>
                } />
            </ListItem>
          ))}
        </List>

        {!verTodo && filtrados.length === 5 && items.length > 5 && (
          <Typography variant="caption" sx={{ color, cursor: 'pointer', mt: 0.5, display: 'block' }}
            onClick={() => setVerTodo(true)}>
            +{items.length - 5} más →
          </Typography>
        )}
        {verTodo && items.length > 5 && (
          <Typography variant="caption" sx={{ color, cursor: 'pointer', mt: 0.5, display: 'block' }}
            onClick={() => setVerTodo(false)}>
            ← ver menos
          </Typography>
        )}

        <Dialog open={dlg.abierto} onClose={() => setDlg({ abierto: false, item: null })}
          maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>
            {dlg.item ? `Editar en ${def.titulo}` : `Agregar a ${def.titulo}`}
          </DialogTitle>
          <DialogContent dividers>
            <Grid container spacing={2} sx={{ pt: 0.5 }}>
              {def.codigo && def.codigo !== 'no' && (
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField size="small" fullWidth
                    label={def.codigo === 'requerido' ? 'Código *' : 'Código'}
                    value={form.codigo}
                    onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} />
                </Grid>
              )}
              <Grid size={{ xs: 12, sm: def.codigo && def.codigo !== 'no' ? 8 : 12 }}>
                <TextField size="small" fullWidth autoFocus label="Nombre *" value={form.texto}
                  onChange={e => setForm(f => ({ ...f, texto: e.target.value }))} />
              </Grid>
              {def.detalleRepuesto && (
                <>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField size="small" fullWidth label="Categoría" value={form.categoria}
                      onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField size="small" fullWidth label="Unidad de medida"
                      value={form.unidad_medida}
                      onChange={e => setForm(f => ({ ...f, unidad_medida: e.target.value }))} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField size="small" fullWidth type="number" label="Precio unitario"
                      value={form.costo_unitario}
                      InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                      onChange={e => setForm(f => ({ ...f, costo_unitario: e.target.value }))} />
                  </Grid>
                </>
              )}
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setDlg({ abierto: false, item: null })}>Cancelar</Button>
            <Button variant="contained"
              disabled={!form.texto.trim() || codigoFalta || mutGuardar.isPending}
              onClick={() => mutGuardar.mutate()}
              sx={{ bgcolor: color, '&:hover': { bgcolor: color } }}>
              {mutGuardar.isPending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  )
}
