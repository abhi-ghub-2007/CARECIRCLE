import type { ParsedSchedule, MedicationFrequency } from '@/types'

const TIME_PATTERNS = [
  { pattern: /morning/i, time: '08:00' },
  { pattern: /afternoon/i, time: '14:00' },
  { pattern: /evening/i, time: '18:00' },
  { pattern: /night|bedtime/i, time: '21:00' },
  { pattern: /noon|midday/i, time: '12:00' },
]

export function parseScheduleText(text: string): ParsedSchedule {
  const lower = text.toLowerCase()

  // Detect frequency
  let frequency: MedicationFrequency = 'daily'
  if (/twice|two times|2 times|bid/i.test(lower)) frequency = 'twice_daily'
  else if (/three times|3 times|tid/i.test(lower)) frequency = 'three_times_daily'
  else if (/weekly|once a week/i.test(lower)) frequency = 'weekly'
  else if (/as needed|when needed|prn/i.test(lower)) frequency = 'as_needed'

  // Extract times
  const times: string[] = []

  // Check named times first
  for (const item of TIME_PATTERNS) {
    if (item.time && item.pattern.test(lower)) {
      if (!times.includes(item.time)) times.push(item.time)
    }
  }

  // Check explicit times (e.g., "9 AM", "2:30 PM", "08:00")
  const timeRegex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi
  let match: RegExpExecArray | null
  while ((match = timeRegex.exec(lower)) !== null) {
    const rawHour = parseInt(match[1], 10)
    const minutes = match[2] ? match[2] : '00'
    const period = match[3] ? match[3].toLowerCase() : null

    // Avoid matching isolated single numbers that aren't times unless they have am/pm or are 24-hr formatted
    if (!match[3] && !match[2]) {
      continue
    }

    if (rawHour < 0 || rawHour > 24) continue

    let h24 = rawHour
    if (period === 'pm' && rawHour !== 12) h24 = rawHour + 12
    if (period === 'am' && rawHour === 12) h24 = 0

    const timeStr = `${String(h24).padStart(2, '0')}:${minutes}`
    if (!times.includes(timeStr)) times.push(timeStr)
  }

  // Defaults if no time found
  if (times.length === 0) {
    if (frequency === 'twice_daily') {
      times.push('08:00', '20:00')
    } else if (frequency === 'three_times_daily') {
      times.push('08:00', '14:00', '20:00')
    } else {
      times.push('08:00')
    }
  }

  // Extract instructions
  const instructionPatterns = [
    /after (breakfast|lunch|dinner|meals?|eating|food)/i,
    /before (breakfast|lunch|dinner|meals?|eating|food)/i,
    /with (food|meals?|water|milk)/i,
    /on an empty stomach/i,
  ]
  let instructions: string | undefined
  for (const pattern of instructionPatterns) {
    const m = text.match(pattern)
    if (m) {
      instructions = m[0]
      break
    }
  }

  return {
    frequency,
    times: times.sort(),
    instructions,
    confidence: times.length > 0 ? 0.8 : 0.4,
  }
}
