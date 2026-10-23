export function simulatedPasswordHash(password: string) {
  let hash = 0x811c9dc5
  for (let index = 0; index < password.length; index += 1) {
    hash ^= password.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return `simhash:${(hash >>> 0).toString(16).padStart(8, '0')}`
}
