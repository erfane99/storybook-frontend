// Enhanced production-ready API client with cross-origin authentication support
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

// ✅ FIXED: Updated interfaces to match actual API response structure
export interface CartoonItem {
  id: string;
  originalUrl: string;           // ✅ FIXED: Match API response field name
  cartoonUrl: string;            // ✅ FIXED: Match API response field name
  style: string;                 // ✅ FIXED: Match API response field name
  characterDescription: string;
  originalPrompt?: string | null;
  generationCount: number;
  cloudinaryPublicId: string;
  createdAt: string;
  createdAtFormatted: string;
  quality?: 'standard' | 'high' | 'premium';  // ✅ FIXED: Made optional (backend doesn't always return this)
  tags?: string[];                             // ✅ FIXED: Made optional (backend doesn't always return this)
  metadata?: {                                 // ✅ FIXED: Made optional (backend doesn't always return this)
    processingTime?: number;
    modelVersion?: string;
    fileSize?: number;
  };
}

// ✅ FIXED: Updated response interface to match actual API structure
export interface PreviousCartoonsResponse {
  success: boolean;
  cartoons: CartoonItem[];
  cartoonsByStyle: { [style: string]: CartoonItem[] };
  pagination: {
    limit: number;
    offset: number;
    totalCount: number;
    totalPages: number;
    currentPage: number;
    hasMore: boolean;
    hasPrevious: boolean;
  };
  filters: {
    style: string | null;
    sortBy: string;
    sortOrder: string;
  };
  statistics: {                    // ✅ FIXED: This is where availableStyles is located
    totalCartoons: number;
    styleBreakdown: { [style: string]: number };
    availableStyles: string[];     // ✅ FIXED: Located in statistics, not filters
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

// NEW: Session management for cross-origin authentication
class SessionManager {
  private static instance: SessionManager;
  private supabaseClient: any = null;

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  async initializeSupabase() {
    if (!this.supabaseClient && typeof window !== 'undefined') {
      try {
        const { getClientSupabase } = await import('@/lib/supabase/client');
        this.supabaseClient = getClientSupabase();
        console.log('🔐 Supabase client initialized for API authentication');
      } catch (error) {
        console.error('❌ Failed to initialize Supabase client:', error);
      }
    }
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    await this.initializeSupabase();
    
    if (!this.supabaseClient) {
      console.warn('⚠️ No Supabase client available for authentication');
      return {};
    }

    try {
      const { data: { session }, error } = await this.supabaseClient.auth.getSession();
      
      if (error) {
        console.error('❌ Error getting session:', error);
        return {};
      }

      if (session?.access_token) {
        console.log('🔐 Adding Authorization header for authenticated request');
        return {
          'Authorization': `Bearer ${session.access_token}`,
        };
      }

      console.log('🔐 No active session - making unauthenticated request');
      return {};
    } catch (error) {
      console.error('❌ Error getting auth headers:', error);
      return {};
    }
  }

  async isAuthenticated(): Promise<boolean> {
    await this.initializeSupabase();
    
    if (!this.supabaseClient) return false;

    try {
      const { data: { session } } = await this.supabaseClient.auth.getSession();
      return !!session?.access_token;
    } catch (error) {
      console.error('❌ Error checking authentication:', error);
      return false;
    }
  }

  async refreshSession(): Promise<boolean> {
    await this.initializeSupabase();
    
    if (!this.supabaseClient) return false;

    try {
      const { data, error } = await this.supabaseClient.auth.refreshSession();
      
      if (error) {
        console.error('❌ Error refreshing session:', error);
        return false;
      }

      return !!data?.session?.access_token;
    } catch (error) {
      console.error('❌ Error refreshing session:', error);
      return false;
    }
  }
}

// Global session manager instance
const sessionManager = SessionManager.getInstance();

// Custom options interface for our enhanced API request
interface EnhancedRequestOptions extends RequestInit {
  retries?: number;
  retryDelay?: number;
  enableCache?: boolean;
  cacheTtl?: number;
  timeout?: number;
  requireAuth?: boolean; // NEW: Flag for endpoints that require authentication
}

/**
 * Enhanced API request with retry logic, caching, circuit breaker, and cross-origin auth
 */
async function apiRequest<T = any>(
  endpoint: string,
  options: EnhancedRequestOptions = {}
): Promise<T> {
  const {
    retries = 3,
    retryDelay = 1000,
    enableCache = false,
    cacheTtl = 300000,
    timeout = 30000,
    requireAuth = false,
    ...fetchOptions
  } = options;

  const url = buildApiUrl(endpoint);
  const cacheKey = `${url}-${JSON.stringify(fetchOptions)}`;

  // Check cache first
  if (enableCache && fetchOptions.method !== 'POST') {
    const cached = requestCache.get<T>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  // NEW: Get authentication headers for cross-origin requests
  const authHeaders = requireAuth ? await sessionManager.getAuthHeaders() : {};

  const defaultOptions: RequestInit = {
    credentials: 'include', // Include cookies when possible (same-origin)
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders, // NEW: Add Authorization header for cross-origin auth
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
      console.log(`🌐 Making ${requireAuth ? 'authenticated' : 'public'} request to:`, url);
      if (requireAuth && authHeaders.Authorization) {
        console.log('🔐 Using Authorization header for cross-origin authentication');
      }

      const response = await fetch(url, {
        ...defaultOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const isRetryable = response.status >= 500 || response.status === 429;
        
        // NEW: Handle authentication errors specifically
        if (response.status === 401) {
          console.warn('🔐 Authentication failed - attempting session refresh');
          
          if (requireAuth) {
            const refreshed = await sessionManager.refreshSession();
            if (refreshed) {
              console.log('🔐 Session refreshed - retrying request');
              throw new APIError('Session refreshed, retrying', 401, errorData, true);
            } else {
              console.error('🔐 Session refresh failed - user needs to re-authenticate');
              throw new APIError('Authentication required. Please sign in again.', 401, errorData, false);
            }
          }
        }
        
        throw new APIError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          errorData,
          isRetryable
        );
      }

      const result = await response.json();

      // Cache successful responses
      if (enableCache) {
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

        // Don't retry non-retryable errors (except for auth refresh)
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
        
        // NEW: Add auth headers for polling requests
        const authHeaders = await sessionManager.getAuthHeaders();
        
        const response = await fetch(fullPollingUrl, {
          headers: { 
            'Cache-Control': 'no-cache',
            ...authHeaders, // Include auth headers for polling
          },
          credentials: 'include',
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

// Enhanced API methods with proper authentication flags
export const api = {
  // Auth endpoints (public)
  sendOTP: (phone: string): Promise<OTPResponse> => {
    return apiRequest('api/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
      retries: 2,
      requireAuth: false,
    });
  },

  verifyOTP: (phone: string, otp_code: string): Promise<OTPResponse> => {
    return apiRequest('api/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp_code }),
      retries: 2,
      requireAuth: false,
    });
  },

  // Image endpoints (public)
  uploadImage: (formData: FormData): Promise<UploadImageResponse> => {
    return apiRequest('api/upload-image', {
      method: 'POST',
      body: formData,
      timeout: 60000, // 1 minute for uploads
      requireAuth: false,
    });
  },

  describeImage: (imageUrl: string): Promise<ImageDescribeResponse> => {
    return apiRequest('api/image/describe', {
      method: 'POST',
      body: JSON.stringify({ imageUrl }),
      enableCache: true,
      cacheTtl: 600000, // 10 minutes
      requireAuth: false,
    });
  },

  // NEW: Enhanced character description with AI analysis (public)
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
        enableCache: true,
        cacheTtl: 3600000, // 1 hour
        timeout: 45000, // 45 seconds for AI processing
        requireAuth: false,
      })
    );
  },

  // NEW: Save cartoon image with metadata (AUTHENTICATED)
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
      requireAuth: true, // NEW: Requires authentication
    });
  },

  // NEW: Get user's cartoon history with filtering and pagination (AUTHENTICATED)
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
      enableCache: true,
      cacheTtl: 180000, // 3 minutes
      requireAuth: true, // NEW: Requires authentication
    });
  },

  // Enhanced cartoonize methods (public)
  startCartoonizeJob: (
    prompt: string, 
    style: string, 
    imageUrl: string
  ): Promise<{ jobId: string; pollingUrl: string }> => {
    return apiRequest('api/jobs/cartoonize/start', {
      method: 'POST',
      body: JSON.stringify({ prompt, style, imageUrl }),
      requireAuth: false,
    });
  },

  // NEW: Enhanced cartoonize job status with detailed information (public)
  /**
   * Get enhanced cartoonize job status with queue position and detailed progress
   * @param jobId Job identifier
   * @returns Enhanced job status with queue information
   */
  getEnhancedCartoonizeJobStatus: (jobId: string): Promise<EnhancedCartoonizeJobStatus> => {
    return apiRequest(`api/jobs/cartoonize/status/${jobId}`, {
      enableCache: false, // Always fresh for job status
      requireAuth: false,
    });
  },

  getCartoonizeJobStatus: (jobId: string): Promise<JobStatusResponse> => {
    return apiRequest(`api/jobs/cartoonize/status/${jobId}`, {
      requireAuth: false,
    });
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

  // Story endpoints (public for basic, authenticated for user-specific)
  generateScenes: (
    story: string, 
    characterImage: string, 
    audience: string
  ) => {
    return apiRequest('api/story/generate-scenes', {
      method: 'POST',
      body: JSON.stringify({ story, characterImage, audience }),
      timeout: 120000, // 2 minutes for story generation
      requireAuth: false,
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
      requireAuth: true, // NEW: Requires authentication for user stories
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
      requireAuth: data.user_id ? true : false, // Require auth if user_id provided
    });
  },

  generateCartoonImage: (image_prompt: string) => {
    return apiRequest('api/story/generate-cartoon-image', {
      method: 'POST',
      body: JSON.stringify({ image_prompt }),
      timeout: 90000, // 90 seconds for image generation
      requireAuth: false,
    });
  },

  // User storybook endpoints (AUTHENTICATED)
  getUserStorybooks: (token: string) => {
    return apiRequest('api/story/get-user-storybooks', {
      headers: { 'Authorization': `Bearer ${token}` }, // Explicit token override
      enableCache: true,
      cacheTtl: 300000, // 5 minutes
      requireAuth: true,
    });
  },

  getUserStorybookById: (id: string, token: string) => {
    return apiRequest(`api/story/get-user-storybook-by-id?id=${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }, // Explicit token override
      enableCache: true,
      cacheTtl: 600000, // 10 minutes
      requireAuth: true,
    });
  },

  deleteStorybookById: (id: string, token: string) => {
    // Clear related cache entries
    requestCache.clear();
    
    return apiRequest(`api/story/delete-by-id?id=${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }, // Explicit token override
      requireAuth: true,
    });
  },

  requestPrint: (storybook_id: string, token: string) => {
    return apiRequest('api/story/request-print', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }, // Explicit token override
      body: JSON.stringify({ storybook_id }),
      requireAuth: true,
    });
  },

  // Enhanced job endpoints (mixed authentication)
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
      requireAuth: true, // NEW: Requires authentication for user jobs
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
      requireAuth: false,
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
      requireAuth: true, // NEW: Requires authentication for user jobs
    });
  },

  getUserJobs: (token: string) => {
    return apiRequest('api/jobs/user', {
      headers: { 'Authorization': `Bearer ${token}` }, // Explicit token override
      enableCache: true,
      cacheTtl: 30000, // 30 seconds for job lists
      requireAuth: true,
    });
  },

  cancelJob: (jobId: string) => {
    return apiRequest(`api/jobs/cancel/${jobId}`, {
      method: 'POST',
      requireAuth: false, // Jobs can be cancelled without auth
    });
  },

  deleteJob: (jobId: string, token: string) => {
    return apiRequest(`api/jobs/${jobId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }, // Explicit token override
      requireAuth: true,
    });
  },

  // Storybook rating endpoints (AUTHENTICATED)
  rateStorybook: (storybookId: string, ratingData: {
    character_consistency: number;
    story_flow: number;
    art_quality: number;
    scene_consistency: number;
    overall_experience: number;
    comment?: string;
    would_recommend: boolean;
    time_spent_reading: number;
  }, token: string) => {
    return apiRequest(`api/storybook/${storybookId}/rate`, {
      method: 'POST',
      body: JSON.stringify(ratingData),
      headers: { 'Authorization': `Bearer ${token}` },
      requireAuth: true,
    });
  },

  getStorybookRating: (storybookId: string, token: string) => {
    return apiRequest(`api/storybook/${storybookId}/rating`, {
      headers: { 'Authorization': `Bearer ${token}` },
      enableCache: true,
      cacheTtl: 300000,
      requireAuth: true,
    });
  },

  getStorybookQuality: (storybookId: string, token: string) => {
    return apiRequest(`api/storybook/${storybookId}/quality`, {
      headers: { 'Authorization': `Bearer ${token}` },
      enableCache: true,
      cacheTtl: 300000,
      requireAuth: true,
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
   * Check authentication status
   */
  checkAuth: async (): Promise<boolean> => {
    return sessionManager.isAuthenticated();
  },

  /**
   * Refresh user session
   */
  refreshAuth: async (): Promise<boolean> => {
    return sessionManager.refreshSession();
  },

  /**
   * Validate image URL before making API requests
   * @param url Image URL to validate
   * @returns Promise resolving to validation result
   */
  validateImageUrl: async (url: string): Promise<{ valid: boolean; error?: string }> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, { 
        method: 'HEAD', 
        signal: controller.signal 
      });
      
      clearTimeout(timeoutId);
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
      enableCache: true,
      cacheTtl: 60000, // 1 minute
      requireAuth: false,
    });
  },
};

// Export utility functions for advanced usage
export { requestCache, circuitBreaker, sessionManager };