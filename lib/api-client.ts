// Enhanced production-ready API client with comprehensive cartoon management
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

// NEW: Enhanced cartoon management interfaces
export interface CartoonSaveRequest {
  originalImageUrl: string;
  cartoonImageUrl: string;
  characterDescription: string;
  artStyle: string;
  metadata?: {
    processingTime?: number;
    modelVersion?: string;
    quality?: 'standard' | 'high' | 'premium';
    tags?: string[];
  };
}

export interface CartoonSaveResponse {
  id: string;
  success: boolean;
  message: string;
  savedAt: string;
}

export interface PreviousCartoonsFilter {
  artStyle?: string;
  dateFrom?: string;
  dateTo?: string;
  tags?: string[];
  quality?: 'standard' | 'high' | 'premium';
}

export interface PreviousCartoonsRequest {
  page?: number;
  limit?: number;
  sortBy?: 'created_at' | 'art_style' | 'quality';
  sortOrder?: 'asc' | 'desc';
  filter?: PreviousCartoonsFilter;
}

export interface CartoonItem {
  id: string;
  originalImageUrl: string;
  cartoonImageUrl: string;
  characterDescription: string;
  artStyle: string;
  quality: 'standard' | 'high' | 'premium';
  tags: string[];
  createdAt: string;
  metadata: {
    processingTime: number;
    modelVersion: string;
    fileSize: number;
  };
}

export interface PreviousCartoonsResponse {
  cartoons: CartoonItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  filters: {
    availableStyles: string[];
    availableQualities: string[];
    dateRange: {
      earliest: string;
      latest: string;
    };
  };
}

export interface CharacterDescribeRequest {
  imageUrl: string;
  options?: {
    includeStyle?: boolean;
    includeColors?: boolean;
    includeExpression?: boolean;
    includeClothing?: boolean;
    detailLevel?: 'basic' | 'detailed' | 'comprehensive';
  };
}

export interface CharacterDescribeResponse {
  characterDescription: string;
  confidence: number;
  details: {
    physicalFeatures?: string;
    clothing?: string;
    expression?: string;
    colors?: string[];
    style?: string;
  };
  processingTime: number;
}

export interface EnhancedCartoonizeJobStatus extends JobStatusResponse {
  enhancedDetails: {
    queuePosition?: number;
    estimatedWaitTime?: string;
    processingStage?: 'analyzing' | 'generating' | 'enhancing' | 'finalizing';
    qualityLevel?: 'standard' | 'high' | 'premium';
    retryCount?: number;
    maxRetries?: number;
  };
}

class APIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: any,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Enhanced request cache for optimization
class RequestCache {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private pendingRequests = new Map<string, Promise<any>>();

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.timestamp + item.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  set<T>(key: string, data: T, ttlMs: number = 300000): void { // 5 min default
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    });
  }

  // Request deduplication
  async dedupe<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }
}

// Circuit breaker for handling repeated failures
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold = 5,
    private timeout = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new APIError('Service temporarily unavailable', 503, null, true);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }
}

// Global instances
const requestCache = new RequestCache();
const circuitBreaker = new CircuitBreaker();

/**
 * Enhanced API request with retry logic, caching, and circuit breaker
 */
async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit & {
    retries?: number;
    retryDelay?: number;
    cache?: boolean;
    cacheTtl?: number;
    timeout?: number;
  } = {}
): Promise<T> {
  const {
    retries = 3,
    retryDelay = 1000,
    cache = false,
    cacheTtl = 300000,
    timeout = 30000,
    ...fetchOptions
  } = options;

  const url = buildApiUrl(endpoint);
  const cacheKey = `${url}-${JSON.stringify(fetchOptions)}`;

  // Check cache first
  if (cache && fetchOptions.method !== 'POST') {
    const cached = requestCache.get<T>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
    ...fetchOptions,
  };

  // Remove Content-Type for FormData
  if (fetchOptions.body instanceof FormData) {
    delete (defaultOptions.headers as Record<string, string>)['Content-Type'];
  }

  const executeRequest = async (): Promise<T> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...defaultOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const isRetryable = response.status >= 500 || response.status === 429;
        
        throw new APIError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData,
          isRetryable
        );
      }

      const result = await response.json();

      // Cache successful responses
      if (cache) {
        requestCache.set(cacheKey, result, cacheTtl);
      }

      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // FIXED: Proper type checking for error handling
      if (error instanceof Error && error.name === 'AbortError') {
        throw new APIError('Request timeout', 408, null, true);
      }
      
      if (error instanceof APIError) {
        throw error;
      }
      
      throw new APIError(
        error instanceof Error ? error.message : 'Network request failed',
        0,
        null,
        true
      );
    }
  };

  // Execute with circuit breaker and retry logic
  return circuitBreaker.execute(async () => {
    let lastError: APIError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await executeRequest();
      } catch (error) {
        // FIXED: Proper type checking for error handling
        lastError = error instanceof APIError ? error : new APIError(
          error instanceof Error ? error.message : 'Unknown error'
        );

        // Don't retry non-retryable errors
        if (!lastError.retryable || attempt === retries) {
          throw lastError;
        }

        // Exponential backoff
        const delay = retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  });
}

// Job polling utility with smart intervals
export async function pollJobStatus(
  jobId: string,
  pollingUrl: string,
  onProgress?: (progress: number) => void,
  onStatusChange?: (status: string) => void
): Promise<any> {
  const maxAttempts = 180;
  let attempts = 0;
  let consecutiveErrors = 0;

  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        attempts++;
        consecutiveErrors = 0;
        
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
          // Smart polling intervals based on status
          const getPollingInterval = (status: string, progress: number) => {
            if (status === 'pending') return 5000; // 5s for pending
            if (progress > 80) return 1000; // 1s when nearly complete
            if (progress > 50) return 2000; // 2s when halfway
            return 3000; // 3s default
          };

          const interval = getPollingInterval(jobData.status, jobData.progress);
          setTimeout(poll, interval);
        }
      } catch (error) {
        consecutiveErrors++;
        
        if (consecutiveErrors >= 3 || attempts >= maxAttempts) {
          reject(error);
        } else {
          // Exponential backoff for errors
          const delay = 2000 * Math.pow(2, consecutiveErrors - 1);
          setTimeout(poll, delay);
        }
      }
    };

    poll();
  });
}

// Enhanced API methods
export const api = {
  // Auth endpoints
  sendOTP: (phone: string): Promise<OTPResponse> => {
    return apiRequest('api/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
      retries: 2,
    });
  },

  verifyOTP: (phone: string, otp_code: string): Promise<OTPResponse> => {
    return apiRequest('api/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp_code }),
      retries: 2,
    });
  },

  // Image endpoints
  uploadImage: (formData: FormData): Promise<UploadImageResponse> => {
    return apiRequest('api/upload-image', {
      method: 'POST',
      body: formData,
      timeout: 60000, // 1 minute for uploads
    });
  },

  describeImage: (imageUrl: string): Promise<ImageDescribeResponse> => {
    return apiRequest('api/image/describe', {
      method: 'POST',
      body: JSON.stringify({ imageUrl }),
      cache: true,
      cacheTtl: 600000, // 10 minutes
    });
  },

  // NEW: Enhanced character description with AI analysis
  /**
   * Extract detailed character descriptions from images using AI
   * @param request Character description request with options
   * @returns Detailed character analysis
   */
  describeCharacter: (request: CharacterDescribeRequest): Promise<CharacterDescribeResponse> => {
    const cacheKey = `character-${request.imageUrl}-${JSON.stringify(request.options)}`;
    
    return requestCache.dedupe(cacheKey, () =>
      apiRequest('api/character/describe', {
        method: 'POST',
        body: JSON.stringify(request),
        cache: true,
        cacheTtl: 3600000, // 1 hour
        timeout: 45000, // 45 seconds for AI processing
      })
    );
  },

  // NEW: Save cartoon image with metadata
  /**
   * Save user's chosen cartoon permanently with comprehensive metadata
   * @param request Cartoon save request with metadata
   * @returns Save confirmation with ID
   */
  saveCartoonImage: (request: CartoonSaveRequest): Promise<CartoonSaveResponse> => {
    return apiRequest('api/cartoon/save', {
      method: 'POST',
      body: JSON.stringify(request),
      retries: 2,
    });
  },

  // NEW: Get user's cartoon history with filtering and pagination
  /**
   * Fetch user's cartoon history with advanced filtering and pagination
   * @param request Pagination and filtering options
   * @returns Paginated cartoon history with metadata
   */
  getPreviousCartoons: (request: PreviousCartoonsRequest = {}): Promise<PreviousCartoonsResponse> => {
    const queryParams = new URLSearchParams();
    
    if (request.page) queryParams.set('page', request.page.toString());
    if (request.limit) queryParams.set('limit', request.limit.toString());
    if (request.sortBy) queryParams.set('sortBy', request.sortBy);
    if (request.sortOrder) queryParams.set('sortOrder', request.sortOrder);
    
    if (request.filter) {
      Object.entries(request.filter).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            queryParams.set(key, value.join(','));
          } else {
            queryParams.set(key, value.toString());
          }
        }
      });
    }

    const endpoint = `api/cartoon/previous${queryParams.toString() ? `?${queryParams}` : ''}`;
    
    return apiRequest(endpoint, {
      cache: true,
      cacheTtl: 180000, // 3 minutes
    });
  },

  // Enhanced cartoonize methods
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

  // NEW: Enhanced cartoonize job status with detailed information
  /**
   * Get enhanced cartoonize job status with queue position and detailed progress
   * @param jobId Job identifier
   * @returns Enhanced job status with queue information
   */
  getEnhancedCartoonizeJobStatus: (jobId: string): Promise<EnhancedCartoonizeJobStatus> => {
    return apiRequest(`api/jobs/cartoonize/status/${jobId}`, {
      cache: false, // Always fresh for job status
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
      timeout: 120000, // 2 minutes for story generation
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
      timeout: 180000, // 3 minutes for auto story
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
      timeout: 180000, // 3 minutes for storybook creation
    });
  },

  generateCartoonImage: (image_prompt: string) => {
    return apiRequest('api/story/generate-cartoon-image', {
      method: 'POST',
      body: JSON.stringify({ image_prompt }),
      timeout: 90000, // 90 seconds for image generation
    });
  },

  // User storybook endpoints
  getUserStorybooks: (token: string) => {
    return apiRequest('api/story/get-user-storybooks', {
      headers: { 'Authorization': `Bearer ${token}` },
      cache: true,
      cacheTtl: 300000, // 5 minutes
    });
  },

  getUserStorybookById: (id: string, token: string) => {
    return apiRequest(`api/story/get-user-storybook-by-id?id=${id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      cache: true,
      cacheTtl: 600000, // 10 minutes
    });
  },

  deleteStorybookById: (id: string, token: string) => {
    // Clear related cache entries
    requestCache.clear();
    
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

  // Enhanced job endpoints
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
      cache: true,
      cacheTtl: 30000, // 30 seconds for job lists
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

  // NEW: Utility methods for optimization
  /**
   * Clear all cached data
   */
  clearCache: () => {
    requestCache.clear();
  },

  /**
   * Validate image URL before making API requests
   * @param url Image URL to validate
   * @returns Promise resolving to validation result
   */
  validateImageUrl: async (url: string): Promise<{ valid: boolean; error?: string }> => {
    try {
      const response = await fetch(url, { method: 'HEAD', timeout: 10000 });
      const contentType = response.headers.get('content-type');
      
      if (!response.ok) {
        return { valid: false, error: `Image not accessible (${response.status})` };
      }
      
      if (!contentType?.startsWith('image/')) {
        return { valid: false, error: 'URL does not point to an image' };
      }
      
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Failed to validate image URL' 
      };
    }
  },

  /**
   * Get API health status
   */
  getHealthStatus: (): Promise<{ status: string; timestamp: string }> => {
    return apiRequest('api/health', {
      cache: true,
      cacheTtl: 60000, // 1 minute
    });
  },
};

// Export utility functions for advanced usage
export { requestCache, circuitBreaker };