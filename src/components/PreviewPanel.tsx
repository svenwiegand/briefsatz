import { useEffect, useRef, useState } from 'react'
import { LetterPage } from './LetterPage'
import type { LetterData } from '../types'

const MM_TO_PX = 96 / 25.4

const BODY_WIDTH_MM = 165 // 210 - 25 (left) - 20 (right)

// Body region geometry (matches letter.css):
//   First page: top 98.46mm, bottom 25mm  -> 173.54mm tall
//   Continuation: top 25mm, bottom 25mm   -> 247mm tall
// On the first page, subject + greeting are rendered above body content;
// their actual height is measured at runtime so a long subject does not
// cause body content to overflow.
const FIRST_PAGE_TOTAL_MM = 297 - 98.46 - 25
const CONT_PAGE_BODY_HEIGHT_MM = 297 - 25 - 25
const SIGNATURE_BLOCK_MM = 30
const PREAMBLE_TO_BODY_GAP_MM = 0.5

type PageContent = {
  bodyHtml: string
  showClosing: boolean
}

const PAGE_WIDTH_MM = 210
const PAGE_WIDTH_PX = PAGE_WIDTH_MM * MM_TO_PX

interface PreviewPanelProps {
  data: LetterData
  signatureUrl: string | null
}

export function PreviewPanel({ data, signatureUrl }: PreviewPanelProps) {
  const sectionRef = useRef<HTMLElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const preambleRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<PageContent[]>([
    { bodyHtml: '', showClosing: true },
  ])
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = sectionRef.current
    if (!el) return

    const compute = () => {
      const cs = getComputedStyle(el)
      const padLeft = parseFloat(cs.paddingLeft) || 0
      const padRight = parseFloat(cs.paddingRight) || 0
      const usable = el.clientWidth - padLeft - padRight
      if (usable <= 0) return
      const next = Math.min(1, usable / PAGE_WIDTH_PX)
      setScale((prev) => (Math.abs(prev - next) < 0.001 ? prev : next))
    }

    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const node = measureRef.current
    const preamble = preambleRef.current
    if (!node || !preamble) return

    const recompute = () => {
      const elements = Array.from(node.children) as HTMLElement[]
      const preambleHeightMm = preamble.offsetHeight / MM_TO_PX
      const firstAvailMm = Math.max(
        20,
        FIRST_PAGE_TOTAL_MM - preambleHeightMm - PREAMBLE_TO_BODY_GAP_MM,
      )
      const firstLimit = firstAvailMm * MM_TO_PX
      const contLimit = CONT_PAGE_BODY_HEIGHT_MM * MM_TO_PX
      const reservePx = SIGNATURE_BLOCK_MM * MM_TO_PX

      if (elements.length === 0) {
        setPages([{ bodyHtml: '', showClosing: true }])
        return
      }

      const groups: HTMLElement[][] = [[]]
      let pageIdx = 0
      let pageOriginTop = elements[0].offsetTop

      for (const el of elements) {
        const elTop = el.offsetTop
        const elBottom = elTop + el.offsetHeight
        const limit = pageIdx === 0 ? firstLimit : contLimit
        if (elBottom - pageOriginTop > limit && groups[pageIdx].length > 0) {
          pageIdx += 1
          groups.push([])
          pageOriginTop = elTop
        }
        groups[pageIdx].push(el)
      }

      const lastGroup = groups[groups.length - 1]
      const lastUsedPx =
        lastGroup.length === 0
          ? 0
          : lastGroup[lastGroup.length - 1].offsetTop +
            lastGroup[lastGroup.length - 1].offsetHeight -
            (lastGroup[0]?.offsetTop ?? 0)
      const lastLimit = groups.length === 1 ? firstLimit : contLimit
      const closingFits = lastUsedPx + reservePx <= lastLimit

      const result: PageContent[] = groups.map((group, idx) => ({
        bodyHtml: group.map((el) => el.outerHTML).join(''),
        showClosing: closingFits && idx === groups.length - 1,
      }))

      if (!closingFits) {
        result.push({ bodyHtml: '', showClosing: true })
      }

      setPages(result)
    }

    const raf = requestAnimationFrame(recompute)
    return () => cancelAnimationFrame(raf)
  }, [data.bodyHtml, data.meta.subject, data.meta.greeting])

  const previewMeasureStyle = {
    width: `${BODY_WIDTH_MM}mm`,
    fontFamily:
      '"Atkinson Hyperlegible", "Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSize: '11pt',
    lineHeight: 1.4,
  } as const

  return (
    <section
      ref={sectionRef}
      className="preview-panel"
      aria-label="Briefvorschau"
      style={{ ['--preview-scale' as string]: scale }}
    >
      <div className="preview-pages" id="print-root">
        {pages.map((page, i) => (
          <LetterPage
            key={i}
            data={data}
            pageIndex={i}
            totalPages={pages.length}
            bodyHtml={page.bodyHtml}
            showClosing={page.showClosing}
            signatureUrl={page.showClosing ? signatureUrl : null}
          />
        ))}
      </div>
      <div
        ref={measureRef}
        className="preview-measure letter-page__body-content"
        aria-hidden="true"
        style={previewMeasureStyle}
        dangerouslySetInnerHTML={{ __html: data.bodyHtml || '<p></p>' }}
      />
      <div
        ref={preambleRef}
        className="preview-measure"
        aria-hidden="true"
        style={{ ...previewMeasureStyle, paddingBottom: '0.1mm' }}
      >
        {data.meta.subject.trim() && (
          <p className="letter-page__subject">{data.meta.subject}</p>
        )}
        {data.meta.greeting.trim() && (
          <p className="letter-page__greeting">{data.meta.greeting}</p>
        )}
      </div>
    </section>
  )
}
