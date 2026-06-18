import React, { useState, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import {
  Box, Typography, Button, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip, Alert,
  CircularProgress,
} from '@mui/material'
import { PlayArrow as EjecutarIcon, FileDownload as ExportIcon, Storage as DbIcon } from '@mui/icons-material'
import * as XLSX from 'xlsx'
import { apiClient } from '../api/client'
import { Layout } from '@/components/layout/Layout'

interface ConsultaResult {
  columnas: string[]
  filas: (string | null)[][]
  total_filas: number
  tiempo_ms: number
}

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN',
  'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET', 'JOIN', 'LEFT JOIN',
  'INNER JOIN', 'ON', 'AS', 'DISTINCT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX',
  'COALESCE', 'NULLIF', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'IS NULL', 'IS NOT NULL', 'ASC', 'DESC', 'CURRENT_DATE', 'NOW',
  'date_trunc', 'to_char', 'EXTRACT', 'CAST', 'true', 'false',
]

const EJEMPLOS = [
  { label: 'Estibas por estado',       sql: `SELECT estado, COUNT(*) AS total\nFROM estibas\nWHERE activo = true\nGROUP BY estado\nORDER BY total DESC` },
  { label: 'Estibas en tránsito',      sql: `SELECT codigo_interno, tipo, tipo_propietario, fecha_ingreso\nFROM estibas\nWHERE estado = 'EN_TRANSITO' AND activo = true\nORDER BY fecha_ingreso` },
  { label: 'Top costos mantenimiento', sql: `SELECT e.codigo_interno, e.estado,\n       COUNT(m.id) AS mantenimientos,\n       COALESCE(SUM(m.costo), 0) AS costo_total\nFROM estibas e\nLEFT JOIN mantenimientos_estiba m ON m.estiba_id = e.id\nGROUP BY e.id, e.codigo_interno, e.estado\nORDER BY costo_total DESC\nLIMIT 20` },
  { label: 'Movimientos del mes',      sql: `SELECT tipo, COUNT(*) AS total\nFROM movimientos\nWHERE fecha_movimiento >= date_trunc('month', CURRENT_DATE)\nGROUP BY tipo\nORDER BY total DESC` },
  { label: 'Ocupación ubicaciones',    sql: `SELECT u.nombre, u.tipo, u.capacidad_estibas,\n       COUNT(e.id) AS estibas_actuales\nFROM ubicaciones u\nLEFT JOIN estibas e ON e.ubicacion_actual_id = u.id AND e.activo = true\nWHERE u.activo = true\nGROUP BY u.id, u.nombre, u.tipo, u.capacidad_estibas\nORDER BY estibas_actuales DESC` },
]

export default function Consultas() {
  const [sql, setSql] = useState('')
  const [resultado, setResultado] = useState<ConsultaResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [schemaCount, setSchemaCount] = useState(0)
  const [editorHeight, setEditorHeight] = useState(220)
  const [dragging, setDragging] = useState(false)

  // Ref para que el completion provider siempre lea el schema más reciente
  const schemaRef = useRef<Record<string, string[]>>({})
  const editorRef = useRef<any>(null)
  const editorBoxRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const dragStartY = useRef(0)
  const dragStartHeight = useRef(220)

  useEffect(() => {
    apiClient.get('/consultas/schema')
      .then(({ data }) => {
        schemaRef.current = data
        setSchemaCount(Object.keys(data).length)
      })
      .catch(() => {})
  }, [])

  // ── Drag to resize ────────────────────────────────────────────────────────
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    setDragging(true)
    dragStartY.current = e.clientY
    dragStartHeight.current = editorHeight

    const onMove = (ev: MouseEvent) => {
      if (!isDragging.current) return
      const delta = ev.clientY - dragStartY.current
      const next = Math.max(100, Math.min(700, dragStartHeight.current + delta))
      setEditorHeight(next)
    }
    const onUp = () => {
      isDragging.current = false
      setDragging(false)
      editorRef.current?.layout()
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // ── Ejecutar consulta ────────────────────────────────────────────────────
  const ejecutar = async (sqlToRun?: string) => {
    const query = sqlToRun ?? sql
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setResultado(null)
    try {
      const { data } = await apiClient.post('/consultas/ejecutar', { sql: query, limite: 5000 })
      setResultado(data)
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Error al ejecutar la consulta')
    } finally {
      setLoading(false)
    }
  }

  // ── Exportar ─────────────────────────────────────────────────────────────
  const exportarExcel = () => {
    if (!resultado) return
    const ws = XLSX.utils.aoa_to_sheet([
      resultado.columnas,
      ...resultado.filas.map(f => f.map(v => v ?? '')),
    ])
    ws['!cols'] = resultado.columnas.map(() => ({ wch: 20 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Consulta')
    XLSX.writeFile(wb, `consulta_CE_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  // ── Monaco beforeMount: tema + autocompletado ─────────────────────────────
  const handleBeforeMount = (monacoInstance: any) => {
    // Tema verde claro
    monacoInstance.editor.defineTheme('ce-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '1a7a3a', fontStyle: 'bold' },
        { token: 'string', foreground: '2563eb' },
        { token: 'number', foreground: 'b45309' },
        { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
      ],
      colors: {
        'editor.background':                '#EAF6EA',
        'editor.lineHighlightBackground':   '#d4edda',
        'editorLineNumber.foreground':      '#86b994',
        'editorLineNumber.activeForeground':'#27884A',
        'editor.selectionBackground':       '#b7dfb8',
        'editorCursor.foreground':          '#27884A',
        'editorSuggestWidget.background':   '#f0faf0',
        'editorSuggestWidget.border':       '#369E4D',
        'editorSuggestWidget.selectedBackground': '#d4edda',
        'editor.inactiveSelectionBackground': '#c8e6c9',
      },
    })

    // Autocompletado SQL usando la misma instancia de Monaco
    monacoInstance.languages.registerCompletionItemProvider('sql', {
      triggerCharacters: [' ', '.', '\n', '('],
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber:   position.lineNumber,
          startColumn:     word.startColumn,
          endColumn:       word.endColumn,
        }
        const currentSchema = schemaRef.current

        const suggestions = [
          ...SQL_KEYWORDS.map((kw: string) => ({
            label: kw,
            kind: monacoInstance.languages.CompletionItemKind.Keyword,
            insertText: kw,
            range,
            detail: 'SQL',
            sortText: '0_' + kw,
          })),
          ...Object.keys(currentSchema).map((table: string) => ({
            label: table,
            kind: monacoInstance.languages.CompletionItemKind.Class,
            insertText: table,
            range,
            detail: `tabla · ${currentSchema[table].length} cols`,
            documentation: currentSchema[table].join(', '),
            sortText: '1_' + table,
          })),
          ...Object.entries(currentSchema).flatMap(([table, cols]: [string, string[]]) =>
            cols.map((col: string) => ({
              label: col,
              kind: monacoInstance.languages.CompletionItemKind.Field,
              insertText: col,
              range,
              detail: `columna · ${table}`,
              sortText: '2_' + col,
            }))
          ),
        ]
        return { suggestions }
      },
    })
  }

  const handleEditorMount = (editor: any, monacoInstance: any) => {
    editorRef.current = editor
    monacoInstance.editor.setTheme('ce-light')
    editor.addCommand(
      monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Enter,
      () => ejecutar(editor.getValue())
    )
  }

  return (
    <Layout title="Consultas SQL">
      {/* Overlay transparente que bloquea Monaco durante el arrastre */}
      {dragging && (
        <Box sx={{
          position: 'fixed', inset: 0, zIndex: 9999,
          cursor: 'ns-resize',
        }} />
      )}
      <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>

        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{
              width: 40, height: 40, borderRadius: '10px',
              background: 'linear-gradient(135deg, #32AC5C 0%, #27884A 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <DbIcon sx={{ color: '#fff', fontSize: 20 }} />
            </Box>
            <Box>
              <Typography variant="h5" fontWeight={700} color="text.primary" lineHeight={1.2}>
                Consultas SQL
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                Acceso directo a la base de datos — solo consultas SELECT
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<ExportIcon />}
            onClick={exportarExcel}
            disabled={!resultado || resultado.filas.length === 0}
            sx={{
              borderRadius: 2, fontWeight: 600, px: 3, py: 1,
              background: 'linear-gradient(135deg, #32AC5C 0%, #27884A 100%)',
              '&:hover': { background: 'linear-gradient(135deg, #27884A 0%, #1f6b3a 100%)' },
              '&.Mui-disabled': { opacity: 0.45 },
            }}
          >
            Exportar a Excel
          </Button>
        </Box>

        {/* Ejemplos */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mr: 0.5 }}>
            EJEMPLOS:
          </Typography>
          {EJEMPLOS.map((ej) => (
            <Chip
              key={ej.label}
              label={ej.label}
              size="small"
              variant="outlined"
              onClick={() => { setSql(ej.sql); editorRef.current?.setValue(ej.sql) }}
              sx={{
                cursor: 'pointer', fontSize: 11.5,
                borderColor: 'rgba(54,158,77,0.35)',
                color: 'text.secondary',
                '&:hover': { bgcolor: 'rgba(54,158,77,0.08)', borderColor: '#369E4D', color: '#369E4D' },
                transition: 'all 0.15s',
              }}
            />
          ))}
        </Box>

        {/* Editor */}
        <Paper elevation={0} sx={{ mb: 2, borderRadius: 3, overflow: 'hidden', border: '2px solid #369E4D' }}>

          {/* Barra superior */}
          <Box sx={{
            px: 2, py: 1, bgcolor: '#EAF6EA',
            borderBottom: '1px solid rgba(54,158,77,0.25)',
            display: 'flex', alignItems: 'center', gap: 1,
          }}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#ff5f57' }} />
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#febc2e' }} />
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#28c840' }} />
            <Typography variant="caption" sx={{ ml: 1, color: '#369E4D', fontWeight: 600 }}>
              SQL Editor — Control de Estibas
            </Typography>
            {schemaCount > 0 && (
              <Chip
                label={`${schemaCount} tablas`}
                size="small"
                sx={{ ml: 'auto', bgcolor: 'rgba(54,158,77,0.12)', color: '#27884A', fontSize: 10.5, height: 20 }}
              />
            )}
          </Box>

          {/* Monaco */}
          <Box ref={editorBoxRef} sx={{ bgcolor: '#EAF6EA' }}>
            <Editor
              height={`${editorHeight}px`}
              language="sql"
              value={sql}
              onChange={(val) => setSql(val ?? '')}
              beforeMount={handleBeforeMount}
              onMount={handleEditorMount}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace',
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                suggestOnTriggerCharacters: true,
                quickSuggestions: { other: true, comments: false, strings: true },
                tabSize: 2,
                padding: { top: 14, bottom: 14 },
                scrollbar: { vertical: 'auto', horizontal: 'hidden' },
                overviewRulerLanes: 0,
                renderLineHighlight: 'line',
                lineDecorationsWidth: 8,
                glyphMargin: false,
                theme: 'ce-light',
              }}
            />
          </Box>

          {/* Handle de arrastre */}
          <Box
            onMouseDown={handleDragStart}
            sx={{
              height: 12,
              bgcolor: '#EAF6EA',
              cursor: 'ns-resize',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderTop: '1px solid rgba(54,158,77,0.15)',
              '&:hover': { bgcolor: 'rgba(54,158,77,0.14)' },
              '&:hover .drag-pill': { bgcolor: '#369E4D', width: '56px' },
              transition: 'background 0.15s',
            }}
          >
            <Box
              className="drag-pill"
              sx={{
                width: 40, height: 4, borderRadius: 2,
                bgcolor: 'rgba(54,158,77,0.35)',
                transition: 'all 0.15s',
              }}
            />
          </Box>

          {/* Pie */}
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            px: 2.5, py: 1.25,
            bgcolor: '#EAF6EA',
            borderTop: '1px solid rgba(54,158,77,0.2)',
          }}>
            <Typography variant="caption" sx={{ color: '#6b9e74' }}>
              Ctrl + Enter para ejecutar · Máx 5.000 filas · Solo SELECT
            </Typography>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={15} color="inherit" /> : <EjecutarIcon />}
              onClick={() => ejecutar()}
              disabled={loading || !sql.trim()}
              size="small"
              sx={{
                borderRadius: 2, fontWeight: 600, minWidth: 130, px: 2.5,
                background: 'linear-gradient(135deg, #369E4D 0%, #27884A 100%)',
                '&:hover': { background: 'linear-gradient(135deg, #27884A 0%, #1f6b3a 100%)' },
                '&.Mui-disabled': { opacity: 0.4 },
              }}
            >
              {loading ? 'Ejecutando...' : 'Ejecutar'}
            </Button>
          </Box>
        </Paper>

        {/* Error */}
        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontFamily: 'monospace', fontSize: 13 }}>
            {error}
          </Alert>
        )}

        {/* Resultados */}
        {resultado && (
          <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
            <Box sx={{
              px: 2.5, py: 1.5,
              borderBottom: '1px solid', borderColor: 'divider',
              display: 'flex', alignItems: 'center', gap: 2,
              bgcolor: 'background.paper',
            }}>
              <Chip
                label={`${resultado.total_filas.toLocaleString()} filas`}
                size="small"
                sx={{ bgcolor: 'rgba(54,158,77,0.1)', color: '#27884A', fontWeight: 700, fontSize: 12 }}
              />
              <Chip
                label={`${resultado.columnas.length} columnas`}
                size="small"
                variant="outlined"
                sx={{ fontSize: 12 }}
              />
              <Typography variant="caption" color="text.secondary">
                {resultado.tiempo_ms} ms
              </Typography>
            </Box>
            <TableContainer sx={{ maxHeight: 500 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {resultado.columnas.map((col) => (
                      <TableCell
                        key={col}
                        sx={{
                          fontWeight: 700, fontSize: 12,
                          bgcolor: 'background.paper',
                          whiteSpace: 'nowrap',
                          borderBottom: '2px solid',
                          borderBottomColor: 'divider',
                          color: '#369E4D',
                          letterSpacing: '0.03em',
                        }}
                      >
                        {col}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {resultado.filas.map((fila, i) => (
                    <TableRow key={i} hover sx={{ '&:hover': { bgcolor: 'rgba(54,158,77,0.04)' } }}>
                      {fila.map((celda, j) => (
                        <TableCell
                          key={j}
                          sx={{
                            whiteSpace: 'nowrap',
                            fontFamily: '"Fira Code", "Consolas", monospace',
                            fontSize: 12.5,
                            py: 0.75,
                            color: celda === null ? 'text.disabled' : 'text.primary',
                            fontStyle: celda === null ? 'italic' : 'normal',
                          }}
                        >
                          {celda === null ? 'null' : celda}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}
      </Box>
    </Layout>
  )
}
