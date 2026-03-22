/**
 * Tests for useAsyncOperation, useAsyncOperations, and useDebouncedAsyncOperation hooks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAsyncOperation, useAsyncOperations, useDebouncedAsyncOperation } from './useAsyncOperation';
import { ErrorType } from '../lib/errors';

// Helper: create a deferred promise for fine-grained control
function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// Helper: create an async fn that respects AbortSignal
function abortableAsync<T>(value: T, delay: number = 0) {
  return (signal: AbortSignal): Promise<T> =>
    new Promise((resolve, reject) => {
      if (signal.aborted) {
        const err = new Error('Aborted');
        err.name = 'AbortError';
        reject(err);
        return;
      }
      const timer = setTimeout(() => resolve(value), delay);
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        const err = new Error('Aborted');
        err.name = 'AbortError';
        reject(err);
      });
    });
}

describe('useAsyncOperation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should have correct initial state', () => {
    const { result } = renderHook(() => useAsyncOperation<string>());

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('should accept initialData option', () => {
    const { result } = renderHook(() =>
      useAsyncOperation<string>({ initialData: 'hello' })
    );

    expect(result.current.data).toBe('hello');
  });

  it('should set loading state during operation', async () => {
    const deferred = createDeferred<string>();
    const { result } = renderHook(() => useAsyncOperation<string>());

    // Start the operation but don't resolve yet
    let executePromise: Promise<string | null>;
    act(() => {
      executePromise = result.current.execute(() => deferred.promise);
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();

    // Resolve
    await act(async () => {
      deferred.resolve('done');
      await executePromise!;
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('should set data on successful operation', async () => {
    const { result } = renderHook(() => useAsyncOperation<string>());

    await act(async () => {
      const returnVal = await result.current.execute(async () => 'success-data');
      expect(returnVal).toBe('success-data');
    });

    expect(result.current.data).toBe('success-data');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should set error on failed operation', async () => {
    const { result } = renderHook(() => useAsyncOperation<string>());

    await act(async () => {
      const returnVal = await result.current.execute(async () => {
        throw new Error('Something went wrong');
      });
      expect(returnVal).toBeNull();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(true);
    expect(result.current.error).not.toBeNull();
    expect(result.current.error!.message).toBe('Something went wrong');
    expect(result.current.error!.type).toBe(ErrorType.UNKNOWN);
  });

  it('should pass context to createAppError on failure', async () => {
    const { result } = renderHook(() => useAsyncOperation<string>());

    await act(async () => {
      await result.current.execute(async () => {
        throw new Error('fail');
      }, 'test-context');
    });

    expect(result.current.error!.details).toBe('test-context');
  });

  it('should call onSuccess callback on success', async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useAsyncOperation<string>({ onSuccess })
    );

    await act(async () => {
      await result.current.execute(async () => 'result');
    });

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledWith('result');
  });

  it('should call onError callback on failure', async () => {
    const onError = vi.fn();
    const { result } = renderHook(() =>
      useAsyncOperation<string>({ onError })
    );

    await act(async () => {
      await result.current.execute(async () => {
        throw new Error('oops');
      });
    });

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'oops' })
    );
  });

  it('should reset state to initial values', async () => {
    const { result } = renderHook(() =>
      useAsyncOperation<string>({ initialData: 'init' })
    );

    // Produce a success state
    await act(async () => {
      await result.current.execute(async () => 'data');
    });

    expect(result.current.data).toBe('data');
    expect(result.current.isSuccess).toBe(true);

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBe('init');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('should reset state after error', async () => {
    const { result } = renderHook(() => useAsyncOperation<string>());

    await act(async () => {
      await result.current.execute(async () => {
        throw new Error('fail');
      });
    });

    expect(result.current.isError).toBe(true);

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isError).toBe(false);
  });

  it('should abort current operation when abort() is called', async () => {
    const { result } = renderHook(() => useAsyncOperation<string>());

    // Start a long operation
    act(() => {
      result.current.execute(abortableAsync('value', 5000));
    });

    expect(result.current.isLoading).toBe(true);

    // Abort
    await act(async () => {
      result.current.abort();
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current.isLoading).toBe(false);
    // AbortError should not be treated as a regular error
    expect(result.current.isError).toBe(false);
  });

  it('should treat AbortError specially (not set isError)', async () => {
    const { result } = renderHook(() => useAsyncOperation<string>());

    act(() => {
      result.current.execute(abortableAsync('value', 5000));
    });

    await act(async () => {
      result.current.abort();
      await vi.advanceTimersByTimeAsync(5100);
    });

    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeNull();
  });

  it('should abort previous operation when execute is called again', async () => {
    const firstFn = vi.fn(abortableAsync('first', 5000));
    const secondFn = vi.fn(async () => 'second');
    const { result } = renderHook(() => useAsyncOperation<string>());

    // Start first operation
    act(() => {
      result.current.execute(firstFn);
    });

    // Start second operation (should abort first)
    await act(async () => {
      await result.current.execute(secondFn);
    });

    expect(result.current.data).toBe('second');
    expect(result.current.isSuccess).toBe(true);
  });

  it('should handle multiple sequential operations correctly', async () => {
    const { result } = renderHook(() => useAsyncOperation<number>());

    // First: succeed
    await act(async () => {
      await result.current.execute(async () => 1);
    });
    expect(result.current.data).toBe(1);
    expect(result.current.isSuccess).toBe(true);

    // Second: succeed with different value
    await act(async () => {
      await result.current.execute(async () => 2);
    });
    expect(result.current.data).toBe(2);
    expect(result.current.isSuccess).toBe(true);

    // Third: fail
    await act(async () => {
      await result.current.execute(async () => {
        throw new Error('third failed');
      });
    });
    expect(result.current.data).toBeNull();
    expect(result.current.isError).toBe(true);
  });

  it('should recover from error (fail then succeed)', async () => {
    const { result } = renderHook(() => useAsyncOperation<string>());

    // Fail first
    await act(async () => {
      await result.current.execute(async () => {
        throw new Error('temporary failure');
      });
    });

    expect(result.current.isError).toBe(true);
    expect(result.current.error!.message).toBe('temporary failure');

    // Succeed next
    await act(async () => {
      await result.current.execute(async () => 'recovered');
    });

    expect(result.current.data).toBe('recovered');
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.isError).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should pass AbortSignal to the async function', async () => {
    const asyncFn = vi.fn(async (_signal: AbortSignal) => 'ok');
    const { result } = renderHook(() => useAsyncOperation<string>());

    await act(async () => {
      await result.current.execute(asyncFn);
    });

    expect(asyncFn).toHaveBeenCalledTimes(1);
    expect(asyncFn.mock.calls[0][0]).toBeInstanceOf(AbortSignal);
  });

  it('should provide getSignal that returns current abort signal', async () => {
    const { result } = renderHook(() => useAsyncOperation<string>());

    // Before any execution, signal may be undefined
    expect(result.current.getSignal()).toBeUndefined();

    // After starting an operation, signal should exist
    const deferred = createDeferred<string>();
    act(() => {
      result.current.execute(() => deferred.promise);
    });

    expect(result.current.getSignal()).toBeInstanceOf(AbortSignal);

    await act(async () => {
      deferred.resolve('done');
    });
  });

  it('should not update state after unmount', async () => {
    const deferred = createDeferred<string>();
    const { result, unmount } = renderHook(() => useAsyncOperation<string>());

    act(() => {
      result.current.execute(() => deferred.promise);
    });

    // Unmount while loading
    unmount();

    // Resolve after unmount -- should not throw
    await act(async () => {
      deferred.resolve('too late');
    });

    // State should remain as loading since update was skipped
    // (we can't check result.current after unmount in a meaningful way,
    //  but no errors = success)
  });

  it('should abort on unmount when abortOnUnmount is true (default)', async () => {
    const abortHandler = vi.fn();
    const { result, unmount } = renderHook(() => useAsyncOperation<string>());

    act(() => {
      result.current.execute((signal) => {
        signal.addEventListener('abort', abortHandler);
        return new Promise(() => {}); // never resolves
      });
    });

    unmount();

    expect(abortHandler).toHaveBeenCalled();
  });

  it('should not abort on unmount when abortOnUnmount is false', async () => {
    const abortHandler = vi.fn();
    const { result, unmount } = renderHook(() =>
      useAsyncOperation<string>({ abortOnUnmount: false })
    );

    act(() => {
      result.current.execute((signal) => {
        signal.addEventListener('abort', abortHandler);
        return new Promise(() => {}); // never resolves
      });
    });

    unmount();

    expect(abortHandler).not.toHaveBeenCalled();
  });

  it('should clear data when starting a new operation', async () => {
    const { result } = renderHook(() => useAsyncOperation<string>());

    // First succeed
    await act(async () => {
      await result.current.execute(async () => 'first');
    });
    expect(result.current.data).toBe('first');

    // Start new operation -- data should be null while loading
    const deferred = createDeferred<string>();
    act(() => {
      result.current.execute(() => deferred.promise);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      deferred.resolve('second');
    });
  });
});

describe('useAsyncOperations', () => {
  it('should execute keyed operations independently', async () => {
    const { result } = renderHook(() => useAsyncOperations<'a' | 'b'>());

    let resultA: string | null = null;
    let resultB: number | null = null;

    await act(async () => {
      resultA = await result.current.execute('a', async () => 'hello');
      resultB = await result.current.execute('b', async () => 42);
    });

    expect(resultA).toBe('hello');
    expect(resultB).toBe(42);
  });

  it('should abort previous operation with same key', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAsyncOperations<'task'>());

    const abortHandler = vi.fn();

    // Start first operation
    act(() => {
      result.current.execute('task', (signal) => {
        signal.addEventListener('abort', abortHandler);
        return new Promise(() => {}); // never resolves
      });
    });

    // Start second with same key -- should abort first
    await act(async () => {
      await result.current.execute('task', async () => 'second');
    });

    expect(abortHandler).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('should track running state via isRunning', async () => {
    const deferred = createDeferred<string>();
    const { result } = renderHook(() => useAsyncOperations<'op'>());

    act(() => {
      result.current.execute('op', () => deferred.promise);
    });

    expect(result.current.isRunning('op')).toBe(true);

    await act(async () => {
      deferred.resolve('done');
    });

    expect(result.current.isRunning('op')).toBe(false);
  });

  it('should abort a specific key', async () => {
    const abortHandler = vi.fn();
    const { result } = renderHook(() => useAsyncOperations<'x'>());

    act(() => {
      result.current.execute('x', (signal) => {
        signal.addEventListener('abort', abortHandler);
        return new Promise(() => {});
      });
    });

    act(() => {
      result.current.abort('x');
    });

    expect(abortHandler).toHaveBeenCalled();
    expect(result.current.isRunning('x')).toBe(false);
  });

  it('should abort all operations', async () => {
    const abortA = vi.fn();
    const abortB = vi.fn();
    const { result } = renderHook(() => useAsyncOperations<'a' | 'b'>());

    act(() => {
      result.current.execute('a', (signal) => {
        signal.addEventListener('abort', abortA);
        return new Promise(() => {});
      });
      result.current.execute('b', (signal) => {
        signal.addEventListener('abort', abortB);
        return new Promise(() => {});
      });
    });

    act(() => {
      result.current.abortAll();
    });

    expect(abortA).toHaveBeenCalled();
    expect(abortB).toHaveBeenCalled();
  });

  it('should abort all on unmount', async () => {
    const abortHandler = vi.fn();
    const { result, unmount } = renderHook(() => useAsyncOperations<'op'>());

    act(() => {
      result.current.execute('op', (signal) => {
        signal.addEventListener('abort', abortHandler);
        return new Promise(() => {});
      });
    });

    unmount();

    expect(abortHandler).toHaveBeenCalled();
  });

  it('should re-throw non-abort errors', async () => {
    const { result } = renderHook(() => useAsyncOperations<'op'>());

    await expect(
      act(async () => {
        await result.current.execute('op', async () => {
          throw new Error('real error');
        });
      })
    ).rejects.toThrow('real error');
  });

  it('should return null for AbortError', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAsyncOperations<'op'>());

    let returnVal: string | null = 'not-null';

    act(() => {
      const promise = result.current.execute('op', abortableAsync('value', 5000));
      // Abort immediately
      result.current.abort('op');
      promise.then((v) => {
        returnVal = v;
      });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(returnVal).toBeNull();
    vi.useRealTimers();
  });
});

describe('useDebouncedAsyncOperation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should debounce execution by the specified delay', async () => {
    const asyncFn = vi.fn(async () => 'result');
    const { result } = renderHook(() => useDebouncedAsyncOperation<string>(200));

    // Call executeDebounced multiple times rapidly
    act(() => {
      result.current.executeDebounced(asyncFn);
      result.current.executeDebounced(asyncFn);
      result.current.executeDebounced(asyncFn);
    });

    // Before delay, should not have executed
    expect(asyncFn).not.toHaveBeenCalled();

    // Advance past debounce delay
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    // Should only execute once
    expect(asyncFn).toHaveBeenCalledTimes(1);
  });

  it('should cancel pending debounced operation', async () => {
    const asyncFn = vi.fn(async () => 'result');
    const { result } = renderHook(() => useDebouncedAsyncOperation<string>(200));

    act(() => {
      result.current.executeDebounced(asyncFn);
    });

    // Cancel before delay
    act(() => {
      result.current.cancel();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(asyncFn).not.toHaveBeenCalled();
  });

  it('should set data after debounced execution completes', async () => {
    const { result } = renderHook(() => useDebouncedAsyncOperation<string>(100));

    act(() => {
      result.current.executeDebounced(async () => 'debounced-result');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });

    expect(result.current.data).toBe('debounced-result');
    expect(result.current.isSuccess).toBe(true);
  });

  it('should support onSuccess/onError options', async () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() =>
      useDebouncedAsyncOperation<string>(100, { onSuccess })
    );

    act(() => {
      result.current.executeDebounced(async () => 'ok');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(150);
    });

    expect(onSuccess).toHaveBeenCalledWith('ok');
  });

  it('should cleanup timer on unmount', async () => {
    const asyncFn = vi.fn(async () => 'result');
    const { result, unmount } = renderHook(() =>
      useDebouncedAsyncOperation<string>(200)
    );

    act(() => {
      result.current.executeDebounced(asyncFn);
    });

    unmount();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    // Should not have executed after unmount
    expect(asyncFn).not.toHaveBeenCalled();
  });
});
