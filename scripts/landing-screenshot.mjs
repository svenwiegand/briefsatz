#!/usr/bin/env node
import { chromium } from '@playwright/test'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const outDir = resolve(root, 'landing')

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: 'light',
})
const page = await context.newPage()
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await page.screenshot({
  path: resolve(outDir, 'app-screenshot-light.png'),
  fullPage: false,
})

await page.emulateMedia({ colorScheme: 'dark' })
await page.waitForTimeout(300)
await page.screenshot({
  path: resolve(outDir, 'app-screenshot-dark.png'),
  fullPage: false,
})

await browser.close()
console.log('Screenshots written to', outDir)
