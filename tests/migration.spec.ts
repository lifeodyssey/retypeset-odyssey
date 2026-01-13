import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:4321'

test.describe('Blog Migration Evaluation', () => {
  test('homepage loads correctly', async ({ page }) => {
    await page.goto(BASE_URL)
    await expect(page).toHaveTitle(/Life Odyssey/)
    await expect(page.locator('h1, h2').first()).toContainText('Life Odyssey')
  })

  test('post page loads with correct URL format', async ({ page }) => {
    // Test a known post with abbrlink fc1cc4f1 (Binary search)
    const response = await page.goto(`${BASE_URL}/posts/fc1cc4f1.html`)
    expect(response?.status()).toBe(200)
    await expect(page.locator('h1').first()).toContainText('Binary search')
  })

  test('search page loads', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/search.html`)
    expect(response?.status()).toBe(200)
    // Page content should contain search heading
    const content = await page.content()
    expect(content).toMatch(/搜索|Search/)
  })

  test('tags page loads', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/tags.html`)
    expect(response?.status()).toBe(200)
    // Page should have tag links
    const content = await page.content()
    expect(content).toContain('/tags/')
  })

  test('about page loads', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/about.html`)
    expect(response?.status()).toBe(200)
  })

  test('RSS feed is accessible', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/rss.xml`)
    expect(response?.status()).toBe(200)
    const content = await page.content()
    expect(content).toContain('xml')
  })

  test('sitemap is accessible', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/sitemap-index.xml`)
    expect(response?.status()).toBe(200)
  })

  test('llms.txt is accessible', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/llms.txt`)
    expect(response?.status()).toBe(200)
    const content = await page.content()
    expect(content).toContain('Life Odyssey')
  })

  test('English locale works', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/en.html`)
    expect(response?.status()).toBe(200)
    const content = await page.content()
    expect(content).toContain('lang="en')
  })

  test('Japanese locale works', async ({ page }) => {
    const response = await page.goto(`${BASE_URL}/ja.html`)
    expect(response?.status()).toBe(200)
    const content = await page.content()
    expect(content).toContain('lang="ja')
  })

  test('navigation contains all items', async ({ page }) => {
    await page.goto(BASE_URL)
    const nav = page.locator('nav[aria-label="Site Navigation"]')
    await expect(nav.locator('a')).toHaveCount(4) // Posts, Tags, Search, About
  })

  test('post has OG tags', async ({ page }) => {
    await page.goto(`${BASE_URL}/posts/fc1cc4f1.html`)
    const content = await page.content()
    expect(content).toContain('property="og:type"')
    expect(content).toContain('property="og:title"')
    expect(content).toContain('property="og:url"')
  })
})
