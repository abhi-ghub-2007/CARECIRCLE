import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getEscalationState } from '@/utils/escalation'
import type { DoseEvent } from '@/types'

function makeDoseEvent(overrides: Partial<DoseEvent>): DoseEvent {
  return {
    id: 'test-dose-id',
    medication_schedule_id: 'test-schedule-id',
    scheduled_for: new Date().toISOString(),
    status: 'upcoming',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('getEscalationState', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('returns none for a future scheduled dose', () => {
    const future = new Date(Date.now() + 10 * 60 * 1000)
    const dose = makeDoseEvent({ scheduled_for: future.toISOString(), status: 'upcoming' })
    const state = getEscalationState(dose)
    expect(state.level).toBe('none')
    expect(state.shouldNotifyCaregiver).toBe(false)
  })

  it('returns warning after 15 minutes past due', () => {
    const past = new Date(Date.now() - 20 * 60 * 1000) // 20 minutes ago
    const dose = makeDoseEvent({ scheduled_for: past.toISOString(), status: 'unconfirmed' })
    const state = getEscalationState(dose)
    expect(state.level).toBe('warning')
    expect(state.shouldNotifyCaregiver).toBe(false)
  })

  it('triggers caregiver notification after 30 minutes', () => {
    const past = new Date(Date.now() - 35 * 60 * 1000) // 35 minutes ago
    const dose = makeDoseEvent({ scheduled_for: past.toISOString(), status: 'unconfirmed' })
    const state = getEscalationState(dose)
    expect(state.level).toBe('notify_caregiver')
    expect(state.shouldNotifyCaregiver).toBe(true)
  })

  it('allows intervention after 60 minutes', () => {
    const past = new Date(Date.now() - 65 * 60 * 1000) // 65 minutes ago
    const dose = makeDoseEvent({ scheduled_for: past.toISOString(), status: 'unconfirmed' })
    const state = getEscalationState(dose)
    expect(state.level).toBe('intervention')
    expect(state.shouldAllowIntervention).toBe(true)
  })

  it('does not escalate taken doses', () => {
    const past = new Date(Date.now() - 65 * 60 * 1000)
    const dose = makeDoseEvent({ scheduled_for: past.toISOString(), status: 'taken' })
    const state = getEscalationState(dose)
    expect(state.level).toBe('none')
  })

  it('does not escalate skipped doses', () => {
    const past = new Date(Date.now() - 65 * 60 * 1000)
    const dose = makeDoseEvent({ scheduled_for: past.toISOString(), status: 'skipped' })
    const state = getEscalationState(dose)
    expect(state.level).toBe('none')
  })

  it('includes human-readable message for escalated states', () => {
    const past = new Date(Date.now() - 35 * 60 * 1000)
    const dose = makeDoseEvent({ scheduled_for: past.toISOString(), status: 'unconfirmed' })
    const state = getEscalationState(dose)
    expect(state.message).toMatch(/\d+\s*minutes/i)
  })

  it('CRITICAL: does not interpret unconfirmed as missed before grace period', () => {
    const recent = new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
    const dose = makeDoseEvent({ scheduled_for: recent.toISOString(), status: 'unconfirmed' })
    const state = getEscalationState(dose)
    // Must NOT escalate within grace period
    expect(state.level).toBe('none')
    expect(state.shouldNotifyCaregiver).toBe(false)
  })
})
