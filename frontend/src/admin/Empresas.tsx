/**
 * Las empresas de la plataforma y la gente de cada una.
 *
 * La columna de usuarios no es decorativa: una empresa en cero no la puede usar
 * nadie, y esa era la situación en la que quedaba toda empresa recién creada
 * antes de que el alta incluyera a su primer administrador.
 */
import { useState } from 'react'
import {
  Box, Card, Typography, Button, Table, TableBody, TableCell, TableHead, TableRow,
  Chip, IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Stack, Alert, Skeleton, MenuItem, Tabs, Tab,
} from '@mui/material'
import {
  Add, Business, Block, PlayArrow, Key, PersonAdd, ArrowBack, Edit,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { PALETA, ESTADO, COLOR_MODULO } from '@/config/marca'
import { consolaApi, mensajeDeError, type Empresa, type ClaveEntregada } from './api'
import { ClaveDialog } from './ClaveDialog'
import Modulos from './Modulos'
import Comercial from './Comercial'
import Directorio from './Directorio'
import Uso from './Uso'

const ROLES = ['ADMINISTRADOR', 'SUPERVISOR_LOGISTICO', 'OPERADOR_BODEGA', 'AUDITOR', 'CONSULTA', 'CONDUCTOR']

const VACIA = {
  codigo: '', nombre: '', nit: '',
  admin_nombre: 'Administrador', admin_apellido: '', admin_email: '', admin_username: 'admin',
}

// ─── Alta de empresa ──────────────────────────────────────────────────────────

function DialogoNuevaEmpresa({
  abierto, onCerrar, onCreada,
}: {
  abierto: boolean
  onCerrar: () => void
  onCreada: (acceso: ClaveEntregada, empresa: string) => void
}) {
  const [f, setF] = useState({ ...VACIA })
  const qc = useQueryClient()

  const crear = useMutation({
    mutationFn: () => consolaApi.crearEmpresa({ ...f, nit: f.nit || null }),
    onSuccess: r => {
      qc.invalidateQueries({ queryKey: ['empresas'] })
      onCreada(r.acceso, r.empresa.codigo)
      setF({ ...VACIA })
      onCerrar()
    },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })

  const cambiar = (k: keyof typeof VACIA) => (e: any) => setF(p => ({ ...p, [k]: e.target.value }))

  return (
    <Dialog open={abierto} onClose={onCerrar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Nueva empresa</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          El código será el nombre del esquema donde vivirán sus datos, así que
          <strong> no se puede cambiar después</strong>. Solo minúsculas, dígitos y
          guion bajo, empezando por letra.
        </Alert>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Código" value={f.codigo} onChange={cambiar('codigo')} fullWidth required
            inputProps={{ style: { textTransform: 'lowercase' }, maxLength: 40 }}
            helperText="Es lo que la empresa escribirá al entrar al portal"
          />
          <TextField label="Nombre" value={f.nombre} onChange={cambiar('nombre')} fullWidth required />
          <TextField label="NIT (opcional)" value={f.nit} onChange={cambiar('nit')} fullWidth />

          <Typography variant="subtitle2" sx={{ pt: 1, fontWeight: 700 }}>
            Primer administrador
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: -1 }}>
            Va en el mismo paso a propósito: una empresa sin usuarios no la puede usar nadie.
          </Typography>
          <Stack direction="row" spacing={2}>
            <TextField label="Nombre" value={f.admin_nombre} onChange={cambiar('admin_nombre')} fullWidth />
            <TextField label="Apellido" value={f.admin_apellido} onChange={cambiar('admin_apellido')} fullWidth />
          </Stack>
          <TextField
            label="Usuario" value={f.admin_username} onChange={cambiar('admin_username')} fullWidth required
            inputProps={{ style: { textTransform: 'lowercase' } }}
          />
          <TextField
            label="Correo" type="email" value={f.admin_email} onChange={cambiar('admin_email')}
            fullWidth required
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCerrar} sx={{ textTransform: 'none' }}>Cancelar</Button>
        <Button
          variant="contained" onClick={() => crear.mutate()}
          disabled={crear.isPending || !f.codigo.trim() || !f.nombre.trim() || !f.admin_email.trim()}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          {crear.isPending ? 'Creando el esquema…' : 'Crear empresa'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Alta de usuario dentro de una empresa ────────────────────────────────────

const USUARIO_VACIO = { nombre: '', apellido: '', email: '', username: '', rol: 'CONSULTA', cargo: '' }

function DialogoNuevoUsuario({
  empresa, abierto, onCerrar, onCreado,
}: {
  empresa: Empresa | null
  abierto: boolean
  onCerrar: () => void
  onCreado: (acceso: ClaveEntregada) => void
}) {
  const [f, setF] = useState({ ...USUARIO_VACIO })
  const qc = useQueryClient()

  const crear = useMutation({
    mutationFn: () => consolaApi.crearUsuario(empresa!.id, { ...f, cargo: f.cargo || null }),
    onSuccess: a => {
      qc.invalidateQueries({ queryKey: ['usuarios', empresa?.id] })
      qc.invalidateQueries({ queryKey: ['empresas'] })
      onCreado(a); setF({ ...USUARIO_VACIO }); onCerrar()
    },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })

  const cambiar = (k: keyof typeof USUARIO_VACIO) => (e: any) =>
    setF(p => ({ ...p, [k]: e.target.value }))

  return (
    <Dialog open={abierto} onClose={onCerrar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        Nuevo usuario en {empresa?.nombre}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction="row" spacing={2}>
            <TextField label="Nombre" value={f.nombre} onChange={cambiar('nombre')} fullWidth required />
            <TextField label="Apellido" value={f.apellido} onChange={cambiar('apellido')} fullWidth />
          </Stack>
          <TextField
            label="Usuario" value={f.username} onChange={cambiar('username')} fullWidth required
            inputProps={{ style: { textTransform: 'lowercase' } }}
          />
          <TextField label="Correo" type="email" value={f.email} onChange={cambiar('email')} fullWidth required />
          <TextField select label="Rol" value={f.rol} onChange={cambiar('rol')} fullWidth>
            {ROLES.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>
          <TextField label="Cargo (opcional)" value={f.cargo} onChange={cambiar('cargo')} fullWidth />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCerrar} sx={{ textTransform: 'none' }}>Cancelar</Button>
        <Button
          variant="contained" onClick={() => crear.mutate()}
          disabled={crear.isPending || !f.nombre.trim() || !f.username.trim() || !f.email.trim()}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          Crear usuario
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Ficha de una empresa: su gente ───────────────────────────────────────────

function PestanaUsuarios({
  empresa, onClave,
}: {
  empresa: Empresa
  onClave: (a: ClaveEntregada) => void
}) {
  const qc = useQueryClient()
  const [nuevo, setNuevo] = useState(false)

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ['usuarios', empresa.id],
    queryFn: () => consolaApi.usuarios(empresa.id),
  })

  const clave = useMutation({
    mutationFn: (uid: number) => consolaApi.restablecerClave(empresa.id, uid),
    onSuccess: onClave,
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })

  const estado = useMutation({
    mutationFn: ({ uid, activo }: { uid: number; activo: boolean }) =>
      consolaApi.editarUsuario(empresa.id, uid, { activo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios', empresa.id] })
      qc.invalidateQueries({ queryKey: ['empresas'] })
      toast.success('Usuario actualizado')
    },
    // El servidor impide dejar a una empresa sin administrador activo; el
    // mensaje explica por qué y qué hacer antes.
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })

  return (
    <Box>
      <Stack direction="row" justifyContent="flex-end" mb={2}>
        <Button
          startIcon={<PersonAdd />} variant="contained" onClick={() => setNuevo(true)}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          Nuevo usuario
        </Button>
      </Stack>

      <Card sx={{ borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>USUARIO</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>NOMBRE</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>CORREO</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>ROL</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>ESTADO</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>ACCIONES</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && [0, 1, 2].map(i => (
              <TableRow key={i}><TableCell colSpan={6}><Skeleton height={28} /></TableCell></TableRow>
            ))}
            {!isLoading && usuarios.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Alert severity="warning" sx={{ my: 1 }}>
                    Esta empresa no tiene ningún usuario, así que nadie puede entrar a ella.
                    Cree al menos un administrador.
                  </Alert>
                </TableCell>
              </TableRow>
            )}
            {usuarios.map(u => (
              <TableRow key={u.id} hover>
                <TableCell sx={{ fontWeight: 700 }}>{u.username}</TableCell>
                <TableCell>{`${u.nombre} ${u.apellido}`.trim()}</TableCell>
                <TableCell sx={{ color: PALETA.grafito }}>{u.email}</TableCell>
                <TableCell>
                  <Chip label={u.rol} size="small" variant="outlined" sx={{ fontSize: 11 }} />
                </TableCell>
                <TableCell>
                  <Chip
                    label={u.activo ? 'Activo' : 'Inactivo'} size="small"
                    sx={{
                      fontSize: 11, fontWeight: 700,
                      bgcolor: u.activo ? `${ESTADO.exito}1A` : `${PALETA.acero}26`,
                      color: u.activo ? ESTADO.exito : PALETA.grafito,
                    }}
                  />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Restablecer contraseña">
                    <IconButton size="small" onClick={() => clave.mutate(u.id)} disabled={clave.isPending}>
                      <Key fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={u.activo ? 'Desactivar' : 'Activar'}>
                    <IconButton
                      size="small"
                      onClick={() => estado.mutate({ uid: u.id, activo: !u.activo })}
                      disabled={estado.isPending}
                    >
                      {u.activo ? <Block fontSize="small" /> : <PlayArrow fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <DialogoNuevoUsuario
        empresa={empresa} abierto={nuevo}
        onCerrar={() => setNuevo(false)} onCreado={onClave}
      />
    </Box>
  )
}


// ─── Ficha completa de una empresa ────────────────────────────────────────────

const PESTANAS = ['Usuarios', 'Módulos', 'Comercial', 'Contactos y documentos', 'Uso'] as const

function FichaEmpresa({
  empresa, onVolver, onClave,
}: {
  empresa: Empresa
  onVolver: () => void
  onClave: (a: ClaveEntregada) => void
}) {
  const [pestana, setPestana] = useState(0)

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} mb={1}>
        <IconButton onClick={onVolver}><ArrowBack /></IconButton>
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h6" fontWeight={800}>{empresa.nombre}</Typography>
            {!empresa.activo && (
              <Chip label="Suspendida" size="small" sx={{
                fontWeight: 700, fontSize: 11,
                bgcolor: `${ESTADO.peligro}1A`, color: ESTADO.peligro,
              }} />
            )}
          </Stack>
          <Typography variant="caption" color="text.secondary">
            código «{empresa.codigo}» · esquema {empresa.esquema}
            {empresa.nit ? ` · NIT ${empresa.nit}` : ''}
          </Typography>
        </Box>
      </Stack>

      <Tabs
        value={pestana} onChange={(_, v) => setPestana(v)}
        variant="scrollable" scrollButtons="auto"
        sx={{ mb: 2.5, borderBottom: `1px solid ${PALETA.niebla}`,
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, minHeight: 44 } }}
      >
        {PESTANAS.map(p => <Tab key={p} label={p} />)}
      </Tabs>

      {pestana === 0 && <PestanaUsuarios empresa={empresa} onClave={onClave} />}
      {pestana === 1 && <Modulos empresa={empresa} />}
      {pestana === 2 && <Comercial empresa={empresa} />}
      {pestana === 3 && <Directorio empresa={empresa} />}
      {pestana === 4 && <Uso empresa={empresa} />}
    </Box>
  )
}

// ─── Edición de los datos de la empresa ───────────────────────────────────────

function DialogoEditar({
  empresa, onCerrar,
}: {
  empresa: Empresa | null
  onCerrar: () => void
}) {
  const qc = useQueryClient()
  const [f, setF] = useState({ nombre: '', nit: '', logo_url: '' })
  const [listo, setListo] = useState<number | null>(null)

  // Se siembra el formulario la primera vez que se abre para cada empresa; sin
  // esto, reabrirlo mostraría los datos de la anterior.
  if (empresa && listo !== empresa.id) {
    setListo(empresa.id)
    setF({ nombre: empresa.nombre, nit: empresa.nit ?? '', logo_url: empresa.logo_url ?? '' })
  }

  const guardar = useMutation({
    mutationFn: () => consolaApi.editarEmpresa(empresa!.id, {
      nombre: f.nombre, nit: f.nit || null, logo_url: f.logo_url || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['empresas'] })
      toast.success('Empresa actualizada'); onCerrar()
    },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })

  return (
    <Dialog open={!!empresa} onClose={onCerrar} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Editar empresa</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Código" value={empresa?.codigo ?? ''} fullWidth disabled
            helperText="No se puede cambiar: es el nombre del esquema de sus datos"
          />
          <TextField label="Nombre" value={f.nombre} fullWidth
            onChange={e => setF(p => ({ ...p, nombre: e.target.value }))} />
          <TextField label="NIT" value={f.nit} fullWidth
            onChange={e => setF(p => ({ ...p, nit: e.target.value }))} />
          <TextField label="URL del logo" value={f.logo_url} fullWidth
            onChange={e => setF(p => ({ ...p, logo_url: e.target.value }))}
            helperText="Se muestra en la pantalla de ingreso de esa empresa" />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCerrar} sx={{ textTransform: 'none' }}>Cancelar</Button>
        <Button variant="contained" onClick={() => guardar.mutate()} disabled={guardar.isPending}
          sx={{ textTransform: 'none', fontWeight: 700 }}>Guardar</Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── Listado ──────────────────────────────────────────────────────────────────

export default function Empresas() {
  const qc = useQueryClient()
  const [abierta, setAbierta] = useState<Empresa | null>(null)
  const [editando, setEditando] = useState<Empresa | null>(null)
  const [nueva, setNueva] = useState(false)
  const [acceso, setAcceso] = useState<{ a: ClaveEntregada; empresa?: string } | null>(null)

  const { data: empresas = [], isLoading } = useQuery({
    queryKey: ['empresas'], queryFn: consolaApi.empresas,
  })

  const estado = useMutation({
    mutationFn: ({ id, activo }: { id: number; activo: boolean }) =>
      consolaApi.cambiarEstado(id, activo),
    onSuccess: e => {
      qc.invalidateQueries({ queryKey: ['empresas'] })
      toast.success(e.activo ? 'Empresa reactivada' : 'Empresa suspendida')
    },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })

  // La ficha reemplaza al listado: son dos vistas del mismo espacio.
  if (abierta) {
    const viva = empresas.find(e => e.id === abierta.id) ?? abierta
    return (
      <>
        <FichaEmpresa
          empresa={viva} onVolver={() => setAbierta(null)}
          onClave={a => setAcceso({ a, empresa: viva.codigo })}
        />
        <ClaveDialog
          acceso={acceso?.a ?? null} empresa={acceso?.empresa} onCerrar={() => setAcceso(null)}
        />
      </>
    )
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" mb={2.5}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={800}>Empresas</Typography>
          <Typography variant="caption" color="text.secondary">
            {empresas.length} en la plataforma
          </Typography>
        </Box>
        <Button
          startIcon={<Add />} variant="contained" onClick={() => setNueva(true)}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          Nueva empresa
        </Button>
      </Stack>

      <Card sx={{ borderRadius: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>CÓDIGO</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>NOMBRE</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>USUARIOS</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>ESTADO</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700 }}>ACCIONES</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading && [0, 1, 2].map(i => (
              <TableRow key={i}><TableCell colSpan={5}><Skeleton height={30} /></TableCell></TableRow>
            ))}
            {empresas.map(e => (
              <TableRow
                key={e.id} hover sx={{ cursor: 'pointer' }}
                onClick={() => setAbierta(e)}
              >
                <TableCell sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                  {e.codigo}
                  {e.es_operador && (
                    <Chip label="operadora" size="small" sx={{
                      ml: 1, height: 18, fontSize: 10, fontWeight: 700,
                      bgcolor: `${COLOR_MODULO}1A`, color: COLOR_MODULO,
                    }} />
                  )}
                </TableCell>
                <TableCell>{e.nombre}</TableCell>
                <TableCell>
                  {e.usuarios === 0 ? (
                    <Tooltip title="Sin usuarios: nadie puede entrar a esta empresa">
                      <Chip label="0" size="small" sx={{
                        height: 20, fontWeight: 800,
                        bgcolor: `${ESTADO.alerta}1F`, color: ESTADO.alerta,
                      }} />
                    </Tooltip>
                  ) : (
                    <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {e.usuarios_activos} de {e.usuarios}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={e.activo ? 'Activa' : 'Suspendida'} size="small"
                    sx={{
                      fontWeight: 700, fontSize: 11,
                      bgcolor: e.activo ? `${ESTADO.exito}1A` : `${ESTADO.peligro}1A`,
                      color: e.activo ? ESTADO.exito : ESTADO.peligro,
                    }}
                  />
                </TableCell>
                <TableCell align="right" onClick={ev => ev.stopPropagation()}>
                  <Tooltip title="Editar">
                    <IconButton size="small" onClick={() => setEditando(e)}>
                      <Edit fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={e.es_operador
                    ? 'La empresa operadora no se puede suspender'
                    : (e.activo ? 'Suspender el acceso' : 'Reactivar')}>
                    <span>
                      <IconButton
                        size="small" disabled={e.es_operador || estado.isPending}
                        onClick={() => estado.mutate({ id: e.id, activo: !e.activo })}
                      >
                        {e.activo ? <Block fontSize="small" /> : <PlayArrow fontSize="small" />}
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
            {!isLoading && empresas.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  <Box sx={{ textAlign: 'center', py: 4, color: PALETA.acero }}>
                    <Business sx={{ fontSize: 40, opacity: 0.4 }} />
                    <Typography variant="body2" mt={1}>Todavía no hay empresas</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <DialogoNuevaEmpresa
        abierto={nueva} onCerrar={() => setNueva(false)}
        onCreada={(a, empresa) => setAcceso({ a, empresa })}
      />
      <DialogoEditar empresa={editando} onCerrar={() => setEditando(null)} />
      <ClaveDialog
        acceso={acceso?.a ?? null} empresa={acceso?.empresa} onCerrar={() => setAcceso(null)}
      />
    </Box>
  )
}
