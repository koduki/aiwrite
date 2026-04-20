# frozen_string_literal: true

require "sinatra/base"
require "json"
require "net/http"
require "uri"

require_relative "lib/openrouter"
require_relative "lib/board_update"
require_relative "lib/llm_client"

module Aiwrite
  class App < Sinatra::Base
    set :public_folder, File.join(__dir__, "public")
    set :static, true

    # ─── ルートページ ───
    get "/" do
      send_file File.join(settings.public_folder, "index.html")
    end

    # ─── OpenRouter プロキシ ───
    post "/api/openrouter" do
      payload = parse_json_body
      return json_error("JSONを読み取れませんでした。", 400) unless payload
      return json_error("OpenRouter APIキーを入力してください。", 400) if payload["apiKey"].to_s.empty?
      return json_error("AI作家への依頼を入力してください。", 400) if payload["userInstruction"].to_s.strip.empty?

      llm_data = OpenRouter.prepare_payload(payload)
      result = LlmClient.chat(
        api_key: payload["apiKey"],
        model: payload["model"] || "openai/gpt-4o-mini",
        system_prompt: llm_data[:system_prompt],
        messages: llm_data[:history],
        user_message: llm_data[:user_message],
        temperature: 0.85
      )

      return json_error(result[:detail], result[:status]) unless result[:ok]

      json_response(content: result[:content])
    end

    # ─── ボード自動更新 ───
    post "/api/board-update" do
      payload = parse_json_body
      return json_error("JSONを読み取れませんでした。", 400) unless payload
      return json_error("OpenRouter APIキーを入力してください。", 400) if payload["apiKey"].to_s.empty?

      llm_data = BoardUpdate.prepare_payload(payload)
      result = LlmClient.chat(
        api_key: payload["apiKey"],
        model: payload["model"] || "openai/gpt-4o-mini",
        system_prompt: llm_data[:system_prompt],
        messages: llm_data[:history],
        user_message: llm_data[:user_message],
        temperature: 0.2,
        params: { response_format: { type: "json_object" } }
      )

      return json_error(result[:detail], result[:status]) unless result[:ok]

      begin
        settings = BoardUpdate.parse(result[:content])
        json_response(settings: settings)
      rescue JSON::ParserError
        json_error("ボード更新JSONを解析できませんでした。", 502)
      end
    end
    
    # ─── 設定インポート ───
    post "/api/import-settings" do
      payload = parse_json_body
      return json_error("JSONを読み取れませんでした。", 400) unless payload

      text = payload["text"].to_s.strip
      unless text.empty?
        return json_response(importedText: text[0, 6000])
      end

      url = payload["url"].to_s.strip
      return json_error("URLまたはテキストを入力してください。", 400) if url.empty?

      begin
        parsed_uri = URI.parse(url)
      rescue URI::InvalidURIError
        return json_error("URLの形式が正しくありません。", 400)
      end

      unless %w[http https].include?(parsed_uri.scheme)
        return json_error("httpまたはhttpsのURLのみ読み込めます。", 400)
      end

      begin
        response = Net::HTTP.get_response(parsed_uri)
      rescue StandardError
        return json_error("URLを読み込めませんでした。", 502)
      end

      unless response.is_a?(Net::HTTPSuccess)
        return json_error("URLを読み込めませんでした: #{response.code}", 502)
      end

      body = response.body.force_encoding("UTF-8")
      content_type_header = response["content-type"] || ""

      imported = if content_type_header.include?("text/html")
                   extract_readable_text(body)
                 else
                   body[0, 6000]
                 end

      json_response(importedText: imported)
    end

    private

    # ─── ヘルパー ───

    def parse_json_body
      body = request.body.read
      JSON.parse(body)
    rescue JSON::ParserError
      nil
    end

    def json_response(data)
      content_type :json
      JSON.generate(data)
    end

    def json_error(message, status_code, detail = nil)
      content_type :json
      status status_code
      body = { error: message }
      body[:detail] = detail if detail
      JSON.generate(body)
    end

    def extract_readable_text(html)
      html
        .gsub(/<script[\s\S]*?<\/script>/i, " ")
        .gsub(/<style[\s\S]*?<\/style>/i, " ")
        .gsub(/<[^>]+>/, " ")
        .gsub("&nbsp;", " ")
        .gsub("&amp;", "&")
        .gsub("&lt;", "<")
        .gsub("&gt;", ">")
        .gsub(/\s+/, " ")
        .strip[0, 6000]
    end
  end
end
