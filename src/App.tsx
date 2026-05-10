import { useCallback, useState } from 'react'
import { EditorPanel } from './components/EditorPanel'
import { PreviewPanel } from './components/PreviewPanel'
import type { LetterData } from './types'
import './App.css'
import './styles/letter.css'

function todayDate(): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date())
}

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
    date: todayDate(),
    yourReference: '',
    yourMessage: '',
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
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">
          Brief nach DIN 5008
          <small>Form B – Absender rechts</small>
        </h1>
        <button
          type="button"
          className="btn btn--primary"
          onClick={handlePrint}
          aria-label="Brief drucken oder als PDF speichern"
        >
          Drucken / als PDF speichern
        </button>
      </header>
      <main className="app__main">
        <EditorPanel data={data} onChange={setData} />
        <PreviewPanel data={data} />
      </main>
    </div>
  )
}
