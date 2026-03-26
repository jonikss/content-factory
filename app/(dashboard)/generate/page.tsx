"use client";

import { useState } from "react";
import Link from "next/link";
import { Topbar } from "@shared/ui";
import {
  StreamProgress,
  useGenerateStream,
  type StreamEvent,
} from "@features/generate";
import { ArticlePreview } from "@entities/article";

export default function GeneratePage() {
  const [keyword, setKeyword] = useState("");
  const { generate, events, running, sections, error } = useGenerateStream();

  // Extract data from events
  const briefData = events.find(
    (e): e is StreamEvent & { type: "stage_done" } =>
      e.type === "stage_done" && "stage" in e && e.stage === "brief",
  );
  const brief =
    briefData && "data" in briefData
      ? (briefData.data as { title?: string; h2_sections?: string[] })
      : null;

  const doneEvent = events.find(
    (e): e is StreamEvent & { type: "done" } => e.type === "done",
  );

  const handleGenerate = () => {
    if (keyword.trim() && !running) {
      generate(keyword.trim());
    }
  };

  return (
    <>
      <Topbar
        title="Новая статья"
        subtitle="введите ключевой запрос и запустите генерацию"
        actions={<></>}
      />
      <div className="flex-1 overflow-y-auto p-4">
        <div
          className="grid grid-cols-2 gap-3 h-full"
          style={{ minHeight: "530px" }}
        >
          {/* Left column */}
          <div className="flex flex-col gap-2.5">
            {/* Input card */}
            <div className="bg-bg2 border border-border rounded-lg p-3.5">
              <div className="text-[10px] text-text3 uppercase tracking-wider mb-1.5">
                Ключевой запрос
              </div>
              <input
                className="w-full bg-bg3 border border-border2 rounded-md px-2.5 py-2 text-text text-[13px] font-mono outline-none focus:border-accent mb-2.5"
                placeholder="напр. купить диван москва"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                disabled={running}
              />
              <button
                onClick={handleGenerate}
                disabled={running || !keyword.trim()}
                className="w-full py-2 rounded-md text-[11px] font-medium bg-accent text-white hover:bg-accent2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {running ? "Генерация..." : "Сгенерировать"}
              </button>
            </div>

            {/* Progress card */}
            <div className="bg-bg2 border border-border rounded-lg p-3.5 flex-1">
              <div className="text-[10px] text-text3 uppercase tracking-wider mb-1.5">
                Прогресс
              </div>
              {events.length > 0 ? (
                <StreamProgress
                  events={events}
                  sectionCount={sections.length}
                  totalSections={brief?.h2_sections?.length}
                />
              ) : (
                <div className="text-xs text-text3 text-center py-8">
                  Запустите генерацию для отслеживания прогресса
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="mt-3 p-2.5 bg-red/10 border border-red/20 rounded-md text-xs text-red">
                  {error}
                </div>
              )}

              {/* Done actions */}
              {doneEvent && (
                <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text2">Quality Score:</span>
                    <span
                      className={`font-mono text-sm font-semibold ${
                        doneEvent.score >= 75
                          ? "text-green"
                          : doneEvent.score >= 50
                            ? "text-amber"
                            : "text-red"
                      }`}
                    >
                      {doneEvent.score}
                    </span>
                    <span className="text-[10px] text-text3 font-mono">
                      ({doneEvent.decision})
                    </span>
                  </div>
                  {doneEvent.hint && (
                    <div className="text-[10px] text-amber">
                      {doneEvent.hint}
                    </div>
                  )}
                  <div className="flex gap-2 mt-1">
                    <Link
                      href={`/articles/${doneEvent.article_id}`}
                      className="px-3 py-1.5 rounded-md text-[11px] font-medium bg-accent text-white hover:bg-accent2 transition-colors"
                    >
                      Смотреть статью
                    </Link>
                    <button
                      onClick={() => {
                        setKeyword("");
                        window.location.reload();
                      }}
                      className="px-3 py-1.5 rounded-md text-[11px] font-medium bg-bg3 text-text2 border border-border hover:text-text transition-colors"
                    >
                      Попробовать снова
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right column — preview */}
          <ArticlePreview
            title={brief?.title}
            intro={undefined}
            sections={sections}
            contentHtml={doneEvent?.content_html}
            metaSnippet={doneEvent?.meta_snippet}
            isStreaming={running}
          />
        </div>
      </div>
    </>
  );
}
