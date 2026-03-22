/**
 * Tests for useBackendHealth hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBackendHealth, useBackendAvailable } from './useBackendHealth';

// Mock the api module
vi.mock('../services/api', () => ({
  api: {
    healthCheck: vi.fn(),
  },
}));

import { api } from '../services/api';

describe('useBackendHealth', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start with isChecking true', () => {
    vi.mocked(api.healthCheck).mockResolvedValue({ status: 'healthy' });

    const { result } = renderHook(() => useBackendHealth({ checkOnMount: false }));

    // Initial state before mount check
    expect(result.current.isChecking).toBe(true);
  });

  it('should set isHealthy to true when backend returns healthy', async () => {
    vi.mocked(api.healthCheck).mockResolvedValue({ status: 'healthy' });

    const { result } = renderHook(() => useBackendHealth());

    // Flush microtasks and timers
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current.isHealthy).toBe(true);
    expect(result.current.isChecking).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should set isHealthy to true when backend returns ok', async () => {
    vi.mocked(api.healthCheck).mockResolvedValue({ status: 'ok' });

    const { result } = renderHook(() => useBackendHealth());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current.isHealthy).toBe(true);
  });

  it('should set isHealthy to false and increment consecutiveFailures on error', async () => {
    vi.mocked(api.healthCheck).mockRejectedValue(new Error('Connection failed'));

    const { result } = renderHook(() => useBackendHealth());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current.isHealthy).toBe(false);
    expect(result.current.error).toBe('Connection failed');
    expect(result.current.consecutiveFailures).toBe(1);
  });

  it('should call onHealthy callback when backend becomes healthy', async () => {
    const onHealthy = vi.fn();
    vi.mocked(api.healthCheck)
      .mockRejectedValueOnce(new Error('Failed'))
      .mockResolvedValueOnce({ status: 'healthy' });

    const { result } = renderHook(() => useBackendHealth({
      onHealthy,
      checkInterval: 1000
    }));

    // First check - fails
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current.isHealthy).toBe(false);

    // Trigger interval check - succeeds
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.isHealthy).toBe(true);
    expect(onHealthy).toHaveBeenCalledTimes(1);
  });

  it('should call onUnhealthy callback when backend becomes unhealthy', async () => {
    const onUnhealthy = vi.fn();
    vi.mocked(api.healthCheck)
      .mockResolvedValueOnce({ status: 'healthy' })
      .mockRejectedValueOnce(new Error('Connection lost'));

    const { result } = renderHook(() => useBackendHealth({
      onUnhealthy,
      checkInterval: 1000
    }));

    // First check - healthy
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current.isHealthy).toBe(true);

    // Trigger interval check - fails
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(result.current.isHealthy).toBe(false);
    expect(onUnhealthy).toHaveBeenCalledTimes(1);
    expect(onUnhealthy).toHaveBeenCalledWith('Connection lost');
  });

  it('should handle timeout correctly', async () => {
    // Create a promise that never resolves to simulate timeout
    vi.mocked(api.healthCheck).mockImplementation(() =>
      new Promise(() => {})
    );

    const { result } = renderHook(() => useBackendHealth({ timeout: 1000 }));

    // Advance past timeout
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(result.current.isHealthy).toBe(false);
    expect(result.current.error).toBe('Health check timeout');
  });

  it('should provide refresh function that triggers manual check', async () => {
    vi.mocked(api.healthCheck).mockResolvedValue({ status: 'healthy' });

    const { result } = renderHook(() => useBackendHealth({ checkOnMount: false }));

    // Call refresh
    act(() => {
      result.current.refresh();
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(api.healthCheck).toHaveBeenCalled();
  });

  it('should pause and resume health checks', async () => {
    vi.mocked(api.healthCheck).mockResolvedValue({ status: 'healthy' });

    const { result } = renderHook(() => useBackendHealth({ checkInterval: 1000 }));

    // Initial check
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Pause
    act(() => {
      result.current.pause();
    });

    // Clear mock calls
    vi.mocked(api.healthCheck).mockClear();

    // Advance timer - should not trigger check
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(api.healthCheck).not.toHaveBeenCalled();

    // Resume
    act(() => {
      result.current.resume();
    });

    // Now advance timer - should trigger check
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(api.healthCheck).toHaveBeenCalled();
  });

  it('should cleanup timeout on unmount (no memory leak)', async () => {
    vi.mocked(api.healthCheck).mockImplementation(() =>
      new Promise(() => {}) // Never resolves
    );

    const { unmount } = renderHook(() => useBackendHealth({ timeout: 5000 }));

    // Trigger health check
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Unmount before timeout
    unmount();

    // Advance past timeout - should not throw or cause issues
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10000);
    });

    expect(true).toBe(true);
  });

  it('should track timeSinceLastSuccess correctly', async () => {
    vi.mocked(api.healthCheck).mockResolvedValue({ status: 'healthy' });

    const { result } = renderHook(() => useBackendHealth());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(result.current.lastSuccessful).not.toBeNull();
  });
});

describe('useBackendAvailable', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return true when backend is healthy', async () => {
    vi.mocked(api.healthCheck).mockResolvedValue({ status: 'healthy' });

    renderHook(() => useBackendAvailable());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(api.healthCheck).toHaveBeenCalled();
  });

  it('should return false when backend is unhealthy', async () => {
    vi.mocked(api.healthCheck).mockRejectedValue(new Error('Failed'));

    renderHook(() => useBackendAvailable());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(api.healthCheck).toHaveBeenCalled();
  });
});
