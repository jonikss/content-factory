'use client'

import { useState } from 'react'
import { Topbar } from '@shared/ui'
import { ArticlesTable } from '@widgets/articles-table'
import { useArticles } from '@entities/article'
import type { Article } from '@shared/api'

const filters = [
  { label: 'Все', value: undefined },
  { label: 'Готово', value: 'done' },
  { label: 'Отклонено', value: 'rejected' },
] as const

export default function ArticlesPage() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>()
  const [search, setSearch] = useState('')

  const { data: articles = [], isLoading } = useArticles()

  const filtered = articles.filter((a) => {
    if (search) {
      const s = search.toLowerCase()
      const matchesSearch =
        a.keyword_text.toLowerCase().includes(s) ||
        a.title?.toLowerCase().includes(s)
      if (!matchesSearch) return false
    }
    if (statusFilter && a.status !== statusFilter) return false
    return true
  })

  const doneCount = articles.filter((a) => a.status === 'done').length
  const rejectedCount = articles.filter((a) => a.status === 'rejected').length

  return (
    <>
      <Topbar
        title="Статьи"
        subtitle={`${articles.length} статей · ${doneCount} готово · ${rejectedCount} отклонено`}
      />
      <div className="flex-1 overflow-y-auto p-4">
        {/* Filters */}
        <div className="flex gap-1.5 mb-3 items-center">
          <input
            className="flex-1 bg-bg2 border border-border rounded-md px-2.5 py-1.5 text-text text-xs font-mono outline-none focus:border-accent"
            placeholder="Поиск..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {filters.map((f) => (
            <button
              key={f.label}
              onClick={() => setStatusFilter(f.value)}
              className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium border transition-colors ${
                statusFilter === f.value
                  ? 'bg-bg3 text-text border-border2'
                  : 'bg-bg2 text-text2 border-border hover:text-text'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-xs text-text3 text-center py-8">Загрузка...</div>
        ) : (
          <ArticlesTable data={filtered} />
        )}
      </div>
    </>
  )
}
