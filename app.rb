# frozen_string_literal: true

require "sinatra/base"
require "json"
require "net/http"
require "uri"

require_relative "lib/openrouter"
require_relative "lib/board_update"

module Aiwrite
  class App < Sinatra::Base
    set :public_folder, File.join(__dir__, "public")
    set :static, true

    OPENROUTER_URL = URI("https://openrouter.ai/api/v1/chat/completions").freeze

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

      messages = OpenRouter.build_messages(payload)
      result = call_openrouter(
        api_key: payload["apiKey"],
        model: payload["model"] || "openai/gpt-4o-mini",
        messages: messages,
        temperature: 0.85
      )

      return json_error("OpenRouterエラー: #{result[:status]}", result[:status], result[:detail]) unless result[:ok]

      content = result.dig(:data, "choices", 0, "message", "content")&.strip
      return json_error("AIの応答が空でした。", 502) if content.to_s.empty?

      json_response(content: content)
    end

    # ─── ボード自動更新 ───
    post "/api/board-update" do
      payload = parse_json_body
      return json_error("JSONを読み取れませんでした。", 400) unless payload
      return json_error("OpenRouter APIキーを入力してください。", 400) if payload["apiKey"].to_s.empty?

      messages = BoardUpdate.build_messages(payload)
      result = call_openrouter(
        api_key: payload["apiKey"],
        model: payload["model"] || "openai/gpt-4o-mini",
        messages: messages,
        temperature: 0.2,
        extra: { response_format: { type: "json_object" } }
      )

      return json_error("OpenRouterエラー: #{result[:status]}", result[:status], result[:detail]) unless result[:ok]

      raw_content = result.dig(:data, "choices", 0, "message", "content")
      return json_error("ボード更新の応答が空でした。", 502) if raw_content.to_s.empty?

      begin
        settings = BoardUpdate.parse(raw_content)
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

    def call_openrouter(api_key:, model:, messages:, temperature:, extra: {})
      http = Net::HTTP.new(OPENROUTER_URL.host, OPENROUTER_URL.port)
      http.use_ssl = true
      http.open_timeout = 15
      http.read_timeout = 120

      req = Net::HTTP::Post.new(OPENROUTER_URL)
      req["Authorization"] = "Bearer #{api_key}"
      req["Content-Type"] = "application/json"
      req["HTTP-Referer"] = "https://aiwrite.local"
      req["X-Title"] = "aiwrite"
      req.body = JSON.generate({
        model: model,
        messages: messages.map { |m| { role: m[:role] || m["role"], content: m[:content] || m["content"] } },
        temperature: temperature
      }.merge(extra))

      response = http.request(req)

      if response.is_a?(Net::HTTPSuccess)
        { ok: true, data: JSON.parse(response.body), status: response.code.to_i }
      else
        { ok: false, status: response.code.to_i, detail: response.body[0, 1200] }
      end
    rescue StandardError => e
      { ok: false, status: 500, detail: e.message }
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
