/**
 * Tests for ErrorDisplay Component
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { renderWithUser, screen } from '../../test/utils/render';
import { ErrorType } from '../../lib/errors';

let ErrorDisplay: typeof import('./ErrorDisplay').ErrorDisplay;
let ErrorMessage: typeof import('./ErrorDisplay').ErrorMessage;

beforeAll(async () => {
  const mod = await import('./ErrorDisplay');
  ErrorDisplay = mod.ErrorDisplay;
  ErrorMessage = mod.ErrorMessage;
});

describe('ErrorDisplay', () => {
  it('should render nothing when error is null', () => {
    const { container } = renderWithUser(<ErrorDisplay error={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('should render error message from string', () => {
    renderWithUser(<ErrorDisplay error="Something went wrong" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should render error message from AppError object', () => {
    renderWithUser(
      <ErrorDisplay
        error={{
          type: ErrorType.NETWORK,
          message: 'Network connection failed',
          details: 'Check your internet connection',
          recoverable: true,
        }}
      />
    );
    expect(screen.getByText('Network connection failed')).toBeInTheDocument();
    expect(screen.getByText('Check your internet connection')).toBeInTheDocument();
  });

  it('should show Retry button when onRetry is provided and error is recoverable', () => {
    const onRetry = vi.fn();
    renderWithUser(
      <ErrorDisplay
        error={{ type: ErrorType.NETWORK, message: 'Error', recoverable: true }}
        onRetry={onRetry}
      />
    );
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should not show Retry button when error is not recoverable', () => {
    renderWithUser(
      <ErrorDisplay
        error={{ type: ErrorType.UNKNOWN, message: 'Fatal error', recoverable: false }}
        onRetry={vi.fn()}
      />
    );
    expect(screen.queryByText('Retry')).not.toBeInTheDocument();
  });
});

describe('ErrorMessage', () => {
  it('should render nothing when message is null', () => {
    const { container } = renderWithUser(<ErrorMessage message={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('should render error text', () => {
    renderWithUser(<ErrorMessage message="Validation failed" />);
    expect(screen.getByText('Validation failed')).toBeInTheDocument();
  });
});
