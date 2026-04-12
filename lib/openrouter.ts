import type { ChatMessage, NarrativePhase, NovelSettings, Persona } from "./types";
import { INSTRUCTIONS_BY_MODE, PHASE_METADATA, SYSTEM_PROMPT_HEADER } from "./prompts";

export type OpenRouterRequest = {
  apiKey: string;
  model: string;
  phase: NarrativePhase;
  persona: Persona;
  settings: NovelSettings;
  messages: ChatMessage[];
  currentManuscript: string;
  userInstruction: string;
  mode: "chat" | "scene" | "retake";
};

export function buildSystemPrompt(persona: Persona, settings: NovelSettings, phase: NarrativePhase) {
  const activePhase = PHASE_METADATA.find((p) => p.id === phase);

  return [
    SYSTEM_PROMPT_HEADER,
    activePhase?.guide || "",
    "",
    `AIのキャラクター・トーク: ${persona.character || "知的で協力的、創作に熱心なAIアシスタント"}`,
    `ユーザーの呼び方: ${persona.userCall || "ユーザー"}`,
    `作家名: ${persona.name || "無名のAI作家"}`,
    `執筆する文体: ${persona.style || "読みやすく、情景と感情を両立する"}`,
    `執筆する視点: ${persona.pointOfView || "三人称またはユーザー指定に従う"}`,
    `執筆の得意ジャンル: ${persona.genres || "青春、恋愛、ファンタジー、現代ドラマ"}`,
    "",
    `作品タイトル: ${settings.title || "未定"}`,
    `コンセプト: ${settings.concept || "未設定"}`,
    `世界観: ${settings.worldView || "未設定"}`,
    `プロット: ${settings.plot || "未設定"}`,
    `キャラクター設定: ${settings.characters || "未設定"}`,
    `参照リンクやメモ: ${settings.referenceLinks || "なし"}`,
    `文体・本稿ルール: ${settings.writingRules || "未設定"}`,
  ].join("\n");
}

export function buildOpenRouterMessages(input: OpenRouterRequest) {
  const recentMessages = input.messages.slice(-10).map((message) => ({
    role: message.role,
    content: message.content,
  }));

  const activePhase = PHASE_METADATA.find((p) => p.id === input.phase);

  return [
    { role: "system", content: buildSystemPrompt(input.persona, input.settings, input.phase) },
    ...recentMessages,
    {
      role: "user",
      content: [
        activePhase?.instruction || "",
        INSTRUCTIONS_BY_MODE[input.mode],
        "",
        "現在の原稿:",
        input.currentManuscript || "まだ本文はありません。",
        "",
        "ユーザー依頼 (sanitized):",
        input.userInstruction,
      ].join("\n"),
    },
  ];
}
