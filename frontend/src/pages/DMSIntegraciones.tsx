/**
 * De dónde vienen los documentos del archivo.
 *
 * QUÉ MUESTRA, Y POR QUÉ ASÍ
 * La maqueta traía ocho integraciones con interruptores de encendido que no
 * encendían nada. Aquí se muestra lo que sí se puede saber: cuántos documentos
 * entraron por cada módulo, contados del campo `modulo_origen` que cada
 * documento trae. Un interruptor que no hace nada es peor que no tenerlo,
 * porque alguien lo apaga creyendo que apagó algo.
 *
 * Lo que está contratado se lee de la plataforma; activarlo o no es una
 * decisión comercial que no se toma desde esta pantalla.
 */
import { useMemo } from 'react'
import { Box, Typography, Chip, alpha, Tooltip } from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Hub, CheckCircle, RemoveCircleOutline, ArrowForward, Inbox,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { dmsApi } from '@/api/dms'
import { useAuthStore } from '@/store/authStore'
import {
  BORDE, DMS_COLOR, Estado, Panel, legible,
} from '@/components/dms/comunes'

/** Qué documentos aporta cada módulo, y qué se pierde si no está. */
const ORIGENES = [
  { clave: 'GH', modulo: 'gh', nombre: 'Gestión humana', color: '#7C3AED',
    aporta: 'Contratos laborales, hojas de vida y exámenes ocupacionales; abre '
          + 'el expediente de cada persona al contratarla.',
    sin: 'Cada expediente de personal hay que abrirlo y llenarlo a mano.' },
  { clave: 'TMS', modulo: 'tms', nombre: 'Transporte', color: '#059669',
    aporta: 'SOAT, técnico-mecánica y tarjeta de propiedad de cada vehículo, '
          + 'con su vencimiento enlazado a la ficha del camión.',
    sin: 'Los papeles del vehículo se archivan sueltos y nadie avisa cuando '
       + 'vence un SOAT.' },
  { clave: 'QMS', modulo: 'qms', nombre: 'Calidad', color: '#0EA5E9',
    aporta: 'Procedimientos e instructivos; la versión publicada aquí es la que '
          + 'cita el sistema de gestión.',
    sin: 'La versión vigente de un procedimiento se lleva por fuera y se '
       + 'desincroniza.' },
  { clave: 'CRM', modulo: 'crm', nombre: 'Comercial', color: '#B91C1C',
    aporta: 'Contratos con clientes y pólizas, enlazados a la ficha de la cuenta.',
    sin: 'El contrato figura por su código y el documento vive en otra parte.' },
  { clave: 'ERP', modulo: 'erp', nombre: 'Contabilidad', color: '#F59E0B',
    aporta: 'Estados financieros y soportes contables con su plazo legal de '
          + 'conservación.',
    sin: 'Los soportes contables se conservan sin política y sin aviso de plazo.' },
  { clave: 'SST', modulo: 'sst', nombre: 'Seguridad y salud', color: '#EF4444',
    aporta: 'Matrices de riesgo y exámenes periódicos, con la vigencia que exige '
          + 'la norma.',
    sin: 'Los exámenes vencidos no se detectan hasta la visita de la ARL.' },
]

export default function DMSIntegraciones() {
  const modulos = useAuthStore(s => s.modulos)

  const documentos = useQuery({
    queryKey: ['dms', 'documentos', 'todos'], queryFn: () => dmsApi.documentos(),
  })
  const tipos = useQuery({
    queryKey: ['dms', 'tipos'], queryFn: () => dmsApi.tipos(),
    staleTime: 10 * 60 * 1000,
  })
  const categorias = useQuery({
    queryKey: ['dms', 'categorias'], queryFn: () => dmsApi.categorias(),
    staleTime: 10 * 60 * 1000,
  })

  const tiene = (m: string) => modulos.includes('*') || modulos.includes(m)

  // Cuántos documentos hay de los tipos que aporta cada módulo. Se cuenta por
  // la categoría del tipo, que es la relación que de verdad existe hoy: el
  // campo `modulo_origen` solo lo llena lo que entra automáticamente.
  const conteo = useMemo(() => {
    const porCategoria: Record<string, number> = {}
    const catDeTipo = new Map<string, number | null | undefined>()
    for (const t of tipos.data ?? []) catDeTipo.set(t.nombre, t.categoria_id)
    const nombreCat = new Map((categorias.data ?? []).map(c => [c.id, c.nombre]))
    for (const d of documentos.data ?? []) {
      const cid = catDeTipo.get(d.tipo_nombre || '')
      const cat = cid ? nombreCat.get(cid) : undefined
      if (cat) porCategoria[cat] = (porCategoria[cat] || 0) + 1
    }
    return porCategoria
  }, [documentos.data, tipos.data, categorias.data])

  // La categoría que corresponde a cada módulo, por su nombre.
  const CATEGORIA_DE = {
    GH: 'Talento humano', TMS: 'Operaciones', QMS: 'Calidad',
    CRM: 'Legal y contratos', ERP: 'Financiero', SST: 'Seguridad y salud',
  } as Record<string, string>

  const total = (documentos.data ?? []).length
  const conectados = ORIGENES.filter(o => tiene(o.modulo))

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${DMS_COLOR} 0%, #1E40AF 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Hub sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>
              De dónde vienen los documentos
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Qué módulo aporta cada clase de papel, y cuántos hay
            </Typography>
          </Box>
        </Box>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[
            { label: 'Módulos conectados',
              value: `${conectados.length} de ${ORIGENES.length}`, color: DMS_COLOR },
            { label: 'Documentos en el archivo', value: total, color: '#059669' },
            { label: 'Categorías con contenido',
              value: Object.keys(conteo).length, color: '#0EA5E9' },
            { label: 'Sin clasificar',
              value: total - Object.values(conteo).reduce((a, b) => a + b, 0),
              color: '#F59E0B' },
          ].map((s, i) => (
            <Grid key={i} size={{ xs: 6, md: 3 }}>
              <Box sx={{ border: `1px solid ${alpha(s.color, 0.3)}`, borderRadius: 2, p: 2 }}>
                <Typography sx={{ fontSize: 24, fontWeight: 900, lineHeight: 1,
                                  fontVariantNumeric: 'tabular-nums' }}>
                  {documentos.isLoading ? '·' : s.value}
                </Typography>
                <Typography sx={{ fontSize: 11, color: s.color, fontWeight: 600, mt: 0.25 }}>
                  {s.label}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        <Estado cargando={documentos.isLoading} error={documentos.error} vacio={false}>
          <Grid container spacing={2}>
            {ORIGENES.map(o => {
              const activo = tiene(o.modulo)
              const n = conteo[CATEGORIA_DE[o.clave]] ?? 0
              return (
                <Grid key={o.clave} size={{ xs: 12, md: 6 }}>
                  <Panel sx={{
                    p: 2.25, height: '100%',
                    borderColor: activo ? alpha(o.color, 0.35) : BORDE,
                    bgcolor: activo ? alpha(o.color, 0.03) : 'background.paper',
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1 }}>
                      <Box sx={{
                        width: 34, height: 34, borderRadius: '9px', flexShrink: 0,
                        bgcolor: alpha(o.color, activo ? 0.15 : 0.07),
                        color: activo ? o.color : '#94A3B8',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 900,
                      }}>{o.clave}</Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                          {o.nombre}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <ArrowForward sx={{ fontSize: 12, color: 'text.disabled' }} />
                          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                            archivo documental
                          </Typography>
                        </Box>
                      </Box>
                      {activo
                        ? <CheckCircle sx={{ fontSize: 18, color: o.color }} />
                        : <RemoveCircleOutline sx={{ fontSize: 18, color: 'text.disabled' }} />}
                    </Box>

                    <Typography sx={{
                      fontSize: 12.5, lineHeight: 1.55, mb: 1.25,
                      color: activo ? 'text.primary' : 'text.secondary',
                    }}>
                      {activo ? o.aporta : o.sin}
                    </Typography>

                    <Box sx={{
                      display: 'flex', alignItems: 'center', gap: 1,
                      pt: 1.25, borderTop: `1px solid ${BORDE}`,
                    }}>
                      <Inbox sx={{ fontSize: 15, color: activo ? o.color : '#94A3B8' }} />
                      <Tooltip title={`Documentos de la categoría «${CATEGORIA_DE[o.clave]}»`}>
                        <Typography sx={{ fontSize: 12, flex: 1 }}>
                          <Box component="span" sx={{ fontWeight: 800, color: o.color }}>
                            {n}
                          </Box>
                          {' '}documento(s) en el archivo
                        </Typography>
                      </Tooltip>
                      <Chip label={activo ? 'contratado' : 'no contratado'} size="small"
                        sx={{
                          height: 19, fontSize: 9.5, fontWeight: 700,
                          bgcolor: activo ? alpha(o.color, 0.15) : '#F1F5F9',
                          color: activo ? o.color : 'text.secondary',
                        }} />
                    </Box>
                  </Panel>
                </Grid>
              )
            })}
          </Grid>
        </Estado>

        <Typography sx={{ fontSize: 11.5, color: 'text.disabled', mt: 2 }}>
          El conteo se hace por la categoría del tipo de documento, que es la
          relación que existe hoy. Qué módulos tiene contratados su empresa se
          acuerda con quien le administra la plataforma.
        </Typography>
      </Box>
    </Layout>
  )
}
