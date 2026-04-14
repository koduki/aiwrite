import { NextResponse } from "next/server";

const MAX_TEXT_LENGTH = 6000;
const MAX_RESPONSE_BYTES = 1_000_000; // 1 MB

function extractReadableText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

export async function POST(request: Request) {
  const { url, text } = (await request.json()) as { url?: string; text?: string };

  if (text?.trim()) {
    return NextResponse.json({ importedText: text.trim().slice(0, MAX_TEXT_LENGTH) });
  }

  if (!url?.trim()) {
    return NextResponse.json({ error: "URLまたはテキストを入力してください。" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "URLの形式が正しくありません。" }, { status: 400 });
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json({ error: "httpまたはhttpsのURLのみ読み込めます。" }, { status: 400 });
  }

  const response = await fetch(parsed.toString(), {
    headers: {
      "User-Agent": "aiwrite-settings-importer/0.1",
    },
  });

  if (!response.ok) {
    return NextResponse.json({ error: `URLを読み込めませんでした: ${response.status}` }, { status: 502 });
  }

  const contentLength = Number(response.headers.get("content-length") || "0");
  if (contentLength > MAX_RESPONSE_BYTES) {
    return NextResponse.json({ error: "レスポンスが大きすぎます。" }, { status: 502 });
  }

  const body = await response.text();
  if (body.length > MAX_RESPONSE_BYTES) {
    return NextResponse.json({ error: "レスポンスが大きすぎます。" }, { status: 502 });
  }

  const contentType = response.headers.get("content-type") || "";
  const importedText = contentType.includes("text/html") ? extractReadableText(body) : body.slice(0, MAX_TEXT_LENGTH);

  return NextResponse.json({ importedText });
}
