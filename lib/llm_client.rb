# frozen_string_literal: true

require "ruby_llm"

module Aiwrite
  # RubyLLM を使った LLM クライアント。
  # BYOK のため、リクエストごとに API キーを受け取り動的に設定する。
  # 将来的に MCP 対応やエージェント対応を行う際にもこのモジュール経由で拡張する。
  module LlmClient
    extend self

    MUTEX = Mutex.new

    # OpenRouter 経由で Chat Completions を呼び出す。
    # BYOK 対応: リクエストごとに api_key を設定する。
    # スレッド安全性のため Mutex で保護する。
    #
    # @param api_key [String] OpenRouter API キー
    # @param model [String] モデル ID (例: "anthropic/claude-3.5-sonnet")
    # @param system_prompt [String] システムプロンプト
    # @param messages [Array<Hash>] 過去のメッセージ履歴 [{ role:, content: }]
    # @param user_message [String] 今回のユーザーメッセージ
    # @param temperature [Float] 温度パラメータ
    # @param params [Hash] 追加パラメータ (例: response_format)
    # @return [Hash] { ok: true, content: "..." } or { ok: false, status: N, detail: "..." }
    def chat(api_key:, model:, system_prompt:, messages: [], user_message:, temperature: 0.85, params: {})
      MUTEX.synchronize do
        configure_for_request!(api_key)

        chat = RubyLLM.chat(model: model, assume_model_exists: true)
          .with_instructions(system_prompt)
          .with_temperature(temperature)

        # 追加パラメータ (例: response_format for JSON mode)
        chat = chat.with_params(params) unless params.empty?

        # 過去のメッセージ履歴を復元
        messages.each do |msg|
          role = (msg[:role] || msg["role"]).to_sym
          content = msg[:content] || msg["content"]
          chat.add_message(role: role, content: content)
        end

        # ユーザーメッセージを送信して応答を取得
        response = chat.ask(user_message)
        content = response.content.to_s.strip

        if content.empty?
          { ok: false, status: 502, detail: "AIの応答が空でした。" }
        else
          { ok: true, content: content }
        end
      end
    rescue RubyLLM::Error => e
      { ok: false, status: 502, detail: "LLMエラー: #{e.class.name}" }
    rescue StandardError => e
      { ok: false, status: 500, detail: "内部エラーが発生しました。" }
    end

    private

    def configure_for_request!(api_key)
      RubyLLM.configure do |config|
        config.openrouter_api_key = api_key
      end
    end
  end
end
