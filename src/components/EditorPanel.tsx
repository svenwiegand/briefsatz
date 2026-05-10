import { useCallback } from 'react'
import { Fieldset, SimpleGrid, Stack, Text, TextInput } from '@mantine/core'
import { DateInput } from '@mantine/dates'
import dayjs from 'dayjs'
import customParseFormat from 'dayjs/plugin/customParseFormat'
import { AddressFields } from './AddressFields'
import { BodyEditor } from './BodyEditor'
import type { Address, LetterData, LetterMeta, SenderContact } from '../types'

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
}

export function EditorPanel({ data, onChange }: Props) {
  const updateSender = (sender: Address) => onChange({ ...data, sender })
  const updateRecipient = (recipient: Address) => onChange({ ...data, recipient })
  const updateMeta = (meta: LetterMeta) => onChange({ ...data, meta })
  const updateSenderContact = (senderContact: SenderContact) =>
    onChange({ ...data, senderContact })

  const updateBodyHtml = useCallback(
    (bodyHtml: string) => {
      onChange({ ...data, bodyHtml })
    },
    [data, onChange],
  )

  const setMetaField = <K extends keyof LetterMeta>(key: K, value: LetterMeta[K]) =>
    updateMeta({ ...data.meta, [key]: value })

  const setContactField = <K extends keyof SenderContact>(
    key: K,
    value: SenderContact[K],
  ) => updateSenderContact({ ...data.senderContact, [key]: value })

  return (
    <Stack
      gap="md"
      p="lg"
      className="editor-panel"
      role="region"
      aria-label="Briefdaten"
    >
      <Fieldset legend="Absender">
        <Stack gap="sm">
          <AddressFields value={data.sender} onChange={updateSender} />
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <TextInput
              label="E-Mail"
              type="email"
              autoComplete="email"
              value={data.senderContact.email}
              onChange={(e) => setContactField('email', e.currentTarget.value)}
            />
            <TextInput
              label="Telefon"
              type="tel"
              autoComplete="tel"
              value={data.senderContact.phone}
              onChange={(e) => setContactField('phone', e.currentTarget.value)}
            />
          </SimpleGrid>
          <TextInput
            label="Website"
            type="url"
            autoComplete="url"
            value={data.senderContact.website}
            onChange={(e) => setContactField('website', e.currentTarget.value)}
          />
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
          <BodyEditor onChange={updateBodyHtml} />
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
          <TextInput
            label="Unterschrift (Name)"
            required
            value={data.meta.signature}
            onChange={(e) => setMetaField('signature', e.currentTarget.value)}
          />
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
