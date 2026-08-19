export type ClassValue = string | number | null | undefined | false | ClassValue[]

export function cn(...inputs: ClassValue[]) {
  const parts: string[] = []

  const walk = (value: ClassValue) => {
    if (!value && value !== 0) return
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }
    parts.push(String(value).trim())
  }

  inputs.forEach(walk)
  return parts.join(' ')
}