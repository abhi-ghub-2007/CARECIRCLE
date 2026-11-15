// Inline validation helpers — no npm packages in Deno edge functions

/**
 * Validates a string field.
 * Returns an error message string or null if valid.
 */
export function validateString(
  value: unknown,
  field: string,
  options: { min?: number; max?: number; required?: boolean } = {}
): string | null {
  const { min, max, required = true } = options

  if (value === undefined || value === null || value === '') {
    if (required) return `${field} is required`
    return null
  }

  if (typeof value !== 'string') {
    return `${field} must be a string`
  }

  if (min !== undefined && value.length < min) {
    return `${field} must be at least ${min} character${min === 1 ? '' : 's'}`
  }

  if (max !== undefined && value.length > max) {
    return `${field} must be at most ${max} character${max === 1 ? '' : 's'}`
  }

  return null
}

/**
 * Validates an email field.
 * Returns an error message string or null if valid.
 */
export function validateEmail(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') {
    return `${field} is required`
  }

  if (typeof value !== 'string') {
    return `${field} must be a string`
  }

  // RFC 5322 simplified check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(value)) {
    return `${field} must be a valid email address`
  }

  if (value.length > 254) {
    return `${field} must be at most 254 characters`
  }

  return null
}

/**
 * Validates an ISO 8601 date string (YYYY-MM-DD).
 * Returns an error message string or null if valid.
 */
export function validateDate(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') {
    return `${field} is required`
  }

  if (typeof value !== 'string') {
    return `${field} must be a string`
  }

  const dateRegex = /^\d{4}-\d{2}-\d{2}$/
  if (!dateRegex.test(value)) {
    return `${field} must be a valid date in YYYY-MM-DD format`
  }

  const date = new Date(value)
  if (isNaN(date.getTime())) {
    return `${field} is not a valid date`
  }

  // Ensure the date components round-trip (guards against 2024-02-30 etc.)
  const [year, month, day] = value.split('-').map(Number)
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() + 1 !== month ||
    date.getUTCDate() !== day
  ) {
    return `${field} is not a valid calendar date`
  }

  return null
}

/**
 * Validates a time string in HH:MM format (24-hour).
 * Returns an error message string or null if valid.
 */
export function validateTime(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') {
    return `${field} is required`
  }

  if (typeof value !== 'string') {
    return `${field} must be a string`
  }

  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
  if (!timeRegex.test(value)) {
    return `${field} must be a valid time in HH:MM format (24-hour)`
  }

  return null
}

/**
 * Validates that a value is in the allowed list.
 * Returns an error message string or null if valid.
 */
export function validateEnum(
  value: unknown,
  field: string,
  allowed: string[]
): string | null {
  if (value === undefined || value === null) {
    return `${field} is required`
  }

  if (typeof value !== 'string' || !allowed.includes(value)) {
    return `${field} must be one of: ${allowed.join(', ')}`
  }

  return null
}

/**
 * Validates a UUID (v4 format).
 * Returns an error message string or null if valid.
 */
export function validateUUID(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') {
    return `${field} is required`
  }

  if (typeof value !== 'string') {
    return `${field} must be a string`
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(value)) {
    return `${field} must be a valid UUID`
  }

  return null
}

/**
 * Collects non-null validation errors into a string array.
 */
export function collectErrors(errors: (string | null)[]): string[] {
  return errors.filter((e): e is string => e !== null)
}
