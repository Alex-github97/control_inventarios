import React, { useState } from 'react';
import {
  Box, Typography, Tabs, Tab, Card, CardContent, Chip, Grid,
  Stack, Button, Divider, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Collapse,
} from '@mui/material';
import { Layout } from '@/components/layout/Layout';

const EAM_COLOR = '#EA580C';
const CARD_BG = '#0F1E35';
const DARK_BG = '#060C1A';

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }
function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div hidden={value !== index} role="tabpanel">
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

type AssetType = 'VEHICULO' | 'MONTACARGAS' | 'INFRAESTRUCTURA' | 'MOTOCICLETA' | 'EQUIPO_TECNOLOGICO' | 'GENERAL';
type QuestionType = 'SI_NO' | 'ESCALA' | 'NUMERICO' | 'TEXTO';

interface Question { text: string; type: QuestionType; }
interface Section { name: string; questions: Question[]; }

interface Template {
  id: string;
  name: string;
  assetType: AssetType;
  totalQuestions: number;
  totalSections: number;
  sections?: Section[];
}

interface Execution {
  id: string;
  date: string;
  asset: string;
  template: string;
  executedBy: string;
  conformance: number;
  status: 'APROBADO' | 'OBSERVACION' | 'RECHAZADO';
}

interface NonConformance {
  id: string;
  asset: string;
  question: string;
  date: string;
  severity: 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';
  status: 'ABIERTA' | 'EN_PROCESO' | 'CERRADA';
  otGenerated: boolean;
  otId?: string;
}

const ASSET_TYPE_COLORS: Record<AssetType, string> = {
  VEHICULO: '#3B82F6',
  MONTACARGAS: '#F59E0B',
  INFRAESTRUCTURA: '#8B5CF6',
  MOTOCICLETA: '#06B6D4',
  EQUIPO_TECNOLOGICO: '#10B981',
  GENERAL: '#6B7280',
};

const PREOPERACIONAL_SECTIONS: Section[] = [
  {
    name: 'MOTOR',
    questions: [
      { text: '¿Aceite en nivel correcto?', type: 'SI_NO' },
      { text: '¿Temperatura normal?', type: 'ESCALA' },
      { text: '¿Sin fugas visibles?', type: 'SI_NO' },
    ],
  },
  {
    name: 'LLANTAS',
    questions: [
      { text: '¿Profundidad mínima OK?', type: 'SI_NO' },
      { text: '¿Presión correcta? (PSI)', type: 'NUMERICO' },
    ],
  },
  {
    name: 'LUCES',
    questions: [
      { text: '¿Frontales funcionando?', type: 'SI_NO' },
      { text: '¿Luces de reversa funcionando?', type: 'SI_NO' },
    ],
  },
];

const TEMPLATES: Template[] = [
  { id: 'CK-001', name: 'Preoperacional Vehículos', assetType: 'VEHICULO', totalQuestions: 24, totalSections: 5, sections: PREOPERACIONAL_SECTIONS },
  { id: 'CK-002', name: 'Inspección Montacargas', assetType: 'MONTACARGAS', totalQuestions: 18, totalSections: 4 },
  { id: 'CK-003', name: 'Check Cubierta e Infraestructura', assetType: 'INFRAESTRUCTURA', totalQuestions: 32, totalSections: 6 },
  { id: 'CK-004', name: 'Preoperacional Motocicletas', assetType: 'MOTOCICLETA', totalQuestions: 16, totalSections: 3 },
  { id: 'CK-005', name: 'Inspección Equipos Tecnológicos', assetType: 'EQUIPO_TECNOLOGICO', totalQuestions: 20, totalSections: 4 },
  { id: 'CK-006', name: 'Check PM Mensual General', assetType: 'GENERAL', totalQuestions: 28, totalSections: 5 },
];

const EXECUTIONS: Execution[] = [
  { id: 'EJ-001', date: '2026-06-19', asset: 'VH-001', template: 'Preoperacional Vehículos', executedBy: 'J. Rodríguez', conformance: 100, status: 'APROBADO' },
  { id: 'EJ-002', date: '2026-06-19', asset: 'VH-003', template: 'Preoperacional Vehículos', executedBy: 'M. García', conformance: 87, status: 'OBSERVACION' },
  { id: 'EJ-003', date: '2026-06-18', asset: 'MC-003', template: 'Inspección Montacargas', executedBy: 'L. Martínez', conformance: 61, status: 'RECHAZADO' },
  { id: 'EJ-004', date: '2026-06-18', asset: 'VH-007', template: 'Preoperacional Vehículos', executedBy: 'C. López', conformance: 95, status: 'APROBADO' },
  { id: 'EJ-005', date: '2026-06-17', asset: 'Bodega Bogotá', template: 'Check Cubierta e Infraestructura', executedBy: 'R. Torres', conformance: 78, status: 'OBSERVACION' },
  { id: 'EJ-006', date: '2026-06-17', asset: 'MT-002', template: 'Preoperacional Motocicletas', executedBy: 'A. Silva', conformance: 100, status: 'APROBADO' },
  { id: 'EJ-007', date: '2026-06-16', asset: 'EQ-TEC-05', template: 'Inspección Equipos Tecnológicos', executedBy: 'P. Herrera', conformance: 90, status: 'APROBADO' },
  { id: 'EJ-008', date: '2026-06-16', asset: 'CMP-07', template: 'Check PM Mensual General', executedBy: 'F. Moreno', conformance: 68, status: 'RECHAZADO' },
  { id: 'EJ-009', date: '2026-06-15', asset: 'VH-012', template: 'Preoperacional Vehículos', executedBy: 'D. Jiménez', conformance: 83, status: 'OBSERVACION' },
  { id: 'EJ-010', date: '2026-06-15', asset: 'MC-001', template: 'Inspección Montacargas', executedBy: 'E. Vargas', conformance: 75, status: 'OBSERVACION' },
];

const NON_CONFORMANCES: NonConformance[] = [
  { id: 'NC-001', asset: 'MC-003', question: '¿Sistema hidráulico sin fugas?', date: '2026-06-18', severity: 'CRITICA', status: 'ABIERTA', otGenerated: true, otId: 'OT-2847' },
  { id: 'NC-002', asset: 'VH-003', question: '¿Frenos con respuesta correcta?', date: '2026-06-19', severity: 'ALTA', status: 'EN_PROCESO', otGenerated: true, otId: 'OT-2851' },
  { id: 'NC-003', asset: 'CMP-07', question: '¿Presión de trabajo dentro del rango?', date: '2026-06-16', severity: 'ALTA', status: 'ABIERTA', otGenerated: true, otId: 'OT-2839' },
  { id: 'NC-004', asset: 'Bodega Bogotá', question: '¿Cubierta sin filtraciones visibles?', date: '2026-06-17', severity: 'MEDIA', status: 'EN_PROCESO', otGenerated: false },
  { id: 'NC-005', asset: 'VH-012', question: '¿Luces de advertencia apagadas?', date: '2026-06-15', severity: 'MEDIA', status: 'CERRADA', otGenerated: false },
  { id: 'NC-006', asset: 'MC-001', question: '¿Cinturón de seguridad en buen estado?', date: '2026-06-15', severity: 'ALTA', status: 'CERRADA', otGenerated: true, otId: 'OT-2832' },
  { id: 'NC-007', asset: 'EQ-TEC-05', question: '¿UPS con capacidad suficiente?', date: '2026-06-16', severity: 'BAJA', status: 'CERRADA', otGenerated: false },
];

const SEVERITY_COLORS: Record<NonConformance['severity'], string> = {
  CRITICA: '#DC2626',
  ALTA: '#EA580C',
  MEDIA: '#CA8A04',
  BAJA: '#6B7280',
};

const STATUS_NC_COLORS: Record<NonConformance['status'], string> = {
  ABIERTA: '#F87171',
  EN_PROCESO: '#FCD34D',
  CERRADA: '#34D399',
};

const QTYPE_LABEL: Record<QuestionType, string> = {
  SI_NO: 'SÍ/NO',
  ESCALA: 'ESCALA',
  NUMERICO: 'NUMÉRICO',
  TEXTO: 'TEXTO',
};

const QTYPE_COLORS: Record<QuestionType, string> = {
  SI_NO: '#3B82F6',
  ESCALA: '#8B5CF6',
  NUMERICO: '#10B981',
  TEXTO: '#6B7280',
};

function ConformanceCell({ value }: { value: number }) {
  const color = value >= 90 ? '#34D399' : value >= 70 ? '#FCD34D' : '#F87171';
  return (
    <Typography sx={{ color, fontWeight: 700, fontSize: '0.9rem' }}>{value}%</Typography>
  );
}

export default function EAMChecklists() {
  const [tab, setTab] = useState(0);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  const handleToggleTemplate = (id: string) => {
    setExpandedTemplate(prev => (prev === id ? null : id));
  };

  return (
    <Layout>
      <Box sx={{ p: 3, minHeight: '100vh', background: DARK_BG }}>
        <Stack direction="row" alignItems="center" spacing={2} mb={1}>
          <Box sx={{ width: 6, height: 36, bgcolor: EAM_COLOR, borderRadius: 1 }} />
          <Typography variant="h4" sx={{ color: EAM_COLOR, fontWeight: 700 }}>
            Checklists de Inspección
          </Typography>
        </Stack>
        <Typography variant="body2" sx={{ color: '#6B7280', mb: 3 }}>
          Plantillas, ejecuciones y seguimiento de no conformidades detectadas en campo
        </Typography>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{
              '& .MuiTab-root': { color: '#9CA3AF', fontWeight: 600 },
              '& .Mui-selected': { color: EAM_COLOR },
              '& .MuiTabs-indicator': { backgroundColor: EAM_COLOR },
            }}
          >
            <Tab label="Plantillas" />
            <Tab label="Ejecuciones" />
            <Tab label="No Conformidades" />
          </Tabs>
        </Box>

        {/* TAB 0 — Plantillas */}
        <TabPanel value={tab} index={0}>
          <Grid container spacing={2}>
            {TEMPLATES.map(tmpl => (
              <Grid key={tmpl.id} size={{ xs: 12, md: 6 }}>
                <Card sx={{ bgcolor: CARD_BG, border: '1px solid #1F2937', borderRadius: 2 }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                      <Box flex={1}>
                        <Typography variant="subtitle1" sx={{ color: '#F9FAFB', fontWeight: 700, mb: 0.5 }}>
                          {tmpl.name}
                        </Typography>
                        <Chip
                          label={tmpl.assetType.replace('_', ' ')}
                          size="small"
                          sx={{
                            bgcolor: ASSET_TYPE_COLORS[tmpl.assetType] + '22',
                            color: ASSET_TYPE_COLORS[tmpl.assetType],
                            border: `1px solid ${ASSET_TYPE_COLORS[tmpl.assetType]}`,
                            fontSize: '0.65rem', fontWeight: 700, letterSpacing: 0.5,
                          }}
                        />
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" sx={{ color: '#6B7280' }}>ID</Typography>
                        <Typography variant="body2" sx={{ color: '#9CA3AF', fontWeight: 600 }}>{tmpl.id}</Typography>
                      </Box>
                    </Stack>

                    <Stack direction="row" spacing={3} mb={2}>
                      <Box>
                        <Typography variant="h5" sx={{ color: EAM_COLOR, fontWeight: 900, lineHeight: 1 }}>{tmpl.totalQuestions}</Typography>
                        <Typography variant="caption" sx={{ color: '#6B7280' }}>preguntas</Typography>
                      </Box>
                      <Divider orientation="vertical" flexItem sx={{ borderColor: '#1F2937' }} />
                      <Box>
                        <Typography variant="h5" sx={{ color: '#60A5FA', fontWeight: 900, lineHeight: 1 }}>{tmpl.totalSections}</Typography>
                        <Typography variant="caption" sx={{ color: '#6B7280' }}>secciones</Typography>
                      </Box>
                    </Stack>

                    {tmpl.sections && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleToggleTemplate(tmpl.id)}
                        sx={{
                          borderColor: EAM_COLOR, color: EAM_COLOR, fontSize: '0.75rem',
                          '&:hover': { borderColor: '#C2410C', bgcolor: '#EA580C15' },
                        }}
                      >
                        {expandedTemplate === tmpl.id ? 'Ocultar preguntas' : 'Ver preguntas'}
                      </Button>
                    )}

                    {tmpl.sections && (
                      <Collapse in={expandedTemplate === tmpl.id}>
                        <Box mt={2}>
                          <Divider sx={{ borderColor: '#1F2937', mb: 2 }} />
                          {tmpl.sections.map(sec => (
                            <Box key={sec.name} mb={2}>
                              <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                                Sección: {sec.name}
                              </Typography>
                              <Stack spacing={1} mt={1}>
                                {sec.questions.map((q, qi) => (
                                  <Stack key={qi} direction="row" alignItems="center" justifyContent="space-between"
                                    sx={{ bgcolor: '#060C1A', borderRadius: 1, px: 1.5, py: 0.75, border: '1px solid #1F2937' }}>
                                    <Typography variant="body2" sx={{ color: '#D1D5DB', flex: 1 }}>{q.text}</Typography>
                                    <Chip
                                      label={QTYPE_LABEL[q.type]}
                                      size="small"
                                      sx={{ bgcolor: QTYPE_COLORS[q.type] + '22', color: QTYPE_COLORS[q.type], fontSize: '0.6rem', fontWeight: 700, border: `1px solid ${QTYPE_COLORS[q.type]}` }}
                                    />
                                  </Stack>
                                ))}
                              </Stack>
                            </Box>
                          ))}
                        </Box>
                      </Collapse>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </TabPanel>

        {/* TAB 1 — Ejecuciones */}
        <TabPanel value={tab} index={1}>
          <Typography variant="h6" sx={{ color: '#F9FAFB', fontWeight: 700, mb: 2 }}>
            Ejecuciones recientes de checklists
          </Typography>
          <TableContainer component={Paper} sx={{ bgcolor: CARD_BG, border: '1px solid #1F2937', borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& .MuiTableCell-head': { bgcolor: '#060C1A', color: '#6B7280', fontWeight: 700, borderColor: '#1F2937', fontSize: '0.75rem', letterSpacing: 0.5 } }}>
                  <TableCell>ID</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Activo</TableCell>
                  <TableCell>Plantilla</TableCell>
                  <TableCell>Ejecutado por</TableCell>
                  <TableCell>Conformidad</TableCell>
                  <TableCell>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {EXECUTIONS.map(ex => (
                  <TableRow key={ex.id} sx={{ '&:hover': { bgcolor: '#1F293750' } }}>
                    <TableCell sx={{ color: '#6B7280', borderColor: '#1F2937', fontSize: '0.75rem' }}>{ex.id}</TableCell>
                    <TableCell sx={{ color: '#9CA3AF', borderColor: '#1F2937', fontSize: '0.8rem' }}>{ex.date}</TableCell>
                    <TableCell sx={{ color: '#D1D5DB', borderColor: '#1F2937', fontWeight: 600 }}>{ex.asset}</TableCell>
                    <TableCell sx={{ color: '#9CA3AF', borderColor: '#1F2937', fontSize: '0.8rem', maxWidth: 180 }}>{ex.template}</TableCell>
                    <TableCell sx={{ color: '#D1D5DB', borderColor: '#1F2937' }}>{ex.executedBy}</TableCell>
                    <TableCell sx={{ borderColor: '#1F2937' }}><ConformanceCell value={ex.conformance} /></TableCell>
                    <TableCell sx={{ borderColor: '#1F2937' }}>
                      <Chip
                        label={ex.status}
                        size="small"
                        sx={{
                          bgcolor: ex.status === 'APROBADO' ? '#16A34A22' : ex.status === 'OBSERVACION' ? '#CA8A0422' : '#DC262622',
                          color: ex.status === 'APROBADO' ? '#34D399' : ex.status === 'OBSERVACION' ? '#FDE68A' : '#F87171',
                          fontWeight: 700, fontSize: '0.65rem',
                          border: `1px solid ${ex.status === 'APROBADO' ? '#34D399' : ex.status === 'OBSERVACION' ? '#FDE68A' : '#F87171'}`,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack direction="row" spacing={3} mt={2} justifyContent="flex-end">
            {[{ color: '#34D399', label: '≥ 90% Conforme' }, { color: '#FCD34D', label: '70–89% Con observaciones' }, { color: '#F87171', label: '< 70% No conforme' }].map(l => (
              <Stack key={l.label} direction="row" alignItems="center" spacing={0.5}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: l.color }} />
                <Typography variant="caption" sx={{ color: '#6B7280' }}>{l.label}</Typography>
              </Stack>
            ))}
          </Stack>
        </TabPanel>

        {/* TAB 2 — No Conformidades */}
        <TabPanel value={tab} index={2}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h6" sx={{ color: '#F9FAFB', fontWeight: 700 }}>
              No conformidades detectadas en campo
            </Typography>
            <Stack direction="row" spacing={1}>
              {['ABIERTA', 'EN_PROCESO', 'CERRADA'].map(s => (
                <Chip key={s} label={`${s}: ${NON_CONFORMANCES.filter(nc => nc.status === s).length}`} size="small"
                  sx={{ bgcolor: STATUS_NC_COLORS[s as NonConformance['status']] + '22', color: STATUS_NC_COLORS[s as NonConformance['status']], fontWeight: 700, fontSize: '0.65rem' }} />
              ))}
            </Stack>
          </Stack>

          <Stack spacing={2}>
            {NON_CONFORMANCES.map(nc => (
              <Card key={nc.id} sx={{ bgcolor: CARD_BG, border: `1px solid ${nc.status === 'ABIERTA' && nc.severity === 'CRITICA' ? '#DC262640' : '#1F2937'}`, borderRadius: 2 }}>
                <CardContent>
                  <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={1}>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Chip
                        label={nc.severity}
                        size="small"
                        sx={{ bgcolor: SEVERITY_COLORS[nc.severity] + '22', color: SEVERITY_COLORS[nc.severity], border: `1px solid ${SEVERITY_COLORS[nc.severity]}`, fontWeight: 700, fontSize: '0.65rem' }}
                      />
                      <Chip
                        label={nc.status}
                        size="small"
                        sx={{ bgcolor: STATUS_NC_COLORS[nc.status] + '22', color: STATUS_NC_COLORS[nc.status], fontWeight: 700, fontSize: '0.65rem' }}
                      />
                      {nc.otGenerated && (
                        <Chip
                          label={`OT Generada: ${nc.otId}`}
                          size="small"
                          sx={{ bgcolor: '#EA580C22', color: EAM_COLOR, border: `1px solid ${EAM_COLOR}`, fontWeight: 700, fontSize: '0.65rem' }}
                        />
                      )}
                    </Stack>
                    <Typography variant="caption" sx={{ color: '#6B7280', whiteSpace: 'nowrap', ml: 1 }}>{nc.date}</Typography>
                  </Stack>

                  <Typography variant="body2" sx={{ color: '#F9FAFB', fontWeight: 600, mb: 0.5 }}>
                    {nc.question}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#9CA3AF' }}>
                    Activo: <Box component="span" sx={{ color: '#D1D5DB', fontWeight: 600 }}>{nc.asset}</Box>
                    {' '} · ID: <Box component="span" sx={{ color: '#6B7280' }}>{nc.id}</Box>
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </TabPanel>
      </Box>
    </Layout>
  );
}
