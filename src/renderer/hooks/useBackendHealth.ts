/**
 * Backend Health Check Hook
 *
 * Monitors backend server availability and provides status to the UI.
 * Uses cached results to avoid excessive health checks.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../services/api';

export interface BackendHealthState {
  isHealthy: boolean;
  isChecking: boolean;
  lastChecked: Date | null;
  lastSuccessful: Date | null;
  error: string | null;
  consecutiveFailures: number;
}

export interface UseBackendHealthOptions {
  /** Interval between health checks in ms (default: 30000) */
  checkInterval?: number;
  /** Timeout for health check request in ms (default: 5000) */
  timeout?: number;
  /** Whether to start checking immediately (default: true) */
  checkOnMount?: boolean;
  /** Callback when backend becomes healthy */
  onHealthy?: () => void;
  /** Callback when backend becomes unhealthy */
  onUnhealthy?: (error: string) => void;
}

export function useBackendHealth(options: UseBackendHealthOptions = {}) {
  const {
    checkInterval = 30000,
    timeout = 5000,
    checkOnMount = true,
    onHealthy,
    onUnhealthy
  } = options;

  const [health, setHealth] = useState<BackendHealthState>({
    isHealthy: false,
    isChecking: true,
    lastChecked: null,
    lastSuccessful: null,
    error: null,
    consecutiveFailures: 0
  });

  const previousHealthyRef = useRef<boolean | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkHealth = useCallback(async () => {
    // Abort any existing request
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setHealth(prev => ({ ...prev, isChecking: true }));

    // Store timeout ID so we can clear it to prevent memory leak
    let timeoutId: NodeJS.Timeout | null = null;

    try {
      // Create timeout promise with stored ID for cleanup
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Health check timeout')), timeout);
      });

      // Race between health check and timeout
      const healthPromise = api.healthCheck();
      const result = await Promise.race([healthPromise, timeoutPromise]) as { status?: string };

      // Clear timeout since health check completed first
      if (timeoutId) clearTimeout(timeoutId);

      const isHealthy = result?.status === 'healthy' || result?.status === 'ok';
      const now = new Date();

      setHealth(prev => ({
        isHealthy,
        isChecking: false,
        lastChecked: now,
        lastSuccessful: isHealthy ? now : prev.lastSuccessful,
        error: isHealthy ? null : 'Backend returned unhealthy status',
        consecutiveFailures: isHealthy ? 0 : prev.consecutiveFailures + 1
      }));

      // Call callbacks on state change
      if (previousHealthyRef.current !== null && previousHealthyRef.current !== isHealthy) {
        if (isHealthy) {
          onHealthy?.();
        } else {
          onUnhealthy?.('Backend returned unhealthy status');
        }
      }
      previousHealthyRef.current = isHealthy;

      return isHealthy;
    } catch (error: unknown) {
      // Always clear timeout on error to prevent memory leak
      if (timeoutId) clearTimeout(timeoutId);

      // Don't update state if aborted
      if (error instanceof Error && error.name === 'AbortError') {
        return false;
      }

      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to backend';
      const now = new Date();

      setHealth(prev => ({
        isHealthy: false,
        isChecking: false,
        lastChecked: now,
        lastSuccessful: prev.lastSuccessful,
        error: errorMessage,
        consecutiveFailures: prev.consecutiveFailures + 1
      }));

      // Call unhealthy callback on state change
      if (previousHealthyRef.current !== false) {
        onUnhealthy?.(errorMessage);
      }
      previousHealthyRef.current = false;

      return false;
    }
  }, [timeout, onHealthy, onUnhealthy]);

  // Initial check and interval setup
  useEffect(() => {
    if (checkOnMount) {
      checkHealth();
    }

    // Set up periodic health checks
    intervalRef.current = setInterval(checkHealth, checkInterval);

    return () => {
      // Cleanup
      abortControllerRef.current?.abort();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkHealth, checkInterval, checkOnMount]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    return checkHealth();
  }, [checkHealth]);

  // Pause/resume health checks
  const pause = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resume = useCallback(() => {
    if (!intervalRef.current) {
      intervalRef.current = setInterval(checkHealth, checkInterval);
    }
  }, [checkHealth, checkInterval]);

  return {
    ...health,
    refresh,
    checkHealth,
    pause,
    resume,
    /** Time since last successful check in ms */
    timeSinceLastSuccess: health.lastSuccessful
      ? Date.now() - health.lastSuccessful.getTime()
      : null,
    /** Whether the backend has been recently healthy (within 2x check interval) */
    wasRecentlyHealthy: health.lastSuccessful
      ? Date.now() - health.lastSuccessful.getTime() < checkInterval * 2
      : false
  };
}

/**
 * Simple hook for one-time health check
 */
export function useBackendAvailable(): boolean {
  const { isHealthy, isChecking } = useBackendHealth({
    checkInterval: 60000, // Less frequent for simple checks
    checkOnMount: true
  });

  return !isChecking && isHealthy;
}
