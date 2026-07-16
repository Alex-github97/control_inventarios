import React, { useState, useRef } from 'react'
import { Box } from '@mui/material'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { WorkspacePanel } from './WorkspacePanel'

const MIN_SIDEBAR    = 68
const MAX_SIDEBAR    = 420
const DEFAULT_SIDEBAR = 252

const MIN_WS     = 44
const MAX_WS     = 200
const DEFAULT_WS = 52

interface LayoutProps {
  children: React.ReactNode
  title?: string
  noPadding?: boolean
}

export function Layout({ children, title, noPadding = false }: LayoutProps) {
  const [sidebarWidth,   setSidebarWidth]   = useState(DEFAULT_SIDEBAR)
  const [workspaceWidth, setWorkspaceWidth] = useState(DEFAULT_WS)
  const [draggingSidebar,   setDraggingSidebar]   = useState(false)
  const [draggingWorkspace, setDraggingWorkspace] = useState(false)

  // ── Sidebar drag ────────────────────────────────────────────
  const isSidebarDragging  = useRef(false)
  const sidebarStartX      = useRef(0)
  const sidebarStartWidth  = useRef(DEFAULT_SIDEBAR)

  const handleSidebarDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    isSidebarDragging.current = true
    setDraggingSidebar(true)
    sidebarStartX.current     = e.clientX
    sidebarStartWidth.current = sidebarWidth

    const onMove = (ev: MouseEvent) => {
      if (!isSidebarDragging.current) return
      const next = Math.max(MIN_SIDEBAR, Math.min(MAX_SIDEBAR,
        sidebarStartWidth.current + ev.clientX - sidebarStartX.current))
      setSidebarWidth(next)
    }
    const onUp = () => {
      isSidebarDragging.current = false
      setDraggingSidebar(false)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // ── Workspace drag ───────────────────────────────────────────
  const isWsDragging  = useRef(false)
  const wsStartX      = useRef(0)
  const wsStartWidth  = useRef(DEFAULT_WS)

  const handleWorkspaceDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    isWsDragging.current = true
    setDraggingWorkspace(true)
    wsStartX.current     = e.clientX
    wsStartWidth.current = workspaceWidth

    const onMove = (ev: MouseEvent) => {
      if (!isWsDragging.current) return
      const next = Math.max(MIN_WS, Math.min(MAX_WS,
        wsStartWidth.current + ev.clientX - wsStartX.current))
      setWorkspaceWidth(next)
    }
    const onUp = () => {
      isWsDragging.current = false
      setDraggingWorkspace(false)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  const isAnyDragging = draggingSidebar || draggingWorkspace

  const handleSx = (dragging: boolean, color: string) => ({
    width: 5,
    flexShrink: 0,
    cursor: 'col-resize',
    position: 'relative' as const,
    zIndex: 10,
    transition: 'background 0.15s',
    bgcolor: dragging ? color : 'transparent',
    // pastilla central visible al pasar el mouse
    '&::after': {
      content: '""',
      position: 'absolute' as const,
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 3,
      height: 36,
      borderRadius: 99,
      bgcolor: dragging ? 'rgba(255,255,255,0.9)' : 'transparent',
      transition: 'background 0.15s',
    },
    '&:hover': { bgcolor: color },
    '&:hover::after': { bgcolor: 'rgba(255,255,255,0.85)' },
  })

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: '#F5F7F8',
        // Tintes radiales muy sutiles: dan profundidad sin romper el tema claro
        backgroundImage: `
          radial-gradient(1100px 500px at 85% -10%, rgba(50,172,92,0.05), transparent 60%),
          radial-gradient(900px 420px at -10% 110%, rgba(59,130,246,0.045), transparent 60%)
        `,
        backgroundAttachment: 'fixed',
      }}
    >

      {/* Overlay global durante arrastre — bloquea Monaco y otros elementos */}
      {isAnyDragging && (
        <Box sx={{ position: 'fixed', inset: 0, zIndex: 9999, cursor: 'col-resize' }} />
      )}

      {/* Panel de espacios de trabajo */}
      <WorkspacePanel width={workspaceWidth} dragging={draggingWorkspace} />

      {/* Handle workspace */}
      <Box onMouseDown={handleWorkspaceDrag} sx={handleSx(draggingWorkspace, 'rgba(80,120,220,0.45)')} />

      {/* Sidebar de navegación */}
      <Sidebar open={true} onClose={() => {}} width={sidebarWidth} dragging={draggingSidebar} />

      {/* Handle sidebar */}
      <Box onMouseDown={handleSidebarDrag} sx={handleSx(draggingSidebar, 'rgba(50,172,92,0.45)')} />

      {/* Contenido principal */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Header title={title} />
        <Box
          component="main"
          className="anim-page-in"
          sx={{
            flex: 1,
            p: noPadding ? 0 : { xs: 2, sm: 3 },
            overflow: noPadding ? 'hidden' : 'auto',
            display: noPadding ? 'flex' : 'block',
            flexDirection: 'column',
            minHeight: 0,
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  )
}
