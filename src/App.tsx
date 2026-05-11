import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppShell, Button, Group, Text, Title } from '@mantine/core'
import { useLocalStorage } from '@mantine/hooks'
import { EditorPanel } from './components/EditorPanel'
import { PreviewPanel } from './components/PreviewPanel'
import { Splitter } from './components/Splitter'
import { useObjectUrl } from './hooks/useObjectUrl'
import { useSenderProfiles } from './hooks/useSenderProfiles'
import { loadSignatureBlob } from './storage/signatures'
import type { Address, LetterData, SenderContact } from './types'
import './App.css'
import './styles/letter.css'

const EDITOR_PERCENT_MIN = 25
const EDITOR_PERCENT_MAX = 70
const EDITOR_PERCENT_DEFAULT = 42

const DATA_STORAGE_KEY = 'letter-app:data'

const EMPTY_ADDRESS: Address = {
  name: '',
  organization: '',
  addressLine: '',
  street: '',
  zipCity: '',
  country: '',
}

const EMPTY_CONTACT: SenderContact = {
  email: '',
  phone: '',
  fax: '',
  website: '',
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
    fax: '',
    website: '',
  },
  signatureName: 'Max Mustermann',
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
    showSignatureImage: true,
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
      signatureName:
        typeof parsed.signatureName === 'string' ? parsed.signatureName : '',
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

const addressKeys: (keyof Address)[] = [
  'name',
  'organization',
  'addressLine',
  'street',
  'zipCity',
  'country',
]
const contactKeys: (keyof SenderContact)[] = ['email', 'phone', 'fax', 'website']

function addressEqual(a: Address, b: Address): boolean {
  return addressKeys.every((k) => a[k] === b[k])
}

function contactEqual(a: SenderContact, b: SenderContact): boolean {
  return contactKeys.every((k) => a[k] === b[k])
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

  const profiles = useSenderProfiles()
  const [signatureBlob, setSignatureBlob] = useState<Blob | null>(null)
  const [signatureDirty, setSignatureDirty] = useState(false)
  const signatureUrl = useObjectUrl(signatureBlob)

  const dirty = useMemo(() => {
    if (!profiles.activeProfile) return false
    if (signatureDirty) return true
    return (
      !addressEqual(data.sender, profiles.activeProfile.sender) ||
      !contactEqual(data.senderContact, profiles.activeProfile.contact) ||
      data.signatureName !== profiles.activeProfile.signatureName
    )
  }, [
    profiles.activeProfile,
    data.sender,
    data.senderContact,
    data.signatureName,
    signatureDirty,
  ])

  const handleSelectProfile = useCallback(
    async (id: string) => {
      const snapshot = await profiles.selectProfile(id)
      if (!snapshot) return
      setData((prev) => ({
        ...prev,
        sender: snapshot.sender,
        senderContact: snapshot.contact,
        signatureName: snapshot.signatureName,
      }))
      setSignatureBlob(snapshot.signatureBlob)
      setSignatureDirty(false)
    },
    [profiles, setData],
  )

  const handleCreateEmpty = useCallback(() => {
    profiles.createEmpty()
    setData((prev) => ({
      ...prev,
      sender: { ...EMPTY_ADDRESS },
      senderContact: { ...EMPTY_CONTACT },
      signatureName: '',
    }))
    setSignatureBlob(null)
    setSignatureDirty(false)
  }, [profiles, setData])

  const handleClone = useCallback(async () => {
    const cloned = await profiles.addFromSnapshot(
      {
        sender: data.sender,
        contact: data.senderContact,
        signatureName: data.signatureName,
        signatureBlob,
      },
      { withCopySuffix: true },
    )
    setData((prev) => ({
      ...prev,
      sender: cloned.sender,
      senderContact: cloned.contact,
      signatureName: cloned.signatureName,
    }))
    setSignatureDirty(false)
  }, [
    profiles,
    data.sender,
    data.senderContact,
    data.signatureName,
    signatureBlob,
    setData,
  ])

  const handleSave = useCallback(async () => {
    await profiles.saveActive({
      sender: data.sender,
      contact: data.senderContact,
      signatureName: data.signatureName,
      signatureBlob,
      signatureDirty,
    })
    setSignatureDirty(false)
  }, [
    profiles,
    data.sender,
    data.senderContact,
    data.signatureName,
    signatureBlob,
    signatureDirty,
  ])

  const handleDelete = useCallback(async () => {
    const next = await profiles.deleteActive()
    if (next) {
      setData((prev) => ({
        ...prev,
        sender: next.sender,
        senderContact: next.contact,
        signatureName: next.signatureName,
      }))
      setSignatureBlob(next.signatureBlob)
    } else {
      profiles.createEmpty()
      setData((prev) => ({
        ...prev,
        sender: { ...EMPTY_ADDRESS },
        senderContact: { ...EMPTY_CONTACT },
        signatureName: '',
      }))
      setSignatureBlob(null)
    }
    setSignatureDirty(false)
  }, [profiles, setData])

  const handleChangeSignature = useCallback((blob: Blob | null) => {
    setSignatureBlob(blob)
    setSignatureDirty(true)
  }, [])

  const bootstrapped = useRef(false)
  useEffect(() => {
    if (bootstrapped.current) return
    bootstrapped.current = true
    if (profiles.profiles.length > 0) return
    void profiles.addFromSnapshot({
      sender: data.sender,
      contact: data.senderContact,
      signatureName: data.signatureName,
      signatureBlob,
    })
    // Intentionally empty deps — this is a one-shot bootstrap on first mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Hydrate the signature blob from IndexedDB when the active profile claims
  // one but our in-memory state is empty (e.g. right after a reload). The
  // `signatureDirty` guard makes sure we don't stomp on pending user edits
  // (uploaded but not yet saved) when the profile state ticks afterwards.
  const activeProfileId = profiles.activeProfile?.id
  const activeHasSignature = profiles.activeProfile?.hasSignatureImage ?? false
  useEffect(() => {
    if (signatureDirty) return
    if (!activeProfileId || !activeHasSignature) return
    if (signatureBlob !== null) return
    let cancelled = false
    loadSignatureBlob(activeProfileId).then((blob) => {
      if (!cancelled && blob) setSignatureBlob(blob)
    })
    return () => {
      cancelled = true
    }
  }, [activeProfileId, activeHasSignature, signatureBlob, signatureDirty])

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
          <Title
            order={1}
            fz={24}
            fw={700}
            lh={1}
            ff='"Atkinson Hyperlegible", system-ui, sans-serif'
            style={{ letterSpacing: '-0.01em' }}
          >
            briefsatz
            <Text component="span" inherit fw={400} c="dimmed">
              .de
            </Text>
          </Title>
          <Button
            onClick={handlePrint}
            aria-label="Brief drucken oder als PDF speichern"
          >
            Drucken
          </Button>
        </Group>
      </AppShell.Header>
      <AppShell.Main
        className="app__main"
        ref={mainRef}
        style={{ ['--editor-width' as string]: `${editorPct}%` }}
      >
        <EditorPanel
          data={data}
          onChange={setData}
          profiles={profiles.profiles}
          activeId={profiles.activeId}
          dirty={dirty}
          signatureUrl={signatureUrl}
          onSelectProfile={handleSelectProfile}
          onCreateEmpty={handleCreateEmpty}
          onClone={handleClone}
          onSave={handleSave}
          onDelete={handleDelete}
          onChangeSignature={handleChangeSignature}
        />
        <Splitter
          onDrag={handleSplitterDrag}
          onKeyboardAdjust={handleKeyboardAdjust}
          ariaValueNow={Math.round(editorPct)}
          ariaValueMin={EDITOR_PERCENT_MIN}
          ariaValueMax={EDITOR_PERCENT_MAX}
        />
        <PreviewPanel
          data={data}
          signatureUrl={data.meta.showSignatureImage ? signatureUrl : null}
        />
      </AppShell.Main>
    </AppShell>
  )
}
