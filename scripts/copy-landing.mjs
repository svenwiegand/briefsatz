#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')
const src = resolve(root, 'landing')
const dst = resolve(root, 'dist')

if (!existsSync(src)) {
  console.error(`landing/ not found at ${src}`)
  process.exit(1)
}

if (!existsSync(dst)) mkdirSync(dst, { recursive: true })

cpSync(src, dst, { recursive: true, dereference: true })
console.log(`Landing copied: ${src} -> ${dst}`)
