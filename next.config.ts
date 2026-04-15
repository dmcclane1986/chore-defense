import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the calendar client out of the Next.js bundle (server-only)
  serverExternalPackages: ['@googleapis/calendar', 'google-auth-library'],

  /** Nested `app/api/menu/vote` is not registered next to `app/api/menu` in dev (Next 16 + Turbopack). */
  async rewrites() {
    return [{ source: '/api/menu/vote', destination: '/api/menu-vote' }]
  },

  /**
   * Dev-only: Next.js blocks `/_next/*` and HMR WebSockets unless the page origin is allowlisted.
   * Without this, opening the site via a LAN IP (e.g. http://10.25.31.53:3000) fails webpack-hmr
   * and can break the dev client. Production builds ignore this.
   * @see https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins
   */
  allowedDevOrigins: [
    "10.*.*.*", // RFC1918 10.0.0.0/8 — common lab/LAN IPs
    "192.168.*.*",
    "172.*.*.*", // includes 172.16–31 private range and more; dev-only
  ],
};

export default nextConfig;
