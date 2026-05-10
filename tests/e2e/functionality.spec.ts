import { expect, test } from '@playwright/test'
import { field, gotoApp, gotoAppWithStorage, setBodyBlocks } from './helpers'

test.describe('Functionality', () => {
  test('app loads with sender, recipient and body defaults visible in the preview', async ({
    page,
  }) => {
    await gotoApp(page)

    const firstPage = page.locator('.letter-page').first()
    await expect(firstPage).toBeVisible()
    await expect(firstPage.locator('.letter-page__sender-block')).toContainText(
      'Max Mustermann',
    )
    await expect(firstPage.locator('.letter-page__recipient')).toContainText(
      'Beispiel GmbH',
    )
    await expect(firstPage.locator('.letter-page__recipient')).toContainText(
      'Erika Beispiel',
    )
    await expect(firstPage.locator('.letter-page__subject')).toHaveText(
      'Ihr Anliegen',
    )
    await expect(firstPage.locator('.letter-page__greeting')).toHaveText(
      'Sehr geehrte Damen und Herren,',
    )
    await expect(firstPage.locator('.letter-page__signature-name')).toHaveText(
      'Max Mustermann',
    )
  })

  test('editing the sender form updates the preview live', async ({ page }) => {
    await gotoApp(page)

    await page.getByLabel(field('Name')).first().fill('Anna Antrieb')
    await page.getByLabel(field('Straße & Hausnummer')).first().fill('Hauptweg 99')
    await page.getByLabel(field('PLZ & Ort')).first().fill('10115 Berlin')

    const senderBlock = page.locator('.letter-page__sender-block').first()
    await expect(senderBlock).toContainText('Anna Antrieb')
    await expect(senderBlock).toContainText('Hauptweg 99')
    await expect(senderBlock).toContainText('10115 Berlin')

    // Return-line on the address field uses the sender too.
    await expect(page.locator('.letter-page__return-line').first()).toContainText(
      'Anna Antrieb',
    )
  })

  test('editing the recipient form updates the preview live', async ({ page }) => {
    await gotoApp(page)

    await page.getByLabel(field('Name')).nth(1).fill('Hans Müller')
    await page
      .getByLabel(field('Firma / Organisation'))
      .nth(1)
      .fill('Müller & Partner GmbH')
    await page.getByLabel(field('PLZ & Ort')).nth(1).fill('80331 München')

    const recipient = page.locator('.letter-page__recipient').first()
    await expect(recipient).toContainText('Hans Müller')
    await expect(recipient).toContainText('Müller & Partner GmbH')
    await expect(recipient).toContainText('80331 München')
  })

  test('the date picker writes the selected date into the preview info block', async ({
    page,
  }) => {
    await gotoApp(page)

    await page.getByLabel(field('Datum')).fill('07.04.2026')
    await page.keyboard.press('Escape')

    const infoBlock = page.locator('.letter-page__info-block')
    await expect(infoBlock).toContainText('Datum')
    await expect(infoBlock).toContainText('07.04.2026')
  })

  test('required fields are marked with an asterisk and there are no "optional" descriptions', async ({
    page,
  }) => {
    await gotoApp(page)

    const requiredLabels = page.locator(
      'label.mantine-InputWrapper-label:has(.mantine-InputWrapper-required)',
    )
    const labelTexts = await requiredLabels.allTextContents()
    expect(labelTexts.map((t) => t.replace('*', '').trim())).toEqual(
      expect.arrayContaining([
        'Name',
        'Straße & Hausnummer',
        'PLZ & Ort',
        'Datum',
        'Betreff',
        'Anrede',
        'Grußformel',
        'Unterschrift (Name)',
      ]),
    )

    expect(await page.locator('.mantine-InputWrapper-description').count()).toBe(
      0,
    )
  })

  test('optional info-block fields appear in the preview only once filled in', async ({
    page,
  }) => {
    await gotoApp(page)

    // Initial info block contains only the date.
    await expect(page.locator('.letter-page__info-label')).toHaveText(['Datum'])

    await page.getByLabel(field('Unser Zeichen')).fill('REF-42')
    await page.getByLabel(field('Ihr Zeichen')).fill('REF-99')

    const labels = page.locator('.letter-page__info-label')
    await expect(labels).toHaveText(['Ihr Zeichen', 'Unser Zeichen', 'Datum'])
  })

  test('splitter drag updates the editor share and persists to localStorage', async ({
    page,
  }) => {
    await gotoApp(page)

    const main = page.locator('.app__main')
    const splitter = page.locator('.splitter')
    const initialBox = await main.boundingBox()
    if (!initialBox) throw new Error('app main not visible')

    // Drag the splitter to ~30% of main width.
    const targetX = initialBox.x + initialBox.width * 0.3
    const splitterBox = await splitter.boundingBox()
    if (!splitterBox) throw new Error('splitter not visible')
    await page.mouse.move(
      splitterBox.x + splitterBox.width / 2,
      splitterBox.y + splitterBox.height / 2,
    )
    await page.mouse.down()
    await page.mouse.move(targetX, splitterBox.y + splitterBox.height / 2, {
      steps: 8,
    })
    await page.mouse.up()

    const stored = await page.evaluate(() =>
      window.localStorage.getItem('letter-app:editor-percent'),
    )
    expect(parseFloat(stored ?? '0')).toBeGreaterThanOrEqual(28)
    expect(parseFloat(stored ?? '100')).toBeLessThanOrEqual(32)

    await expect(splitter).toHaveAttribute('aria-valuenow', /^(2[89]|3[012])$/)
  })

  test('splitter responds to keyboard arrows', async ({ page }) => {
    await gotoAppWithStorage(page, { 'letter-app:editor-percent': '42' })

    const splitter = page.locator('.splitter')
    await splitter.focus()
    await page.keyboard.press('ArrowLeft')
    await page.keyboard.press('ArrowLeft')

    const after = await page.evaluate(() =>
      Number(window.localStorage.getItem('letter-app:editor-percent')),
    )
    expect(after).toBeLessThan(42)
    expect(after).toBeGreaterThanOrEqual(25)
  })

  test('the splitter position survives a reload', async ({ page }) => {
    await gotoAppWithStorage(page, { 'letter-app:editor-percent': '33' })
    await expect(page.locator('.splitter')).toHaveAttribute(
      'aria-valuenow',
      '33',
    )
    await page.reload()
    await page.waitForFunction(() => document.fonts.status === 'loaded')
    await expect(page.locator('.splitter')).toHaveAttribute(
      'aria-valuenow',
      '33',
    )
  })

  test('the splitter is hidden in single-column mode and not focusable', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 600, height: 900 })
    await gotoApp(page)
    await expect(page.locator('.splitter')).toBeHidden()
  })

  test('the print button calls window.print', async ({ page }) => {
    await gotoApp(page)
    const printed = await page.evaluate(() => {
      let called = false
      const original = window.print
      window.print = () => {
        called = true
      }
      return new Promise<boolean>((resolve) => {
        setTimeout(() => {
          window.print = original
          resolve(called)
        }, 50)
        document
          .querySelector<HTMLButtonElement>(
            'button[aria-label="Brief drucken oder als PDF speichern"]',
          )
          ?.click()
      })
    })
    expect(printed).toBe(true)
  })

  test('all letter data is persisted to localStorage and rehydrates on reload', async ({
    page,
  }) => {
    await gotoApp(page)

    await page.getByLabel(field('Name')).first().fill('Petra Persistent')
    await page.getByLabel(field('Betreff')).fill('Persistente Anfrage')
    await page.getByLabel(field('Datum')).fill('15.06.2026')
    await page.keyboard.press('Escape')
    await setBodyBlocks(page, [
      { type: 'paragraph', content: 'Persistierter Brieftext.' },
    ])

    // Wait one frame so localStorage write completes.
    await page.evaluate(
      () =>
        new Promise<void>((r) =>
          requestAnimationFrame(() => requestAnimationFrame(() => r())),
        ),
    )

    const stored = await page.evaluate(() =>
      window.localStorage.getItem('letter-app:data'),
    )
    expect(stored).not.toBeNull()
    const parsed = JSON.parse(stored!)
    expect(parsed.sender.name).toBe('Petra Persistent')
    expect(parsed.meta.subject).toBe('Persistente Anfrage')
    // Date is serialised as a full ISO string – its calendar date depends on
    // the runner's timezone, so we just assert it parses to a valid Date.
    expect(typeof parsed.meta.date).toBe('string')
    expect(Number.isNaN(new Date(parsed.meta.date).getTime())).toBe(false)
    expect(Array.isArray(parsed.bodyBlocks)).toBe(true)
    expect(parsed.bodyBlocks.length).toBeGreaterThan(0)

    await page.reload()
    await page.waitForFunction(() => document.fonts.status === 'loaded')

    const firstPage = page.locator('.letter-page').first()
    await expect(firstPage.locator('.letter-page__sender-block')).toContainText(
      'Petra Persistent',
    )
    await expect(firstPage.locator('.letter-page__subject')).toHaveText(
      'Persistente Anfrage',
    )
    await expect(firstPage.locator('.letter-page__info-block')).toContainText(
      '15.06.2026',
    )
    await expect(firstPage.locator('.letter-page__body-content')).toContainText(
      'Persistierter Brieftext.',
    )

    // The editor itself rehydrates with the stored blocks.
    await expect(page.locator('.bn-editor')).toContainText(
      'Persistierter Brieftext.',
    )
  })

  test('replacing body blocks via the editor flows through to the preview', async ({
    page,
  }) => {
    await gotoApp(page)
    await setBodyBlocks(page, [
      { type: 'paragraph', content: 'Erster Test-Absatz mit eindeutigem Inhalt.' },
      { type: 'paragraph', content: 'Zweiter Absatz folgt darunter.' },
    ])

    const bodyContent = page.locator('.letter-page__body-content').first()
    await expect(bodyContent).toContainText(
      'Erster Test-Absatz mit eindeutigem Inhalt.',
    )
    await expect(bodyContent).toContainText('Zweiter Absatz folgt darunter.')
  })
})
