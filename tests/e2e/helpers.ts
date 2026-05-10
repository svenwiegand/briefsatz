import type { Page, Locator } from '@playwright/test'
import { expect } from '@playwright/test'

export const MM_TO_PX = 96 / 25.4

/** Convert a pixel value to millimeters (assuming the browser's 96dpi convention). */
export function pxToMm(px: number): number {
  return px / MM_TO_PX
}

/** Wait until the app has rendered, fonts have loaded and pagination has settled. */
export async function gotoApp(page: Page) {
  await page.goto('/')
  await page.waitForFunction(() => document.fonts.status === 'loaded')
  await page.locator('.letter-page').first().waitFor()
  // Two animation frames to let the ResizeObserver-driven scale settle.
  await page.evaluate(
    () =>
      new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      ),
  )
}

/** Set localStorage before the app boots; navigates to '/' afterwards. */
export async function gotoAppWithStorage(
  page: Page,
  values: Record<string, string>,
) {
  await page.addInitScript((entries) => {
    for (const [key, value] of entries) {
      window.localStorage.setItem(key, value)
    }
  }, Object.entries(values))
  await gotoApp(page)
}

/**
 * Replace the body editor content with the given BlockNote blocks. Reaches into
 * the React fiber to access the editor instance (no test hook required).
 */
export async function setBodyBlocks(
  page: Page,
  blocks: Array<{ type: string; content?: string; props?: Record<string, unknown> }>,
) {
  await page.waitForSelector('.bn-editor[contenteditable="true"]')
  await page.evaluate((nextBlocks) => {
    const ce = document.querySelector('.bn-editor[contenteditable="true"]')
    if (!ce) throw new Error('BlockNote editor not found')
    const fiberKey = Object.keys(ce).find((k) => k.startsWith('__reactFiber'))
    if (!fiberKey) throw new Error('React fiber key not found')
    let fiber = (ce as unknown as Record<string, { return: unknown; memoizedProps?: { editor?: unknown } }>)[fiberKey] as
      | { return?: unknown; memoizedProps?: { editor?: unknown } }
      | undefined
    while (fiber && !fiber.memoizedProps?.editor) {
      fiber = (fiber as { return?: typeof fiber }).return
    }
    const editor = fiber?.memoizedProps?.editor as
      | {
          document: Array<{ id: string }>
          replaceBlocks: (
            blocksToReplace: Array<{ id: string }>,
            newBlocks: typeof nextBlocks,
          ) => void
        }
      | undefined
    if (!editor) throw new Error('BlockNote editor instance not found')
    editor.replaceBlocks(editor.document, nextBlocks)
  }, blocks)
  // Allow change handlers + pagination to flush.
  await page.evaluate(
    () =>
      new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      ),
  )
}

/**
 * Match a Mantine form-field label, tolerating the trailing required asterisk.
 * Use with `page.getByLabel(field('Name'))` to avoid surprises like "Unterschrift (Name)".
 */
export function field(label: string): RegExp {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^${escaped}\\s*\\*?$`)
}

/** Lorem-ish paragraph used to fill multi-page test content. */
export function makeLoremParagraph(idx: number): { type: 'paragraph'; content: string } {
  return {
    type: 'paragraph',
    content:
      `Absatz ${idx}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. ` +
      'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. ' +
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris ' +
      'nisi ut aliquip ex ea commodo consequat.',
  }
}

interface MmRect {
  topMm: number
  bottomMm: number
  leftMm: number
  rightMm: number
  widthMm: number
  heightMm: number
}

/**
 * Get a locator's bounding rect expressed in millimeters relative to a
 * reference page. Compensates for any `zoom` applied to the reference (we
 * scale the on-screen preview to fit the panel) so the returned values
 * match the DIN 5008 layout coordinates regardless of viewport size.
 */
export async function mmRectRelativeTo(
  el: Locator,
  reference: Locator,
): Promise<MmRect> {
  const elBox = await el.boundingBox()
  const refBox = await reference.boundingBox()
  if (!elBox || !refBox) {
    throw new Error('Element or reference not visible (no bounding box)')
  }
  const zoom = await reference.evaluate(
    (node) => parseFloat(getComputedStyle(node as HTMLElement).zoom) || 1,
  )
  return {
    topMm: pxToMm(elBox.y - refBox.y) / zoom,
    bottomMm: pxToMm(elBox.y + elBox.height - refBox.y) / zoom,
    leftMm: pxToMm(elBox.x - refBox.x) / zoom,
    rightMm:
      pxToMm(refBox.x + refBox.width - (elBox.x + elBox.width)) / zoom,
    widthMm: pxToMm(elBox.width) / zoom,
    heightMm: pxToMm(elBox.height) / zoom,
  }
}

/** Assert two mm values are within `tolerance` of each other. */
export function expectMmClose(actual: number, expected: number, tolerance = 1) {
  expect(
    Math.abs(actual - expected),
    `expected ${actual.toFixed(2)}mm to be within ${tolerance}mm of ${expected}mm`,
  ).toBeLessThanOrEqual(tolerance)
}
