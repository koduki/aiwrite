# frozen_string_literal: true

module Aiwrite
  module UrlGuard
    BLOCKED_HOSTNAMES = ["localhost", "metadata.google.internal"].freeze

    module_function

    def blocked_host?(hostname)
      lower = hostname.to_s.downcase
      return true if BLOCKED_HOSTNAMES.include?(lower)
      return true if private_ipv4?(lower)
      return true if private_ipv6?(lower)

      bracket_match = lower.match(/^\[(.+)\]$/)
      return true if bracket_match && private_ipv6?(bracket_match[1])

      false
    end

    def private_ipv4?(ip)
      ip.start_with?("127.", "10.", "192.168.", "169.254.", "0.") ||
        ip.match?(/^172\.(1[6-9]|2\d|3[01])\./)
    end

    def private_ipv6?(ip)
      normalized = ip.to_s.downcase
      return true if normalized == "::1" || normalized == "::"
      return true if normalized.start_with?("fc", "fd", "fe80")

      mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
      return private_ipv4?(mapped[1]) if mapped

      false
    end
  end
end
