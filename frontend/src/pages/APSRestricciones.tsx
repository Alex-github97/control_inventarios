/**
 * APS · Restricciones
 *
 * Era maqueta: una lista de restricciones, los «5 pasos de la TOC» con un
 * cuello de botella inventado y parámetros sueltos.
 *
 * Ahora se registran las restricciones, y cada una dice si el motor la aplica:
 *   BODEGA      unidades máximas almacenadas en la ubicación → alerta si el
 *               stock proyectado la supera.
 *   TRANSPORTE  kilos por vehículo desde la ubicación → dimensiona los camiones.
 *   OTRA        queda registrada para la reunión de S&OP, pero el motor no la
 *               aplica. Se dice explícitamente para no dar la impresión de que
 *               el plan la respeta.
 * El cuello de botella de la TOC ya no se escribe: es el recurso más cargado
 * del plan (ver Capacidad).
 */
import { useState } from 'react'
import { Box, Paper, Typography, Alert } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Block } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import { Layout } from '@/components/layout/Layout'
import { apsApi, n0, pct, nombreR, type Restriccion } from '@/api/aps'
import { Encabezado, Cifra, FormularioRegistro, TablaRegistros, useCrud, Etiqueta, type Campo } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const C = COLOR_MODULO
const AMBITO: Record<string, [string, string, boolean]> = {
  BODEGA: ['Capacidad de bodega (unidades)', '#2563EB', true],
  TRANSPORTE: ['Capacidad por vehículo (kg)', '#7C3AED', true],
  OTRA: ['Otra (solo registro)', '#64748B', false],
}

export default function APSRestricciones() {
  const ubicaciones = useQuery({ queryKey: ['aps', 'ubicaciones'], queryFn: apsApi.ubicaciones.listar }).data ?? []
  const cap = useQuery({ queryKey: ['aps', 'capacidad'], queryFn: apsApi.capacidad }).data
  const crud = useCrud<Restriccion>(['aps', 'restricciones'], apsApi.restricciones, 'Restricción', [['aps']], true)
  const [ed, setEd] = useState<Restriccion | null | undefined>(undefined)
  const campos: Campo[] = [
    { clave: 'nombre', etiqueta: 'Nombre', obligatorio: true },
    { clave: 'ambito', etiqueta: 'Qué limita', tipo: 'seleccion', obligatorio: true, ancho: 6, opciones: Object.entries(AMBITO).map(([k, v]) => [k, v[0]]) },
    { clave: 'tipo', etiqueta: 'Dura o blanda', tipo: 'seleccion', obligatorio: true, ancho: 6, opciones: [['DURA', 'Dura (no se puede exceder)'], ['BLANDA', 'Blanda (se puede exceder con costo)']] },
    { clave: 'ubicacion_id', etiqueta: 'Ubicación', tipo: 'seleccion', ancho: 6, opciones: ubicaciones.map(u => [u.id, u.nombre]),
      validar: (v, f) => (f.ambito === 'BODEGA' || f.ambito === 'TRANSPORTE') && !v ? 'Indique la ubicación' : null },
    { clave: 'valor_max', etiqueta: 'Valor máximo', tipo: 'numero', min: 0, ancho: 6, validar: (v, f) => f.ambito !== 'OTRA' && (v === '' || v == null) ? 'Indique el máximo' : null },
    { clave: 'descripcion', etiqueta: 'Descripción', tipo: 'area' },
  ]
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Block sx={{ fontSize: 28 }} />} titulo="Restricciones" subtitulo="APS · Límites que el plan debe respetar, y cuáles aplica el motor" color={C} accion="Nueva restricción" onAccion={() => setEd(null)} />
        <Grid container spacing={2} mb={2}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Cifra etiqueta="Restricción del sistema (TOC, paso 1: identificarla)" valor={cap?.cuello ? nombreR(cap, cap.cuello.recurso_id) : 'Sin recursos cargados'} color={(cap?.cuello?.uso_maximo_pct ?? 0) > 100 ? '#DC2626' : C}
              sub={cap?.cuello ? `El recurso más cargado del plan: ${pct(cap.cuello.uso_maximo_pct)} en su peor mes` : undefined} />
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            <Alert severity="info" sx={{ height: '100%' }}>Los pasos siguientes de la TOC —explotar, subordinar, elevar— se deciden sobre ese recurso: el plan le asigna primero la producción de mayor valor y un escenario muestra el efecto de elevar su capacidad.</Alert>
          </Grid>
        </Grid>
        <TablaRegistros<Restriccion> filas={crud.datos} cargando={crud.isLoading} vacio="Sin restricciones registradas" etiqueta={r => r.nombre}
          onEditar={setEd} onRetirar={r => crud.retirar.mutate(r.id)}
          columnas={[{ titulo: 'Restricción', valor: r => <b>{r.nombre}</b> }, { titulo: 'Qué limita', valor: r => AMBITO[r.ambito]?.[0] ?? r.ambito },
            { titulo: 'Tipo', valor: r => r.tipo === 'DURA' ? 'Dura' : 'Blanda' }, { titulo: 'Ubicación', valor: r => ubicaciones.find(u => u.id === r.ubicacion_id)?.nombre ?? '—' },
            { titulo: 'Máximo', alinear: 'right', valor: r => n0(r.valor_max) },
            { titulo: 'La aplica el motor', valor: r => AMBITO[r.ambito]?.[2] ? <Etiqueta texto="Sí" color="#16A34A" /> : <Etiqueta texto="No: solo registro" color="#64748B" /> }]} />
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mt: 2 }}>
          <Typography fontSize={12} color="text.secondary"><b>Bodega</b>: si el stock proyectado de la ubicación supera el máximo, el plan lo alerta. <b>Transporte</b>: define cuántos kilos lleva un camión que sale de la ubicación. La capacidad de las máquinas no va aquí: son las horas por día de cada recurso, en Configuración.</Typography>
        </Paper>
        <FormularioRegistro abierto={ed !== undefined} titulo={ed ? 'Editar restricción' : 'Nueva restricción'} campos={campos} registro={ed}
          valoresIniciales={{ ambito: 'BODEGA', tipo: 'DURA' }} onGuardar={c => crud.guardar(ed ?? null, c)} onCerrar={() => setEd(undefined)} />
      </Box>
    </Layout>
  )
}
