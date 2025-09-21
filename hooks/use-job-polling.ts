'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { buildApiUrl } from '@/lib/api';

export interface JobData {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentStep?: string;
  currentPhase?: string;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  estimatedTimeRemaining?: string;
  error?: string;
  result?: any;
  retryCount?: number;
  maxRetries?: number;
}

interface UseJobPollingOptions {
  pollingInterval?: number;
  maxRetries?: number;
  onStatusChange?: (status: JobData['status'], data: JobData) => void;
  onProgress?: (progress: number, data: JobData) => void;
  onComplete?: (result: any, data: JobData) => void;
  onError?: (error: string, data: JobData) => void;
  autoStart?: boolean;
}

interface UseJobPollingReturn {
  data: JobData | null;
  isPolling: boolean;
  error: string | null;
  startPolling: () => void;
  stopPolling: () => void;
  retry: () => void;
  cancel: () => Promise<boolean>;
}

export function useJobPolling(
  jobId: string | null,
  pollingUrl: string | null,
  options: UseJobPollingOptions = {}
): UseJobPollingReturn {
  const {
    pollingInterval = 2000, // 2 seconds default
    maxRetries = 3,
    onStatusChange,
    onProgress,
    onComplete,
    onError,
    autoStart = true,
  } = options;

  const [data, setData] = useState<JobData | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Ref-based state management to prevent infinite loops
  const isPollingRef = useRef<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastStatusRef = useRef<string | null>(null);
  const lastProgressRef = useRef<number>(-1);
  
  // 🔧 FIX: Create stable callback refs for completion handlers
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  const onStatusChangeRef = useRef(onStatusChange);
  const onProgressRef = useRef(onProgress);
  
  // Update refs when callbacks change
  useEffect(() => {
    onCompleteRef.current = onComplete;
    onErrorRef.current = onError;
    onStatusChangeRef.current = onStatusChange;
    onProgressRef.current = onProgress;
  }, [onComplete, onError, onStatusChange, onProgress]);

  // 🔧 FIX: Stable cleanup function that doesn't change reference
  const cleanup = useCallback(() => {
    console.log('🧹 Cleanup called - stopping all polling activity');
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    isPollingRef.current = false;
    setIsPolling(false);
    
    console.log('🧹 Cleanup complete - polling stopped');
  }, []); // 🔧 FIX: Empty dependency array for stable reference

  // Fetch job status
  const fetchJobStatus = useCallback(async (): Promise<JobData | null> => {
    if (!jobId || !pollingUrl) {
      return null;
    }

    try {
      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      // Ensure polling URL uses Railway backend
      const fullPollingUrl = pollingUrl.startsWith('http') 
        ? pollingUrl 
        : buildApiUrl(pollingUrl);

      console.log(`🔄 Polling Railway backend: ${fullPollingUrl}`);

      const response = await fetch(fullPollingUrl, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const jobData: JobData = await response.json();
      
      console.log('🔍 POLLING RESPONSE:', {
        jobId: jobData.jobId,
        status: jobData.status,
        progress: jobData.progress,
        hasResult: !!jobData.result
      });

      if (jobData.status === 'completed') {
        console.log('✅ COMPLETION DETECTED - should stop polling');
        console.log('🔍 onComplete callback exists:', !!onCompleteRef.current);
        console.log('🔍 jobData.result exists:', !!jobData.result);
      }

      // Reset retry count on successful fetch
      setRetryCount(0);
      setError(null);

      return jobData;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return null; // Request was cancelled
      }

      console.error('❌ Job polling error:', err);
      
      setRetryCount(prev => prev + 1);
      
      // ✅ FIX: Enhanced error handling with better user messages
      let errorMessage = 'Failed to fetch job status';
      let userFriendlyMessage = 'Unable to check job progress. Please wait...';
      let isRetryable = true;
      
      // Parse different error types for better messaging
      if (err.message?.includes('HTTP 404')) {
        errorMessage = 'Job not found';
        userFriendlyMessage = 'This job could not be found. It may have been deleted or expired.';
        isRetryable = false;
      } else if (err.message?.includes('HTTP 401') || err.message?.includes('HTTP 403')) {
        errorMessage = 'Authentication required';
        userFriendlyMessage = 'Please sign in to check job status.';
        isRetryable = false;
      } else if (err.message?.includes('HTTP 429')) {
        errorMessage = 'Rate limit exceeded';
        userFriendlyMessage = 'Too many requests. Slowing down polling...';
        isRetryable = true;
      } else if (err.message?.includes('HTTP 500') || err.message?.includes('HTTP 502') || err.message?.includes('HTTP 503')) {
        errorMessage = 'Server error';
        userFriendlyMessage = 'The server is having issues. We\'ll keep trying...';
        isRetryable = true;
      } else if (err.message?.includes('NetworkError') || err.message?.includes('Failed to fetch')) {
        errorMessage = 'Network error';
        userFriendlyMessage = 'Connection issue. Please check your internet.';
        isRetryable = true;
      } else if (err.message) {
        errorMessage = err.message;
        // Keep generic user message for unknown errors
      }
      
      // Set detailed error for debugging
      setError(userFriendlyMessage);
      
      // Log detailed error information
      console.log('📊 Error details:', {
        errorMessage,
        userFriendlyMessage,
        isRetryable,
        retryCount: retryCount + 1,
        maxRetries
      });
      
      // Handle non-retryable errors
      if (!isRetryable) {
        console.log('🛑 Non-retryable error - stopping polling');
        cleanup();
        
        // Call error callback with enhanced context
        if (onErrorRef.current) {
          // Create enhanced error data
          const errorData: JobData = data || {
            jobId: jobId || 'unknown',
            status: 'failed',
            progress: 0,
            currentStep: 'Error occurred',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            error: errorMessage
          };
          
          onErrorRef.current(userFriendlyMessage, errorData);
        }
        
        return null;
      }
      
      // Handle retryable errors with exponential backoff
      if (retryCount >= maxRetries) {
        const maxRetriesMessage = `Maximum retries (${maxRetries}) exceeded. ${userFriendlyMessage}`;
        setError(maxRetriesMessage);
        console.log('🛑 Max retries exceeded - stopping polling');
        cleanup();
        
        // Call error callback
        if (onErrorRef.current) {
          const errorData: JobData = data || {
            jobId: jobId || 'unknown',
            status: 'failed',
            progress: 0,
            currentStep: 'Max retries exceeded',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            error: maxRetriesMessage
          };
          
          onErrorRef.current(maxRetriesMessage, errorData);
        }
        
        return null;
      }
      
      // For retryable errors, we'll continue polling with backoff
      // The retry mechanism is handled by the polling interval
      console.log(`⏳ Retryable error - will retry (${retryCount + 1}/${maxRetries})`);
      
      // Don't call onError for retryable errors that haven't exceeded max retries
      // This prevents showing error UI while we're still retrying
      
      return null;
    }
  }, [jobId, pollingUrl, data, retryCount, maxRetries, cleanup]); // ✅ FIX: Added necessary dependencies

  // 🔧 FIX: Stable startPolling function
  const startPolling = useCallback(() => {
    if (!jobId || !pollingUrl || isPollingRef.current) {
      console.log('🚫 Polling start blocked:', {
        hasJobId: !!jobId,
        hasPollingUrl: !!pollingUrl,
        isAlreadyPolling: isPollingRef.current
      });
      return;
    }

    console.log(`🔄 Starting job polling for: ${jobId} on Railway backend`);
    
    isPollingRef.current = true;
    setIsPolling(true);
    setError(null);

    // Initial fetch
    fetchJobStatus().then(jobData => {
      if (jobData) {
        console.log(`📊 Initial job data: ${jobData.status} at ${jobData.progress}%`);
        setData(jobData);
      }
    });

    // Set up polling interval
    intervalRef.current = setInterval(async () => {
      if (!isPollingRef.current) {
        console.log('🛑 Polling stopped via ref - clearing interval');
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      const jobData = await fetchJobStatus();
      
      if (!jobData) {
        console.log('⚠️ No job data received, continuing polling...');
        return;
      }

      console.log(`📊 Setting job data: ${jobData.status} at ${jobData.progress}%`);
      setData(jobData);

      // Check for status changes
      if (lastStatusRef.current !== jobData.status) {
        lastStatusRef.current = jobData.status;
        console.log(`🔄 Status changed to: ${jobData.status}`);
        if (onStatusChangeRef.current) {
          onStatusChangeRef.current(jobData.status, jobData);
        }
      }

      // Check for progress changes
      if (lastProgressRef.current !== jobData.progress) {
        lastProgressRef.current = jobData.progress;
        console.log(`📈 Progress changed to: ${jobData.progress}%`);
        if (onProgressRef.current) {
          onProgressRef.current(jobData.progress, jobData);
        }
      }

      // Handle completion
      if (jobData.status === 'completed') {
        console.log(`✅ Job completed: ${jobId} - CALLING CLEANUP`);
        cleanup();
        if (onCompleteRef.current && jobData.result) {
          console.log(`🎉 Calling onComplete with result`);
          onCompleteRef.current(jobData.result, jobData);
        } else {
          console.log(`⚠️ onComplete not called - callback: ${!!onCompleteRef.current}, result: ${!!jobData.result}`);
        }
      }

      // Handle failure
      if (jobData.status === 'failed') {
        console.log(`❌ Job failed: ${jobId} - CALLING CLEANUP`);
        cleanup();
        if (onErrorRef.current && jobData.error) {
          onErrorRef.current(jobData.error, jobData);
        }
      }

      // Handle cancellation
      if (jobData.status === 'cancelled') {
        console.log(`🚫 Job cancelled: ${jobId} - CALLING CLEANUP`);
        cleanup();
      }
    }, pollingInterval);
  }, [jobId, pollingUrl, pollingInterval, fetchJobStatus, cleanup]); // 🔧 FIX: Stable dependencies

  // Stable stopPolling function
  const stopPolling = useCallback(() => {
    console.log(`⏹️ Stopping job polling for: ${jobId}`);
    cleanup();
  }, [jobId, cleanup]);

  // Retry polling
  const retry = useCallback(() => {
    if (retryCount >= maxRetries) {
      setError(`Max retries (${maxRetries}) exceeded`);
      return;
    }

    console.log(`🔄 Retrying job polling for: ${jobId} (attempt ${retryCount + 1})`);
    stopPolling();
    setTimeout(() => {
      startPolling();
    }, 1000 * Math.pow(2, retryCount)); // Exponential backoff
  }, [jobId, retryCount, maxRetries, stopPolling, startPolling]);

  // Cancel job
  const cancel = useCallback(async (): Promise<boolean> => {
    if (!jobId || !data) {
      return false;
    }

    try {
      const cancelUrl = buildApiUrl(`api/jobs/cancel/${jobId}`);
      console.log(`🚫 Cancelling job on Railway backend: ${cancelUrl}`);
      
      const response = await fetch(cancelUrl, {
        method: 'POST',
      });

      if (response.ok) {
        stopPolling();
        setData(prev => prev ? { ...prev, status: 'cancelled' } : null);
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Failed to cancel job:', error);
      return false;
    }
  }, [jobId, data, stopPolling]);

  // 🔧 FIX: Auto-start effect with minimal dependencies to prevent restart loop
  useEffect(() => {
    console.log(`🔍 useEffect trigger - autoStart: ${autoStart}, jobId: ${!!jobId}, pollingUrl: ${!!pollingUrl}, isPollingRef.current: ${isPollingRef.current}`);
    
    if (autoStart && jobId && pollingUrl && !isPollingRef.current) {
      console.log(`🚀 Auto-starting polling for job: ${jobId}`);
      startPolling();
    }

    return cleanup; // 🔧 FIX: Return cleanup directly, not as dependency
  }, [jobId, pollingUrl, autoStart]); // 🔧 FIX: Removed startPolling and cleanup from dependencies

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    data,
    isPolling,
    error,
    startPolling,
    stopPolling,
    retry,
    cancel,
  };
}