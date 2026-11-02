/**
 * Planta de reencauche · Tablero
 *
 * El estado de la planta ahora mismo: cuántas llantas hay en cada etapa (en
 * cola y en proceso), retenidas, condicionales, listas para entregar y
 * rechazos por disponer; por cliente; y si alcanza la banda para lo que está
 * en cola. Filtrable por cliente: «¿dónde están mis llantas?».
 */
import { useState } from 'react'
import { Box, Paper, Typography, LinearProgress, Alert, Button, alpha } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Factory } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { rtm, num } from '@/api/reencauche'
import { Encabezado, Cifra, TablaRegistros } from '@/components/comun/Registro'
import { COLOR, SelectorPropietario, BuscadorHoja } from '@/components/reencauche/comun'

export default function RTMTablero() {
  const navigate = useNavigate()
  const [cliente, setCliente] = useState<number | ''>('')
  const planta = useQuery({ queryKey: ['rtm', 'planta'], queryFn: rtm.planta })
  const t = useQuery({ queryKey: ['rtm', 'tablero', cliente], queryFn: () => rtm.tablero(cliente), refetchInterval: 30_000 })
  const d = t.data
  const max = Math.max(1, ...(d?.etapas ?? []).map((e: any) => e.en_cola + e.en_proceso))
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Factory sx={{ fontSize: 28 }} />} titulo="Planta de reencauche"
          subtitulo="Las llantas en cada etapa, lo retenido y lo listo para entregar" color={COLOR} />
        {planta.data && !planta.data.lista && (
          <Alert severity="warning" sx={{ mb: 2 }} action={<Button onClick={() => navigate('/reencauche/config')}>Configurar</Button>}>
            La planta todavía no tiene almacén del WMS: elíjalo en Configuración para poder recibir llantas.
          </Alert>
        )}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <SelectorPropietario valor={cliente} onChange={setCliente} todos etiqueta="Cliente" />
          <BuscadorHoja />
        </Box>
        {t.isLoading && <LinearProgress />}
        {d && <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 6, md: 2.4 }}><Cifra etiqueta="En planta" valor={num(d.en_planta, 0)} color={COLOR} /></Grid>
            <Grid size={{ xs: 6, md: 2.4 }}><Cifra etiqueta="Listas para entregar" valor={num(d.listas_entrega, 0)} color="#15803D" /></Grid>
            <Grid size={{ xs: 6, md: 2.4 }}><Cifra etiqueta="Retenidas" valor={num(d.retenidas, 0)} color="#7C3AED" /></Grid>
            <Grid size={{ xs: 6, md: 2.4 }}><Cifra etiqueta="Esperan dictamen técnico" valor={num(d.condicionales, 0)} color="#B45309" /></Grid>
            <Grid size={{ xs: 6, md: 2.4 }}><Cifra etiqueta="Rechazos por disponer" valor={num(d.rechazos_por_disponer, 0)} color="#DC2626" /></Grid>
          </Grid>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Llantas por etapa (ruta en frío)</Typography>
                {d.etapas.map((e: any, i: number) => (
                  <Box key={e.etapa_id} sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                      <span>{i + 1}. {e.nombre}</span>
                      <span><b>{e.en_cola}</b> en cola{e.en_proceso ? ` · ${e.en_proceso} en proceso` : ''}</span>
                    </Box>
                    <Box sx={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', bgcolor: alpha(COLOR, 0.08) }}>
                      <Box sx={{ width: `${(e.en_proceso / max) * 100}%`, bgcolor: COLOR }} />
                      <Box sx={{ width: `${(e.en_cola / max) * 100}%`, bgcolor: alpha(COLOR, 0.45) }} />
                    </Box>
                  </Box>
                ))}
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2 }}>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>¿Alcanza la banda?</Typography>
                {!d.bandas.length && <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Ninguna carcasa en cola tiene banda pedida.</Typography>}
                {d.bandas.map((b: any) => (
                  <Box key={b.banda_producto_id} sx={{ mb: 1.25, fontSize: 12.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <b>{b.banda}</b>
                      <span style={{ color: b.faltante > 0 ? '#DC2626' : '#15803D', fontWeight: 700 }}>
                        {b.faltante > 0 ? `Faltan ${num(b.faltante, 1)} m` : 'Alcanza'}
                      </span>
                    </Box>
                    <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>
                      {b.carcasas} carcasas piden {num(b.metros, 1)} m · hay {num(b.existencia, 1)} m
                      {b.sin_especificacion ? ` · ${b.sin_especificacion} sin especificación de longitud` : ''}
                    </Typography>
                  </Box>
                ))}
              </Paper>
              <TablaRegistros filas={d.clientes.map((c: any) => ({ ...c, id: c.depositante_id }))} vacio="Sin llantas en planta"
                etiqueta={(c: any) => c.cliente} onFila={(c: any) => setCliente(c.depositante_id)}
                columnas={[
                  { titulo: 'Cliente', valor: (c: any) => c.cliente },
                  { titulo: 'En proceso', valor: (c: any) => c.en_planta, alinear: 'right' },
                  { titulo: 'Listas', valor: (c: any) => c.listas, alinear: 'right' },
                  { titulo: 'Rechazadas', valor: (c: any) => c.rechazadas, alinear: 'right' },
                ]} />
            </Grid>
          </Grid>
        </>}
      </Box>
    </Layout>
  )
}
