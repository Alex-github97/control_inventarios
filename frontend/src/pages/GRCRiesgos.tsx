/**
 * GRC · Riesgos
 *
 * Identificación con categorías, procesos y responsables de verdad (catálogo y
 * usuarios con acceso), evaluación inherente en la escala que configuró la
 * empresa, y un residual que NO se escribe: sale de los controles vinculados y
 * de su efectividad probada. La ficha reúne controles, tratamientos, KRI,
 * incidentes y hallazgos del riesgo.
 */
import { useMemo, useState } from 'react'
import { Box, Paper, Typography, Tabs, Tab, Tooltip, IconButton, Button, Slider, Autocomplete, TextField, Chip } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { BugReport, Add, LinkOff, Warning } from '@mui/icons-material'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { grc, type Registro } from '@/api/grc'
import { FormularioRegistro, TablaRegistros, useCrud, Cifra, Encabezado, fmtFecha, errorApi, type Campo } from '@/components/comun/Registro'
import { ESTADOS_RIESGO, TRATAMIENTOS, PRIORIDAD_COLOR, CAT, etiqueta } from '@/components/grc/etiquetas'
import { FichaGRC, GRC_COLOR, MatrizCalor, ChipEstado, usePersonasGRC, useReferencias, useEscala, prioridadPorBandas, colorDe } from '@/components/grc/comun'

function Nivel({ n, p }: { n?: number | null; p?: string | null }) {
  if (!n) return <>—</>
  return <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
    <Box sx={{ fontWeight: 800, color: PRIORIDAD_COLOR[p ?? ''] ?? 'text.primary' }}>{n}</Box>
    {p && <ChipEstado v={p} />}
  </Box>
}

/** Controles del riesgo: vincular y soltar. El residual se recalcula solo. */
function PanelControles({ riesgo, refrescar }: { riesgo: Registro; refrescar: () => void }) {
  const q = useQuery({ queryKey: ['grc', 'riesgo-controles', riesgo.id], queryFn: () => grc.controlesDeRiesgo(riesgo.id) })
  const controles = useReferencias('control')
  const [sel, setSel] = useState<[number, string] | null>(null)
  const ya = new Set((q.data ?? []).map((c: any) => c.control_id))
  const vincular = async () => {
    try { await grc.vincularControl(riesgo.id, sel![0]); setSel(null); refrescar() }
    catch (e) { toast.error(errorApi(e, 'No se pudo vincular')) }
  }
  return (
    <Box sx={{ mb: 2 }}>
      <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 0.5 }}>Controles que lo mitigan</Typography>
      <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 1 }}>
        Residual: probabilidad {riesgo.probabilidad_residual ?? '—'} × impacto {riesgo.impacto_residual ?? '—'} = {riesgo.nivel_residual ?? '—'}.
        Solo reducen los controles con efectividad probada.
      </Typography>
      {(q.data ?? []).map((c: any) => (
        <Box key={c.control_id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, borderBottom: '1px solid #F1F5F9' }}>
          <Typography sx={{ fontSize: 12.5, flex: 1 }} noWrap>{c.codigo} · {c.nombre}</Typography>
          <Chip size="small" label={c.tipo} sx={{ fontSize: 10.5 }} />
          <ChipEstado v={c.efectividad} />
          <Tooltip title="Quitar"><IconButton size="small" aria-label={`Quitar ${c.nombre}`}
            onClick={async () => { await grc.desvincularControl(riesgo.id, c.control_id); refrescar() }}><LinkOff fontSize="small" /></IconButton></Tooltip>
        </Box>
      ))}
      <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
        <Autocomplete size="small" sx={{ flex: 1 }} options={controles.filter(o => !ya.has(o[0]))} value={sel}
          onChange={(_, v) => setSel(v)} getOptionLabel={o => o[1]} isOptionEqualToValue={(a, b) => a[0] === b[0]}
          renderInput={p => <TextField {...p} label="Agregar control existente" />} />
        <Button variant="outlined" disabled={!sel} onClick={vincular}>Vincular</Button>
      </Box>
    </Box>
  )
}

function PanelTratamientos({ riesgo, refrescar }: { riesgo: Registro; refrescar: () => void }) {
  const personas = usePersonasGRC()
  const q = useQuery({ queryKey: ['grc', 'tratamientos', riesgo.id], queryFn: () => grc.tratamientos.listar({ riesgo_id: riesgo.id }) })
  const [nuevo, setNuevo] = useState(false)
  const campos: Campo[] = [
    { clave: 'tipo', etiqueta: 'Respuesta', tipo: 'seleccion', opciones: TRATAMIENTOS, obligatorio: true, ancho: 6 },
    { clave: 'fecha_objetivo', etiqueta: 'Fecha objetivo', tipo: 'fecha', ancho: 6 },
    { clave: 'responsable_id', etiqueta: 'Responsable', tipo: 'persona', personas },
    { clave: 'descripcion', etiqueta: 'Acción', tipo: 'area', obligatorio: true },
  ]
  const avance = async (t: Registro, v: number) => {
    try { await grc.tratamientos.editar(t.id, { riesgo_id: riesgo.id, tipo: t.tipo, descripcion: t.descripcion,
      responsable_id: t.responsable_id, fecha_objetivo: t.fecha_objetivo, avance: v }); refrescar() }
    catch (e) { toast.error(errorApi(e)) }
  }
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ fontWeight: 700, fontSize: 13 }}>Tratamientos</Typography>
        <Button size="small" startIcon={<Add />} onClick={() => setNuevo(true)}>Agregar</Button>
      </Box>
      {(q.data ?? []).map(t => (
        <Paper key={t.id} variant="outlined" sx={{ p: 1.25, mt: 1, borderRadius: 2 }}>
          <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{etiqueta(TRATAMIENTOS, t.tipo)} · {t.descripcion}</Typography>
          <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{t.responsable_nombre ?? 'Sin responsable'} · objetivo {fmtFecha(t.fecha_objetivo)}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Slider size="small" defaultValue={t.avance} step={10} min={0} max={100} aria-label={`Avance de ${t.descripcion}`}
              onChangeCommitted={(_, v) => avance(t, v as number)} sx={{ color: GRC_COLOR }} />
            <Typography sx={{ fontSize: 12, fontWeight: 700, minWidth: 40 }}>{t.avance}%</Typography>
          </Box>
        </Paper>
      ))}
      <FormularioRegistro abierto={nuevo} titulo="Nuevo tratamiento" campos={campos}
        valoresIniciales={{ tipo: riesgo.tratamiento ?? 'mitigar', responsable_id: riesgo.responsable_id }}
        onGuardar={async c => { await grc.tratamientos.crear({ ...c, riesgo_id: riesgo.id }); toast.success('Tratamiento agregado'); refrescar() }}
        onCerrar={() => setNuevo(false)} />
    </Box>
  )
}

function PanelKris({ riesgo, refrescar }: { riesgo: Registro; refrescar: () => void }) {
  const personas = usePersonasGRC()
  const q = useQuery({ queryKey: ['grc', 'kris', riesgo.id], queryFn: () => grc.kris.listar({ riesgo_id: riesgo.id }) })
  const [nuevo, setNuevo] = useState(false)
  const [medir, setMedir] = useState<Registro | null>(null)
  const campos: Campo[] = [
    { clave: 'nombre', etiqueta: 'Indicador', obligatorio: true },
    { clave: 'unidad', etiqueta: 'Unidad', ancho: 4 },
    { clave: 'direccion', etiqueta: 'Empeora cuando', tipo: 'seleccion', opciones: [['sube', 'Sube'], ['baja', 'Baja']], obligatorio: true, ancho: 4 },
    { clave: 'periodicidad', etiqueta: 'Periodicidad', tipo: 'catalogo', catalogo: CAT.periodicidad, ancho: 4 },
    { clave: 'umbral_alerta', etiqueta: 'Umbral de alerta', tipo: 'numero', obligatorio: true, ancho: 6 },
    { clave: 'umbral_critico', etiqueta: 'Umbral crítico', tipo: 'numero', obligatorio: true, ancho: 6 },
    { clave: 'responsable_id', etiqueta: 'Responsable de medirlo', tipo: 'persona', personas },
    { clave: 'descripcion', etiqueta: 'Cómo se mide', tipo: 'area' },
  ]
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ fontWeight: 700, fontSize: 13 }}>Indicadores clave de riesgo (KRI)</Typography>
        <Button size="small" startIcon={<Add />} onClick={() => setNuevo(true)}>Agregar</Button>
      </Box>
      {(q.data ?? []).map(k => (
        <Box key={k.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.75, borderBottom: '1px solid #F1F5F9' }}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{k.nombre}</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
              Último: {k.ultimo_valor ?? '—'} {k.unidad ?? ''} ({k.ultimo_periodo ?? 'sin medir'}) · alerta {k.umbral_alerta} · crítico {k.umbral_critico}
            </Typography>
          </Box>
          <ChipEstado v={k.estado} />
          <Button size="small" onClick={() => setMedir(k)}>Medir</Button>
        </Box>
      ))}
      <FormularioRegistro abierto={nuevo} titulo="Nuevo indicador clave de riesgo" campos={campos} valoresIniciales={{ direccion: 'sube' }}
        onGuardar={async c => { await grc.kris.crear({ ...c, riesgo_id: riesgo.id }); toast.success('Indicador creado'); refrescar() }}
        onCerrar={() => setNuevo(false)} />
      <FormularioRegistro abierto={!!medir} titulo={`Medición · ${medir?.nombre ?? ''}`}
        campos={[{ clave: 'periodo', etiqueta: 'Mes (AAAA-MM)', obligatorio: true, ancho: 6, validar: v => /^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? null : 'Formato AAAA-MM' },
                 { clave: 'valor', etiqueta: 'Valor', tipo: 'numero', obligatorio: true, ancho: 6 },
                 { clave: 'nota', etiqueta: 'Nota', tipo: 'area' }]}
        valoresIniciales={{ periodo: new Date().toISOString().slice(0, 7) }}
        onGuardar={async c => { await grc.medir(medir!.id, c as any); toast.success('Medición registrada'); refrescar() }}
        onCerrar={() => setMedir(null)} />
    </Box>
  )
}

export default function GRCRiesgos() {
  const crud = useCrud(['grc', 'riesgos'], grc.riesgos, 'Riesgo')
  const personas = usePersonasGRC()
  const comites = useReferencias('comite')
  const terceros = useReferencias('tercero')
  const { probabilidad, impacto, bandas } = useEscala()
  const [dlg, setDlg] = useState<{ abierto: boolean; r: Registro | null }>({ abierto: false, r: null })
  const [ficha, setFicha] = useState<number | null>(null)
  const [tab, setTab] = useState(0)
  const [filtro, setFiltro] = useState('')
  const [celda, setCelda] = useState<string | null>(null)
  const kris = useQuery({ queryKey: ['grc', 'kris'], queryFn: () => grc.kris.listar(), enabled: tab === 2 })
  const lista = crud.datos
  const vivos = lista.filter(r => !['cerrado', 'mitigado'].includes(r.estado))
  const visibles = lista.filter(r => (!filtro || r.prioridad === filtro)
    && (!celda || `${r.probabilidad_residual}-${r.impacto_residual}` === celda))
  const [calorInh, calorRes] = useMemo(() => (['inherente', 'residual'] as const).map(eje => {
    const c: Record<string, number> = {}
    lista.forEach(r => { const p = r[`probabilidad_${eje}`], i = r[`impacto_${eje}`]; if (p && i) c[`${p}-${i}`] = (c[`${p}-${i}`] ?? 0) + 1 })
    return c
  }), [lista])

  const campos: Campo[] = [
    { clave: 's1', etiqueta: 'Identificación', tipo: 'seccion' },
    { clave: 'nombre', etiqueta: 'Riesgo', obligatorio: true, ayuda: 'Redáctelo como evento: «Pérdida de…», «Fraude en…»' },
    { clave: 'tipo', etiqueta: 'Categoría', tipo: 'catalogo', catalogo: CAT.categoria, obligatorio: true, ancho: 6 },
    { clave: 'responsable_id', etiqueta: 'Dueño del riesgo', tipo: 'persona', personas, obligatorio: true, ancho: 6 },
    { clave: 'proceso', etiqueta: 'Proceso', tipo: 'catalogo', catalogo: CAT.proceso, ancho: 6 },
    { clave: 'area', etiqueta: 'Área', tipo: 'catalogo', catalogo: CAT.area, ancho: 6 },
    { clave: 'comite_id', etiqueta: 'Comité que lo supervisa', tipo: 'referencia', opciones: comites, ancho: 6 },
    { clave: 'tercero_id', etiqueta: 'Tercero relacionado', tipo: 'referencia', opciones: terceros, ancho: 6 },
    { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'area' },
    { clave: 'causas', etiqueta: 'Causas', tipo: 'area', ancho: 6 },
    { clave: 'consecuencias', etiqueta: 'Consecuencias', tipo: 'area', ancho: 6 },
    { clave: 's2', etiqueta: 'Evaluación inherente (sin controles)', tipo: 'seccion' },
    { clave: 'probabilidad_inherente', etiqueta: 'Probabilidad', tipo: 'seleccion', opciones: probabilidad, obligatorio: true, ancho: 6 },
    { clave: 'impacto_inherente', etiqueta: 'Impacto', tipo: 'seleccion', opciones: impacto, obligatorio: true, ancho: 6 },
    { clave: 's3', etiqueta: 'Gestión', tipo: 'seccion' },
    { clave: 'estado', etiqueta: 'Estado', tipo: 'seleccion', opciones: ESTADOS_RIESGO, obligatorio: true, ancho: 4 },
    { clave: 'tratamiento', etiqueta: 'Respuesta', tipo: 'seleccion', opciones: TRATAMIENTOS, ancho: 4 },
    { clave: 'fecha_revision', etiqueta: 'Próxima revisión', tipo: 'fecha', ancho: 4 },
  ]

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<BugReport sx={{ fontSize: 28 }} />} titulo="Riesgos" subtitulo="GRC · Identificación, evaluación, controles y tratamiento"
          color={GRC_COLOR} accion="Nuevo riesgo" onAccion={() => setDlg({ abierto: true, r: null })} />
        <Grid container spacing={2} mb={3}>
          {(['critica', 'alta', 'media', 'baja'] as const).map(p => (
            <Grid key={p} size={{ xs: 6, md: 2.4 }}>
              <Box role="button" aria-pressed={filtro === p} aria-label={`Filtrar prioridad ${p}`} onClick={() => setFiltro(filtro === p ? '' : p)}
                sx={{ cursor: 'pointer', outline: filtro === p ? `2px solid ${PRIORIDAD_COLOR[p]}` : 'none', borderRadius: 2 }}>
                <Cifra etiqueta={`Prioridad ${p} · abiertos`} valor={vivos.filter(r => r.prioridad === p).length} color={PRIORIDAD_COLOR[p]} />
              </Box>
            </Grid>
          ))}
          <Grid size={{ xs: 12, md: 2.4 }}>
            <Cifra etiqueta="Fuera del apetito" valor={vivos.filter(r => r.fuera_de_apetito).length} color="#991B1B" sub="nivel residual mayor que el tolerado" />
          </Grid>
        </Grid>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
          <Tab label="Inventario" /><Tab label="Mapa de calor" /><Tab label="Indicadores (KRI)" />
        </Tabs>
        {tab === 0 && <>
          {celda && <Chip label={`Celda ${celda}`} onDelete={() => setCelda(null)} sx={{ mb: 1 }} />}
          <TablaRegistros<Registro> filas={visibles} cargando={crud.isLoading} vacio="Sin riesgos registrados" etiqueta={r => r.nombre}
            onFila={r => setFicha(r.id)} onEditar={r => setDlg({ abierto: true, r })} onRetirar={r => crud.retirar.mutate(r.id)}
            columnas={[
              { titulo: 'Código', valor: r => <Box sx={{ fontFamily: 'monospace' }}>{r.codigo}</Box> },
              { titulo: 'Riesgo', valor: r => <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>{r.fuera_de_apetito &&
                <Tooltip title={`Fuera del apetito (${r.apetito})`}><Warning sx={{ fontSize: 16, color: '#991B1B' }} /></Tooltip>}{r.nombre}</Box> },
              { titulo: 'Categoría', valor: r => r.tipo ?? '—' },
              { titulo: 'Proceso', valor: r => r.proceso ?? '—' },
              { titulo: 'Dueño', valor: r => r.responsable_nombre ?? '—' },
              { titulo: 'Inherente', valor: r => <Nivel n={r.nivel_inherente} p={prioridadPorBandas(r.nivel_inherente, bandas)} /> },
              { titulo: 'Residual', valor: r => <Nivel n={r.nivel_residual} p={r.prioridad} /> },
              { titulo: 'Controles', valor: r => r.controles, alinear: 'center' },
              { titulo: 'Estado', valor: r => etiqueta(ESTADOS_RIESGO, r.estado) },
            ]} />
        </>}
        {tab === 1 && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}><MatrizCalor titulo="Riesgo inherente" celdas={calorInh} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><MatrizCalor titulo="Riesgo residual (después de controles probados)" celdas={calorRes}
              seleccion={celda} onCelda={(p, i) => { setCelda(`${p}-${i}`); setTab(0) }} /></Grid>
          </Grid>
        )}
        {tab === 2 && (
          <TablaRegistros<Registro> filas={kris.data ?? []} cargando={kris.isLoading}
            vacio="Sin indicadores. Se crean desde la ficha de cada riesgo." etiqueta={k => k.nombre}
            onFila={k => setFicha(k.riesgo_id)}
            columnas={[
              { titulo: 'Indicador', valor: k => k.nombre },
              { titulo: 'Riesgo', valor: k => k.riesgo_nombre },
              { titulo: 'Último valor', valor: k => k.ultimo_valor == null ? '—' : `${k.ultimo_valor} ${k.unidad ?? ''}`, alinear: 'right' },
              { titulo: 'Periodo', valor: k => k.ultimo_periodo ?? '—' },
              { titulo: 'Alerta / crítico', valor: k => `${k.umbral_alerta} / ${k.umbral_critico}` },
              { titulo: 'Estado', valor: k => <ChipEstado v={k.estado} /> },
            ]} />
        )}
        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? `Editar ${dlg.r.codigo}` : 'Nuevo riesgo'} campos={campos} registro={dlg.r} ancho="md"
          valoresIniciales={{ estado: 'identificado' }}
          pie={v => {
            const n = Number(v.probabilidad_inherente) * Number(v.impacto_inherente)
            const p = prioridadPorBandas(n || null, bandas)
            return n ? <Typography sx={{ fontSize: 13 }}>Nivel inherente <b style={{ color: colorDe(p) }}>{n} · {p}</b>. El residual lo calculan los controles vinculados.</Typography> : null
          }}
          onGuardar={c => crud.guardar(dlg.r, c)} onCerrar={() => setDlg({ abierto: false, r: null })} />
        <FichaGRC tipo="riesgo" id={ficha} onCerrar={() => setFicha(null)} ocultar={['controles', 'tratamientos', 'kris']}
          resumen={r => [
            ['Categoría', r.tipo], ['Dueño', r.responsable_nombre], ['Proceso', r.proceso],
            ['Inherente', `${r.probabilidad_inherente ?? '—'} × ${r.impacto_inherente ?? '—'} = ${r.nivel_inherente ?? '—'}`],
            ['Residual', `${r.probabilidad_residual ?? '—'} × ${r.impacto_residual ?? '—'} = ${r.nivel_residual ?? '—'}`],
            ['Prioridad', <ChipEstado v={r.prioridad} />], ['Estado', etiqueta(ESTADOS_RIESGO, r.estado)],
            ['Respuesta', etiqueta(TRATAMIENTOS, r.tratamiento)], ['Revisión', fmtFecha(r.fecha_revision)],
          ]}>
          {(r, refrescar) => <>
            <PanelControles riesgo={r} refrescar={refrescar} />
            <PanelTratamientos riesgo={r} refrescar={refrescar} />
            <PanelKris riesgo={r} refrescar={refrescar} />
          </>}
        </FichaGRC>
      </Box>
    </Layout>
  )
}
