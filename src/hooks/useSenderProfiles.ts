import { useCallback, useMemo } from 'react'
import { useLocalStorage } from '@mantine/hooks'
import type { Address, SenderContact, SenderProfile } from '../types'
import {
  deleteSignatureBlob,
  loadSignatureBlob,
  saveSignatureBlob,
} from '../storage/signatures'

const PROFILES_KEY = 'letter-app:sender-profiles'
const ACTIVE_ID_KEY = 'letter-app:active-sender-profile-id'

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

export interface ProfileSnapshot {
  sender: Address
  contact: SenderContact
  signatureName: string
  signatureBlob: Blob | null
}

export interface UseSenderProfilesResult {
  profiles: SenderProfile[]
  activeId: string | null
  activeProfile: SenderProfile | null
  selectProfile: (id: string) => Promise<ProfileSnapshot | null>
  createEmpty: () => SenderProfile
  addFromSnapshot: (
    snapshot: {
      sender: Address
      contact: SenderContact
      signatureName: string
      signatureBlob: Blob | null
    },
    options?: { withCopySuffix?: boolean },
  ) => Promise<SenderProfile>
  saveActive: (snapshot: {
    sender: Address
    contact: SenderContact
    signatureName: string
    signatureBlob: Blob | null
    signatureDirty: boolean
  }) => Promise<void>
  deleteActive: () => Promise<ProfileSnapshot | null>
}

function appendCopySuffix(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '(Kopie)'
  if (trimmed.endsWith('(Kopie)')) return trimmed
  return `${trimmed} (Kopie)`
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function useSenderProfiles(): UseSenderProfilesResult {
  const [profiles, setProfiles] = useLocalStorage<SenderProfile[]>({
    key: PROFILES_KEY,
    defaultValue: [],
    getInitialValueInEffect: false,
  })
  const [activeId, setActiveId] = useLocalStorage<string | null>({
    key: ACTIVE_ID_KEY,
    defaultValue: null,
    getInitialValueInEffect: false,
  })

  const profileList = profiles ?? []

  const activeProfile = useMemo(
    () => profileList.find((p) => p.id === activeId) ?? null,
    [profileList, activeId],
  )

  const selectProfile = useCallback(
    async (id: string): Promise<ProfileSnapshot | null> => {
      const profile = profileList.find((p) => p.id === id)
      if (!profile) return null
      const blob = profile.hasSignatureImage
        ? (await loadSignatureBlob(profile.id)) ?? null
        : null
      setActiveId(id)
      return {
        sender: profile.sender,
        contact: profile.contact,
        signatureName: profile.signatureName,
        signatureBlob: blob,
      }
    },
    [profileList, setActiveId],
  )

  const createEmpty = useCallback((): SenderProfile => {
    const profile: SenderProfile = {
      id: generateId(),
      sender: { ...EMPTY_ADDRESS },
      contact: { ...EMPTY_CONTACT },
      signatureName: '',
      hasSignatureImage: false,
    }
    setProfiles((current) => [...(current ?? []), profile])
    setActiveId(profile.id)
    return profile
  }, [setProfiles, setActiveId])

  const addFromSnapshot = useCallback(
    async (
      snapshot: {
        sender: Address
        contact: SenderContact
        signatureName: string
        signatureBlob: Blob | null
      },
      options?: { withCopySuffix?: boolean },
    ): Promise<SenderProfile> => {
      const id = generateId()
      const hasSignatureImage = snapshot.signatureBlob !== null
      if (hasSignatureImage && snapshot.signatureBlob) {
        await saveSignatureBlob(id, snapshot.signatureBlob)
      }
      const profile: SenderProfile = {
        id,
        sender: {
          ...snapshot.sender,
          name: options?.withCopySuffix
            ? appendCopySuffix(snapshot.sender.name)
            : snapshot.sender.name,
        },
        contact: { ...snapshot.contact },
        signatureName: snapshot.signatureName,
        hasSignatureImage,
      }
      setProfiles((current) => [...(current ?? []), profile])
      setActiveId(id)
      return profile
    },
    [setProfiles, setActiveId],
  )

  const saveActive = useCallback(
    async (snapshot: {
      sender: Address
      contact: SenderContact
      signatureName: string
      signatureBlob: Blob | null
      signatureDirty: boolean
    }): Promise<void> => {
      if (!activeId) return

      if (snapshot.signatureDirty) {
        if (snapshot.signatureBlob) {
          await saveSignatureBlob(activeId, snapshot.signatureBlob)
        } else {
          await deleteSignatureBlob(activeId)
        }
      }

      const updated: SenderProfile = {
        id: activeId,
        sender: { ...snapshot.sender },
        contact: { ...snapshot.contact },
        signatureName: snapshot.signatureName,
        hasSignatureImage: snapshot.signatureBlob !== null,
      }
      // Look up the list inside the functional updater so we always see the
      // most recent state — Mantine's useLocalStorage propagates `profiles`
      // and `activeId` as separate state slices, which means a stale
      // closure-captured `profileList` can still be empty while `activeId`
      // already points at a freshly bootstrapped profile.
      setProfiles((current) => {
        const list = current ?? []
        if (!list.some((p) => p.id === activeId)) return list
        return list.map((p) => (p.id === activeId ? updated : p))
      })
    },
    [activeId, setProfiles],
  )

  const deleteActive = useCallback(async (): Promise<ProfileSnapshot | null> => {
    if (!activeId) return null
    const remaining = profileList.filter((p) => p.id !== activeId)
    const next = remaining[0] ?? null
    await deleteSignatureBlob(activeId)
    const nextBlob = next?.hasSignatureImage
      ? (await loadSignatureBlob(next.id)) ?? null
      : null
    setProfiles(remaining)
    setActiveId(next?.id ?? null)
    if (!next) return null
    return {
      sender: next.sender,
      contact: next.contact,
      signatureName: next.signatureName,
      signatureBlob: nextBlob,
    }
  }, [activeId, profileList, setProfiles, setActiveId])

  return {
    profiles: profileList,
    activeId: activeId ?? null,
    activeProfile,
    selectProfile,
    createEmpty,
    addFromSnapshot,
    saveActive,
    deleteActive,
  }
}

export function profileLabelParts(profile: SenderProfile): {
  name: string
  organization: string
} {
  const name = profile.sender.name.trim()
  const organization = profile.sender.organization.trim()
  return {
    name: name || '(neuer Absender)',
    organization,
  }
}
