import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import { RunnableConfig } from "@langchain/core/runnables";
import { runBriefChain, type Brief } from "./chains/brief";
import { runArticleChain } from "./chains/article";
import { runSeoChain } from "./chains/seo";
import { runQualityChain, type QualityResult } from "./chains/quality";
import { scrapeSerp } from "./serp-scraper";

import { buildHtml, buildMetaSnippet } from "@shared/lib";
import type { ArticleContentJson, SeoMeta } from "@shared/api";

// --- State ---

const PipelineState = Annotation.Root({
  // Input
  keyword: Annotation<string>,

  // Pipeline stages
  competitorContext: Annotation<string>,
  brief: Annotation<Brief>,
  articleContent: Annotation<ArticleContentJson>,
  seo: Annotation<SeoMeta>,
  quality: Annotation<QualityResult>,

  // Output
  contentHtml: Annotation<string>,
  metaSnippet: Annotation<string>,
  finalStatus: Annotation<"done" | "rejected">,
});

export type PipelineStateType = typeof PipelineState.State;

// --- Callbacks ---

export type OnSectionCallback = (section: { h2: string; body: string }) => void;
export type OnStageStartCallback = (stage: string, message: string) => void;

function getCallbacks(config?: RunnableConfig) {
  const c = config?.configurable ?? {};
  return {
    onSection: c.onSection as OnSectionCallback | undefined,
    onStageStart: c.onStageStart as OnStageStartCallback | undefined,
  };
}

// --- Nodes ---

async function researchNode(state: PipelineStateType, config?: RunnableConfig) {
  getCallbacks(config).onStageStart?.("research", "Анализируем конкурентов...");
  const competitorContext = await scrapeSerp(state.keyword);
  console.log("Competitor context:", competitorContext);
  return { competitorContext };
}

async function briefNode(state: PipelineStateType, config?: RunnableConfig) {
  getCallbacks(config).onStageStart?.("brief", "Составляем ТЗ...");
  const brief = await runBriefChain(state.keyword, state.competitorContext);
  return { brief };
}

async function articleNode(state: PipelineStateType, config?: RunnableConfig) {
  const { onSection, onStageStart } = getCallbacks(config);
  onStageStart?.("article", "Пишем статью...");

  const articleContent = await runArticleChain(state.brief, (section) => {
    onSection?.(section);
  });
  return { articleContent };
}

async function seoNode(state: PipelineStateType, config?: RunnableConfig) {
  getCallbacks(config).onStageStart?.("seo", "Генерируем SEO мета...");
  const seo = await runSeoChain(
    state.keyword,
    state.brief.title,
    state.articleContent.intro,
  );
  return { seo };
}

async function qualityNode(state: PipelineStateType, config?: RunnableConfig) {
  getCallbacks(config).onStageStart?.("quality", "Проверяем качество...");
  const quality = await runQualityChain(state.keyword, state.articleContent);
  return { quality };
}

async function buildNode(state: PipelineStateType, config?: RunnableConfig) {
  getCallbacks(config).onStageStart?.("build", "Собираем HTML...");
  const contentHtml = buildHtml(
    state.articleContent,
    state.seo,
    state.brief.title,
  );
  const metaSnippet = buildMetaSnippet(state.seo);
  const finalStatus =
    state.quality.decision === "reject"
      ? ("rejected" as const)
      : ("done" as const);

  return { contentHtml, metaSnippet, finalStatus };
}

// --- Graph ---

const workflow = new StateGraph(PipelineState)
  .addNode("do_research", researchNode)
  .addNode("do_brief", briefNode)
  .addNode("do_article", articleNode)
  .addNode("do_seo", seoNode)
  .addNode("do_quality", qualityNode)
  .addNode("do_build", buildNode)
  .addEdge(START, "do_research")
  .addEdge("do_research", "do_brief")
  .addEdge("do_brief", "do_article")
  .addEdge("do_article", "do_seo")
  .addEdge("do_seo", "do_quality")
  .addEdge("do_quality", "do_build")
  .addEdge("do_build", END);

export const pipeline = workflow.compile();

// Map node names → SSE stage names
export const NODE_TO_STAGE: Record<string, string> = {
  do_research: "research",
  do_brief: "brief",
  do_article: "article",
  do_seo: "seo",
  do_quality: "quality",
  do_build: "build",
};
