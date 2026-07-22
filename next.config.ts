import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Hide the floating Next.js dev indicator.
   *
   * It overlaps the bottom-left of the layout, which matters here because the
   * README screenshots are captured from a running server — the badge would
   * appear in every one of them and read as a stray UI element rather than a
   * framework affordance.
   */
  devIndicators: false,
};

export default nextConfig;
