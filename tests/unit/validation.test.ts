import { describe, it, expect } from 'vitest'

// Test permission constants
import { DEFAULT_FAMILY_PERMISSIONS, DEFAULT_CARETAKER_PERMISSIONS, PERMISSIONS } from '@/lib/constants'

describe('Permission defaults', () => {
  it('family default permissions are a subset of all permissions', () => {
    DEFAULT_FAMILY_PERMISSIONS.forEach(p => {
      expect(PERMISSIONS).toContain(p)
    })
  })

  it('caretaker default permissions are a subset of all permissions', () => {
    DEFAULT_CARETAKER_PERMISSIONS.forEach(p => {
      expect(PERMISSIONS).toContain(p)
    })
  })

  it('family members do not have manage_medications by default', () => {
    expect(DEFAULT_FAMILY_PERMISSIONS).not.toContain('manage_medications')
  })

  it('caretakers have record_doses by default', () => {
    expect(DEFAULT_CARETAKER_PERMISSIONS).toContain('record_doses')
  })
})
