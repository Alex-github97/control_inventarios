/**
 * El maestro de terceros: clientes, proveedores, empleados y socios en una sola
 * ficha.
 *
 * Están juntos y no en cuatro listas porque una misma empresa suele ser cliente
 * y proveedor a la vez, y con listas separadas termina existiendo dos veces con
 * datos tributarios distintos. Cuál de los dos manda a la hora de retener no lo
 * sabe nadie, y esa es exactamente la clase de duda que sale cara.
 *
 * Las casillas tributarias —autorretenedor, gran contribuyente, exento— no son
 * decoración: cada una cambia lo que se retiene. Por eso van en su propia
 * sección, con la explicación de qué hace cada una, en vez de perdidas entre el
 * teléfono y la dirección.
 */
import React, { useMemo, useState } from 'react'
import {
  Alert, Box, Button, Card, Checkbox, Chip, Dialog, DialogActions, DialogContent,
  DialogTitle, FormControl, FormControlLabel, InputAdornment, InputLabel,
  MenuItem, Select, Skeleton, Stack, Switch, Table, TableBody, TableCell,
  TableHead, TableRow, TextField, Tooltip, Typography, alpha,
} from '@mui/material'
import { Add, Business, Person, Search } from '@mui/icons-material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import {
  ERP_COLOR, SelectorEmpresa, mensajeDeError, pesos, useEmpresaERP,
} from './erp/nucleo'

interface Tercero {
  id: number
  tipo_identificacion: string
  numero_identificacion: string
  digito_verificacion?: string | null
  razon_social: string
  nombre_comercial?: string | null
  es_persona_natural: boolean
  es_cliente: boolean; es_proveedor: boolean; es_empleado: boolean; es_socio: boolean
  ciudad?: string | null
  codigo_municipio?: string | null
  telefono?: string | null
  email?: string | null
  responsabilidades: string[]
  regimen?: string | null
  codigo_ciiu?: string | null
  autorretenedor: boolean
  gran_contribuyente: boolean
  agente_retencion: boolean
  exento_retencion: boolean
  dias_credito: number
  cupo_credito?: number | null
  activo: boolean
}

const TIPOS_ID = [
  ['NIT', 'NIT'],
  ['CC', 'Cédula de ciudadanía'],
  ['CE', 'Cédula de extranjería'],
  ['PA', 'Pasaporte'],
  ['TI', 'Tarjeta de identidad'],
  ['NIT_EXTRANJERO', 'NIT del exterior'],
]

// Las de uso corriente. La lista de la DIAN es más larga y se puede escribir a
// mano; estas cubren lo que se marca todos los días.
const RESPONSABILIDADES = [
  ['O-13', 'Gran contribuyente'],
  ['O-15', 'Autorretenedor'],
  ['O-23', 'Agente de retención de IVA'],
  ['O-47', 'Régimen simple de tributación'],
  ['R-99-PN', 'No responsable de IVA'],
]

const PAPELES: Array<[keyof Tercero, string]> = [
  ['es_cliente', 'Cliente'],
  ['es_proveedor', 'Proveedor'],
  ['es_empleado', 'Empleado'],
  ['es_socio', 'Socio'],
]

const VACIO = {
  tipo_identificacion: 'NIT',
  numero_identificacion: '',
  razon_social: '',
  nombre_comercial: '',
  es_persona_natural: false,
  es_cliente: true, es_proveedor: false, es_empleado: false, es_socio: false,
  direccion: '', ciudad: '', codigo_municipio: '', departamento: '',
  telefono: '', email: '',
  responsabilidades: [] as string[],
  regimen: '', codigo_ciiu: '',
  autorretenedor: false, gran_contribuyente: false,
  agente_retencion: false, exento_retencion: false,
  dias_credito: 0, cupo_credito: 0,
  notas: '',
}

export default function ERPTerceros() {
  const qc = useQueryClient()
  const { empresas, empresaId, elegir } = useEmpresaERP()
  const [buscar, setBuscar] = useState('')
  const [papel, setPapel] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [editando, setEditando] = useState<Tercero | null>(null)
  const [f, setF] = useState({ ...VACIO })

  const { data: terceros = [], isLoading } = useQuery<Tercero[]>({
    queryKey: ['erp-terceros', empresaId, buscar],
    queryFn: () => apiClient
      .get('/erp/terceros', {
        params: { empresa_id: empresaId, buscar: buscar || undefined },
      })
      .then(r => r.data),
    enabled: empresaId != null,
  })

  // El dígito de verificación lo calcula el servidor mientras se escribe: es la
  // misma cuenta que hace la DIAN, y verlo mal antes de guardar evita un tercero
  // con un NIT que después no cruza contra ningún archivo.
  const { data: dv } = useQuery<{ dv: string | null }>({
    queryKey: ['erp-dv', f.numero_identificacion],
    queryFn: () => apiClient
      .get(`/erp/terceros/dv/${f.numero_identificacion}`).then(r => r.data),
    enabled: abierto && f.tipo_identificacion === 'NIT'
             && /^\d{5,}$/.test(f.numero_identificacion),
  })

  const guardar = useMutation({
    mutationFn: () => {
      const cuerpo = {
        ...f, empresa_id: empresaId,
        cupo_credito: Number(f.cupo_credito) || 0,
        dias_credito: Number(f.dias_credito) || 0,
        nombre_comercial: f.nombre_comercial || null,
        regimen: f.regimen || null,
        codigo_ciiu: f.codigo_ciiu || null,
        codigo_municipio: f.codigo_municipio || null,
      }
      return editando
        ? apiClient.put(`/erp/terceros/${editando.id}`, cuerpo)
        : apiClient.post('/erp/terceros', cuerpo)
    },
    onSuccess: () => {
      toast.success(editando ? 'Tercero actualizado' : 'Tercero creado')
      setAbierto(false); setEditando(null)
      qc.invalidateQueries({ queryKey: ['erp-terceros'] })
    },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })

  const abrir = (t: Tercero | null) => {
    setEditando(t)
    setF(t ? { ...VACIO, ...t, nombre_comercial: t.nombre_comercial ?? '',
               regimen: t.regimen ?? '', codigo_ciiu: t.codigo_ciiu ?? '',
               codigo_municipio: t.codigo_municipio ?? '',
               telefono: t.telefono ?? '', email: t.email ?? '',
               ciudad: t.ciudad ?? '', cupo_credito: t.cupo_credito ?? 0,
               responsabilidades: t.responsabilidades ?? [] } as typeof VACIO
            : { ...VACIO })
    setAbierto(true)
  }

  const visibles = useMemo(
    () => papel ? terceros.filter(t => (t as any)[papel]) : terceros,
    [terceros, papel],
  )

  // Las tres marcas que apagan una retención. Se muestran juntas en la lista
  // porque son la razón más frecuente de que un documento no retenga.
  const marcas = (t: Tercero) => [
    t.autorretenedor && 'Autorretenedor',
    t.gran_contribuyente && 'Gran contribuyente',
    t.exento_retencion && 'Exento',
  ].filter(Boolean) as string[]

  return (
    <Layout title="ERP — Terceros">
      <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>

        <Stack direction="row" alignItems="center" spacing={1.5} mb={3}>
          <Box sx={{
            width: 44, height: 44, borderRadius: 2, bgcolor: ERP_COLOR,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Business sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h5" fontWeight={700} sx={{ color: ERP_COLOR, lineHeight: 1.2 }}>
              Terceros
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Clientes, proveedores, empleados y socios, con sus datos tributarios
            </Typography>
          </Box>
          <SelectorEmpresa empresas={empresas} empresaId={empresaId} elegir={elegir} />
          <Button variant="contained" startIcon={<Add />} onClick={() => abrir(null)}
                  disabled={empresaId == null}
                  sx={{ textTransform: 'none', fontWeight: 700, bgcolor: ERP_COLOR,
                        '&:hover': { bgcolor: alpha(ERP_COLOR, 0.85) } }}>
            Nuevo tercero
          </Button>
        </Stack>

        <Stack direction="row" spacing={2} mb={2} flexWrap="wrap">
          <TextField
            size="small" placeholder="Buscar por NIT o razón social"
            value={buscar} onChange={e => setBuscar(e.target.value)}
            sx={{ width: 320 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Papel</InputLabel>
            <Select label="Papel" value={papel} onChange={e => setPapel(String(e.target.value))}>
              <MenuItem value="">Todos</MenuItem>
              {PAPELES.map(([clave, etiqueta]) => (
                <MenuItem key={String(clave)} value={String(clave)}>{etiqueta}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <Card sx={{ borderRadius: 2, overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(ERP_COLOR, 0.06) }}>
                <TableCell sx={{ fontWeight: 700, color: ERP_COLOR }}>IDENTIFICACIÓN</TableCell>
                <TableCell sx={{ fontWeight: 700, color: ERP_COLOR }}>NOMBRE</TableCell>
                <TableCell sx={{ fontWeight: 700, color: ERP_COLOR }}>PAPEL</TableCell>
                <TableCell sx={{ fontWeight: 700, color: ERP_COLOR }}>TRIBUTARIO</TableCell>
                <TableCell sx={{ fontWeight: 700, color: ERP_COLOR }}>CIUDAD</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: ERP_COLOR }}>CUPO</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: ERP_COLOR }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading && [...Array(5)].map((_, i) => (
                <TableRow key={i}><TableCell colSpan={7}><Skeleton /></TableCell></TableRow>
              ))}
              {!isLoading && visibles.length === 0 && (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    {empresaId == null
                      ? 'Cree una empresa para registrar terceros.'
                      : buscar
                        ? 'Ningún tercero coincide con la búsqueda.'
                        : 'Todavía no hay terceros registrados.'}
                  </Typography>
                </TableCell></TableRow>
              )}
              {visibles.map(t => (
                <TableRow key={t.id} hover sx={{ opacity: t.activo ? 1 : 0.5 }}>
                  <TableCell sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      {t.es_persona_natural
                        ? <Person fontSize="small" sx={{ color: 'text.disabled' }} />
                        : <Business fontSize="small" sx={{ color: 'text.disabled' }} />}
                      <span>
                        {t.numero_identificacion}
                        {t.digito_verificacion && `-${t.digito_verificacion}`}
                      </span>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{t.razon_social}</Typography>
                    {t.nombre_comercial && (
                      <Typography variant="caption" color="text.secondary">
                        {t.nombre_comercial}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {PAPELES.filter(([c]) => (t as any)[c]).map(([c, etiqueta]) => (
                        <Chip key={String(c)} size="small" variant="outlined"
                              label={etiqueta} sx={{ height: 20, fontSize: 11 }} />
                      ))}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      {marcas(t).map(m => (
                        <Tooltip key={m} title="No se le practica retención por esta condición">
                          <Chip size="small" color="warning" label={m}
                                sx={{ height: 20, fontSize: 11 }} />
                        </Tooltip>
                      ))}
                      {marcas(t).length === 0 && (
                        <Typography variant="caption" color="text.secondary">Ordinario</Typography>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>{t.ciudad ?? '—'}</TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {t.cupo_credito ? pesos(t.cupo_credito) : '—'}
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => abrir(t)} sx={{ textTransform: 'none' }}>
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </Box>

      {/* ── Ficha ──────────────────────────────────────────────────────────── */}
      <Dialog open={abierto} onClose={() => setAbierto(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editando ? `Editar ${editando.razon_social}` : 'Nuevo tercero'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>

            <Stack direction="row" spacing={2}>
              <FormControl size="small" sx={{ minWidth: 190 }}>
                <InputLabel>Tipo *</InputLabel>
                <Select label="Tipo *" value={f.tipo_identificacion}
                        onChange={e => setF({ ...f, tipo_identificacion: String(e.target.value) })}>
                  {TIPOS_ID.map(([v, n]) => <MenuItem key={v} value={v}>{n}</MenuItem>)}
                </Select>
              </FormControl>
              <TextField
                size="small" label="Número *" value={f.numero_identificacion}
                onChange={e => setF({ ...f, numero_identificacion: e.target.value.trim() })}
                sx={{ width: 200 }}
                InputProps={dv?.dv ? {
                  endAdornment: <InputAdornment position="end">-{dv.dv}</InputAdornment>,
                } : undefined}
                helperText={dv?.dv ? 'Dígito de verificación calculado' : ' '}
              />
              <FormControlLabel
                control={<Switch checked={f.es_persona_natural}
                                 onChange={e => setF({ ...f, es_persona_natural: e.target.checked })} />}
                label={<Typography variant="body2">Persona natural</Typography>}
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField size="small" fullWidth label="Razón social / Nombre *"
                         value={f.razon_social}
                         onChange={e => setF({ ...f, razon_social: e.target.value })} />
              <TextField size="small" fullWidth label="Nombre comercial"
                         value={f.nombre_comercial}
                         onChange={e => setF({ ...f, nombre_comercial: e.target.value })} />
            </Stack>

            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                QUÉ ES PARA LA EMPRESA
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {PAPELES.map(([clave, etiqueta]) => (
                  <FormControlLabel
                    key={String(clave)}
                    control={<Checkbox size="small" checked={Boolean((f as any)[clave])}
                                       onChange={e => setF({ ...f, [clave]: e.target.checked })} />}
                    label={<Typography variant="body2">{etiqueta}</Typography>}
                  />
                ))}
              </Stack>
            </Box>

            <Stack direction="row" spacing={2}>
              <TextField size="small" fullWidth label="Ciudad" value={f.ciudad}
                         onChange={e => setF({ ...f, ciudad: e.target.value })} />
              <TextField
                size="small" fullWidth label="Código de municipio"
                value={f.codigo_municipio}
                onChange={e => setF({ ...f, codigo_municipio: e.target.value })}
                helperText="DANE. Decide la tarifa de ICA."
              />
              <TextField size="small" fullWidth label="Teléfono" value={f.telefono}
                         onChange={e => setF({ ...f, telefono: e.target.value })} />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField size="small" fullWidth label="Correo" value={f.email}
                         onChange={e => setF({ ...f, email: e.target.value })} />
              <TextField size="small" fullWidth label="Dirección" value={f.direccion}
                         onChange={e => setF({ ...f, direccion: e.target.value })} />
            </Stack>

            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                CONDICIÓN TRIBUTARIA
              </Typography>
              <Alert severity="info" sx={{ my: 1 }}>
                Cada casilla de acá apaga una retención. Marcarlas por error hace
                que no se retenga cuando sí correspondía, y eso lo responde la
                empresa, no el tercero.
              </Alert>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {([
                  ['autorretenedor', 'Autorretenedor', 'Se retiene él mismo: no se le practica retefuente.'],
                  ['gran_contribuyente', 'Gran contribuyente', 'Excluido de las retenciones que así lo indiquen.'],
                  ['agente_retencion', 'Agente de retención', 'Practica retenciones a otros.'],
                  ['exento_retencion', 'Exento de retención', 'No se le practica ninguna retención.'],
                ] as Array<[string, string, string]>).map(([clave, etiqueta, ayuda]) => (
                  <Tooltip key={clave} title={ayuda}>
                    <FormControlLabel
                      control={<Checkbox size="small" checked={Boolean((f as any)[clave])}
                                         onChange={e => setF({ ...f, [clave]: e.target.checked })} />}
                      label={<Typography variant="body2">{etiqueta}</Typography>}
                    />
                  </Tooltip>
                ))}
              </Stack>

              <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Responsabilidades (RUT)</InputLabel>
                  <Select
                    multiple label="Responsabilidades (RUT)" value={f.responsabilidades}
                    onChange={e => setF({
                      ...f,
                      responsabilidades: typeof e.target.value === 'string'
                        ? e.target.value.split(',') : e.target.value,
                    })}
                    renderValue={v => (v as string[]).join(', ')}
                  >
                    {RESPONSABILIDADES.map(([c, n]) => (
                      <MenuItem key={c} value={c}>{c} · {n}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField size="small" label="Código CIIU" value={f.codigo_ciiu}
                           onChange={e => setF({ ...f, codigo_ciiu: e.target.value })}
                           sx={{ width: 160 }} />
              </Stack>
            </Box>

            <Stack direction="row" spacing={2}>
              <TextField size="small" type="number" label="Días de crédito"
                         value={f.dias_credito}
                         onChange={e => setF({ ...f, dias_credito: Number(e.target.value) })}
                         sx={{ width: 170 }} />
              <TextField size="small" type="number" label="Cupo de crédito"
                         value={f.cupo_credito}
                         onChange={e => setF({ ...f, cupo_credito: Number(e.target.value) })}
                         sx={{ width: 200 }} />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAbierto(false)} sx={{ textTransform: 'none' }}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={!f.numero_identificacion || !f.razon_social || guardar.isPending}
            onClick={() => guardar.mutate()}
            sx={{ textTransform: 'none', bgcolor: ERP_COLOR,
                  '&:hover': { bgcolor: alpha(ERP_COLOR, 0.85) } }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  )
}
