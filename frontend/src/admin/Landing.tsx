/**
 * Editor de la página pública.
 *
 * Va acá y no en un WordPress aparte: montar un CMS entero para una sola página
 * significa otro stack que parchear, otra base de datos y un sistema de usuarios
 * paralelo al que ya existe. Acá reusa la sesión, los roles y el despliegue.
 *
 * Lo que se guarda es un documento; la página lo lee al abrirse y cae a su
 * contenido de fábrica si la API no responde, así que un error acá nunca deja
 * la landing en blanco.
 */
import { useState } from 'react'
import {
  Box, Card, Typography, Stack, Button, TextField, Chip, Alert, Skeleton,
  IconButton, Tooltip, Divider, Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material'
import {
  Save, ExpandMore, Add, DeleteForever, OpenInNew, Restore, Public,
} from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { PALETA, ESTADO, COLOR_MODULO } from '@/config/marca'
import { landingApi, mensajeDeError, type EstadoLanding } from './api'

type Bloque = { clave?: string; titulo?: string; texto?: string }
type Contenido = Record<string, any>

/** Los campos de texto simple, agrupados como se ven en la página. */
const SECCIONES: { titulo: string; ayuda: string; campos: [string, string, boolean?][] }[] = [
  {
    titulo: 'Marca y enlaces', ayuda: 'Lo que aparece arriba y en el pie',
    campos: [
      ['marca_logo', 'Logotipo (texto)'],
      ['marca_nombre', 'Nombre de la marca'],
      ['marca_legal', 'Aviso legal del pie'],
      ['url_portal', 'Dirección del portal'],
      ['correo', 'Correo de contacto'],
      ['color_acento', 'Color de acento (#RRGGBB)'],
    ],
  },
  {
    titulo: 'Portada', ayuda: 'Lo primero que se ve, sobre la red de nodos',
    campos: [
      ['hero_lema', 'Lema (la píldora de arriba)'],
      ['hero_titulo', 'Titular', true],
      ['hero_bajada', 'Bajada', true],
      ['hero_boton1', 'Botón principal'],
      ['hero_boton2', 'Botón secundario'],
    ],
  },
  {
    titulo: 'El problema', ayuda: 'Por qué existe la plataforma',
    campos: [['problema_titulo', 'Título'], ['problema_texto', 'Texto', true]],
  },
  {
    titulo: 'Módulos', ayuda: 'Encabezado de la lista de módulos',
    campos: [['modulos_titulo', 'Título'], ['modulos_texto', 'Texto', true]],
  },
  {
    titulo: 'Mantenimiento en detalle', ayuda: 'La franja oscura',
    campos: [['detalle_titulo', 'Título'], ['detalle_texto', 'Texto', true]],
  },
  {
    titulo: 'Seguridad', ayuda: 'Cómo está construida',
    campos: [['seguridad_titulo', 'Título'], ['seguridad_texto', 'Texto', true]],
  },
  {
    titulo: 'Cierre', ayuda: 'La invitación final',
    campos: [['cierre_titulo', 'Título'], ['cierre_texto', 'Texto', true]],
  },
]

/** Las listas de tarjetas, que se editan igual entre sí. */
const LISTAS: { clave: string; titulo: string; ayuda: string }[] = [
  { clave: 'pilares', titulo: 'Tarjetas de «El problema»',
    ayuda: 'La clave es el número o sigla del recuadro' },
  { clave: 'detalles', titulo: 'Tarjetas de mantenimiento',
    ayuda: 'Cuatro columnas en la franja oscura' },
  { clave: 'garantias', titulo: 'Tarjetas de seguridad',
    ayuda: 'La clave suele ser un visto' },
]

export default function Landing() {
  const qc = useQueryClient()
  const [borrador, setBorrador] = useState<Contenido | null>(null)

  const { data, isLoading } = useQuery<EstadoLanding>({
    queryKey: ['landing'], queryFn: landingApi.estado,
  })

  const c: Contenido = borrador ?? data?.contenido ?? {}
  const cambiado = borrador !== null

  const set = (k: string, v: any) => setBorrador({ ...c, [k]: v })

  const publicar = useMutation({
    mutationFn: () => landingApi.publicar(c),
    onSuccess: d => {
      setBorrador(null)
      qc.setQueryData(['landing'], d)
      toast.success('Página publicada')
    },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })

  const restaurar = useMutation({
    mutationFn: landingApi.inicial,
    onSuccess: d => { setBorrador(d); toast.success('Contenido de fábrica cargado. Revise y publique.') },
    onError: (e: any) => toast.error(mensajeDeError(e)),
  })

  if (isLoading) return <Skeleton variant="rectangular" height={420} sx={{ borderRadius: 3 }} />

  const modulos: string[] = c.modulos ?? []

  const editarLista = (clave: string, i: number, campo: keyof Bloque, valor: string) =>
    set(clave, (c[clave] ?? []).map((b: Bloque, j: number) =>
      j === i ? { ...b, [campo]: valor } : b))

  return (
    <Box>
      <Stack direction="row" alignItems="flex-start" mb={2.5} flexWrap="wrap" useFlexGap>
        <Box sx={{ flex: 1, minWidth: 260 }}>
          <Typography variant="h6" fontWeight={800}>Página pública</Typography>
          <Typography variant="caption" color="text.secondary">
            Lo que se publique acá se ve de inmediato en la landing, sin desplegar nada
            {data?.actualizado_por && ` · último cambio de ${data.actualizado_por}`}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button size="small" startIcon={<OpenInNew />} variant="outlined"
            href={c.url_portal ? 'https://www.tittanware.tech' : '#'} target="_blank"
            sx={{ textTransform: 'none' }}>
            Ver la página
          </Button>
          <Button size="small" startIcon={<Restore />} onClick={() => restaurar.mutate()}
            sx={{ textTransform: 'none' }}>
            Contenido de fábrica
          </Button>
          <Button variant="contained" startIcon={<Save />} disabled={!cambiado || publicar.isPending}
            onClick={() => publicar.mutate()} sx={{ textTransform: 'none', fontWeight: 700 }}>
            {publicar.isPending ? 'Publicando…' : 'Publicar'}
          </Button>
        </Stack>
      </Stack>

      {cambiado && (
        <Alert severity="warning" sx={{ mb: 2 }}
          action={<Button size="small" onClick={() => setBorrador(null)}>Descartar</Button>}>
          Hay cambios sin publicar. La página sigue mostrando la versión anterior.
        </Alert>
      )}

      {SECCIONES.map(s => (
        <Accordion key={s.titulo} disableGutters defaultExpanded={s.titulo === 'Portada'}
          sx={{ mb: 1, borderRadius: 2, border: `1px solid ${PALETA.niebla}`,
                '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box>
              <Typography variant="body2" fontWeight={800}>{s.titulo}</Typography>
              <Typography variant="caption" color="text.secondary">{s.ayuda}</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={2}>
              {s.campos.map(([clave, etiqueta, largo]) => (
                <TextField
                  key={clave} label={etiqueta} size="small" fullWidth
                  multiline={!!largo} rows={largo ? 3 : undefined}
                  value={c[clave] ?? ''}
                  onChange={e => set(clave, e.target.value)}
                  helperText={clave === 'hero_titulo'
                    ? 'Admite <em>texto</em> para resaltar una parte en azul'
                    : undefined}
                />
              ))}
            </Stack>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Listas de tarjetas */}
      {LISTAS.map(l => (
        <Accordion key={l.clave} disableGutters
          sx={{ mb: 1, borderRadius: 2, border: `1px solid ${PALETA.niebla}`,
                '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight={800}>{l.titulo}</Typography>
              <Typography variant="caption" color="text.secondary">{l.ayuda}</Typography>
            </Box>
            <Chip label={(c[l.clave] ?? []).length} size="small" sx={{ mr: 1 }} />
          </AccordionSummary>
          <AccordionDetails>
            <Stack spacing={1.5}>
              {(c[l.clave] ?? []).map((b: Bloque, i: number) => (
                <Card key={i} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <TextField label="Clave" size="small" sx={{ width: 90 }}
                      value={b.clave ?? ''}
                      onChange={e => editarLista(l.clave, i, 'clave', e.target.value)} />
                    <Stack spacing={1} sx={{ flex: 1 }}>
                      <TextField label="Título" size="small" fullWidth value={b.titulo ?? ''}
                        onChange={e => editarLista(l.clave, i, 'titulo', e.target.value)} />
                      <TextField label="Texto" size="small" fullWidth multiline rows={2}
                        value={b.texto ?? ''}
                        onChange={e => editarLista(l.clave, i, 'texto', e.target.value)} />
                    </Stack>
                    <IconButton size="small"
                      onClick={() => set(l.clave, (c[l.clave] ?? [])
                        .filter((_: Bloque, j: number) => j !== i))}>
                      <DeleteForever fontSize="small" />
                    </IconButton>
                  </Stack>
                </Card>
              ))}
              <Box>
                <Button size="small" startIcon={<Add />} sx={{ textTransform: 'none' }}
                  onClick={() => set(l.clave, [...(c[l.clave] ?? []),
                    { clave: '', titulo: '', texto: '' }])}>
                  Agregar tarjeta
                </Button>
              </Box>
            </Stack>
          </AccordionDetails>
        </Accordion>
      ))}

      {/* Módulos */}
      <Accordion disableGutters sx={{ mb: 1, borderRadius: 2,
        border: `1px solid ${PALETA.niebla}`, '&:before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight={800}>Lista de módulos</Typography>
            <Typography variant="caption" color="text.secondary">
              Uno por línea, en el orden en que aparecen
            </Typography>
          </Box>
          <Chip label={modulos.length} size="small" sx={{ mr: 1 }} />
        </AccordionSummary>
        <AccordionDetails>
          <TextField
            fullWidth multiline rows={10} size="small"
            value={modulos.join('\n')}
            onChange={e => set('modulos',
              e.target.value.split('\n').map(x => x.trim()).filter(Boolean))}
            helperText="Cada línea es un módulo. Las líneas vacías se descartan."
          />
        </AccordionDetails>
      </Accordion>

      <Divider sx={{ my: 2.5 }} />
      <Alert severity="info" icon={<Public />}>
        La página trae este mismo contenido escrito adentro. Si la API no responde,
        se muestra esa copia en vez de quedar en blanco — un error acá nunca tumba
        la landing.
      </Alert>
    </Box>
  )
}
