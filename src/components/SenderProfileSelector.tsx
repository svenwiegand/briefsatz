import { useMemo, useState } from 'react'
import {
  ActionIcon,
  Button,
  Combobox,
  Group,
  InputBase,
  Modal,
  Stack,
  Text,
  Tooltip,
  useCombobox,
} from '@mantine/core'
import {
  IconCopy,
  IconDeviceFloppy,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react'
import type { SenderProfile } from '../types'
import { profileLabelParts } from '../hooks/useSenderProfiles'

interface Props {
  profiles: SenderProfile[]
  activeId: string | null
  dirty: boolean
  collapsed: boolean
  onSelect: (id: string) => void
  onCreateEmpty: () => void
  onClone: () => void
  onSave: () => void
  onDelete: () => void
}

type PendingAction =
  | { type: 'select'; id: string }
  | { type: 'create' }
  | { type: 'clone' }
  | { type: 'delete' }
  | null

export function SenderProfileSelector({
  profiles,
  activeId,
  dirty,
  collapsed,
  onSelect,
  onCreateEmpty,
  onClone,
  onSave,
  onDelete,
}: Props) {
  const combobox = useCombobox({
    onDropdownClose: () => combobox.resetSelectedOption(),
  })
  const [pending, setPending] = useState<PendingAction>(null)

  const active = useMemo(
    () => profiles.find((p) => p.id === activeId) ?? null,
    [profiles, activeId],
  )

  const requestAction = (action: Exclude<PendingAction, null>) => {
    // Clone preserves current values into a new profile, so it never needs
    // a discard confirmation. Plus/Select replace the form fields, hence
    // the dirty guard. Delete always confirms.
    const isDiscarding = action.type === 'select' || action.type === 'create'
    if ((dirty && isDiscarding) || action.type === 'delete') {
      setPending(action)
      return
    }
    runAction(action)
  }

  const runAction = (action: Exclude<PendingAction, null>) => {
    switch (action.type) {
      case 'select':
        onSelect(action.id)
        break
      case 'create':
        onCreateEmpty()
        break
      case 'clone':
        onClone()
        break
      case 'delete':
        onDelete()
        break
    }
  }

  const confirmPending = () => {
    if (pending) runAction(pending)
    setPending(null)
  }

  const triggerLabel = active ? (
    <ProfileLabel profile={active} />
  ) : (
    <Text size="sm" c="dimmed">
      Kein Absender ausgewählt
    </Text>
  )

  return (
    <>
      <Group gap="xs" align="flex-end" wrap="nowrap">
        <Combobox
          store={combobox}
          withinPortal={false}
          onOptionSubmit={(value) => {
            combobox.closeDropdown()
            if (value !== activeId) {
              requestAction({ type: 'select', id: value })
            }
          }}
        >
          <Combobox.Target>
            <InputBase
              component="button"
              type="button"
              pointer
              label="Absender-Profil"
              rightSection={<Combobox.Chevron />}
              rightSectionPointerEvents="none"
              onClick={() => {
                if (profiles.length > 0) combobox.toggleDropdown()
              }}
              style={{ flex: 1 }}
              disabled={profiles.length === 0}
            >
              {triggerLabel}
            </InputBase>
          </Combobox.Target>

          <Combobox.Dropdown>
            <Combobox.Options>
              {profiles.map((p) => (
                <Combobox.Option value={p.id} key={p.id} active={p.id === activeId}>
                  <ProfileLabel profile={p} />
                </Combobox.Option>
              ))}
            </Combobox.Options>
          </Combobox.Dropdown>
        </Combobox>

        {!collapsed && (
          <>
            <Tooltip label="Neuer leerer Absender">
              <ActionIcon
                variant="default"
                size="lg"
                aria-label="Neuer Absender"
                onClick={() => requestAction({ type: 'create' })}
              >
                <IconPlus size={18} />
              </ActionIcon>
            </Tooltip>

            <Tooltip
              label={
                active
                  ? 'Aktuelle Werte als neues Profil speichern'
                  : 'Erst Profil auswählen'
              }
            >
              <ActionIcon
                variant="default"
                size="lg"
                aria-label="Absender duplizieren"
                disabled={!active}
                onClick={() => requestAction({ type: 'clone' })}
              >
                <IconCopy size={18} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label={active ? 'Profil löschen' : 'Erst Profil auswählen'}>
              <ActionIcon
                variant="default"
                color="red"
                size="lg"
                aria-label="Profil löschen"
                disabled={!active}
                onClick={() => requestAction({ type: 'delete' })}
              >
                <IconTrash size={18} />
              </ActionIcon>
            </Tooltip>

            {active && dirty && (
              <Button
                leftSection={<IconDeviceFloppy size={18} />}
                onClick={onSave}
                variant="filled"
              >
                Speichern
              </Button>
            )}
          </>
        )}
      </Group>

      <Modal
        opened={pending !== null}
        onClose={() => setPending(null)}
        title={pending?.type === 'delete' ? 'Profil löschen?' : 'Ungespeicherte Änderungen'}
        centered
      >
        <Stack gap="md">
          <Text size="sm">
            {pending?.type === 'delete'
              ? `Das Profil „${active ? formatLabel(active) : ''}“ wird unwiderruflich gelöscht. Fortfahren?`
              : 'Sie haben ungespeicherte Änderungen am aktuellen Profil. Möchten Sie diese verwerfen?'}
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => setPending(null)}>
              Abbrechen
            </Button>
            <Button
              color={pending?.type === 'delete' ? 'red' : undefined}
              onClick={confirmPending}
            >
              {pending?.type === 'delete' ? 'Löschen' : 'Verwerfen'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  )
}

function ProfileLabel({ profile }: { profile: SenderProfile }) {
  const { name, organization } = profileLabelParts(profile)
  return (
    <Text size="sm" component="span">
      {name}
      {organization && (
        <Text component="span" inherit c="dimmed">
          {' · '}
          {organization}
        </Text>
      )}
    </Text>
  )
}

function formatLabel(profile: SenderProfile): string {
  const { name, organization } = profileLabelParts(profile)
  return organization ? `${name} · ${organization}` : name
}
