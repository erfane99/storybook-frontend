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
    console.log('🎨 Starting cartoonize job on Railway backend...');
    
    setState(prev => ({
      ...prev,
      isLoading: true,
      progress: 0,
      status: 'Starting...',
      error: null,
      result: null,
    }));

    try {
      // Use Railway backend API for cartoonization
      const result = await api.cartoonizeImage(
        prompt,
        style,
        imageUrl,
        (progress) => {
          console.log(`🎨 Cartoonize progress: ${progress}%`);
          setState(prev => ({
            ...prev,
            progress,
          }));
        },
        (status) => {
          console.log(`🎨 Cartoonize status: ${status}`);
          setState(prev => ({
            ...prev,
            status,
          }));
        }
      );

      console.log('✅ Cartoonize job completed successfully');
      setState(prev => ({
        ...prev,
        isLoading: false,
        progress: 100,
        status: 'completed',
        result: result.url,
      }));

    } catch (error: any) {
      console.error('❌ Cartoonize job failed:', error);
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