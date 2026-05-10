import { Fragment } from 'react'
import type { LetterData } from '../types'

interface Props {
  data: LetterData
  pageIndex: number
  totalPages: number
  bodyHtml: string
  showClosing: boolean
}

export function LetterPage({ data, pageIndex, totalPages, bodyHtml, showClosing }: Props) {
  const isFirst = pageIndex === 0
  const showFooter = totalPages > 1

  return (
    <article
      className={`letter-page ${isFirst ? 'letter-page--first' : 'letter-page--continuation'}`}
      aria-label={`Seite ${pageIndex + 1} von ${totalPages}`}
    >
      <div className="letter-page__marks" aria-hidden="true">
        <span />
      </div>

      {isFirst ? (
        <>
          <SenderBlock data={data} />
          <AddressField data={data} />
          <InfoBlock data={data} />
        </>
      ) : (
        <ContinuationHeader data={data} pageIndex={pageIndex} totalPages={totalPages} />
      )}

      <div className="letter-page__body">
        {isFirst && (
          <>
            {data.meta.subject.trim() && (
              <p className="letter-page__subject">{data.meta.subject}</p>
            )}
            {data.meta.greeting.trim() && (
              <p className="letter-page__greeting">{data.meta.greeting}</p>
            )}
          </>
        )}
        <div
          className="letter-page__body-content"
          dangerouslySetInnerHTML={{ __html: bodyHtml || '<p></p>' }}
        />
        {showClosing && (
          <>
            {data.meta.closing.trim() && (
              <p className="letter-page__closing">{data.meta.closing}</p>
            )}
            <div className="letter-page__signature-space" aria-hidden="true" />
            {data.meta.signature.trim() && (
              <p className="letter-page__signature-name">{data.meta.signature}</p>
            )}
          </>
        )}
      </div>

      {showFooter && (
        <div className="letter-page__footer">
          Seite {pageIndex + 1} / {totalPages}
        </div>
      )}
    </article>
  )
}

function SenderBlock({ data }: { data: LetterData }) {
  const { sender, senderContact } = data
  return (
    <address className="letter-page__sender-block">
      {sender.organization && (
        <span className="letter-page__sender-name letter-page__sender-line">
          {sender.organization}
        </span>
      )}
      <span
        className={`letter-page__sender-line ${
          sender.organization ? '' : 'letter-page__sender-name'
        }`}
      >
        {sender.name}
      </span>
      {sender.addressLine && (
        <span className="letter-page__sender-line">{sender.addressLine}</span>
      )}
      {sender.street && <span className="letter-page__sender-line">{sender.street}</span>}
      {sender.zipCity && <span className="letter-page__sender-line">{sender.zipCity}</span>}
      {sender.country && <span className="letter-page__sender-line">{sender.country}</span>}
      {(senderContact.phone || senderContact.email || senderContact.website) && (
        <span className="letter-page__sender-contact">
          {senderContact.phone && <span>Tel.: {senderContact.phone}</span>}
          {senderContact.email && <span>{senderContact.email}</span>}
          {senderContact.website && <span>{senderContact.website}</span>}
        </span>
      )}
    </address>
  )
}

function AddressField({ data }: { data: LetterData }) {
  const { sender, recipient } = data
  const returnLineParts = [
    sender.organization || sender.name,
    sender.street,
    sender.zipCity,
  ].filter(Boolean)

  return (
    <div className="letter-page__address-field">
      <div className="letter-page__return-line" aria-label="Rücksendeadresse">
        {returnLineParts.join(' · ')}
      </div>
      <address className="letter-page__recipient">
        {recipient.organization && (
          <span className="letter-page__recipient-line">{recipient.organization}</span>
        )}
        {recipient.name && (
          <span className="letter-page__recipient-line">{recipient.name}</span>
        )}
        {recipient.addressLine && (
          <span className="letter-page__recipient-line">{recipient.addressLine}</span>
        )}
        {recipient.street && (
          <span className="letter-page__recipient-line">{recipient.street}</span>
        )}
        {recipient.zipCity && (
          <span className="letter-page__recipient-line">{recipient.zipCity}</span>
        )}
        {recipient.country && (
          <span className="letter-page__recipient-line">{recipient.country.toUpperCase()}</span>
        )}
      </address>
    </div>
  )
}

function InfoBlock({ data }: { data: LetterData }) {
  const items: Array<[string, string]> = []
  if (data.meta.yourReference) items.push(['Ihr Zeichen', data.meta.yourReference])
  if (data.meta.yourMessage) items.push(['Ihre Nachricht vom', data.meta.yourMessage])
  if (data.meta.ourReference) items.push(['Unser Zeichen', data.meta.ourReference])
  if (data.meta.date) items.push(['Datum', data.meta.date])

  if (items.length === 0) return null

  return (
    <div className="letter-page__info-block">
      {items.map(([label, value]) => (
        <Fragment key={label}>
          <div className="letter-page__info-label">{label}</div>
          <div className="letter-page__info-value">{value}</div>
        </Fragment>
      ))}
    </div>
  )
}

function ContinuationHeader({
  data,
  pageIndex,
  totalPages,
}: {
  data: LetterData
  pageIndex: number
  totalPages: number
}) {
  const recipientLine = [data.recipient.organization, data.recipient.name]
    .filter(Boolean)
    .join(', ')
  return (
    <div className="letter-page__continuation-header">
      <span>{recipientLine}</span>
      <span>
        {data.meta.date} · Seite {pageIndex + 1} / {totalPages}
      </span>
    </div>
  )
}
