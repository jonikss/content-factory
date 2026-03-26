import { ChatPromptTemplate } from "@langchain/core/prompts";
import { models } from "../llm";
import type { Brief } from "./brief";
import type { ArticleContentJson } from "@shared/api";

interface Section {
  h2: string;
  body: string;
}

const sectionPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are an expert SEO content writer. Write a detailed section for an article.

Rules:
- Write in Russian
- Use the H2 heading provided
- Include relevant LSI keywords naturally
- 200-400 words per section
- Use paragraphs separated by double newlines
- Use markdown lists (- item) where appropriate
- Use **bold** for key terms
- Write engaging, informative content
- No fluff or filler text`,
  ],
  [
    "human",
    `Article title: {title}
Section H2: {h2}
LSI keywords to include: {lsi_words}
Tone: {tone}

Write the section body (paragraphs only, no heading):`,
  ],
]);

const introPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are an expert SEO content writer. Write an engaging introduction for an article.

Rules:
- Write in Russian
- Include the focus keyword in the first sentence
- 100-200 words
- Hook the reader and explain what the article covers
- Use paragraphs separated by double newlines`,
  ],
  [
    "human",
    `Article title: {title}
Focus keyword: {keyword}
Sections covered: {sections_list}

Write the introduction:`,
  ],
]);

const conclusionPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are an expert SEO content writer. Write a concise conclusion for an article.

Rules:
- Write in Russian
- 80-150 words
- Summarize key points
- Include a call to action or final thought
- Use paragraphs separated by double newlines`,
  ],
  [
    "human",
    `Article title: {title}
Sections covered: {sections_list}

Write the conclusion:`,
  ],
]);

export async function runArticleChain(
  brief: Brief,
  onSection: (section: Section) => void,
): Promise<ArticleContentJson> {
  const sections: Section[] = [];

  // Generate sections in batches of 2
  for (let i = 0; i < brief.h2_sections.length; i += 2) {
    const batch = brief.h2_sections.slice(i, i + 2);

    const batchResults = await Promise.all(
      batch.map(async (h2) => {
        const formatted = await sectionPrompt.format({
          title: brief.title,
          h2,
          lsi_words: brief.lsi_words.join(", "),
          tone: brief.tone,
        });

        const response = await models.quality.invoke(formatted);
        const body =
          typeof response.content === "string"
            ? response.content
            : JSON.stringify(response.content);

        return { h2, body: body.trim() };
      }),
    );

    for (const section of batchResults) {
      sections.push(section);
      onSection(section);
    }
  }

  // Generate intro
  const introFormatted = await introPrompt.format({
    title: brief.title,
    keyword: brief.h2_sections[0] || brief.title,
    sections_list: brief.h2_sections.join(", "),
  });
  const introResponse = await models.quality.invoke(introFormatted);
  const intro =
    typeof introResponse.content === "string"
      ? introResponse.content.trim()
      : JSON.stringify(introResponse.content);

  // Generate conclusion
  const conclusionFormatted = await conclusionPrompt.format({
    title: brief.title,
    sections_list: brief.h2_sections.join(", "),
  });
  const conclusionResponse = await models.quality.invoke(conclusionFormatted);
  const conclusion =
    typeof conclusionResponse.content === "string"
      ? conclusionResponse.content.trim()
      : JSON.stringify(conclusionResponse.content);

  // Calculate word count
  const allText = [intro, ...sections.map((s) => s.body), conclusion].join(" ");
  const word_count = allText.split(/\s+/).length;

  return { intro, sections, conclusion, word_count };
}
