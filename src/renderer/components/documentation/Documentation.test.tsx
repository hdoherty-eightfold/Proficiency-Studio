/**
 * Tests for Documentation Component
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { renderWithUser, screen } from '../../test/utils/render';
import React from 'react';

// Mock stores
vi.mock('../../stores/app-store', () => ({
  useAppStore: vi.fn((selector) => {
    const state = {
      setCurrentStep: vi.fn(),
    };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

// Mock ScrollArea to render children directly
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

let Documentation: typeof import('./Documentation').default;

beforeAll(async () => {
  const mod = await import('./Documentation');
  Documentation = mod.default;
});

describe('Documentation', () => {
  it('should render the Documentation heading', () => {
    renderWithUser(<Documentation />);
    expect(screen.getByText('Documentation')).toBeInTheDocument();
  });

  it('should render sidebar navigation with all section titles', () => {
    renderWithUser(<Documentation />);
    // Each section title appears in the sidebar nav and potentially the content area
    expect(screen.getAllByText('Getting Started').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Integration Paths').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('AI Configuration').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Workflow Steps').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Keyboard Shortcuts').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Troubleshooting').length).toBeGreaterThanOrEqual(1);
  });

  it('should show Getting Started content by default', () => {
    renderWithUser(<Documentation />);
    expect(screen.getByText('Welcome to Proficiency Studio')).toBeInTheDocument();
    expect(screen.getByText('Quick Start')).toBeInTheDocument();
    expect(screen.getByText('Prerequisites')).toBeInTheDocument();
  });

  it('should render the search input', () => {
    renderWithUser(<Documentation />);
    expect(screen.getByPlaceholderText('Search docs...')).toBeInTheDocument();
  });
});
