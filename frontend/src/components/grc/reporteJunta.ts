/**
 * Reporte de riesgo y cumplimiento para la junta directiva, en PDF.
 * Lo arma con los mismos datos del tablero (endpoint /grc/reporte-junta).
 */
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const rgb = (hex: string): [number, number, number] => {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

export function reporteJuntaPDF(d: any, color = '#1E3A8A', empresa = '') {
  const doc = new jsPDF({ unit: 'pt' })
  const t = d.tablero
  const x = 40
  let y = 50
  const titulo = (s: string) => { y += 14; doc.setFontSize(12); doc.setTextColor(30, 41, 59); doc.text(s, x, y); y += 6 }
  const tabla = (head: string[], body: any[][]) => {
    autoTable(doc, { startY: y + 4, head: [head], body, styles: { fontSize: 8.5, cellPadding: 4 },
      headStyles: { fillColor: rgb(color), textColor: [255, 255, 255] }, margin: { left: x, right: x } })
    y = (doc as any).lastAutoTable.finalY + 8
  }

  doc.setFontSize(17); doc.setTextColor(30, 41, 59)
  doc.text('Informe de riesgo y cumplimiento', x, y)
  doc.setFontSize(9); doc.setTextColor(110, 110, 110)
  doc.text(`${empresa ? empresa + ' · ' : ''}Corte ${d.fecha}`, x, y + 14)
  y += 24

  titulo('1. Perfil de riesgo')
  tabla(['Indicador', 'Valor'], [
    ['Riesgos registrados', t.riesgos.total], ['Riesgos abiertos', t.riesgos.abiertos],
    ['Riesgos críticos abiertos', t.riesgos.criticos], ['Riesgos fuera del apetito', t.riesgos.fuera_de_apetito.length],
    ['Pérdida por incidentes (12 meses)', d.perdida_incidentes_12m.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })],
  ])
  if (t.top_riesgos.length) {
    titulo('2. Riesgos de mayor nivel')
    tabla(['Código', 'Riesgo', 'Categoría', 'Inherente', 'Residual', 'Prioridad', 'Dueño'],
      t.top_riesgos.map((r: any) => [r.codigo, r.nombre, r.tipo ?? '—', r.nivel_inherente ?? '—', r.nivel_residual ?? '—', r.prioridad ?? '—', r.responsable ?? '—']))
  }
  if (t.riesgos.fuera_de_apetito.length) {
    titulo('3. Riesgos por encima del apetito declarado')
    tabla(['Código', 'Riesgo', 'Nivel', 'Apetito'], t.riesgos.fuera_de_apetito.map((r: any) => [r.codigo, r.nombre, r.nivel, r.apetito]))
  }
  titulo('4. Control interno')
  tabla(['Indicador', 'Valor'], [
    ['Controles', t.controles.total], ['Controles probados', t.controles.probados],
    ['Efectivos sobre probados', t.controles.efectividad_pct == null ? 'Sin pruebas' : `${t.controles.efectividad_pct}%`],
    ['Con prueba vencida', t.controles.prueba_vencida],
  ])
  titulo('5. Cumplimiento por marco normativo')
  tabla(['Marco', 'Obligaciones', 'Cumple', 'Parcial', 'No cumple', 'Índice'],
    d.cumplimiento_por_marco.map((m: any) => [m.marco, m.obligaciones, m.cumple ?? 0, m.cumple_parcial ?? 0, m.no_cumple ?? 0,
      m.indice_pct == null ? '—' : `${m.indice_pct}%`]))
  titulo('6. Hallazgos e incidentes')
  tabla(['Indicador', 'Valor'], [
    ['Hallazgos abiertos', t.hallazgos.abiertos], ['Hallazgos vencidos', t.hallazgos.vencidos],
    ...Object.entries(d.hallazgos_abiertos_por_severidad).map(([k, v]) => [`  · severidad ${k}`, v]),
    ['Incidentes abiertos', t.incidentes.abiertos], ['Incidentes últimos 90 días', t.incidentes.ultimos_90],
    ['Políticas publicadas', t.politicas.publicadas], ['Políticas con revisión vencida', t.politicas.revision_vencida],
  ])
  doc.save(`informe-grc-${d.fecha}.pdf`)
}
