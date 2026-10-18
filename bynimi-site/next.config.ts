import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Product photos still live on Bumpa's CDN until Nimi's originals arrive
    // and move to Supabase Storage.
    remotePatterns: [new URL("https://dodptt9f4zk9h.cloudfront.net/stores/8942/**")],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
