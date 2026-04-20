# frozen_string_literal: true

require "json"
require_relative "prompts"

module Aiwrite
  module BoardUpdate
    extend self

    # LLM 呼び出し用のペイロードを準備する
    def prepare_payload(input)
      persona  = input["persona"]  || {}
      settings = input["settings"] || {}

      user_content = [
        "現在フェーズ: #{input['phase']}",
        "",
        "AI作家ペルソナ:",
        "#{persona['name']}: #{persona['style']}",
        "",
        "現在のボード:",
        "タイトル: #{settings['title']}",
        "",
        "コンセプト:",
        settings["concept"].to_s.empty? ? "未設定" : settings["concept"],
        "",
        "キャラクター設定:",
        settings["characters"].to_s.empty? ? "未設定" : settings["characters"],
        "",
        "世界観・ルール:",
        settings["worldView"].to_s.empty? ? "未設定" : settings["worldView"],
        "",
        "プロット:",
        settings["plot"].to_s.empty? ? "未設定" : settings["plot"],
        "",
        "参照リンク・素材メモ:",
        settings["referenceLinks"].to_s.empty? ? "なし" : settings["referenceLinks"],
        "",
        "文体・本稿ルール:",
        settings["writingRules"].to_s.empty? ? "未設定" : settings["writingRules"],
        "",
        "最新のユーザー発言:",
        input["userInstruction"],
        "",
        "最新のAI応答:",
        input["assistantResponse"],
        "",
        Prompts::BOARD_UPDATE_PROMPTS[:user_footer]
      ].join("\n")

      {
        system_prompt: Prompts::BOARD_UPDATE_PROMPTS[:system],
        history: [],
        user_message: user_content
      }
    end

    # AI応答のJSON文字列をパースしてハッシュにする
    def parse(raw)
      trimmed = raw.strip
      json_text = if trimmed.start_with?("{")
                    trimmed
                  else
                    trimmed.match(/\{[\s\S]*\}/)&.to_s || "{}"
                  end

      parsed = JSON.parse(json_text)
      allowed = %w[title concept characters worldView plot referenceLinks writingRules]

      parsed.each_with_object({}) do |(key, value), result|
        result[key] = value.strip if allowed.include?(key) && value.is_a?(String)
      end
    end
  end
end
