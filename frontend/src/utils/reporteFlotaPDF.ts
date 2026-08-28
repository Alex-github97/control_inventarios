import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const VERDE: [number, number, number] = [50, 172, 92]
const VERDE_OSCURO: [number, number, number] = [39, 136, 74]
const GRIS: [number, number, number] = [100, 116, 139]
const ROJO: [number, number, number] = [220, 38, 38]
const AMBAR: [number, number, number] = [217, 119, 6]

export interface PosicionReporte {
  posicion: string
  posicion_label?: string | null
  numero?: number | null
  eje?: number | null
  lado?: string | null
  codigo?: string | null
  marca?: string | null
  referencia?: string | null
  medida?: string | null
  vida?: string | null
  profundidad_min?: number | null
  presion_psi?: number | null
  fecha_inspeccion?: string | null
  observaciones?: string | null
  alerta?: string | null
}

export interface VehiculoReporte {
  activo_id: number
  codigo: string
  placa?: string | null
  nombre?: string | null
  numero_ejes?: number | null
  layout?: number[] | null
  tiene_repuesto?: boolean | null
  cantidad_repuestos?: number | null
  odometro?: number | null
  posiciones: PosicionReporte[]
  observaciones: string[]
  total_posiciones: number
  posiciones_ocupadas: number
  criticas: number
}

/**
 * Dibuja el esquema de llantas de un vehículo, con la misma lectura que el
 * diagrama de "Llantas por Vehículo": frente arriba, ejes de arriba a abajo,
 * chasis al centro. Se dibuja con primitivas de jsPDF (no captura de pantalla)
 * para que salga vectorial y nítido a cualquier zoom.
 *
 * Debajo de cada rueda va su profundidad mínima, que es el dato que se revisa.
 */
function dibujarEsquema(
  doc: jsPDF, veh: VehiculoReporte, x: number, y: number, ancho: number,
  profundidadMinima: number,
): number {
  const porEje = new Map<number, PosicionReporte[]>()
  const repuestos: PosicionReporte[] = []
  for (const p of veh.posiciones) {
    if (!p.eje || p.eje === 0) { repuestos.push(p); continue }
    const arr = porEje.get(p.eje) ?? []
    arr.push(p)
    porEje.set(p.eje, arr)
  }
  const ejes = Array.from(porEje.entries()).sort((a, b) => a[0] - b[0])

  const centroX = x + ancho / 2
  const wRueda = 15
  const hRueda = 22
  const gap = 3
  const altoFila = hRueda + 14
  let cursorY = y

  // Frente / cabina
  doc.setFillColor(232, 247, 238)
  doc.setDrawColor(...VERDE)
  doc.setLineWidth(0.8)
  doc.roundedRect(centroX - 34, cursorY, 68, 14, 3, 3, 'FD')
  doc.setFontSize(6)
  doc.setTextColor(...VERDE_OSCURO)
  doc.text('FRENTE / CABINA', centroX, cursorY + 9, { align: 'center' })
  cursorY += 20

  // Chasis
  const chasisTop = cursorY
  const chasisAlto = ejes.length * altoFila
  doc.setFillColor(148, 163, 184)
  doc.rect(centroX - 3, chasisTop, 6, chasisAlto, 'F')

  for (const [numEje, posiciones] of ejes) {
    const izq = posiciones.filter(p => p.lado === 'IZQ')
    const der = posiciones.filter(p => p.lado === 'DER')
    const centroFila = cursorY + hRueda / 2

    // Barra del eje
    doc.setFillColor(100, 116, 139)
    doc.rect(centroX - 42, centroFila - 1.5, 84, 3, 'F')

    // Etiqueta del eje
    doc.setFontSize(6)
    doc.setTextColor(...GRIS)
    doc.text(`Eje ${numEje}`, x + 2, centroFila + 2)

    const dibujarLado = (lista: PosicionReporte[], haciaIzquierda: boolean) => {
      lista.forEach((p, i) => {
        const offset = 46 + i * (wRueda + gap)
        const rx = haciaIzquierda ? centroX - offset - wRueda : centroX + offset
        const ocupada = !!p.codigo
        const prof = p.profundidad_min

        if (ocupada) {
          doc.setFillColor(31, 41, 55)
          doc.setDrawColor(15, 23, 42)
        } else {
          doc.setFillColor(241, 245, 249)
          doc.setDrawColor(203, 213, 225)
        }
        doc.setLineWidth(0.6)
        doc.roundedRect(rx, cursorY, wRueda, hRueda, 2.5, 2.5, 'FD')

        if (ocupada) {
          // Código de la llanta dentro de la rueda
          doc.setFontSize(4.6)
          doc.setTextColor(226, 232, 240)
          doc.text(String(p.codigo).slice(0, 8), rx + wRueda / 2, cursorY + hRueda / 2 + 1, { align: 'center' })
          // Profundidad mínima justo debajo
          doc.setFontSize(5.6)
          if (prof == null) doc.setTextColor(...GRIS)
          else if (prof <= profundidadMinima) doc.setTextColor(...ROJO)
          else if (prof <= profundidadMinima * 1.5) doc.setTextColor(...AMBAR)
          else doc.setTextColor(22, 163, 74)
          doc.text(prof != null ? `${prof} mm` : 's/d', rx + wRueda / 2, cursorY + hRueda + 6, { align: 'center' })
        } else {
          doc.setFontSize(7)
          doc.setTextColor(148, 163, 184)
          doc.text('+', rx + wRueda / 2, cursorY + hRueda / 2 + 2, { align: 'center' })
        }
      })
    }
    dibujarLado(izq, true)
    dibujarLado(der, false)
    cursorY += altoFila
  }

  // Repuestos
  if (repuestos.length) {
    doc.setDrawColor(203, 213, 225)
    doc.setLineWidth(0.4)
    doc.line(centroX - 50, cursorY + 2, centroX + 50, cursorY + 2)
    cursorY += 8
    doc.setFontSize(6)
    doc.setTextColor(...GRIS)
    doc.text('REPUESTO', centroX - 50, cursorY + hRueda / 2 + 2)
    repuestos.forEach((p, i) => {
      const rx = centroX - 10 + i * (wRueda + gap)
      const ocupada = !!p.codigo
      doc.setFillColor(ocupada ? 31 : 241, ocupada ? 41 : 245, ocupada ? 55 : 249)
      doc.setDrawColor(ocupada ? 15 : 203, ocupada ? 23 : 213, ocupada ? 42 : 225)
      doc.roundedRect(rx, cursorY, wRueda, hRueda, 2.5, 2.5, 'FD')
      if (ocupada) {
        doc.setFontSize(4.6)
        doc.setTextColor(226, 232, 240)
        doc.text(String(p.codigo).slice(0, 8), rx + wRueda / 2, cursorY + hRueda / 2 + 1, { align: 'center' })
        doc.setFontSize(5.6)
        doc.setTextColor(...GRIS)
        doc.text(p.profundidad_min != null ? `${p.profundidad_min} mm` : 's/d', rx + wRueda / 2, cursorY + hRueda + 6, { align: 'center' })
      }
    })
    cursorY += altoFila
  }

  return cursorY
}

/** Reporte PDF del estado actual de la flota: un vehículo por página. */
export function generarPDFEstadoFlota(opts: {
  vehiculos: VehiculoReporte[]
  desde?: string
  hasta?: string
  profundidadMinima: number
}): boolean {
  const { vehiculos, desde, hasta, profundidadMinima } = opts
  if (!vehiculos.length) return false

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' })
  const anchoPagina = doc.internal.pageSize.getWidth()
  const margen = 36

  vehiculos.forEach((veh, idx) => {
    if (idx > 0) doc.addPage()

    // Encabezado
    doc.setFillColor(...VERDE)
    doc.rect(0, 0, anchoPagina, 52, 'F')
    doc.setFontSize(14)
    doc.setTextColor(255, 255, 255)
    doc.text('Estado actual de la flota · Neumáticos', margen, 24)
    doc.setFontSize(8.5)
    const periodo = desde || hasta
      ? `Periodo: ${desde || 'inicio'} a ${hasta || 'hoy'}`
      : 'Periodo: todo el histórico'
    doc.text(`${periodo}   ·   Generado: ${new Date().toLocaleString('es-CO')}`, margen, 40)

    // Identificación del vehículo
    let y = 74
    doc.setFontSize(15)
    doc.setTextColor(30, 41, 59)
    doc.text(`${veh.placa || veh.codigo}`, margen, y)
    doc.setFontSize(9)
    doc.setTextColor(...GRIS)
    doc.text(
      `${veh.codigo}${veh.nombre ? ` · ${veh.nombre}` : ''}` +
      `${veh.odometro != null ? ` · Odómetro ${veh.odometro.toLocaleString('es-CO')} km` : ''}`,
      margen, y + 14,
    )
    doc.text(
      `Posiciones ocupadas ${veh.posiciones_ocupadas}/${veh.total_posiciones}` +
      `${veh.criticas ? `  ·  ${veh.criticas} en o bajo el mínimo` : ''}`,
      margen, y + 27,
    )
    y += 44

    // Esquema a la izquierda, observaciones a la derecha
    const anchoEsquema = 250
    const finEsquema = dibujarEsquema(doc, veh, margen, y, anchoEsquema, profundidadMinima)

    const xObs = margen + anchoEsquema + 16
    const anchoObs = anchoPagina - xObs - margen
    doc.setFontSize(9.5)
    doc.setTextColor(30, 41, 59)
    doc.text('Observaciones', xObs, y + 4)
    doc.setDrawColor(...VERDE)
    doc.setLineWidth(1)
    doc.line(xObs, y + 8, xObs + 70, y + 8)

    let yObs = y + 22
    doc.setFontSize(7.8)
    if (veh.observaciones.length === 0) {
      doc.setTextColor(...GRIS)
      doc.text('Sin observaciones ni alertas en el periodo.', xObs, yObs)
    } else {
      for (const obs of veh.observaciones) {
        const lineas = doc.splitTextToSize(`• ${obs}`, anchoObs)
        const critica = /minimo|mínimo/i.test(obs)
        doc.setTextColor(...(critica ? ROJO : GRIS))
        doc.text(lineas, xObs, yObs)
        yObs += lineas.length * 9 + 3
        if (yObs > doc.internal.pageSize.getHeight() - 120) {
          doc.setTextColor(...GRIS)
          doc.text('…', xObs, yObs)
          break
        }
      }
    }

    // Detalle por posición
    const yTabla = Math.max(finEsquema, yObs) + 18
    autoTable(doc, {
      startY: yTabla,
      margin: { left: margen, right: margen },
      head: [['Pos.', 'Llanta', 'Marca / Referencia', 'Medida', 'Vida', 'Prof. mín.', 'Presión', 'Últ. inspección']],
      body: veh.posiciones.map(p => [
        p.numero != null ? `Pos. ${p.numero}` : 'Repuesto',
        p.codigo ?? '—',
        p.codigo ? `${p.marca ?? '—'}${p.referencia ? ` · ${p.referencia}` : ''}` : '—',
        p.medida ?? '—',
        p.vida ?? '—',
        p.profundidad_min != null ? `${p.profundidad_min} mm` : '—',
        p.presion_psi != null ? `${p.presion_psi} psi` : '—',
        p.fecha_inspeccion ? new Date(p.fecha_inspeccion).toLocaleDateString('es-CO') : 'sin inspección',
      ]),
      styles: { fontSize: 7.4, cellPadding: 3.2 },
      headStyles: { fillColor: VERDE, textColor: 255, fontSize: 7.4 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: (data) => {
        // Resalta en rojo las profundidades en o bajo el mínimo
        if (data.section === 'body' && data.column.index === 5) {
          const txt = String(data.cell.raw ?? '')
          const valor = parseFloat(txt)
          if (!isNaN(valor) && valor <= profundidadMinima) {
            data.cell.styles.textColor = ROJO
            data.cell.styles.fontStyle = 'bold'
          }
        }
      },
    })

    // Pie
    doc.setFontSize(7)
    doc.setTextColor(...GRIS)
    doc.text(
      `Página ${idx + 1} de ${vehiculos.length}   ·   la compañía · CMMS/EAM`,
      anchoPagina / 2, doc.internal.pageSize.getHeight() - 18, { align: 'center' },
    )
  })

  const sufijo = new Date().toISOString().slice(0, 10)
  doc.save(`estado-flota-neumaticos_${sufijo}.pdf`)
  return true
}
