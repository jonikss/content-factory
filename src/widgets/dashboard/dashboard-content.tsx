"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { createClient } from "@shared/api";
import { ArticlesTable } from "@widgets/articles-table";
import { Topbar } from "@shared/ui";
import type { Article } from "@shared/api";

function useArticles() {
  return useQuery({
    queryKey: ["articles"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("articles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Article[];
    },
  });
}

function useRealtimeArticles() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("articles-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "articles" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["articles"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

export function DashboardContent() {
  const { data: articles = [], isLoading } = useArticles();
  useRealtimeArticles();

  const done = articles.filter((a) => a.status === "done").length;
  const generating = articles.filter((a) => a.status === "generating").length;
  const rejected = articles.filter((a) => a.status === "rejected").length;
  const avgScore =
    articles.filter((a) => a.quality_score != null).length > 0
      ? Math.round(
          articles
            .filter((a) => a.quality_score != null)
            .reduce((sum, a) => sum + a.quality_score!, 0) /
            articles.filter((a) => a.quality_score != null).length,
        )
      : 0;

  const stats = [
    { label: "Готово", value: done, color: "text-green" },
    { label: "В процессе", value: generating, color: "text-accent" },
    { label: "Отклонено", value: rejected, color: "text-red" },
    { label: "Avg score", value: avgScore || "—", color: "text-text" },
  ];

  return (
    <>
      <Topbar title="Дашборд" subtitle={`${articles.length} статей всего`} />
      <div className="flex-1 overflow-y-auto p-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-bg2 border border-border rounded-lg px-3.5 py-3"
            >
              <div className="text-[10px] text-text3 uppercase tracking-wider mb-1">
                {stat.label}
              </div>
              <div
                className={`text-xl font-semibold font-mono tracking-tight ${stat.color}`}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="text-[10px] font-medium text-text3 uppercase tracking-wider mb-2">
          Статьи
        </div>
        {isLoading ? (
          <div className="text-xs text-text3 text-center py-8">Загрузка...</div>
        ) : (
          <ArticlesTable data={articles} />
        )}
      </div>
    </>
  );
}
