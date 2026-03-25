import * as cheerio from 'cheerio'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

interface CompetitorData {
  title: string
  headings: string[]
  description: string
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    return res.text()
  } catch {
    return null
  }
}

function extractCompetitorData(html: string): CompetitorData {
  const $ = cheerio.load(html)

  const title = $('title').first().text().trim()
  const description =
    $('meta[name="description"]').attr('content')?.trim() ?? ''

  const headings: string[] = []
  $('h1, h2, h3').each((_, el) => {
    const text = $(el).text().trim()
    if (text && text.length < 200) {
      headings.push(`${el.tagName.toUpperCase()}: ${text}`)
    }
  })

  return { title, headings: headings.slice(0, 20), description }
}

// --- Google SERP ---

function extractGoogleUrls($: cheerio.CheerioAPI): string[] {
  const urls: string[] = []
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    const match = href.match(/\/url\?q=(https?:\/\/[^&]+)/)
    if (match && !match[1].includes('google.com')) {
      urls.push(match[1])
    }
  })
  return [...new Set(urls)].slice(0, 5)
}

function extractGoogleSnippets($: cheerio.CheerioAPI): string[] {
  const snippets: string[] = []
  $('h3').each((_, el) => {
    const text = $(el).text().trim()
    if (text) snippets.push(text)
  })
  return snippets
}

async function scrapeGoogle(keyword: string): Promise<string | null> {
  const query = encodeURIComponent(keyword)
  const html = await fetchPage(
    `https://www.google.com/search?q=${query}&num=5&hl=ru`
  )
  if (!html) return null

  const $ = cheerio.load(html)
  const urls = extractGoogleUrls($)

  if (urls.length > 0) {
    const pages = await Promise.all(urls.map(fetchPage))
    const competitors = pages
      .filter((h): h is string => h !== null)
      .map(extractCompetitorData)

    if (competitors.length > 0) return formatCompetitors(competitors)
  }

  // Fallback: snippets from SERP
  const snippets = extractGoogleSnippets($)
  return snippets.length > 0
    ? `SERP titles (Google):\n${snippets.join('\n')}`
    : null
}

// --- Yandex SERP ---

function extractYandexUrls($: cheerio.CheerioAPI): string[] {
  const urls: string[] = []

  // Yandex organic results use <a> inside .OrganicTitle or data-cid containers
  $('a.OrganicTitle-Link, .Organic .Path a, a[href*="http"]').each((_, el) => {
    const href = $(el).attr('href') ?? ''
    if (
      href.startsWith('http') &&
      !href.includes('yandex.') &&
      !href.includes('ya.ru')
    ) {
      urls.push(href.split('?')[0]) // strip tracking params
    }
  })

  return [...new Set(urls)].slice(0, 5)
}

function extractYandexSnippets($: cheerio.CheerioAPI): string[] {
  const snippets: string[] = []

  // Yandex titles in organic results
  $('.OrganicTitle-LinkText, .Organic .Path, h2').each((_, el) => {
    const text = $(el).text().trim()
    if (text && text.length > 5 && text.length < 200) snippets.push(text)
  })

  return [...new Set(snippets)]
}

async function scrapeYandex(keyword: string): Promise<string | null> {
  const query = encodeURIComponent(keyword)
  const html = await fetchPage(
    `https://yandex.ru/search/?text=${query}&numdoc=5&lr=213`
  )
  if (!html) return null

  const $ = cheerio.load(html)
  const urls = extractYandexUrls($)

  if (urls.length > 0) {
    const pages = await Promise.all(urls.map(fetchPage))
    const competitors = pages
      .filter((h): h is string => h !== null)
      .map(extractCompetitorData)

    if (competitors.length > 0) return formatCompetitors(competitors)
  }

  // Fallback: snippets from SERP
  const snippets = extractYandexSnippets($)
  return snippets.length > 0
    ? `SERP titles (Yandex):\n${snippets.join('\n')}`
    : null
}

// --- Common ---

function formatCompetitors(competitors: CompetitorData[]): string {
  return competitors
    .map(
      (c, i) =>
        `Competitor ${i + 1}: ${c.title}\nDescription: ${c.description}\nHeadings:\n${c.headings.join('\n')}`
    )
    .join('\n\n---\n\n')
}

/**
 * Scrapes SERP for competitor data.
 * Tries Yandex first (better for RU queries), falls back to Google.
 */
export async function scrapeSerp(keyword: string): Promise<string> {
  try {
    // Try both in parallel, prefer Yandex for Russian content
    const [yandexResult, googleResult] = await Promise.all([
      scrapeYandex(keyword),
      scrapeGoogle(keyword),
    ])

    if (yandexResult && googleResult) {
      return `--- Yandex ---\n${yandexResult}\n\n--- Google ---\n${googleResult}`
    }

    return yandexResult ?? googleResult ?? 'No competitor data available.'
  } catch {
    return 'No competitor data available.'
  }
}
