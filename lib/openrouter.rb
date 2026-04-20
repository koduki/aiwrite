# frozen_string_literal: true

require_relative "prompts"

module Aiwrite
  module OpenRouter
    extend self

    # システムプロンプトを組み立てる
    def build_system_prompt(persona, settings, phase)
      active_phase = Prompts::PHASE_METADATA.find { |p| p[:id] == phase }

      [
        Prompts::SYSTEM_PROMPT_HEADER,
        active_phase&.dig(:guide) || "",
        "",
        "AIのキャラクター・トーク: #{persona['character'] || '知的で協力的、創作に熱心なAIアシスタント'}",
        "ユーザーの呼び方: #{persona['userCall'] || 'ユーザー'}",
        "作家名: #{persona['name'] || '無名のAI作家'}",
        "執筆する文体: #{persona['style'] || '読みやすく、情景と感情を両立する'}",
        "執筆する視点: #{persona['pointOfView'] || '三人称またはユーザー指定に従う'}",
        "執筆の得意ジャンル: #{persona['genres'] || '青春、恋愛、ファンタジー、現代ドラマ'}",
        "",
        "作品タイトル: #{settings['title'] || '未定'}",
        "コンセプト: #{settings['concept'] || '未設定'}",
        "世界観: #{settings['worldView'] || '未設定'}",
        "プロット: #{settings['plot'] || '未設定'}",
        "キャラクター設定: #{settings['characters'] || '未設定'}",
        "参照リンクやメモ: #{settings['referenceLinks'] || 'なし'}",
        "文体・本稿ルール: #{settings['writingRules'] || '未設定'}"
      ].join("\n")
    end

    # OpenRouter API に送るメッセージ配列を組み立てる
    def build_messages(input)
      messages = input["messages"] || []
      recent = messages.last(10).map { |m| { role: m["role"], content: m["content"] } }

      active_phase = Prompts::PHASE_METADATA.find { |p| p[:id] == input["phase"] }

      system_content = build_system_prompt(
        input["persona"] || {},
        input["settings"] || {},
        input["phase"]
      )

      user_content = [
        active_phase&.dig(:instruction) || "",
        Prompts::INSTRUCTIONS_BY_MODE[input["mode"]] || "",
        "",
        "現在の原稿:",
        (input["currentManuscript"].to_s.empty? ? "まだ本文はありません。" : input["currentManuscript"]),
        "",
        "ユーザー依頼:",
        input["userInstruction"]
      ].join("\n")

      [
        { role: "system", content: system_content },
        *recent,
        { role: "user", content: user_content }
      ]
    end
  end
end
