/**
 * Configuración del archivo documental.
 *
 * QUÉ SE CONFIGURA DE VERDAD
 * Los campos que cada tipo de documento pide al cargarlo. Es la única
 * configuración real del módulo, y la que decide si un archivo se puede buscar
 * después: sin el número de póliza o la placa como campo, encontrar «el SOAT
 * del ABC123» obliga a abrir documentos uno por uno.
 *
 * Lo demás —las categorías, las carpetas, los tipos, las políticas de
 * retención— se configura en sus propias pantallas, que es donde se está
 * mirando cuando hace falta cambiarlo. Duplicarlo aquí sería tener dos sitios
 * donde cambiar lo mismo, y uno de los dos quedaría desactualizado.
 */
import { useState } from 'react'
import {
  Box, Typography, Chip, alpha, MenuItem, TextField, Tooltip, Button,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Settings, Add, DragIndicator, Link as EnlaceIcono, CheckCircle,
  RemoveCircleOutline,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { dmsApi, type CampoMetadato } from '@/api/dms'
import { useCrud } from '@/components/datos/useCrud'
import { useAuthStore } from '@/store/authStore'
import {
  BORDE, DMS_COLOR, Estado, Panel, legible,
} from '@/components/dms/comunes'

/** Qué le aporta cada módulo al archivo documental. */
const ENLACES = [
  { modulo: 'gh', nombre: 'Gestión humana',
    aporta: 'Los expedientes de empleado y de conductor se abren solos con la nómina.',
    sin: 'Hay que crear cada expediente a mano.' },
  { modulo: 'tms', nombre: 'Transporte',
    aporta: 'El SOAT y la técnico-mecánica de cada vehículo quedan enlazados a su ficha.',
    sin: 'Los documentos del vehículo viven sueltos en el archivo.' },
  { modulo: 'qms', nombre: 'Calidad',
    aporta: 'Los procedimientos publicados aquí son los que cita el sistema de gestión.',
    sin: 'La versión vigente de un procedimiento se lleva por fuera.' },
  { modulo: 'crm', nombre: 'Comercial',
    aporta: 'El contrato firmado queda enlazado a la ficha del cliente.',
    sin: 'El contrato figura por su código y el documento vive aparte.' },
]

const TIPOS_DATO = [
  { valor: 'texto', etiqueta: 'Texto' },
  { valor: 'numero', etiqueta: 'Número' },
  { valor: 'fecha', etiqueta: 'Fecha' },
  { valor: 'booleano', etiqueta: 'Sí / No' },
  { valor: 'lista', etiqueta: 'Lista de opciones' },
]

export default function DMSConfig() {
  const [tipoElegido, setTipoElegido] = useState<number | ''>('')
  const modulos = useAuthStore(s => s.modulos)

  const tipos = useQuery({
    queryKey: ['dms', 'tipos'], queryFn: () => dmsApi.tipos(),
  })
  const actual = tipoElegido || tipos.data?.[0]?.id || ''

  const campos = useQuery({
    queryKey: ['dms', 'campos', actual],
    queryFn: () => dmsApi.camposDeTipo(Number(actual)),
    enabled: !!actual,
  })

  const crud = useCrud<CampoMetadato>({
    nombre: 'campo', claves: [['dms']],
    titulo: c => c.etiqueta,
    campos: () => [
      { clave: 'etiqueta', etiqueta: 'Cómo se le pregunta', tipo: 'texto',
        obligatorio: true, ancho: 8,
        ayuda: 'Lo que ve quien carga el documento: «Número de póliza».' },
      { clave: 'nombre', etiqueta: 'Clave interna', tipo: 'texto',
        obligatorio: true, ancho: 4,
        ayuda: 'Sin espacios ni tildes: numero_poliza.' },
      { clave: 'tipo_dato', etiqueta: 'Qué clase de dato', tipo: 'seleccion',
        obligatorio: true, ancho: 4, porDefecto: 'texto', opciones: TIPOS_DATO },
      { clave: 'orden', etiqueta: 'Orden', tipo: 'numero', ancho: 4,
        minimo: 1, porDefecto: 1 },
      { clave: 'requerido', etiqueta: 'Obligatorio', tipo: 'interruptor',
        ancho: 4, ayuda: 'Sin él no se puede guardar el documento.' },
      { clave: 'opciones', etiqueta: 'Opciones', tipo: 'texto', ancho: 12,
        visibleSi: v => v.tipo_dato === 'lista',
        ayuda: 'Separadas por coma.' },
    ],
    crear: d => dmsApi.crearCampo({ ...d, tipo_documento_id: Number(actual) }),
    editar: (id, d) => dmsApi.editarCampo(id, d),
    eliminar: id => dmsApi.borrarCampo(id),
    consecuencia: () =>
      'Los valores ya capturados en documentos existentes dejan de mostrarse.',
  })

  const tiene = (m: string) => modulos.includes('*') || modulos.includes(m)
  const tipoActual = tipos.data?.find(t => t.id === actual)

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${DMS_COLOR} 0%, #1E40AF 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Settings sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>
              Configuración del archivo
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Qué datos se le piden a cada clase de documento
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, lg: 7 }}>
            <Panel sx={{ p: 2.5 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>
                Campos por tipo de documento
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 2 }}>
                Son los que permiten encontrar después «el SOAT de la ABC123».
                Sin ellos hay que abrir los documentos uno por uno.
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
                <TextField select size="small" label="Tipo de documento"
                  sx={{ flex: 1, minWidth: 220 }} value={actual}
                  onChange={e => setTipoElegido(Number(e.target.value) || '')}>
                  {tipos.data?.map(t => (
                    <MenuItem key={t.id} value={t.id}>{t.nombre}</MenuItem>
                  ))}
                  {!tipos.data?.length && (
                    <MenuItem value="" disabled>No hay tipos definidos</MenuItem>
                  )}
                </TextField>
                {!!actual && (
                  <Button size="small" variant="contained" startIcon={<Add />}
                    onClick={crud.abrirNuevo} sx={{ textTransform: 'none' }}>
                    Añadir campo
                  </Button>
                )}
              </Box>

              {tipoActual && (
                <Box sx={{ display: 'flex', gap: 0.75, mb: 2, flexWrap: 'wrap' }}>
                  <Chip size="small" label={`Formatos: ${tipoActual.extensiones_permitidas || 'cualquiera'}`}
                    sx={{ fontSize: 10.5, bgcolor: '#F1F5F9' }} />
                  <Chip size="small" label={tipoActual.dias_vigencia
                    ? `Vence a los ${tipoActual.dias_vigencia} días` : 'No vence'}
                    sx={{ fontSize: 10.5, bgcolor: '#F1F5F9' }} />
                  {tipoActual.requiere_firma && (
                    <Chip size="small" label="Necesita firma" sx={{
                      fontSize: 10.5, bgcolor: alpha('#7C3AED', 0.12), color: '#7C3AED' }} />
                  )}
                  {tipoActual.requiere_aprobacion && (
                    <Chip size="small" label="Necesita aprobación" sx={{
                      fontSize: 10.5, bgcolor: alpha('#0EA5E9', 0.12), color: '#0369A1' }} />
                  )}
                </Box>
              )}

              <Estado cargando={campos.isLoading} error={campos.error}
                vacio={!campos.data?.length}
                mensajeVacio={actual
                  ? 'Este tipo no pide ningún campo adicional'
                  : 'Escoja un tipo de documento'}
                hint={actual
                  ? 'Añada los datos por los que después va a querer buscar.'
                  : undefined}>
                {campos.data?.slice().sort((a, b) => a.orden - b.orden).map(c => (
                  <Box key={c.id} sx={{
                    display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, mb: 1,
                    borderRadius: 1.5, border: `1px solid ${BORDE}`, bgcolor: '#F9FAFB',
                  }}>
                    <DragIndicator sx={{ fontSize: 16, color: 'text.disabled' }} />
                    <Box sx={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      bgcolor: alpha(DMS_COLOR, 0.15), color: DMS_COLOR,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800,
                    }}>{c.orden}</Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
                        {c.etiqueta}
                        {c.requerido && (
                          <Box component="span" sx={{ color: '#EF4444', ml: 0.5 }}>*</Box>
                        )}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary',
                                        fontFamily: 'ui-monospace, monospace' }}>
                        {c.nombre} · {TIPOS_DATO.find(t => t.valor === c.tipo_dato)?.etiqueta
                          ?? c.tipo_dato}
                      </Typography>
                    </Box>
                    <crud.Acciones registro={c} />
                  </Box>
                ))}
              </Estado>
            </Panel>
          </Grid>

          <Grid size={{ xs: 12, lg: 5 }}>
            <Panel sx={{ p: 2.5, mb: 2 }}>
              <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>
                Dónde se configura lo demás
              </Typography>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 2 }}>
                Cada cosa se cambia donde se está mirando. Duplicarlo aquí
                dejaría dos sitios y uno quedaría desactualizado.
              </Typography>
              {[
                { a: '/dms/categorias', t: 'Categorías, carpetas y tipos',
                  d: 'Qué clases de documento existen y cómo se organizan.' },
                { a: '/dms/retencion', t: 'Políticas de retención',
                  d: 'Cuánto hay que guardar cada cosa y bajo qué norma.' },
                { a: '/dms/workflow', t: 'Flujos de aprobación',
                  d: 'Por qué manos pasa un documento antes de publicarse.' },
              ].map(x => (
                <Box key={x.a} component={Link} to={x.a} sx={{
                  display: 'block', p: 1.5, mb: 1, borderRadius: 1.5,
                  border: `1px solid ${BORDE}`, textDecoration: 'none',
                  color: 'inherit', '&:hover': { borderColor: DMS_COLOR },
                }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: DMS_COLOR }}>
                    {x.t}
                  </Typography>
                  <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                    {x.d}
                  </Typography>
                </Box>
              ))}
            </Panel>

            <Panel sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <EnlaceIcono sx={{ fontSize: 18, color: DMS_COLOR }} />
                <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                  Enlaces con otros módulos
                </Typography>
              </Box>
              <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 2 }}>
                Se lee de lo que su empresa tiene contratado. No se cambia desde
                aquí: se acuerda con quien administra la plataforma.
              </Typography>
              {ENLACES.map(e => {
                const activo = tiene(e.modulo)
                return (
                  <Box key={e.modulo} sx={{
                    p: 1.5, mb: 1, borderRadius: 1.5,
                    border: `1px solid ${activo ? alpha(DMS_COLOR, 0.3) : BORDE}`,
                    bgcolor: activo ? alpha(DMS_COLOR, 0.03) : 'transparent',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      {activo
                        ? <CheckCircle sx={{ fontSize: 16, color: DMS_COLOR }} />
                        : <RemoveCircleOutline sx={{ fontSize: 16, color: 'text.disabled' }} />}
                      <Typography sx={{ fontSize: 12.5, fontWeight: 700, flex: 1 }}>
                        {e.nombre}
                      </Typography>
                      <Chip label={activo ? 'contratado' : 'no contratado'} size="small"
                        sx={{
                          height: 18, fontSize: 9.5, fontWeight: 700,
                          bgcolor: activo ? alpha(DMS_COLOR, 0.15) : '#F1F5F9',
                          color: activo ? DMS_COLOR : 'text.secondary',
                        }} />
                    </Box>
                    <Typography sx={{ fontSize: 11.5, lineHeight: 1.5,
                                      color: activo ? 'text.primary' : 'text.secondary' }}>
                      {activo ? e.aporta : e.sin}
                    </Typography>
                  </Box>
                )
              })}
            </Panel>
          </Grid>
        </Grid>

        <crud.Dialogos />
      </Box>
    </Layout>
  )
}
