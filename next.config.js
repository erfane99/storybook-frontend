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
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'storybook-backend-production-cb71.up.railway.app',
        port: '',
        pathname: '/**',
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react'],
  },
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  // Environment variables for Railway backend
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://storybook-backend-production-cb71.up.railway.app',
  },
  // Ensure proper path alias resolution in production
  webpack: (config, { isServer }) => {
    // Add alias resolution for production builds
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname),
    };
    
    return config;
  },
  // Disable API routes in frontend build
  async rewrites() {
    return {
      beforeFiles: [
        // Redirect any /api calls to Railway backend
        {
          source: '/api/:path*',
          destination: 'https://storybook-backend-production-cb71.up.railway.app/api/:path*',
        },
      ],
    };
  },
};

module.exports = nextConfig;