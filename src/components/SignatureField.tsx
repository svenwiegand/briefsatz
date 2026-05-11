import {
  ActionIcon,
  FileInput,
  Group,
  Image,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core'
import { IconTrash, IconUpload } from '@tabler/icons-react'

interface Props {
  url: string | null
  disabled?: boolean
  onChange: (blob: Blob | null) => void
}

export function SignatureField({ url, disabled, onChange }: Props) {
  if (url) {
    return (
      <Stack gap={4}>
        <Text size="sm" fw={500}>
          Unterschrift
        </Text>
        <Group align="center" gap="sm" wrap="nowrap">
          <Image
            src={url}
            alt="Unterschrift"
            h={64}
            w="auto"
            fit="contain"
            style={{
              maxWidth: 220,
              backgroundColor: '#fff',
              border: '1px solid var(--mantine-color-default-border)',
              borderRadius: 4,
              padding: 4,
            }}
          />
          <Tooltip label="Unterschrift entfernen">
            <ActionIcon
              variant="subtle"
              color="red"
              aria-label="Unterschrift entfernen"
              onClick={() => onChange(null)}
              disabled={disabled}
            >
              <IconTrash size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Stack>
    )
  }

  return (
    <FileInput
      label="Unterschrift"
      placeholder="PNG mit transparentem Hintergrund (oder JPG/WebP) auswählen"
      accept="image/png,image/jpeg,image/webp"
      leftSection={<IconUpload size={16} />}
      value={null}
      disabled={disabled}
      onChange={(file) => {
        if (file) onChange(file)
      }}
      clearable={false}
    />
  )
}
