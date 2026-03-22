/**
 * Error Display Component
 *
 * Reusable component for displaying errors with consistent styling.
 * Supports different variants and optional retry/dismiss actions.
 */

import { AlertTriangle, RefreshCw, X, Info, AlertCircle } from 'lucide-react';
import { AppError, ErrorType } from '../../lib/errors';
import { Button } from '../ui/button';
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
      recoverable: true
    };
  }

  return error;
}

/**
 * Get icon for error type
 */
function getErrorIcon(type: ErrorType) {
  switch (type) {
    case ErrorType.NETWORK:
    case ErrorType.BACKEND:
    case ErrorType.TIMEOUT:
      return AlertCircle;
    default:
      return AlertTriangle;
  }
}

export function ErrorDisplay({
  error,
  onRetry,
  onDismiss,
  variant = 'inline',
  className,
  compact = false
}: ErrorDisplayProps) {
  const appError = normalizeError(error);

  if (!appError) return null;

  const Icon = getErrorIcon(appError.type);

  // Variant styles
  const variantStyles = {
    inline: 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4',
    banner: 'bg-red-500 text-white px-4 py-3',
    card: 'bg-card border border-red-200 dark:border-red-800 rounded-xl shadow-lg p-6'
  };

  const textStyles = {
    inline: {
      title: 'text-red-800 dark:text-red-200',
      detail: 'text-red-600 dark:text-red-400',
      action: 'text-red-600 dark:text-red-400'
    },
    banner: {
      title: 'text-white',
      detail: 'text-red-100',
      action: 'text-red-100'
    },
    card: {
      title: 'text-red-700 dark:text-red-300',
      detail: 'text-red-600 dark:text-red-400',
      action: 'text-red-600 dark:text-red-400'
    }
  };

  const styles = textStyles[variant];

  if (compact) {
    return (
      <div className={cn(variantStyles[variant], 'flex items-center gap-2', className)}>
        <Icon className={cn('w-4 h-4 flex-shrink-0', styles.title)} />
        <span className={cn('text-sm', styles.title)}>{appError.message}</span>
        {onRetry && appError.recoverable && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onRetry}
            className="ml-auto h-6 px-2"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        )}
        {onDismiss && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            className="h-6 px-2"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn(variantStyles[variant], className)}>
      <div className="flex items-start gap-3">
        <Icon className={cn(
          'w-5 h-5 flex-shrink-0 mt-0.5',
          styles.title
        )} />

        <div className="flex-1 min-w-0">
          <p className={cn('font-medium', styles.title)}>
            {appError.message}
          </p>

          {appError.details && (
            <p className={cn('text-sm mt-1', styles.detail)}>
              {appError.details}
            </p>
          )}

          {appError.userAction && (
            <p className={cn('text-sm mt-2 flex items-center gap-1', styles.action)}>
              <Info className="w-4 h-4" />
              {appError.userAction}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {onRetry && appError.recoverable && (
            <Button
              size="sm"
              variant={variant === 'banner' ? 'secondary' : 'outline'}
              onClick={onRetry}
              className="gap-1"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
          )}

          {onDismiss && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDismiss}
              className={variant === 'banner' ? 'text-white hover:bg-red-600' : ''}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Simple inline error message
 */
export function ErrorMessage({
  message,
  className
}: {
  message: string | null | undefined;
  className?: string;
}) {
  if (!message) return null;

  return (
    <p className={cn('text-sm text-red-600 dark:text-red-400 flex items-center gap-1', className)}>
      <AlertTriangle className="w-4 h-4" />
      {message}
    </p>
  );
}

export default ErrorDisplay;
