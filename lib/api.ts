// API configuration and utilities
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://storybook-backend-production-cb71.up.railway.app';

export const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
};

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

// Specific API methods
export const api = {
  // Auth endpoints
  sendOTP: (phone: string) => 
    apiRequest('api/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  verifyOTP: (phone: string, otp_code: string) =>
    apiRequest('api/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp_code }),
    }),

  // Image endpoints
  uploadImage: (formData: FormData) =>
    apiRequest('api/upload-image', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type for FormData
    }),

  describeImage: (imageUrl: string) =>
    apiRequest('api/image/describe', {
      method: 'POST',
      body: JSON.stringify({ imageUrl }),
    }),

  cartoonizeImage: (prompt: string, style: string, imageUrl: string) =>
    apiRequest('api/image/cartoonize', {
      method: 'POST',
      body: JSON.stringify({ prompt, style, imageUrl }),
    }),

  // Story endpoints
  generateScenes: (story: string, characterImage: string, audience: string) =>
    apiRequest('api/story/generate-scenes', {
      method: 'POST',
      body: JSON.stringify({ story, characterImage, audience }),
    }),

  generateAutoStory: (data: {
    genre: string;
    characterDescription: string;
    cartoonImageUrl: string;
    audience: string;
    user_id: string;
  }) =>
    apiRequest('api/story/generate-auto-story', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createStorybook: (data: {
    title: string;
    story: string;
    characterImage: string;
    pages: any[];
    audience: string;
    isReusedImage: boolean;
    user_id?: string;
  }) =>
    apiRequest('api/story/create-storybook', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  generateCartoonImage: (image_prompt: string) =>
    apiRequest('api/story/generate-cartoon-image', {
      method: 'POST',
      body: JSON.stringify({ image_prompt }),
    }),

  // User storybook endpoints
  getUserStorybooks: (token: string) =>
    apiRequest('api/story/get-user-storybooks', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }),

  getUserStorybookById: (id: string, token: string) =>
    apiRequest(`api/story/get-user-storybook-by-id?id=${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }),

  deleteStorybookById: (id: string, token: string) =>
    apiRequest(`api/story/delete-by-id?id=${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }),

  requestPrint: (storybook_id: string, token: string) =>
    apiRequest('api/story/request-print', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ storybook_id }),
    }),

  // Job endpoints
  startAutoStoryJob: (data: {
    genre: string;
    characterDescription: string;
    cartoonImageUrl: string;
    audience: string;
  }) =>
    apiRequest('api/jobs/auto-story/start', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  startScenesJob: (data: {
    story: string;
    characterImage: string;
    audience: string;
  }) =>
    apiRequest('api/jobs/scenes/start', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  startStorybookJob: (data: {
    title: string;
    story: string;
    characterImage: string;
    pages: any[];
    audience: string;
    isReusedImage: boolean;
  }) =>
    apiRequest('api/jobs/storybook/start', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getUserJobs: (token: string) =>
    apiRequest('api/jobs/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }),

  cancelJob: (jobId: string) =>
    apiRequest(`api/jobs/cancel/${jobId}`, {
      method: 'POST',
    }),

  deleteJob: (jobId: string, token: string) =>
    apiRequest(`api/jobs/${jobId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }),
};