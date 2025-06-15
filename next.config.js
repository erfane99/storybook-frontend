/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'storybook-backend-production-cb71.up.railway.app',
      },
    ],
  },
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react'],
  },
  poweredByHeader: false,
  
  // Remove rewrites - Netlify handles this better with redirects
  // This is the 2025 best practice for Next.js on Netlify
};

module.exports = nextConfig;