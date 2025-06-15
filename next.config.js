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
  
  // Ensure static export compatibility with Netlify
  output: 'export',
  trailingSlash: true,
  
  // Remove any conflicting configurations
  // Let Netlify handle all API routing
};

module.exports = nextConfig;