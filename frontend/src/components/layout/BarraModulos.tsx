import { useEffect, useRef, useState } from 'react'
import { Box, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, ListSubheader, Typography, alpha } from '@mui/material'
import { ChevronLeftRounded, ChevronRightRounded, KeyboardArrowDownRounded } from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { moduloDeRuta } from './Sidebar'
import { useVisibleWorkspaces } from './WorkspacePanel'

/**
 * Todos los módulos a la vista, en una fila del encabezado.
 *
 * Antes estaban detrás del botón «Espacios»: había que abrirlo para saber qué
 * módulos había y cuál estaba activo. Aquí cada módulo es una pestaña; al
 * pulsarla se despliegan sus submódulos, agrupados por sección, y se puede ir
 * directo a cualquiera sin pasar por el inicio del módulo.
 *
 * Cuando no caben, la rueda del mouse desplaza la fila hacia los lados (además
 * de las flechas de los extremos y del gesto horizontal del touchpad).
 */
export function BarraModulos() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const espacios = useVisibleWorkspaces()
  const fila = useRef<HTMLDivElement>(null)
  const [abierto, setAbierto] = useState<{ anchor: HTMLElement; id: string } | null>(null)
  const [bordes, setBordes] = useState({ izq: false, der: false })

  const medir = () => {
    const el = fila.current
    if (!el) return
    setBordes({ izq: el.scrollLeft > 2, der: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 })
  }

  // La rueda vertical mueve la fila en horizontal. Va con un listener propio
  // porque el de React es pasivo y no deja impedir que la página se desplace.
  useEffect(() => {
    const el = fila.current
    if (!el) return
    const rueda = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      if (!delta) return
      e.preventDefault()
      el.scrollLeft += delta
    }
    el.addEventListener('wheel', rueda, { passive: false })
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    medir()
    return () => { el.removeEventListener('wheel', rueda); ro.disconnect() }
  }, [espacios.length])

  // El módulo activo queda a la vista al entrar o al cambiar de módulo.
  useEffect(() => {
    fila.current?.querySelector<HTMLElement>('[data-activo="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'center' })
  }, [pathname])

  const desplazar = (dir: number) => fila.current?.scrollBy({ left: dir * 260, behavior: 'smooth' })

  const ws = abierto ? espacios.find(e => e.id === abierto.id) : undefined
  const sub = ws ? moduloDeRuta(ws.path, t, user) : undefined
  const grupos = sub
    ? sub.sections
        .map(seccion => ({ seccion, items: sub.navItems.filter(i => i.section === seccion) }))
        .filter(g => g.items.length > 0)
    : []
  const sinSeccion = sub ? sub.navItems.filter(i => !i.section || !sub.sections.includes(i.section)) : []

  const flecha = (dir: -1 | 1) => (
    <IconButton
      size="small"
      aria-label={dir < 0 ? 'Ver módulos anteriores' : 'Ver más módulos'}
      onClick={() => desplazar(dir)}
      sx={{
        position: 'absolute', top: '50%', transform: 'translateY(-50%)', zIndex: 2,
        [dir < 0 ? 'left' : 'right']: 0,
        width: 26, height: 26, color: 'rgba(255,255,255,0.8)',
        bgcolor: 'rgba(23,23,23,0.92)', border: '1px solid rgba(255,255,255,0.12)',
        '&:hover': { bgcolor: 'rgba(40,40,40,0.98)' },
      }}
    >
      {dir < 0 ? <ChevronLeftRounded sx={{ fontSize: 18 }} /> : <ChevronRightRounded sx={{ fontSize: 18 }} />}
    </IconButton>
  )

  const irA = (path: string) => { setAbierto(null); navigate(path) }

  return (
    <Box sx={{ position: 'relative', flex: 1, minWidth: 0, mx: { xs: 0.5, md: 1.5 } }}>
      {bordes.izq && flecha(-1)}
      <Box
        ref={fila}
        onScroll={medir}
        role="menubar"
        aria-label="Módulos"
        sx={{
          display: 'flex', alignItems: 'center', gap: 0.5,
          overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
          // Se desvanecen los bordes cuando hay más módulos de ese lado.
          maskImage: `linear-gradient(90deg, ${bordes.izq ? 'transparent 0, #000 36px' : '#000 0'}, ${bordes.der ? '#000 calc(100% - 36px), transparent 100%' : '#000 100%'})`,
        }}
      >
        {espacios.map(e => {
          const activo = e.isActive(pathname)
          const desplegado = abierto?.id === e.id
          return (
            <Box
              key={e.id}
              component="button"
              type="button"
              role="menuitem"
              data-activo={activo ? 'true' : 'false'}
              aria-haspopup="menu"
              aria-expanded={desplegado}
              onClick={ev => setAbierto(desplegado ? null : { anchor: ev.currentTarget, id: e.id })}
              sx={{
                display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0,
                height: 36, pl: 0.75, pr: 0.5, borderRadius: '10px', cursor: 'pointer',
                font: 'inherit', whiteSpace: 'nowrap',
                color: activo ? '#FFF' : 'rgba(255,255,255,0.72)',
                bgcolor: desplegado ? 'rgba(255,255,255,0.1)' : activo ? alpha(e.color, 0.16) : 'transparent',
                border: `1px solid ${activo ? alpha(e.color, 0.4) : 'transparent'}`,
                transition: 'background 0.15s ease, color 0.15s ease',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', color: '#FFF' },
                '&:focus-visible': { outline: `2px solid ${e.color}`, outlineOffset: 1 },
              }}
            >
              <Box sx={{
                width: 24, height: 24, borderRadius: '7px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: activo ? `linear-gradient(135deg, ${e.color} 0%, ${alpha(e.color, 0.65)} 100%)` : 'rgba(255,255,255,0.06)',
                border: activo ? 'none' : '1px solid rgba(255,255,255,0.08)',
              }}>
                <Typography component="span" sx={{ fontSize: 9, fontWeight: 800, letterSpacing: '-0.3px', color: activo ? '#FFF' : 'rgba(255,255,255,0.6)' }}>
                  {e.short}
                </Typography>
              </Box>
              <Typography component="span" sx={{ fontSize: 12.5, fontWeight: activo ? 700 : 500, color: 'inherit' }}>
                {t(e.label)}
              </Typography>
              <KeyboardArrowDownRounded sx={{
                fontSize: 17, opacity: 0.6, transition: 'transform 0.2s',
                transform: desplegado ? 'rotate(180deg)' : 'none',
              }} />
            </Box>
          )
        })}
      </Box>
      {bordes.der && flecha(1)}

      <Menu
        open={Boolean(abierto)}
        anchorEl={abierto?.anchor}
        onClose={() => setAbierto(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        PaperProps={{
          elevation: 8,
          sx: { mt: 0.75, minWidth: 260, maxHeight: '70vh', borderRadius: '12px', border: '1px solid #E5E5E5' },
        }}
        MenuListProps={{ dense: true, sx: { py: 0.5 } }}
      >
        {ws && (
          <MenuItem onClick={() => irA(ws.path)} sx={{ mx: 0.75, borderRadius: '8px', py: 0.9 }}>
            <ListItemText
              primary={`Inicio de ${t(ws.label)}`}
              primaryTypographyProps={{ fontSize: 13.5, fontWeight: 700, color: ws.color }}
            />
          </MenuItem>
        )}
        {[...(sinSeccion.length ? [{ seccion: '', items: sinSeccion }] : []), ...grupos].flatMap(({ seccion, items }) => [
          ...(seccion && grupos.length > 1 ? [
            <ListSubheader key={`s-${seccion}`} sx={{
              lineHeight: '28px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em',
              textTransform: 'uppercase', color: '#8C8C8C', bgcolor: '#FFF',
            }}>
              {t(seccion)}
            </ListSubheader>,
          ] : []),
          ...items.map(item => {
            const activo = pathname === item.path
            return (
              <MenuItem
                key={item.path}
                onClick={() => irA(item.path)}
                sx={{
                  mx: 0.75, my: 0.1, borderRadius: '8px', py: 0.75,
                  bgcolor: activo && ws ? alpha(ws.color, 0.1) : 'transparent',
                }}
              >
                <ListItemIcon sx={{ minWidth: '32px !important', color: activo && ws ? ws.color : '#8C8C8C' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={t(item.label)}
                  primaryTypographyProps={{ fontSize: 13.5, fontWeight: activo ? 600 : 500, color: '#333' }}
                />
              </MenuItem>
            )
          }),
        ])}
      </Menu>
    </Box>
  )
}
