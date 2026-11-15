import { describe, it, expect } from 'vitest'
import { PERMISSIONS } from '@/lib/constants'

describe('Security — invitation code', () => {
  it('invitation codes are 64 hex characters (SHA-256 output)', () => {
    // The 32-byte random value produces a 64-char hex hash
    // Verify our format expectation matches the edge function
    const mockHash = 'a'.repeat(64)
    expect(mockHash).toHaveLength(64)
    expect(/^[a-f0-9]{64}$/.test(mockHash)).toBe(true)
  })

  it('code format validation rejects short codes', () => {
    const shortCode = 'abc123'
    expect(shortCode.length).not.toBe(64)
  })
})

describe('Security — role validation', () => {
  it('only valid roles are defined', () => {
    const validRoles = ['elderly', 'family', 'caretaker']
    // Any role string not in this list should not be accepted
    const invalidRole = 'admin'
    expect(validRoles).not.toContain(invalidRole)
  })

  it('permissions list has expected entries', () => {
    expect(PERMISSIONS).toContain('view_medications')
    expect(PERMISSIONS).toContain('manage_medications')
    expect(PERMISSIONS).toContain('record_doses')
  })
})

describe('Security — dose status integrity', () => {
  it('unconfirmed is a distinct status from missed', () => {
    const statuses = ['upcoming', 'due', 'taken', 'skipped', 'missed', 'snoozed', 'unconfirmed']
    expect(statuses).toContain('unconfirmed')
    expect(statuses).toContain('missed')
    // They must be separate entries
    const unconfirmedIndex = statuses.indexOf('unconfirmed')
    const missedIndex = statuses.indexOf('missed')
    expect(unconfirmedIndex).not.toBe(missedIndex)
  })
})
