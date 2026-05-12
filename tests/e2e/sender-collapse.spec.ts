import { expect, test, type Page } from '@playwright/test'
import { field, gotoApp, gotoAppWithStorage } from './helpers'

const COLLAPSED_KEY = 'letter-app:sender-block-collapsed'

async function waitForProfileCount(page: Page, count: number) {
  await page.waitForFunction((expected) => {
    const raw = window.localStorage.getItem('letter-app:sender-profiles')
    if (!raw) return false
    try {
      const list = JSON.parse(raw) as unknown[]
      return Array.isArray(list) && list.length === expected
    } catch {
      return false
    }
  }, count)
}

function senderToggle(page: Page) {
  return page.getByTestId('sender-toggle')
}

function senderProfileCombobox(page: Page) {
  return page.getByRole('button', { name: /Absender-Profil/ })
}

async function readCollapsed(page: Page): Promise<unknown> {
  const raw = await page.evaluate(
    (key) => window.localStorage.getItem(key),
    COLLAPSED_KEY,
  )
  return raw === null ? null : JSON.parse(raw)
}

test.describe('Sender block collapse', () => {
  test('defaults to expanded; full sender form is visible', async ({ page }) => {
    await gotoApp(page)
    await waitForProfileCount(page, 1)

    const toggle = senderToggle(page)
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-expanded', 'true')

    // Address + contact fields are visible.
    await expect(page.getByLabel(field('Name')).first()).toBeVisible()
    await expect(page.getByLabel(field('Telefon'))).toBeVisible()
    await expect(page.getByLabel(field('E-Mail'))).toBeVisible()

    // Action icons are visible while expanded.
    await expect(
      page.getByRole('button', { name: 'Neuer Absender' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Absender duplizieren' }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Profil löschen' }),
    ).toBeVisible()
  })

  test('clicking the legend collapses the block: form hidden, action icons gone, profile combobox stays', async ({
    page,
  }) => {
    await gotoApp(page)
    await waitForProfileCount(page, 1)

    await senderToggle(page).click()

    await expect(senderToggle(page)).toHaveAttribute('aria-expanded', 'false')

    // Profile combobox stays accessible.
    await expect(senderProfileCombobox(page)).toBeVisible()

    // Address and contact fields are hidden.
    await expect(page.getByLabel(field('Name')).first()).toBeHidden()
    await expect(page.getByLabel(field('Telefon'))).toBeHidden()
    await expect(page.getByLabel(field('E-Mail'))).toBeHidden()

    // Action icons (+, clone, delete) are removed from the DOM while collapsed.
    await expect(
      page.getByRole('button', { name: 'Neuer Absender' }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: 'Absender duplizieren' }),
    ).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: 'Profil löschen' }),
    ).toHaveCount(0)
  })

  test('clicking the legend again expands the block', async ({ page }) => {
    await gotoApp(page)
    await waitForProfileCount(page, 1)

    await senderToggle(page).click()
    await expect(senderToggle(page)).toHaveAttribute('aria-expanded', 'false')

    await senderToggle(page).click()
    await expect(senderToggle(page)).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByLabel(field('Name')).first()).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Neuer Absender' }),
    ).toBeVisible()
  })

  test('collapsed state persists across reload via localStorage', async ({
    page,
  }) => {
    await gotoApp(page)
    await waitForProfileCount(page, 1)

    await senderToggle(page).click()
    await expect.poll(() => readCollapsed(page)).toBe(true)

    await page.reload()
    await page.waitForFunction(() => document.fonts.status === 'loaded')
    await waitForProfileCount(page, 1)

    // Block is collapsed from the very first paint — no flicker through expanded.
    await expect(senderToggle(page)).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByLabel(field('Name')).first()).toBeHidden()
  })

  test('expanded state is the default when no preference is stored', async ({
    page,
  }) => {
    await gotoApp(page)
    await waitForProfileCount(page, 1)

    // Stored value is either absent or the explicit default `false`,
    // but never the collapsed state.
    const stored = await readCollapsed(page)
    expect(stored).not.toBe(true)
    await expect(senderToggle(page)).toHaveAttribute('aria-expanded', 'true')
  })

  test('honors a pre-existing collapsed=true in localStorage on first load', async ({
    page,
  }) => {
    await gotoAppWithStorage(page, { [COLLAPSED_KEY]: 'true' })
    await waitForProfileCount(page, 1)

    await expect(senderToggle(page)).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByLabel(field('Name')).first()).toBeHidden()
    await expect(senderProfileCombobox(page)).toBeVisible()
  })

  test('switching profiles still works while collapsed', async ({ page }) => {
    // Seed a second profile via the storage layer so the test can switch
    // between two profiles without expanding the block first.
    await gotoApp(page)
    await waitForProfileCount(page, 1)
    await page.getByRole('button', { name: 'Neuer Absender' }).click()
    await waitForProfileCount(page, 2)
    await page.getByLabel(field('Name')).first().fill('Berta Beispiel')
    await page.getByRole('button', { name: /^Speichern$/ }).click()
    await expect(
      page.getByRole('button', { name: /^Speichern$/ }),
    ).toBeHidden()

    // Collapse and switch back to Max via the combobox.
    await senderToggle(page).click()
    await expect(senderToggle(page)).toHaveAttribute('aria-expanded', 'false')

    await senderProfileCombobox(page).click()
    await page.getByRole('option', { name: /Max Mustermann/ }).click()

    // The letter preview reflects the change while the block stays collapsed.
    await expect(
      page.locator('.letter-page__sender-block').first(),
    ).toContainText('Max Mustermann')
    await expect(senderToggle(page)).toHaveAttribute('aria-expanded', 'false')
  })

  test('dirty + collapsed: legend shows the unsaved-changes indicator, Save button is hidden until expanded', async ({
    page,
  }) => {
    await gotoApp(page)
    await waitForProfileCount(page, 1)

    // Make an edit so the profile becomes dirty.
    await page.getByLabel(field('Name')).first().fill('Hilde Hilfsbereit')
    await expect(
      page.getByRole('button', { name: /^Speichern$/ }),
    ).toBeVisible()

    // Collapse — Save button vanishes, dirty dot appears in legend.
    await senderToggle(page).click()
    await expect(
      page.getByRole('button', { name: /^Speichern$/ }),
    ).toHaveCount(0)
    await expect(page.getByTestId('sender-dirty-indicator')).toBeVisible()

    // Expand again — Save returns, dot disappears.
    await senderToggle(page).click()
    await expect(
      page.getByRole('button', { name: /^Speichern$/ }),
    ).toBeVisible()
    await expect(page.getByTestId('sender-dirty-indicator')).toHaveCount(0)
  })

  test('dirty indicator is not shown when the profile has no unsaved changes', async ({
    page,
  }) => {
    await gotoApp(page)
    await waitForProfileCount(page, 1)

    await senderToggle(page).click()
    await expect(senderToggle(page)).toHaveAttribute('aria-expanded', 'false')
    await expect(page.getByTestId('sender-dirty-indicator')).toHaveCount(0)
  })

  test('other fieldsets (Empfänger, Briefkopf) are not affected by the toggle', async ({
    page,
  }) => {
    await gotoApp(page)
    await waitForProfileCount(page, 1)

    await senderToggle(page).click()

    // Recipient and meta blocks remain interactive and visible.
    await expect(page.getByLabel(field('Betreff'))).toBeVisible()
    await expect(page.getByLabel(field('Anrede'))).toBeVisible()
    // The recipient address fields share labels with the sender, so we look
    // them up inside the Empfänger fieldset specifically.
    const recipient = page.locator('fieldset', { hasText: 'Empfänger' })
    await expect(recipient.getByLabel(field('Name'))).toBeVisible()
  })
})
