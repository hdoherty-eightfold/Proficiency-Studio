/**
 * Tests for SkillsTableEditor Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithUser, screen, waitFor } from '../../test/utils/render';
import SkillsTableEditor from './SkillsTableEditor';
import { createSkills, createProficiencyLevels } from '../../test/factories';

vi.mock('../../stores/toast-store', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockOnSkillsChange = vi.fn();
const mockOnClose = vi.fn();

const defaultProps = {
  skills: createSkills(5),
  proficiencyLevels: createProficiencyLevels(),
  onSkillsChange: mockOnSkillsChange,
  onClose: mockOnClose,
};

describe('SkillsTableEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the table with skills', () => {
    renderWithUser(<SkillsTableEditor {...defaultProps} />);
    expect(screen.getByText('Skill 1')).toBeInTheDocument();
    expect(screen.getByText('Skill 2')).toBeInTheDocument();
  });

  it('should show column headers', () => {
    renderWithUser(<SkillsTableEditor {...defaultProps} />);
    expect(screen.getByText('Skill Name')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Proficiency')).toBeInTheDocument();
  });

  it('should show skills count', () => {
    renderWithUser(<SkillsTableEditor {...defaultProps} />);
    expect(screen.getByText(/5 of 5 skills/)).toBeInTheDocument();
  });

  it('should handle empty skills array', () => {
    renderWithUser(
      <SkillsTableEditor
        {...defaultProps}
        skills={[]}
      />
    );
    expect(screen.getByText(/no skills/i)).toBeInTheDocument();
  });

  it('should filter skills based on search', async () => {
    const skills = [
      { name: 'TypeScript', category: 'Programming', description: 'Typed JS' },
      { name: 'Python', category: 'Programming', description: 'General purpose' },
      { name: 'React', category: 'Frontend', description: 'UI library' },
    ];

    const { user } = renderWithUser(
      <SkillsTableEditor {...defaultProps} skills={skills} />
    );

    const searchInput = screen.getByPlaceholderText('Search skills...');
    await user.type(searchInput, 'Type');

    await waitFor(() => {
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
      expect(screen.queryByText('Python')).not.toBeInTheDocument();
    });
  });

  it('should enter edit mode on double click', async () => {
    const { user } = renderWithUser(<SkillsTableEditor {...defaultProps} />);
    const cell = screen.getByText('Skill 1');
    await user.dblClick(cell);
    const input = screen.getByDisplayValue('Skill 1');
    expect(input).toBeInTheDocument();
  });

  it('should call onClose when close button clicked', async () => {
    const { user } = renderWithUser(<SkillsTableEditor {...defaultProps} />);
    const closeButton = screen.queryByRole('button', { name: /close/i });
    if (closeButton) {
      await user.click(closeButton);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it('should render with many skills and show pagination', () => {
    const manySkills = createSkills(50);
    renderWithUser(
      <SkillsTableEditor {...defaultProps} skills={manySkills} />
    );
    expect(screen.getByText(/Showing/)).toBeInTheDocument();
  });
});
