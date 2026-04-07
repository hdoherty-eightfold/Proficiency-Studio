/**
 * Assessment Results - Completed phase UI
 * Shows summary stats, quality analysis, export actions, and full results table
 */

import { useState, useMemo, useCallback, useRef } from 'react';
import {
  Award,
  TrendingUp,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Pencil,
  Check,
  X,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { getProficiencyBadgeClasses, getProficiencyNames } from '../../config/proficiency';
import { ExportActions } from '../review/ExportActions';
import { useToast } from '../../stores/toast-store';
import type { AssessmentResponse, AssessmentResult } from './assessment-types';

interface AssessmentResultsProps {
  results: AssessmentResponse;
  onRestart: () => void;
}

const ROWS_PER_PAGE = 20;

/** Tracks pending score override state for a single row */
interface ScoreOverride {
  editing: boolean;
  pendingLevel: number;
  note: string;
  saving: boolean;
  saved: boolean;
}

export function AssessmentResults({ results, onRestart }: AssessmentResultsProps) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Map of skill_name → override state
  const [overrides, setOverrides] = useState<Record<string, ScoreOverride>>({});

  const getProficiencyColor = useCallback((level: number) => getProficiencyBadgeClasses(level), []);

  const startEdit = useCallback((skillName: string, currentLevel: number) => {
    setOverrides((prev) => ({
      ...prev,
      [skillName]: {
        editing: true,
        pendingLevel: currentLevel,
        note: '',
        saving: false,
        saved: prev[skillName]?.saved ?? false,
      },
    }));
  }, []);

  const cancelEdit = useCallback((skillName: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      if (next[skillName]) next[skillName] = { ...next[skillName], editing: false };
      return next;
    });
  }, []);

  const saveOverride = useCallback(
    async (assessment: AssessmentResult) => {
      const skillName = assessment.skill_name;
      const override = overrides[skillName];
      if (!override) return;
      const originalLevel = assessment.proficiency_numeric ?? assessment.proficiency;
      if (override.pendingLevel === originalLevel) {
        cancelEdit(skillName);
        return;
      }

      setOverrides((prev) => ({ ...prev, [skillName]: { ...prev[skillName], saving: true } }));
      try {
        if (window.electron?.feedback) {
          await window.electron.feedback.save({
            skill_name: skillName,
            original_score: originalLevel,
            corrected_score: override.pendingLevel,
            model_used: results.model_used,
            note: override.note,
          });
        }
        setOverrides((prev) => ({
          ...prev,
          [skillName]: { ...prev[skillName], editing: false, saving: false, saved: true },
        }));
        toast({
          title: `Feedback saved for "${skillName}"`,
          description: `Score updated: ${originalLevel} → ${override.pendingLevel}`,
        });
      } catch {
        setOverrides((prev) => ({ ...prev, [skillName]: { ...prev[skillName], saving: false } }));
        toast({ title: 'Failed to save feedback', variant: 'destructive' });
      }
    },
    [overrides, results.model_used, cancelEdit, toast]
  );

  // Quality analysis metrics
  const qualityMetrics = useMemo(() => {
    const assessments = results.assessments;
    if (!assessments.length) return null;

    // Level distribution
    const levelCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let highConf = 0,
      medConf = 0,
      lowConf = 0;
    const categories = new Set<string>();

    for (const a of assessments) {
      const level = a.proficiency_numeric ?? a.proficiency;
      levelCounts[level] = (levelCounts[level] || 0) + 1;
      if (a.confidence_score >= 0.8) highConf++;
      else if (a.confidence_score >= 0.6) medConf++;
      else lowConf++;
      if (a.category) categories.add(a.category);
    }

    const total = assessments.length;
    const minConf = Math.min(...assessments.map((a) => a.confidence_score));
    const maxConf = Math.max(...assessments.map((a) => a.confidence_score));
    const withReasoning = assessments.filter((a) => a.reasoning).length;
    const withEvidence = assessments.filter((a) => a.evidence.length > 0).length;

    return {
      levelCounts,
      highConf,
      medConf,
      lowConf,
      total,
      minConf,
      maxConf,
      withReasoning,
      withEvidence,
      categoryCount: categories.size,
    };
  }, [results.assessments]);

  // Filtered + paginated table
  const filteredAssessments = useMemo(() => {
    if (!searchTerm) return results.assessments;
    const term = searchTerm.toLowerCase();
    return results.assessments.filter(
      (a) =>
        a.skill_name.toLowerCase().includes(term) ||
        a.category?.toLowerCase().includes(term) ||
        a.reasoning?.toLowerCase().includes(term)
    );
  }, [results.assessments, searchTerm]);

  const totalPages = Math.ceil(filteredAssessments.length / ROWS_PER_PAGE);
  const paginated = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredAssessments.slice(start, start + ROWS_PER_PAGE);
  }, [filteredAssessments, currentPage]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Export Actions - at the top */}
      <ExportActions assessments={results.assessments} />

      {/* Summary Stats */}
      <div
        className={`grid grid-cols-2 gap-3 ${results.total_tokens ? 'md:grid-cols-3 lg:grid-cols-6' : 'md:grid-cols-4'}`}
      >
        <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">Total Skills</div>
          <div className="text-2xl font-bold">{results.total_skills}</div>
        </Card>
        <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="text-sm text-green-600 dark:text-green-400 mb-1">Avg Proficiency</div>
          <div className="text-2xl font-bold">{results.avg_proficiency.toFixed(1)}</div>
        </Card>
        <Card className="p-4 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
          <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">Processing Time</div>
          <div className="text-2xl font-bold">{results.processing_time.toFixed(1)}s</div>
        </Card>
        <Card className="p-4 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
          <div className="text-sm text-orange-600 dark:text-orange-400 mb-1">Model</div>
          <div className="text-lg font-bold truncate" title={results.model_used}>
            {results.model_used.split('/')[1] || results.model_used}
          </div>
        </Card>
        {results.total_tokens != null && (
          <Card className="p-4 bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800">
            <div className="text-sm text-teal-600 dark:text-teal-400 mb-1">Tokens Used</div>
            <div className="text-2xl font-bold">{results.total_tokens.toLocaleString()}</div>
          </Card>
        )}
        {results.estimated_cost != null && (
          <Card className="p-4 bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800">
            <div className="text-sm text-rose-600 dark:text-rose-400 mb-1">Est. Cost</div>
            <div className="text-2xl font-bold">${results.estimated_cost.toFixed(4)}</div>
          </Card>
        )}
      </div>

      {/* Quality Analysis */}
      {qualityMetrics && (
        <Card className="p-5">
          <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-500" /> Quality Analysis
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Proficiency Level Distribution */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Level Distribution
              </p>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((level) => {
                  const count = qualityMetrics.levelCounts[level] || 0;
                  const pct =
                    qualityMetrics.total > 0 ? Math.round((count / qualityMetrics.total) * 100) : 0;
                  const profNames = getProficiencyNames();
                  return (
                    <div key={level} className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold shrink-0 ${getProficiencyBadgeClasses(level)}`}
                      >
                        {level}
                      </span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${getProficiencyBadgeClasses(level).includes('green') ? 'bg-green-500' : getProficiencyBadgeClasses(level).includes('blue') ? 'bg-blue-500' : getProficiencyBadgeClasses(level).includes('yellow') ? 'bg-yellow-500' : getProficiencyBadgeClasses(level).includes('orange') ? 'bg-orange-500' : 'bg-red-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-14 text-right tabular-nums">
                        {count} <span className="text-muted-foreground/60">({pct}%)</span>
                      </span>
                      <span className="text-xs text-muted-foreground hidden lg:block w-20 truncate">
                        {profNames[level - 1]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Confidence Distribution */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                AI Confidence
              </p>
              <div className="space-y-2">
                {[
                  {
                    label: 'High (≥80%)',
                    count: qualityMetrics.highConf,
                    color: 'bg-green-500',
                    textColor: 'text-green-600 dark:text-green-400',
                  },
                  {
                    label: 'Medium (60–79%)',
                    count: qualityMetrics.medConf,
                    color: 'bg-yellow-500',
                    textColor: 'text-yellow-600 dark:text-yellow-400',
                  },
                  {
                    label: 'Low (<60%)',
                    count: qualityMetrics.lowConf,
                    color: 'bg-red-500',
                    textColor: 'text-red-600 dark:text-red-400',
                  },
                ].map(({ label, count, color, textColor }) => {
                  const pct =
                    qualityMetrics.total > 0 ? Math.round((count / qualityMetrics.total) * 100) : 0;
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{label}</span>
                        <span className={`font-medium tabular-nums ${textColor}`}>
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${color} transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-border/50 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Min confidence</span>
                    <span className="font-medium tabular-nums">
                      {Math.round(qualityMetrics.minConf * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Max confidence</span>
                    <span className="font-medium tabular-nums">
                      {Math.round(qualityMetrics.maxConf * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Coverage Stats */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                Coverage
              </p>
              <div className="space-y-3">
                {[
                  {
                    label: 'Skills with reasoning',
                    value: qualityMetrics.withReasoning,
                    total: qualityMetrics.total,
                  },
                  {
                    label: 'Skills with evidence',
                    value: qualityMetrics.withEvidence,
                    total: qualityMetrics.total,
                  },
                ].map(({ label, value, total }) => {
                  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
                  return (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium tabular-nums">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 border-t border-border/50 space-y-1">
                  {qualityMetrics.categoryCount > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Categories</span>
                      <span className="font-medium tabular-nums">
                        {qualityMetrics.categoryCount}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Avg confidence</span>
                    <span className="font-medium tabular-nums">
                      {Math.round(
                        (results.assessments.reduce((s, a) => s + a.confidence_score, 0) /
                          results.assessments.length) *
                          100
                      )}
                      %
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Results Table */}
      <div>
        <div className="flex items-center justify-between gap-4 mb-3">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-500" /> Results
            <span className="text-sm font-normal text-muted-foreground">
              ({results.assessments.length} skills)
            </span>
          </h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search skills..."
                value={localSearchTerm}
                onChange={(e) => {
                  const v = e.target.value;
                  setLocalSearchTerm(v);
                  if (debounceRef.current) clearTimeout(debounceRef.current);
                  debounceRef.current = setTimeout(() => {
                    setSearchTerm(v);
                    setCurrentPage(1);
                  }, 300);
                }}
                aria-label="Search results"
                className="pl-10 pr-4 py-1.5 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none w-56"
              />
            </div>
            {searchTerm && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {filteredAssessments.length} of {results.assessments.length}
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-sm" aria-label="Assessment results">
            <caption className="sr-only">Assessment Results</caption>
            <thead className="bg-muted">
              <tr>
                <th
                  scope="col"
                  className="w-10 px-3 py-3 text-left font-semibold text-foreground border-b border-border"
                >
                  #
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left font-semibold text-foreground border-b border-border"
                  style={{ width: '25%' }}
                >
                  Skill
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left font-semibold text-foreground border-b border-border"
                  style={{ width: '12%' }}
                >
                  Category
                </th>
                <th
                  scope="col"
                  className="w-16 px-3 py-3 text-center font-semibold text-foreground border-b border-border"
                >
                  Level
                </th>
                <th
                  scope="col"
                  className="w-28 px-3 py-3 text-center font-semibold text-foreground border-b border-border"
                >
                  Confidence
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left font-semibold text-foreground border-b border-border"
                >
                  Reasoning
                </th>
                <th
                  scope="col"
                  className="w-16 px-3 py-3 text-center font-semibold text-foreground border-b border-border"
                >
                  Evidence
                </th>
                <th
                  scope="col"
                  className="w-20 px-3 py-3 text-center font-semibold text-foreground border-b border-border"
                  title="Correct the AI score to improve future assessments"
                >
                  Correct
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((assessment: AssessmentResult, displayIndex: number) => {
                const level = assessment.proficiency_numeric ?? assessment.proficiency;
                const rowNumber = (currentPage - 1) * ROWS_PER_PAGE + displayIndex + 1;
                const pct = Math.round(assessment.confidence_score * 100);
                const barColor =
                  assessment.confidence_score >= 0.8
                    ? 'bg-green-500'
                    : assessment.confidence_score >= 0.6
                      ? 'bg-yellow-500'
                      : 'bg-red-500';
                const textColor =
                  assessment.confidence_score >= 0.8
                    ? 'text-green-600 dark:text-green-400'
                    : assessment.confidence_score >= 0.6
                      ? 'text-yellow-600 dark:text-yellow-400'
                      : 'text-red-600 dark:text-red-400';
                return (
                  <tr
                    key={assessment.skill_name}
                    className={`border-b border-border ${displayIndex % 2 === 0 ? 'bg-background' : 'bg-muted/30'} hover:bg-muted/50 transition-colors`}
                  >
                    <td className="px-3 py-2 text-muted-foreground font-mono text-xs">
                      {rowNumber}
                    </td>
                    <td className="px-3 py-2 font-medium text-foreground">
                      {assessment.skill_name}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground text-xs">
                      {assessment.category || <span className="italic">—</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${getProficiencyColor(level)}`}
                      >
                        {level}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-14 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium tabular-nums ${textColor}`}>
                          {pct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      <span
                        className={assessment.reasoning ? 'line-clamp-3 leading-relaxed' : ''}
                        title={assessment.reasoning}
                      >
                        {assessment.reasoning || <span className="italic">—</span>}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span
                        className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-xs font-medium ${
                          assessment.evidence.length > 0
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {assessment.evidence.length}
                      </span>
                    </td>
                    {/* Score correction cell */}
                    <td className="px-2 py-2 text-center">
                      {(() => {
                        const ov = overrides[assessment.skill_name];
                        if (ov?.editing) {
                          return (
                            <div className="flex flex-col gap-1 items-center">
                              <select
                                className="text-xs border border-border rounded px-1 py-0.5 bg-background text-foreground"
                                value={ov.pendingLevel}
                                onChange={(e) =>
                                  setOverrides((prev) => ({
                                    ...prev,
                                    [assessment.skill_name]: {
                                      ...prev[assessment.skill_name],
                                      pendingLevel: Number(e.target.value),
                                    },
                                  }))
                                }
                              >
                                {[1, 2, 3, 4, 5].map((l) => (
                                  <option key={l} value={l}>
                                    {l}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="text"
                                placeholder="Note (optional)"
                                className="text-xs border border-border rounded px-1 py-0.5 bg-background text-foreground w-20"
                                value={ov.note}
                                onChange={(e) =>
                                  setOverrides((prev) => ({
                                    ...prev,
                                    [assessment.skill_name]: {
                                      ...prev[assessment.skill_name],
                                      note: e.target.value,
                                    },
                                  }))
                                }
                              />
                              <div className="flex gap-1">
                                <button
                                  onClick={() => saveOverride(assessment)}
                                  disabled={ov.saving}
                                  className="p-0.5 text-green-600 hover:text-green-700 disabled:opacity-50"
                                  title="Save correction"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => cancelEdit(assessment.skill_name)}
                                  className="p-0.5 text-muted-foreground hover:text-foreground"
                                  title="Cancel"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        }
                        return (
                          <button
                            onClick={() => startEdit(assessment.skill_name, level)}
                            className={`p-1 rounded transition-colors ${ov?.saved ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                            title={
                              ov?.saved ? 'Feedback saved — click to update' : 'Correct this score'
                            }
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        );
                      })()}
                    </td>
                  </tr>
                );
              })}
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                    {searchTerm
                      ? `No skills found matching "${searchTerm}"`
                      : 'No assessment results available.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3">
            <span className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * ROWS_PER_PAGE + 1}–
              {Math.min(currentPage * ROWS_PER_PAGE, filteredAssessments.length)} of{' '}
              {filteredAssessments.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-8 h-8 text-sm rounded ${currentPage === pageNum ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80'}`}
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
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end pt-2">
        <Button variant="gradient" size="pill" onClick={onRestart}>
          <RefreshCw className="w-4 h-4" /> Run New Assessment
        </Button>
      </div>
    </div>
  );
}
