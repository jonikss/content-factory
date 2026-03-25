-- Articles table
create table articles (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid,            -- nullable for now; will become NOT NULL + FK to auth.users
  keyword_text     text not null,
  title            text,
  content_json     jsonb,           -- { intro, sections:[{h2,body}], conclusion }
  content_html     text,            -- ready HTML for copy-paste
  seo_title        text,
  meta_description text,
  slug             text,
  focus_keyword    text,
  quality_score    int,
  quality_decision text,            -- publish | rewrite | reject
  rewrite_hint     text,
  status           text default 'draft',
  -- draft | generating | done | rejected
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger articles_updated_at
  before update on articles
  for each row execute function update_updated_at();

-- Enable RLS (permissive for now — tighten when auth is added)
alter table articles enable row level security;

create policy "Allow all for now"
  on articles for all
  using (true)
  with check (true);

-- Index for common queries
create index articles_status_idx on articles (status);
create index articles_user_id_idx on articles (user_id);
create index articles_created_at_idx on articles (created_at desc);

-- Supabase Realtime
alter publication supabase_realtime add table articles;
