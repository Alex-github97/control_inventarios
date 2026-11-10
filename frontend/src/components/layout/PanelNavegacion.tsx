/**
 * El panel de navegación a la izquierda, al estilo de VS Code.
 *
 *   ┌──┬──────────────────┐
 *   │▣ │ CMMS / EAM     « │   franja de módulos  +  árbol del módulo activo
 *   │▣ │ 🔍 Buscar…        │
 *   │▣ │ ▾ General         │   · clic en otro módulo: entra a él
 *   │▣ │    Tablero        │   · clic en el módulo activo: pliega o despliega
 *   └──┴──────────────────┘
 *
 * Lo que lo hace fácil de recorrer, y por qué está:
 *   - El buscador encuentra cualquier pantalla de CUALQUIER módulo: quien sabe
 *     a dónde va no tiene que saber en qué módulo y sección vive.
 *   - Favoritos arriba (la estrella al pasar el puntero): las cinco pantallas
 *     que alguien usa a diario quedan a un clic, en cualquier módulo.
 *   - Secciones plegables que se recuerdan, y la del lugar actual se abre sola.
 *   - Ctrl+B pliega el panel y Ctrl+K va al buscador, como en VS Code.
 *   - Ancho ajustable arrastrando el borde; todo se guarda en el navegador.
 *
 * No usa `Drawer variant="permanent"`: su papel va en `position: fixed` y tapa
 * lo que tenga al lado. Es un `Box` pegajoso dentro del flujo.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Box, Drawer, IconButton, InputBase, Tooltip, Typography, alpha,
} from '@mui/material'
import {
  ChevronRightRounded, KeyboardDoubleArrowLeftRounded, SearchRounded, StarRounded,
  StarBorderRounded, CloseRounded, ViewSidebarOutlined, HomeOutlined,
} from '@mui/icons-material'
import { useAuthStore } from '@/store/authStore'
import { useNavStore, ANCHO_MIN, ANCHO_MAX } from '@/store/navStore'
import { ACENTO, PALETA, SUPERFICIE } from '@/config/marca'
import { moduloDeRuta, useModuleNav } from './Sidebar'
import { useVisibleWorkspaces } from './WorkspacePanel'

export const ALTO_ENCABEZADO = 61
const ANCHO_FRANJA = 60

interface Entrada {
  label: string
  icon: React.ReactNode
  path: string
  section?: string
  exact?: boolean
}

interface Pantalla {
  ruta: string
  etiqueta: string
  seccion: string
  icono: React.ReactNode
  modulo: { id: string; corto: string; nombre: string; color: string }
}

/** Sin tildes ni mayúsculas: «lubricacion» encuentra «Lubricación». */
const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** La entrada activa es la de ruta más larga que contiene a la actual:
 *  en /eam/lubricacion/reportes gana «Reportes», no «Lubricación». */
function rutaActiva(pathname: string, items: { path: string; exact?: boolean }[]) {
  let mejor: string | null = null
  for (const i of items) {
    const coincide = pathname === i.path ||
      (!i.exact && i.path !== '/dashboard' && i.path !== '/' && pathname.startsWith(i.path + '/'))
    if (coincide && (!mejor || i.path.length > mejor.length)) mejor = i.path
  }
  return mejor
}

/** Todas las pantallas de todos los módulos que el usuario puede ver. */
function usePantallas(): Pantalla[] {
  const espacios = useVisibleWorkspaces()
  const { t } = useTranslation()
  const { user } = useAuthStore()
  return useMemo(() => {
    const vistas = new Set<string>()
    const salida: Pantalla[] = []
    for (const e of espacios) {
      const m = moduloDeRuta(e.path, t, user)
      const modulo = { id: e.id, corto: e.short ?? m.logoShort, nombre: t(e.label), color: e.color }
      for (const i of m.navItems as Entrada[]) {
        if (vistas.has(i.path)) continue
        vistas.add(i.path)
        salida.push({ ruta: i.path, etiqueta: t(i.label), seccion: i.section ? t(i.section) : '',
                      icono: i.icon, modulo })
      }
    }
    return salida
  }, [espacios, t, user])
}

// ─── Franja de módulos ───────────────────────────────────────────────────────

function FranjaModulos({ onIr }: { onIr?: () => void }) {
  const espacios = useVisibleWorkspaces()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { plegado, setPlegado, alternarPlegado } = useNavStore()
  const lista = useRef<HTMLDivElement>(null)

  // El módulo activo queda a la vista: con veinte módulos, los de abajo se
  // salen de la pantalla.
  useEffect(() => {
    lista.current?.querySelector<HTMLElement>('[data-activo="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [pathname])

  return (
    <Box sx={{
      width: ANCHO_FRANJA, flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column',
      bgcolor: SUPERFICIE.barra, borderRight: `1px solid ${SUPERFICIE.divisorOscuro}`,
    }}>
      <Box ref={lista} role="tablist" aria-orientation="vertical" aria-label="Módulos" sx={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', gap: 0.5, scrollbarWidth: 'none', '&::-webkit-scrollbar': { display: 'none' },
      }}>
        {espacios.map(e => {
          const activo = e.isActive(pathname)
          const corto = e.short ?? moduloDeRuta(e.path, t, null).logoShort
          return (
            <Tooltip key={e.id} title={t(e.label)} placement="right" arrow enterDelay={250}>
              <Box component="button" type="button" role="tab" aria-selected={activo}
                aria-label={t(e.label)} data-activo={activo ? 'true' : 'false'}
                onClick={() => {
                  if (activo) { alternarPlegado(); return }
                  if (plegado) setPlegado(false)
                  navigate(e.path); onIr?.()
                }}
                sx={{
                  position: 'relative', width: 44, height: 40, flexShrink: 0, border: 'none',
                  borderRadius: '10px', cursor: 'pointer', font: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  bgcolor: activo ? alpha(e.color, 0.18) : 'transparent',
                  color: activo ? '#FFF' : 'rgba(255,255,255,0.55)',
                  transition: 'background .15s, color .15s',
                  '&:hover': { bgcolor: activo ? alpha(e.color, 0.24) : 'rgba(255,255,255,0.07)', color: '#FFF' },
                  '&:focus-visible': { outline: `2px solid ${ACENTO.claro}`, outlineOffset: 1 },
                  // La raya de la izquierda, como la de VS Code.
                  '&::before': {
                    content: '""', position: 'absolute', left: -8, top: 8, bottom: 8, width: 3,
                    borderRadius: '0 3px 3px 0', bgcolor: activo ? e.color : 'transparent',
                    boxShadow: activo ? `0 0 10px ${alpha(e.color, 0.7)}` : 'none',
                  },
                }}>
                <Typography component="span" sx={{
                  fontSize: corto.length > 3 ? 9.5 : 10.5, fontWeight: 800, letterSpacing: '-0.2px', color: 'inherit',
                }}>
                  {corto}
                </Typography>
              </Box>
            </Tooltip>
          )
        })}
      </Box>
      <Box sx={{ py: 1, display: 'flex', justifyContent: 'center', borderTop: `1px solid ${SUPERFICIE.divisorOscuro}` }}>
        <Tooltip title={plegado ? 'Mostrar el menú (Ctrl+B)' : 'Ocultar el menú (Ctrl+B)'} placement="right" arrow>
          <IconButton onClick={alternarPlegado} aria-label={plegado ? 'Mostrar el menú' : 'Ocultar el menú'}
            sx={{ color: 'rgba(255,255,255,0.55)', borderRadius: '10px', '&:hover': { color: '#FFF', bgcolor: 'rgba(255,255,255,0.07)' } }}>
            <ViewSidebarOutlined fontSize="small" sx={{ transform: 'scaleX(-1)' }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}

// ─── Una fila del árbol ──────────────────────────────────────────────────────

function Fila({ icono, etiqueta, detalle, activo, color, favorito, onClick, onFavorito, resaltado }: {
  icono: React.ReactNode; etiqueta: string; detalle?: React.ReactNode; activo: boolean; color: string
  favorito?: boolean; onClick: () => void; onFavorito?: () => void; resaltado?: boolean
}) {
  return (
    <Box role="none" sx={{
      position: 'relative', mx: 1, borderRadius: '8px',
      bgcolor: activo ? alpha(color, 0.1) : resaltado ? alpha(PALETA.tinta, 0.06) : 'transparent',
      '&:hover': { bgcolor: activo ? alpha(color, 0.14) : alpha(PALETA.tinta, 0.05) },
      '&:hover .estrella, & .estrella.fija': { opacity: 1 },
      '&::before': activo ? {
        content: '""', position: 'absolute', left: -8, top: 7, bottom: 7, width: 3,
        borderRadius: '0 3px 3px 0', bgcolor: color,
      } : undefined,
    }}>
      <Box component="a" role="link" href="#" aria-current={activo ? 'page' : undefined}
        onClick={(ev: React.MouseEvent) => { ev.preventDefault(); onClick() }}
        sx={{
          display: 'flex', alignItems: 'center', gap: 1.25, pl: 1.25, pr: onFavorito ? 4 : 1.25, py: 0.8,
          textDecoration: 'none', color: activo ? color : '#333', borderRadius: '8px',
          '&:focus-visible': { outline: `2px solid ${ACENTO.base}`, outlineOffset: -2 },
        }}>
        <Box sx={{
          display: 'flex', color: activo ? color : '#8C8C8C', flexShrink: 0,
          '& svg': { fontSize: 18 },
        }}>{icono}</Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography noWrap sx={{ fontSize: 13.2, fontWeight: activo ? 700 : 500, lineHeight: 1.3, color: 'inherit' }}>
            {etiqueta}
          </Typography>
          {detalle && (
            <Typography noWrap component="div" sx={{ fontSize: 11, color: '#8C8C8C', lineHeight: 1.3 }}>
              {detalle}
            </Typography>
          )}
        </Box>
      </Box>
      {onFavorito && (
        <Tooltip title={favorito ? 'Quitar de favoritos' : 'Agregar a favoritos'} placement="right">
          <IconButton size="small" className={`estrella${favorito ? ' fija' : ''}`}
            aria-label={favorito ? `Quitar ${etiqueta} de favoritos` : `Agregar ${etiqueta} a favoritos`}
            onClick={onFavorito}
            sx={{
              position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
              opacity: 0, transition: 'opacity .15s', p: 0.4,
              color: favorito ? '#F59E0B' : '#A3A3A3', '&:hover': { color: '#F59E0B' },
              '&:focus-visible': { opacity: 1 },
            }}>
            {favorito ? <StarRounded sx={{ fontSize: 16 }} /> : <StarBorderRounded sx={{ fontSize: 16 }} />}
          </IconButton>
        </Tooltip>
      )}
    </Box>
  )
}

function TituloSeccion({ texto, abierta, cuenta, onClick }: {
  texto: string; abierta?: boolean; cuenta?: number; onClick?: () => void
}) {
  return (
    <Box component={onClick ? 'button' : 'div'} type={onClick ? 'button' : undefined}
      onClick={onClick} aria-expanded={onClick ? abierta : undefined}
      sx={{
        display: 'flex', alignItems: 'center', gap: 0.5, width: 'calc(100% - 16px)', mx: 1, mt: 1.25, mb: 0.25,
        px: 0.75, py: 0.5, border: 'none', bgcolor: 'transparent', borderRadius: '6px', font: 'inherit',
        cursor: onClick ? 'pointer' : 'default', color: '#737373', textAlign: 'left',
        '&:hover': onClick ? { color: '#262626', bgcolor: alpha(PALETA.tinta, 0.04) } : undefined,
        '&:focus-visible': { outline: `2px solid ${ACENTO.base}` },
      }}>
      {onClick && (
        <ChevronRightRounded sx={{ fontSize: 16, transition: 'transform .15s', transform: abierta ? 'rotate(90deg)' : 'none' }} />
      )}
      <Typography component="span" sx={{ fontSize: 10.8, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', flex: 1 }} noWrap>
        {texto}
      </Typography>
      {cuenta != null && !abierta && (
        <Typography component="span" sx={{ fontSize: 10.5, color: '#A3A3A3', fontWeight: 600 }}>{cuenta}</Typography>
      )}
    </Box>
  )
}

// ─── Árbol del módulo activo ─────────────────────────────────────────────────

function ArbolModulo({ ancho, onIr, buscador }: {
  ancho: number; onIr?: () => void; buscador: React.RefObject<HTMLInputElement | null>
}) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const mod = useModuleNav()
  const pantallas = usePantallas()
  const { secciones, alternarSeccion, favoritos, alternarFavorito, setPlegado } = useNavStore()
  const [texto, setTexto] = useState('')
  const [cursor, setCursor] = useState(0)
  const cuerpo = useRef<HTMLDivElement>(null)

  const items = mod.navItems as Entrada[]
  const activa = rutaActiva(pathname, items)
  const color = mod.activeColor
  const porRuta = useMemo(() => new Map(pantallas.map(p => [p.ruta, p])), [pantallas])

  const sueltos = items.filter(i => !i.section || !mod.sections.includes(i.section))
  const grupos = mod.sections
    .map(s => ({ seccion: s, items: items.filter(i => i.section === s) }))
    .filter(g => g.items.length > 0)
  const clave = (s: string) => `${mod.logoShort}:${s}`
  const abierta = (s: string) => secciones[clave(s)] ?? true

  // Al llegar a una pantalla, su sección se abre aunque el usuario la hubiera
  // plegado: lo contrario esconde justo dónde está.
  useEffect(() => {
    const g = grupos.find(x => x.items.some(i => i.path === activa))
    if (g && !abierta(g.seccion)) alternarSeccion(clave(g.seccion), true)
    cuerpo.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activa])

  const q = normal(texto.trim())
  const resultados = useMemo(() => {
    if (!q) return []
    const palabras = q.split(/\s+/)
    return pantallas
      .map(p => {
        const hay = normal(`${p.etiqueta} ${p.seccion} ${p.modulo.nombre} ${p.modulo.corto}`)
        if (!palabras.every(w => hay.includes(w))) return null
        // Primero lo que empieza por lo escrito, después lo del módulo actual.
        const puntaje = (normal(p.etiqueta).startsWith(palabras[0]) ? 0 : 2)
          + (p.modulo.corto === mod.logoShort ? 0 : 1)
        return { p, puntaje }
      })
      .filter(Boolean)
      .sort((a, b) => a!.puntaje - b!.puntaje || a!.p.etiqueta.localeCompare(b!.p.etiqueta))
      .slice(0, 40)
      .map(x => x!.p)
  }, [q, pantallas, mod.logoShort])
  useEffect(() => { setCursor(0) }, [q])

  const ir = (ruta: string) => { setTexto(''); navigate(ruta); onIr?.() }
  const favs = favoritos.map(r => porRuta.get(r)).filter(Boolean) as Pantalla[]

  const teclas = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, resultados.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    else if (e.key === 'Enter' && resultados[cursor]) { ir(resultados[cursor].ruta); (e.target as HTMLElement).blur() }
    else if (e.key === 'Escape') { setTexto(''); (e.target as HTMLElement).blur() }
  }

  const fila = (i: Entrada) => (
    <Fila key={i.path} icono={i.icon} etiqueta={t(i.label)} color={color}
      activo={i.path === activa} favorito={favoritos.includes(i.path)}
      onClick={() => ir(i.path)} onFavorito={() => alternarFavorito(i.path)} />
  )

  return (
    <Box sx={{
      width: ancho, flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column',
      bgcolor: '#FBFBFA', borderRight: `1px solid ${PALETA.niebla}`, minWidth: 0,
    }}>
      {/* Módulo activo */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 1.75, pt: 1.75, pb: 1.25 }}>
        <Box sx={{
          width: 32, height: 32, borderRadius: '9px', flexShrink: 0, background: mod.logoGradient,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 3px 10px ${alpha(color, 0.3)}`,
        }}>
          <Typography sx={{ color: '#FFF', fontWeight: 800, fontSize: 11, letterSpacing: '-0.4px' }}>{mod.logoShort}</Typography>
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography noWrap sx={{ fontWeight: 800, fontSize: 13.5, lineHeight: 1.2, color: '#1A1A1A' }}>{mod.logoLine1}</Typography>
          <Typography noWrap sx={{ fontWeight: 600, fontSize: 12, lineHeight: 1.2, color: '#737373' }}>{mod.logoLine2}</Typography>
        </Box>
        {!onIr && (
          <Tooltip title="Ocultar el menú (Ctrl+B)">
            <IconButton size="small" onClick={() => setPlegado(true)} aria-label="Ocultar el menú"
              sx={{ color: '#A3A3A3', '&:hover': { color: '#262626' } }}>
              <KeyboardDoubleArrowLeftRounded fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Buscador de pantallas, en todos los módulos */}
      <Box sx={{ px: 1.5, pb: 1 }}>
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 0.75, px: 1.1, height: 34, borderRadius: '9px',
          bgcolor: '#FFF', border: `1px solid ${PALETA.niebla}`,
          '&:focus-within': { borderColor: ACENTO.base, boxShadow: `0 0 0 3px ${alpha(ACENTO.base, 0.15)}` },
        }}>
          <SearchRounded sx={{ fontSize: 17, color: '#A3A3A3' }} />
          <InputBase inputRef={buscador} value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={teclas}
            placeholder="Buscar pantalla…" inputProps={{ 'aria-label': 'Buscar pantalla en todos los módulos' }}
            sx={{ flex: 1, fontSize: 13 }} />
          {texto ? (
            <IconButton size="small" onClick={() => setTexto('')} aria-label="Borrar la búsqueda" sx={{ p: 0.25 }}>
              <CloseRounded sx={{ fontSize: 15 }} />
            </IconButton>
          ) : (
            <Typography component="kbd" sx={{
              fontSize: 10, color: '#A3A3A3', border: `1px solid ${PALETA.niebla}`, borderRadius: '4px',
              px: 0.5, fontFamily: 'inherit', display: ancho > 230 ? 'block' : 'none',
            }}>Ctrl K</Typography>
          )}
        </Box>
      </Box>

      <Box ref={cuerpo} sx={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden', pb: 2,
        scrollbarWidth: 'thin', scrollbarColor: '#D4D4D4 transparent',
      }}>
        {q ? (
          <>
            <TituloSeccion texto={resultados.length ? `${resultados.length} pantalla(s)` : 'Sin resultados'} />
            {resultados.map((p, i) => (
              <Fila key={p.ruta} icono={p.icono} etiqueta={p.etiqueta} color={p.modulo.color}
                detalle={`${p.modulo.nombre}${p.seccion ? ` · ${p.seccion}` : ''}`}
                activo={p.ruta === activa} resaltado={i === cursor} onClick={() => ir(p.ruta)} />
            ))}
            {!resultados.length && (
              <Typography sx={{ px: 2.5, fontSize: 12.5, color: '#8C8C8C' }}>
                Ninguna pantalla se llama así. Pruebe con otra palabra: «órdenes», «llantas», «inventario»…
              </Typography>
            )}
          </>
        ) : (
          <>
            {favs.length > 0 && (
              <>
                <TituloSeccion texto="Favoritos" />
                {favs.map(p => (
                  <Fila key={`f-${p.ruta}`} icono={<StarRounded sx={{ color: '#F59E0B' }} />} etiqueta={p.etiqueta}
                    detalle={p.modulo.corto !== mod.logoShort ? p.modulo.nombre : undefined}
                    color={p.modulo.color} activo={p.ruta === activa} favorito
                    onClick={() => ir(p.ruta)} onFavorito={() => alternarFavorito(p.ruta)} />
                ))}
              </>
            )}
            {sueltos.length > 0 && (
              <>
                {(favs.length > 0 || grupos.length > 0) && <Box sx={{ height: 6 }} />}
                {sueltos.map(fila)}
              </>
            )}
            {grupos.map(g => {
              const ab = abierta(g.seccion)
              return (
                <Box key={g.seccion} role="group" aria-label={t(g.seccion)}>
                  <TituloSeccion texto={t(g.seccion)} abierta={ab} cuenta={g.items.length}
                    onClick={() => alternarSeccion(clave(g.seccion), !ab)} />
                  {ab && g.items.map(fila)}
                </Box>
              )
            })}
            {!items.length && (
              <Fila icono={<HomeOutlined />} etiqueta="Inicio" color={color} activo={false} onClick={() => ir('/')} />
            )}
          </>
        )}
      </Box>
    </Box>
  )
}

// ─── El panel completo ───────────────────────────────────────────────────────

export function PanelNavegacion() {
  const { plegado, ancho, setAncho, alternarPlegado, setPlegado, movil, setMovil } = useNavStore()
  const buscador = useRef<HTMLInputElement>(null)
  const buscadorMovil = useRef<HTMLInputElement>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const inicio = useRef<{ x: number; ancho: number } | null>(null)
  const { pathname } = useLocation()

  useEffect(() => { setMovil(false) }, [pathname, setMovil])

  // Atajos de VS Code: Ctrl+B pliega, Ctrl+K busca.
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return
      const k = e.key.toLowerCase()
      if (k === 'b') { e.preventDefault(); alternarPlegado() }
      if (k === 'k') {
        e.preventDefault()
        if (window.innerWidth < 900) { setMovil(true); setTimeout(() => buscadorMovil.current?.focus(), 250); return }
        setPlegado(false)
        setTimeout(() => buscador.current?.focus(), 30)
      }
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [alternarPlegado, setPlegado, setMovil])

  // El borde se arrastra con eventos de la ventana: si el puntero se sale del
  // asa, el arrastre no se corta.
  useEffect(() => {
    if (!arrastrando) return
    const mover = (e: PointerEvent) => {
      if (!inicio.current) return
      const nuevo = inicio.current.ancho + e.clientX - inicio.current.x
      if (nuevo < ANCHO_MIN - 70) { setPlegado(true); setArrastrando(false); return }
      setAncho(nuevo)
    }
    const soltar = () => setArrastrando(false)
    window.addEventListener('pointermove', mover)
    window.addEventListener('pointerup', soltar)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    return () => {
      window.removeEventListener('pointermove', mover)
      window.removeEventListener('pointerup', soltar)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [arrastrando, setAncho, setPlegado])

  return (
    <>
      <Box component="nav" aria-label="Navegación principal" sx={{
        display: { xs: 'none', md: 'flex' }, position: 'sticky', top: ALTO_ENCABEZADO, zIndex: 1050,
        height: `calc(100vh - ${ALTO_ENCABEZADO}px)`, flexShrink: 0,
      }}>
        <FranjaModulos />
        {!plegado && (
          <Box sx={{ position: 'relative', display: 'flex' }}>
            <ArbolModulo ancho={ancho} buscador={buscador} />
            <Tooltip title="Arrastre para cambiar el ancho · doble clic para el ancho normal" placement="right" enterDelay={700}>
              <Box role="separator" aria-orientation="vertical" aria-label="Cambiar el ancho del menú"
                onPointerDown={e => { inicio.current = { x: e.clientX, ancho }; setArrastrando(true) }}
                onDoubleClick={() => setAncho(256)}
                sx={{
                  position: 'absolute', top: 0, bottom: 0, right: -3, width: 6, cursor: 'col-resize', zIndex: 2,
                  '&::after': {
                    content: '""', position: 'absolute', top: 0, bottom: 0, left: 2, width: 2,
                    bgcolor: arrastrando ? ACENTO.base : 'transparent', transition: 'background .15s',
                  },
                  '&:hover::after': { bgcolor: alpha(ACENTO.base, 0.6) },
                }} />
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* En pantallas angostas, el mismo panel como cajón. */}
      <Drawer open={movil} onClose={() => setMovil(false)} disableAutoFocus sx={{ display: { md: 'none' } }}
        PaperProps={{ sx: { flexDirection: 'row', height: '100%', maxWidth: '92vw' } }}>
        <FranjaModulos onIr={() => setMovil(false)} />
        <ArbolModulo ancho={Math.min(280, window.innerWidth - ANCHO_FRANJA - 30)}
          onIr={() => setMovil(false)} buscador={buscadorMovil} />
      </Drawer>
    </>
  )
}

/** Las migas del encabezado: módulo › sección › pantalla. */
export function useMigas(titulo?: string) {
  const { pathname } = useLocation()
  const { t } = useTranslation()
  const mod = useModuleNav()
  const items = mod.navItems as Entrada[]
  const activa = rutaActiva(pathname, items)
  const item = items.find(i => i.path === activa)
  return {
    modulo: [mod.logoLine1, mod.logoLine2].filter(Boolean).join(' '),
    color: mod.activeColor,
    seccion: item?.section ? t(item.section) : undefined,
    pantalla: item ? t(item.label) : titulo,
  }
}

export { ANCHO_MAX }
