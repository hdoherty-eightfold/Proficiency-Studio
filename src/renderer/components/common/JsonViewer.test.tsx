/**
 * Tests for JsonViewer Component
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { renderWithUser, screen } from '../../test/utils/render';
import React from 'react';

let JsonViewer: React.FC<{ data: unknown; title?: string; searchable?: boolean }>;

beforeAll(async () => {
  const mod = await import('./JsonViewer');
  JsonViewer = mod.JsonViewer;
});

describe('JsonViewer', () => {
  it('should render with object data and show title', () => {
    renderWithUser(<JsonViewer data={{ name: 'test', value: 42 }} title="Test Data" />);
    expect(screen.getByText('Test Data')).toBeInTheDocument();
  });

  it('should render with array data and show line count in collapsed state', () => {
    const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
    renderWithUser(<JsonViewer data={data} title="Array Data" />);
    expect(screen.getByText('Array Data')).toBeInTheDocument();
    // Collapsed view shows line count
    const jsonString = JSON.stringify(data, null, 2);
    const lineCount = jsonString.split('\n').length;
    expect(screen.getByText(`(${lineCount} lines)`)).toBeInTheDocument();
  });

  it('should render collapsed preview with {...} by default', () => {
    renderWithUser(<JsonViewer data={{ key: 'value' }} />);
    expect(screen.getByText('{', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Expand')).toBeInTheDocument();
  });
});
