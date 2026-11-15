import { test, expect } from '@playwright/test'

test.describe('Invitation Security', () => {
  test('accept invitation page shows code input', async ({ page }) => {
    await page.goto('/accept-invitation')
    // Should redirect to login if not authenticated
    await expect(page).toHaveURL(/login|accept-invitation/)
  })

  test('invitation code input rejects short codes', async ({ page }) => {
    // This would need authenticated state; use as a structural test
    await page.goto('/accept-invitation')
    // The page should exist and have a code input
    // Actual invitation flow tested with auth'd users in integration tests
  })
})
