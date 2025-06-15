// Clean API configuration with environment-based routing
const API_ENDPOINTS = {
  development: 'http://localhost:3001',
  production: 'https://storybook-backend-production-cb71.up.railway.app',
} as const;

export function getApiBaseUrl(): string {
  // In production on Netlify, use relative URLs to leverage proxy redirects
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    // Use relative URLs in browser to leverage Netlify proxy
    return '';
  }
  
  // In development or server-side, use full URLs
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_RAILWAY_BACKEND_URL || API_ENDPOINTS.production;
  }
  
  return process.env.NEXT_PUBLIC_API_URL || API_ENDPOINTS.development;
}

export function buildApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // If baseUrl is empty (production browser), return relative URL
  if (!baseUrl) {
    return `/${cleanEndpoint}`;
  }
  
  return `${baseUrl}/${cleanEndpoint}`;
}

export const apiConfig = {
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// Debug function for testing API routing
export function testAPIRouting() {
  if (typeof window === 'undefined') return;
  
  console.log('🧪 API Routing Test');
  console.log('🧪 Environment:', process.env.NODE_ENV);
  console.log('🧪 Base URL:', getApiBaseUrl());
  console.log('🧪 Sample API URL:', buildApiUrl('api/health'));
  console.log('🧪 Window location:', window.location.origin);
  
  // Test actual API call
  const testUrl = buildApiUrl('api/health');
  console.log('🧪 Testing API call to:', testUrl);
  
  return fetch(testUrl)
    .then(response => {
      console.log('✅ API test successful:', response.status, response.url);
      return { success: true, status: response.status, url: response.url };
    })
    .catch(error => {
      console.error('❌ API test failed:', error);
      return { success: false, error: error.message };
    });
}

// Expose test function globally for debugging
if (typeof window !== 'undefined') {
  (window as any).testAPIRouting = testAPIRouting;
}