/**
 * Tests for FieldMappingPanel Component
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { renderWithUser, screen } from '../../test/utils/render';
import React from 'react';

// Mock api service
vi.mock('../../services/api', () => ({
  api: {
    autoMapFields: vi.fn(),
    suggestMapping: vi.fn(),
    saveFieldMappings: vi.fn(),
  },
}));

// Mock electron-api
vi.mock('../../services/electron-api', () => ({
  electronAPI: {},
}));

// Mock toast store
vi.mock('../../stores/toast-store', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
  useToastStore: vi.fn(() => ({
    addToast: vi.fn(),
  })),
}));

// Dynamic import to apply mocks first
let FieldMappingPanel: React.FC<{
  sourceFields: string[];
  entityName: string;
  onMappingsComplete?: (mappings: unknown[]) => void;
}>;

beforeAll(async () => {
  const mod = await import('./FieldMappingPanel');
  FieldMappingPanel = mod.default;
});

describe('FieldMappingPanel', () => {
  const defaultProps = {
    sourceFields: ['first_name', 'last_name', 'email_address'],
    entityName: 'Employee',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the heading and description', () => {
    renderWithUser(<FieldMappingPanel {...defaultProps} />);
    expect(screen.getByText('Field Mapping')).toBeInTheDocument();
    expect(screen.getByText('Map source fields to target schema with 4-tier confidence scoring')).toBeInTheDocument();
  });

  it('should render Auto-Map All button', () => {
    renderWithUser(<FieldMappingPanel {...defaultProps} />);
    expect(screen.getByText('Auto-Map All')).toBeInTheDocument();
  });

  it('should render Save button with confirmed count', () => {
    renderWithUser(<FieldMappingPanel {...defaultProps} />);
    expect(screen.getByText('Save (0)')).toBeInTheDocument();
  });

  it('should render tier legend badges', () => {
    renderWithUser(<FieldMappingPanel {...defaultProps} />);
    expect(screen.getByText('T1')).toBeInTheDocument();
    expect(screen.getByText('T2')).toBeInTheDocument();
    expect(screen.getByText('T3')).toBeInTheDocument();
    expect(screen.getByText('T4')).toBeInTheDocument();
  });

  it('should render source fields from props', () => {
    renderWithUser(<FieldMappingPanel {...defaultProps} />);
    expect(screen.getByText('first_name')).toBeInTheDocument();
    expect(screen.getByText('last_name')).toBeInTheDocument();
    expect(screen.getByText('email_address')).toBeInTheDocument();
  });

  it('should show progress indicator', () => {
    renderWithUser(<FieldMappingPanel {...defaultProps} />);
    expect(screen.getByText('0/3 mapped')).toBeInTheDocument();
    expect(screen.getByText('0 confirmed')).toBeInTheDocument();
  });
});
