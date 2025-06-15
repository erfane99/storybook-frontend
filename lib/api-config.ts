const RAILWAY_BACKEND_URL = 'https://storybook-backend-production-cb71.up.railway.app';

export function getApiBaseUrl(): string {
  // Always use relative URLs in production browser to leverage Netlify proxy
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    console.log('🔧 Using relative URLs for Netlify proxy in production browser');
    return '';
  }
  
  // For development
  if (process.env.NODE_ENV === 'development') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }
  
  // Server-side in production (shouldn't be used with static export)
  return process.env.NEXT_PUBLIC_RAILWAY_BACKEND_URL || RAILWAY_BACKEND_URL;
}

export function buildApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // If baseUrl is empty (production browser), return relative URL for Netlify proxy
  if (!baseUrl) {
    const relativeUrl = `/${cleanEndpoint}`;
    console.log(`🔧 Building relative URL for proxy: ${relativeUrl}`);
    return relativeUrl;
  }
  
  // Full URL for development
  const fullUrl = `${baseUrl}/${cleanEndpoint}`;
  console.log(`🔧 Building full URL: ${fullUrl}`);
  return fullUrl;
}

export const apiConfig = {
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// Debug functions for testing
export async function testAPIRouting() {
  if (typeof window === 'undefined') {
    console.log('❌ testAPIRouting: Not in browser environment');
    return { success: false, error: 'Not in browser' };
  }
  
  console.log('🧪 === API ROUTING DEBUG TEST ===');
  console.log('🧪 Environment:', process.env.NODE_ENV);
  console.log('🧪 Window location:', window.location.origin);
  console.log('🧪 Base URL function result:', getApiBaseUrl());
  console.log('🧪 Sample API URL:', buildApiUrl('api/health'));
  
  const healthUrl = buildApiUrl('api/health');
  console.log('🧪 Testing health endpoint:', healthUrl);
  
  try {
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    
    console.log('✅ Health test response status:', response.status);
    console.log('✅ Health test response URL:', response.url);
    
    const result = {
      success: response.ok,
      status: response.status,
      url: response.url,
      requestUrl: healthUrl,
      timestamp: new Date().toISOString(),
    };
    
    console.log('✅ Test result:', result);
    return result;
  } catch (error: any) {
    console.error('❌ Health test failed:', error);
    return {
      success: false,
      error: error.message,
      requestUrl: healthUrl,
      timestamp: new Date().toISOString(),
    };
  }
}

// Expose debug functions globally for browser console
if (typeof window !== 'undefined') {
  (window as any).testAPIRouting = testAPIRouting;
  (window as any).getApiBaseUrl = getApiBaseUrl;
  (window as any).buildApiUrl = buildApiUrl;
  
  console.log('🔧 API Debug functions available in console:');
  console.log('🔧 - testAPIRouting()');
  console.log('🔧 - getApiBaseUrl()');
  console.log('🔧 - buildApiUrl("api/health")');
}