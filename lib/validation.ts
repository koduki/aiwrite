/**
 * APIリクエストのランタイムバリデーション
 */

import type { NarrativePhase } from "./types";

const VALID_PHASES: ReadonlySet<string> = new Set<NarrativePhase>([
  "structuring",
  "sampling",
  "refining",
  "drafting",
]);

const VALID_MODES: ReadonlySet<string> = new Set(["chat", "scene", "retake"]);

const MAX_MODEL_LENGTH = 200;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export type ValidationResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * OpenRouter APIリクエストのバリデーション
 */
export function validateOpenRouterPayload(payload: Record<string, unknown>): ValidationResult {
  if (!isNonEmptyString(payload.apiKey)) {
    return { ok: false, error: "OpenRouter APIキーを入力してください。" };
  }
  if (!isNonEmptyString(payload.userInstruction)) {
    return { ok: false, error: "AI作家への依頼を入力してください。" };
  }
  if (typeof payload.model === "string" && payload.model.length > MAX_MODEL_LENGTH) {
    return { ok: false, error: "モデル名が長すぎます。" };
  }
  if (payload.phase !== undefined && !VALID_PHASES.has(payload.phase as string)) {
    return { ok: false, error: "不正なフェーズです。" };
  }
  if (payload.mode !== undefined && !VALID_MODES.has(payload.mode as string)) {
    return { ok: false, error: "不正なモードです。" };
  }
  if (!Array.isArray(payload.messages)) {
    return { ok: false, error: "メッセージが不正です。" };
  }
  return { ok: true };
}

/**
 * Board Update APIリクエストのバリデーション
 */
export function validateBoardUpdatePayload(payload: Record<string, unknown>): ValidationResult {
  if (!isNonEmptyString(payload.apiKey)) {
    return { ok: false, error: "OpenRouter APIキーを入力してください。" };
  }
  if (typeof payload.model === "string" && payload.model.length > MAX_MODEL_LENGTH) {
    return { ok: false, error: "モデル名が長すぎます。" };
  }
  if (payload.phase !== undefined && !VALID_PHASES.has(payload.phase as string)) {
    return { ok: false, error: "不正なフェーズです。" };
  }
  return { ok: true };
}
