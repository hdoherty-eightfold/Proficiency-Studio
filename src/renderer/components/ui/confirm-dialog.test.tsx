import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithUser } from '@/test/utils/render';
import { ConfirmDialog } from './confirm-dialog';

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Delete Item',
    description: 'Are you sure you want to delete this item?',
  };

  it('renders title and description when open', () => {
    renderWithUser(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Delete Item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this item?')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    renderWithUser(<ConfirmDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('Delete Item')).not.toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const onConfirm = vi.fn();
    const { user } = renderWithUser(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />);
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onOpenChange(false) when cancel button is clicked', async () => {
    const onOpenChange = vi.fn();
    const { user } = renderWithUser(
      <ConfirmDialog {...defaultProps} onOpenChange={onOpenChange} />
    );
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('renders custom confirm and cancel text', () => {
    renderWithUser(
      <ConfirmDialog {...defaultProps} confirmText="Reset Data" cancelText="Go Back" />
    );
    expect(screen.getByRole('button', { name: 'Reset Data' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go Back' })).toBeInTheDocument();
  });

  it('uses default button text', () => {
    renderWithUser(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });
});
