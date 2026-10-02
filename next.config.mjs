/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: '12mb' } },
  async rewrites() {
    return [{ source: '/@:username', destination: '/u/:username' }];
  },
};
export default nextConfig;
