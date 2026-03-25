import { NextRequest } from "next/server";
import {
  pipeline,
  NODE_TO_STAGE,
  type OnSectionCallback,
  type OnStageStartCallback,
} from "@features/generate/api";
import { createServiceClient } from "@shared/api/supabase-server";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { keyword } = await req.json();
  const supabase = createServiceClient();
  const encoder = new TextEncoder();

  const send = (
    controller: ReadableStreamDefaultController,
    event: string,
    data: object,
  ) => {
    controller.enqueue(
      encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
    );
  };

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // 1. Create article record
        const { data: article, error: insertError } = await supabase
          .from("articles")
          .insert({ keyword_text: keyword, status: "generating" })
          .select()
          .single();

        if (insertError || !article) {
          send(controller, "error", {
            message: insertError?.message ?? "Failed to create article",
          });
          controller.close();
          return;
        }

        send(controller, "start", { article_id: article.id, keyword });

        // Callbacks — called from inside LangGraph nodes
        const onStageStart: OnStageStartCallback = (stage, message) => {
          send(controller, "stage", { stage, message });
        };

        const onSection: OnSectionCallback = (section) => {
          send(controller, "section", { h2: section.h2, body: section.body });
        };

        // 2. Run LangGraph pipeline with streaming updates
        const eventStream = await pipeline.stream(
          { keyword },
          {
            streamMode: "updates",
            configurable: { onStageStart, onSection },
          },
        );

        let finalState: Record<string, unknown> = {};

        for await (const update of eventStream) {
          for (const [nodeName, nodeOutput] of Object.entries(update)) {
            const stageName = NODE_TO_STAGE[nodeName];
            if (!stageName) continue;

            // Merge into final state
            if (nodeOutput && typeof nodeOutput === "object") {
              finalState = { ...finalState, ...nodeOutput };
            }

            // Send stage_done with relevant data
            const doneData: Record<string, unknown> = { stage: stageName };

            if (stageName === "brief" && finalState.brief) {
              doneData.data = finalState.brief;
            }
            if (stageName === "seo" && finalState.seo) {
              doneData.data = finalState.seo;
            }
            if (stageName === "quality" && finalState.quality) {
              doneData.data = finalState.quality;
            }

            send(controller, "stage_done", doneData);
          }
        }

        // 3. Save to DB
        const {
          brief,
          articleContent,
          seo,
          quality,
          contentHtml,
          metaSnippet,
          finalStatus,
        } = finalState as {
          brief: { title: string };
          articleContent: object;
          seo: {
            seo_title: string;
            meta_description: string;
            slug: string;
            focus_keyword: string;
          };
          quality: {
            total: number;
            decision: string;
            rewrite_hint: string | null;
          };
          contentHtml: string;
          metaSnippet: string;
          finalStatus: string;
        };

        await supabase
          .from("articles")
          .update({
            title: brief.title,
            content_json: articleContent,
            content_html: contentHtml,
            seo_title: seo.seo_title,
            meta_description: seo.meta_description,
            slug: seo.slug,
            focus_keyword: seo.focus_keyword,
            quality_score: quality.total,
            quality_decision: quality.decision,
            rewrite_hint: quality.rewrite_hint,
            status: finalStatus,
          })
          .eq("id", article.id);

        send(controller, "done", {
          article_id: article.id,
          decision: quality.decision,
          score: quality.total,
          hint: quality.rewrite_hint,
          content_html: contentHtml,
          meta_snippet: metaSnippet,
        });
      } catch (err) {
        send(controller, "error", { message: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
