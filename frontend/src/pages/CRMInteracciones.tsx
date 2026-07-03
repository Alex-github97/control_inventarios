import React, { useState } from 'react'
import { Box, Grid, Typography, Chip, alpha } from '@mui/material'
import { Hub, Phone, Email, WhatsApp, Groups, Chat } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'

const CRM_COLOR = '#DC2626'

const TIPO_CFG: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  LLAMADA:    { color: '#059669', icon: <Phone    sx={{ fontSize: 16 }} />, label: 'Llamada' },
  EMAIL:      { color: '#0EA5E9', icon: <Email    sx={{ fontSize: 16 }} />, label: 'Email' },
  WHATSAPP:   { color: '#059669', icon: <WhatsApp sx={{ fontSize: 16 }} />, label: 'WhatsApp' },
  REUNION:    { color: '#7C3AED', icon: <Groups   sx={{ fontSize: 16 }} />, label: 'Reunión' },
  CHAT:       { color: '#F59E0B', icon: <Chat     sx={{ fontSize: 16 }} />, label: 'Chat' },
  FORMULARIO: { color: CRM_COLOR, icon: <Hub      sx={{ fontSize: 16 }} />, label: 'Formulario' },
}

const INTERACCIONES = [
  { id: 1, fecha: '2026-06-18 10:30', tipo: 'REUNION',    cliente: 'Almacenes Éxito S.A.',  contacto: 'María González',  asunto: 'Revisión trimestral de KPIs',                resultado: 'Satisfacción alta — renovación confirmada', duracion: 90,  ejecutivo: 'Laura Soto' },
  { id: 2, fecha: '2026-06-17 14:15', tipo: 'LLAMADA',    cliente: 'Sodimac Colombia',       contacto: 'Carlos Herrera',  asunto: 'Seguimiento cotización COT-2026-041',         resultado: 'Cliente pide ajuste en tarifas TMS', duracion: 35, ejecutivo: 'Carlos Vega' },
  { id: 3, fecha: '2026-06-17 09:00', tipo: 'EMAIL',      cliente: 'Corona S.A.',            contacto: 'Ana Morales',     asunto: 'Propuesta expansión CD Bogotá Norte',         resultado: 'Pendiente revisión interna del cliente', duracion: null, ejecutivo: 'Pedro Díaz' },
  { id: 4, fecha: '2026-06-16 16:45', tipo: 'WHATSAPP',   cliente: 'Grupo Nutresa',          contacto: 'Ricardo Jiménez', asunto: 'Alerta de SLA OTIF mes junio',                resultado: 'Acuerdo plan de mejora inmediato', duracion: 20, ejecutivo: 'Ana Ruiz' },
  { id: 5, fecha: '2026-06-16 11:00', tipo: 'CHAT',       cliente: 'Bancolombia',            contacto: 'Patricia Rueda',  asunto: 'Consulta horarios despacho Q3',               resultado: 'Información enviada — ok', duracion: 15, ejecutivo: 'Laura Soto' },
  { id: 6, fecha: '2026-06-15 08:30', tipo: 'REUNION',    cliente: 'TechCorp Colombia',      contacto: 'Felipe Ospina',   asunto: 'Presentación propuesta servicio Pick & Pack', resultado: 'Requiere aprobación gerencia — próx reunión 2026-07-02', duracion: 60, ejecutivo: 'Carlos Vega' },
  { id: 7, fecha: '2026-06-14 15:20', tipo: 'FORMULARIO', cliente: 'Distribuciones Andes',  contacto: 'Mauricio Leal',   asunto: 'Solicitud cotización logística',               resultado: 'Lead CALIENTE generado — asignado a Ana Ruiz', duracion: null, ejecutivo: 'Ana Ruiz' },
  { id: 8, fecha: '2026-06-13 13:10', tipo: 'LLAMADA',    cliente: 'Pharmavida S.A.',        contacto: 'Gloria Torres',   asunto: 'Negociación contrato TMS flota dedicada',     resultado: 'Acuerdo en tarifas — envío cotización', duracion: 55, ejecutivo: 'Pedro Díaz' },
]

const STATS_TIPO = Object.entries(
  INTERACCIONES.reduce((acc, i) => { acc[i.tipo] = (acc[i.tipo] || 0) + 1; return acc }, {} as Record<string, number>)
)

export default function CRMInteracciones() {
  const [filtroTipo, setFiltroTipo] = useState('Todos')

  const filtradas = INTERACCIONES.filter(i => filtroTipo === 'Todos' || i.tipo === filtroTipo)

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh' }}>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            width: 44, height: 44, borderRadius: '12px',
            background: `linear-gradient(135deg, ${CRM_COLOR} 0%, #B91C1C 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Hub sx={{ color: 'text.primary', fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary' }}>Centro de Contacto</Typography>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>
              Llamadas · Email · WhatsApp · Chat · Reuniones · Formularios
            </Typography>
          </Box>
        </Box>

        {/* Estadísticas por canal */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {STATS_TIPO.map(([tipo, count], i) => {
            const cfg = TIPO_CFG[tipo]
            return (
              <Grid key={i} size={{ xs: 6, sm: 4, md: 2 }}>
                <Box
                  onClick={() => setFiltroTipo(filtroTipo === tipo ? 'Todos' : tipo)}
                  sx={{ border: `1px solid ${filtroTipo === tipo ? alpha(cfg.color, 0.5) : alpha(cfg.color, 0.2)}`, borderRadius: 2, p: 2, cursor: 'pointer', transition: 'all 0.15s ease', '&:hover': { border: `1px solid ${alpha(cfg.color, 0.5)}` } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5, '& svg': { color: cfg.color } }}>
                    {cfg.icon}
                    <Typography sx={{ fontSize: 11, color: cfg.color, fontWeight: 600 }}>{cfg.label}</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 24, fontWeight: 900, color: 'text.primary', lineHeight: 1 }}>{count}</Typography>
                </Box>
              </Grid>
            )
          })}
        </Grid>

        {/* Filtros rápidos */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          <Chip label="Todas" size="small" onClick={() => setFiltroTipo('Todos')}
            sx={{ cursor: 'pointer', bgcolor: filtroTipo === 'Todos' ? CRM_COLOR : 'rgba(255,255,255,0.06)', color: filtroTipo === 'Todos' ? '#FFF' : 'rgba(255,255,255,0.5)', fontWeight: filtroTipo === 'Todos' ? 700 : 400 }} />
          {Object.keys(TIPO_CFG).map(tipo => (
            <Chip key={tipo} label={TIPO_CFG[tipo].label} size="small" onClick={() => setFiltroTipo(tipo)}
              sx={{ cursor: 'pointer', bgcolor: filtroTipo === tipo ? TIPO_CFG[tipo].color : 'rgba(255,255,255,0.06)', color: filtroTipo === tipo ? '#FFF' : 'rgba(255,255,255,0.5)', fontWeight: filtroTipo === tipo ? 700 : 400 }} />
          ))}
        </Box>

        {/* Timeline de interacciones */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {filtradas.map((int, i) => {
            const cfg = TIPO_CFG[int.tipo]
            return (
              <Box key={i} sx={{ border: `1px solid ${alpha(cfg.color, 0.2)}`, borderRadius: 2, p: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flexShrink: 0, textAlign: 'center', minWidth: 80 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: '10px', bgcolor: alpha(cfg.color, 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 0.5, '& svg': { color: cfg.color } }}>
                    {cfg.icon}
                  </Box>
                  <Typography sx={{ fontSize: 9.5, color: cfg.color, fontWeight: 600 }}>{cfg.label}</Typography>
                  <Typography sx={{ fontSize: 9.5, color: 'text.disabled', mt: 0.25 }}>{int.fecha.split(' ')[0]}</Typography>
                  <Typography sx={{ fontSize: 9.5, color: 'text.disabled' }}>{int.fecha.split(' ')[1]}</Typography>
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5, flexWrap: 'wrap', gap: 1 }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: 'text.primary' }}>{int.asunto}</Typography>
                    {int.duracion && (
                      <Chip label={`${int.duracion} min`} size="small" sx={{ bgcolor: 'text.disabled', color: 'text.secondary', fontSize: 9.5 }} />
                    )}
                  </Box>
                  <Typography sx={{ fontSize: 11.5, color: 'text.secondary', mb: 0.75 }}>
                    {int.cliente} · {int.contacto} · Ejecutivo: {int.ejecutivo}
                  </Typography>
                  <Box sx={{ p: 1.25, bgcolor: 'text.disabled', borderRadius: 1, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                      <Box component="span" sx={{ color: cfg.color, fontWeight: 600, mr: 0.5 }}>Resultado:</Box>
                      {int.resultado}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )
          })}
        </Box>
      </Box>
    </Layout>
  )
}
