/**
 * LMS · Configuración
 *
 * Era una maqueta: «frameworks» con porcentajes, umbrales y notificaciones que
 * no se guardaban e integraciones marcadas como conectadas que no existen. Se
 * quitaron. Queda lo real: cómo decide el sistema que un curso está completo y
 * que un certificado vence —para que quien administra sepa qué esperar— y los
 * catálogos del módulo.
 */
import { useState } from 'react'
import { Box, Paper, Tabs, Tab, Typography } from '@mui/material'
import { Settings } from '@mui/icons-material'
import { Layout } from '@/components/layout/Layout'
import { AdminCatalogos } from '@/components/catalogo/AdminCatalogos'
import { Encabezado } from '@/components/comun/Registro'
import { COLOR_MODULO } from '@/config/marca'

const LMS_COLOR = COLOR_MODULO
const REGLAS: [string, string][] = [
  ['Avance de un curso', 'Contenidos marcados como vistos sobre el total de contenidos del curso.'],
  ['Curso completado', 'Todo el contenido visto y, si el curso tiene evaluaciones activas, todas aprobadas. Al completarse se emite solo el certificado del curso, si tiene uno.'],
  ['Calificación', 'La hace el servidor. Solo cuentan las preguntas de opción múltiple y verdadero/falso; las abiertas no entran a la calificación automática. Una entrega después del tiempo límite (con un minuto de gracia) no suma puntos.'],
  ['Intentos', 'Cada evaluación define cuántos. Aprobada, ya no se abre otro intento.'],
  ['Certificados', 'Vigente hasta su fecha de vencimiento (emisión + vigencia en meses). En los últimos 30 días figura «por vencer»; después, «vencido».'],
  ['Brecha de competencia', 'Nivel requerido para el cargo menos el nivel actual, en la escala Inicial · Básico · Intermedio · Avanzado · Experto.'],
  ['Recomendaciones', 'Obligatorios sin completar, cursos que desarrollan una competencia con brecha en el cargo de la persona y cursos de las rutas pensadas para su cargo.'],
]

export default function LMSConfig() {
  const [tab, setTab] = useState(0)
  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Encabezado icono={<Settings sx={{ fontSize: 28 }} />} titulo="Configuración LMS" subtitulo="LMS · Reglas del módulo y catálogos" color={LMS_COLOR} />
        <Paper variant="outlined" sx={{ borderRadius: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: '1px solid #E5E7EB' }}><Tab label="Cómo funciona" /><Tab label="Catálogos" /></Tabs>
          <Box sx={{ p: 3 }}>
            {tab === 0 && (
              <Box sx={{ maxWidth: 820 }}>
                {REGLAS.map(([t, d]) => (
                  <Box key={t} sx={{ mb: 2 }}>
                    <Typography fontWeight={700}>{t}</Typography>
                    <Typography fontSize={14} color="text.secondary">{d}</Typography>
                  </Box>
                ))}
              </Box>
            )}
            {tab === 1 && <AdminCatalogos modulo="LMS" color={COLOR_MODULO} />}
          </Box>
        </Paper>
      </Box>
    </Layout>
  )
}
