import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('shows login page on unauthenticated visit', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/login/)
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
  })

  test('shows validation errors on empty submit', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByRole('alert')).toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('invalid@example.com')
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()
    // Generic error — should not reveal which field is wrong
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByRole('alert')).toContainText(/invalid/i)
  })

  test('register page renders correctly', async ({ page }) => {
    await page.goto('/register')
    await expect(page.getByRole('heading', { name: /create/i })).toBeVisible()
    await expect(page.getByLabel(/full name/i)).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i).first()).toBeVisible()
    await expect(page.getByRole('group', { name: /role/i })).toBeVisible()
  })

  test('register form validates email format', async ({ page }) => {
    await page.goto('/register')
    await page.getByLabel(/email/i).fill('not-an-email')
    await page.getByLabel(/password/i).first().fill('Password123!')
    await page.getByRole('button', { name: /create/i }).click()
    await expect(page.getByText(/valid email/i)).toBeVisible()
  })

  test('forgot password page renders', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page.getByRole('heading', { name: /reset/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
  })
})
