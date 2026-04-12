import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let payload: { apiKey: string; model?: string; userInstruction: string };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "JSONを読み取れませんでした。" }, { status: 400 });
  }

  if (!payload.apiKey) {
    return NextResponse.json({ error: "OpenRouter APIキーを入力してください。" }, { status: 400 });
  }

  if (!payload.userInstruction?.trim()) {
    return NextResponse.json({ isNextEpisode: false });
  }

  const systemPrompt = [
    "あなたはユーザーの指示の意図を分類するアシスタントです。",
    "ユーザーの入力が「次の話を書いて」「続きを書いて」「次の章へ進もう」など、現在の話から新しい話（新しいエピソード・章）へ移行して続きを書くことを求めているニュアンスが含まれているか判定してください。",
    "現在の話の中での単なる描写の追加や、設定の相談などであれば false としてください。",
    "出力は以下のJSONのみを出力してください。",
    '{"isNextEpisode": true} または {"isNextEpisode": false}',
  ].join("\n");

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
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: payload.userInstruction },
      ],
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    // 意図判定の失敗は致命的ではないので、デフォルトでfalseを返す
    return NextResponse.json({ isNextEpisode: false });
  }

  try {
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (content) {
      const parsed = JSON.parse(content);
      return NextResponse.json({ isNextEpisode: !!parsed.isNextEpisode });
    }
  } catch {
    // JSONパースエラーなどもfalseとして扱う
  }

  return NextResponse.json({ isNextEpisode: false });
}
