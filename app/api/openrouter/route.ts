import { NextResponse } from "next/server";
import { buildOpenRouterMessages, type OpenRouterRequest } from "@/lib/openrouter";
import { validateOpenRouterPayload } from "@/lib/validation";

type OpenRouterChoice = {
  message?: {
    content?: string;
  };
};

export async function POST(request: Request) {
  let payload: OpenRouterRequest;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "JSONを読み取れませんでした。" }, { status: 400 });
  }

  const validation = validateOpenRouterPayload(payload as unknown as Record<string, unknown>);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${payload.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://aiwrite.local",
      "X-Title": "aiwrite",
    },
    body: JSON.stringify({
      model: payload.model || "openai/gpt-4o-mini",
      messages: buildOpenRouterMessages(payload),
      temperature: 0.85,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    return NextResponse.json(
      { error: `OpenRouterエラー: ${response.status}`, detail: errorBody.slice(0, 1200) },
      { status: response.status },
    );
  }

  const data = (await response.json()) as { choices?: OpenRouterChoice[] };
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    return NextResponse.json({ error: "AIの応答が空でした。" }, { status: 502 });
  }

  return NextResponse.json({ content });
}
