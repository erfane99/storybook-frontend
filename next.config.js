/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use Netlify's Next.js runtime instead of static export for better compatibility
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
  
  // Use rewrites for better integration with Netlify
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: 'https://storybook-backend-production-cb71.up.railway.app/api/:path*',
        },
      ],
    };
  },
};

module.exports = nextConfig;