import React, { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import {
  Box, Card, CardContent, Typography, Button, Grid, Divider,
  Table, TableBody, TableCell, TableHead, TableRow,
  Chip, Alert, LinearProgress, alpha,
} from '@mui/material'
import {
  FileDownload, UploadFile, ArrowBack, CloudUpload,
  Description, CheckCircle, ErrorOutline, TableChart,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import { Layout } from '@/components/layout/Layout'
import toast from 'react-hot-toast'

const PRIMARY = '#32AC5C'

const CAMPOS = [
  { campo: 'codigo_interno',     descripcion: 'Código único de identificación de la estiba',          ejemplo: 'EST-001',        requerido: true,  tipo: 'Texto (máx. 80 caracteres)' },
  { campo: 'tipo',               descripcion: 'Tipo físico de la estiba',                              ejemplo: 'MADERA',         requerido: true,  tipo: 'MADERA · PLASTICO · METALICA · CARTON' },
  { campo: 'tipo_propietario',   descripcion: 'A quién pertenece la estiba',                           ejemplo: 'PROPIA',         requerido: true,  tipo: 'PROPIA · CLIENTE · PROVEEDOR · ALQUILADA' },
  { campo: 'fecha_ingreso',      descripcion: 'Fecha de ingreso al sistema',                           ejemplo: '2025-01-15',     requerido: true,  tipo: 'Fecha YYYY-MM-DD' },
  { campo: 'material',           descripcion: 'Material de construcción de la estiba',                 ejemplo: 'MADERA_PINO',    requerido: false, tipo: 'MADERA_PINO · MADERA_EUCALIPTO · PLASTICO_HDPE · ACERO · ALUMINIO · CARTON_CORRUGADO' },
  { campo: 'largo_cm',           descripcion: 'Largo de la estiba en centímetros',                     ejemplo: '120',            requerido: false, tipo: 'Número decimal (default: 120)' },
  { campo: 'ancho_cm',           descripcion: 'Ancho de la estiba en centímetros',                     ejemplo: '100',            requerido: false, tipo: 'Número decimal (default: 100)' },
  { campo: 'alto_cm',            descripcion: 'Alto o espesor de la estiba en centímetros',            ejemplo: '15',             requerido: false, tipo: 'Número decimal (default: 15)' },
  { campo: 'peso_kg',            descripcion: 'Peso de la estiba vacía en kilogramos',                 ejemplo: '25',             requerido: false, tipo: 'Número decimal (default: 25)' },
  { campo: 'capacidad_carga_kg', descripcion: 'Peso máximo de carga que soporta la estiba',           ejemplo: '1000',           requerido: false, tipo: 'Número decimal (default: 1000)' },
  { campo: 'valor_compra',       descripcion: 'Precio de compra en pesos colombianos (COP)',           ejemplo: '150000',         requerido: false, tipo: 'Número decimal' },
  { campo: 'vida_util_anos',     descripcion: 'Vida útil estimada en años',                            ejemplo: '5',              requerido: false, tipo: 'Número entero (default: 5)' },
  { campo: 'ubicacion_inicial_id', descripcion: 'ID numérico de la bodega o ubicación inicial',       ejemplo: '1',              requerido: false, tipo: 'Número entero (ver módulo Ubicaciones)' },
  { campo: 'proveedor_id',       descripcion: 'ID numérico del proveedor de la estiba',               ejemplo: '2',              requerido: false, tipo: 'Número entero (ver módulo Proveedores)' },
  { campo: 'fecha_fabricacion',  descripcion: 'Fecha de fabricación de la estiba',                    ejemplo: '2023-06-01',     requerido: false, tipo: 'Fecha YYYY-MM-DD' },
  { campo: 'observaciones',      descripcion: 'Notas o comentarios adicionales sobre la estiba',      ejemplo: 'Bodega central', requerido: false, tipo: 'Texto libre' },
]

const REQUIRED = CAMPOS.filter(c => c.requerido).map(c => c.campo)

function prepareItems(rows: any[]) {
  return rows.map(row => ({
    ...row,
    largo_cm:            row.largo_cm            ? parseFloat(row.largo_cm)            : 120,
    ancho_cm:            row.ancho_cm            ? parseFloat(row.ancho_cm)            : 100,
    alto_cm:             row.alto_cm             ? parseFloat(row.alto_cm)             : 15,
    peso_kg:             row.peso_kg             ? parseFloat(row.peso_kg)             : 25,
    capacidad_carga_kg:  row.capacidad_carga_kg  ? parseFloat(row.capacidad_carga_kg)  : 1000,
    valor_compra:        row.valor_compra        ? parseFloat(row.valor_compra)        : null,
    vida_util_anos:      row.vida_util_anos      ? parseInt(row.vida_util_anos)        : 5,
    ubicacion_inicial_id: row.ubicacion_inicial_id ? parseInt(row.ubicacion_inicial_id) : null,
    proveedor_id:        row.proveedor_id        ? parseInt(row.proveedor_id)          : null,
    valor_actual:        null,
  }))
}

export default function EstibasCargaMasiva() {
  const navigate = useNavigate()
  const fileRef  = useRef<HTMLInputElement>(null)

  const [fileName,    setFileName]    = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [results,     setResults]     = useState<{ exitosos: number; errores: any[]; total: number } | null>(null)

  /* ── Descargar plantilla ── */
  const downloadTemplate = () => {
    const headers = CAMPOS.map(c => c.campo)
    const ejemplo = CAMPOS.map(c => c.ejemplo)

    const ws = XLSX.utils.aoa_to_sheet([headers, ejemplo])
    ws['!cols'] = headers.map((h, i) => ({ wch: Math.max(h.length + 4, ejemplo[i].length + 4, 18) }))

    const instrucciones: any[][] = [
      ['GUÍA DE CAMPOS — Plantilla Cargue Masivo de Estibas'],
      ['Control de Estibas — ICOLTRANS'],
      [],
      ['INSTRUCCIONES:'],
      ['1. Diligencia los datos en la hoja "Estibas" a partir de la fila 2 (la fila 1 son los encabezados).'],
      ['2. No modifiques ni elimines los encabezados de la fila 1.'],
      ['3. Los campos marcados como Requerido = SÍ son obligatorios para crear la estiba.'],
      ['4. Las fechas deben estar en formato YYYY-MM-DD (ejemplo: 2025-01-15).'],
      ['5. Los IDs de ubicación y proveedor los encuentras en los módulos correspondientes del sistema.'],
      [],
      ['Campo', 'Descripción', 'Valores / Formato aceptados', 'Ejemplo', 'Requerido'],
      ...CAMPOS.map(c => [c.campo, c.descripcion, c.tipo, c.ejemplo, c.requerido ? 'SÍ' : 'NO']),
    ]
    const wsInstr = XLSX.utils.aoa_to_sheet(instrucciones)
    wsInstr['!cols'] = [{ wch: 28 }, { wch: 54 }, { wch: 70 }, { wch: 26 }, { wch: 12 }]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Estibas')
    XLSX.utils.book_append_sheet(wb, wsInstr, 'Instrucciones')
    XLSX.writeFile(wb, 'plantilla_cargue_masivo_estibas.xlsx')
    toast.success('Plantilla descargada — revisa la hoja "Instrucciones"')
  }

  /* ── Cargar archivo ── */
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setResults(null)

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer)
        const wb   = XLSX.read(data, { type: 'array', cellDates: false })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' })

        if (rows.length === 0) {
          toast.error('El archivo no tiene datos. Completa las filas desde la fila 2.')
          return
        }

        const missing = REQUIRED.filter(f => !(f in rows[0]))
        if (missing.length > 0) {
          toast.error(`Columnas obligatorias faltantes: ${missing.join(', ')}`)
          return
        }

        setPreviewData(rows)
        toast.success(`${rows.length} registros detectados y listos para cargue`)
      } catch {
        toast.error('No se pudo leer el archivo. Asegúrate de que sea un .xlsx válido.')
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  /* ── Mutation ── */
  const bulkMutation = useMutation({
    mutationFn: (rows: any[]) =>
      apiClient.post('/estibas/bulk', { items: prepareItems(rows) }).then(r => r.data),
    onSuccess: (data) => {
      setResults(data)
      setPreviewData([])
      setFileName(null)
      if (data.exitosos > 0) toast.success(`${data.exitosos} estibas creadas exitosamente`)
      if (data.errores?.length > 0) toast.error(`${data.errores.length} registros con error`)
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Error en el cargue masivo'),
  })

  const previewCols = previewData.length > 0 ? Object.keys(previewData[0]).slice(0, 5) : []

  /* ── Render ── */
  return (
    <Layout title="Cargue Masivo de Estibas">

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBack />} onClick={() => navigate('/estibas')} sx={{ color: '#64748B' }}>
          Volver a Estibas
        </Button>
        <Divider orientation="vertical" flexItem />
        <Typography sx={{ fontSize: 13, color: '#64748B' }}>
          Importa múltiples estibas desde un archivo Excel (.xlsx) en un solo paso
        </Typography>
      </Box>

      {/* Tarjetas de acción */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>

        {/* Paso 1 — Descargar plantilla */}
        <Grid item xs={12} md={6}>
          <Card sx={{
            border: `1px solid ${alpha(PRIMARY, 0.25)}`,
            background: `linear-gradient(135deg, ${alpha(PRIMARY, 0.04)} 0%, #FFF 100%)`,
            boxShadow: 'none', borderRadius: 2,
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box sx={{
                  width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
                  background: `linear-gradient(135deg, ${PRIMARY} 0%, #27884A 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 4px 12px ${alpha(PRIMARY, 0.3)}`,
                }}>
                  <FileDownload sx={{ color: '#FFF', fontSize: 22 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0D1117', letterSpacing: '-0.01em' }}>
                    Paso 1 — Descargar Plantilla
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                    Archivo Excel con formato oficial
                  </Typography>
                </Box>
              </Box>
              <Typography sx={{ fontSize: 13, color: '#475569', mb: 2.5, lineHeight: 1.7 }}>
                Descarga la plantilla con los encabezados requeridos. Incluye una fila de ejemplo
                y una hoja de <strong>Instrucciones</strong> con la descripción de cada campo.
              </Typography>
              <Button
                variant="contained" startIcon={<FileDownload />} onClick={downloadTemplate} fullWidth
                sx={{
                  py: 1.25, fontWeight: 700, letterSpacing: '-0.01em',
                  background: `linear-gradient(135deg, ${PRIMARY} 0%, #27884A 100%)`,
                  boxShadow: `0 4px 14px ${alpha(PRIMARY, 0.3)}`,
                  '&:hover': { boxShadow: `0 6px 20px ${alpha(PRIMARY, 0.4)}`, transform: 'translateY(-1px)' },
                  transition: 'all 0.18s ease',
                }}
              >
                Descargar Plantilla Excel
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Paso 2 — Cargar archivo */}
        <Grid item xs={12} md={6}>
          <Card sx={{
            border: `1px solid ${fileName ? alpha(PRIMARY, 0.35) : '#E2E8F0'}`,
            background: fileName ? alpha(PRIMARY, 0.015) : '#FAFAFA',
            boxShadow: 'none', borderRadius: 2,
            transition: 'all 0.2s ease',
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Box sx={{
                  width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
                  bgcolor: fileName ? alpha(PRIMARY, 0.12) : '#F1F5F9',
                  border: `1px solid ${fileName ? alpha(PRIMARY, 0.3) : '#E2E8F0'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}>
                  {fileName
                    ? <Description sx={{ color: PRIMARY, fontSize: 22 }} />
                    : <CloudUpload sx={{ color: '#94A3B8', fontSize: 22 }} />
                  }
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0D1117', letterSpacing: '-0.01em' }}>
                    Paso 2 — Cargar Archivo
                  </Typography>
                  <Typography
                    sx={{ fontSize: 12, color: fileName ? PRIMARY : '#64748B', fontWeight: fileName ? 600 : 400 }}
                    noWrap
                  >
                    {fileName ? `${fileName} · ${previewData.length} registros` : 'Archivo .xlsx completado'}
                  </Typography>
                </Box>
              </Box>
              <Typography sx={{ fontSize: 13, color: '#475569', mb: 2.5, lineHeight: 1.7 }}>
                Sube el archivo con los datos diligenciados. Se mostrará una <strong>vista previa</strong> antes
                de confirmar el cargue definitivo al sistema.
              </Typography>
              <input
                type="file" accept=".xlsx,.xls"
                ref={fileRef} onChange={handleFile}
                style={{ display: 'none' }}
              />
              <Button
                fullWidth startIcon={<UploadFile />}
                variant={fileName ? 'outlined' : 'contained'}
                onClick={() => fileRef.current?.click()}
                sx={{
                  py: 1.25, fontWeight: 700, letterSpacing: '-0.01em',
                  ...(fileName ? {
                    borderColor: PRIMARY, color: PRIMARY,
                    '&:hover': { bgcolor: alpha(PRIMARY, 0.05) },
                  } : {
                    bgcolor: '#1E293B', color: '#FFF',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
                    '&:hover': { bgcolor: '#111827', transform: 'translateY(-1px)', boxShadow: '0 6px 20px rgba(0,0,0,0.2)' },
                    transition: 'all 0.18s ease',
                  }),
                }}
              >
                {fileName ? 'Cambiar archivo' : 'Seleccionar Archivo Excel'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Vista previa */}
      {previewData.length > 0 && (
        <Card sx={{ mb: 3, borderRadius: 2, boxShadow: 'none', border: '1px solid #E2E8F0' }}>
          <Box sx={{
            px: 3, py: 2, borderBottom: '1px solid #F1F5F9',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap',
          }}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0D1117' }}>
                Vista previa del archivo
              </Typography>
              <Typography sx={{ fontSize: 12, color: '#64748B' }}>
                {previewData.length} registros · mostrando primeras 5 columnas
              </Typography>
            </Box>
            <Button
              variant="contained"
              onClick={() => bulkMutation.mutate(previewData)}
              disabled={bulkMutation.isPending}
              sx={{ bgcolor: PRIMARY, fontWeight: 700, px: 3, '&:hover': { bgcolor: '#27884A' } }}
            >
              {bulkMutation.isPending
                ? 'Procesando...'
                : `Confirmar cargue (${previewData.length} estibas)`
              }
            </Button>
          </Box>
          {bulkMutation.isPending && (
            <LinearProgress sx={{ bgcolor: alpha(PRIMARY, 0.1), '& .MuiLinearProgress-bar': { bgcolor: PRIMARY } }} />
          )}
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: 11, color: '#94A3B8', width: 40 }}>#</TableCell>
                  {previewCols.map(col => (
                    <TableCell key={col} sx={{ fontWeight: 700, fontSize: 11, color: '#64748B', whiteSpace: 'nowrap' }}>
                      {col}
                      {REQUIRED.includes(col) && (
                        <Box component="span" sx={{ color: '#DC2626', ml: 0.25 }}>*</Box>
                      )}
                    </TableCell>
                  ))}
                  {Object.keys(previewData[0]).length > 5 && (
                    <TableCell sx={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>
                      +{Object.keys(previewData[0]).length - 5} más
                    </TableCell>
                  )}
                </TableRow>
              </TableHead>
              <TableBody>
                {previewData.slice(0, 7).map((row, i) => (
                  <TableRow key={i} sx={{ '&:hover': { bgcolor: '#F8FAFC' } }}>
                    <TableCell sx={{ color: '#94A3B8', fontSize: 12 }}>{i + 1}</TableCell>
                    {previewCols.map(col => (
                      <TableCell key={col} sx={{
                        fontSize: 12, maxWidth: 180,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {row[col] || <Box component="span" sx={{ color: '#CBD5E1' }}>—</Box>}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {previewData.length > 7 && (
                  <TableRow>
                    <TableCell colSpan={previewCols.length + 2}
                      sx={{ textAlign: 'center', color: '#94A3B8', fontSize: 12, py: 1.5 }}>
                      … y {previewData.length - 7} registros más
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </Card>
      )}

      {/* Resultado del cargue */}
      {results && (
        <Alert
          severity={results.errores?.length === 0 ? 'success' : results.exitosos > 0 ? 'warning' : 'error'}
          icon={results.errores?.length === 0 ? <CheckCircle /> : <ErrorOutline />}
          sx={{ mb: 3, borderRadius: 2, '& .MuiAlert-message': { width: '100%' } }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: 14, mb: results.errores?.length ? 1 : 0 }}>
            Resultado: {results.exitosos} de {results.total} estibas creadas exitosamente
          </Typography>
          {results.errores?.length > 0 && (
            <Box>
              {results.errores.slice(0, 8).map((e: any, i: number) => (
                <Typography key={i} sx={{ fontSize: 12, opacity: 0.85 }}>
                  • Fila {e.fila} ({e.codigo}): {e.mensaje}
                </Typography>
              ))}
              {results.errores.length > 8 && (
                <Typography sx={{ fontSize: 12, opacity: 0.7, mt: 0.5 }}>
                  … y {results.errores.length - 8} errores adicionales
                </Typography>
              )}
            </Box>
          )}
        </Alert>
      )}

      {/* Diccionario de campos */}
      <Card sx={{ borderRadius: 2, boxShadow: 'none', border: '1px solid #E2E8F0' }}>
        <Box sx={{ px: 3, py: 2, borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <TableChart sx={{ color: PRIMARY, fontSize: 20 }} />
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 15, color: '#0D1117' }}>
              Diccionario de campos
            </Typography>
            <Typography sx={{ fontSize: 12, color: '#64748B' }}>
              Descripción completa de cada columna disponible en la plantilla
            </Typography>
          </Box>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                {['Campo', 'Descripción', 'Valores / Formato', 'Ejemplo', 'Oblig.'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: 11.5, color: '#64748B', whiteSpace: 'nowrap' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {CAMPOS.map(c => (
                <TableRow key={c.campo} sx={{ '&:hover': { bgcolor: '#F8FAFC' } }}>
                  <TableCell>
                    <Typography sx={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: '#0D1117' }}>
                      {c.campo}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12.5, color: '#475569', maxWidth: 280 }}>
                    {c.descripcion}
                  </TableCell>
                  <TableCell sx={{ fontSize: 11.5, color: '#64748B', maxWidth: 300 }}>
                    {c.tipo}
                  </TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, color: '#64748B' }}>
                    {c.ejemplo}
                  </TableCell>
                  <TableCell>
                    {c.requerido
                      ? <Chip label="Requerido" size="small" sx={{ fontSize: 10.5, height: 20, fontWeight: 700, bgcolor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }} />
                      : <Chip label="Opcional"  size="small" sx={{ fontSize: 10.5, height: 20, fontWeight: 600, bgcolor: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }} />
                    }
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Card>
    </Layout>
  )
}
