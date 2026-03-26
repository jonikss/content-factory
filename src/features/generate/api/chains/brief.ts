import { z } from "zod/v4";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { models } from "../llm";
import { parseWithRetry } from "./parse-with-retry";

const briefSchema = z.object({
  title: z.string().describe("SEO-optimized H1 title for the article"),
  h2_sections: z
    .array(z.string())
    .max(7)
    .describe("List of H2 section headings"),
  lsi_words: z.array(z.string()).max(15).describe("LSI keywords to include"),
  target_words: z.number().describe("Target word count for the article"),
  tone: z
    .enum(["informational", "commercial", "mixed"])
    .describe("Article tone"),
});

export type Brief = z.infer<typeof briefSchema>;

const parser = StructuredOutputParser.fromZodSchema(briefSchema);

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are an SEO content strategist. Given a keyword and competitor analysis, create a detailed content brief.

Rules:
- Title must contain the main keyword naturally
- 4-7 H2 sections covering the topic comprehensively
- Include LSI (related) keywords for semantic richness
- Target word count based on competitor analysis (usually 1500-3000)
- Determine tone from search intent

{format_instructions}`,
  ],
  [
    "human",
    `Keyword: {keyword}

Competitor analysis:
{competitor_context}

Create a content brief in Russian language.`,
  ],
]);

export async function runBriefChain(
  keyword: string,
  competitorContext: string,
): Promise<Brief> {
  const formatted = await prompt.format({
    keyword,
    competitor_context: competitorContext || "No competitor data available.",
    format_instructions: parser.getFormatInstructions(),
  });

  const response = await models.fast.invoke(formatted);
  const text =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  return parseWithRetry(parser, text, models.fast);
}
