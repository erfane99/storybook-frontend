// API configuration and utilities - RAILWAY BACKEND ONLY
const RAILWAY_BACKEND_URL = 'https://storybook-backend-production-cb71.up.railway.app';

// FORCE Railway backend - no environment variable fallbacks
const API_BASE_URL = RAILWAY_BACKEND_URL;

export const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
};

// Type definitions for API responses
export interface APIResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface ImageDescribeResponse {
  characterDescription: string;
}

export interface CartoonizeJobResponse {
  jobId: string;
  pollingUrl: string;
}

export interface CartoonizeImageResponse {
  url: string;
}

export interface OTPResponse {
  success: boolean;
  message: string;
}

export interface UploadImageResponse {
  secure_url: string;
  url?: string;
  path?: string;
}

export interface JobStatusResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentStep?: string;
  currentPhase?: string;
  createdAt: string;
  updatedAt: string;
  estimatedTimeRemaining?: string;
  error?: string;
  result?: any;
}

// Helper function to validate required parameters
function validateRequired(params: Record<string, any>, requiredFields: string[]): void {
  for (const field of requiredFields) {
    if (!params[field] || params[field] === null || params[field] === undefined) {
      throw new Error(`Required parameter '${field}' is missing or null`);
    }
  }
}

// Helper function to build API URLs - ALWAYS RAILWAY
export function buildApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const url = `${RAILWAY_BACKEND_URL}/${cleanEndpoint}`;
  
  // CRITICAL DEBUG LOGGING
  console.log('🚀 buildApiUrl - RAILWAY BACKEND FORCED');
  console.log('🚀 Input endpoint:', endpoint);
  console.log('🚀 Clean endpoint:', cleanEndpoint);
  console.log('🚀 Railway URL:', RAILWAY_BACKEND_URL);
  console.log('🚀 Final URL:', url);
  console.log('🚀 URL verification - contains railway.app?', url.includes('railway.app'));
  console.log('🚀 URL verification - contains netlify.app?', url.includes('netlify.app'));
  
  // SAFETY CHECK - throw error if not Railway
  if (!url.includes('railway.app')) {
    console.error('❌ CRITICAL ERROR: API URL is not Railway backend!');
    console.error('❌ Generated URL:', url);
    throw new Error(`CRITICAL: API URL must use Railway backend, got: ${url}`);
  }
  
  return url;
}

// Enhanced fetch wrapper with error handling and RAILWAY VERIFICATION
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = buildApiUrl(endpoint);
  
  // CRITICAL VERIFICATION
  console.log('🌐 apiRequest - RAILWAY BACKEND VERIFICATION');
  console.log('🌐 Endpoint:', endpoint);
  console.log('🌐 Final URL:', url);
  console.log('🌐 URL hostname:', new URL(url).hostname);
  console.log('🌐 Is Railway backend?', url.includes('storybook-backend-production-cb71.up.railway.app'));
  
  // SAFETY CHECK
  if (!url.includes('storybook-backend-production-cb71.up.railway.app')) {
    console.error('❌ CRITICAL ERROR: Not using Railway backend!');
    console.error('❌ URL:', url);
    throw new Error(`CRITICAL: Must use Railway backend, attempted: ${url}`);
  }
  
  // Create Headers object for proper header management
  const headers = new Headers();
  
  // Set default Content-Type
  headers.set('Content-Type', 'application/json');
  
  // Add any additional headers from options
  if (options.headers) {
    const optionsHeaders = new Headers(options.headers);
    optionsHeaders.forEach((value, key) => {
      headers.set(key, value);
    });
  }

  // Remove Content-Type for FormData
  if (options.body instanceof FormData) {
    headers.delete('Content-Type');
  }

  const defaultOptions: RequestInit = {
    headers,
    ...options,
  };

  try {
    console.log(`🌐 Making API request to Railway backend: ${url}`);
    console.log(`🌐 Request method: ${defaultOptions.method || 'GET'}`);
    
    const response = await fetch(url, defaultOptions);
    
    console.log(`🌐 Response status: ${response.status}`);
    console.log(`🌐 Response URL: ${response.url}`);
    console.log(`🌐 Response from Railway?`, response.url.includes('railway.app'));
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ Railway API Error Response:`, errorData);
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log(`✅ Railway API Success Response:`, responseData);
    return responseData;
  } catch (error) {
    console.error(`❌ Railway API request failed for ${endpoint}:`, error);
    console.error(`❌ Failed URL was: ${url}`);
    throw error;
  }
}

// Job polling utility - RAILWAY BACKEND ONLY
export async function pollJobStatus(
  jobId: string,
  pollingUrl: string,
  onProgress?: (progress: number) => void,
  onStatusChange?: (status: string) => void
): Promise<any> {
  const maxAttempts = 180; // 3 minutes with 1-second intervals
  let attempts = 0;

  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        attempts++;
        
        // FORCE Railway backend for polling
        const fullPollingUrl = pollingUrl.startsWith('http') 
          ? pollingUrl 
          : buildApiUrl(pollingUrl);
        
        console.log(`🔄 Polling Railway backend: ${fullPollingUrl}`);
        console.log(`🔄 Polling URL verification - Railway?`, fullPollingUrl.includes('railway.app'));
        
        // SAFETY CHECK
        if (!fullPollingUrl.includes('railway.app')) {
          throw new Error(`CRITICAL: Polling URL must use Railway backend, got: ${fullPollingUrl}`);
        }
        
        const response = await fetch(fullPollingUrl, {
          headers: {
            'Cache-Control': 'no-cache',
          },
        });

        if (!response.ok) {
          throw new Error(`Polling failed: ${response.status}`);
        }

        const jobData: JobStatusResponse = await response.json();

        // Call progress callback
        if (onProgress && typeof jobData.progress === 'number') {
          onProgress(jobData.progress);
        }

        // Call status change callback
        if (onStatusChange) {
          onStatusChange(jobData.status);
        }

        if (jobData.status === 'completed') {
          resolve(jobData.result);
        } else if (jobData.status === 'failed') {
          reject(new Error(jobData.error || 'Job failed'));
        } else if (jobData.status === 'cancelled') {
          reject(new Error('Job was cancelled'));
        } else if (attempts >= maxAttempts) {
          reject(new Error('Job polling timeout'));
        } else {
          // Continue polling
          setTimeout(poll, 1000);
        }
      } catch (error) {
        if (attempts >= maxAttempts) {
          reject(error);
        } else {
          // Retry after a short delay
          setTimeout(poll, 2000);
        }
      }
    };

    poll();
  });
}

// Specific API methods with RAILWAY BACKEND VERIFICATION
export const api = {
  // Auth endpoints
  sendOTP: (phone: string | null): Promise<OTPResponse> => {
    console.log('📞 sendOTP - RAILWAY BACKEND ONLY');
    validateRequired({ phone }, ['phone']);
    return apiRequest('api/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },

  verifyOTP: (phone: string | null, otp_code: string | null): Promise<OTPResponse> => {
    console.log('🔐 verifyOTP - RAILWAY BACKEND ONLY');
    validateRequired({ phone, otp_code }, ['phone', 'otp_code']);
    return apiRequest('api/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp_code }),
    });
  },

  // Image endpoints
  uploadImage: (formData: FormData | null): Promise<UploadImageResponse> => {
    console.log('🖼️ uploadImage - RAILWAY BACKEND ONLY');
    if (!formData) {
      throw new Error('FormData is required for image upload');
    }
    return apiRequest('api/upload-image', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    });
  },

  describeImage: (imageUrl: string | null): Promise<ImageDescribeResponse> => {
    console.log('🔍 describeImage - RAILWAY BACKEND ONLY');
    console.log('🔍 Image URL:', imageUrl);
    validateRequired({ imageUrl }, ['imageUrl']);
    return apiRequest('api/image/describe', {
      method: 'POST',
      body: JSON.stringify({ imageUrl }),
    });
  },

  // Updated cartoonize methods to use job-based system - RAILWAY ONLY
  startCartoonizeJob: (
    prompt: string | null, 
    style: string | null, 
    imageUrl: string | null
  ): Promise<CartoonizeJobResponse> => {
    console.log('🎨 startCartoonizeJob - RAILWAY BACKEND ONLY');
    validateRequired({ prompt, style, imageUrl }, ['prompt', 'style', 'imageUrl']);
    return apiRequest('api/jobs/cartoonize/start', {
      method: 'POST',
      body: JSON.stringify({ prompt, style, imageUrl }),
    });
  },

  getCartoonizeJobStatus: (jobId: string | null): Promise<JobStatusResponse> => {
    console.log('📊 getCartoonizeJobStatus - RAILWAY BACKEND ONLY');
    validateRequired({ jobId }, ['jobId']);
    return apiRequest(`api/jobs/cartoonize/status/${jobId}`);
  },

  // Convenience method that combines start + polling - RAILWAY ONLY
  cartoonizeImage: async (
    prompt: string | null, 
    style: string | null, 
    imageUrl: string | null,
    onProgress?: (progress: number) => void,
    onStatusChange?: (status: string) => void
  ): Promise<CartoonizeImageResponse> => {
    console.log('🎨 cartoonizeImage - RAILWAY BACKEND JOB SYSTEM');
    validateRequired({ prompt, style, imageUrl }, ['prompt', 'style', 'imageUrl']);
    
    // Start the job
    const { jobId, pollingUrl } = await api.startCartoonizeJob(prompt, style, imageUrl);
    console.log('🎨 Cartoonize job started on Railway:', { jobId, pollingUrl });
    
    // Poll for completion
    const result = await pollJobStatus(jobId, pollingUrl, onProgress, onStatusChange);
    
    return result;
  },

  // Story endpoints - RAILWAY ONLY
  generateScenes: (
    story: string | null, 
    characterImage: string | null, 
    audience: string | null
  ) => {
    console.log('📖 generateScenes - RAILWAY BACKEND ONLY');
    validateRequired({ story, characterImage, audience }, ['story', 'characterImage', 'audience']);
    return apiRequest('api/story/generate-scenes', {
      method: 'POST',
      body: JSON.stringify({ story, characterImage, audience }),
    });
  },

  generateAutoStory: (data: {
    genre: string | null;
    characterDescription: string | null;
    cartoonImageUrl: string | null;
    audience: string | null;
    user_id: string | null;
  }) => {
    console.log('🤖 generateAutoStory - RAILWAY BACKEND ONLY');
    validateRequired(data, ['genre', 'characterDescription', 'cartoonImageUrl', 'audience', 'user_id']);
    return apiRequest('api/story/generate-auto-story', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  createStorybook: (data: {
    title: string | null;
    story: string | null;
    characterImage: string | null;
    pages: any[] | null;
    audience: string | null;
    isReusedImage: boolean;
    user_id?: string | null;
  }) => {
    console.log('📚 createStorybook - RAILWAY BACKEND ONLY');
    validateRequired(data, ['title', 'story', 'characterImage', 'pages', 'audience']);
    return apiRequest('api/story/create-storybook', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  generateCartoonImage: (image_prompt: string | null) => {
    console.log('🎨 generateCartoonImage - RAILWAY BACKEND ONLY');
    validateRequired({ image_prompt }, ['image_prompt']);
    return apiRequest('api/story/generate-cartoon-image', {
      method: 'POST',
      body: JSON.stringify({ image_prompt }),
    });
  },

  // User storybook endpoints - RAILWAY ONLY
  getUserStorybooks: (token: string | null) => {
    console.log('📚 getUserStorybooks - RAILWAY BACKEND ONLY');
    validateRequired({ token }, ['token']);
    return apiRequest('api/story/get-user-storybooks', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  getUserStorybookById: (id: string | null, token: string | null) => {
    console.log('📖 getUserStorybookById - RAILWAY BACKEND ONLY');
    validateRequired({ id, token }, ['id', 'token']);
    return apiRequest(`api/story/get-user-storybook-by-id?id=${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  deleteStorybookById: (id: string | null, token: string | null) => {
    console.log('🗑️ deleteStorybookById - RAILWAY BACKEND ONLY');
    validateRequired({ id, token }, ['id', 'token']);
    return apiRequest(`api/story/delete-by-id?id=${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  requestPrint: (storybook_id: string | null, token: string | null) => {
    console.log('🖨️ requestPrint - RAILWAY BACKEND ONLY');
    validateRequired({ storybook_id, token }, ['storybook_id', 'token']);
    return apiRequest('api/story/request-print', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ storybook_id }),
    });
  },

  // Job endpoints - RAILWAY ONLY
  startAutoStoryJob: (data: {
    genre: string | null;
    characterDescription: string | null;
    cartoonImageUrl: string | null;
    audience: string | null;
  }) => {
    console.log('🤖 startAutoStoryJob - RAILWAY BACKEND ONLY');
    validateRequired(data, ['genre', 'characterDescription', 'cartoonImageUrl', 'audience']);
    return apiRequest('api/jobs/auto-story/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  startScenesJob: (data: {
    story: string | null;
    characterImage: string | null;
    audience: string | null;
  }) => {
    console.log('📖 startScenesJob - RAILWAY BACKEND ONLY');
    validateRequired(data, ['story', 'characterImage', 'audience']);
    return apiRequest('api/jobs/scenes/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  startStorybookJob: (data: {
    title: string | null;
    story: string | null;
    characterImage: string | null;
    pages: any[] | null;
    audience: string | null;
    isReusedImage: boolean;
  }) => {
    console.log('📚 startStorybookJob - RAILWAY BACKEND ONLY');
    validateRequired(data, ['title', 'story', 'characterImage', 'pages', 'audience']);
    return apiRequest('api/jobs/storybook/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getUserJobs: (token: string | null) => {
    console.log('📊 getUserJobs - RAILWAY BACKEND ONLY');
    validateRequired({ token }, ['token']);
    return apiRequest('api/jobs/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  cancelJob: (jobId: string | null) => {
    console.log('🚫 cancelJob - RAILWAY BACKEND ONLY');
    validateRequired({ jobId }, ['jobId']);
    return apiRequest(`api/jobs/cancel/${jobId}`, {
      method: 'POST',
    });
  },

  deleteJob: (jobId: string | null, token: string | null) => {
    console.log('🗑️ deleteJob - RAILWAY BACKEND ONLY');
    validateRequired({ jobId, token }, ['jobId', 'token']);
    return apiRequest(`api/jobs/${jobId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
};

// Global API client for debugging - RAILWAY BACKEND ONLY
if (typeof window !== 'undefined') {
  (window as any).railwayAPI = api;
  (window as any).buildApiUrl = buildApiUrl;
  (window as any).apiRequest = apiRequest;
  (window as any).RAILWAY_BACKEND_URL = RAILWAY_BACKEND_URL;
  
  // Test function for browser console
  (window as any).testRailwayAPI = async () => {
    console.log('🧪 Testing Railway API connection...');
    console.log('🧪 Railway backend URL:', RAILWAY_BACKEND_URL);
    
    try {
      const testUrl = buildApiUrl('api/health');
      console.log('🧪 Test URL:', testUrl);
      
      const response = await fetch(testUrl);
      console.log('🧪 Response status:', response.status);
      console.log('🧪 Response URL:', response.url);
      console.log('🧪 Is Railway?', response.url.includes('railway.app'));
      
      return {
        success: response.ok,
        status: response.status,
        url: response.url,
        isRailway: response.url.includes('railway.app')
      };
    } catch (error) {
      console.error('🧪 Test failed:', error);
      return { success: false, error };
    }
  };

  // CRITICAL: Override fetch for relative /api calls to force Railway routing
  const originalFetch = window.fetch;
  window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    // Check if this is a relative API call
    if (typeof input === 'string' && input.startsWith('/api/')) {
      const railwayUrl = buildApiUrl(input);
      console.log(`🔄 INTERCEPTED: Redirecting ${input} to Railway backend: ${railwayUrl}`);
      return originalFetch(railwayUrl, init);
    }
    
    // For all other requests, use original fetch
    return originalFetch(input, init);
  };
  
  console.log('🔧 Railway API client exposed to window for debugging');
  console.log('🔧 Available functions: railwayAPI, buildApiUrl, apiRequest, testRailwayAPI()');
  console.log('🔧 Railway backend URL:', RAILWAY_BACKEND_URL);
  console.log('🔧 ✅ FETCH INTERCEPTOR ACTIVE - All /api calls will route to Railway');
}