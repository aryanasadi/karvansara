import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  /**
   * STANDALONE=1 is only set inside the Dockerfile. It produces a self-contained
   * `.next/standalone/server.js` (~100MB image instead of 1GB+) for PaaS/docker
   * deployments, while local/dev builds keep the regular output so `next start`
   * keeps working.
   */
  output: process.env.STANDALONE === "1" ? "standalone" : undefined,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
