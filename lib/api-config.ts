// Clean API configuration with environment-based routing
const API_ENDPOINTS = {
  development: 'http://localhost:3001',
  production: 'https://storybook-backend-production-cb71.up.railway.app',
} as const;

export function getApiBaseUrl(): string {
  // In production, always use Railway backend
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_RAILWAY_BACKEND_URL || API_ENDPOINTS.production;
  }
  
  // In development, use local backend or Railway if specified
  return process.env.NEXT_PUBLIC_API_URL || API_ENDPOINTS.development;
}

export function buildApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${baseUrl}/${cleanEndpoint}`;
}

export const apiConfig = {
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
};