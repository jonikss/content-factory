# Content Factory — Архитектура

## Обзор

Контент-завод: вводим ключевые запросы, система генерирует готовые SEO-статьи через LLM. На выходе — статья с HTML-разметкой для копирования. Генерация через SSE-стриминг — пользователь видит прогресс каждого этапа в реальном времени.

---

## Стек

| Слой | Технология |
|---|---|
| Frontend + API | Next.js 16, App Router, TypeScript |
| База данных | Supabase (Postgres + Realtime) |
| LLM-пайплайн | LangGraph.js (StateGraph) + LangChain.js + Zod v4 |
| LLM API | Любой OpenAI-совместимый API (OpenRouter, Together, Groq, Ollama и др.) |
| Стили | Tailwind CSS v4 |
| Таблицы | TanStack Table v8 |
| Серверное состояние | TanStack Query v5 |
| SERP-скрапинг | Cheerio (Google + Yandex параллельно) |
| Шрифты | Onest (основной) + JetBrains Mono (моно) |

---

## Структура проекта (FSD)

Проект организован по **Feature-Sliced Design** — послойная архитектура с однонаправленными зависимостями: `shared → entities → features → widgets → app`.

```
content-factory/
├── app/                                   # Next.js App Router (тонкий routing-слой)
│   ├── layout.tsx                         # Root layout (шрифты, html)
│   ├── globals.css                        # Tailwind v4 + тема
│   ├── (dashboard)/
│   │   ├── layout.tsx                     # Shell: sidebar + providers
│   │   ├── page.tsx                       # Дашборд — статы + таблица
│   │   ├── generate/page.tsx              # Страница генерации + стрим
│   │   ├── articles/
│   │   │   ├── page.tsx                   # Список статей с фильтрами
│   │   │   └── [id]/page.tsx              # Просмотр статьи (Server Component)
│   │   └── settings/page.tsx              # Настройки системы
│   └── api/
│       └── generate/route.ts              # POST — SSE стриминг генерации
│
├── src/
│   ├── shared/                            # Переиспользуемые утилиты, UI, API-клиенты
│   │   ├── api/
│   │   │   ├── index.ts                   # Barrel (client-safe): createClient + типы
│   │   │   ├── supabase-client.ts         # Браузерный клиент (@supabase/ssr)
│   │   │   ├── supabase-server.ts         # Серверные клиенты (cookie + service role)
│   │   │   └── types.ts                   # Article, ArticleContentJson, SeoMeta
│   │   ├── lib/
│   │   │   ├── index.ts
│   │   │   └── html-builder.ts            # content_json → HTML + мета-сниппет
│   │   └── ui/
│   │       ├── index.ts
│   │       ├── status-badge.tsx           # done/generating/draft/rejected
│   │       └── topbar.tsx                 # Верхняя панель
│   │
│   ├── entities/                          # Бизнес-сущности
│   │   └── article/
│   │       ├── index.ts                   # Barrel: ArticlePreview, ArticleDetail, useArticles
│   │       ├── api/queries.ts             # useArticles() — TanStack Query + Supabase
│   │       └── ui/
│   │           ├── article-detail.tsx     # Детальная страница + SEO панель
│   │           └── article-preview.tsx    # Превью/HTML вкладки + копирование
│   │
│   ├── features/                          # Пользовательские фичи
│   │   └── generate/
│   │       ├── index.ts                   # Client-safe barrel: StreamProgress + useGenerateStream
│   │       ├── api/
│   │       │   ├── index.ts               # Server barrel: pipeline, NODE_TO_STAGE, типы
│   │       │   ├── llm.ts                 # LLM провайдер (lazy init, OpenAI-compatible)
│   │       │   ├── pipeline.ts            # LangGraph StateGraph пайплайн
│   │       │   ├── serp-scraper.ts        # Google + Yandex скрапинг (параллельно)
│   │       │   └── chains/
│   │       │       ├── brief.ts           # Keyword → ТЗ
│   │       │       ├── article.ts         # ТЗ → статья секциями
│   │       │       ├── seo.ts             # Статья → мета-данные
│   │       │       ├── quality.ts         # Статья → score + decision
│   │       │       └── parse-with-retry.ts # Retry-парсер (замена OutputFixingParser)
│   │       ├── model/
│   │       │   └── use-generate-stream.ts # SSE клиент: fetch + getReader
│   │       └── ui/
│   │           └── stream-progress.tsx    # 5 этапов генерации (idle/active/done)
│   │
│   └── widgets/                           # Составные блоки страниц
│       ├── sidebar/sidebar.tsx            # Навигация (usePathname)
│       ├── dashboard/dashboard-content.tsx # Статы + таблица + Realtime
│       ├── articles-table/articles-table.tsx # TanStack Table: сортировка, пагинация
│       └── providers/providers.tsx         # QueryClientProvider
│
├── proxy.ts                               # Next.js 16 proxy (бывш. middleware)
├── supabase/migrations/001_init.sql       # Схема БД + RLS + Realtime
├── tsconfig.json                          # Path aliases (@shared, @entities, @features, @widgets)
├── .env.local                             # Секреты (не в git)
└── .env.example                           # Шаблон переменных
```

### Path aliases (tsconfig.json)

```json
{
  "@/*": ["./*"],
  "@shared/*": ["./src/shared/*"],
  "@entities/*": ["./src/entities/*"],
  "@features/*": ["./src/features/*"],
  "@widgets/*": ["./src/widgets/*"]
}
```

### Client/Server разделение barrel-экспортов

Ключевое правило: barrel-файлы (`index.ts`) на уровне фичи экспортируют **только client-safe** код. Серверный код импортируется напрямую из подпапки `api/`.

| Импорт | Содержит | Где используется |
|--------|----------|------------------|
| `@features/generate` | `StreamProgress`, `useGenerateStream` | Client Components |
| `@features/generate/api` | `pipeline`, `NODE_TO_STAGE`, типы | `app/api/generate/route.ts` |
| `@shared/api` | `createClient`, типы | Client Components |
| `@shared/api/supabase-server` | `createClient`, `createServiceClient` | Server Components, API routes |

Это предотвращает попадание Node.js-модулей (`async_hooks`) в клиентский бандл.

---

## Схема базы данных

```sql
create table articles (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid,            -- nullable сейчас; NOT NULL + FK при добавлении auth
  keyword_text     text not null,
  title            text,
  content_json     jsonb,           -- { intro, sections:[{h2,body}], conclusion, word_count }
  content_html     text,            -- готовый HTML
  seo_title        text,
  meta_description text,
  slug             text,
  focus_keyword    text,
  quality_score    int,
  quality_decision text,            -- publish | rewrite | reject
  rewrite_hint     text,
  status           text default 'draft',  -- draft | generating | done | rejected
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);
```

- RLS включён с permissive policy `USING (true)` — будет ужесточён при добавлении auth
- Индексы: `status`, `user_id`, `created_at desc`
- Realtime включён для таблицы `articles`
- Триггер `updated_at` обновляется автоматически

---

## LangGraph пайплайн

Генерация реализована как **LangGraph StateGraph** — типизированный граф с состоянием, где каждый узел обрабатывает один этап и возвращает обновление состояния.

### Граф

```
START → do_research → do_brief → do_article → do_seo → do_quality → do_build → END
```

### Состояние (`PipelineState`)

```typescript
const PipelineState = Annotation.Root({
  keyword:           Annotation<string>,        // Вход
  competitorContext:  Annotation<string>,        // SERP-данные
  brief:             Annotation<Brief>,          // ТЗ
  articleContent:     Annotation<ArticleContentJson>, // Статья
  seo:               Annotation<SeoMeta>,        // SEO мета
  quality:           Annotation<QualityResult>,  // Оценка
  contentHtml:       Annotation<string>,         // HTML
  metaSnippet:       Annotation<string>,         // <title> + <meta>
  finalStatus:       Annotation<"done" | "rejected">,
});
```

### Узлы

| Узел | Стейдж | Модель | Описание |
|------|--------|--------|----------|
| `do_research` | research | — | Параллельный скрапинг Yandex + Google, cheerio |
| `do_brief` | brief | fast | Keyword + competitors → ТЗ (title, h2, LSI, tone) |
| `do_article` | article | quality | ТЗ → секции батчами по 2 + intro + conclusion |
| `do_seo` | seo | fast | → seo_title, meta_description, slug, focus_keyword |
| `do_quality` | quality | fast | → scores, decision (publish/rewrite/reject), hint |
| `do_build` | build | — | buildHtml() + buildMetaSnippet() + finalStatus |

### Стриминг

Пайплайн запускается через `pipeline.stream()` с `streamMode: 'updates'`. Каждый узел при старте вызывает `onStageStart` callback (передаётся через `configurable`), который отправляет SSE-событие `stage` клиенту. После завершения узла автоматически отправляется `stage_done`.

```
pipeline.stream({ keyword }, {
  streamMode: 'updates',
  configurable: { onStageStart, onSection },
})
```

Узел `do_article` дополнительно вызывает `onSection` callback для каждой сгенерированной секции — клиент видит live-превью.

---

## SERP-скрапинг

`scrapeSerp(keyword)` — параллельный запрос к **Google** и **Yandex**:

1. Запрос SERP-страницы обоих поисковиков
2. Извлечение URL-ов органических результатов (до 5 с каждого)
3. Загрузка страниц конкурентов
4. Извлечение: title, description, headings (h1–h3)
5. Форматирование для промта

Fallback: если страницы конкурентов недоступны — используются сниппеты из SERP.
При ошибках обоих — `"No competitor data available."`.

---

## LLM провайдер

Два инстанса `ChatOpenAI` через LangChain с **lazy-инициализацией** (чтобы не падать при отсутствии ключа на этапе импорта):

```typescript
export const models = {
  get fast()    { /* lazy init */ },
  get quality() { /* lazy init */ },
}
```

Подключается к любому OpenAI-compatible API через:
- `LLM_BASE_URL` — endpoint (по умолчанию OpenRouter)
- `LLM_API_KEY` — ключ
- `LLM_MODEL_FAST` / `LLM_MODEL_QUALITY` — имена моделей

Все LLM-цепочки используют `StructuredOutputParser` (Zod v4) + `parseWithRetry` (один LLM-ретрай при невалидном JSON, замена удалённого `OutputFixingParser`).

---

## HTML-разметка (`shared/lib/html-builder.ts`)

`buildHtml(content, seo, title)` → семантический HTML:
- `<article class="seo-article">` обёртка
- Один `<h1>` из title
- `<p class="intro">` для вступления
- `<section>` + `<h2>` для каждого раздела
- `<section class="conclusion">` для заключения
- Двойной перенос → отдельные `<p>`
- `- ` / `* ` → `<ul><li>`
- `1. ` → `<ol><li>`
- `**bold**` → `<strong>`, `*italic*` → `<em>`
- Без inline-стилей

`buildMetaSnippet(seo)` → `<title>` + `<meta>` + `<link rel="canonical">`.

---

## Клиентская архитектура

### SSE Hook (`features/generate/model/use-generate-stream.ts`)
- `fetch('/api/generate')` + `getReader()` + `TextDecoder`
- Парсинг SSE: `event: ...\ndata: ...\n\n`
- Возвращает: `{ generate, events, running, articleId, sections, error }`
- Обработка обрыва соединения

### Состояние
- **TanStack Query** — серверные данные (список статей)
- **Supabase Realtime** — подписка на изменения таблицы `articles` → инвалидация кэша
- **localStorage** — пользовательские настройки (модели, пороги, тогглы)

### Routing (Next.js 16 App Router)
- `(dashboard)` route group — общий layout с sidebar
- Server Components для data-fetching страниц (`articles/[id]`)
- Client Components для интерактивных (`'use client'`)
- `params` — Promise, обязательно `await`

---

## SSE-протокол

| Событие | Данные | Когда |
|---------|--------|-------|
| `start` | `{ article_id, keyword }` | Статья создана в БД |
| `stage` | `{ stage, message }` | Начало этапа (onStageStart callback) |
| `section` | `{ h2, body }` | Готова секция статьи |
| `stage_done` | `{ stage, data? }` | Этап завершён |
| `done` | `{ article_id, decision, score, hint, content_html, meta_snippet }` | Генерация завершена |
| `error` | `{ message }` | Ошибка |

---

## UI / Тема

Тёмная тема. Дизайн-токены в `globals.css` через Tailwind v4 `@theme inline`:

| Токен | Значение | Назначение |
|-------|----------|------------|
| `--color-bg` | `#0c0d0f` | Основной фон |
| `--color-bg2` | `#141518` | Карточки, sidebar |
| `--color-bg3` | `#1c1d21` | Инпуты, ховеры |
| `--color-bg4` | `#242529` | Активные элементы |
| `--color-accent` | `#7b6ef6` | Акцент (фиолетовый) |
| `--color-green` | `#3ecf8e` | Успех, done |
| `--color-red` | `#f4645f` | Ошибка, rejected |
| `--color-amber` | `#f5a623` | Предупреждение |
| `--color-blue` | `#4facf7` | H2 заголовки |

### Экраны
1. **Дашборд** (`/`) — статы + таблица статей + Realtime
2. **Генерация** (`/generate`) — форма + прогресс 5 этапов + live-превью
3. **Статьи** (`/articles`) — поиск + фильтры + таблица
4. **Статья** (`/articles/[id]`) — превью/HTML/мета вкладки + SEO панель + копирование
5. **Настройки** (`/settings`) — LLM config + quality thresholds + тогглы

---

## Переменные окружения

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# LLM (любой OpenAI-совместимый API)
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=
LLM_MODEL_FAST=anthropic/claude-haiku-3-5
LLM_MODEL_QUALITY=anthropic/claude-sonnet-4-6
```

---

## Подготовка к авторизации

Проект подготовлен к добавлению auth:
- `articles.user_id` — nullable колонка, будет NOT NULL + FK на `auth.users`
- RLS включён с permissive policy — заменить на `auth.uid() = user_id`
- `shared/api/supabase-server.ts` — два клиента: `createClient()` (cookie-based, для auth) и `createServiceClient()` (service role, для MVP)
- `proxy.ts` — заготовка для session refresh, добавить redirect для неавторизованных
- При добавлении auth: login страница, RLS политики, populate user_id, убрать service role из API routes

---

## Next.js 16 — ключевые отличия

- `middleware.ts` → `proxy.ts` (переименование), экспорт `export function proxy()`
- `params` и `searchParams` — Promise, обязательно `await`
- `cookies()` и `headers()` — async
- Turbopack по умолчанию (dev и build)
- Tailwind v4: `@theme inline` в CSS, без `tailwind.config.js`
- React 19.2 (View Transitions, useEffectEvent, Activity)
