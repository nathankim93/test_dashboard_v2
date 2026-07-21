import { toJpeg } from 'html-to-image'
import { jsPDF } from 'jspdf'

function stamp(): string {
  return new Date().toISOString().slice(0, 10).replace(/-/g, '')
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load captured image.'))
    img.src = src
  })
}

function sanitizeLiveColors(root: HTMLElement): () => void {
  const touched: Array<{ el: HTMLElement; cssText: string }> = []
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT)
  const elements: HTMLElement[] = [root]

  let node = walker.nextNode()
  while (node) {
    if (node instanceof HTMLElement) elements.push(node)
    node = walker.nextNode()
  }

  for (const el of elements) {
    if (el.dataset.html2canvasIgnore === 'true') continue

    const before = el.style.cssText
    const style = window.getComputedStyle(el)
    touched.push({ el, cssText: before })

    el.style.color = style.color
    if (style.backgroundColor && style.backgroundColor !== 'rgba(0, 0, 0, 0)') {
      el.style.backgroundColor = style.backgroundColor
    }
    el.style.borderTopColor = style.borderTopColor
    el.style.borderRightColor = style.borderRightColor
    el.style.borderBottomColor = style.borderBottomColor
    el.style.borderLeftColor = style.borderLeftColor
    if (style.fill && style.fill !== 'none') el.style.fill = style.fill
    if (style.stroke && style.stroke !== 'none') el.style.stroke = style.stroke
    el.style.boxShadow = 'none'
    el.style.textShadow = 'none'
    el.style.backdropFilter = 'none'
    el.style.filter = 'none'
  }

  return () => {
    for (const item of touched) {
      item.el.style.cssText = item.cssText
    }
  }
}

async function captureJpeg(element: HTMLElement): Promise<string> {
  const width = element.scrollWidth
  const height = element.scrollHeight
  const maxDimension = 8192
  const scale = Math.min(1.25, maxDimension / Math.max(width, height, 1))

  const baseOptions = {
    quality: 0.9,
      backgroundColor: '#ffffff',
    pixelRatio: scale,
    cacheBust: true,
    width,
    height,
    style: {
      transform: 'none',
      width: `${width}px`,
      height: `${height}px`,
    },
    filter: (node: Node) => {
      if (!(node instanceof HTMLElement)) return true
      return node.dataset.html2canvasIgnore !== 'true'
    },
  }

  try {
    return await toJpeg(element, baseOptions)
  } catch (firstError) {
    // Google Fonts / CSS color parsing often fails on first pass — retry without font embedding
    console.warn('PDF capture retry without embedded fonts:', firstError)
    return await toJpeg(element, {
      ...baseOptions,
      fontEmbedCSS: '',
    })
  }
}

/**
 * Capture the visible dashboard and save as a simple multi-page A4 PDF.
 */
export async function downloadDashboardPdf(element: HTMLElement): Promise<void> {
  const previousScrollY = window.scrollY
  window.scrollTo(0, 0)
  await new Promise((r) => window.setTimeout(r, 120))

  const restore = sanitizeLiveColors(element)

  try {
    const dataUrl = await captureJpeg(element)

    if (!dataUrl || dataUrl.length < 100) {
      throw new Error('Failed to capture dashboard image.')
    }

    const image = await loadImage(dataUrl)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    })

    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 6
    const usableWidth = pageWidth - margin * 2
    const usableHeight = pageHeight - margin * 2

    const imgWidth = usableWidth
    const imgHeight = (image.naturalHeight * imgWidth) / image.naturalWidth

    let heightLeft = imgHeight
    let position = margin

    pdf.addImage(dataUrl, 'JPEG', margin, position, imgWidth, imgHeight, undefined, 'FAST')
    heightLeft -= usableHeight

    while (heightLeft > 1) {
      position = margin - (imgHeight - heightLeft)
      pdf.addPage()
      pdf.addImage(dataUrl, 'JPEG', margin, position, imgWidth, imgHeight, undefined, 'FAST')
      heightLeft -= usableHeight
    }

    pdf.save(`Highbay_Dashboard_${stamp()}.pdf`)
  } finally {
    restore()
    window.scrollTo(0, previousScrollY)
  }
}
