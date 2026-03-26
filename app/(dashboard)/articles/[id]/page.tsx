import { notFound } from "next/navigation";
import { createServiceClient } from "@shared/api/supabase-server";
import { ArticleDetail } from "@entities/article";
import { Topbar } from "@shared/ui";
import type { Article } from "@shared/api";

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createServiceClient();

  const { data: article, error } = await supabase
    .from("articles")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !article) {
    notFound();
  }

  const typedArticle = article as Article;

  return (
    <>
      <Topbar title="Просмотр статьи" subtitle={typedArticle.keyword_text} />
      <div className="flex-1 overflow-y-auto p-4">
        <ArticleDetail article={typedArticle} />
      </div>
    </>
  );
}
