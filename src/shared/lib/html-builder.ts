import type { ArticleContentJson, SeoMeta } from '@shared/api'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function convertInlineFormatting(text: string): string {
  // **bold** → <strong>
  let result = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // *italic* (but not inside <strong>)
  result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
  return result
}

function parseBodyToHtml(body: string): string {
  const blocks = body.split(/\n{2,}/)
  const htmlParts: string[] = []

  for (const block of blocks) {
    const trimmed = block.trim()
    if (!trimmed) continue

    const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean)

    // Check if it's an unordered list
    if (lines.every((l) => /^[-*]\s/.test(l))) {
      const items = lines.map((l) => `    <li>${convertInlineFormatting(l.replace(/^[-*]\s+/, ''))}</li>`)
      htmlParts.push(`  <ul>\n${items.join('\n')}\n  </ul>`)
      continue
    }

    // Check if it's an ordered list
    if (lines.every((l) => /^\d+\.\s/.test(l))) {
      const items = lines.map((l) => `    <li>${convertInlineFormatting(l.replace(/^\d+\.\s+/, ''))}</li>`)
      htmlParts.push(`  <ol>\n${items.join('\n')}\n  </ol>`)
      continue
    }

    // Regular paragraph
    htmlParts.push(`  <p>${convertInlineFormatting(trimmed.replace(/\n/g, ' '))}</p>`)
  }

  return htmlParts.join('\n')
}

export function buildHtml(
  content: ArticleContentJson,
  seo: SeoMeta,
  title: string
): string {
  const parts: string[] = []

  parts.push('<article class="seo-article">')
  parts.push('')

  // H1
  parts.push(`  <h1>${escapeHtml(title)}</h1>`)
  parts.push('')

  // Intro
  parts.push(`  <p class="intro">${convertInlineFormatting(content.intro.replace(/\n{2,}/g, '</p>\n  <p class="intro">'))}</p>`)
  parts.push('')

  // Sections
  for (const section of content.sections) {
    parts.push('  <section>')
    parts.push(`    <h2>${escapeHtml(section.h2)}</h2>`)
    parts.push(parseBodyToHtml(section.body))
    parts.push('  </section>')
    parts.push('')
  }

  // Conclusion
  parts.push('  <section class="conclusion">')
  parts.push('    <h2>Итого</h2>')
  parts.push(`    <p>${convertInlineFormatting(content.conclusion.replace(/\n{2,}/g, '</p>\n    <p>'))}</p>`)
  parts.push('  </section>')
  parts.push('')

  parts.push('</article>')

  return parts.join('\n')
}

export function buildMetaSnippet(seo: SeoMeta): string {
  return [
    `<title>${escapeHtml(seo.seo_title)}</title>`,
    `<meta name="description" content="${escapeHtml(seo.meta_description)}">`,
    `<meta name="keywords" content="${escapeHtml(seo.focus_keyword)}">`,
    `<link rel="canonical" href="https://site.ru/${escapeHtml(seo.slug)}">`,
  ].join('\n')
}
