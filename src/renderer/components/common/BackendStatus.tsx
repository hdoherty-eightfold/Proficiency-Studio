/**
 * Backend Status Indicator Component
 *
 * Shows the current connection status to the backend server.
 * Uses the useBackendHealth hook for real-time monitoring.
 */

import { useState } from 'react';
import { AlertCircle, CheckCircle, Loader2, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  onStatusChange,
}: BackendStatusProps) {
  const { t } = useTranslation();
  const { isHealthy, isChecking, error, refresh, consecutiveFailures } = useBackendHealth({
    onHealthy: () => onStatusChange?.(true),
    onUnhealthy: () => onStatusChange?.(false),
  });

  // Compact dot indicator
  if (compact) {
    return (
      <div
        className={cn('flex items-center gap-1.5', className)}
        title={isHealthy ? t('backend.connected') : error || t('backend.disconnected')}
      >
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            isChecking && 'bg-warning animate-pulse',
            !isChecking && isHealthy && 'bg-success',
            !isChecking && !isHealthy && 'bg-destructive'
          )}
        />
        {showDetails && (
          <span className={cn('text-xs', isHealthy ? 'text-success' : 'text-destructive')}>
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
          <Loader2 className="w-4 h-4 animate-spin text-warning" />
          {showDetails && <span className="text-sm text-warning">{t('backend.checking')}</span>}
        </>
      ) : isHealthy ? (
        <>
          <CheckCircle className="w-4 h-4 text-success" />
          {showDetails && <span className="text-sm text-success">{t('backend.connected')}</span>}
        </>
      ) : (
        <>
          <AlertCircle className="w-4 h-4 text-destructive" />
          {showDetails ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-destructive">
                {t('backend.disconnected')}
                {consecutiveFailures > 1 && ` (${consecutiveFailures} failures)`}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={refresh}
                className="h-6 px-2 text-destructive hover:text-destructive/80"
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
  const { t } = useTranslation();
  const { isHealthy, isChecking, error, refresh, consecutiveFailures } = useBackendHealth();
  const [mountTime] = useState(() => Date.now());
  const isStarting = Date.now() - mountTime < 60_000 && consecutiveFailures < 5;

  // Don't show banner when healthy or still on first check
  if (isHealthy || isChecking) return null;

  // Starting state: yellow banner, less alarming
  if (isStarting) {
    return (
      <div
        role="alert"
        aria-live="polite"
        className={cn(
          'bg-warning text-warning-foreground px-4 py-2 flex items-center justify-between',
          className
        )}
      >
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-medium">{t('backend.starting')}</span>
        </div>
      </div>
    );
  }

  // Failed state: red banner
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'bg-destructive text-destructive-foreground px-4 py-2 flex items-center justify-between',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm font-medium">{t('backend.failed')}</span>
        {error && <span className="text-sm opacity-80">— {error}</span>}
      </div>
      <Button size="sm" variant="secondary" onClick={refresh} className="gap-1">
        <RefreshCw className="w-3 h-3" />
        {t('common.retry')}
      </Button>
    </div>
  );
}

/**
 * Hook for checking if backend is available before operations
 */
// eslint-disable-next-line react-refresh/only-export-components
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
    },
  };
}

export default BackendStatus;
