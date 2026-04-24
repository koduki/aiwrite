# frozen_string_literal: true

module Aiwrite
  module Validators
    VALID_PHASES = %w[structuring sampling refining drafting].freeze
    VALID_MODES = %w[chat scene retake].freeze
    MAX_MODEL_LENGTH = 200

    module_function

    def validate_openrouter_payload(payload)
      return fail_result("OpenRouter APIキーを入力してください。") unless non_empty_string?(payload["apiKey"])
      return fail_result("AI作家への依頼を入力してください。") unless non_empty_string?(payload["userInstruction"])
      return fail_result("モデル名が不正です。") if payload.key?("model") && !string_or_empty?(payload["model"])
      return fail_result("モデル名が長すぎます。") if payload["model"].is_a?(String) && payload["model"].length > MAX_MODEL_LENGTH
      return fail_result("不正なフェーズです。") if payload.key?("phase") && !VALID_PHASES.include?(payload["phase"])
      return fail_result("不正なモードです。") if payload.key?("mode") && !VALID_MODES.include?(payload["mode"])
      return fail_result("メッセージが不正です。") unless payload["messages"].is_a?(Array)

      payload["messages"].each do |msg|
        return fail_result("メッセージが不正です。") unless msg.is_a?(Hash)
        return fail_result("メッセージが不正です。") unless string_or_empty?(msg["role"]) && string_or_empty?(msg["content"])
      end

      success_result
    end

    def validate_board_update_payload(payload)
      return fail_result("OpenRouter APIキーを入力してください。") unless non_empty_string?(payload["apiKey"])
      return fail_result("モデル名が不正です。") if payload.key?("model") && !string_or_empty?(payload["model"])
      return fail_result("モデル名が長すぎます。") if payload["model"].is_a?(String) && payload["model"].length > MAX_MODEL_LENGTH
      return fail_result("不正なフェーズです。") if payload.key?("phase") && !VALID_PHASES.include?(payload["phase"])
      return fail_result("ユーザー指示が不正です。") unless string_or_empty?(payload["userInstruction"])
      return fail_result("AI応答が不正です。") unless string_or_empty?(payload["assistantResponse"])

      success_result
    end

    def non_empty_string?(value)
      value.is_a?(String) && !value.strip.empty?
    end

    def string_or_empty?(value)
      value.is_a?(String)
    end

    def success_result
      { ok: true }
    end

    def fail_result(message)
      { ok: false, error: message }
    end
  end
end
