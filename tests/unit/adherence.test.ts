import { describe, it, expect } from 'vitest'
import { generateAdherenceSummary } from '@/lib/utils'

describe('generateAdherenceSummary', () => {
  it('summarises taken doses', () => {
    const events = [{ status: 'taken' }, { status: 'taken' }]
    const summary = generateAdherenceSummary(events)
    expect(summary).toContain('2 taken')
  })

  it('summarises missed doses', () => {
    const events = [{ status: 'missed' }, { status: 'taken' }]
    const summary = generateAdherenceSummary(events)
    expect(summary).toContain('1 missed')
    expect(summary).toContain('1 taken')
  })

  it('handles empty events', () => {
    const summary = generateAdherenceSummary([])
    expect(summary).toMatch(/no medication events/i)
  })

  it('CRITICAL: does not label unconfirmed as missed', () => {
    const events = [{ status: 'unconfirmed' }]
    const summary = generateAdherenceSummary(events)
    expect(summary).toContain('1 unconfirmed')
    expect(summary).not.toContain('missed')
  })
})
