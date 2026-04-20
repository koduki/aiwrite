# frozen_string_literal: true

require "ipaddr"

module Aiwrite
  module UrlGuard
    BLOCKED_HOSTNAMES = %w[
      localhost
      127.0.0.1
      0.0.0.0
      metadata.google.internal
      metadata
      169.254.169.254
    ].freeze

    def self.blocked_host?(hostname)
      lower = hostname.downcase
      return true if BLOCKED_HOSTNAMES.include?(lower)

      begin
        ip = IPAddr.new(lower)
        return true if ip.loopback? || ip.private? || ip.link_local?
      rescue IPAddr::InvalidAddressError
        # Not an IP address, which is fine
      end

      false
    end
  end
end
