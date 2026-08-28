import { test, expect } from '@playwright/test'

const F = { force: true }

function uniq(prefix: string) {
  return `${prefix}${Date.now()}${Math.random().toString(36).slice(2, 7)}@test.dev`
}

const hScroll = (page: import('@playwright/test').Page) =>
  () => page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)

async function hydrateAndSubmit(p: import('@playwright/test').Page) {
  await expect(p.locator('button[type=submit]')).toBeEnabled({ timeout: 10_000 })
  await p.waitForTimeout(300)
  await p.click('button[type=submit]', F)
  await p.waitForURL('**/game', { timeout: 15_000 })
}

async function register(p: import('@playwright/test').Page, name: string, email: string) {
  await p.goto('/register')
  await p.fill('input[name=name]', name)
  await p.fill('input[name=email]', email)
  await p.fill('input[name=password]', 'secret123')
  await hydrateAndSubmit(p)
  await expect(p.locator('text=Welcome aboard, Conductor')).toBeVisible({ timeout: 10_000 })
}

test('core loop at mobile width: register, play, persist', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('response', (r) => r.status() >= 500 && errors.push(`HTTP ${r.status()} ${r.url()}`))

  const email = uniq('p')

  await page.goto('/')
  await expect(page.locator('h1').first()).toContainText('Railway')
  await expect.poll(hScroll(page)).toBe(false)

  await register(page, 'Playwright Agent', email)

  await page.click('button:has-text("Start my railroad")', F)
  await expect(page.locator('text=Dispatch Desk')).toBeVisible({ timeout: 15_000 })
  await expect.poll(hScroll(page)).toBe(false)

  const tutorial = page.locator('[data-testid="tutorial"]')
  if (await tutorial.count()) {
    await expect(tutorial).toBeVisible()
    await page.click('button:has-text("Skip tutorial")', F)
    await expect(tutorial).toHaveCount(0)
  }

  await page.click('button:has-text("Next event")', F)
  await page.click('button:has-text("+1 day")', F)

  await page.click('nav button:has-text("Trains")', F)
  const box = page.locator('button:has-text("+Boxcar")').first()
  if (await box.count()) await box.click(F)

  await page.click('nav button:has-text("Jobs")', F)
  const dispatch = page.locator('button:has-text("Dispatch")').first()
  if (await dispatch.count()) await dispatch.click(F)

  for (const tab of ['Map', 'Cities', 'Lab', 'Routes', 'Loop', 'Log']) {
    await page.click(`nav button:has-text("${tab}")`, F)
    await page.waitForTimeout(200)
    await expect.poll(hScroll(page)).toBe(false)
  }

  await page.click('button:has-text("Exit")', F)
  await page.waitForURL('**/login')
  await page.fill('input[name=email]', email)
  await page.fill('input[name=password]', 'secret123')
  await hydrateAndSubmit(page)
  await expect(page.locator('text=Dispatch Desk')).toBeVisible({ timeout: 10_000 })

  expect(errors).toEqual([])
})

test('demo snapshot loads with enriched state', async ({ page }) => {
  const email = uniq('d')
  await register(page, 'Demo Agent', email)
  await page.click('button:has-text("Try the demo snapshot")', F)
  await expect(page.locator('text=Dispatch Desk')).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('header').first()).toContainText('Demo')
  if (await page.locator('[data-testid="tutorial"]').count()) {
    await page.click('button:has-text("Skip tutorial")', F)
  }
  await expect(page.locator('button:has-text("Next event")')).toBeVisible()
})