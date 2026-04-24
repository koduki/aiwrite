# frozen_string_literal: true

require "ruby_llm"

module Aiwrite
  class RubyLlmClient
    def chat_completion(api_key:, model:, messages:, temperature:, json_response: false)
      model_name = model.to_s.empty? ? "openai/gpt-4o-mini" : model

      response = invoke_ruby_llm(
        api_key: api_key,
        model: model_name,
        messages: messages,
        temperature: temperature,
        json_response: json_response
      )

      content = extract_text(response)
      raise "AIの応答が空でした。" if content.empty?

      content
    end

    private

    def invoke_ruby_llm(api_key:, model:, messages:, temperature:, json_response:)
      # RubyLLM の代表的なインターフェースを優先順で試す。
      if defined?(RubyLLM::Client)
        client = RubyLLM::Client.new(provider: :openrouter, api_key: api_key)
        if client.respond_to?(:chat)
          return client.chat(
            model: model,
            messages: messages,
            temperature: temperature,
            response_format: (json_response ? { type: "json_object" } : nil)
          )
        end
      end

      if RubyLLM.respond_to?(:chat)
        return RubyLLM.chat(
          provider: :openrouter,
          api_key: api_key,
          model: model,
          messages: messages,
          temperature: temperature,
          response_format: (json_response ? { type: "json_object" } : nil)
        )
      end

      raise "RubyLLMのchatインターフェースが見つかりませんでした。"
    rescue StandardError => e
      raise "RubyLLM呼び出しに失敗しました: #{e.message}"
    end

    def extract_text(response)
      return response.to_s.strip if response.is_a?(String)

      text = response.respond_to?(:content) ? response.content : nil
      text ||= response.respond_to?(:text) ? response.text : nil
      text ||= response.dig("choices", 0, "message", "content") if response.is_a?(Hash)
      text.to_s.strip
    end
  end
end
