/**
 * Tests for LoadingSpinner Component
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '../../test/utils/render';
import React from 'react';

let LoadingSpinner: React.FC<{ size?: number; text?: string; className?: string }>;

beforeAll(async () => {
  const mod = await import('./LoadingSpinner');
  LoadingSpinner = mod.LoadingSpinner;
});

describe('LoadingSpinner', () => {
  it('should render the spinner with animate-spin class', () => {
    const { container } = render(<LoadingSpinner />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg?.classList.contains('animate-spin')).toBe(true);
  });

  it('should render text when text prop is provided', () => {
    render(<LoadingSpinner text="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });
});
