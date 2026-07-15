/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Pin the workspace root: a stray package-lock.json in a parent directory
  // otherwise makes Next mis-infer the root and breaks standalone tracing.
  turbopack: {
    root: __dirname,
  },
  outputFileTracingRoot: __dirname,
  // File tracing misses the Prisma 7 query-compiler WASM and schema, which
  // breaks PrismaClient inside the standalone (Docker) build. Force-include
  // the whole generated client for every route.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/.prisma/client/**/*"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.faceit.com",
      },
      {
        protocol: "https",
        hostname: "distribution.faceit-cdn.net",
      },
      {
        protocol: "https",
        hostname: "assets.faceit-cdn.net",
      },
    ],
  },
};

export default nextConfig;

