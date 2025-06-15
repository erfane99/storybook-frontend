// Clean API configuration following 2025 best practices
const RAILWAY_BACKEND_URL = 'https://storybook-backend-production-cb71.up.railway.app';

export function getApiBaseUrl(): string {
  // In production browser, use relative URLs to leverage Netlify proxy
  // This is the industry standard for Netlify deployments
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    return '';
  }
  
  // For development, use environment variable or localhost
  if (process.env.NODE_ENV === 'development') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }
  
  // Server-side fallback (rarely used with Next.js App Router)
  return RAILWAY_BACKEND_URL;
}

export function buildApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // Return relative URL for Netlify proxy in production
  if (!baseUrl) {
    return `/${cleanEndpoint}`;
  }
  
  // Full URL for development
  return `${baseUrl}/${cleanEndpoint}`;
}

export const apiConfig = {
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// Simple debug function for testing
export async function testAPIConnection() {
  if (typeof window === 'undefined') return null;
  
  try {
    const response = await fetch('/api/health');
    return {
      success: response.ok,
      status: response.status,
      url: response.url,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Expose test function for console debugging
if (typeof window !== 'undefined') {
  (window as any).testAPIConnection = testAPIConnection;
  (window as any).getApiBaseUrl = getApiBaseUrl;
  (window as any).buildApiUrl = buildApiUrl;
}