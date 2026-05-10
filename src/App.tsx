import { useCallback, useRef } from 'react'
import { AppShell, Button, Group, Stack, Text, Title } from '@mantine/core'
import { useLocalStorage } from '@mantine/hooks'
import { EditorPanel } from './components/EditorPanel'
import { PreviewPanel } from './components/PreviewPanel'
import { Splitter } from './components/Splitter'
import type { LetterData } from './types'
import './App.css'
import './styles/letter.css'

const EDITOR_PERCENT_MIN = 25
const EDITOR_PERCENT_MAX = 70
const EDITOR_PERCENT_DEFAULT = 42

const DATA_STORAGE_KEY = 'letter-app:data'

const initialData: LetterData = {
  sender: {
    name: 'Max Mustermann',
    organization: '',
    addressLine: '',
    street: 'Musterstraße 1',
    zipCity: '12345 Musterstadt',
    country: '',
  },
  senderContact: {
    email: 'max@example.com',
    phone: '+49 30 1234567',
    website: '',
  },
  recipient: {
    name: 'Erika Beispiel',
    organization: 'Beispiel GmbH',
    addressLine: '',
    street: 'Beispielallee 42',
    zipCity: '54321 Beispielstadt',
    country: '',
  },
  meta: {
    date: new Date(),
    yourReference: '',
    yourMessage: null,
    ourReference: '',
    subject: 'Ihr Anliegen',
    greeting: 'Sehr geehrte Damen und Herren,',
    closing: 'Mit freundlichen Grüßen',
    signature: 'Max Mustermann',
  },
  bodyHtml: '',
  bodyBlocks: [],
}

function toIsoOrNull(value: Date | null): string | null {
  return value instanceof Date && !Number.isNaN(value.getTime())
    ? value.toISOString()
    : null
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function serializeData(data: LetterData): string {
  return JSON.stringify({
    ...data,
    meta: {
      ...data.meta,
      date: toIsoOrNull(data.meta.date),
      yourMessage: toIsoOrNull(data.meta.yourMessage),
    },
  })
}

function deserializeData(value: string | undefined): LetterData {
  if (!value) return initialData
  try {
    const parsed = JSON.parse(value) as Partial<LetterData> & {
      meta?: Partial<LetterData['meta']>
    }
    if (!parsed || typeof parsed !== 'object') return initialData
    return {
      ...initialData,
      ...parsed,
      sender: { ...initialData.sender, ...(parsed.sender ?? {}) },
      senderContact: {
        ...initialData.senderContact,
        ...(parsed.senderContact ?? {}),
      },
      recipient: { ...initialData.recipient, ...(parsed.recipient ?? {}) },
      meta: {
        ...initialData.meta,
        ...(parsed.meta ?? {}),
        date: parseDate(parsed.meta?.date),
        yourMessage: parseDate(parsed.meta?.yourMessage),
      },
      bodyHtml:
        typeof parsed.bodyHtml === 'string' ? parsed.bodyHtml : '',
      bodyBlocks: Array.isArray(parsed.bodyBlocks) ? parsed.bodyBlocks : [],
    }
  } catch {
    return initialData
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export default function App() {
  const [data, setData] = useLocalStorage<LetterData>({
    key: DATA_STORAGE_KEY,
    defaultValue: initialData,
    serialize: serializeData,
    deserialize: deserializeData,
    getInitialValueInEffect: false,
  })
  const [editorPercent, setEditorPercent] = useLocalStorage<number>({
    key: 'letter-app:editor-percent',
    defaultValue: EDITOR_PERCENT_DEFAULT,
    getInitialValueInEffect: false,
  })
  const mainRef = useRef<HTMLDivElement>(null)

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const handleSplitterDrag = useCallback(
    (clientX: number) => {
      const el = mainRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      if (rect.width <= 0) return
      const pct = ((clientX - rect.left) / rect.width) * 100
      setEditorPercent(clamp(pct, EDITOR_PERCENT_MIN, EDITOR_PERCENT_MAX))
    },
    [setEditorPercent],
  )

  const handleKeyboardAdjust = useCallback(
    (deltaPx: number) => {
      const el = mainRef.current
      if (!el) return
      const width = el.getBoundingClientRect().width
      if (width <= 0) return
      const deltaPct = (deltaPx / width) * 100
      setEditorPercent((current) =>
        clamp(
          (current ?? EDITOR_PERCENT_DEFAULT) + deltaPct,
          EDITOR_PERCENT_MIN,
          EDITOR_PERCENT_MAX,
        ),
      )
    },
    [setEditorPercent],
  )

  const editorPct = editorPercent ?? EDITOR_PERCENT_DEFAULT

  return (
    <AppShell header={{ height: 64 }} padding={0} className="app">
      <AppShell.Header>
        <Group h="100%" px="lg" justify="space-between" wrap="nowrap">
          <Stack gap={0}>
            <Title order={1} size="h4">
              Brief nach DIN 5008
            </Title>
            <Text size="xs" c="dimmed">
              Form B – Absender rechts
            </Text>
          </Stack>
          <Button
            onClick={handlePrint}
            aria-label="Brief drucken oder als PDF speichern"
          >
            Drucken / als PDF speichern
          </Button>
        </Group>
      </AppShell.Header>
      <AppShell.Main
        className="app__main"
        ref={mainRef}
        style={{ ['--editor-width' as string]: `${editorPct}%` }}
      >
        <EditorPanel data={data} onChange={setData} />
        <Splitter
          onDrag={handleSplitterDrag}
          onKeyboardAdjust={handleKeyboardAdjust}
          ariaValueNow={Math.round(editorPct)}
          ariaValueMin={EDITOR_PERCENT_MIN}
          ariaValueMax={EDITOR_PERCENT_MAX}
        />
        <PreviewPanel data={data} />
      </AppShell.Main>
    </AppShell>
  )
}
