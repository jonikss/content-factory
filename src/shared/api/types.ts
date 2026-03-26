export interface ArticleContentJson {
  intro: string;
  sections: Array<{ h2: string; body: string }>;
  conclusion: string;
  word_count?: number;
}

export interface Article {
  id: string;
  user_id: string | null;
  keyword_text: string;
  title: string | null;
  content_json: ArticleContentJson | null;
  content_html: string | null;
  seo_title: string | null;
  meta_description: string | null;
  slug: string | null;
  focus_keyword: string | null;
  quality_score: number | null;
  quality_decision: "publish" | "rewrite" | "reject" | null;
  rewrite_hint: string | null;
  status: "draft" | "generating" | "done" | "rejected";
  created_at: string;
  updated_at: string;
}

export interface SeoMeta {
  seo_title: string;
  meta_description: string;
  slug: string;
  focus_keyword: string;
  image_alts: string[];
}
