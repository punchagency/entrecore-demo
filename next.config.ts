import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
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
