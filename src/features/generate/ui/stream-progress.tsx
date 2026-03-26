"use client";

import type { StreamEvent } from "../model";

const stages = [
  { key: "research", label: "Research", num: "1" },
  { key: "brief", label: "Brief", num: "2" },
  { key: "article", label: "Article", num: "3" },
  { key: "seo", label: "SEO Meta", num: "4" },
  { key: "quality", label: "Quality Gate", num: "5" },
] as const;

type StageStatus = "idle" | "active" | "done";

function getStageStatuses(
  events: StreamEvent[],
): Record<string, { status: StageStatus; message: string }> {
  const result: Record<string, { status: StageStatus; message: string }> = {};

  for (const stage of stages) {
    result[stage.key] = { status: "idle", message: "ожидание" };
  }

  for (const event of events) {
    if (event.type === "stage") {
      result[event.stage] = { status: "active", message: event.message };
    }
    if (event.type === "stage_done") {
      const msg =
        event.stage === "research"
          ? "ТОП-5 конкурентов проанализированы"
          : event.stage === "brief"
            ? `ТЗ составлено`
            : event.stage === "article"
              ? "Статья написана"
              : event.stage === "seo"
                ? "Мета-данные сгенерированы"
                : "Проверка завершена";

      result[event.stage] = { status: "done", message: msg };
    }
  }

  return result;
}

interface StreamProgressProps {
  events: StreamEvent[];
  sectionCount?: number;
  totalSections?: number;
}

export function StreamProgress({
  events,
  sectionCount,
  totalSections,
}: StreamProgressProps) {
  const statuses = getStageStatuses(events);

  return (
    <div className="flex flex-col">
      {stages.map((stage) => {
        const { status, message } = statuses[stage.key];

        // Override article message with section count
        const displayMessage =
          stage.key === "article" && status === "active" && sectionCount != null
            ? `Пишем раздел ${sectionCount} из ${totalSections ?? "?"}...`
            : message;

        return (
          <div
            key={stage.key}
            className="flex items-start gap-2.5 py-2 border-b border-border last:border-b-0"
          >
            {/* Icon */}
            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-mono ${
                status === "done"
                  ? "border-green bg-green/10 text-green"
                  : status === "active"
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border2 text-text3"
              }`}
            >
              {status === "done" ? "✓" : status === "active" ? "●" : stage.num}
            </div>

            {/* Text */}
            <div>
              <div
                className={`text-xs font-medium ${
                  status === "active" || status === "done"
                    ? "text-text"
                    : "text-text2"
                }`}
              >
                {stage.label}
              </div>
              <div
                className={`text-[10px] font-mono mt-0.5 ${
                  status === "done" ? "text-green" : "text-text3"
                }`}
              >
                {displayMessage}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
