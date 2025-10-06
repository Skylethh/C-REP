/* eslint-env node */
/* global process, Response */
import Groq from "groq-sdk";

// This endpoint runs on the server; access env vars directly.
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
export const runtime = 'nodejs';

export async function POST(req) {
  const { prompt } = await req.json();

  const response = await groq.chat.completions.create({
    model: process.env.LLAMA_MODEL,
    messages: [{ role: "user", content: prompt }],
  });

  const reply = response?.choices?.[0]?.message?.content ?? null;

  return new Response(JSON.stringify({ reply }), {
    headers: { "Content-Type": "application/json" },
  });
}
