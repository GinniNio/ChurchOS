import OpenAI from "openai";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY ?? "",
  baseURL: "https://api.groq.com/openai/v1",
});

export const AI_MODEL = "llama-3.1-8b-instant";
export const AI_ENABLED = !!process.env.OPENAI_API_KEY;
