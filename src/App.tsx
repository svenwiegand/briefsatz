import { useCallback, useState } from 'react'
import { AppShell, Button, Group, Stack, Text, Title } from '@mantine/core'
import { EditorPanel } from './components/EditorPanel'
import { PreviewPanel } from './components/PreviewPanel'
import type { LetterData } from './types'
import './App.css'
import './styles/letter.css'

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

export default function App() {
  const [data, setData] = useState<LetterData>(initialData)

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

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
      <AppShell.Main className="app__main">
        <EditorPanel data={data} onChange={setData} />
        <PreviewPanel data={data} />
      </AppShell.Main>
    </AppShell>
  )
}
