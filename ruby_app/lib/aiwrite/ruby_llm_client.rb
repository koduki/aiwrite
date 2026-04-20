# frozen_string_literal: true

require "json"
require "net/http"
require "uri"

module Aiwrite
  class RubyLlmClient
    OPENROUTER_URL = URI("https://openrouter.ai/api/v1/chat/completions")

    def chat_completion(api_key:, model:, messages:, temperature:, json_response: false)
      model_name = model.to_s.empty? ? "openai/gpt-4o-mini" : model

      text = call_ruby_llm(
        api_key: api_key,
        model: model_name,
        messages: messages,
        temperature: temperature,
        json_response: json_response
      )
      return text if text

      fallback_http_call(
        api_key: api_key,
        model: model_name,
        messages: messages,
        temperature: temperature,
        json_response: json_response
      )
    end

    private

    def call_ruby_llm(api_key:, model:, messages:, temperature:, json_response:)
      return nil unless defined?(RubyLLM)

      # ランタイムAPI差分を吸収するため、代表的なインターフェースを順番に試す
      if defined?(RubyLLM::Client)
        client = RubyLLM::Client.new(provider: :openrouter, api_key: api_key)
        if client.respond_to?(:chat)
          response = client.chat(
            model: model,
            messages: messages,
            temperature: temperature,
            response_format: (json_response ? { type: "json_object" } : nil)
          )
          return extract_text(response)
        end
      end

      return nil unless RubyLLM.respond_to?(:chat)

      response = RubyLLM.chat(
        provider: :openrouter,
        api_key: api_key,
        model: model,
        messages: messages,
        temperature: temperature,
        response_format: (json_response ? { type: "json_object" } : nil)
      )
      extract_text(response)
    rescue StandardError
      nil
    end

    def fallback_http_call(api_key:, model:, messages:, temperature:, json_response:)
      req = Net::HTTP::Post.new(OPENROUTER_URL)
      req["Authorization"] = "Bearer #{api_key}"
      req["Content-Type"] = "application/json"
      req["HTTP-Referer"] = "https://aiwrite.local"
      req["X-Title"] = "aiwrite-ruby"

      body = {
        model: model,
        messages: messages,
        temperature: temperature
      }
      body[:response_format] = { type: "json_object" } if json_response
      req.body = JSON.generate(body)

      response = Net::HTTP.start(OPENROUTER_URL.host, OPENROUTER_URL.port, use_ssl: true, read_timeout: 30) do |http|
        http.request(req)
      end

      raise "OpenRouterエラー: #{response.code}" unless response.is_a?(Net::HTTPSuccess)

      parsed = JSON.parse(response.body)
      content = parsed.dig("choices", 0, "message", "content").to_s.strip
      raise "AIの応答が空でした。" if content.empty?

      content
    end

    def extract_text(response)
      return if response.nil?
      return response if response.is_a?(String)

      text = response.respond_to?(:content) ? response.content : nil
      text ||= response.respond_to?(:text) ? response.text : nil
      text ||= response.dig("choices", 0, "message", "content") if response.is_a?(Hash)
      trimmed = text.to_s.strip
      trimmed.empty? ? nil : trimmed
    end
  end
end
