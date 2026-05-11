import { expect, test } from '@playwright/test'
import {
  expectMmClose,
  field,
  gotoApp,
  gotoAppWithStorage,
  makeLoremParagraph,
  mmRectRelativeTo,
  setBodyBlocks,
} from './helpers'

// Layout tests assume editor share = 25 % so the preview column is wide
// enough that the page renders at zoom 1 in the default Playwright viewport
// (1280×720). The mm helper compensates for any residual zoom anyway.
test.use({ viewport: { width: 1600, height: 1000 } })

test.beforeEach(async ({ page }) => {
  await gotoAppWithStorage(page, { 'letter-app:editor-percent': '30' })
})

test.describe('DIN 5008 first-page geometry', () => {
  test('address window starts at 45 mm from page top, 25 mm from left, 85×45 mm', async ({
    page,
  }) => {
    const firstPage = page.locator('.letter-page').first()
    const addressField = firstPage.locator('.letter-page__address-field')

    const rect = await mmRectRelativeTo(addressField, firstPage)
    expectMmClose(rect.topMm, 45, 0.5)
    expectMmClose(rect.leftMm, 25, 0.5)
    expectMmClose(rect.widthMm, 85, 0.5)
    expectMmClose(rect.heightMm, 45, 0.5)
  })

  test('sender block sits in the top-right corner', async ({ page }) => {
    const firstPage = page.locator('.letter-page').first()
    const sender = firstPage.locator('.letter-page__sender-block')

    const rect = await mmRectRelativeTo(sender, firstPage)
    expectMmClose(rect.topMm, 12, 1.5)
    expectMmClose(rect.rightMm, 20, 1.5)
  })

  test('info block is anchored at its bottom (~96 mm) and grows upwards when more rows are added', async ({
    page,
  }) => {
    const firstPage = page.locator('.letter-page').first()
    const infoBlock = firstPage.locator('.letter-page__info-block')

    const initial = await mmRectRelativeTo(infoBlock, firstPage)
    expectMmClose(initial.bottomMm, 96, 1.5)
    expectMmClose(initial.rightMm, 20, 1.5)

    // Add three optional rows – the bottom should not move; the top should.
    await page.getByLabel(field('Ihr Zeichen')).fill('IHR-1')
    await page.getByLabel(field('Ihre Nachricht vom')).fill('01.04.2026')
    await page.keyboard.press('Escape')
    await page.getByLabel(field('Unser Zeichen')).fill('OUR-7')

    const expanded = await mmRectRelativeTo(infoBlock, firstPage)
    expectMmClose(expanded.bottomMm, 96, 1.5)
    expect(expanded.topMm).toBeLessThan(initial.topMm - 5)
  })
})

test.describe('Pagination', () => {
  test('long body content splits across multiple pages with continuation header and signature on the last page', async ({
    page,
  }) => {
    await setBodyBlocks(
      page,
      Array.from({ length: 30 }, (_, i) => makeLoremParagraph(i + 1)),
    )

    const pages = page.locator('.letter-page')
    await expect.poll(async () => await pages.count()).toBeGreaterThan(1)

    const total = await pages.count()
    const first = pages.first()
    const last = pages.nth(total - 1)

    await expect(first).toHaveClass(/letter-page--first/)
    await expect(first.locator('.letter-page__subject')).toBeVisible()
    await expect(first.locator('.letter-page__greeting')).toBeVisible()
    await expect(first.locator('.letter-page__continuation-header')).toHaveCount(0)

    for (let i = 1; i < total; i++) {
      await expect(
        pages.nth(i).locator('.letter-page__continuation-header'),
      ).toBeVisible()
      await expect(pages.nth(i).locator('.letter-page__subject')).toHaveCount(0)
    }

    // Closing block (Mit freundlichen Grüßen + signature) lives on the last page.
    await expect(last.locator('.letter-page__closing')).toBeVisible()
    await expect(last.locator('.letter-page__signature-name')).toBeVisible()
    for (let i = 0; i < total - 1; i++) {
      await expect(pages.nth(i).locator('.letter-page__closing')).toHaveCount(0)
    }

    // No continuation page above the last shows the signature.
    if (total > 1) {
      await expect(
        pages.nth(total - 2).locator('.letter-page__signature-name'),
      ).toHaveCount(0)
    }

    // Page footer ("Seite X / Y") on every page.
    await expect(pages.first().locator('.letter-page__footer')).toContainText(
      `1 / ${total}`,
    )
    await expect(last.locator('.letter-page__footer')).toContainText(
      `${total} / ${total}`,
    )
  })

  test('body content never collides with the page footer (≥ 5 mm clearance)', async ({
    page,
  }) => {
    await setBodyBlocks(
      page,
      Array.from({ length: 25 }, (_, i) => makeLoremParagraph(i + 1)),
    )

    const pages = page.locator('.letter-page')
    const total = await pages.count()
    for (let i = 0; i < total; i++) {
      const pageEl = pages.nth(i)
      const footer = pageEl.locator('.letter-page__footer')
      const lastChild = pageEl
        .locator('.letter-page__body-content > *')
        .last()
      if ((await footer.count()) === 0) continue
      if ((await lastChild.count()) === 0) continue

      const lastRect = await mmRectRelativeTo(lastChild, pageEl)
      const footerRect = await mmRectRelativeTo(footer, pageEl)
      expect(footerRect.topMm - lastRect.bottomMm).toBeGreaterThanOrEqual(5)
    }
  })

  test('a long subject reduces first-page capacity but does not push body into the footer', async ({
    page,
  }) => {
    const longSubject =
      'Mitteilung über Ihre Anfrage zum Vertragsverhältnis und die ' +
      'sich daraus ergebenden Nebenabreden, Folgeaufträge sowie eventuelle ' +
      'Rückfragen aus der Verwaltung'
    await page.getByLabel(field('Betreff')).fill(longSubject)
    await setBodyBlocks(
      page,
      Array.from({ length: 18 }, (_, i) => makeLoremParagraph(i + 1)),
    )

    const firstPage = page.locator('.letter-page').first()
    const footer = firstPage.locator('.letter-page__footer')
    const lastChild = firstPage
      .locator('.letter-page__body-content > *')
      .last()

    const lastRect = await mmRectRelativeTo(lastChild, firstPage)
    const footerRect = await mmRectRelativeTo(footer, firstPage)
    expect(footerRect.topMm - lastRect.bottomMm).toBeGreaterThanOrEqual(5)
  })

  test('first page fills its body region tightly (last child within 25 mm of body bottom)', async ({
    page,
  }) => {
    await setBodyBlocks(
      page,
      Array.from({ length: 30 }, (_, i) => makeLoremParagraph(i + 1)),
    )

    const firstPage = page.locator('.letter-page').first()
    const lastChild = firstPage
      .locator('.letter-page__body-content > *')
      .last()
    const rect = await mmRectRelativeTo(lastChild, firstPage)

    // Body region bottom is at 297mm − 25mm = 272 mm. Last child should end
    // close to that – the residual gap is whatever a single greedy split leaves.
    const bodyBottomMm = 272
    expect(bodyBottomMm - rect.bottomMm).toBeLessThanOrEqual(25)
  })
})

test.describe('Body styling', () => {
  test('body content is justified with German hyphenation enabled', async ({
    page,
  }) => {
    await setBodyBlocks(page, [
      {
        type: 'paragraph',
        content:
          'Donaudampfschifffahrtsgesellschaftskapitän Hannelore Donaudampfschifffahrtsgesellschaftskapitänin schreibt Donaudampfschifffahrtsgesellschaftsbriefe.',
      },
    ])

    const styles = await page
      .locator('.letter-page__body-content p')
      .first()
      .evaluate((el) => {
        const cs = getComputedStyle(el)
        return {
          textAlign: cs.textAlign,
          hyphens:
            cs.hyphens ||
            (cs as CSSStyleDeclaration & { webkitHyphens?: string })
              .webkitHyphens,
        }
      })
    expect(styles.textAlign).toBe('justify')
    expect(styles.hyphens).toBe('auto')
  })

  test('paragraphs nested under bullet points carry data-nesting-level and are indented', async ({
    page,
  }) => {
    // BlockNote nests blocks via the `children` array; the lossy HTML output
    // flattens children into siblings with `data-nesting-level` attributes.
    await setBodyBlocks(page, [
      {
        type: 'bulletListItem',
        content: 'Top-level Aufzählungspunkt',
        children: [
          {
            type: 'paragraph',
            content: 'Eingerückter Absatz unter dem Bullet',
          },
        ],
      } as unknown as { type: string; content: string },
    ])

    const indented = page
      .locator('.letter-page__body-content [data-nesting-level="1"]')
      .first()
    await expect(indented).toBeVisible()

    const margin = await indented.evaluate(
      (el) => parseFloat(getComputedStyle(el).marginLeft) || 0,
    )
    // 6 mm at 96 dpi ≈ 22.7 px (allow a little subpixel slack).
    expect(margin).toBeGreaterThan(20)
  })

  test('check-list items render without a bullet, with a styled checkbox and strikethrough when checked', async ({
    page,
  }) => {
    await setBodyBlocks(page, [
      { type: 'checkListItem', content: 'Offene Aufgabe' },
      {
        type: 'checkListItem',
        content: 'Erledigte Aufgabe',
        props: { checked: true },
      } as { type: string; content: string; props: Record<string, unknown> },
    ])

    const items = page
      .locator('.letter-page__body-content')
      .first()
      .locator('li:has(> input[type="checkbox"])')
    await expect(items).toHaveCount(2)

    const listStyle = await items
      .nth(0)
      .evaluate((el) => getComputedStyle(el).listStyleType)
    expect(listStyle).toBe('none')

    const checked = items.nth(1)
    await expect(checked).toHaveAttribute('data-checked', 'true')
    const strike = await checked
      .locator('p')
      .first()
      .evaluate((el) => getComputedStyle(el).textDecorationLine)
    expect(strike).toContain('line-through')

    // Checked checkbox has the brand-coloured fill we added in the print CSS.
    const checkboxBg = await checked
      .locator('input[type="checkbox"]')
      .evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(checkboxBg).toBe('rgb(29, 78, 216)')
  })
})

test.describe('Print and fold marks', () => {
  test('fold marks (105 mm, 148.5 mm, 210 mm) and punch mark are present on every page', async ({
    page,
  }) => {
    await setBodyBlocks(
      page,
      Array.from({ length: 18 }, (_, i) => makeLoremParagraph(i + 1)),
    )

    const pages = page.locator('.letter-page')
    const total = await pages.count()
    expect(total).toBeGreaterThan(1)

    for (let i = 0; i < total; i++) {
      const pageEl = pages.nth(i)
      const marks = pageEl.locator('.letter-page__marks')
      await expect(marks).toBeVisible()
      const positions = await marks.evaluate((el) => {
        const cs = getComputedStyle(el)
        const before = getComputedStyle(el, '::before')
        const after = getComputedStyle(el, '::after')
        const span = el.querySelector('span')
        return {
          before: parseFloat(before.top),
          after: parseFloat(after.top),
          span: span ? parseFloat(getComputedStyle(span).top) : null,
          background: cs.backgroundColor,
        }
      })
      const mmFromPx = (px: number) => px / (96 / 25.4)
      expect(mmFromPx(positions.before)).toBeCloseTo(105, 0)
      expect(mmFromPx(positions.after)).toBeCloseTo(210, 0)
      expect(mmFromPx(positions.span!)).toBeCloseTo(148.5, 0)
    }
  })

  test('print stylesheet hides editor, header, splitter and the measurement DIVs', async ({
    page,
  }) => {
    await page.emulateMedia({ media: 'print' })

    await expect(page.locator('.editor-panel')).toBeHidden()
    await expect(page.locator('.mantine-AppShell-header')).toBeHidden()
    await expect(page.locator('.preview-measure').first()).toBeHidden()

    const splitter = page.locator('.splitter')
    if (await splitter.count()) {
      await expect(splitter).toBeHidden()
    }

    // Page itself stays visible and zoom is forced back to 1.
    const firstPage = page.locator('.letter-page').first()
    await expect(firstPage).toBeVisible()
    const zoom = await firstPage.evaluate(
      (el) => parseFloat(getComputedStyle(el).zoom) || 1,
    )
    expect(zoom).toBe(1)
  })
})

test.describe('Responsive layout', () => {
  test('at 600 px the layout collapses to one column and the page never causes horizontal scroll', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 600, height: 900 })
    await gotoApp(page)

    // No horizontal scroll on the document.
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(scrollWidth).toBeLessThanOrEqual(600)

    // The A4 preview page is scaled down via CSS zoom so it fits the column.
    const zoom = await page
      .locator('.letter-page')
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).zoom) || 1)
    expect(zoom).toBeLessThan(1)
    const pageWidth = await page
      .locator('.letter-page')
      .first()
      .evaluate((el) => el.getBoundingClientRect().width)
    expect(pageWidth).toBeLessThanOrEqual(600)
  })

  test('at desktop widths the page renders at full A4 size (zoom = 1)', async ({
    page,
  }) => {
    const firstPage = page.locator('.letter-page').first()
    const zoom = await firstPage.evaluate(
      (el) => parseFloat(getComputedStyle(el).zoom) || 1,
    )
    // 1600 × 1000 viewport with editor at 30 % gives ≥ 794 px usable preview width.
    expect(zoom).toBe(1)
  })
})
