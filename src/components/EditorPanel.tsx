import { useCallback } from 'react'
import { AddressFields } from './AddressFields'
import { BodyEditor } from './BodyEditor'
import type { Address, LetterData, LetterMeta, SenderContact } from '../types'

interface Props {
  data: LetterData
  onChange: (data: LetterData) => void
}

export function EditorPanel({ data, onChange }: Props) {
  const updateSender = (sender: Address) => onChange({ ...data, sender })
  const updateSenderContact = (senderContact: SenderContact) =>
    onChange({ ...data, senderContact })
  const updateRecipient = (recipient: Address) => onChange({ ...data, recipient })
  const updateMeta = (meta: LetterMeta) => onChange({ ...data, meta })

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
    <section className="editor-panel" aria-label="Briefdaten">
      <fieldset className="form-group">
        <legend>Absender</legend>
        <AddressFields value={data.sender} onChange={updateSender} />
        <div className="form-grid" style={{ marginTop: 'var(--space-3)' }}>
          <label className="form-field" htmlFor="sender-email">
            E-Mail
            <input
              id="sender-email"
              type="email"
              autoComplete="email"
              value={data.senderContact.email}
              onChange={(e) => setContactField('email', e.target.value)}
            />
          </label>
          <label className="form-field" htmlFor="sender-phone">
            Telefon
            <input
              id="sender-phone"
              type="tel"
              autoComplete="tel"
              value={data.senderContact.phone}
              onChange={(e) => setContactField('phone', e.target.value)}
            />
          </label>
          <label className="form-field form-field--full" htmlFor="sender-website">
            Website (optional)
            <input
              id="sender-website"
              type="url"
              autoComplete="url"
              value={data.senderContact.website}
              onChange={(e) => setContactField('website', e.target.value)}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="form-group">
        <legend>Empfänger</legend>
        <AddressFields value={data.recipient} onChange={updateRecipient} />
      </fieldset>

      <fieldset className="form-group">
        <legend>Briefkopf</legend>
        <div className="form-grid">
          <label className="form-field" htmlFor="meta-date">
            Datum
            <input
              id="meta-date"
              type="text"
              value={data.meta.date}
              onChange={(e) => setMetaField('date', e.target.value)}
            />
          </label>
          <label className="form-field" htmlFor="meta-our-reference">
            Unser Zeichen (optional)
            <input
              id="meta-our-reference"
              type="text"
              value={data.meta.ourReference}
              onChange={(e) => setMetaField('ourReference', e.target.value)}
            />
          </label>
          <label className="form-field" htmlFor="meta-your-reference">
            Ihr Zeichen (optional)
            <input
              id="meta-your-reference"
              type="text"
              value={data.meta.yourReference}
              onChange={(e) => setMetaField('yourReference', e.target.value)}
            />
          </label>
          <label className="form-field" htmlFor="meta-your-message">
            Ihre Nachricht vom (optional)
            <input
              id="meta-your-message"
              type="text"
              value={data.meta.yourMessage}
              onChange={(e) => setMetaField('yourMessage', e.target.value)}
            />
          </label>
          <label className="form-field form-field--full" htmlFor="meta-subject">
            Betreff
            <input
              id="meta-subject"
              type="text"
              value={data.meta.subject}
              onChange={(e) => setMetaField('subject', e.target.value)}
            />
          </label>
          <label className="form-field form-field--full" htmlFor="meta-greeting">
            Anrede
            <input
              id="meta-greeting"
              type="text"
              value={data.meta.greeting}
              onChange={(e) => setMetaField('greeting', e.target.value)}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="form-group form-group--editor">
        <legend>Brieftext</legend>
        <p className="form-help">
          Sie können Text fett, kursiv, als Listen oder Überschriften formatieren.
          Längere Briefe werden automatisch auf mehrere Seiten verteilt.
        </p>
        <div style={{ marginTop: 'var(--space-3)' }}>
          <BodyEditor onChange={updateBodyHtml} />
        </div>
      </fieldset>

      <fieldset className="form-group">
        <legend>Schluss</legend>
        <div className="form-grid form-grid--single">
          <label className="form-field" htmlFor="meta-closing">
            Grußformel
            <input
              id="meta-closing"
              type="text"
              value={data.meta.closing}
              onChange={(e) => setMetaField('closing', e.target.value)}
            />
          </label>
          <label className="form-field" htmlFor="meta-signature">
            Unterschrift (Name)
            <input
              id="meta-signature"
              type="text"
              value={data.meta.signature}
              onChange={(e) => setMetaField('signature', e.target.value)}
            />
          </label>
        </div>
      </fieldset>
    </section>
  )
}
