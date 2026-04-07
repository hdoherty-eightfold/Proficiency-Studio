/**
 * Skills Table Editor Component
 * Displays skills in an editable table format with inline editing and proficiency selection
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Search, Edit3, ChevronLeft, ChevronRight, Save, Trash2, X } from 'lucide-react';
import { Button } from '../ui/button';
import { useToast } from '../../stores/toast-store';
import type { Skill } from '../../stores/app-store';
import {
  DEFAULT_PROFICIENCY_LEVELS,
  PROFICIENCY_HEX_COLORS,
  getProficiencyHexColor,
  type ProficiencyLevel,
} from '../../config/proficiency';

interface SkillsTableEditorProps {
  skills: Skill[];
  proficiencyLevels?: ProficiencyLevel[];
  onSkillsChange: (skills: Skill[]) => void;
  onClose?: () => void;
}

/**
 * Default levels with hex colors for inline style usage in the table editor.
 * Merges the central DEFAULT_PROFICIENCY_LEVELS with hex color values.
 */
const TABLE_EDITOR_LEVELS: ProficiencyLevel[] = DEFAULT_PROFICIENCY_LEVELS.map((level, idx) => ({
  ...level,
  color: PROFICIENCY_HEX_COLORS[idx] || level.color,
}));

export default function SkillsTableEditor({
  skills,
  proficiencyLevels = TABLE_EDITOR_LEVELS,
  onSkillsChange,
  onClose,
}: SkillsTableEditorProps) {
  const { toast } = useToast();

  // State
  const [localSkills, setLocalSkills] = useState<Skill[]>(skills);
  const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [hasChanges, setHasChanges] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const rowsPerPage = 20;

  // Sync with parent when skills change
  useEffect(() => {
    setLocalSkills(skills);
  }, [skills]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingCell]);

  // Columns to display
  const columns = [
    { key: 'name', label: 'Skill Name', editable: true, width: '30%' },
    { key: 'description', label: 'Description', editable: true, width: '30%' },
    { key: 'category', label: 'Category', editable: true, width: '15%' },
    { key: 'proficiency', label: 'Proficiency', editable: true, width: '15%' },
  ];

  // Filter skills based on search term
  const filteredSkills = useMemo(() => {
    if (!searchTerm) return localSkills;
    const term = searchTerm.toLowerCase();
    return localSkills.filter(
      (skill) =>
        skill.name.toLowerCase().includes(term) ||
        skill.description?.toLowerCase().includes(term) ||
        skill.category?.toLowerCase().includes(term)
    );
  }, [localSkills, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredSkills.length / rowsPerPage);
  const paginatedSkills = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredSkills.slice(start, start + rowsPerPage);
  }, [filteredSkills, currentPage]);

  // Get original index in localSkills array
  const getOriginalIndex = (displayIndex: number): number => {
    const displaySkill = paginatedSkills[displayIndex];
    return localSkills.findIndex((s) => s.id === displaySkill.id || s.name === displaySkill.name);
  };

  // Start editing a cell
  const startEditing = (displayIndex: number, col: string) => {
    const originalIndex = getOriginalIndex(displayIndex);
    const skill = localSkills[originalIndex];
    setEditingCell({ row: originalIndex, col });

    if (col === 'proficiency') {
      setEditValue(String(skill.proficiency || ''));
    } else {
      setEditValue(String(skill[col as keyof Skill] ?? ''));
    }
  };

  // Save cell edit
  const saveEdit = () => {
    if (!editingCell) return;

    const newSkills = [...localSkills];
    const skill = { ...newSkills[editingCell.row] };

    if (editingCell.col === 'proficiency') {
      const level = parseInt(editValue) || 0;
      skill.proficiency = level;
      const levelInfo = proficiencyLevels.find((p) => p.level === level);
      skill.proficiency_name = levelInfo?.name;
    } else {
      (skill as Record<string, unknown>)[editingCell.col] = editValue;
    }

    newSkills[editingCell.row] = skill;
    setLocalSkills(newSkills);
    setEditingCell(null);
    setEditValue('');
    setHasChanges(true);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Handle key press in edit mode
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  // Handle proficiency change via dropdown
  const handleProficiencyChange = (displayIndex: number, level: number) => {
    const originalIndex = getOriginalIndex(displayIndex);
    const newSkills = [...localSkills];
    const skill = { ...newSkills[originalIndex] };
    skill.proficiency = level;
    const levelInfo = proficiencyLevels.find((p) => p.level === level);
    skill.proficiency_name = levelInfo?.name;
    newSkills[originalIndex] = skill;
    setLocalSkills(newSkills);
    setHasChanges(true);
  };

  // Delete a skill
  const deleteSkill = (displayIndex: number) => {
    const originalIndex = getOriginalIndex(displayIndex);
    const newSkills = localSkills.filter((_, i) => i !== originalIndex);
    setLocalSkills(newSkills);
    setHasChanges(true);
    toast({ title: 'Skill Deleted', description: 'Skill has been removed' });
  };

  // Save all changes
  const handleSaveAll = () => {
    onSkillsChange(localSkills);
    setHasChanges(false);
    toast({ title: 'Changes Saved', description: `Updated ${localSkills.length} skills` });
  };

  // Get proficiency level color (from props levels or fallback to centralized hex colors)
  const getProficiencyColor = useCallback(
    (level?: number): string => {
      const levelInfo = proficiencyLevels.find((p) => p.level === level);
      return levelInfo?.color || getProficiencyHexColor(level);
    },
    [proficiencyLevels]
  );

  // Render cell value
  const renderCell = (skill: Skill, col: string, displayIndex: number) => {
    const originalIndex = getOriginalIndex(displayIndex);
    const isEditing = editingCell?.row === originalIndex && editingCell?.col === col;

    if (col === 'proficiency') {
      return (
        <select
          value={skill.proficiency || 0}
          onChange={(e) => handleProficiencyChange(displayIndex, parseInt(e.target.value))}
          className="w-full px-2 py-1 text-sm border border-border rounded bg-background text-foreground focus:ring-2 focus:ring-primary"
          style={{
            borderLeftColor: getProficiencyColor(skill.proficiency),
            borderLeftWidth: '4px',
          }}
        >
          <option value={0}>Not Set</option>
          {proficiencyLevels.map((level) => (
            <option key={level.level} value={level.level}>
              {level.level} - {level.name}
            </option>
          ))}
        </select>
      );
    }

    if (isEditing) {
      return (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={saveEdit}
          onKeyDown={handleKeyDown}
          className="w-full px-2 py-1 text-sm border border-primary rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
      );
    }

    const value = String(skill[col as keyof Skill] ?? '');
    return (
      <div
        className="truncate cursor-pointer hover:bg-muted px-2 py-1 rounded transition-colors"
        onDoubleClick={() => startEditing(displayIndex, col)}
        title={value ? `${value} - Double-click to edit` : 'Double-click to edit'}
      >
        {value || <span className="text-muted-foreground italic">—</span>}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with search and actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search skills..."
              value={localSearchTerm}
              onChange={(e) => {
                const value = e.target.value;
                setLocalSearchTerm(value);
                if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                debounceTimerRef.current = setTimeout(() => {
                  setSearchTerm(value);
                  setCurrentPage(1);
                }, 300);
              }}
              aria-label="Search skills"
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredSkills.length} of {localSkills.length} skills
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button size="sm" variant="outline-green" onClick={handleSaveAll}>
              <Save className="w-4 h-4 mr-1" />
              Save Changes
            </Button>
          )}
          {onClose && (
            <Button size="sm" variant="outline" onClick={onClose}>
              <X className="w-4 h-4 mr-1" />
              Close
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-border rounded-lg">
        <table className="w-full text-sm" aria-label="Skills table">
          <thead className="bg-muted">
            <tr>
              <th
                scope="col"
                className="w-12 px-3 py-3 text-left font-semibold text-foreground border-b border-border"
              >
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className="px-3 py-3 text-left font-semibold text-foreground border-b border-border"
                  style={{ width: col.width }}
                >
                  <div className="flex items-center gap-2">
                    {col.label}
                    {col.editable && (
                      <span title="Double-click to edit">
                        <Edit3 className="w-3 h-3 text-muted-foreground" />
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th
                scope="col"
                className="w-12 px-3 py-3 text-center font-semibold text-foreground border-b border-border"
              >
                <Trash2 className="w-4 h-4 mx-auto text-muted-foreground" aria-hidden="true" />
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedSkills.map((skill, displayIndex) => {
              const rowNumber = (currentPage - 1) * rowsPerPage + displayIndex + 1;
              return (
                <tr
                  key={skill.id || `skill-${displayIndex}`}
                  className={`border-b border-border ${displayIndex % 2 === 0 ? 'bg-background' : 'bg-muted/30'} hover:bg-muted/50 transition-colors`}
                >
                  <td className="px-3 py-2 text-muted-foreground font-mono text-xs">{rowNumber}</td>
                  {columns.map((col) => (
                    <td key={col.key} className="px-3 py-2">
                      {renderCell(skill, col.key, displayIndex)}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => deleteSkill(displayIndex)}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors rounded hover:bg-destructive/10"
                      title="Delete skill"
                      aria-label={`Delete skill ${skill.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {paginatedSkills.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + 2}
                  className="px-6 py-12 text-center text-muted-foreground"
                >
                  {searchTerm ? (
                    <>No skills found matching "{searchTerm}"</>
                  ) : (
                    <>No skills loaded. Please import a CSV file first.</>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-muted-foreground">
            Showing {(currentPage - 1) * rowsPerPage + 1} -{' '}
            {Math.min(currentPage * rowsPerPage, filteredSkills.length)} of {filteredSkills.length}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 text-sm rounded ${
                      currentPage === pageNum
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground border-t border-border">
        <div className="flex items-center gap-1">
          <Edit3 className="w-3 h-3" />
          Double-click cells to edit
        </div>
        <div className="flex items-center gap-2">
          Proficiency levels:
          {proficiencyLevels.map((level) => (
            <span
              key={level.level}
              className="px-2 py-0.5 rounded text-white text-xs"
              style={{ backgroundColor: level.color }}
              title={level.description}
            >
              {level.level}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
