// Clean, production-ready API client with comic book support
import { buildApiUrl } from './api-config';

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

class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function apiRequest<T = any>(
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

  // Remove Content-Type for FormData
  if (options.body instanceof FormData) {
    delete (defaultOptions.headers as Record<string, string>)['Content-Type'];
  }

  try {
    const response = await fetch(url, defaultOptions);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new APIError(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError(
      error instanceof Error ? error.message : 'Network request failed'
    );
  }
}

// Job polling utility
export async function pollJobStatus(
  jobId: string,
  pollingUrl: string,
  onProgress?: (progress: number) => void,
  onStatusChange?: (status: string) => void
): Promise<any> {
  const maxAttempts = 180;
  let attempts = 0;

  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        attempts++;
        
        const fullPollingUrl = pollingUrl.startsWith('http') 
          ? pollingUrl 
          : buildApiUrl(pollingUrl);
        
        const response = await fetch(fullPollingUrl, {
          headers: { 'Cache-Control': 'no-cache' },
        });

        if (!response.ok) {
          throw new Error(`Polling failed: ${response.status}`);
        }

        const jobData: JobStatusResponse = await response.json();

        onProgress?.(jobData.progress);
        onStatusChange?.(jobData.status);

        if (jobData.status === 'completed') {
          resolve(jobData.result);
        } else if (jobData.status === 'failed') {
          reject(new Error(jobData.error || 'Job failed'));
        } else if (jobData.status === 'cancelled') {
          reject(new Error('Job was cancelled'));
        } else if (attempts >= maxAttempts) {
          reject(new Error('Job polling timeout'));
        } else {
          setTimeout(poll, 1000);
        }
      } catch (error) {
        if (attempts >= maxAttempts) {
          reject(error);
        } else {
          setTimeout(poll, 2000);
        }
      }
    };

    poll();
  });
}

// API methods
export const api = {
  // Auth endpoints
  sendOTP: (phone: string): Promise<OTPResponse> => {
    return apiRequest('api/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },

  verifyOTP: (phone: string, otp_code: string): Promise<OTPResponse> => {
    return apiRequest('api/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp_code }),
    });
  },

  // Image endpoints
  uploadImage: (formData: FormData): Promise<UploadImageResponse> => {
    return apiRequest('api/upload-image', {
      method: 'POST',
      body: formData,
    });
  },

  describeImage: (imageUrl: string): Promise<ImageDescribeResponse> => {
    return apiRequest('api/image/describe', {
      method: 'POST',
      body: JSON.stringify({ imageUrl }),
    });
  },

  // Cartoonize methods
  startCartoonizeJob: (
    prompt: string, 
    style: string, 
    imageUrl: string
  ): Promise<{ jobId: string; pollingUrl: string }> => {
    return apiRequest('api/jobs/cartoonize/start', {
      method: 'POST',
      body: JSON.stringify({ prompt, style, imageUrl }),
    });
  },

  getCartoonizeJobStatus: (jobId: string): Promise<JobStatusResponse> => {
    return apiRequest(`api/jobs/cartoonize/status/${jobId}`);
  },

  cartoonizeImage: async (
    prompt: string, 
    style: string, 
    imageUrl: string,
    onProgress?: (progress: number) => void,
    onStatusChange?: (status: string) => void
  ): Promise<CartoonizeImageResponse> => {
    const { jobId, pollingUrl } = await api.startCartoonizeJob(prompt, style, imageUrl);
    const result = await pollJobStatus(jobId, pollingUrl, onProgress, onStatusChange);
    return result;
  },

  // Story endpoints
  generateScenes: (
    story: string, 
    characterImage: string, 
    audience: string
  ) => {
    return apiRequest('api/story/generate-scenes', {
      method: 'POST',
      body: JSON.stringify({ story, characterImage, audience }),
    });
  },

  generateAutoStory: (data: {
    genre: string;
    characterDescription: string;
    cartoonImageUrl: string;
    audience: string;
    user_id: string;
  }) => {
    return apiRequest('api/story/generate-auto-story', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  createStorybook: (data: {
    title: string;
    story: string;
    characterImage: string;
    pages: any[];
    audience: string;
    isReusedImage: boolean;
    user_id?: string;
  }) => {
    return apiRequest('api/story/create-storybook', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  generateCartoonImage: (image_prompt: string) => {
    return apiRequest('api/story/generate-cartoon-image', {
      method: 'POST',
      body: JSON.stringify({ image_prompt }),
    });
  },

  // User storybook endpoints
  getUserStorybooks: (token: string) => {
    return apiRequest('api/story/get-user-storybooks', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  },

  getUserStorybookById: (id: string, token: string) => {
    return apiRequest(`api/story/get-user-storybook-by-id?id=${id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  },

  deleteStorybookById: (id: string, token: string) => {
    return apiRequest(`api/story/delete-by-id?id=${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
  },

  requestPrint: (storybook_id: string, token: string) => {
    return apiRequest('api/story/request-print', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ storybook_id }),
    });
  },

  // ENHANCED: Comic book job endpoints
  startAutoStoryJob: (data: {
    genre: string;
    characterDescription: string;
    cartoonImageUrl: string;
    audience: string;
    characterArtStyle?: string;
    layoutType?: string;
  }) => {
    return apiRequest('api/jobs/auto-story/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  startScenesJob: (data: {
    story: string;
    characterImage: string;
    audience: string;
  }) => {
    return apiRequest('api/jobs/scenes/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  startStorybookJob: (data: {
    title: string;
    story: string;
    characterImage: string;
    pages: any[];
    audience: string;
    isReusedImage: boolean;
    characterDescription?: string;
    characterArtStyle?: string;
    layoutType?: string;
  }) => {
    return apiRequest('api/jobs/storybook/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getUserJobs: (token: string) => {
    return apiRequest('api/jobs/user', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
  },

  cancelJob: (jobId: string) => {
    return apiRequest(`api/jobs/cancel/${jobId}`, {
      method: 'POST',
    });
  },

  deleteJob: (jobId: string, token: string) => {
    return apiRequest(`api/jobs/${jobId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
  },
};