import OpenAI from "openai";

export const openrouter = new OpenAI({
  baseURL: process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    "X-Title": "Medflow HMS",
  },
});

export const AI_MODEL =
  process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.1-8b-instruct:free";