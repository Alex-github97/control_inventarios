/**
 * Exporta a PDF lo que se ve en una parte de la pantalla: un informe, una
 * pestaña, un tablero.
 *
 * Se toma una imagen del elemento (con los gráficos tal como se ven) y se
 * reparte en hojas A4 horizontales, con encabezado —título, detalle del filtro,
 * fecha— y pie numerado. Sirve para cualquier informe que ya esté armado en
 * pantalla sin escribir su PDF a mano; los informes de consultoría con texto
 * redactado siguen saliendo del servidor.
 */
interface Opciones {
  titulo: string
  subtitulo?: string
  archivo: string
  empresa?: string
  /** Texto del pie, a la izquierda. */
  fuente?: string
}

const AZUL = [5, 28, 44] as const
const GRIS = [100, 116, 139] as const

export async function exportarPdfDeElemento(elemento: HTMLElement, o: Opciones): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])

  // Se exporta lo que se ve: las listas con desplazamiento propio salen con
  // el trozo visible, igual que en pantalla. Dejarlas crecer convertía una
  // lista de cientos de filas en un PDF de cientos de hojas.
  // Los gráficos son SVG con cientos o miles de elementos, y la captura los
  // recorre uno por uno: una pestaña con quince diagramas de dispersión tardaba
  // dos minutos y medio. Se convierten antes en imágenes, que el navegador
  // dibuja de una sola vez.
  // Se reemplazan en la página real por un instante (no en la copia que hace
  // la captura: al copiar, la librería ya recorrió cada punto) y se restauran
  // al terminar.
  const cambiados: { svg: SVGSVGElement; img: HTMLImageElement }[] = []
  for (const svg of Array.from(elemento.querySelectorAll<SVGSVGElement>('svg'))) {
    const r = svg.getBoundingClientRect()
    if (r.width < 40 || r.height < 40) continue          // íconos: se dejan como están
    const copia = svg.cloneNode(true) as SVGSVGElement
    copia.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    copia.setAttribute('width', String(r.width))
    copia.setAttribute('height', String(r.height))
    const img = new Image()
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(new XMLSerializer().serializeToString(copia))))
    img.style.width = `${r.width}px`
    img.style.height = `${r.height}px`
    img.style.display = 'block'
    cambiados.push({ svg, img })
  }
  await Promise.all(cambiados.map(c => c.img.decode().catch(() => undefined)))

  let lienzo: HTMLCanvasElement
  try {
    cambiados.forEach(c => c.svg.replaceWith(c.img))
    lienzo = await html2canvas(elemento, {
      scale: Math.min(2, window.devicePixelRatio || 1.5), backgroundColor: '#FFFFFF', useCORS: true,
      logging: false,
    })
  } finally {
    cambiados.forEach(c => c.img.replaceWith(c.svg))
  }

  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W = pdf.internal.pageSize.getWidth()
  const H = pdf.internal.pageSize.getHeight()
  const M = 12
  const arriba = 26
  const abajo = 12
  const anchoUtil = W - 2 * M
  const altoUtil = H - arriba - abajo
  // Cuántos píxeles de la captura caben en el alto útil de una hoja.
  const pxPorMm = lienzo.width / anchoUtil
  const pxPorHoja = Math.floor(altoUtil * pxPorMm)
  const hojas = Math.max(1, Math.ceil(lienzo.height / pxPorHoja))
  const fecha = new Date().toLocaleString('es-CO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  for (let i = 0; i < hojas; i++) {
    if (i > 0) pdf.addPage()
    // Encabezado
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(15); pdf.setTextColor(...AZUL)
    pdf.text(o.titulo, M, 13)
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8.5); pdf.setTextColor(...GRIS)
    pdf.text([o.empresa, o.subtitulo].filter(Boolean).join(' · ') || ' ', M, 19)
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(...AZUL)
    pdf.text('T I T T A N W A R E', W - M, 13, { align: 'right' })
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(...GRIS)
    pdf.text(fecha, W - M, 19, { align: 'right' })
    pdf.setDrawColor(...AZUL); pdf.setLineWidth(0.5); pdf.line(M, 22, W - M, 22)

    // El trozo de la captura que va en esta hoja.
    const alto = Math.min(pxPorHoja, lienzo.height - i * pxPorHoja)
    const trozo = document.createElement('canvas')
    trozo.width = lienzo.width
    trozo.height = alto
    trozo.getContext('2d')!.drawImage(lienzo, 0, i * pxPorHoja, lienzo.width, alto, 0, 0, lienzo.width, alto)
    pdf.addImage(trozo.toDataURL('image/jpeg', 0.92), 'JPEG', M, arriba, anchoUtil, alto / pxPorMm)

    // Pie
    pdf.setDrawColor(226, 232, 240); pdf.setLineWidth(0.2); pdf.line(M, H - 9, W - M, H - 9)
    pdf.setFontSize(7); pdf.setTextColor(...GRIS)
    pdf.text(o.fuente ? `Fuente: ${o.fuente}` : 'Fuente: TittanWare', M, H - 5)
    pdf.text(`${i + 1} / ${hojas}`, W - M, H - 5, { align: 'right' })
  }
  pdf.save(o.archivo)
}
