# frozen_string_literal: true

require "sinatra/base"
require "json"
require "net/http"
require "uri"

require_relative "lib/openrouter"
require_relative "lib/board_update"
require_relative "lib/llm_client"
require_relative "lib/validation"
require_relative "lib/url_guard"
require_relative "lib/intent_check"

module Aiwrite
  class App < Sinatra::Base
    set :public_folder, File.join(__dir__, "public")
    set :static, true

    # HostAuthorization の設定 (GitHub Codespaces 等への対応)
    set :host_authorization, { permitted_hosts: [".github.dev", "localhost", "127.0.0.1"] }

    # ─── ルートページ ───
    get "/" do
      send_file File.join(settings.public_folder, "index.html")
    end

    # ─── OpenRouter プロキシ ───
    post "/api/openrouter" do
      payload = parse_json_body
      return json_error("JSONを読み取れませんでした。", 400) unless payload
      
      val = Validation.validate_openrouter_payload(payload)
      return json_error(val[:error], 400) unless val[:ok]

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
      
      val = Validation.validate_board_update_payload(payload)
      return json_error(val[:error], 400) unless val[:ok]

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
    
    # ─── 意図判定 ───
    post "/api/intent-check" do
      payload = parse_json_body
      return json_error("JSONを読み取れませんでした。", 400) unless payload
      return json_response(isNextEpisode: false) if payload["userInstruction"].to_s.strip.empty?

      llm_data = IntentCheck.prepare_payload(payload["userInstruction"])
      result = LlmClient.chat(
        api_key: payload["apiKey"],
        model: payload["model"] || "openai/gpt-4o-mini",
        system_prompt: llm_data[:system_prompt],
        user_message: llm_data[:user_message],
        temperature: 0.1,
        params: { response_format: { type: "json_object" } }
      )

      unless result[:ok]
        # 判定失敗は致命的ではないのでデフォルト値を返す
        return json_response(isNextEpisode: false)
      end

      data = IntentCheck.parse_response(result[:content])
      json_response(isNextEpisode: !!data["isNextEpisode"])
    end

    # ─── 設定インポート ───
    post "/api/import-settings" do
      payload = parse_json_body
      return json_error("JSONを読み取れませんでした。", 400) unless payload

      max_text = 10_000
      max_bytes = 1_000_000

      text = payload["text"].to_s.strip
      unless text.empty?
        return json_response(importedText: text[0, max_text])
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

      if UrlGuard.blocked_host?(parsed_uri.host)
        return json_error("許可されていないホスト名です。", 403)
      end

      begin
        http = Net::HTTP.new(parsed_uri.host, parsed_uri.port)
        http.use_ssl = (parsed_uri.scheme == "https")
        http.open_timeout = 5
        http.read_timeout = 10

        response = http.request_get(parsed_uri.request_uri, { "User-Agent" => "aiwrite-settings-importer/0.1" })
      rescue StandardError => e
        return json_error("URLを読み込めませんでした。", 502, e.message)
      end

      unless response.is_a?(Net::HTTPSuccess)
        return json_error("URLを読み込めませんでした: #{response.code}", 502)
      end

      if response.body.bytesize > max_bytes
        return json_error("レスポンスが大きすぎます。", 502)
      end

      body = response.body.force_encoding("UTF-8")
      content_type_header = response["content-type"] || ""

      imported = if content_type_header.include?("text/html")
                   extract_readable_text(body).to_s[0, max_text]
                 else
                   body[0, max_text]
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
