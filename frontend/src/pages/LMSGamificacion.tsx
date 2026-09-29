/**
 * LMS · Gamificación
 *
 * Era una maqueta: ranking de personas inventadas, insignias y «retos» sin
 * nada detrás. Ahora el ranking suma los puntos de las insignias obtenidas,
 * con los cursos completados como desempate; las insignias se crean y se
 * otorgan a personas reales. Los retos se quitaron: no había dónde guardarlos
 * ni nada que midiera su avance.
 */
import { useState } from 'react'
import { Box, Tabs, Tab, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button, Autocomplete, TextField, IconButton, Tooltip } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { EmojiEvents, CardGiftcard } from '@mui/icons-material'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { lmsApi, type Insignia, type PersonaLMS } from '@/api/lms'
import { FormularioRegistro, TablaRegistros, useCrud, Cifra, Encabezado, errorApi, type Campo } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const LMS_COLOR = COLOR_MODULO
const MEDALLA = ['🥇', '🥈', '🥉']
const CAMPOS: Campo[] = [
  { clave: 'nombre', etiqueta: 'Insignia', obligatorio: true },
  { clave: 'puntos_otorgados', etiqueta: 'Puntos', tipo: 'numero', min: 0, obligatorio: true, ancho: 6 },
  { clave: 'tipo', etiqueta: 'Tipo', ancho: 6, ayuda: 'Logro, participación, excelencia…' },
  { clave: 'criterio', etiqueta: 'Cómo se obtiene', tipo: 'area' },
  { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'area' },
]

export default function LMSGamificacion() {
  const qc = useQueryClient()
  const ins = useCrud(['lms-insignias'], lmsApi.insignias, 'Insignia', [['lms-ranking']], true)
  const { data: ranking = [], isLoading } = useQuery({ queryKey: ['lms-ranking'], queryFn: lmsApi.ranking })
  const { data: personas = [] } = useQuery({ queryKey: ['lms-personas'], queryFn: lmsApi.personas })
  const [tab, setTab] = useState(0)
  const [dlg, setDlg] = useState<{ abierto: boolean; r: Insignia | null }>({ abierto: false, r: null })
  const [otorgar, setOtorgar] = useState<Insignia | null>(null)
  const [persona, setPersona] = useState<PersonaLMS | null>(null)
  const dar = useMutation({
    mutationFn: () => lmsApi.insignias.otorgar(otorgar!.id, persona!.id),
    onSuccess: () => { toast.success('Insignia otorgada'); qc.invalidateQueries({ queryKey: ['lms-ranking'] }); qc.invalidateQueries({ queryKey: ['lms-insignias'] }); setOtorgar(null) },
    onError: (e: any) => toast.error(errorApi(e)),
  })
  const filasRank = ranking.map(r => ({ ...r, id: r.usuario_id }))

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<EmojiEvents sx={{ fontSize: 28 }} />} titulo="Gamificación" subtitulo="LMS · Ranking e insignias" color={LMS_COLOR}
          accion={tab === 1 ? 'Nueva insignia' : undefined} onAccion={() => setDlg({ abierto: true, r: null })} />
        <Grid container spacing={2} mb={3}>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Personas en el ranking" valor={ranking.length} color={LMS_COLOR} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Insignias" valor={ins.datos.length} color="#D97706" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Insignias otorgadas" valor={ins.datos.reduce((s, i) => s + (i.total_otorgadas ?? 0), 0)} color="#15803D" /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><Cifra etiqueta="Puntos repartidos" valor={ranking.reduce((s, r) => s + r.puntos, 0)} color="#0369A1" /></Grid>
        </Grid>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}><Tab label="Ranking" /><Tab label="Insignias" /></Tabs>
        {tab === 0 && <TablaRegistros filas={filasRank} cargando={isLoading} vacio="Aún nadie tiene puntos ni cursos completados" etiqueta={r => r.nombre}
          columnas={[
            { titulo: '#', valor: r => <Typography fontWeight={800}>{MEDALLA[r.posicion - 1] ?? r.posicion}</Typography> },
            { titulo: 'Persona', valor: r => <b>{r.nombre}</b> },
            { titulo: 'Puntos', alinear: 'right', valor: r => <b>{r.puntos}</b> },
            { titulo: 'Insignias', alinear: 'right', valor: r => r.insignias },
            { titulo: 'Cursos completados', alinear: 'right', valor: r => r.cursos_completados },
          ]} />}
        {tab === 1 && <TablaRegistros<Insignia> filas={ins.datos} cargando={ins.isLoading} vacio="Sin insignias" etiqueta={i => i.nombre}
          onEditar={i => setDlg({ abierto: true, r: i })} onRetirar={i => ins.retirar.mutate(i.id)}
          extra={i => <Tooltip title="Otorgar"><IconButton size="small" aria-label={`Otorgar ${i.nombre}`} onClick={() => { setPersona(null); setOtorgar(i) }}><CardGiftcard fontSize="small" /></IconButton></Tooltip>}
          columnas={[
            { titulo: 'Insignia', valor: i => <><b>{i.nombre}</b><Typography fontSize={11} color="text.secondary">{i.criterio ?? ''}</Typography></> },
            { titulo: 'Tipo', valor: i => i.tipo ?? '—' },
            { titulo: 'Puntos', alinear: 'right', valor: i => i.puntos_otorgados },
            { titulo: 'Otorgadas', alinear: 'right', valor: i => i.total_otorgadas ?? 0 },
          ]} />}
        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? dlg.r.nombre : 'Nueva insignia'} campos={CAMPOS} registro={dlg.r} valoresIniciales={{ puntos_otorgados: '10' }}
          onGuardar={c => ins.guardar(dlg.r, c)} onCerrar={() => setDlg({ abierto: false, r: null })} />
        <Dialog open={!!otorgar} onClose={() => setOtorgar(null)} maxWidth="xs" fullWidth>
          <DialogTitle>Otorgar «{otorgar?.nombre}»</DialogTitle>
          <DialogContent><Autocomplete options={personas} value={persona} onChange={(_, v) => setPersona(v)} getOptionLabel={p => `${p.nombre}${p.cargo ? ` · ${p.cargo}` : ''}`} sx={{ mt: 1 }} renderInput={p => <TextField {...p} label="Persona" size="small" />} /></DialogContent>
          <DialogActions><Button onClick={() => setOtorgar(null)}>Cancelar</Button><Button variant="contained" disabled={!persona || dar.isPending} onClick={() => dar.mutate()} sx={{ bgcolor: LMS_COLOR }}>Otorgar</Button></DialogActions>
        </Dialog>
      </Box>
    </Layout>
  )
}
