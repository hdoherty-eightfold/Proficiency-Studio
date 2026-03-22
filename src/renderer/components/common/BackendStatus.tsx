/**
 * Backend Status Indicator Component
 *
 * Shows the current connection status to the backend server.
 * Uses the useBackendHealth hook for real-time monitoring.
 */

import { useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { useBackendHealth } from '../../hooks/useBackendHealth';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

interface BackendStatusProps {
  /** Show detailed status information */
  showDetails?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Show as compact dot indicator */
  compact?: boolean;
  /** Callback when status changes */
  onStatusChange?: (isHealthy: boolean) => void;
}

export function BackendStatus({
  showDetails = false,
  className,
  compact = false,
  onStatusChange
}: BackendStatusProps) {
  const {
    isHealthy,
    isChecking,
    error,
    refresh,
    consecutiveFailures,
  } = useBackendHealth({
    onHealthy: () => onStatusChange?.(true),
    onUnhealthy: () => onStatusChange?.(false)
  });

  // Compact dot indicator
  if (compact) {
    return (
      <div
        className={cn('flex items-center gap-1.5', className)}
        title={isHealthy ? 'Backend connected' : error || 'Backend disconnected'}
      >
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            isChecking && 'bg-yellow-500 animate-pulse',
            !isChecking && isHealthy && 'bg-green-500',
            !isChecking && !isHealthy && 'bg-red-500'
          )}
        />
        {showDetails && (
          <span className={cn(
            'text-xs',
            isHealthy ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          )}>
            {isHealthy ? 'Connected' : 'Disconnected'}
          </span>
        )}
      </div>
    );
  }

  // Full status display
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {isChecking ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
          {showDetails && (
            <span className="text-sm text-yellow-600 dark:text-yellow-400">
              Checking connection...
            </span>
          )}
        </>
      ) : isHealthy ? (
        <>
          <CheckCircle className="w-4 h-4 text-green-500" />
          {showDetails && (
            <span className="text-sm text-green-600 dark:text-green-400">
              Backend connected
            </span>
          )}
        </>
      ) : (
        <>
          <AlertCircle className="w-4 h-4 text-red-500" />
          {showDetails ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-red-600 dark:text-red-400">
                Backend offline
                {consecutiveFailures > 1 && ` (${consecutiveFailures} failures)`}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={refresh}
                className="h-6 px-2 text-red-600 hover:text-red-700"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={refresh}
              className="h-6 px-2"
              title="Click to retry connection"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Backend Status Banner
 *
 * Shows a banner at the top of the app when backend is unavailable.
 * Distinguishes between "starting" (first 60s) and "failed" states.
 */
export function BackendStatusBanner({ className }: { className?: string }) {
  const { isHealthy, isChecking, error, refresh, consecutiveFailures } = useBackendHealth();
  const [mountTime] = useState(() => Date.now());
  const isStarting = Date.now() - mountTime < 60_000 && consecutiveFailures < 5;

  // Don't show banner when healthy or still on first check
  if (isHealthy || isChecking) return null;

  // Starting state: yellow banner, less alarming
  if (isStarting) {
    return (
      <div className={cn(
        'bg-yellow-500 text-yellow-950 px-4 py-2 flex items-center justify-between',
        className
      )}>
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">
            Backend is starting up...
          </span>
        </div>
      </div>
    );
  }

  // Failed state: red banner
  return (
    <div className={cn(
      'bg-red-500 text-white px-4 py-2 flex items-center justify-between',
      className
    )}>
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm font-medium">
          Backend failed to start
        </span>
        {error && (
          <span className="text-sm text-red-100">
            — {error}
          </span>
        )}
      </div>
      <Button
        size="sm"
        variant="secondary"
        onClick={refresh}
        className="gap-1"
      >
        <RefreshCw className="w-3 h-3" />
        Retry
      </Button>
    </div>
  );
}

/**
 * Hook for checking if backend is available before operations
 */
export function useRequireBackend() {
  const { isHealthy, isChecking, refresh, error } = useBackendHealth();

  return {
    isAvailable: isHealthy,
    isChecking,
    error,
    checkConnection: refresh,
    requireBackend: async (): Promise<boolean> => {
      if (isHealthy) return true;
      const result = await refresh();
      return result;
    }
  };
}

export default BackendStatus;
