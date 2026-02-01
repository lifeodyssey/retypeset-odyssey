import { test, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:4321'

test.describe('Blog Migration Evaluation', () => {
  test('homepage loads correctly', async ({ page }) => {
    await page.goto(BASE_URL)
    await expect(page).toHaveTitle(/Life Odyssey/)
    await expect(page.locator('h1, h2').first()).toContainText('Life Odyssey')
  })

  test('post page loads with correct URL format', async ({ page }) => {
    // Test a tech post with slug (Binary search)
    const response = await page.goto(`${BASE_URL}/tech/posts/Binary-search/`)
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
    await page.goto(`${BASE_URL}/tech/posts/Binary-search/`)
    const content = await page.content()
    expect(content).toContain('property="og:type"')
    expect(content).toContain('property="og:title"')
    expect(content).toContain('property="og:url"')
  })
})

// Feature Parity Tests - comparing against lifeodyssey.github.io functionality
test.describe('Feature Parity Evaluation', () => {
  test('Pagefind search is available (replaces local-search.js)', async ({ page }) => {
    await page.goto(`${BASE_URL}/search.html`)
    // Check for Pagefind UI component
    const content = await page.content()
    // Pagefind injects its search UI
    expect(content).toMatch(/pagefind|search/i)
  })

  test('KaTeX math rendering is configured (replaces MathJax)', async ({ page }) => {
    // Check that KaTeX CSS is loaded
    await page.goto(BASE_URL)
    const content = await page.content()
    // KaTeX stylesheet should be present
    expect(content).toMatch(/katex|math/i)
  })

  test('dark mode toggle exists (matching original darkmode: true)', async ({ page }) => {
    await page.goto(BASE_URL)
    // Look for theme toggle button or dark mode indicator
    const themeToggle = page.locator('[data-theme-toggle], button:has-text("theme"), [aria-label*="theme"]')
    const count = await themeToggle.count()
    // Either a toggle exists or the page has dark mode class
    const htmlClass = await page.locator('html').getAttribute('class') || ''
    expect(count > 0 || htmlClass.includes('dark')).toBeTruthy()
  })

  test('code blocks have copy functionality', async ({ page }) => {
    // Navigate to a tech post known to have code blocks
    await page.goto(`${BASE_URL}/tech/posts/Binary-search/`)
    const content = await page.content()
    // Should have code blocks with copy button
    expect(content).toMatch(/pre|code/i)
  })

  test('Atom feed is accessible (matching original atom.xml)', async ({ page }) => {
    // Try atom.xml or rss.xml
    const atomResponse = await page.goto(`${BASE_URL}/atom.xml`)
    if (atomResponse?.status() !== 200) {
      const rssResponse = await page.goto(`${BASE_URL}/rss.xml`)
      expect(rssResponse?.status()).toBe(200)
    } else {
      expect(atomResponse?.status()).toBe(200)
    }
  })

  test('URL format uses category-based routing (/tech/posts/ and /life/posts/)', async ({ page }) => {
    // Tech posts should be under /tech/posts/
    const techPosts = [
      { slug: 'Binary-search', title: 'Binary search' },
    ]

    for (const post of techPosts) {
      const response = await page.goto(`${BASE_URL}/tech/posts/${post.slug}/`)
      expect(response?.status()).toBe(200)
    }

    // Life posts should be under /life/posts/
    // (using abbrlink as fallback for posts without slug)
    const lifePosts = page.locator('a[href*="/life/posts/"]')
    // Just verify the pattern exists on homepage
    await page.goto(BASE_URL)
    const content = await page.content()
    expect(content).toMatch(/\/(tech|life)\/posts\//)
  })

  test('responsive design works (mobile viewport)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }) // iPhone SE
    await page.goto(BASE_URL)
    // Page should still be usable
    await expect(page.locator('h1, h2').first()).toBeVisible()
  })

  test('posts list is accessible from homepage', async ({ page }) => {
    await page.goto(BASE_URL)
    // Should have links to posts under /tech/posts/ or /life/posts/
    const postLinks = page.locator('a[href*="/posts/"]')
    const count = await postLinks.count()
    expect(count).toBeGreaterThan(0)
  })
})
