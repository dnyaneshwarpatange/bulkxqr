/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['qrcode', 'sharp', 'archiver', 'jszip', 'xlsx'],
  },
  webpack: (config) => {
    config.externals.push({ canvas: 'canvas' });
    return config;
  },
};

module.exports = nextConfig;
