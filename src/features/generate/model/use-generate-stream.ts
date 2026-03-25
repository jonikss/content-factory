'use client'

import { useState, useCallback } from 'react'

type Stage = 'research' | 'brief' | 'article' | 'seo' | 'quality'

export type StreamEvent =
  | { type: 'start'; article_id: string; keyword: string }
  | { type: 'stage'; stage: Stage; message: string }
  | { type: 'stage_done'; stage: Stage; data?: object }
  | { type: 'section'; h2: string; body: string }
  | {
      type: 'done'
      article_id: string
      decision: string
      score: number
      hint: string | null
      content_html: string
      meta_snippet: string
    }
  | { type: 'error'; message: string }

export function useGenerateStream() {
  const [events, setEvents] = useState<StreamEvent[]>([])
  const [running, setRunning] = useState(false)
  const [articleId, setArticleId] = useState<string | null>(null)
  const [sections, setSections] = useState<{ h2: string; body: string }[]>([])
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async (keyword: string) => {
    setEvents([])
    setSections([])
    setArticleId(null)
    setError(null)
    setRunning(true)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword }),
      })

      if (!res.ok) {
        setError(`HTTP ${res.status}: ${res.statusText}`)
        setRunning(false)
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split('\n\n')
        buffer = chunks.pop() ?? ''

        for (const chunk of chunks) {
          const eventName = chunk.match(/^event: (.+)$/m)?.[1]
          const dataLine = chunk.match(/^data: (.+)$/m)?.[1]
          if (!eventName || !dataLine) continue

          const data = JSON.parse(dataLine)
          const event = { type: eventName, ...data } as StreamEvent

          setEvents((prev) => [...prev, event])

          if (eventName === 'start') setArticleId(data.article_id)
          if (eventName === 'section')
            setSections((prev) => [...prev, data])
          if (eventName === 'done') setRunning(false)
          if (eventName === 'error') {
            setError(data.message)
            setRunning(false)
          }
        }
      }
    } catch (err) {
      setError(String(err))
      setRunning(false)
    }
  }, [])

  return { generate, events, running, articleId, sections, error }
}
