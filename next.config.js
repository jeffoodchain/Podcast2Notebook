/** @type {import('next').NextConfig} */
const nextConfig = {
  // Emit a self-contained server bundle for a small Docker runtime image.
  output: "standalone",
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
