import { describe, it, expect } from 'vitest'
import { cn, formatDate, formatTime, formatRelativeTime, getDoseStatusLabel } from '@/lib/utils'

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('handles conditional classes', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c')
  })

  it('deduplicates conflicting tailwind classes', () => {
    // tailwind-merge keeps the last conflicting class
    expect(cn('text-sm', 'text-lg')).toBe('text-lg')
  })
})

describe('formatTime', () => {
  it('formats 09:00 as 9:00 AM', () => {
    expect(formatTime('09:00')).toBe('9:00 AM')
  })

  it('formats 14:30 as 2:30 PM', () => {
    expect(formatTime('14:30')).toBe('2:30 PM')
  })

  it('formats 00:00 as 12:00 AM', () => {
    expect(formatTime('00:00')).toBe('12:00 AM')
  })

  it('formats 12:00 as 12:00 PM', () => {
    expect(formatTime('12:00')).toBe('12:00 PM')
  })
})

describe('getDoseStatusLabel', () => {
  it('returns human-readable label for each status', () => {
    expect(getDoseStatusLabel('taken')).toBe('Taken')
    expect(getDoseStatusLabel('missed')).toBe('Missed')
    expect(getDoseStatusLabel('skipped')).toBe('Skipped')
    expect(getDoseStatusLabel('unconfirmed')).toBe('Unconfirmed')
    expect(getDoseStatusLabel('snoozed')).toBe('Snoozed')
    expect(getDoseStatusLabel('upcoming')).toBe('Upcoming')
    expect(getDoseStatusLabel('due')).toBe('Due Now')
  })
})
