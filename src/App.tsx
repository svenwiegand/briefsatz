import { useCallback, useRef, useState } from 'react'
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
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export default function App() {
  const [data, setData] = useState<LetterData>(initialData)
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
