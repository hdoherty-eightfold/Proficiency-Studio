import React, { Component, ErrorInfo, ReactNode, useEffect, useCallback } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';
import { createAppError, getUserFriendlyMessage, AppError } from '../../lib/errors';
import { useToast } from '../../stores/toast-store';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: unknown[];
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 *
 * Features:
 * - Configurable fallback UI
 * - Error details (collapsible in dev mode)
 * - Reset functionality
 * - Automatic reset when resetKeys change
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);

    // Log error to console in development
    console.error('Error Boundary caught an error:', error, errorInfo);

    // Log to electron-log if available
    if (typeof window !== 'undefined' && window.electron) {
      console.error('React Error Boundary:', {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset error state when resetKeys change
    if (
      this.state.hasError &&
      this.props.resetKeys &&
      prevProps.resetKeys &&
      !this.areKeysEqual(prevProps.resetKeys, this.props.resetKeys)
    ) {
      this.reset();
    }
  }

  areKeysEqual(prevKeys: unknown[], nextKeys: unknown[]): boolean {
    if (prevKeys.length !== nextKeys.length) return false;
    return prevKeys.every((key, index) => key === nextKeys[index]);
  }

  reset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-lg w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-border bg-red-50 dark:bg-red-950/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-red-600 dark:text-red-400">
                    Something went wrong
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    An unexpected error occurred
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                The application encountered an error. You can try refreshing the
                current view or go back to the home screen.
              </p>

              {/* Error details (development only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-muted rounded-lg overflow-hidden">
                  <button
                    onClick={this.toggleDetails}
                    className="w-full px-4 py-2 flex items-center justify-between text-sm font-medium hover:bg-muted/80 transition-colors"
                  >
                    <span>Error Details</span>
                    {this.state.showDetails ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>

                  {this.state.showDetails && (
                    <div className="px-4 pb-4">
                      <div className="bg-background rounded p-3 overflow-auto max-h-48">
                        <p className="text-sm font-mono text-red-600 dark:text-red-400 mb-2">
                          {this.state.error.message}
                        </p>
                        {this.state.errorInfo?.componentStack && (
                          <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={this.reset}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-border bg-background rounded-lg font-medium hover:bg-muted transition-colors"
                >
                  <Home className="w-4 h-4" />
                  Reload App
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${
    Component.displayName || Component.name || 'Component'
  })`;

  return WrappedComponent;
}

/**
 * Hook for catching global unhandled errors and promise rejections
 *
 * This complements ErrorBoundary by catching:
 * - Unhandled promise rejections (e.g., failed API calls not caught by components)
 * - Global JavaScript errors that escape React's error boundary
 */
export function useGlobalErrorHandler(options: {
  onError?: (error: AppError) => void;
  showToast?: boolean;
} = {}) {
  const { onError, showToast = true } = options;
  const { toast } = useToast();

  const handleError = useCallback((error: unknown, source: string) => {
    const appError = createAppError(error, source);

    // Log error
    console.error(`[${source}]`, error);

    // Call custom handler
    onError?.(appError);

    // Show toast for recoverable errors
    if (showToast && appError.recoverable) {
      toast({
        variant: 'destructive',
        title: appError.message,
        description: appError.userAction || appError.details || getUserFriendlyMessage(appError)
      });
    }
  }, [onError, showToast, toast]);

  useEffect(() => {
    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Prevent default browser handling
      event.preventDefault();

      // Skip abort errors (these are intentional)
      if (event.reason?.name === 'AbortError') {
        return;
      }

      handleError(event.reason, 'Unhandled Promise Rejection');
    };

    // Handle global errors
    const handleGlobalError = (event: ErrorEvent) => {
      // Skip if error was already handled by React ErrorBoundary
      // React marks errors it catches, but we can't reliably detect this,
      // so we just log it and optionally show toast
      handleError(event.error || event.message, 'Global Error');
    };

    // Add listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
    };
  }, [handleError]);
}

/**
 * Global Error Handler Component
 *
 * Wraps children and provides global error handling for:
 * - Unhandled promise rejections
 * - Global JavaScript errors
 *
 * Use this alongside ErrorBoundary for comprehensive error handling.
 */
export function GlobalErrorHandler({
  children,
  onError,
  showToast = true
}: {
  children: ReactNode;
  onError?: (error: AppError) => void;
  showToast?: boolean;
}) {
  useGlobalErrorHandler({ onError, showToast });
  return <>{children}</>;
}

export default ErrorBoundary;
