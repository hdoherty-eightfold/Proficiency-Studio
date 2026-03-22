/**
 * Async Operation Hook with Abort Controller Support
 *
 * Provides a standardized way to handle async operations with:
 * - Automatic abort on component unmount
 * - Abort on new request (prevents race conditions)
 * - Loading, error, and data state management
 * - Type-safe error handling
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { AppError, createAppError } from '../lib/errors';

export interface AsyncOperationState<T> {
  data: T | null;
  isLoading: boolean;
  error: AppError | null;
  isSuccess: boolean;
  isError: boolean;
}

export interface UseAsyncOperationOptions<T> {
  /** Callback when operation succeeds */
  onSuccess?: (data: T) => void;
  /** Callback when operation fails */
  onError?: (error: AppError) => void;
  /** Abort pending operations when component unmounts (default: true) */
  abortOnUnmount?: boolean;
  /** Initial data value */
  initialData?: T | null;
}

export interface AsyncOperationReturn<T> extends AsyncOperationState<T> {
  /** Execute the async operation */
  execute: (asyncFn: (signal: AbortSignal) => Promise<T>, context?: string) => Promise<T | null>;
  /** Abort the current operation */
  abort: () => void;
  /** Reset state to initial values */
  reset: () => void;
  /** Get the current abort signal (for passing to fetch/axios) */
  getSignal: () => AbortSignal | undefined;
}

export function useAsyncOperation<T = any>(
  options: UseAsyncOperationOptions<T> = {}
): AsyncOperationReturn<T> {
  const {
    onSuccess,
    onError,
    abortOnUnmount = true,
    initialData = null
  } = options;

  const [state, setState] = useState<AsyncOperationState<T>>({
    data: initialData,
    isLoading: false,
    error: null,
    isSuccess: false,
    isError: false
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (abortOnUnmount) {
        abortControllerRef.current?.abort();
      }
    };
  }, [abortOnUnmount]);

  const execute = useCallback(async (
    asyncFn: (signal: AbortSignal) => Promise<T>,
    context?: string
  ): Promise<T | null> => {
    // Abort any previous operation
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    // Update state to loading
    setState({
      data: null,
      isLoading: true,
      error: null,
      isSuccess: false,
      isError: false
    });

    try {
      const result = await asyncFn(abortControllerRef.current.signal);

      // Don't update state if unmounted
      if (!mountedRef.current) return null;

      setState({
        data: result,
        isLoading: false,
        error: null,
        isSuccess: true,
        isError: false
      });

      onSuccess?.(result);
      return result;
    } catch (error: unknown) {
      // Don't update state if unmounted
      if (!mountedRef.current) return null;

      // Don't treat abort as error
      if (error instanceof Error && error.name === 'AbortError') {
        setState(prev => ({
          ...prev,
          isLoading: false
        }));
        return null;
      }

      const appError = createAppError(error, context);

      setState({
        data: null,
        isLoading: false,
        error: appError,
        isSuccess: false,
        isError: true
      });

      onError?.(appError);
      return null;
    }
  }, [onSuccess, onError]);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    setState(prev => ({
      ...prev,
      isLoading: false
    }));
  }, []);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setState({
      data: initialData,
      isLoading: false,
      error: null,
      isSuccess: false,
      isError: false
    });
  }, [initialData]);

  const getSignal = useCallback(() => {
    return abortControllerRef.current?.signal;
  }, []);

  return {
    ...state,
    execute,
    abort,
    reset,
    getSignal
  };
}

/**
 * Hook for managing multiple async operations
 */
export function useAsyncOperations<TKeys extends string>() {
  const operations = useRef<Map<TKeys, AbortController>>(new Map());
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      // Abort all operations on unmount
      operations.current.forEach(controller => controller.abort());
      operations.current.clear();
    };
  }, []);

  const execute = useCallback(async <T>(
    key: TKeys,
    asyncFn: (signal: AbortSignal) => Promise<T>
  ): Promise<T | null> => {
    // Abort previous operation with same key
    operations.current.get(key)?.abort();

    const controller = new AbortController();
    operations.current.set(key, controller);

    try {
      const result = await asyncFn(controller.signal);
      operations.current.delete(key);
      return result;
    } catch (error: unknown) {
      operations.current.delete(key);
      if (error instanceof Error && error.name === 'AbortError') {
        return null;
      }
      throw error;
    }
  }, []);

  const abort = useCallback((key: TKeys) => {
    operations.current.get(key)?.abort();
    operations.current.delete(key);
  }, []);

  const abortAll = useCallback(() => {
    operations.current.forEach(controller => controller.abort());
    operations.current.clear();
  }, []);

  const isRunning = useCallback((key: TKeys) => {
    return operations.current.has(key);
  }, []);

  return {
    execute,
    abort,
    abortAll,
    isRunning
  };
}

/**
 * Hook for debounced async operations
 */
export function useDebouncedAsyncOperation<T = any>(
  delay: number = 300,
  options: UseAsyncOperationOptions<T> = {}
) {
  const asyncOp = useAsyncOperation<T>(options);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const executeDebounced = useCallback((
    asyncFn: (signal: AbortSignal) => Promise<T>,
    context?: string
  ) => {
    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      asyncOp.execute(asyncFn, context);
    }, delay);
  }, [asyncOp, delay]);

  const cancel = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    asyncOp.abort();
  }, [asyncOp]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    ...asyncOp,
    executeDebounced,
    cancel
  };
}
