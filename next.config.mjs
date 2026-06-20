// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: false,

  // ── Canonical redirect: www → non-www or vice versa ───────────────────────
  // We want www.icesaathi.co.in to be canonical.
  // If someone visits icesaathi.co.in (no www), redirect to www.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: "icesaathi.co.in",
          },
        ],
        destination: "https://www.icesaathi.co.in/:path*",
        permanent: true, // 301 redirect — good for SEO
      },
    ];
  },

  // ── Security + SEO headers ────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent clickjacking
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Prevent MIME type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Referrer policy — good for privacy and SEO
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // XSS protection
          { key: "X-XSS-Protection", value: "1; mode=block" },
          // Permissions policy
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
      // Cache static assets aggressively
      {
        source: "/(.*)\\.(ico|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  // ── Image optimization ────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
