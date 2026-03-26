import { z } from "zod/v4";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { models } from "../llm";
import { parseWithRetry } from "./parse-with-retry";
import type { SeoMeta } from "@shared/api";

const seoSchema = z.object({
  seo_title: z.string().max(60).describe("SEO title tag, max 60 chars"),
  meta_description: z
    .string()
    .max(155)
    .describe("Meta description, max 155 chars"),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .describe("URL slug, lowercase with hyphens"),
  focus_keyword: z.string().describe("Primary focus keyword"),
  image_alts: z
    .array(z.string())
    .max(5)
    .describe("Alt texts for potential images"),
});

const parser = StructuredOutputParser.fromZodSchema(seoSchema);

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are an SEO specialist. Generate optimized meta tags for an article.

Rules:
- SEO title: include focus keyword, max 60 characters
- Meta description: compelling, include keyword, max 155 characters
- Slug: transliterate from Russian to Latin, lowercase, hyphens only
- Focus keyword: the main search term
- Image alts: descriptive, include keyword variations

{format_instructions}`,
  ],
  [
    "human",
    `Keyword: {keyword}
Article title: {title}
Article intro: {intro}

Generate SEO meta data:`,
  ],
]);

export async function runSeoChain(
  keyword: string,
  title: string,
  intro: string,
): Promise<SeoMeta> {
  const formatted = await prompt.format({
    keyword,
    title,
    intro: intro.slice(0, 300),
    format_instructions: parser.getFormatInstructions(),
  });

  const response = await models.fast.invoke(formatted);
  const text =
    typeof response.content === "string"
      ? response.content
      : JSON.stringify(response.content);

  return parseWithRetry(parser, text, models.fast);
}
