/**
 * Review Assessment - Step 5
 * Displays the most recently completed assessment with full dashboard + export capabilities.
 * Mirrors the rich indicators from the Assessment Complete page.
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  ClipboardList,
  RefreshCw,
  ChevronRight,
  Award,
  TrendingUp,
  Search,
  Cpu,
  Coins,
  Zap,
  Check,
  X,
  Pencil,
  ChevronLeft,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { ExportActions } from './ExportActions';
import { useAppStore } from '../../stores/app-store';
import { useToast } from '../../stores/toast-store';
import { getProficiencyBadgeClasses, getProficiencyNames } from '../../config/proficiency';
import type { AssessmentResult } from '../proficiency/assessment-types';

interface SavedAssessmentMeta {
  filename: string;
  saved_at: string;
  total_skills: number;
  avg_proficiency: number;
  avg_confidence: number;
  model_used: string;
  provider: string;
  processing_time: number;
  content_hash: string;
  extraction_source: string;
  source_filename: string;
  environment_name: string;
  total_tokens: number;
  estimated_cost: number;
  success_rate: number;
}

interface LoadedAssessment {
  assessments: AssessmentResult[];
  total_skills: number;
  avg_proficiency: number;
  processing_time: number;
  model_used: string;
  timestamp: string;
  total_tokens?: number;
  estimated_cost?: number;
  failed_skills_count?: number;
  requested_skills_count?: number;
}

interface ScoreOverride {
  editing: boolean;
  pendingLevel: number;
  note: string;
  saving: boolean;
  saved: boolean;
}

const ROWS_PER_PAGE = 20;

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const ReviewAssessment: React.FC = () => {
  const { setCurrentStep } = useAppStore();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentMeta, setRecentMeta] = useState<SavedAssessmentMeta | null>(null);
  const [assessment, setAssessment] = useState<LoadedAssessment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [overrides, setOverrides] = useState<Record<string, ScoreOverride>>({});

  const loadLatestAssessment = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await window.electron.assessmentStorage.listSaved();
      if (!result.success) throw new Error(result.error || 'Failed to list assessments');
      if (!result.assessments || result.assessments.length === 0) {
        setRecentMeta(null);
        setAssessment(null);
        return;
      }
      const sorted = [...result.assessments].sort(
        (a, b) => new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime()
      );
      const latest = sorted[0];
      setRecentMeta(latest);

      const loaded = await window.electron.assessmentStorage.loadSaved(latest.filename);
      if (!loaded.success || !loaded.data)
        throw new Error(loaded.error || 'Failed to load assessment');
      const fileData = loaded.data as { results: LoadedAssessment };
      setAssessment(fileData.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessment');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLatestAssessment();
  }, [loadLatestAssessment]);

  // Quality analysis metrics
  const qualityMetrics = useMemo(() => {
    if (!assessment?.assessments.length) return null;
    const assessments = assessment.assessments;
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
    const avgConf = assessments.reduce((s, a) => s + a.confidence_score, 0) / total;

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
      avgConf,
    };
  }, [assessment]);

  // Filtered + paginated
  const filteredAssessments = useMemo(() => {
    if (!assessment?.assessments) return [];
    if (!searchTerm) return assessment.assessments;
    const term = searchTerm.toLowerCase();
    return assessment.assessments.filter(
      (a) =>
        a.skill_name.toLowerCase().includes(term) ||
        a.category?.toLowerCase().includes(term) ||
        a.reasoning?.toLowerCase().includes(term)
    );
  }, [assessment, searchTerm]);

  const totalPages = Math.ceil(filteredAssessments.length / ROWS_PER_PAGE);
  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredAssessments.slice(start, start + ROWS_PER_PAGE);
  }, [filteredAssessments, currentPage]);

  // Only show Category column when at least one skill has category data
  const hasCategories = useMemo(
    () => assessment?.assessments.some((a) => a.category) ?? false,
    [assessment]
  );

  // Score correction handlers
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
    async (item: AssessmentResult) => {
      const skillName = item.skill_name;
      const override = overrides[skillName];
      if (!override) return;
      const originalLevel = item.proficiency_numeric ?? item.proficiency;
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
            model_used: assessment?.model_used ?? '',
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
    [overrides, assessment?.model_used, cancelEdit, toast]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <RefreshCw className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground">Loading latest assessment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <ErrorDisplay
          error={`Failed to load assessment: ${error}`}
          onRetry={loadLatestAssessment}
        />
      </div>
    );
  }

  if (!assessment || !recentMeta) {
    return (
      <motion.div
        className="flex flex-col items-center justify-center min-h-[400px] gap-6 text-center p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
          <ClipboardList className="w-10 h-10 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold mb-2">No assessments yet</h2>
          <p className="text-muted-foreground max-w-md">
            Run a proficiency assessment first. Your results will appear here for review and export.
          </p>
        </div>
        <Button onClick={() => setCurrentStep(4)} size="lg">
          Run Assessment <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>
    );
  }

  const showTokens = recentMeta.total_tokens > 0;
  const showCost = recentMeta.estimated_cost > 0;

  return (
    <motion.div className="p-6 space-y-6" variants={stagger} initial="hidden" animate="show">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Assessment Review
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {recentMeta.source_filename
              ? `Source: ${recentMeta.source_filename}`
              : `Assessed on ${new Date(recentMeta.saved_at).toLocaleString()}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentStep(4)}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <Button variant="outline" size="sm" onClick={loadLatestAssessment}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentStep(4)}>
            Run New Assessment
          </Button>
        </div>
      </motion.div>

      {/* Summary Stats */}
      <motion.div
        variants={fadeUp}
        className={`grid gap-4 ${showTokens || showCost ? 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-6' : 'grid-cols-2 md:grid-cols-4'}`}
      >
        <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="text-xs text-blue-600 dark:text-blue-400 mb-1 uppercase tracking-wide">
            Total Skills
          </div>
          <div className="text-2xl font-bold">{recentMeta.total_skills}</div>
        </Card>
        <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="text-xs text-green-600 dark:text-green-400 mb-1 uppercase tracking-wide">
            Avg Proficiency
          </div>
          <div className="text-2xl font-bold">{recentMeta.avg_proficiency.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground mt-0.5">out of 5</div>
        </Card>
        <Card className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800">
          <div className="text-xs text-indigo-600 dark:text-indigo-400 mb-1 uppercase tracking-wide">
            Avg Confidence
          </div>
          <div className="text-2xl font-bold">{Math.round(recentMeta.avg_confidence * 100)}%</div>
        </Card>
        <Card className="p-4 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
          <div className="text-xs text-purple-600 dark:text-purple-400 mb-1 uppercase tracking-wide">
            Processing Time
          </div>
          <div className="text-2xl font-bold">
            {recentMeta.processing_time >= 60
              ? `${Math.round(recentMeta.processing_time / 60)}m`
              : `${recentMeta.processing_time.toFixed(1)}s`}
          </div>
        </Card>
        <Card className="p-4 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 col-span-1">
          <div className="text-xs text-orange-600 dark:text-orange-400 mb-1 uppercase tracking-wide flex items-center gap-1">
            <Cpu className="w-3 h-3" /> Model
          </div>
          <div className="text-base font-bold truncate" title={recentMeta.model_used}>
            {recentMeta.model_used.split('/').pop() ?? recentMeta.model_used}
          </div>
        </Card>
        {showTokens && (
          <Card className="p-4 bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800">
            <div className="text-xs text-teal-600 dark:text-teal-400 mb-1 uppercase tracking-wide flex items-center gap-1">
              <Zap className="w-3 h-3" /> Tokens
            </div>
            <div className="text-2xl font-bold">{recentMeta.total_tokens.toLocaleString()}</div>
            {showCost && (
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Coins className="w-3 h-3" /> ${recentMeta.estimated_cost.toFixed(4)}
              </div>
            )}
          </Card>
        )}
      </motion.div>

      {/* Partial assessment warning */}
      {(assessment.failed_skills_count ?? 0) > 0 && (
        <motion.div variants={fadeUp}>
          <div className="flex items-start gap-3 px-4 py-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-amber-800 dark:text-amber-200">
                Incomplete assessment — {assessment.failed_skills_count} of{' '}
                {assessment.requested_skills_count ?? assessment.total_skills} skills failed (
                {assessment.requested_skills_count
                  ? Math.round(
                      (assessment.assessments.length / assessment.requested_skills_count) * 100
                    )
                  : 100}
                % coverage)
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                The LLM response was truncated mid-JSON. Re-run with a higher{' '}
                <strong>Max Tokens</strong> setting (8K or 16K) before exporting to ensure complete
                data.
              </p>
              <button
                onClick={() => setCurrentStep(4)}
                className="mt-2 text-sm font-medium text-amber-800 dark:text-amber-200 underline hover:no-underline"
              >
                Re-run assessment
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Export & Share */}
      <motion.div variants={fadeUp}>
        <Card variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Export & Share</CardTitle>
          </CardHeader>
          <CardContent>
            <ExportActions
              assessments={assessment.assessments}
              failedSkillsCount={assessment.failed_skills_count}
              requestedSkillsCount={assessment.requested_skills_count}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Quality Analysis */}
      {qualityMetrics && (
        <motion.div variants={fadeUp}>
          <Card className="p-5">
            <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" /> Quality Analysis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Level Distribution */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
                  Level Distribution
                </p>
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((level) => {
                    const count = qualityMetrics.levelCounts[level] || 0;
                    const pct =
                      qualityMetrics.total > 0
                        ? Math.round((count / qualityMetrics.total) * 100)
                        : 0;
                    const profNames = getProficiencyNames();
                    const badgeClass = getProficiencyBadgeClasses(level);
                    const barColor = badgeClass.includes('green')
                      ? 'bg-green-500'
                      : badgeClass.includes('blue')
                        ? 'bg-blue-500'
                        : badgeClass.includes('yellow')
                          ? 'bg-yellow-500'
                          : badgeClass.includes('orange')
                            ? 'bg-orange-500'
                            : 'bg-red-500';
                    return (
                      <div key={level} className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold shrink-0 ${badgeClass}`}
                        >
                          {level}
                        </span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
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

              {/* AI Confidence */}
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
                      qualityMetrics.total > 0
                        ? Math.round((count / qualityMetrics.total) * 100)
                        : 0;
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

              {/* Coverage */}
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
                        {Math.round(qualityMetrics.avgConf * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Results Table */}
      <motion.div variants={fadeUp}>
        <div className="flex items-center justify-between gap-4 mb-3">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-500" /> Skill Results
            <span className="text-sm font-normal text-muted-foreground">
              ({filteredAssessments.length}
              {searchTerm ? ` of ${assessment.assessments.length}` : ''} skills)
            </span>
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search skills..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Search skills"
              className="pl-10 pr-4 py-1.5 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary focus:outline-none w-56"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-sm" aria-label="Assessment results">
            <caption className="sr-only">Assessment Results</caption>
            <thead className="bg-muted">
              <tr>
                <th
                  scope="col"
                  className="w-8 px-3 py-3 text-left font-semibold text-foreground border-b border-border"
                >
                  #
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left font-semibold text-foreground border-b border-border"
                  style={{ width: hasCategories ? '20%' : '25%' }}
                >
                  Skill
                </th>
                {hasCategories && (
                  <th
                    scope="col"
                    className="px-3 py-3 text-left font-semibold text-foreground border-b border-border"
                    style={{ width: '12%' }}
                  >
                    Category
                  </th>
                )}
                <th
                  scope="col"
                  className="w-14 px-3 py-3 text-center font-semibold text-foreground border-b border-border"
                >
                  Level
                </th>
                <th
                  scope="col"
                  className="w-24 px-3 py-3 text-center font-semibold text-foreground border-b border-border"
                >
                  Confidence
                </th>
                <th
                  scope="col"
                  className="px-3 py-3 text-left font-semibold text-foreground border-b border-border"
                  style={{ width: '30%' }}
                >
                  Reasoning
                </th>
                <th
                  scope="col"
                  className="w-14 px-3 py-3 text-center font-semibold text-foreground border-b border-border"
                >
                  Evid.
                </th>
                <th
                  scope="col"
                  className="w-16 px-3 py-3 text-center font-semibold text-foreground border-b border-border"
                  title="Correct the AI score"
                >
                  Correct
                </th>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <tr>
                  <td
                    colSpan={hasCategories ? 8 : 7}
                    className="px-6 py-12 text-center text-muted-foreground"
                  >
                    {searchTerm
                      ? `No skills found matching "${searchTerm}"`
                      : 'No assessment results available.'}
                  </td>
                </tr>
              ) : (
                pageItems.map((item, idx) => {
                  const level = item.proficiency_numeric ?? item.proficiency;
                  const rowNumber = (currentPage - 1) * ROWS_PER_PAGE + idx + 1;
                  const pct = Math.round(item.confidence_score * 100);
                  const barColor =
                    item.confidence_score >= 0.8
                      ? 'bg-green-500'
                      : item.confidence_score >= 0.6
                        ? 'bg-yellow-500'
                        : 'bg-red-500';
                  const textColor =
                    item.confidence_score >= 0.8
                      ? 'text-green-600 dark:text-green-400'
                      : item.confidence_score >= 0.6
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-600 dark:text-red-400';
                  const ov = overrides[item.skill_name];
                  return (
                    <tr
                      key={item.skill_name}
                      className={`border-b border-border ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/30'} hover:bg-muted/50 transition-colors`}
                    >
                      <td className="px-3 py-2 text-muted-foreground font-mono text-xs">
                        {rowNumber}
                      </td>
                      <td className="px-3 py-2 font-medium text-foreground">{item.skill_name}</td>
                      {hasCategories && (
                        <td className="px-3 py-2 text-muted-foreground text-xs">
                          {item.category || <span className="italic">—</span>}
                        </td>
                      )}
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${getProficiencyBadgeClasses(level)}`}
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
                        <span className={item.reasoning ? 'line-clamp-3 leading-relaxed' : ''}>
                          {item.reasoning || <span className="italic">—</span>}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded text-xs font-medium ${item.evidence.length > 0 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-muted text-muted-foreground'}`}
                        >
                          {item.evidence.length}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-center">
                        {ov?.editing ? (
                          <div className="flex flex-col gap-1 items-center">
                            <select
                              className="text-xs border border-border rounded px-1 py-0.5 bg-background text-foreground"
                              value={ov.pendingLevel}
                              onChange={(e) =>
                                setOverrides((prev) => ({
                                  ...prev,
                                  [item.skill_name]: {
                                    ...prev[item.skill_name],
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
                                  [item.skill_name]: {
                                    ...prev[item.skill_name],
                                    note: e.target.value,
                                  },
                                }))
                              }
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={() => saveOverride(item)}
                                disabled={ov.saving}
                                className="p-0.5 text-green-600 hover:text-green-700 disabled:opacity-50"
                                title="Save correction"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => cancelEdit(item.skill_name)}
                                className="p-0.5 text-muted-foreground hover:text-foreground"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(item.skill_name, level)}
                            className={`p-1 rounded transition-colors ${ov?.saved ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                            title={
                              ov?.saved ? 'Feedback saved — click to update' : 'Correct this score'
                            }
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
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
                aria-label="Previous page"
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
                aria-label="Next page"
              >
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ReviewAssessment;
