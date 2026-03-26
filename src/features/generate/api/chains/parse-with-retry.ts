import type { ChatOpenAI } from "@langchain/openai";

interface Parseable {
  parse(output: string): Promise<unknown>;
}

/**
 * Parses LLM output with one retry attempt on failure.
 * Replaces the removed OutputFixingParser from langchain.
 */
export async function parseWithRetry<T>(
  parser: Parseable,
  output: string,
  llm: ChatOpenAI,
): Promise<T> {
  try {
    return (await parser.parse(output)) as T;
  } catch (firstError) {
    const fixPrompt = `The following output was supposed to be valid JSON matching a specific schema, but it failed to parse.

Error: ${firstError instanceof Error ? firstError.message : String(firstError)}

Original output:
${output}

Please return ONLY the corrected JSON, nothing else.`;

    const response = await llm.invoke(fixPrompt);
    const fixed =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    return (await parser.parse(fixed)) as T;
  }
}
