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
  date: string;
  yourReference: string;
  yourMessage: string;
  ourReference: string;
  subject: string;
  greeting: string;
  closing: string;
  signature: string;
}

export interface LetterData {
  sender: Address;
  senderContact: SenderContact;
  recipient: Address;
  meta: LetterMeta;
  bodyHtml: string;
}
