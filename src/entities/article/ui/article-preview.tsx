'use client'

import { useState } from 'react'

interface ArticlePreviewProps {
  title?: string
  intro?: string
  sections: Array<{ h2: string; body: string }>
  contentHtml?: string
  metaSnippet?: string
  isStreaming?: boolean
}

export function ArticlePreview({
  title,
  intro,
  sections,
  contentHtml,
  metaSnippet,
  isStreaming,
}: ArticlePreviewProps) {
  const [tab, setTab] = useState<'preview' | 'html'>('preview')
  const [copied, setCopied] = useState<string | null>(null)

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="bg-bg2 border border-border rounded-lg overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border shrink-0">
        <div className="flex gap-px">
          <button
            onClick={() => setTab('preview')}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-[5px] transition-colors ${
              tab === 'preview' ? 'bg-bg4 text-text' : 'text-text3 hover:text-text2'
            }`}
          >
            Превью
          </button>
          <button
            onClick={() => setTab('html')}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-[5px] transition-colors ${
              tab === 'html' ? 'bg-bg4 text-text' : 'text-text3 hover:text-text2'
            }`}
          >
            HTML
          </button>
        </div>
        <div className="flex gap-1.5">
          {contentHtml && (
            <button
              onClick={() => copyToClipboard(contentHtml, 'html')}
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
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-3.5">
        {tab === 'preview' ? (
          <div>
            {title && <div className="text-[15px] font-semibold mb-2.5 leading-snug">{title}</div>}
            {intro && (
              <div className="text-xs text-text2 leading-relaxed mb-3 pb-3 border-b border-border">
                {intro}
              </div>
            )}
            {sections.map((section, i) => (
              <div key={i} className="mb-3">
                <div
                  className={`text-xs font-semibold text-blue mb-1.5 ${
                    isStreaming && i === sections.length - 1 ? 'typing-cursor' : ''
                  }`}
                >
                  {section.h2}
                </div>
                {section.body.split(/\n{2,}/).map((p, j) => (
                  <div key={j} className="text-[11px] text-text2 leading-relaxed mb-1">
                    {p}
                  </div>
                ))}
              </div>
            ))}
            {!title && sections.length === 0 && (
              <div className="text-xs text-text3 text-center py-8">
                Превью появится после начала генерации
              </div>
            )}
          </div>
        ) : (
          <pre className="font-mono text-[10px] text-text2 leading-relaxed whitespace-pre overflow-x-auto bg-bg3 p-3 rounded-md">
            {contentHtml ?? 'HTML будет доступен после завершения генерации'}
          </pre>
        )}
      </div>
    </div>
  )
}
