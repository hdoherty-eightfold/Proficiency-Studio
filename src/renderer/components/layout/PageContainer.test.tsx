/**
 * Tests for PageContainer Component
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '../../test/utils/render';

let PageContainer: typeof import('./PageContainer').PageContainer;

beforeAll(async () => {
  const mod = await import('./PageContainer');
  PageContainer = mod.PageContainer;
});

describe('PageContainer', () => {
  it('should render children content', () => {
    render(
      <PageContainer title="Test Page">
        <div>Child content here</div>
      </PageContainer>
    );
    expect(screen.getByText('Child content here')).toBeInTheDocument();
  });

  it('should render the title as a heading', () => {
    render(
      <PageContainer title="My Page Title">
        <div>Content</div>
      </PageContainer>
    );
    expect(screen.getByRole('heading', { name: 'My Page Title' })).toBeInTheDocument();
  });

  it('should render description when provided', () => {
    render(
      <PageContainer title="Title" description="A helpful description">
        <div>Content</div>
      </PageContainer>
    );
    expect(screen.getByText('A helpful description')).toBeInTheDocument();
  });
});
