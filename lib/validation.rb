# frozen_string_literal: true

module Aiwrite
  module Validation
    VALID_PHASES = %w[structuring sampling refining drafting].freeze
    VALID_MODES = %w[chat scene retake].freeze
    MAX_FIELD_LENGTH = 50_000
    MAX_MODEL_LENGTH = 200

    def self.validate_openrouter_payload(payload)
      return { ok: false, error: "OpenRouter APIキーを入力してください。" } if empty_string?(payload["apiKey"])
      return { ok: false, error: "AI作家への依頼を入力してください。" } if empty_string?(payload["userInstruction"])
      
      if payload["model"] && payload["model"].to_s.length > MAX_MODEL_LENGTH
        return { ok: false, error: "モデル名が長すぎます。" }
      end

      if payload["mode"] && !VALID_MODES.include?(payload["mode"])
        return { ok: false, error: "不正なモードです。" }
      end

      { ok: true }
    end

    def self.validate_board_update_payload(payload)
      return { ok: false, error: "OpenRouter APIキーを入力してください。" } if empty_string?(payload["apiKey"])
      
      if payload["model"] && payload["model"].to_s.length > MAX_MODEL_LENGTH
        return { ok: false, error: "モデル名が長すぎます。" }
      end

      if payload["phase"] && !VALID_PHASES.include?(payload["phase"])
        return { ok: false, error: "不正なフェーズです。" }
      end

      { ok: true }
    end

    def self.truncate(value, max = MAX_FIELD_LENGTH)
      return value if value.nil? || value.length <= max
      value[0, max]
    end

    private

    def self.empty_string?(value)
      value.nil? || value.to_s.strip.empty?
    end
  end
end
