# frozen_string_literal: true

module Aiwrite
  module IntentCheck
    SYSTEM_PROMPT = <<~PROMPT
      あなたはユーザーの指示の意図を分類するアシスタントです。
      ユーザーの入力が「次の話を書く」「続きを書く」「次の章へ進もう」など、現在の話から新しい話（新しいエピソード・章）へ移行して続きを書くことを求めているニュアンスが含まれているか判定してください。
      現在の話の中での単なる描写の追加や設定の相談などであれば false としてください。
      出力は以下のJSONのみを出力してください。
      {"isNextEpisode": true} または {"isNextEpisode": false}
    PROMPT

    def self.prepare_payload(user_instruction)
      {
        system_prompt: SYSTEM_PROMPT,
        user_message: user_instruction
      }
    end

    def self.parse_response(content)
      clean_content = content.gsub(/^```(?:json)?/i, "").gsub(/```$/i, "").strip
      JSON.parse(clean_content)
    rescue JSON::ParserError
      { "isNextEpisode" => false }
    end
  end
end
