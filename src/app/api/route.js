import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req) {
  const { prompt } = await req.json();

  const response = await groq.chat.completions.create({
    model: process.env.LLAMA_MODEL,
    messages: [{ role: "user", content: prompt }],
  });

  return Response.json({
    reply: response.choices[0].message.content,
  });
}
