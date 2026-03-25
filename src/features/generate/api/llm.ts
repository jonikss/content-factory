import { ChatOpenAI } from '@langchain/openai'

// Any OpenAI-compatible API: OpenRouter, Together, Groq, local vLLM/Ollama, etc.

function createModel(tier: 'fast' | 'quality'): ChatOpenAI {
  const baseURL = process.env.LLM_BASE_URL ?? 'https://openrouter.ai/api/v1'
  const apiKey = process.env.LLM_API_KEY

  if (!apiKey) {
    throw new Error('LLM_API_KEY is not set. Add it to .env.local')
  }

  return new ChatOpenAI({
    modelName:
      tier === 'fast'
        ? (process.env.LLM_MODEL_FAST ?? 'anthropic/claude-haiku-3-5')
        : (process.env.LLM_MODEL_QUALITY ?? 'anthropic/claude-sonnet-4-6'),
    apiKey,
    configuration: { baseURL, apiKey },
    temperature: tier === 'fast' ? 0.4 : 0.6,
  })
}

let _fast: ChatOpenAI | null = null
let _quality: ChatOpenAI | null = null

export const models = {
  get fast() {
    if (!_fast) _fast = createModel('fast')
    return _fast
  },
  get quality() {
    if (!_quality) _quality = createModel('quality')
    return _quality
  },
}
