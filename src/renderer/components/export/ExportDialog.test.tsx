/**
 * Tests for ExportDialog Component
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import { renderWithUser, screen } from '../../test/utils/render';

// Mock stores
vi.mock('../../stores/toast-store', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock api service
vi.mock('../../services/api', () => ({
  api: {
    getExportHistory: vi.fn().mockResolvedValue({ exports: [] }),
    exportAssessment: vi.fn(),
    exportBatch: vi.fn(),
    exportData: vi.fn(),
  },
}));

let ExportDialog: typeof import('./ExportDialog').default;

beforeAll(async () => {
  const mod = await import('./ExportDialog');
  ExportDialog = mod.default;
});

describe('ExportDialog', () => {
  it('should render nothing when isOpen is false', () => {
    const { container } = renderWithUser(
      <ExportDialog isOpen={false} onClose={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('should render the dialog title when open', () => {
    renderWithUser(<ExportDialog isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Export Data')).toBeInTheDocument();
    expect(screen.getByText('Choose format and options for export')).toBeInTheDocument();
  });

  it('should render custom title when provided', () => {
    renderWithUser(
      <ExportDialog isOpen={true} onClose={vi.fn()} title="Export Results" />
    );
    expect(screen.getByText('Export Results')).toBeInTheDocument();
  });

  it('should render format options and checkboxes', () => {
    renderWithUser(<ExportDialog isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Export Format')).toBeInTheDocument();
    // Format buttons render text as uppercase via CSS class, but DOM text is lowercase
    expect(screen.getByText('json')).toBeInTheDocument();
    expect(screen.getByText('csv')).toBeInTheDocument();
    expect(screen.getByText('xlsx')).toBeInTheDocument();
    expect(screen.getByText('Include metadata (IDs, sources)')).toBeInTheDocument();
    expect(screen.getByText('Include timestamps')).toBeInTheDocument();
    expect(screen.getByText('Include confidence scores')).toBeInTheDocument();
  });

  it('should render Preview and Export buttons', () => {
    renderWithUser(<ExportDialog isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Export')).toBeInTheDocument();
  });
});
