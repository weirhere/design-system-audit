/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['playwright-core', 'better-sqlite3'],
  },
};

export default nextConfig;
