import { describe, it, expect } from 'vitest'
import { parseScheduleText } from '@/utils/scheduleParser'

describe('parseScheduleText', () => {
  it('parses daily at 9 AM', () => {
    const result = parseScheduleText('Every day at 9 AM after breakfast')
    expect(result.frequency).toBe('daily')
    expect(result.times).toContain('09:00')
    expect(result.instructions).toContain('after breakfast')
  })

  it('parses twice daily with explicit times', () => {
    const result = parseScheduleText('Take twice daily at 8 AM and 8 PM')
    expect(result.frequency).toBe('twice_daily')
    expect(result.times).toHaveLength(2)
    expect(result.times).toContain('08:00')
    expect(result.times).toContain('20:00')
  })

  it('parses three times daily with defaults', () => {
    const result = parseScheduleText('Three times daily with food')
    expect(result.frequency).toBe('three_times_daily')
    expect(result.times).toHaveLength(3)
    expect(result.instructions).toContain('with food')
  })

  it('parses weekly frequency', () => {
    const result = parseScheduleText('Once a week on Monday morning')
    expect(result.frequency).toBe('weekly')
    expect(result.times).toContain('08:00')
  })

  it('parses as needed', () => {
    const result = parseScheduleText('Take as needed for pain')
    expect(result.frequency).toBe('as_needed')
  })

  it('handles PM times correctly', () => {
    const result = parseScheduleText('Every day at 2 PM')
    expect(result.times).toContain('14:00')
  })

  it('handles 12 AM (midnight)', () => {
    const result = parseScheduleText('Take at 12 AM')
    expect(result.times).toContain('00:00')
  })

  it('handles 12 PM (noon)', () => {
    const result = parseScheduleText('Take at noon')
    expect(result.times).toContain('12:00')
  })

  it('returns confidence score', () => {
    const result = parseScheduleText('Every day at 9 AM')
    expect(result.confidence).toBeGreaterThan(0)
    expect(result.confidence).toBeLessThanOrEqual(1)
  })

  it('handles empty string gracefully', () => {
    const result = parseScheduleText('')
    expect(result.frequency).toBe('daily')
    expect(result.times).toHaveLength(1)
  })
})
