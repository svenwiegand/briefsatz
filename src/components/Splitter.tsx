import { useCallback, useRef } from 'react'

interface Props {
  /** Called continuously during a pointer drag with the current cursor X (in viewport coords). */
  onDrag: (clientX: number) => void
  /** Called when the user requests an incremental keyboard adjustment in pixels. */
  onKeyboardAdjust?: (deltaPx: number) => void
  ariaValueNow?: number
  ariaValueMin?: number
  ariaValueMax?: number
}

const KEYBOARD_STEP_PX = 24

export function Splitter({
  onDrag,
  onKeyboardAdjust,
  ariaValueNow,
  ariaValueMin,
  ariaValueMax,
}: Props) {
  const draggingRef = useRef(false)

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      draggingRef.current = true
      const target = e.currentTarget
      target.setPointerCapture(e.pointerId)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const handleMove = (ev: PointerEvent) => {
        if (!draggingRef.current) return
        onDrag(ev.clientX)
      }
      const handleUp = (ev: PointerEvent) => {
        draggingRef.current = false
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        target.releasePointerCapture(ev.pointerId)
        target.removeEventListener('pointermove', handleMove)
        target.removeEventListener('pointerup', handleUp)
        target.removeEventListener('pointercancel', handleUp)
      }
      target.addEventListener('pointermove', handleMove)
      target.addEventListener('pointerup', handleUp)
      target.addEventListener('pointercancel', handleUp)
    },
    [onDrag],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!onKeyboardAdjust) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        onKeyboardAdjust(-KEYBOARD_STEP_PX)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        onKeyboardAdjust(KEYBOARD_STEP_PX)
      }
    },
    [onKeyboardAdjust],
  )

  return (
    <div
      className="splitter"
      role="separator"
      aria-orientation="vertical"
      aria-label="Bereichsbreite anpassen"
      aria-valuenow={ariaValueNow}
      aria-valuemin={ariaValueMin}
      aria-valuemax={ariaValueMax}
      tabIndex={0}
      onPointerDown={handlePointerDown}
      onKeyDown={handleKeyDown}
    >
      <span className="splitter__handle" aria-hidden="true" />
    </div>
  )
}
