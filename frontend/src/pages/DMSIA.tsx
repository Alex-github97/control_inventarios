/**
 * Señales del archivo: qué conviene revisar y por qué.
 *
 * POR QUÉ NO SE LLAMA «INTELIGENCIA ARTIFICIAL»
 * Porque no lo es. Son reglas explícitas sobre datos que ya están: qué se
 * vence, qué lleva semanas esperando una firma, qué expediente está a medias,
 * qué tipo de documento no tiene política de retención. Cada línea dice de qué
 * dato sale, y por eso se puede discutir. Una recomendación que no se puede
 * rebatir no se aplica: se ignora.
 *
 * La maqueta tenía un análisis de causa raíz con un diagrama inventado. Se
 * quitó: no hay modelo detrás, y un diagrama que sale igual pase lo que pase
 * hace desconfiar del resto del módulo.
 */
import { useMemo, useState } from 'react'
import { Box, Typography, Chip, alpha, Tabs, Tab } from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  AutoAwesome, EventBusy, Draw, Inventory2, Gavel, LayersOutlined,
} from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { dmsApi, peso } from '@/api/dms'
import {
  BORDE, DMS_COLOR, Estado, Panel, IconoArchivo, fecha, legible, vigencia,
} from '@/components/dms/comunes'

interface Senal {
  tipo: 'VENCE' | 'FIRMA_VARADA' | 'EXPEDIENTE' | 'SIN_RETENCION' | 'VERSIONES'
  titulo: string
  razon: string
  urgencia: number
  referencia?: string
}

const CFG: Record<Senal['tipo'], { color: string; icono: JSX.Element; nombre: string }> = {
  VENCE:         { color: '#EF4444', icono: <EventBusy sx={{ fontSize: 16 }} />, nombre: 'Vencimiento' },
  FIRMA_VARADA:  { color: '#F59E0B', icono: <Draw sx={{ fontSize: 16 }} />, nombre: 'Firma varada' },
  EXPEDIENTE:    { color: '#0EA5E9', icono: <Inventory2 sx={{ fontSize: 16 }} />, nombre: 'Expediente' },
  SIN_RETENCION: { color: '#7C3AED', icono: <Gavel sx={{ fontSize: 16 }} />, nombre: 'Sin política' },
  VERSIONES:     { color: '#6B7280', icono: <LayersOutlined sx={{ fontSize: 16 }} />, nombre: 'Versiones' },
}

export default function DMSIA() {
  const [tipo, setTipo] = useState<string>('Todas')
  const [tab, setTab] = useState(0)

  const documentos = useQuery({
    queryKey: ['dms', 'documentos', 'todos'], queryFn: () => dmsApi.documentos(),
  })
  const firmas = useQuery({
    queryKey: ['dms', 'firmas', 'PENDIENTE'],
    queryFn: () => dmsApi.firmas({ estado: 'PENDIENTE' }),
  })
  const expedientes = useQuery({
    queryKey: ['dms', 'expedientes'], queryFn: () => dmsApi.expedientes(),
  })
  const tipos = useQuery({
    queryKey: ['dms', 'tipos'], queryFn: () => dmsApi.tipos(),
  })
  const politicas = useQuery({
    queryKey: ['dms', 'retenciones'], queryFn: () => dmsApi.retenciones(),
  })

  const senales = useMemo<Senal[]>(() => {
    const s: Senal[] = []
    const docs = documentos.data ?? []

    // Lo vencido y lo que se vence pronto.
    for (const d of docs) {
      const v = vigencia(d.fecha_vigencia_fin)
      if (v.dias == null || v.dias > 60) continue
      s.push({
        tipo: 'VENCE',
        titulo: d.nombre,
        razon: v.dias < 0
          ? `Perdió vigencia hace ${-v.dias} día(s) y sigue en estado «${legible(d.estado).toLowerCase()}». `
            + 'Mientras no se renueve, quien lo consulte se lleva un documento caducado.'
          : `Pierde vigencia en ${v.dias} día(s). Renovarlo después de la fecha `
            + 'suele costar más que hacerlo antes.',
        urgencia: v.dias < 0 ? 100 : Math.max(40, 95 - v.dias),
        referencia: d.codigo ?? undefined,
      })
    }

    // Firmas que llevan mucho esperando: cada una detiene un documento.
    for (const f of firmas.data ?? []) {
      if (!f.created_at) continue
      const dias = Math.round((Date.now() - new Date(f.created_at).getTime()) / 86_400_000)
      if (dias < 7) continue
      const d = docs.find(x => x.id === f.documento_id)
      s.push({
        tipo: 'FIRMA_VARADA',
        titulo: d?.nombre ?? `Documento #${f.documento_id}`,
        razon: `Lleva ${dias} día(s) esperando una firma ${legible(f.tipo_firma).toLowerCase()}. `
          + 'El documento no avanza hasta que alguien la resuelva.',
        urgencia: Math.min(95, 40 + dias),
        referencia: d?.codigo ?? undefined,
      })
    }

    // Expedientes a medias, los más vacíos primero.
    for (const e of expedientes.data ?? []) {
      if (e.completitud_pct >= 100) continue
      s.push({
        tipo: 'EXPEDIENTE',
        titulo: e.nombre,
        razon: `Está al ${e.completitud_pct}% de su documentación obligatoria. `
          + (e.tipo === 'CONDUCTOR' || e.tipo === 'VEHICULO'
            ? 'Con papeles incompletos, una revisión en carretera es una multa.'
            : 'Los documentos que faltan son los que se piden en una auditoría.'),
        urgencia: 100 - e.completitud_pct,
        referencia: e.codigo ?? undefined,
      })
    }

    // Tipos con vigencia pero sin política de retención: no se sabe cuánto hay
    // que guardarlos después de que venzan.
    const conPolitica = new Set(
      (politicas.data ?? []).map(p => p.tipo_documento_id).filter(Boolean))
    for (const t of tipos.data ?? []) {
      if (!t.activo || conPolitica.has(t.id)) continue
      s.push({
        tipo: 'SIN_RETENCION',
        titulo: t.nombre,
        razon: 'No tiene política de retención. Nadie sabe cuánto hay que '
          + 'conservarlo ni qué hacer al cumplirse el plazo, y esa es la '
          + 'pregunta que hace un auditor.',
        urgencia: 45,
      })
    }

    return s.sort((a, b) => b.urgencia - a.urgencia)
  }, [documentos.data, firmas.data, expedientes.data, tipos.data, politicas.data])

  const lista = tipo === 'Todas' ? senales : senales.filter(x => x.tipo === tipo)
  const cargando = documentos.isLoading || firmas.isLoading || expedientes.isLoading

  // El peso por tipo de documento: dónde se está yendo el disco.
  const pesoPorTipo = useMemo(() => {
    const c: Record<string, number> = {}
    for (const d of documentos.data ?? []) {
      const k = d.tipo_nombre || 'Sin tipo'
      c[k] = (c[k] || 0) + 1
    }
    return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 10)
  }, [documentos.data])
  const maxTipo = Math.max(1, ...pesoPorTipo.map(([, n]) => n))

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${DMS_COLOR} 0%, #1E40AF 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AutoAwesome sx={{ color: '#fff', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800 }}>
              Señales del archivo
            </Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Qué conviene revisar, con el dato del que sale
            </Typography>
          </Box>
        </Box>

        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
          mb: 3,
          '& .MuiTab-root': { color: 'text.secondary', textTransform: 'none', fontWeight: 600 },
          '& .Mui-selected': { color: `${DMS_COLOR} !important` },
          '& .MuiTabs-indicator': { bgcolor: DMS_COLOR },
        }}>
          <Tab label={`Señales${senales.length ? ` (${senales.length})` : ''}`} />
          <Tab label="Composición del archivo" />
        </Tabs>

        {tab === 0 && (
          <>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
              <Chip label="Todas" size="small" onClick={() => setTipo('Todas')}
                sx={{
                  cursor: 'pointer',
                  bgcolor: tipo === 'Todas' ? DMS_COLOR : '#F1F5F9',
                  color: tipo === 'Todas' ? '#FFF' : 'text.secondary',
                  fontWeight: tipo === 'Todas' ? 700 : 400,
                }} />
              {Object.entries(CFG).map(([k, cfg]) => {
                const n = senales.filter(s => s.tipo === k).length
                return (
                  <Chip key={k} label={`${cfg.nombre}${n ? ` · ${n}` : ''}`} size="small"
                    onClick={() => setTipo(k)}
                    sx={{
                      cursor: 'pointer',
                      bgcolor: tipo === k ? cfg.color : '#F1F5F9',
                      color: tipo === k ? '#FFF' : 'text.secondary',
                      fontWeight: tipo === k ? 700 : 400,
                    }} />
                )
              })}
            </Box>

            <Estado cargando={cargando} vacio={!lista.length}
              mensajeVacio={tipo === 'Todas'
                ? 'No hay nada que señalar'
                : `Nada de tipo «${CFG[tipo as Senal['tipo']]?.nombre ?? tipo}»`}
              hint={tipo === 'Todas'
                ? 'Nada se vence pronto, no hay firmas varadas y los expedientes están completos.'
                : 'Pruebe con otro tipo de señal.'}>
              <Grid container spacing={2}>
                {lista.slice(0, 60).map((s, i) => {
                  const cfg = CFG[s.tipo]
                  return (
                    <Grid key={i} size={{ xs: 12, md: 6 }}>
                      <Panel sx={{ p: 2, height: '100%',
                                   borderColor: alpha(cfg.color, 0.3) }}>
                        <Box sx={{ display: 'flex', gap: 1.5, mb: 1 }}>
                          <Box sx={{
                            width: 34, height: 34, borderRadius: '9px', flexShrink: 0,
                            bgcolor: alpha(cfg.color, 0.15), display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            '& svg': { color: cfg.color },
                          }}>{cfg.icono}</Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontSize: 13, fontWeight: 700 }} noWrap>
                              {s.titulo}
                            </Typography>
                            {s.referencia && (
                              <Typography sx={{ fontSize: 11, color: 'text.secondary',
                                                fontFamily: 'ui-monospace, monospace' }}>
                                {s.referencia}
                              </Typography>
                            )}
                          </Box>
                          <Chip label={cfg.nombre} size="small" sx={{
                            bgcolor: alpha(cfg.color, 0.12), color: cfg.color,
                            fontSize: 9.5, fontWeight: 700, flexShrink: 0, height: 20,
                          }} />
                        </Box>
                        <Typography sx={{ fontSize: 12.5, lineHeight: 1.55, mb: 1.25 }}>
                          {s.razon}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1,
                                   pt: 1, borderTop: `1px solid ${BORDE}` }}>
                          <Box sx={{ width: 50, height: 4, borderRadius: 2,
                                     bgcolor: '#EEF2F7', overflow: 'hidden' }}>
                            <Box sx={{ height: '100%', width: `${s.urgencia}%`,
                                       bgcolor: cfg.color, borderRadius: 2 }} />
                          </Box>
                          <Typography sx={{ fontSize: 10.5, color: 'text.disabled' }}>
                            prioridad {s.urgencia}
                          </Typography>
                        </Box>
                      </Panel>
                    </Grid>
                  )
                })}
              </Grid>
              {lista.length > 60 && (
                <Typography sx={{ fontSize: 11.5, color: 'text.disabled',
                                  textAlign: 'center', mt: 2 }}>
                  Se muestran las 60 más urgentes de {lista.length}.
                </Typography>
              )}
            </Estado>
          </>
        )}

        {tab === 1 && (
          <Panel sx={{ p: 2.5 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>
              De qué está hecho el archivo
            </Typography>
            <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 2.5 }}>
              Cuántos documentos hay de cada tipo. Sirve para saber dónde poner
              el esfuerzo cuando se estandariza algo.
            </Typography>
            <Estado cargando={documentos.isLoading} vacio={!pesoPorTipo.length}
              mensajeVacio="No hay documentos archivados">
              {pesoPorTipo.map(([nombre, n]) => (
                <Box key={nombre} sx={{ mb: 1.75 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <IconoArchivo nombre={nombre} size={15} />
                      <Typography sx={{ fontSize: 12.5, fontWeight: 500 }}>
                        {nombre}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: DMS_COLOR }}>
                      {n}
                    </Typography>
                  </Box>
                  <Box sx={{ height: 7, borderRadius: 4, bgcolor: '#EEF2F7', overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: `${(n / maxTipo) * 100}%`,
                               bgcolor: DMS_COLOR, borderRadius: 4, opacity: 0.85 }} />
                  </Box>
                </Box>
              ))}
            </Estado>
          </Panel>
        )}
      </Box>
    </Layout>
  )
}
