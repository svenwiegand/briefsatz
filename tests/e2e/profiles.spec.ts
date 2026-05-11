import { expect, test, type Page } from '@playwright/test'
import { field, gotoApp } from './helpers'

/** 1×1 transparent PNG used as a stand-in signature image. */
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
)

/**
 * Wait until the bootstrap effect has materialised exactly `count` profiles in
 * localStorage. Returns the parsed profile list.
 */
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

async function readProfiles(page: Page) {
  const raw = await page.evaluate(() =>
    window.localStorage.getItem('letter-app:sender-profiles'),
  )
  expect(raw).not.toBeNull()
  return JSON.parse(raw!) as Array<{
    id: string
    sender: { name: string; organization: string; street: string }
    contact: { email: string }
    signatureName: string
    hasSignatureImage: boolean
  }>
}

async function activeProfileId(page: Page): Promise<string | null> {
  const raw = await page.evaluate(() =>
    window.localStorage.getItem('letter-app:active-sender-profile-id'),
  )
  return raw ? (JSON.parse(raw) as string) : null
}

test.describe('Sender profiles', () => {
  test('bootstrap: a single profile is created from the seed letter data on first load', async ({
    page,
  }) => {
    await gotoApp(page)
    await waitForProfileCount(page, 1)

    const profiles = await readProfiles(page)
    expect(profiles).toHaveLength(1)
    expect(profiles[0].sender.name).toBe('Max Mustermann')
    expect(profiles[0].sender.street).toBe('Musterstraße 1')
    expect(profiles[0].contact.email).toBe('max@example.com')
    expect(profiles[0].signatureName).toBe('Max Mustermann')
    expect(profiles[0].hasSignatureImage).toBe(false)

    expect(await activeProfileId(page)).toBe(profiles[0].id)
  })

  test('editing fields shows the save button; clicking save persists into the active profile', async ({
    page,
  }) => {
    await gotoApp(page)
    await waitForProfileCount(page, 1)

    await page.getByLabel(field('Name')).first().fill('Hilde Hilfsbereit')

    const saveButton = page.getByRole('button', { name: /^Speichern$/ })
    await expect(saveButton).toBeVisible()
    await saveButton.click()
    await expect(saveButton).toBeHidden()

    const profiles = await readProfiles(page)
    expect(profiles).toHaveLength(1)
    expect(profiles[0].sender.name).toBe('Hilde Hilfsbereit')
  })

  test('+ button with no unsaved changes creates an empty profile and clears the fields', async ({
    page,
  }) => {
    await gotoApp(page)
    await waitForProfileCount(page, 1)

    await page.getByRole('button', { name: 'Neuer Absender' }).click()

    await waitForProfileCount(page, 2)
    await expect(page.getByLabel(field('Name')).first()).toHaveValue('')
    await expect(
      page.getByLabel(field('Straße & Hausnummer')).first(),
    ).toHaveValue('')

    // The new empty profile is active and the save button is hidden (clean).
    await expect(
      page.getByRole('button', { name: /^Speichern$/ }),
    ).toBeHidden()
  })

  test('+ button with unsaved changes opens a discard dialog; canceling keeps the edits', async ({
    page,
  }) => {
    await gotoApp(page)
    await waitForProfileCount(page, 1)

    await page.getByLabel(field('Name')).first().fill('Vorgenommene Änderung')

    await page.getByRole('button', { name: 'Neuer Absender' }).click()

    const dialog = page.getByRole('dialog', { name: 'Ungespeicherte Änderungen' })
    await expect(dialog).toBeVisible()

    await dialog.getByRole('button', { name: 'Abbrechen' }).click()
    await expect(dialog).toBeHidden()

    // Still on the original profile, fields still hold the unsaved edit.
    const profiles = await readProfiles(page)
    expect(profiles).toHaveLength(1)
    await expect(page.getByLabel(field('Name')).first()).toHaveValue(
      'Vorgenommene Änderung',
    )

    // Confirming the same action discards and creates the empty profile.
    await page.getByRole('button', { name: 'Neuer Absender' }).click()
    await dialog.getByRole('button', { name: 'Verwerfen' }).click()
    await waitForProfileCount(page, 2)
    await expect(page.getByLabel(field('Name')).first()).toHaveValue('')
  })

  test('clone duplicates the current values into a new profile and appends "(Kopie)"', async ({
    page,
  }) => {
    await gotoApp(page)
    await waitForProfileCount(page, 1)

    // Edit a field but don't save — clone should not show a discard dialog
    // and should take the edited values into the copy.
    await page.getByLabel(field('Name')).first().fill('Clemens Cloned')

    await page.getByRole('button', { name: 'Absender duplizieren' }).click()
    await waitForProfileCount(page, 2)

    // No discard dialog should have appeared.
    await expect(
      page.getByRole('dialog', { name: 'Ungespeicherte Änderungen' }),
    ).toHaveCount(0)

    const profiles = await readProfiles(page)
    const clone = profiles.find((p) => p.sender.name.endsWith('(Kopie)'))
    expect(clone).toBeDefined()
    expect(clone!.sender.name).toBe('Clemens Cloned (Kopie)')

    // Active profile is the clone; letter shows the new name and no dirty state.
    expect(await activeProfileId(page)).toBe(clone!.id)
    await expect(page.getByLabel(field('Name')).first()).toHaveValue(
      'Clemens Cloned (Kopie)',
    )
    await expect(
      page.getByRole('button', { name: /^Speichern$/ }),
    ).toBeHidden()
  })

  test('switching profiles loads the selected profile’s values into the editor and preview', async ({
    page,
  }) => {
    await gotoApp(page)
    await waitForProfileCount(page, 1)

    // Bootstrap profile = "Max Mustermann". Create a second empty one and
    // give it different values.
    await page.getByRole('button', { name: 'Neuer Absender' }).click()
    await waitForProfileCount(page, 2)
    await page.getByLabel(field('Name')).first().fill('Berta Beispiel')
    await page.getByLabel(field('Straße & Hausnummer')).first().fill('Bergweg 7')
    await page.getByLabel(field('PLZ & Ort')).first().fill('20000 Bergstadt')
    await page.getByRole('button', { name: /^Speichern$/ }).click()
    await expect(page.getByRole('button', { name: /^Speichern$/ })).toBeHidden()

    // Switch to Max via the combobox.
    await page.getByRole('button', { name: /Absender-Profil/ }).click()
    await page.getByRole('option', { name: /Max Mustermann/ }).click()

    await expect(page.getByLabel(field('Name')).first()).toHaveValue(
      'Max Mustermann',
    )
    await expect(
      page.locator('.letter-page__sender-block').first(),
    ).toContainText('Max Mustermann')

    // And back to Berta.
    await page.getByRole('button', { name: /Absender-Profil/ }).click()
    await page.getByRole('option', { name: /Berta Beispiel/ }).click()
    await expect(page.getByLabel(field('Name')).first()).toHaveValue(
      'Berta Beispiel',
    )
    await expect(
      page.locator('.letter-page__sender-block').first(),
    ).toContainText('Bergweg 7')
  })

  test('deleting a profile when others exist confirms, then activates a remaining profile', async ({
    page,
  }) => {
    await gotoApp(page)
    await waitForProfileCount(page, 1)

    // Add a second profile so deletion has somewhere to fall back to.
    await page.getByRole('button', { name: 'Neuer Absender' }).click()
    await waitForProfileCount(page, 2)
    await page.getByLabel(field('Name')).first().fill('Notfall Profil')
    await page.getByRole('button', { name: /^Speichern$/ }).click()
    await expect(page.getByRole('button', { name: /^Speichern$/ })).toBeHidden()

    const before = await readProfiles(page)
    const toKeep = before.find((p) => p.sender.name === 'Max Mustermann')!

    // Delete the currently active "Notfall Profil".
    await page.getByRole('button', { name: 'Profil löschen' }).click()
    const dialog = page.getByRole('dialog', { name: 'Profil löschen?' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('button', { name: 'Löschen' }).click()

    await waitForProfileCount(page, 1)
    const after = await readProfiles(page)
    expect(after).toHaveLength(1)
    expect(after[0].id).toBe(toKeep.id)
    expect(await activeProfileId(page)).toBe(toKeep.id)
    await expect(page.getByLabel(field('Name')).first()).toHaveValue(
      'Max Mustermann',
    )
  })

  test('deleting the last profile leaves an empty profile and clears the fields', async ({
    page,
  }) => {
    await gotoApp(page)
    await waitForProfileCount(page, 1)

    await page.getByRole('button', { name: 'Profil löschen' }).click()
    await page
      .getByRole('dialog', { name: 'Profil löschen?' })
      .getByRole('button', { name: 'Löschen' })
      .click()

    // List remains at exactly 1 entry, but it's a fresh empty profile.
    await waitForProfileCount(page, 1)
    const profiles = await readProfiles(page)
    expect(profiles[0].sender.name).toBe('')
    expect(profiles[0].sender.street).toBe('')
    expect(profiles[0].contact.email).toBe('')
    expect(await activeProfileId(page)).toBe(profiles[0].id)

    await expect(page.getByLabel(field('Name')).first()).toHaveValue('')
    await expect(
      page.getByLabel(field('Straße & Hausnummer')).first(),
    ).toHaveValue('')
  })

  test('signature upload renders in the letter and survives a reload (IndexedDB)', async ({
    page,
  }) => {
    await gotoApp(page)
    await waitForProfileCount(page, 1)

    await page.locator('input[type="file"]').setInputFiles({
      name: 'signature.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    })

    // Preview thumbnail appears in the editor, full image in the letter.
    await expect(page.getByAltText('Unterschrift')).toBeVisible()
    const letterSignature = page.locator('.letter-page__signature-image')
    await expect(letterSignature).toBeVisible()

    await page.getByRole('button', { name: /^Speichern$/ }).click()
    await expect(page.getByRole('button', { name: /^Speichern$/ })).toBeHidden()

    // Profile flag flips to indicate a stored signature image.
    const profiles = await readProfiles(page)
    expect(profiles[0].hasSignatureImage).toBe(true)

    await page.reload()
    await page.waitForFunction(() => document.fonts.status === 'loaded')
    await waitForProfileCount(page, 1)

    // After reload the signature is reloaded from IndexedDB and rendered.
    await expect(page.locator('.letter-page__signature-image')).toBeVisible({
      timeout: 5000,
    })
    const src = await page
      .locator('.letter-page__signature-image')
      .getAttribute('src')
    expect(src).toMatch(/^blob:/)
  })

  test('removing the signature and saving clears the image from the letter', async ({
    page,
  }) => {
    await gotoApp(page)
    await waitForProfileCount(page, 1)

    // Upload, save.
    await page.locator('input[type="file"]').setInputFiles({
      name: 'signature.png',
      mimeType: 'image/png',
      buffer: TINY_PNG,
    })
    await expect(page.locator('.letter-page__signature-image')).toBeVisible()
    await page.getByRole('button', { name: /^Speichern$/ }).click()
    await expect(page.getByRole('button', { name: /^Speichern$/ })).toBeHidden()

    // Remove the signature; save button reappears (dirty).
    await page.getByRole('button', { name: 'Unterschrift entfernen' }).click()
    await expect(page.locator('.letter-page__signature-image')).toBeHidden()
    // The FileInput button (label "Unterschrift") returns once the image is
    // removed. Use exact: true to avoid matching "Unterschrift (Name)".
    await expect(
      page.getByLabel('Unterschrift', { exact: true }),
    ).toBeVisible()

    await page.getByRole('button', { name: /^Speichern$/ }).click()
    await expect(page.getByRole('button', { name: /^Speichern$/ })).toBeHidden()

    const profiles = await readProfiles(page)
    expect(profiles[0].hasSignatureImage).toBe(false)

    await page.reload()
    await page.waitForFunction(() => document.fonts.status === 'loaded')
    await waitForProfileCount(page, 1)
    await expect(page.locator('.letter-page__signature-image')).toHaveCount(0)
  })
})
