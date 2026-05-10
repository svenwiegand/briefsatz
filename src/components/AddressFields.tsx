import { SimpleGrid, TextInput } from '@mantine/core'
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
  const update = <K extends keyof Address>(key: K, next: Address[K]) =>
    onChange({ ...value, [key]: next })

  return (
    <SimpleGrid cols={1} spacing="sm">
      <TextInput
        label="Name"
        required
        autoComplete="name"
        value={value.name}
        onChange={(e) => update('name', e.currentTarget.value)}
      />
      {showOrganization && (
        <TextInput
          label="Firma / Organisation"
          autoComplete="organization"
          value={value.organization}
          onChange={(e) => update('organization', e.currentTarget.value)}
        />
      )}
      {showAddressLine && (
        <TextInput
          label="Zusatz / Abteilung"
          value={value.addressLine}
          onChange={(e) => update('addressLine', e.currentTarget.value)}
        />
      )}
      <TextInput
        label="Straße & Hausnummer"
        required
        autoComplete="street-address"
        value={value.street}
        onChange={(e) => update('street', e.currentTarget.value)}
      />
      <TextInput
        label="PLZ & Ort"
        required
        autoComplete="postal-code"
        value={value.zipCity}
        onChange={(e) => update('zipCity', e.currentTarget.value)}
      />
      <TextInput
        label="Land"
        autoComplete="country-name"
        value={value.country}
        onChange={(e) => update('country', e.currentTarget.value)}
      />
    </SimpleGrid>
  )
}
