import { createTheme, alpha } from '@mui/material/styles'

const PRIMARY      = '#32AC5C'
const PRIMARY_DARK = '#27884A'
const PRIMARY_LIGHT = '#5FD184'
const BACKGROUND   = '#F0F2F5'
const DARK         = '#0D1117'
const SIDEBAR      = '#111827'
const SURFACE      = '#FFFFFF'
const TEXT         = '#1E293B'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: PRIMARY,
      dark: PRIMARY_DARK,
      light: PRIMARY_LIGHT,
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: DARK,
      contrastText: '#FFFFFF',
    },
    background: {
      default: BACKGROUND,
      paper: SURFACE,
    },
    text: {
      primary: TEXT,
      secondary: '#64748B',
    },
    success: { main: PRIMARY },
    error:   { main: '#EF4444' },
    warning: { main: '#F59E0B' },
    info:    { main: '#3B82F6' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
    h1: { fontWeight: 800, fontSize: '2.25rem',  color: DARK, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, fontSize: '1.875rem', color: DARK, letterSpacing: '-0.02em' },
    h3: { fontWeight: 700, fontSize: '1.5rem',   color: DARK, letterSpacing: '-0.01em' },
    h4: { fontWeight: 700, fontSize: '1.25rem',  color: DARK, letterSpacing: '-0.01em' },
    h5: { fontWeight: 600, fontSize: '1.1rem',   color: TEXT },
    h6: { fontWeight: 600, fontSize: '1rem',     color: TEXT },
    subtitle1: { fontWeight: 500, color: TEXT },
    body1: { color: TEXT, lineHeight: 1.6 },
    body2: { color: '#64748B', lineHeight: 1.5 },
    caption: { color: '#94A3B8', letterSpacing: '0.02em' },
  },
  shape: { borderRadius: 12 },
  shadows: [
    'none',
    '0 1px 2px rgba(0,0,0,0.05)',
    '0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    '0 4px 8px -2px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.04)',
    '0 8px 16px -4px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)',
    '0 16px 32px -8px rgba(0,0,0,0.10), 0 6px 8px -4px rgba(0,0,0,0.04)',
    ...Array(19).fill('none'),
  ] as any,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 10,
          padding: '8px 18px',
          fontSize: '0.875rem',
          transition: 'all 0.15s ease',
        },
        contained: {
          boxShadow: `0 1px 3px ${alpha(PRIMARY, 0.3)}, 0 0 0 0 ${alpha(PRIMARY, 0)}`,
          '&:hover': {
            boxShadow: `0 4px 12px ${alpha(PRIMARY, 0.4)}`,
            transform: 'translateY(-1px)',
          },
          '&:active': { transform: 'translateY(0)' },
        },
        outlined: {
          borderColor: 'rgba(0,0,0,0.12)',
          '&:hover': { borderColor: PRIMARY, bgcolor: alpha(PRIMARY, 0.04) },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 1px 4px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.04)',
          border: 'none',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          '&:hover': {
            boxShadow: '0 8px 24px rgba(0,0,0,0.09), 0 0 0 1px rgba(0,0,0,0.04)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8,
          fontSize: '0.75rem',
        },
        sizeSmall: { height: 22 },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#F8FAFC',
            fontWeight: 700,
            fontSize: '0.7rem',
            textTransform: 'uppercase',
            letterSpacing: '0.07em',
            color: '#94A3B8',
            borderBottom: '1px solid #E2E8F0',
            padding: '10px 16px',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': { backgroundColor: alpha(PRIMARY, 0.03) },
          '&:last-child td': { border: 0 },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: '#F1F5F9',
          padding: '12px 16px',
          fontSize: '0.875rem',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: SIDEBAR,
          color: '#FFFFFF',
          borderRight: 'none',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 99, height: 5 },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            fontSize: '0.9rem',
            transition: 'box-shadow 0.15s ease',
            '&.Mui-focused': {
              boxShadow: `0 0 0 3px ${alpha(PRIMARY, 0.15)}`,
            },
            '& fieldset': { borderColor: '#E2E8F0' },
            '&:hover fieldset': { borderColor: '#CBD5E1' },
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: { fontSize: '0.875rem', color: '#64748B' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          backdropFilter: 'blur(8px)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 20, boxShadow: '0 24px 64px rgba(0,0,0,0.15)' },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: { borderColor: '#F1F5F9' },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          borderRadius: 8,
          fontSize: '0.75rem',
          backgroundColor: '#0F172A',
          padding: '6px 10px',
        },
      },
    },
  },
})

export const STATUS_COLORS: Record<string, { bg: string; color: string; border: string; label: string }> = {
  DISPONIBLE:        { bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', label: 'Disponible' },
  EN_INVENTARIO:     { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE', label: 'En Inventario' },
  EN_TRANSITO:       { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A', label: 'En Tránsito' },
  CARGADA:           { bg: '#FFFBEB', color: '#B45309', border: '#FCD34D', label: 'Cargada' },
  EN_CLIENTE:        { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE', label: 'En Cliente' },
  PENDIENTE_RETORNO: { bg: '#FFF7ED', color: '#EA580C', border: '#FED7AA', label: 'Pend. Retorno' },
  EN_REPARACION:     { bg: '#FEFCE8', color: '#CA8A04', border: '#FEF08A', label: 'En Reparación' },
  DANADA:            { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA', label: 'Dañada' },
  PERDIDA:           { bg: '#FDF2F8', color: '#DB2777', border: '#FBCFE8', label: 'Perdida' },
  BAJA:              { bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0', label: 'Baja' },
  DISPOSICION_FINAL: { bg: '#F8FAFC', color: '#64748B', border: '#E2E8F0', label: 'Disp. Final' },
}
