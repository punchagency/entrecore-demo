import type { NextConfig } from "next";
import path from "path";

// Demo: modules outside the platform the demo shows (older investor/fundraising features
// and an internal test page). They hold hard-coded sample data, so they redirect home.
const DEMO_HIDDEN_ROUTES = [
  "/metrics",
  "/market",
  "/portfolio",
  "/diligence",
  "/investor-access",
  "/search",
  "/workflows/triggers-test",
];

const nextConfig: NextConfig = {
  async redirects() {
    return DEMO_HIDDEN_ROUTES.flatMap((route) => [
      { source: route, destination: "/", permanent: false },
      { source: `${route}/:path*`, destination: "/", permanent: false },
    ]);
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  turbopack: {
    resolveAlias: {
      canvas: "./lib/empty-module.ts",
    },
  },

  images: {
    domains: ["api.dicebear.com"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "punch-entrecore.s3.amazonaws.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  webpack: (config) => {
    // Handle canvas module from pdfjs-dist
    config.resolve.fallback = {
      ...config.resolve.fallback,
      canvas: false,
    };

    config.resolve.alias = {
      ...config.resolve.alias,
      reactflow: path.resolve("./node_modules/@xyflow/react"),
      canvas: path.resolve("./lib/empty-module.ts"),
    };

    config.module.rules.push({
      test: /\.node$/,
      loader: "ignore-loader",
    });

    return config;
  },
};

export default nextConfig;
