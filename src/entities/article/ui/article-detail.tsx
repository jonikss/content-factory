'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Article } from '@shared/api'
import { buildMetaSnippet } from '@shared/lib'

interface ArticleDetailProps {
  article: Article
}

export function ArticleDetail({ article }: ArticleDetailProps) {
  const [tab, setTab] = useState<'preview' | 'html' | 'meta'>('preview')
  const [copied, setCopied] = useState<string | null>(null)

  const seo = article.seo_title
    ? {
        seo_title: article.seo_title,
        meta_description: article.meta_description ?? '',
        slug: article.slug ?? '',
        focus_keyword: article.focus_keyword ?? '',
        image_alts: [],
      }
    : null

  const metaSnippet = seo ? buildMetaSnippet(seo) : null

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  const content = article.content_json as {
    intro: string
    sections: Array<{ h2: string; body: string }>
    conclusion: string
  } | null

  const scoreColor =
    (article.quality_score ?? 0) >= 75
      ? 'text-green'
      : (article.quality_score ?? 0) >= 50
        ? 'text-amber'
        : 'text-red'

  return (
    <div className="grid grid-cols-[1fr_200px] gap-3" style={{ minHeight: '530px' }}>
      {/* Main content */}
      <div className="bg-bg2 border border-border rounded-lg overflow-hidden flex flex-col">
        {/* Tabs row */}
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border">
          <div className="flex gap-px">
            {(['preview', 'html', 'meta'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-2.5 py-1 text-[11px] font-medium rounded-[5px] transition-colors ${
                  tab === t ? 'bg-bg4 text-text' : 'text-text3 hover:text-text2'
                }`}
              >
                {t === 'preview' ? 'Превью' : t === 'html' ? 'HTML' : 'Мета-теги'}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            {article.content_html && (
              <button
                onClick={() => copyToClipboard(article.content_html!, 'html')}
                className="px-2.5 py-1 rounded-md bg-bg3 text-text2 border border-border text-[10px] hover:text-text transition-colors"
              >
                {copied === 'html' ? 'Скопировано!' : 'Копировать HTML'}
              </button>
            )}
            {metaSnippet && (
              <button
                onClick={() => copyToClipboard(metaSnippet, 'meta')}
                className="px-2.5 py-1 rounded-md bg-bg3 text-text2 border border-border text-[10px] hover:text-text transition-colors"
              >
                {copied === 'meta' ? 'Скопировано!' : 'Копировать мета'}
              </button>
            )}
            <Link
              href={`/generate?keyword=${encodeURIComponent(article.keyword_text)}`}
              className="px-2.5 py-1 rounded-md bg-bg3 text-text2 border border-border text-[11px] hover:text-text transition-colors"
            >
              Регенерировать
            </Link>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3.5">
          {tab === 'preview' && content && (
            <div>
              <div className="text-[15px] font-semibold mb-2.5 leading-snug">
                {article.title}
              </div>
              <div className="text-xs text-text2 leading-relaxed mb-3 pb-3 border-b border-border">
                {content.intro}
              </div>
              {content.sections.map((section, i) => (
                <div key={i} className="mb-3">
                  <div className="text-xs font-semibold text-blue mb-1.5">
                    {section.h2}
                  </div>
                  {section.body.split(/\n{2,}/).map((p, j) => (
                    <div key={j} className="text-[11px] text-text2 leading-relaxed mb-1">
                      {p}
                    </div>
                  ))}
                </div>
              ))}
              {content.conclusion && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="text-xs font-semibold text-blue mb-1.5">Итого</div>
                  <div className="text-[11px] text-text2 leading-relaxed">
                    {content.conclusion}
                  </div>
                </div>
              )}
            </div>
          )}
          {tab === 'html' && (
            <pre className="font-mono text-[10px] text-text2 leading-relaxed whitespace-pre overflow-x-auto bg-bg3 p-3 rounded-md">
              {article.content_html ?? 'HTML недоступен'}
            </pre>
          )}
          {tab === 'meta' && (
            <pre className="font-mono text-[10px] text-text2 leading-relaxed whitespace-pre overflow-x-auto bg-bg3 p-3 rounded-md">
              {metaSnippet ?? 'Мета-теги недоступны'}
            </pre>
          )}
        </div>
      </div>

      {/* SEO sidebar */}
      <div className="flex flex-col gap-1.5">
        {/* Quality score */}
        <div className="bg-bg2 border border-border rounded-lg px-3 py-3">
          <div className="text-[10px] font-medium text-text3 uppercase tracking-wider mb-2">
            Quality score
          </div>
          <div className={`text-[28px] font-semibold font-mono tracking-tight ${scoreColor}`}>
            {article.quality_score ?? '—'}
          </div>
          <div className={`text-[10px] mt-0.5 ${scoreColor}`}>
            {(article.quality_score ?? 0) >= 75
              ? '✓ Отличное качество'
              : (article.quality_score ?? 0) >= 50
                ? '⚠ Требует доработки'
                : '✕ Низкое качество'}
          </div>
        </div>

        {/* SEO fields */}
        {seo && (
          <div className="bg-bg2 border border-border rounded-lg px-3 py-3">
            <div className="text-[10px] font-medium text-text3 uppercase tracking-wider mb-2">
              SEO поля
            </div>
            {[
              { label: 'Focus keyword', value: seo.focus_keyword },
              { label: 'Slug', value: seo.slug },
              {
                label: 'Title длина',
                value: `${seo.seo_title.length} симв`,
                ok: seo.seo_title.length <= 60,
              },
              {
                label: 'Desc длина',
                value: `${seo.meta_description.length} симв`,
                ok: seo.meta_description.length <= 155,
              },
            ].map((field) => (
              <div key={field.label} className="mb-2 last:mb-0">
                <div className="text-[9px] text-text3 uppercase tracking-wider mb-0.5">
                  {field.label}
                </div>
                <div
                  className={`text-[11px] font-mono break-all ${
                    'ok' in field
                      ? field.ok
                        ? 'text-green'
                        : 'text-red'
                      : 'text-text2'
                  }`}
                >
                  {field.value} {'ok' in field && (field.ok ? '✓' : '✕')}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Article info */}
        <div className="bg-bg2 border border-border rounded-lg px-3 py-3">
          <div className="text-[10px] font-medium text-text3 uppercase tracking-wider mb-2">
            Статья
          </div>
          {[
            {
              label: 'Слов',
              value: (article.content_json as { word_count?: number } | null)?.word_count?.toLocaleString('ru-RU') ?? '—',
            },
            {
              label: 'Разделов H2',
              value: (article.content_json as { sections?: unknown[] } | null)?.sections?.length ?? '—',
            },
            {
              label: 'Создана',
              value: new Date(article.created_at).toLocaleString('ru-RU', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              }),
            },
          ].map((field) => (
            <div key={field.label} className="mb-2 last:mb-0">
              <div className="text-[9px] text-text3 uppercase tracking-wider mb-0.5">
                {field.label}
              </div>
              <div className="text-[11px] text-text2 font-mono">{field.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
