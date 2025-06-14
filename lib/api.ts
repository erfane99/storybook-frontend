// API configuration and utilities
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://storybook-backend-production-cb71.up.railway.app';

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

// Helper function to validate required parameters
function validateRequired(params: Record<string, any>, requiredFields: string[]): void {
  for (const field of requiredFields) {
    if (!params[field] || params[field] === null || params[field] === undefined) {
      throw new Error(`Required parameter '${field}' is missing or null`);
    }
  }
}

// Helper function to build API URLs
export function buildApiUrl(endpoint: string): string {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
}

// Enhanced fetch wrapper with error handling
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = buildApiUrl(endpoint);
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
}

// Specific API methods with proper TypeScript and validation
export const api = {
  // Auth endpoints
  sendOTP: (phone: string | null): Promise<OTPResponse> => {
    validateRequired({ phone }, ['phone']);
    return apiRequest('api/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },

  verifyOTP: (phone: string | null, otp_code: string | null): Promise<OTPResponse> => {
    validateRequired({ phone, otp_code }, ['phone', 'otp_code']);
    return apiRequest('api/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp_code }),
    });
  },

  // Image endpoints
  uploadImage: (formData: FormData | null): Promise<UploadImageResponse> => {
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
    validateRequired({ imageUrl }, ['imageUrl']);
    return apiRequest('api/image/describe', {
      method: 'POST',
      body: JSON.stringify({ imageUrl }),
    });
  },

  cartoonizeImage: (
    prompt: string | null, 
    style: string | null, 
    imageUrl: string | null
  ): Promise<CartoonizeImageResponse> => {
    validateRequired({ prompt, style, imageUrl }, ['prompt', 'style', 'imageUrl']);
    return apiRequest('api/image/cartoonize', {
      method: 'POST',
      body: JSON.stringify({ prompt, style, imageUrl }),
    });
  },

  // Story endpoints
  generateScenes: (
    story: string | null, 
    characterImage: string | null, 
    audience: string | null
  ) => {
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
    validateRequired(data, ['title', 'story', 'characterImage', 'pages', 'audience']);
    return apiRequest('api/story/create-storybook', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  generateCartoonImage: (image_prompt: string | null) => {
    validateRequired({ image_prompt }, ['image_prompt']);
    return apiRequest('api/story/generate-cartoon-image', {
      method: 'POST',
      body: JSON.stringify({ image_prompt }),
    });
  },

  // User storybook endpoints
  getUserStorybooks: (token: string | null) => {
    validateRequired({ token }, ['token']);
    return apiRequest('api/story/get-user-storybooks', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  getUserStorybookById: (id: string | null, token: string | null) => {
    validateRequired({ id, token }, ['id', 'token']);
    return apiRequest(`api/story/get-user-storybook-by-id?id=${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  deleteStorybookById: (id: string | null, token: string | null) => {
    validateRequired({ id, token }, ['id', 'token']);
    return apiRequest(`api/story/delete-by-id?id=${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  requestPrint: (storybook_id: string | null, token: string | null) => {
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
    validateRequired(data, ['title', 'story', 'characterImage', 'pages', 'audience']);
    return apiRequest('api/jobs/storybook/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getUserJobs: (token: string | null) => {
    validateRequired({ token }, ['token']);
    return apiRequest('api/jobs/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  cancelJob: (jobId: string | null) => {
    validateRequired({ jobId }, ['jobId']);
    return apiRequest(`api/jobs/cancel/${jobId}`, {
      method: 'POST',
    });
  },

  deleteJob: (jobId: string | null, token: string | null) => {
    validateRequired({ jobId, token }, ['jobId', 'token']);
    return apiRequest(`api/jobs/${jobId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
};