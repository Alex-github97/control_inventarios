import React, { useState, useRef, useMemo } from 'react'
import {
  Box,
  Typography,
  Chip,
  Stack,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  alpha,
  IconButton,
  Button,
  Breadcrumbs,
  Link,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Menu,
  Divider,
} from '@mui/material'
import Grid from '@mui/material/Grid2'
import {
  Folder,
  FolderOpen,
  Description,
  PictureAsPdf,
  TableChart,
  Article,
  Image,
  ViewModule,
  ViewList,
  UploadFile,
  CreateNewFolder,
  ExpandMore,
  ChevronRight,
  MoreVert,
  Download,
  Share,
  History,
  Delete,
  OpenInNew,
  NavigateNext,
  CloudUpload,
} from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/api/client'
import toast from 'react-hot-toast'

const DMS_COLOR = '#0E7490'

const extDe = (nombre: string): string => {
  const m = /\.([a-z0-9]+)$/i.exec(nombre || '')
  return m ? m[1].toLowerCase() : ''
}
const fmtFechaR = (s?: string | null) => (s ? new Date(s).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—')

// ─── Folder tree mock ─────────────────────────────────────────────────────────

interface FolderNode {
  id: string
  name: string
  children?: FolderNode[]
}

// Carpeta del backend y construcción del árbol
interface Carpeta { id: number; nombre: string; carpeta_padre_id?: number | null }
function buildTree(carpetas: Carpeta[]): FolderNode[] {
  const byParent = new Map<number | null, Carpeta[]>()
  for (const c of carpetas) {
    const p = c.carpeta_padre_id ?? null
    if (!byParent.has(p)) byParent.set(p, [])
    byParent.get(p)!.push(c)
  }
  const make = (padre: number | null): FolderNode[] =>
    (byParent.get(padre) || []).map((c) => {
      const hijos = make(c.id)
      return { id: String(c.id), name: c.nombre, ...(hijos.length ? { children: hijos } : {}) }
    })
  return make(null)
}

interface FileItem {
  id: number
  nombre: string
  ext: string
  tamano: string
  version: string
  modificado: string
}
// Documento del backend
interface DocItem { id: number; nombre: string; version_actual: string; updated_at?: string; estado: string }

// ─── File icon & color ────────────────────────────────────────────────────────

function getFileConfig(ext: string) {
  switch (ext) {
    case 'pdf':  return { icon: <PictureAsPdf />, color: '#DC2626', bg: alpha('#DC2626', 0.08) }
    case 'xlsx': return { icon: <TableChart />,   color: '#16A34A', bg: alpha('#16A34A', 0.08) }
    case 'docx': return { icon: <Article />,      color: '#2563EB', bg: alpha('#2563EB', 0.08) }
    case 'jpg':  return { icon: <Image />,        color: '#6B7280', bg: alpha('#6B7280', 0.08) }
    default:     return { icon: <Description />,  color: '#6B7280', bg: '#F3F4F6' }
  }
}

// ─── Folder tree node ─────────────────────────────────────────────────────────

interface FolderNodeProps {
  node: FolderNode
  selectedId: string
  onSelect: (id: string, name: string) => void
  depth?: number
}

function FolderTreeNode({ node, selectedId, onSelect, depth = 0 }: FolderNodeProps) {
  const [open, setOpen] = useState(depth === 0)
  const hasChildren = !!node.children?.length
  const isSelected = selectedId === node.id

  return (
    <Box>
      <Box
        onClick={() => { onSelect(node.id, node.name); if (hasChildren) setOpen((v) => !v) }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.75,
          px: 1.5,
          py: 0.75,
          pl: `${12 + depth * 16}px`,
          cursor: 'pointer',
          borderRadius: '8px',
          mx: 0.75,
          bgcolor: isSelected ? alpha(DMS_COLOR, 0.12) : 'transparent',
          color: isSelected ? DMS_COLOR : 'text.primary',
          '&:hover': { bgcolor: isSelected ? alpha(DMS_COLOR, 0.15) : '#F9FAFB' },
        }}
      >
        {hasChildren
          ? (open ? <ExpandMore sx={{ fontSize: 16, flexShrink: 0 }} /> : <ChevronRight sx={{ fontSize: 16, flexShrink: 0 }} />)
          : <Box sx={{ width: 16, flexShrink: 0 }} />
        }
        {isSelected || open
          ? <FolderOpen sx={{ fontSize: 18, color: isSelected ? DMS_COLOR : '#D97706', flexShrink: 0 }} />
          : <Folder sx={{ fontSize: 18, color: '#D97706', flexShrink: 0 }} />
        }
        <Typography fontSize={13} fontWeight={isSelected ? 700 : 400} noWrap flex={1}>
          {node.name}
        </Typography>
      </Box>
      {hasChildren && open && (
        <Box>
          {node.children!.map((child) => (
            <FolderTreeNode key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} depth={depth + 1} />
          ))}
        </Box>
      )}
    </Box>
  )
}

// ─── File card (grid view) ────────────────────────────────────────────────────

function FileCard({ file, onContextMenu }: { file: FileItem; onContextMenu: (e: React.MouseEvent, id: number) => void }) {
  const cfg = getFileConfig(file.ext)
  return (
    <Paper
      elevation={0}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, file.id) }}
      sx={{
        border: '1px solid #E5E7EB',
        borderRadius: '12px',
        p: 2,
        cursor: 'pointer',
        transition: 'all 0.15s',
        '&:hover': { borderColor: DMS_COLOR, boxShadow: `0 0 0 2px ${alpha(DMS_COLOR, 0.12)}` },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 56, height: 56, borderRadius: '12px', bgcolor: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {React.cloneElement(cfg.icon, { sx: { fontSize: 32, color: cfg.color } })}
        </Box>
        <Typography fontSize={12} fontWeight={600} textAlign="center" noWrap sx={{ width: '100%' }}>
          {file.nombre}
        </Typography>
        <Stack direction="row" spacing={0.75}>
          <Typography fontSize={10} color="text.disabled">{file.tamano}</Typography>
          <Typography fontSize={10} color="text.disabled">·</Typography>
          <Typography fontSize={10} color="text.disabled">{file.modificado}</Typography>
        </Stack>
      </Box>
    </Paper>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DMSRepositorio() {
  const qc = useQueryClient()
  const [selectedFolder, setSelectedFolder] = useState<string>('')
  const [breadcrumb, setBreadcrumb] = useState<string[]>(['Todos los documentos'])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; fileId: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [form, setForm] = useState<{ nombre: string; descripcion: string; archivo: File | null }>({ nombre: '', descripcion: '', archivo: null })

  const { data: carpetas = [] } = useQuery<Carpeta[]>({
    queryKey: ['dms-carpetas'],
    queryFn: () => apiClient.get('/dms/carpetas').then((r) => r.data),
  })
  const tree = useMemo(() => buildTree(carpetas), [carpetas])
  const carpetaId = selectedFolder ? Number(selectedFolder) : undefined

  const { data: docs = [] } = useQuery<DocItem[]>({
    queryKey: ['dms-docs', carpetaId],
    queryFn: () => apiClient.get('/dms/documentos', { params: carpetaId ? { carpeta_id: carpetaId } : {} }).then((r) => r.data),
  })
  const files: FileItem[] = docs.map((d) => ({
    id: d.id, nombre: d.nombre, ext: extDe(d.nombre), tamano: '—',
    version: `v${d.version_actual}`, modificado: fmtFechaR(d.updated_at),
  }))

  const handleFolderSelect = (id: string, name: string) => {
    setSelectedFolder(id)
    setBreadcrumb([name])
  }

  const handleContextMenu = (e: React.MouseEvent, fileId: number) => {
    setContextMenu({ x: e.clientX, y: e.clientY, fileId })
  }

  const descargar = async (docId: number) => {
    try {
      const res = await apiClient.get(`/dms/documentos/${docId}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(res.data as Blob)
      const nombre = docs.find((d) => d.id === docId)?.nombre || 'documento'
      const a = document.createElement('a'); a.href = url; a.download = nombre; a.click(); URL.revokeObjectURL(url)
    } catch {
      toast.error('El documento aún no tiene archivo para descargar')
    }
  }

  const subir = async () => {
    if (!form.archivo) { toast.error('Selecciona un archivo'); return }
    setSubiendo(true)
    try {
      const nombre = form.nombre.trim() || form.archivo.name
      const descripcion = form.descripcion.trim() || undefined
      const doc = (await apiClient.post('/dms/documentos', { nombre, descripcion, ...(carpetaId ? { carpeta_id: carpetaId } : {}) })).data
      const fd = new FormData(); fd.append('file', form.archivo)
      await apiClient.post(`/dms/documentos/${doc.id}/upload`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      toast.success('Documento subido')
      setUploadOpen(false); setForm({ nombre: '', descripcion: '', archivo: null })
      qc.invalidateQueries({ queryKey: ['dms-docs'] })
      qc.invalidateQueries({ queryKey: ['dms-kpis'] })
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Error al subir el documento')
    } finally { setSubiendo(false) }
  }

  return (
    <Layout title="DMS — Repositorio">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0, height: 'calc(100vh - 120px)' }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <Stack direction="row" alignItems="center" spacing={1.5} mb={2}>
          <Box sx={{ width: 40, height: 40, borderRadius: '10px', bgcolor: alpha(DMS_COLOR, 0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FolderOpen sx={{ color: DMS_COLOR, fontSize: 22 }} />
          </Box>
          <Box>
            <Typography fontSize={20} fontWeight={800} color="text.primary">Repositorio Documental</Typography>
            <Typography fontSize={12} color="text.secondary">Explorador de archivos y carpetas</Typography>
          </Box>
        </Stack>

        {/* ── Two-panel layout ─────────────────────────────────────────────── */}
        <Box sx={{ display: 'flex', gap: 2, flex: 1, overflow: 'hidden' }}>

          {/* Left panel — folder tree */}
          <Paper
            elevation={0}
            sx={{ width: 250, flexShrink: 0, border: '1px solid #E5E7EB', borderRadius: '14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography fontSize={12} fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Carpetas
              </Typography>
              <Tooltip title="Nueva Carpeta">
                <IconButton size="small" sx={{ color: DMS_COLOR }}>
                  <CreateNewFolder sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Box>
            <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
              <Box
                onClick={() => { setSelectedFolder(''); setBreadcrumb(['Todos los documentos']) }}
                sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.75, pl: '12px', cursor: 'pointer', borderRadius: '8px', mx: 0.75, bgcolor: !selectedFolder ? alpha(DMS_COLOR, 0.12) : 'transparent', color: !selectedFolder ? DMS_COLOR : 'text.primary', '&:hover': { bgcolor: !selectedFolder ? alpha(DMS_COLOR, 0.15) : '#F9FAFB' } }}
              >
                <Box sx={{ width: 16, flexShrink: 0 }} />
                <FolderOpen sx={{ fontSize: 18, color: !selectedFolder ? DMS_COLOR : '#D97706', flexShrink: 0 }} />
                <Typography fontSize={13} fontWeight={!selectedFolder ? 700 : 400} noWrap flex={1}>Todos los documentos</Typography>
              </Box>
              {tree.map((node) => (
                <FolderTreeNode key={node.id} node={node} selectedId={selectedFolder} onSelect={handleFolderSelect} />
              ))}
              {tree.length === 0 && (
                <Typography fontSize={11.5} color="text.secondary" sx={{ px: 2, py: 1 }}>Aún no hay carpetas</Typography>
              )}
            </Box>
          </Paper>

          {/* Right panel — file browser */}
          <Paper
            elevation={0}
            sx={{ flex: 1, border: '1px solid #E5E7EB', borderRadius: '14px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            {/* Toolbar */}
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
              <Breadcrumbs separator={<NavigateNext sx={{ fontSize: 16 }} />}>
                <Link underline="hover" sx={{ fontSize: 12, cursor: 'pointer', color: 'text.secondary' }}>Inicio</Link>
                {breadcrumb.map((b, i) => (
                  <Typography key={i} fontSize={12} fontWeight={i === breadcrumb.length - 1 ? 700 : 400} color={i === breadcrumb.length - 1 ? 'text.primary' : 'text.secondary'}>
                    {b}
                  </Typography>
                ))}
              </Breadcrumbs>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Chip label={`${files.length} archivos`} size="small" sx={{ fontSize: 11, bgcolor: '#F3F4F6', color: 'text.secondary' }} />
                <Tooltip title="Vista en cuadrícula">
                  <IconButton size="small" onClick={() => setViewMode('grid')} sx={{ color: viewMode === 'grid' ? DMS_COLOR : 'text.disabled' }}>
                    <ViewModule sx={{ fontSize: 20 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Vista en lista">
                  <IconButton size="small" onClick={() => setViewMode('list')} sx={{ color: viewMode === 'list' ? DMS_COLOR : 'text.disabled' }}>
                    <ViewList sx={{ fontSize: 20 }} />
                  </IconButton>
                </Tooltip>
                <Divider orientation="vertical" flexItem />
                <Button
                  variant="contained"
                  startIcon={<UploadFile />}
                  size="small"
                  onClick={() => setUploadOpen(true)}
                  sx={{ bgcolor: DMS_COLOR, '&:hover': { bgcolor: '#0C6479' }, borderRadius: '8px', fontSize: 12 }}
                >
                  Subir Documento
                </Button>
              </Stack>
            </Box>

            {/* File area */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
              {viewMode === 'grid' ? (
                <Grid container spacing={1.5}>
                  {files.map((f) => (
                    <Grid key={f.id} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                      <FileCard file={f} onContextMenu={handleContextMenu} />
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ '& th': { fontSize: 11, fontWeight: 700, color: 'text.secondary', py: 1, bgcolor: '#FAFAFA' } }}>
                        <TableCell>Nombre</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Tamaño</TableCell>
                        <TableCell>Versión</TableCell>
                        <TableCell>Modificado</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {files.map((f) => {
                        const cfg = getFileConfig(f.ext)
                        return (
                          <TableRow key={f.id} hover onContextMenu={(e) => { e.preventDefault(); handleContextMenu(e, f.id) }} sx={{ '& td': { fontSize: 12, py: 0.75 }, cursor: 'pointer' }}>
                            <TableCell>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Box sx={{ width: 28, height: 28, borderRadius: '6px', bgcolor: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  {React.cloneElement(cfg.icon, { sx: { fontSize: 16, color: cfg.color } })}
                                </Box>
                                <Typography fontSize={12} fontWeight={600}>{f.nombre}</Typography>
                              </Stack>
                            </TableCell>
                            <TableCell><Chip label={f.ext.toUpperCase()} size="small" sx={{ fontSize: 10, height: 20, bgcolor: cfg.bg, color: cfg.color, fontWeight: 700 }} /></TableCell>
                            <TableCell sx={{ color: 'text.secondary' }}>{f.tamano}</TableCell>
                            <TableCell><Chip label={f.version} size="small" sx={{ fontSize: 10, height: 20, bgcolor: alpha(DMS_COLOR, 0.08), color: DMS_COLOR, fontWeight: 700 }} /></TableCell>
                            <TableCell sx={{ color: 'text.secondary' }}>{f.modificado}</TableCell>
                            <TableCell>
                              <IconButton size="small" onClick={(e) => handleContextMenu(e, f.id)}>
                                <MoreVert sx={{ fontSize: 18 }} />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Box>
          </Paper>
        </Box>

        {/* ── Context menu ─────────────────────────────────────────────────── */}
        <Menu
          open={!!contextMenu}
          onClose={() => setContextMenu(null)}
          anchorReference="anchorPosition"
          anchorPosition={contextMenu ? { top: contextMenu.y, left: contextMenu.x } : undefined}
          PaperProps={{ sx: { borderRadius: '10px', minWidth: 160, boxShadow: '0 8px 32px rgba(0,0,0,0.12)' } }}
        >
          {[
            { label: 'Descargar', icon: <Download sx={{ fontSize: 16 }} />, action: () => contextMenu && descargar(contextMenu.fileId) },
            { label: 'Abrir', icon: <OpenInNew sx={{ fontSize: 16 }} />, action: () => contextMenu && descargar(contextMenu.fileId) },
            { label: 'Ver versiones', icon: <History sx={{ fontSize: 16 }} />, action: () => {} },
            { label: 'Compartir', icon: <Share sx={{ fontSize: 16 }} />, action: () => {} },
          ].map((item) => (
            <Box
              key={item.label}
              onClick={() => { item.action(); setContextMenu(null) }}
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1, cursor: 'pointer', '&:hover': { bgcolor: '#F9FAFB' } }}
            >
              <Box sx={{ color: 'text.secondary' }}>{item.icon}</Box>
              <Typography fontSize={13}>{item.label}</Typography>
            </Box>
          ))}
          <Divider />
          <Box
            onClick={() => setContextMenu(null)}
            sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1, cursor: 'pointer', '&:hover': { bgcolor: alpha('#DC2626', 0.06) }, color: '#DC2626' }}
          >
            <Delete sx={{ fontSize: 16 }} />
            <Typography fontSize={13} color="#DC2626">Eliminar</Typography>
          </Box>
        </Menu>

        {/* ── Dialog: Subir Documento ───────────────────────────────────── */}
        <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '16px' } }}>
          <DialogTitle sx={{ fontWeight: 700, fontSize: 16 }}>Subir Documento</DialogTitle>
          <DialogContent>
            <Stack spacing={2.5} mt={1}>
              <input
                ref={fileInputRef}
                type="file"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) setForm((prev) => ({ ...prev, archivo: f, nombre: prev.nombre || f.name }))
                }}
              />
              <Box
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e: React.DragEvent) => e.preventDefault()}
                onDrop={(e: React.DragEvent) => {
                  e.preventDefault()
                  const f = e.dataTransfer.files?.[0]
                  if (f) setForm((prev) => ({ ...prev, archivo: f, nombre: prev.nombre || f.name }))
                }}
                sx={{
                  border: `2px dashed ${form.archivo ? DMS_COLOR : alpha(DMS_COLOR, 0.4)}`,
                  borderRadius: '12px',
                  p: 4,
                  textAlign: 'center',
                  bgcolor: alpha(DMS_COLOR, form.archivo ? 0.06 : 0.03),
                  cursor: 'pointer',
                  '&:hover': { borderColor: DMS_COLOR, bgcolor: alpha(DMS_COLOR, 0.06) },
                }}
              >
                <CloudUpload sx={{ fontSize: 40, color: alpha(DMS_COLOR, 0.5), mb: 1 }} />
                {form.archivo ? (
                  <>
                    <Typography fontSize={14} fontWeight={700} color={DMS_COLOR} noWrap>
                      {form.archivo.name}
                    </Typography>
                    <Typography fontSize={12} color="text.secondary" mt={0.5}>
                      {(form.archivo.size / 1024).toFixed(0)} KB — clic para cambiar
                    </Typography>
                  </>
                ) : (
                  <>
                    <Typography fontSize={14} fontWeight={600} color={DMS_COLOR}>
                      Arrastra el archivo aquí
                    </Typography>
                    <Typography fontSize={12} color="text.secondary" mt={0.5}>
                      o haz clic para seleccionar — PDF, DOCX, XLSX, JPG
                    </Typography>
                  </>
                )}
              </Box>
              <TextField
                label="Nombre del documento"
                size="small"
                fullWidth
                value={form.nombre}
                onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.target.value }))}
              />
              <TextField
                label="Descripción"
                size="small"
                fullWidth
                multiline
                rows={2}
                value={form.descripcion}
                onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.target.value }))}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setUploadOpen(false)} sx={{ color: 'text.secondary' }} disabled={subiendo}>Cancelar</Button>
            <Button
              variant="contained"
              onClick={subir}
              disabled={subiendo || !form.archivo}
              sx={{ bgcolor: DMS_COLOR, '&:hover': { bgcolor: '#0C6479' }, borderRadius: '8px' }}
            >
              {subiendo ? 'Subiendo…' : 'Subir'}
            </Button>
          </DialogActions>
        </Dialog>

      </Box>
    </Layout>
  )
}
