import { z } from "zod/v4";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { models } from "../llm";
import { parseWithRetry } from "./parse-with-retry";
import type { ArticleContentJson } from "@shared/api";

const qualitySchema = z.object({
  score_relevance: z
    .number()
    .min(0)
    .max(100)
    .describe("How relevant the article is to the keyword (0-100)"),
  score_water: z
    .number()
    .min(0)
    .max(100)
    .describe("Content density score — higher means less filler (0-100)"),
  score_structure: z
    .number()
    .min(0)
    .max(100)
    .describe("Structure and readability score (0-100)"),
  total: z.number().min(0).max(100).describe("Overall quality score (0-100)"),
  decision: z
    .enum(["publish", "rewrite", "reject"])
    .describe("Decision based on total score"),
  issues: z.array(z.string()).describe("List of specific issues found"),
  rewrite_hint: z
    .string()
    .nullable()
    .describe("Specific hint for improvement if rewrite is needed"),
});

export type QualityResult = z.infer<typeof qualitySchema>;

const parser = StructuredOutputParser.fromZodSchema(qualitySchema);

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are a content quality auditor. Evaluate an SEO article for quality.

Scoring rules:
- score_relevance: Does the article match the keyword intent? Are keywords used naturally?
- score_water: Is the content dense and valuable? Penalize filler/fluff text.
- score_structure: Are headings logical? Are paragraphs well-organized? Lists used where appropriate?
- total: Weighted average (relevance 40%, water 30%, structure 30%)
- decision: total >= 75 → "publish", 50-74 → "rewrite", < 50 → "reject"
- issues: List specific problems found
- rewrite_hint: If decision is "rewrite", provide actionable improvement hint. Null for "publish".

{format_instructions}`,
  ],
  [
    "human",
    `Keyword: {keyword}
Article content:

{article_text}

Evaluate this article:`,
  ],
]);

export async function runQualityChain(
  keyword: string,
  content: ArticleContentJson,
): Promise<QualityResult> {
  const articleText = [
    content.intro,
    ...content.sections.map((s) => `## ${s.h2}\n${s.body}`),
    content.conclusion,
  ].join("\n\n");

  const formatted = await prompt.format({
    keyword,
    article_text: articleText,
    format_instructions: parser.getFormatInstructions(),
  });

  const response = await models.fast.invoke(formatted);
  const text =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  return parseWithRetry(parser, text, models.fast);
}
