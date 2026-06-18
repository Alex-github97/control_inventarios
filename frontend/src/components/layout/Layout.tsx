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
}

export function Layout({ children, title }: LayoutProps) {
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

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F5F7F8' }}>

      {/* Overlay global durante arrastre — bloquea Monaco y otros elementos */}
      {isAnyDragging && (
        <Box sx={{ position: 'fixed', inset: 0, zIndex: 9999, cursor: 'col-resize' }} />
      )}

      {/* Panel de espacios de trabajo */}
      <WorkspacePanel width={workspaceWidth} dragging={draggingWorkspace} />

      {/* Handle workspace */}
      <Box
        onMouseDown={handleWorkspaceDrag}
        sx={{
          width: 4,
          flexShrink: 0,
          cursor: 'col-resize',
          bgcolor: draggingWorkspace ? 'rgba(80,120,220,0.5)' : 'transparent',
          transition: 'background 0.15s',
          '&:hover': { bgcolor: 'rgba(80,120,220,0.35)' },
          zIndex: 10,
        }}
      />

      {/* Sidebar de navegación */}
      <Sidebar open={true} onClose={() => {}} width={sidebarWidth} dragging={draggingSidebar} />

      {/* Handle sidebar */}
      <Box
        onMouseDown={handleSidebarDrag}
        sx={{
          width: 4,
          flexShrink: 0,
          cursor: 'col-resize',
          bgcolor: draggingSidebar ? 'rgba(50,172,92,0.5)' : 'transparent',
          transition: 'background 0.15s',
          '&:hover': { bgcolor: 'rgba(50,172,92,0.35)' },
          zIndex: 10,
        }}
      />

      {/* Contenido principal */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <Header title={title} />
        <Box
          component="main"
          sx={{ flex: 1, p: { xs: 2, sm: 3 }, overflow: 'auto' }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  )
}
