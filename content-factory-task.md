# Content Factory MVP — задача для Claude Code

## Контекст проекта

Строим контент-завод: вводим ключевые запросы вручную, система генерирует готовые SEO-статьи через LLM. На выходе — статья с правильной HTML-разметкой, которую можно скопировать и вставить куда угодно. Никакой интеграции с WordPress, изображениями или публикацией. Генерация запускается из UI и показывается стримингом — пользователь видит прогресс каждого этапа и секции статьи по мере их появления.

---

## Стек

| Слой | Технология |
|---|---|
| Frontend + API | Next.js 16, App Router, TypeScript |
| База данных | Supabase (Postgres + Realtime) |
| LLM-цепочки | LangChain.js + Zod |
| LLM API | OpenRouter (единый интерфейс: Claude, GPT-4o, Mistral, Gemini и др.) |
| Стили | Tailwind CSS |
| Таблицы | TanStack Table v8 |
| Серверное состояние | TanStack Query (React Query) v5 |

---

## Структура проекта

```
content-factory/
├── app/
│   ├── (dashboard)/
│   │   ├── page.tsx                  # Дашборд — список статей
│   │   ├── generate/page.tsx         # Страница запуска генерации + стрим
│   │   ├── articles/[id]/page.tsx    # Просмотр готовой статьи с HTML
│   │   └── settings/page.tsx         # Настройки системы
│   ├── api/
│   │   └── generate/route.ts         # POST — стриминг генерации (SSE)
│   └── layout.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Браузерный клиент
│   │   └── server.ts                 # Серверный клиент
│   ├── chains/
│   │   ├── brief.ts                  # Brief Chain: keyword → ТЗ
│   │   ├── article.ts                # Article Chain: ТЗ → статья секциями
│   │   ├── seo.ts                    # SEO Chain: статья → мета-данные
│   │   └── quality.ts                # Quality Gate Chain: статья → решение
│   ├── llm.ts                        # Единый провайдер: OpenRouter через LangChain
│   ├── html-builder.ts               # Сборка финального HTML из content_json
│   └── serp-scraper.ts               # Скрапинг ТОП-5 конкурентов
├── components/
│   ├── generate-form.tsx             # Форма ввода ключевого слова
│   ├── stream-progress.tsx           # Живой лог стриминга по этапам
│   ├── article-preview.tsx           # Рендер HTML статьи + кнопка копирования
│   ├── articles-table.tsx            # Таблица статей (TanStack Table)
│   └── status-badge.tsx              # Бейдж статуса статьи
└── hooks/
    └── use-generate-stream.ts        # Хук для чтения SSE стрима
```

---

## Схема базы данных

```sql
create table articles (
  id               uuid primary key default gen_random_uuid(),
  keyword_text     text not null,
  title            text,
  content_json     jsonb,    -- { intro, sections:[{h2,body}], conclusion }
  content_html     text,     -- готовый HTML для копирования
  seo_title        text,
  meta_description text,
  slug             text,
  focus_keyword    text,
  quality_score    int,
  quality_decision text,     -- publish | rewrite | reject
  rewrite_hint     text,
  status           text default 'draft',
  -- draft | generating | done | rejected
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Supabase Realtime — включить для таблицы articles
alter publication supabase_realtime add table articles;
```

---

## Стриминг генерации — ключевой механизм

Генерация запускается из браузера и отдаётся через **Server-Sent Events (SSE)**. Route Handler пишет в `ReadableStream`, клиент читает через `fetch` с `getReader()`. Пользователь видит каждый этап по мере выполнения — никаких фоновых воркеров и очередей.

### Route Handler (`app/api/generate/route.ts`)

```ts
import { NextRequest } from 'next/server'
import { runBriefChain } from '@/lib/chains/brief'
import { runArticleChain } from '@/lib/chains/article'
import { runSeoChain } from '@/lib/chains/seo'
import { runQualityChain } from '@/lib/chains/quality'
import { scrapeSerp } from '@/lib/serp-scraper'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 300 // Vercel Pro: до 5 минут

export async function POST(req: NextRequest) {
  const { keyword } = await req.json()
  const supabase = createClient()
  const encoder = new TextEncoder()

  const send = (controller: ReadableStreamDefaultController, event: string, data: object) => {
    controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 1. Создаём запись статьи
        const { data: article } = await supabase
          .from('articles')
          .insert({ keyword_text: keyword, status: 'generating' })
          .select().single()

        send(controller, 'start', { article_id: article.id, keyword })

        // 2. Скрапинг конкурентов
        send(controller, 'stage', { stage: 'research', message: 'Анализируем конкурентов...' })
        const competitorContext = await scrapeSerp(keyword)
        send(controller, 'stage_done', { stage: 'research' })

        // 3. Brief Chain
        send(controller, 'stage', { stage: 'brief', message: 'Составляем ТЗ...' })
        const brief = await runBriefChain(keyword, competitorContext)
        send(controller, 'stage_done', { stage: 'brief', data: brief })

        // 4. Article Chain — каждая готовая секция сразу летит в браузер
        send(controller, 'stage', { stage: 'article', message: 'Пишем статью...' })
        const articleContent = await runArticleChain(brief, (section) => {
          send(controller, 'section', { h2: section.h2, body: section.body })
        })
        send(controller, 'stage_done', { stage: 'article' })

        // 5. SEO Meta
        send(controller, 'stage', { stage: 'seo', message: 'Генерируем SEO мета...' })
        const seo = await runSeoChain(keyword, brief.title, articleContent.intro)
        send(controller, 'stage_done', { stage: 'seo', data: seo })

        // 6. Quality Gate
        send(controller, 'stage', { stage: 'quality', message: 'Проверяем качество...' })
        const quality = await runQualityChain(keyword, articleContent)
        send(controller, 'stage_done', { stage: 'quality', data: quality })

        // 7. Собираем финальный HTML
        const contentHtml = buildHtml(articleContent, seo)

        // 8. Сохраняем в БД
        await supabase.from('articles').update({
          title:            brief.title,
          content_json:     articleContent,
          content_html:     contentHtml,
          seo_title:        seo.seo_title,
          meta_description: seo.meta_description,
          slug:             seo.slug,
          focus_keyword:    seo.focus_keyword,
          quality_score:    quality.total,
          quality_decision: quality.decision,
          rewrite_hint:     quality.rewrite_hint,
          status:           quality.decision === 'reject' ? 'rejected' : 'done',
          updated_at:       new Date().toISOString(),
        }).eq('id', article.id)

        send(controller, 'done', {
          article_id:   article.id,
          decision:     quality.decision,
          score:        quality.total,
          hint:         quality.rewrite_hint,
          content_html: contentHtml,
        })

      } catch (err) {
        send(controller, 'error', { message: String(err) })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}
```

### Хук на клиенте (`hooks/use-generate-stream.ts`)

```ts
import { useState, useCallback } from 'react'

type Stage = 'research' | 'brief' | 'article' | 'seo' | 'quality'

export type StreamEvent =
  | { type: 'start';      article_id: string; keyword: string }
  | { type: 'stage';      stage: Stage; message: string }
  | { type: 'stage_done'; stage: Stage; data?: object }
  | { type: 'section';    h2: string; body: string }
  | { type: 'done';       article_id: string; decision: string; score: number; hint: string | null }
  | { type: 'error';      message: string }

export function useGenerateStream() {
  const [events, setEvents]       = useState<StreamEvent[]>([])
  const [running, setRunning]     = useState(false)
  const [articleId, setArticleId] = useState<string | null>(null)
  const [sections, setSections]   = useState<{ h2: string; body: string }[]>([])

  const generate = useCallback(async (keyword: string) => {
    setEvents([])
    setSections([])
    setArticleId(null)
    setRunning(true)

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keyword }),
    })

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
        const dataLine  = chunk.match(/^data: (.+)$/m)?.[1]
        if (!eventName || !dataLine) continue

        const data = JSON.parse(dataLine)
        const event = { type: eventName, ...data } as StreamEvent

        setEvents(prev => [...prev, event])

        if (eventName === 'start')   setArticleId(data.article_id)
        if (eventName === 'section') setSections(prev => [...prev, data])
        if (eventName === 'done')    setRunning(false)
        if (eventName === 'error')   setRunning(false)
      }
    }
  }, [])

  return { generate, events, running, articleId, sections }
}
```

---

## LangChain цепочки

### Единый провайдер (`lib/llm.ts`)

```ts
import { ChatOpenAI } from '@langchain/openai'

export const models = {
  fast: new ChatOpenAI({
    modelName: process.env.LLM_MODEL_FAST ?? 'anthropic/claude-haiku-3-5',
    openAIApiKey: process.env.OPENROUTER_API_KEY,
    configuration: { baseURL: 'https://openrouter.ai/api/v1' },
  }),
  quality: new ChatOpenAI({
    modelName: process.env.LLM_MODEL_QUALITY ?? 'anthropic/claude-sonnet-4-6',
    openAIApiKey: process.env.OPENROUTER_API_KEY,
    configuration: { baseURL: 'https://openrouter.ai/api/v1' },
  }),
  // Смена провайдера — только modelName:
  // 'openai/gpt-4o' | 'google/gemini-2.0-flash' | 'mistralai/mistral-large'
}
```

Все цепочки используют `OutputFixingParser` поверх `StructuredOutputParser` — авторетрай при невалидном JSON от LLM.

### Brief Chain (`lib/chains/brief.ts`)
**Вход:** `{ keyword, competitor_context }`
**Выход (Zod):**
```ts
z.object({
  title:        z.string(),
  h2_sections:  z.array(z.string()).max(7),
  lsi_words:    z.array(z.string()).max(15),
  target_words: z.number(),
  tone:         z.enum(['informational', 'commercial', 'mixed']),
})
```
Модель: `models.fast`. ~2–3 сек.

### Article Chain (`lib/chains/article.ts`)
**Вход:** brief + callback `onSection(section)`

Секции генерируются батчами по 2 через `Promise.all`. После каждого батча вызывается `onSection` для каждой секции — она сразу отправляется в SSE стрим не дожидаясь конца статьи.

**Выход:** `{ intro, sections:[{h2,body}], conclusion, word_count }`
Модель: `models.quality`. ~30–60 сек.

### SEO Meta Chain (`lib/chains/seo.ts`)
**Вход:** `{ keyword, title, intro (первые 300 символов) }`
**Выход (Zod):**
```ts
z.object({
  seo_title:        z.string().max(60),
  meta_description: z.string().max(155),
  slug:             z.string().regex(/^[a-z0-9-]+$/),
  focus_keyword:    z.string(),
  image_alts:       z.array(z.string()).max(5),
})
```
Модель: `models.fast`. ~3–5 сек.

### Quality Gate Chain (`lib/chains/quality.ts`)
**Вход:** `{ keyword, article_text }`
**Выход (Zod):**
```ts
z.object({
  score_relevance: z.number().min(0).max(100),
  score_water:     z.number().min(0).max(100),
  score_structure: z.number().min(0).max(100),
  total:           z.number().min(0).max(100),
  decision:        z.enum(['publish', 'rewrite', 'reject']),
  issues:          z.array(z.string()),
  rewrite_hint:    z.string().nullable(),
})
```
Пороги: `>= 75` → publish, `50–74` → rewrite, `< 50` → reject.
Модель: `models.fast`. ~4–6 сек.

---

## Route Handlers

### POST /api/generate
Принимает `{ keyword: string }`. Возвращает SSE-стрим (`text/event-stream`). `maxDuration = 300`. Весь пайплайн внутри одного запроса. В событии `done` отдаёт готовый `content_html`.

---

## HTML на выходе — формат и разметка (`lib/html-builder.ts`)

Функция `buildHtml(content, seo)` собирает финальный HTML из `content_json` и SEO-данных.

### Структура готовой статьи

```html
<!-- SEO мета (для вставки в <head>) отдаётся отдельно как строки -->
<!-- seo_title, meta_description, focus_keyword — в полях статьи в БД -->

<article class="seo-article">

  <!-- H1 — один на страницу, содержит focus keyword -->
  <h1>Как выбрать диван в Москве: полный гид 2025</h1>

  <!-- Вводный абзац — focus keyword в первом предложении -->
  <p class="intro">Купить диван в Москве...</p>

  <!-- Секции — каждая H2 + параграфы -->
  <section>
    <h2>Типы диванов: угловые, прямые, модульные</h2>
    <p>...</p>
    <p>...</p>
  </section>

  <section>
    <h2>На что обратить внимание при выборе</h2>
    <!-- Если LLM вернул список — оборачиваем в <ul> -->
    <ul>
      <li>Размер и планировка комнаты</li>
      <li>Механизм трансформации</li>
    </ul>
  </section>

  <!-- Заключение -->
  <section class="conclusion">
    <h2>Итого</h2>
    <p>...</p>
  </section>

</article>
```

### Правила разметки в `buildHtml`

- Каждый абзац из `body` секции — отдельный `<p>`, разбивка по двойному переносу строки
- Если абзац начинается с `- ` или `* ` — это список, конвертировать в `<ul><li>...</li></ul>`
- Если абзац начинается с цифры и точки (`1. `) — `<ol><li>...</li></ol>`
- `<h1>` — только один, из `brief.title`
- `<h2>` — из `section.h2`, без дополнительных изменений
- Жирный текст: `**слово**` → `<strong>слово</strong>`
- Курсив: `*слово*` → `<em>слово</em>`
- Никаких inline-стилей — только семантические теги и классы `seo-article`, `intro`, `conclusion`
- В конце файла — отдельная функция `buildMetaSnippet(seo)` которая возвращает строку с готовыми мета-тегами для копирования:

```html
<title>Купить диван в Москве | Гид 2025</title>
<meta name="description" content="Как выбрать диван...">
<meta name="keywords" content="купить диван москва">
<link rel="canonical" href="https://site.ru/kupit-divan-moskva">
```

---

## UI (дашборд)

Тёмная тема. Шрифты: **Onest** (основной) + **JetBrains Mono** (числа, коды, ключи). Подключать через `next/font/google`.

Таблицы — **TanStack Table v8** (`@tanstack/react-table`): сортировка, фильтрация, пагинация на клиенте.

Серверное состояние — **TanStack Query v5** (`@tanstack/react-query`): fetching из Supabase, инвалидация после мутаций.

```ts
const { data: articles } = useQuery({
  queryKey: ['articles'],
  queryFn: () => supabase.from('articles').select('*').order('created_at', { ascending: false }),
})
```

### Экраны

**Дашборд** (`/`)
- Статы: всего / готово / отклонено / в процессе
- Таблица всех статей (TanStack Table): ключ / заголовок / статус / quality score / дата
- Клик по строке → переход на страницу статьи
- Supabase Realtime подписка → строка обновляется когда статья меняет статус

**Генерация** (`/generate`)
- Форма: текстовое поле для ключевого слова + кнопка "Сгенерировать"
- После запуска — живой прогресс (`stream-progress.tsx`):
  - Пять этапов: Research → Brief → Article → SEO → Quality
  - Каждый этап загорается активным при старте, становится "done" при завершении
  - По мере готовности секций — они появляются в превью статьи прямо на странице
  - Финальный quality score + rewrite_hint если есть
- После завершения — кнопка "Смотреть статью" (переход на `/articles/[id]`) или "Попробовать снова"

**Статья** (`/articles/[id]`)
- Две вкладки: **Превью** (рендер HTML) и **HTML** (сырой код в `<pre>`)
- Кнопка "Скопировать HTML" — копирует `content_html` в буфер обмена
- Кнопка "Скопировать мета-теги" — копирует `buildMetaSnippet(seo)` в буфер обмена
- SEO-панель сбоку: seo_title, meta_description, slug, focus_keyword, quality_score
- Кнопка "Регенерировать" — запускает новую генерацию с тем же keyword

**Статьи** (`/articles`)
- Фильтры: Все / Готово / Отклонено
- Строки со статусом `rejected` приглушены + показан `rewrite_hint`

**Настройки** (`/settings`)
- LLM: модель fast/quality, OpenRouter API ключ
- Минимальный quality score (ниже — статья помечается rejected)

---

## Переменные окружения

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# LLM (OpenRouter)
OPENROUTER_API_KEY=
LLM_MODEL_FAST=anthropic/claude-haiku-3-5
LLM_MODEL_QUALITY=anthropic/claude-sonnet-4-6
```

---

## Порядок реализации

1. `supabase/migrations/001_init.sql` — схема БД + Realtime
2. `lib/supabase/client.ts` и `server.ts`
3. `lib/llm.ts` — провайдер OpenRouter
4. `lib/chains/` — четыре цепочки с Zod + OutputFixingParser
5. `lib/serp-scraper.ts` — скрапинг конкурентов
6. `lib/html-builder.ts` — сборка HTML + мета-сниппет
7. `app/api/generate/route.ts` — SSE стрим
8. `hooks/use-generate-stream.ts` — клиентский хук
9. `components/stream-progress.tsx` — визуальный прогресс
10. `components/article-preview.tsx` — превью + кнопки копирования
11. UI: layout + sidebar + все экраны
12. Realtime подписка в дашборде

---

## Важные ограничения

- **`maxDuration = 300`** — Vercel Pro до 5 минут; на Hobby лимит 60 сек, статья не уложится
- **SSE разрыв** — клиент обрабатывает обрыв соединения и показывает ошибку
- **Параллельные секции** — батчи по 2, не все сразу (rate limit OpenRouter)
