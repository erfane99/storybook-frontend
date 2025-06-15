'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

export interface CartoonizeJobState {
  isLoading: boolean;
  progress: number;
  status: string;
  error: string | null;
  result: string | null;
  jobId: string | null;
}

export interface UseCartoonizeJobReturn {
  state: CartoonizeJobState;
  startCartoonize: (prompt: string, style: string, imageUrl: string) => Promise<void>;
  reset: () => void;
}

export function useCartoonizeJob(): UseCartoonizeJobReturn {
  const [state, setState] = useState<CartoonizeJobState>({
    isLoading: false,
    progress: 0,
    status: '',
    error: null,
    result: null,
    jobId: null,
  });

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      progress: 0,
      status: '',
      error: null,
      result: null,
      jobId: null,
    });
  }, []);

  const startCartoonize = useCallback(async (
    prompt: string,
    style: string,
    imageUrl: string
  ) => {
    setState(prev => ({
      ...prev,
      isLoading: true,
      progress: 0,
      status: 'Starting...',
      error: null,
      result: null,
    }));

    try {
      const result = await api.cartoonizeImage(
        prompt,
        style,
        imageUrl,
        (progress) => {
          setState(prev => ({
            ...prev,
            progress,
          }));
        },
        (status) => {
          setState(prev => ({
            ...prev,
            status,
          }));
        }
      );

      setState(prev => ({
        ...prev,
        isLoading: false,
        progress: 100,
        status: 'completed',
        result: result.url,
      }));

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        progress: 0,
        status: 'failed',
        error: error.message || 'Failed to generate cartoon image',
      }));
    }
  }, []);

  return {
    state,
    startCartoonize,
    reset,
  };
}