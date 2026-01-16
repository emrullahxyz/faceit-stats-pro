/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
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

