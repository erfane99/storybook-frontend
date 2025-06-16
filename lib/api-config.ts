// Clean API configuration following 2025 best practices
const RAILWAY_BACKEND_URL = 'https://storybook-backend-production-cb71.up.railway.app';

export function getApiBaseUrl(): string {
  // For web browsers, call Railway backend directly
  if (typeof window !== 'undefined') {
    return RAILWAY_BACKEND_URL;
  }
  
  // For server-side rendering (rare with App Router)
  return RAILWAY_BACKEND_URL;
}

export function buildApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // Always return full URL for direct Railway calls
  return `${baseUrl}/${cleanEndpoint}`;
}

export const apiConfig = {
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};

// TypeScript interface for test results
interface APITestResult {
  success: boolean;
  status: number;
  url: string;
  headers: { [k: string]: string };
  timestamp: string;
  data?: any;
  error?: string;
}

// Enhanced debug function for testing
export async function testAPIConnection(): Promise<APITestResult | null> {
  if (typeof window === 'undefined') return null;
  
  console.log('🧪 Testing direct Railway API connection...');
  console.log('🧪 Environment:', process.env.NODE_ENV);
  console.log('🧪 Base URL:', getApiBaseUrl());
  console.log('🧪 Test URL:', buildApiUrl('api/health'));
  
  try {
    const response = await fetch(buildApiUrl('api/health'), {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    
    console.log('🧪 Response status:', response.status);
    console.log('🧪 Response URL:', response.url);
    console.log('🧪 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const result: APITestResult = {
      success: response.ok,
      status: response.status,
      url: response.url,
      headers: Object.fromEntries(response.headers.entries()),
      timestamp: new Date().toISOString(),
    };
    
    if (response.ok) {
      try {
        const data = await response.json();
        result.data = data;
      } catch (e) {
        result.data = await response.text();
      }
    }
    
    return result;
  } catch (error) {
    console.error('🧪 Test failed:', error);
    return {
      success: false,
      status: 0,
      url: '',
      headers: {},
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Debug function to test Railway backend directly
export async function testRailwayDirect(): Promise<APITestResult | null> {
  if (typeof window === 'undefined') return null;
  
  try {
    const response = await fetch('https://storybook-backend-production-cb71.up.railway.app/api/health');
    return {
      success: response.ok,
      status: response.status,
      url: response.url,
      headers: Object.fromEntries(response.headers.entries()),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      url: '',
      headers: {},
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Expose test functions for console debugging
if (typeof window !== 'undefined') {
  (window as any).testAPIConnection = testAPIConnection;
  (window as any).testRailwayDirect = testRailwayDirect;
  (window as any).getApiBaseUrl = getApiBaseUrl;
  (window as any).buildApiUrl = buildApiUrl;
  
  console.log('🔧 Debug functions available:');
  console.log('🔧 - testAPIConnection() - Test direct Railway connection');
  console.log('🔧 - testRailwayDirect() - Test Railway backend directly');
  console.log('🔧 - getApiBaseUrl() - Check base URL configuration');
  console.log('🔧 - buildApiUrl(endpoint) - Test URL building');
}