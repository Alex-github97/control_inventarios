/**
 * GRC · Terceros
 *
 * Proveedores, clientes, contratistas y aliados con su criticidad para la
 * operación. Se pueden crear desde un proveedor (SCM) o un cliente (CRM) que
 * ya existe, para no escribirlos dos veces. El nivel de riesgo no se elige:
 * sale de la última evaluación (legal, reputacional, financiera, seguridad).
 */
import { useState } from 'react'
import { Box, Button, Autocomplete, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Typography } from '@mui/material'
import Grid from '@mui/material/Grid2'
import { Handshake, Assessment } from '@mui/icons-material'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Layout } from '@/components/layout/Layout'
import { grc, type Registro } from '@/api/grc'
import { FormularioRegistro, TablaRegistros, useCrud, Cifra, Encabezado, fmtFecha, type Campo } from '@/components/comun/Registro'
import { SEVERIDADES, ESTADOS_TERCERO, NIVEL_TERCERO, NIVEL_TERCERO_COLOR, CAT, etiqueta } from '@/components/grc/etiquetas'
import { FichaGRC, GRC_COLOR, ChipEstado, usePersonasGRC } from '@/components/grc/comun'

export default function GRCTerceros() {
  const crud = useCrud(['grc', 'terceros'], grc.terceros, 'Tercero')
  const personas = usePersonasGRC()
  const fuentes = useQuery({ queryKey: ['grc', 'terceros-fuentes'], queryFn: grc.fuentesTerceros })
  const [dlg, setDlg] = useState<{ abierto: boolean; r: Registro | null; ini?: Record<string, any> }>({ abierto: false, r: null })
  const [desde, setDesde] = useState(false)
  const [origen, setOrigen] = useState<any>(null)
  const [evaluar, setEvaluar] = useState<Registro | null>(null)
  const [ficha, setFicha] = useState<number | null>(null)
  const lista = crud.datos

  const proveedores: [number, string][] = (fuentes.data?.proveedores ?? []).map((p: any) => [p.id, `${p.nombre}${p.nit ? ` · ${p.nit}` : ''}`])
  const clientes: [number, string][] = (fuentes.data?.clientes ?? []).map((c: any) => [c.id, `${c.nombre}${c.nit ? ` · ${c.nit}` : ''}`])
  const opcionesOrigen = [
    ...(fuentes.data?.proveedores ?? []).map((p: any) => ({ ...p, fuente: 'Proveedor (SCM)', clave: 'proveedor_id', tipo: 'Proveedor' })),
    ...(fuentes.data?.clientes ?? []).map((c: any) => ({ ...c, fuente: 'Cliente (CRM)', clave: 'cliente_id', tipo: 'Cliente' })),
  ]

  const campos: Campo[] = [
    { clave: 'nombre', etiqueta: 'Razón social', obligatorio: true, ancho: 8 },
    { clave: 'nit', etiqueta: 'NIT', ancho: 4 },
    { clave: 'tipo', etiqueta: 'Tipo', tipo: 'catalogo', catalogo: CAT.tipoTercero, obligatorio: true, ancho: 6 },
    { clave: 'criticidad', etiqueta: 'Qué tan crítico es para la operación', tipo: 'seleccion', opciones: SEVERIDADES, obligatorio: true, ancho: 6 },
    { clave: 'proveedor_id', etiqueta: 'Es el proveedor (SCM)', tipo: 'referencia', opciones: proveedores, ancho: 6 },
    { clave: 'cliente_id', etiqueta: 'Es el cliente (CRM)', tipo: 'referencia', opciones: clientes, ancho: 6 },
    { clave: 'pais', etiqueta: 'País', tipo: 'catalogo', catalogo: CAT.pais, ancho: 6 },
    { clave: 'sector', etiqueta: 'Sector', tipo: 'catalogo', catalogo: CAT.sector, ancho: 6 },
    { clave: 'contacto', etiqueta: 'Contacto en el tercero', ancho: 6 },
    { clave: 'contacto_email', etiqueta: 'Correo del contacto', ancho: 6 },
    { clave: 'responsable_id', etiqueta: 'Quién lo administra internamente', tipo: 'persona', personas, ancho: 6 },
    { clave: 'estado', etiqueta: 'Estado', tipo: 'seleccion', opciones: ESTADOS_TERCERO, obligatorio: true, ancho: 6 },
  ]
  const camposEval: Campo[] = [
    { clave: 'fecha', etiqueta: 'Fecha', tipo: 'fecha', obligatorio: true, ancho: 6 },
    { clave: 'evaluador_id', etiqueta: 'Evaluador', tipo: 'persona', personas, ancho: 6 },
    { clave: 'cumplimiento_legal', etiqueta: 'Cumplimiento legal (0–100)', tipo: 'numero', min: 0, max: 100, ancho: 6 },
    { clave: 'riesgo_reputacional', etiqueta: 'Reputación (0–100)', tipo: 'numero', min: 0, max: 100, ancho: 6 },
    { clave: 'solidez_financiera', etiqueta: 'Solidez financiera (0–100)', tipo: 'numero', min: 0, max: 100, ancho: 6 },
    { clave: 'seguridad_info', etiqueta: 'Seguridad de la información (0–100)', tipo: 'numero', min: 0, max: 100, ancho: 6 },
    { clave: 'observaciones', etiqueta: 'Observaciones', tipo: 'area' },
  ]

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Handshake sx={{ fontSize: 28 }} />} titulo="Terceros" subtitulo="GRC · Debida diligencia y evaluación de riesgo de terceros"
          color={GRC_COLOR} accion="Nuevo tercero" onAccion={() => setDlg({ abierto: true, r: null })} />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -2, mb: 2 }}>
          <Button size="small" onClick={() => setDesde(true)}>Crear desde un proveedor o cliente existente</Button>
        </Box>
        <Grid container spacing={2} mb={3}>
          {NIVEL_TERCERO.map(([k, l]) => (
            <Grid key={k} size={{ xs: 6, md: 2.4 }}><Cifra etiqueta={`Riesgo ${l.toLowerCase()}`} valor={lista.filter(t => t.nivel_riesgo === k).length} color={NIVEL_TERCERO_COLOR[k]} /></Grid>
          ))}
          <Grid size={{ xs: 12, md: 2.4 }}><Cifra etiqueta="Sin evaluar" valor={lista.filter(t => !t.ultima_evaluacion).length} color="#6B7280" /></Grid>
        </Grid>
        <TablaRegistros<Registro> filas={lista} cargando={crud.isLoading} vacio="Sin terceros" etiqueta={t => t.nombre}
          onFila={t => setFicha(t.id)} onEditar={t => setDlg({ abierto: true, r: t })} onRetirar={t => crud.retirar.mutate(t.id)}
          extra={t => <Button size="small" startIcon={<Assessment />} onClick={() => setEvaluar(t)}>Evaluar</Button>}
          columnas={[
            { titulo: 'Tercero', valor: t => t.nombre },
            { titulo: 'NIT', valor: t => t.nit ?? '—' },
            { titulo: 'Tipo', valor: t => t.tipo ?? '—' },
            { titulo: 'Criticidad', valor: t => <ChipEstado v={t.criticidad} /> },
            { titulo: 'Último puntaje', valor: t => t.ultimo_puntaje ?? '—', alinear: 'right' },
            { titulo: 'Nivel de riesgo', valor: t => t.nivel_riesgo ? <ChipEstado v={t.nivel_riesgo} /> : 'Sin evaluar' },
            { titulo: 'Evaluado', valor: t => fmtFecha(t.ultima_evaluacion) },
            { titulo: 'Riesgos', valor: t => t.riesgos, alinear: 'center' },
          ]} />
        <Dialog open={desde} onClose={() => setDesde(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Crear desde un registro existente</DialogTitle>
          <DialogContent>
            <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 1.5 }}>Elija un proveedor de SCM o un cliente de CRM: se toman su nombre y NIT y queda enlazado.</Typography>
            <Autocomplete size="small" options={opcionesOrigen} groupBy={o => o.fuente} value={origen} onChange={(_, v) => setOrigen(v)}
              getOptionLabel={o => `${o.nombre}${o.nit ? ` · ${o.nit}` : ''}`}
              renderInput={p => <TextField {...p} label="Proveedor o cliente" />} />
          </DialogContent>
          <DialogActions><Button color="inherit" onClick={() => setDesde(false)}>Cancelar</Button>
            <Button variant="contained" disabled={!origen} onClick={() => {
              setDlg({ abierto: true, r: null, ini: { nombre: origen.nombre, nit: origen.nit ?? '', [origen.clave]: origen.id, tipo: origen.tipo } })
              setDesde(false); setOrigen(null)
            }}>Continuar</Button></DialogActions>
        </Dialog>
        <FormularioRegistro abierto={dlg.abierto} titulo={dlg.r ? `Editar ${dlg.r.nombre}` : 'Nuevo tercero'} campos={campos} registro={dlg.r}
          ancho="md" valoresIniciales={{ estado: 'activo', pais: 'Colombia', ...(dlg.ini ?? {}) }}
          onGuardar={c => crud.guardar(dlg.r, c)} onCerrar={() => setDlg({ abierto: false, r: null })} />
        <FormularioRegistro abierto={!!evaluar} titulo={`Evaluar · ${evaluar?.nombre ?? ''}`} campos={camposEval}
          valoresIniciales={{ fecha: new Date().toISOString().slice(0, 10) }}
          onGuardar={async c => { await grc.evaluaciones.crear({ ...c, tercero_id: evaluar!.id }); toast.success('Evaluación registrada'); crud.refrescar() }}
          onCerrar={() => setEvaluar(null)} />
        <FichaGRC tipo="tercero" id={ficha} onCerrar={() => setFicha(null)}
          acciones={t => <Button size="small" variant="contained" startIcon={<Assessment />} sx={{ bgcolor: GRC_COLOR }} onClick={() => setEvaluar(t)}>Evaluar</Button>}
          resumen={t => [
            ['NIT', t.nit], ['Tipo', t.tipo], ['Criticidad', <ChipEstado v={t.criticidad} />],
            ['Nivel de riesgo', t.nivel_riesgo ? <ChipEstado v={t.nivel_riesgo} /> : 'Sin evaluar'], ['Estado', etiqueta(ESTADOS_TERCERO, t.estado)],
            ['Administra', t.responsable_nombre], ['Contacto', [t.contacto, t.contacto_email].filter(Boolean).join(' · ')], ['Sector', t.sector], ['País', t.pais],
          ]} />
      </Box>
    </Layout>
  )
}
