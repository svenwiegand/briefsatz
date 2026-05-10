import { useEffect, useRef, useState } from 'react'
import { LetterPage } from './LetterPage'
import type { LetterData } from '../types'

const MM_TO_PX = 96 / 25.4

const BODY_WIDTH_MM = 165 // 210 - 25 (left) - 20 (right)

// Available height inside the body region per page (in mm).
// Page body region (first page) starts at 98.46mm, ends at 297-25=272mm
//   -> 173.54mm. Subject (~6mm) + greeting (~6mm) + spacing eat ~16mm.
// Continuation pages: top 25mm, bottom 25mm -> 247mm.
// Reserve 30mm on the last page for closing + signature space + name.
const FIRST_PAGE_BODY_HEIGHT_MM = 173.54 - 16
const CONT_PAGE_BODY_HEIGHT_MM = 247
const SIGNATURE_BLOCK_MM = 30

type PageContent = {
  bodyHtml: string
  showClosing: boolean
}

export function PreviewPanel({ data }: { data: LetterData }) {
  const measureRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<PageContent[]>([
    { bodyHtml: '', showClosing: true },
  ])

  useEffect(() => {
    const node = measureRef.current
    if (!node) return

    const recompute = () => {
      const elements = Array.from(node.children) as HTMLElement[]
      const firstLimit = FIRST_PAGE_BODY_HEIGHT_MM * MM_TO_PX
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

      // Determine if closing fits on the last group page or needs its own page.
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

    // Wait one frame for layout to settle.
    const raf = requestAnimationFrame(recompute)
    return () => cancelAnimationFrame(raf)
  }, [data.bodyHtml])

  return (
    <section className="preview-panel" aria-label="Briefvorschau">
      <div className="preview-pages" id="print-root">
        {pages.map((page, i) => (
          <LetterPage
            key={i}
            data={data}
            pageIndex={i}
            totalPages={pages.length}
            bodyHtml={page.bodyHtml}
            showClosing={page.showClosing}
          />
        ))}
      </div>
      <div
        ref={measureRef}
        className="preview-measure letter-page__body-content"
        aria-hidden="true"
        style={{
          width: `${BODY_WIDTH_MM}mm`,
          fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
          fontSize: '11pt',
          lineHeight: 1.4,
        }}
        dangerouslySetInnerHTML={{ __html: data.bodyHtml || '<p></p>' }}
      />
    </section>
  )
}
