import keytar from 'keytar'

const SERVICE = 'muta-notes'

export async function setPassword(key: string, value: string): Promise<void> {
  await keytar.setPassword(SERVICE, key, value)
}

export async function getPassword(key: string): Promise<string | null> {
  return keytar.getPassword(SERVICE, key)
}

export async function deletePassword(key: string): Promise<void> {
  await keytar.deletePassword(SERVICE, key)
}
