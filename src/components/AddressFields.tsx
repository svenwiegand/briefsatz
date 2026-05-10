import { useId } from 'react'
import type { Address } from '../types'

interface Props {
  value: Address
  onChange: (value: Address) => void
  showAddressLine?: boolean
  showOrganization?: boolean
}

export function AddressFields({
  value,
  onChange,
  showAddressLine = true,
  showOrganization = true,
}: Props) {
  const baseId = useId()
  const update = <K extends keyof Address>(key: K, next: Address[K]) =>
    onChange({ ...value, [key]: next })

  return (
    <div className="form-grid">
      <label className="form-field form-field--full" htmlFor={`${baseId}-name`}>
        Name
        <input
          id={`${baseId}-name`}
          type="text"
          autoComplete="name"
          value={value.name}
          onChange={(e) => update('name', e.target.value)}
        />
      </label>
      {showOrganization && (
        <label className="form-field form-field--full" htmlFor={`${baseId}-organization`}>
          Firma / Organisation (optional)
          <input
            id={`${baseId}-organization`}
            type="text"
            autoComplete="organization"
            value={value.organization}
            onChange={(e) => update('organization', e.target.value)}
          />
        </label>
      )}
      {showAddressLine && (
        <label className="form-field form-field--full" htmlFor={`${baseId}-address-line`}>
          Zusatz / Abteilung (optional)
          <input
            id={`${baseId}-address-line`}
            type="text"
            value={value.addressLine}
            onChange={(e) => update('addressLine', e.target.value)}
          />
        </label>
      )}
      <label className="form-field form-field--full" htmlFor={`${baseId}-street`}>
        Straße &amp; Hausnummer
        <input
          id={`${baseId}-street`}
          type="text"
          autoComplete="street-address"
          value={value.street}
          onChange={(e) => update('street', e.target.value)}
        />
      </label>
      <label className="form-field form-field--full" htmlFor={`${baseId}-zip-city`}>
        PLZ &amp; Ort
        <input
          id={`${baseId}-zip-city`}
          type="text"
          autoComplete="postal-code"
          value={value.zipCity}
          onChange={(e) => update('zipCity', e.target.value)}
        />
      </label>
      <label className="form-field form-field--full" htmlFor={`${baseId}-country`}>
        Land (nur bei Auslandsbriefen)
        <input
          id={`${baseId}-country`}
          type="text"
          autoComplete="country-name"
          value={value.country}
          onChange={(e) => update('country', e.target.value)}
        />
      </label>
    </div>
  )
}
