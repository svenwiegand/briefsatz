export interface Address {
  name: string;
  organization: string;
  addressLine: string;
  street: string;
  zipCity: string;
  country: string;
}

export interface SenderContact {
  email: string;
  phone: string;
  website: string;
}

export interface LetterMeta {
  date: Date | null;
  yourReference: string;
  yourMessage: Date | null;
  ourReference: string;
  subject: string;
  greeting: string;
  closing: string;
  signature: string;
}

/**
 * Opaque BlockNote block payload used to rehydrate the editor on reload.
 * We keep the type loose at the storage boundary so a future BlockNote
 * upgrade does not require a schema migration on our side – the editor
 * itself validates the structure when it mounts.
 */
export type StoredBlocks = unknown[];

export interface LetterData {
  sender: Address;
  senderContact: SenderContact;
  recipient: Address;
  meta: LetterMeta;
  bodyHtml: string;
  bodyBlocks: StoredBlocks;
}
