import { createStore, del, get, set } from 'idb-keyval'

const store = createStore('letter-app-signatures', 'blobs')

export function loadSignatureBlob(profileId: string): Promise<Blob | undefined> {
  return get<Blob>(profileId, store)
}

export function saveSignatureBlob(profileId: string, blob: Blob): Promise<void> {
  return set(profileId, blob, store)
}

export function deleteSignatureBlob(profileId: string): Promise<void> {
  return del(profileId, store)
}
