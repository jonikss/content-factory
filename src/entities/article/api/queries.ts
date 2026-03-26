"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@shared/api";
import type { Article } from "@shared/api";

export function useArticles() {
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
