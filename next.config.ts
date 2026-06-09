import type { NextConfig } from "next";

// Production Supabase — for CSP connect-src
const SUPABASE_HOST = "nrlapafarpzbrvwkgkgy.supabase.co";

// Content Security Policy — restricts what the browser is allowed to load/run
const CSP = [
  "default-src 'self'",
  // Next.js requires unsafe-inline + unsafe-eval for its runtime
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  // Allow images from same origin, data URIs, and blobs (avatars etc.)
  "img-src 'self' data: blob:",
  "font-src 'self'",
  // Allow fetch/WebSocket to our own server + Supabase (auth & realtime)
  [
    "connect-src 'self'",
    `https://${SUPABASE_HOST}`,          // Supabase REST / auth
    `wss://${SUPABASE_HOST}`,            // Supabase Realtime WebSocket
    "http://localhost:8000",             // local dev self-hosted Supabase
    "ws://localhost:8000",
  ].join(" "),
  // Prevent this page from being embedded anywhere (same as X-Frame-Options)
  "frame-ancestors 'none'",
  // Restrict form submissions to same origin
  "form-action 'self'",
  // Prevent <base> tag hijacking
  "base-uri 'self'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "DENY" },
          // Prevent MIME-type sniffing attacks
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Don't leak full URL in Referer header
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Force HTTPS for 1 year (ignored on HTTP localhost)
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          // Disable unused browser features
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Block XSS, restrict resource loading
          { key: "Content-Security-Policy", value: CSP },
        ],
      },
    ];
  },
};

export default nextConfig;
