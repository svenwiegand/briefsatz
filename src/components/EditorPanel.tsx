import { useCallback } from 'react'
import {
  Collapse,
  Fieldset,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  Tooltip,
  UnstyledButton,
} from '@mantine/core'
import { useLocalStorage } from '@mantine/hooks'
import { DateInput } from '@mantine/dates'
import { IconChevronDown } from '@tabler/icons-react'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { AddressFields } from './AddressFields'
import { BodyEditor, type BodyEditorChange } from './BodyEditor'
import { SenderProfileSelector } from './SenderProfileSelector'
import { SignatureField } from './SignatureField'
import type {
  Address,
  LetterData,
  LetterMeta,
  SenderContact,
  SenderProfile,
} from '../types'

const SENDER_COLLAPSED_KEY = 'letter-app:sender-block-collapsed'
const SENDER_BODY_ID = 'sender-block-body'

dayjs.extend(customParseFormat)

const DATE_FORMAT = 'DD.MM.YYYY'

function parseGermanDate(input: string): Date | null {
  if (!input.trim()) return null
  const parsed = dayjs(input, DATE_FORMAT, true)
  return parsed.isValid() ? parsed.toDate() : null
}

interface Props {
  data: LetterData
  onChange: (data: LetterData) => void
  profiles: SenderProfile[]
  activeId: string | null
  dirty: boolean
  signatureUrl: string | null
  onSelectProfile: (id: string) => void
  onCreateEmpty: () => void
  onClone: () => void
  onSave: () => void
  onDelete: () => void
  onChangeSignature: (blob: Blob | null) => void
}

export function EditorPanel({
  data,
  onChange,
  profiles,
  activeId,
  dirty,
  signatureUrl,
  onSelectProfile,
  onCreateEmpty,
  onClone,
  onSave,
  onDelete,
  onChangeSignature,
}: Props) {
  const updateSender = (sender: Address) => onChange({ ...data, sender })
  const updateRecipient = (recipient: Address) => onChange({ ...data, recipient })
  const updateMeta = (meta: LetterMeta) => onChange({ ...data, meta })
  const updateSenderContact = (senderContact: SenderContact) =>
    onChange({ ...data, senderContact })

  const updateBody = useCallback(
    ({ blocks, html }: BodyEditorChange) => {
      onChange({ ...data, bodyBlocks: blocks, bodyHtml: html })
    },
    [data, onChange],
  )

  const setMetaField = <K extends keyof LetterMeta>(key: K, value: LetterMeta[K]) =>
    updateMeta({ ...data.meta, [key]: value })

  const setContactField = <K extends keyof SenderContact>(
    key: K,
    value: SenderContact[K],
  ) => updateSenderContact({ ...data.senderContact, [key]: value })

  const [senderCollapsed, setSenderCollapsed] = useLocalStorage<boolean>({
    key: SENDER_COLLAPSED_KEY,
    defaultValue: false,
    getInitialValueInEffect: false,
  })

  const toggleSenderCollapsed = () => setSenderCollapsed((current) => !current)

  const senderLegend = (
    <UnstyledButton
      onClick={toggleSenderCollapsed}
      aria-expanded={!senderCollapsed}
      aria-controls={SENDER_BODY_ID}
      data-testid="sender-toggle"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        font: 'inherit',
        color: 'inherit',
      }}
    >
      <IconChevronDown
        size={14}
        style={{
          transform: senderCollapsed ? 'rotate(-90deg)' : 'none',
          transition: 'transform 150ms ease',
        }}
      />
      <span>Absender</span>
      {senderCollapsed && dirty && (
        <Tooltip label="Ungespeicherte Änderungen">
          <span
            data-testid="sender-dirty-indicator"
            aria-label="Ungespeicherte Änderungen"
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: 'var(--mantine-color-orange-6)',
              marginLeft: 4,
            }}
          />
        </Tooltip>
      )}
    </UnstyledButton>
  )

  return (
    <Stack
      gap="md"
      p="lg"
      className="editor-panel"
      role="region"
      aria-label="Briefdaten"
    >
      <Fieldset legend={senderLegend}>
        <Stack gap="sm">
          <SenderProfileSelector
            profiles={profiles}
            activeId={activeId}
            dirty={dirty}
            collapsed={senderCollapsed}
            onSelect={onSelectProfile}
            onCreateEmpty={onCreateEmpty}
            onClone={onClone}
            onSave={onSave}
            onDelete={onDelete}
          />
          <Collapse expanded={!senderCollapsed} id={SENDER_BODY_ID}>
            <Stack gap="sm">
              <AddressFields value={data.sender} onChange={updateSender} />
              <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                <TextInput
                  label="Telefon"
                  type="tel"
                  autoComplete="tel"
                  value={data.senderContact.phone}
                  onChange={(e) => setContactField('phone', e.currentTarget.value)}
                />
                <TextInput
                  label="Telefax"
                  type="tel"
                  value={data.senderContact.fax}
                  onChange={(e) => setContactField('fax', e.currentTarget.value)}
                />
              </SimpleGrid>
              <TextInput
                label="E-Mail"
                type="email"
                autoComplete="email"
                value={data.senderContact.email}
                onChange={(e) => setContactField('email', e.currentTarget.value)}
              />
              <TextInput
                label="Website"
                type="url"
                autoComplete="url"
                value={data.senderContact.website}
                onChange={(e) => setContactField('website', e.currentTarget.value)}
              />
              <TextInput
                label="Unterschrift (Name)"
                value={data.signatureName}
                onChange={(e) =>
                  onChange({ ...data, signatureName: e.currentTarget.value })
                }
              />
              <SignatureField url={signatureUrl} onChange={onChangeSignature} />
            </Stack>
          </Collapse>
        </Stack>
      </Fieldset>

      <Fieldset legend="Empfänger">
        <AddressFields value={data.recipient} onChange={updateRecipient} />
      </Fieldset>

      <Fieldset legend="Briefkopf">
        <Stack gap="sm">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <DateInput
              label="Datum"
              required
              valueFormat={DATE_FORMAT}
              dateParser={parseGermanDate}
              value={data.meta.date}
              onChange={(value) => setMetaField('date', toDate(value))}
              clearable
            />
            <TextInput
              label="Unser Zeichen"
              value={data.meta.ourReference}
              onChange={(e) => setMetaField('ourReference', e.currentTarget.value)}
            />
            <TextInput
              label="Ihr Zeichen"
              value={data.meta.yourReference}
              onChange={(e) => setMetaField('yourReference', e.currentTarget.value)}
            />
            <DateInput
              label="Ihre Nachricht vom"
              valueFormat={DATE_FORMAT}
              dateParser={parseGermanDate}
              value={data.meta.yourMessage}
              onChange={(value) => setMetaField('yourMessage', toDate(value))}
              clearable
            />
          </SimpleGrid>
          <TextInput
            label="Betreff"
            required
            value={data.meta.subject}
            onChange={(e) => setMetaField('subject', e.currentTarget.value)}
          />
          <TextInput
            label="Anrede"
            required
            value={data.meta.greeting}
            onChange={(e) => setMetaField('greeting', e.currentTarget.value)}
          />
        </Stack>
      </Fieldset>

      <Fieldset legend="Brieftext">
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Sie können Text fett, kursiv, als Listen oder Überschriften
            formatieren. Längere Briefe werden automatisch auf mehrere Seiten
            verteilt.
          </Text>
          <BodyEditor
            initialBlocks={data.bodyBlocks}
            onChange={updateBody}
          />
        </Stack>
      </Fieldset>

      <Fieldset legend="Schluss">
        <Stack gap="sm">
          <TextInput
            label="Grußformel"
            required
            value={data.meta.closing}
            onChange={(e) => setMetaField('closing', e.currentTarget.value)}
          />
          {signatureUrl && (
            <Switch
              label="Unterschrift drucken"
              checked={data.meta.showSignatureImage}
              onChange={(e) =>
                setMetaField('showSignatureImage', e.currentTarget.checked)
              }
            />
          )}
        </Stack>
      </Fieldset>
    </Stack>
  )
}

function toDate(value: string | Date | null): Date | null {
  if (!value) return null
  if (value instanceof Date) return value
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}
