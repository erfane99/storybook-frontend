// API configuration and utilities
const API_BASE_URL = 'https://storybook-backend-production-cb71.up.railway.app'; // HARDCODED Railway URL

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

// Helper function to build API URLs - ENHANCED DEBUG VERSION
export function buildApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const url = `${API_BASE_URL}/${cleanEndpoint}`;
  
  // DETAILED DEBUG LOGGING
  console.log('🚀 buildApiUrl input:', endpoint);
  console.log('🚀 buildApiUrl cleanEndpoint:', cleanEndpoint);
  console.log('🚀 buildApiUrl API_BASE_URL:', API_BASE_URL);
  console.log('🚀 buildApiUrl final URL:', url);
  console.log('🚀 buildApiUrl URL check - contains Railway?', url.includes('railway.app'));
  console.log('🚀 buildApiUrl URL check - contains Netlify?', url.includes('netlify.app'));
  
  return url;
}

// Enhanced fetch wrapper with error handling and DETAILED LOGGING
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = buildApiUrl(endpoint);
  
  // CRITICAL DEBUG LOGGING
  console.log('🌐 apiRequest called with endpoint:', endpoint);
  console.log('🌐 apiRequest buildApiUrl result:', url);
  console.log('🌐 apiRequest final URL verification:', url);
  console.log('🌐 apiRequest URL domain check:', new URL(url).hostname);
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Remove Content-Type for FormData
  if (options.body instanceof FormData) {
    delete defaultOptions.headers!['Content-Type'];
  }

  try {
    console.log(`🌐 Making API request to: ${url}`); // Debug logging
    console.log(`🌐 Request method: ${defaultOptions.method || 'GET'}`);
    console.log(`🌐 Request headers:`, defaultOptions.headers);
    
    const response = await fetch(url, defaultOptions);
    
    console.log(`🌐 Response status: ${response.status}`);
    console.log(`🌐 Response URL: ${response.url}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ API Error Response:`, errorData);
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const responseData = await response.json();
    console.log(`✅ API Success Response:`, responseData);
    return responseData;
  } catch (error) {
    console.error(`❌ API request failed for ${endpoint}:`, error);
    console.error(`❌ Failed URL was: ${url}`);
    throw error;
  }
}

// Job polling utility
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
        
        // Ensure polling URL uses Railway backend
        const fullPollingUrl = pollingUrl.startsWith('http') 
          ? pollingUrl 
          : buildApiUrl(pollingUrl);
        
        console.log(`🔄 Polling: ${fullPollingUrl}`); // Debug logging
        console.log(`🔄 Polling URL domain: ${new URL(fullPollingUrl).hostname}`);
        
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

// Specific API methods with proper TypeScript and validation
export const api = {
  // Auth endpoints
  sendOTP: (phone: string | null): Promise<OTPResponse> => {
    console.log('📞 sendOTP called - will use Railway backend');
    validateRequired({ phone }, ['phone']);
    return apiRequest('api/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },

  verifyOTP: (phone: string | null, otp_code: string | null): Promise<OTPResponse> => {
    console.log('🔐 verifyOTP called - will use Railway backend');
    validateRequired({ phone, otp_code }, ['phone', 'otp_code']);
    return apiRequest('api/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp_code }),
    });
  },

  // Image endpoints
  uploadImage: (formData: FormData | null): Promise<UploadImageResponse> => {
    console.log('🖼️ uploadImage called - will use Railway backend');
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
    console.log('🔍 describeImage called - will use Railway backend');
    console.log('🔍 describeImage imageUrl:', imageUrl);
    validateRequired({ imageUrl }, ['imageUrl']);
    return apiRequest('api/image/describe', {
      method: 'POST',
      body: JSON.stringify({ imageUrl }),
    });
  },

  // Updated cartoonize methods to use job-based system
  startCartoonizeJob: (
    prompt: string | null, 
    style: string | null, 
    imageUrl: string | null
  ): Promise<CartoonizeJobResponse> => {
    console.log('🎨 startCartoonizeJob called - will use Railway backend');
    validateRequired({ prompt, style, imageUrl }, ['prompt', 'style', 'imageUrl']);
    return apiRequest('api/jobs/cartoonize/start', {
      method: 'POST',
      body: JSON.stringify({ prompt, style, imageUrl }),
    });
  },

  getCartoonizeJobStatus: (jobId: string | null): Promise<JobStatusResponse> => {
    console.log('📊 getCartoonizeJobStatus called - will use Railway backend');
    validateRequired({ jobId }, ['jobId']);
    return apiRequest(`api/jobs/cartoonize/status/${jobId}`);
  },

  // Convenience method that combines start + polling
  cartoonizeImage: async (
    prompt: string | null, 
    style: string | null, 
    imageUrl: string | null,
    onProgress?: (progress: number) => void,
    onStatusChange?: (status: string) => void
  ): Promise<CartoonizeImageResponse> => {
    console.log('🎨 cartoonizeImage called - will use Railway backend job system');
    validateRequired({ prompt, style, imageUrl }, ['prompt', 'style', 'imageUrl']);
    
    // Start the job
    const { jobId, pollingUrl } = await api.startCartoonizeJob(prompt, style, imageUrl);
    console.log('🎨 Cartoonize job started:', { jobId, pollingUrl });
    
    // Poll for completion
    const result = await pollJobStatus(jobId, pollingUrl, onProgress, onStatusChange);
    
    return result;
  },

  // Story endpoints
  generateScenes: (
    story: string | null, 
    characterImage: string | null, 
    audience: string | null
  ) => {
    console.log('📖 generateScenes called - will use Railway backend');
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
    console.log('🤖 generateAutoStory called - will use Railway backend');
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
    console.log('📚 createStorybook called - will use Railway backend');
    validateRequired(data, ['title', 'story', 'characterImage', 'pages', 'audience']);
    return apiRequest('api/story/create-storybook', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  generateCartoonImage: (image_prompt: string | null) => {
    console.log('🎨 generateCartoonImage called - will use Railway backend');
    validateRequired({ image_prompt }, ['image_prompt']);
    return apiRequest('api/story/generate-cartoon-image', {
      method: 'POST',
      body: JSON.stringify({ image_prompt }),
    });
  },

  // User storybook endpoints
  getUserStorybooks: (token: string | null) => {
    console.log('📚 getUserStorybooks called - will use Railway backend');
    validateRequired({ token }, ['token']);
    return apiRequest('api/story/get-user-storybooks', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  getUserStorybookById: (id: string | null, token: string | null) => {
    console.log('📖 getUserStorybookById called - will use Railway backend');
    validateRequired({ id, token }, ['id', 'token']);
    return apiRequest(`api/story/get-user-storybook-by-id?id=${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  deleteStorybookById: (id: string | null, token: string | null) => {
    console.log('🗑️ deleteStorybookById called - will use Railway backend');
    validateRequired({ id, token }, ['id', 'token']);
    return apiRequest(`api/story/delete-by-id?id=${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  requestPrint: (storybook_id: string | null, token: string | null) => {
    console.log('🖨️ requestPrint called - will use Railway backend');
    validateRequired({ storybook_id, token }, ['storybook_id', 'token']);
    return apiRequest('api/story/request-print', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ storybook_id }),
    });
  },

  // Job endpoints
  startAutoStoryJob: (data: {
    genre: string | null;
    characterDescription: string | null;
    cartoonImageUrl: string | null;
    audience: string | null;
  }) => {
    console.log('🤖 startAutoStoryJob called - will use Railway backend');
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
    console.log('📖 startScenesJob called - will use Railway backend');
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
    console.log('📚 startStorybookJob called - will use Railway backend');
    validateRequired(data, ['title', 'story', 'characterImage', 'pages', 'audience']);
    return apiRequest('api/jobs/storybook/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getUserJobs: (token: string | null) => {
    console.log('📊 getUserJobs called - will use Railway backend');
    validateRequired({ token }, ['token']);
    return apiRequest('api/jobs/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  cancelJob: (jobId: string | null) => {
    console.log('🚫 cancelJob called - will use Railway backend');
    validateRequired({ jobId }, ['jobId']);
    return apiRequest(`api/jobs/cancel/${jobId}`, {
      method: 'POST',
    });
  },

  deleteJob: (jobId: string | null, token: string | null) => {
    console.log('🗑️ deleteJob called - will use Railway backend');
    validateRequired({ jobId, token }, ['jobId', 'token']);
    return apiRequest(`api/jobs/${jobId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
};