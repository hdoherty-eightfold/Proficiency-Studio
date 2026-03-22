/**
 * Tests for BackendStatus Component
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { renderWithUser, screen } from '../../test/utils/render';

// Mock useBackendHealth hook
const mockRefresh = vi.fn();

vi.mock('../../hooks/useBackendHealth', () => ({
  useBackendHealth: vi.fn(() => ({
    isHealthy: true,
    isChecking: false,
    error: null,
    refresh: mockRefresh,
    consecutiveFailures: 0,
    lastChecked: new Date(),
    lastSuccessful: new Date(),
  })),
}));

let BackendStatus: typeof import('./BackendStatus').BackendStatus;
let BackendStatusBanner: typeof import('./BackendStatus').BackendStatusBanner;

beforeAll(async () => {
  const mod = await import('./BackendStatus');
  BackendStatus = mod.BackendStatus;
  BackendStatusBanner = mod.BackendStatusBanner;
});

describe('BackendStatus', () => {
  it('should render without crashing', () => {
    const { container } = renderWithUser(<BackendStatus />);
    expect(container).toBeDefined();
  });

  it('should show "Backend connected" text when healthy and showDetails is true', () => {
    renderWithUser(<BackendStatus showDetails />);
    expect(screen.getByText('Backend connected')).toBeInTheDocument();
  });

  it('should render compact dot indicator when compact is true', () => {
    renderWithUser(<BackendStatus compact showDetails />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });
});

describe('BackendStatusBanner', () => {
  it('should not render when backend is healthy', () => {
    const { container } = renderWithUser(<BackendStatusBanner />);
    expect(container.innerHTML).toBe('');
  });
});
