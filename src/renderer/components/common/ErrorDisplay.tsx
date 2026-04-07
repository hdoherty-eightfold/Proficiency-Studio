/**
 * Error Display Component
 *
 * Reusable component for displaying errors with consistent styling.
 * Built on top of the shadcn Alert component for design-system consistency.
 * Supports AppError types, retry/dismiss actions, and compact mode.
 */

import { RefreshCw, X, Info } from 'lucide-react';
import { AppError, ErrorType } from '../../lib/errors';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle, InlineAlert } from '../ui/alert';
import { cn } from '../../lib/utils';

interface ErrorDisplayProps {
  /** The error to display - can be AppError, string, or null */
  error: AppError | string | null;
  /** Callback when retry button is clicked */
  onRetry?: () => void;
  /** Callback when dismiss button is clicked */
  onDismiss?: () => void;
  /** Display variant */
  variant?: 'inline' | 'banner' | 'card';
  /** Additional CSS classes */
  className?: string;
  /** Show compact version */
  compact?: boolean;
}

/**
 * Normalize error to AppError type
 */
function normalizeError(error: AppError | string | null): AppError | null {
  if (!error) return null;

  if (typeof error === 'string') {
    return {
      type: ErrorType.UNKNOWN,
      message: error,
      recoverable: true,
    };
  }

  return error;
}

export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  variant = 'inline',
  className,
  compact = false,
}: ErrorDisplayProps) {
  const appError = normalizeError(error);

  if (!appError) return null;

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <InlineAlert variant="destructive">{appError.message}</InlineAlert>
        {onRetry && appError.recoverable && (
          <Button size="sm" variant="ghost" onClick={onRetry} className="h-6 px-2">
            <RefreshCw className="w-3 h-3" />
          </Button>
        )}
        {onDismiss && (
          <Button size="sm" variant="ghost" onClick={onDismiss} className="h-6 px-2">
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  const alertClass = cn(
    variant === 'banner' ? 'rounded-none border-x-0' : undefined,
    variant === 'card' ? 'shadow-lg' : undefined,
    className
  );

  return (
    <Alert
      variant="destructive"
      className={alertClass}
      dismissible={!!onDismiss}
      onDismiss={onDismiss}
    >
      <AlertTitle className="flex items-center justify-between">
        <span>{appError.message}</span>
        {onRetry && appError.recoverable && (
          <Button
            size="sm"
            variant={variant === 'banner' ? 'secondary' : 'outline'}
            onClick={onRetry}
            className="gap-1 ml-4"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </Button>
        )}
      </AlertTitle>

      {(appError.details || appError.userAction) && (
        <AlertDescription>
          {appError.details && <p>{appError.details}</p>}
          {appError.userAction && (
            <p className="flex items-center gap-1 mt-1">
              <Info className="w-4 h-4" />
              {appError.userAction}
            </p>
          )}
        </AlertDescription>
      )}
    </Alert>
  );
}

/**
 * Simple inline error message
 */
export function ErrorMessage({
  message,
  className,
}: {
  message: string | null | undefined;
  className?: string;
}) {
  if (!message) return null;

  return (
    <InlineAlert variant="destructive" className={className}>
      {message}
    </InlineAlert>
  );
}

export default ErrorDisplay;
