import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import { electronAPI } from '../../services/electron-api';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { useToast } from '../../stores/toast-store';
import { getProficiencyBadgeClasses } from '../../config/proficiency';
import {
  History,
  Download,
  Trash2,
  Eye,
  RefreshCw,
  Calendar,
  Clock,
  CheckCircle,
  ChevronLeft,
  BarChart2,
  Brain,
  AlertCircle,
  FileText,
  Upload,
  Zap,
  TrendingUp,
} from 'lucide-react';

/** Summary shown in the list view */
interface AssessmentSummary {
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

/** Individual skill assessment within a saved file */
interface SkillAssessment {
  skill_name: string;
  proficiency: number;
  proficiency_numeric: number;
  confidence_score: number;
  reasoning: string;
  evidence?: string[];
  category?: string;
}

/** Full saved assessment data loaded from a JSON file */
interface SavedAssessmentData {
  saved_at: string;
  content_hash?: string;
  results: {
    success: boolean;
    assessments: SkillAssessment[];
    total_skills: number;
    avg_proficiency: number;
    processing_time: number;
    model_used: string;
    timestamp: string;
  };
  summary?: {
    total_tokens_used?: number;
    estimated_cost?: number;
    success_rate?: number;
    level_distribution?: Record<string, number>;
    retry_count?: number;
    [key: string]: unknown;
  };
  source?: {
    extractionSource?: string | null;
    filename?: string | null;
    skillCount?: number;
    extractedAt?: string | null;
  };
  config?: {
    llmConfig?: { provider?: string; model?: string; temperature?: number; max_tokens?: number };
    proficiencyLevels?: Array<{ level: number; name: string; description: string }>;
    promptTemplate?: string;
  };
}

const AssessmentHistory: React.FC = () => {
  const { toast } = useToast();

  const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detail view
  const [selectedFilename, setSelectedFilename] = useState<string | null>(null);
  const [selectedData, setSelectedData] = useState<SavedAssessmentData | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  // Loaded full assessment data for variance computation (only scores needed, not all details)
  const [allAssessmentData, setAllAssessmentData] = useState<SavedAssessmentData[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await electronAPI.listSavedAssessments();

      if (response.success) {
        setAssessments(response.assessments);

        // Load full data for variance computation (silently, best-effort)
        const fullData: SavedAssessmentData[] = [];
        for (const summary of response.assessments) {
          try {
            const detail = await electronAPI.loadSavedAssessment(summary.filename);
            if (detail.success && detail.data) {
              fullData.push(detail.data as SavedAssessmentData);
            }
          } catch {
            /* skip */
          }
        }
        setAllAssessmentData(fullData);
      } else {
        throw new Error(response.error || 'Failed to load history');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load assessment history');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const loadDetail = async (filename: string) => {
    try {
      setLoadingDetail(true);
      const response = await electronAPI.loadSavedAssessment(filename);
      if (response.success && response.data) {
        setSelectedFilename(filename);
        setSelectedData(response.data as SavedAssessmentData);
      } else {
        throw new Error(response.error || 'Failed to load assessment');
      }
    } catch (err: unknown) {
      toast({
        title: err instanceof Error ? err.message : 'Failed to load assessment details',
        variant: 'destructive',
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  const deleteAssessment = async (filename: string) => {
    try {
      const response = await electronAPI.deleteSavedAssessment(filename);
      if (response.success) {
        toast({ title: 'Assessment deleted' });
        setSelectedFilename(null);
        setSelectedData(null);
        loadHistory();
      } else {
        throw new Error(response.error || 'Failed to delete');
      }
    } catch (err: unknown) {
      toast({
        title: err instanceof Error ? err.message : 'Failed to delete assessment',
        variant: 'destructive',
      });
    }
  };

  const exportAssessment = (data: SavedAssessmentData, filename: string) => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.replace('.json', '_export.json');
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Exported as JSON' });
    } catch {
      toast({ title: 'Export failed', variant: 'destructive' });
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return (
        date.toLocaleDateString() +
        ' ' +
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      );
    } catch {
      return dateStr;
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 dark:text-green-400';
    if (score >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getConfidenceBg = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 dark:bg-green-900/30';
    if (score >= 0.6) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs.toFixed(0)}s`;
  };

  /** Compute high-variance skills across all loaded assessments */
  const highVarianceSkills = useMemo(() => {
    if (allAssessmentData.length < 2) return [];

    // Collect all scores per skill name across assessments
    const skillScores: Record<string, number[]> = {};
    for (const data of allAssessmentData) {
      const assessments = data.results?.assessments || [];
      for (const a of assessments) {
        const name = a.skill_name;
        const level = a.proficiency_numeric ?? a.proficiency ?? 0;
        if (!name || !level) continue;
        if (!skillScores[name]) skillScores[name] = [];
        skillScores[name].push(level);
      }
    }

    // Find skills appearing in 2+ assessments with range > 1
    return Object.entries(skillScores)
      .filter(([, scores]) => scores.length >= 2)
      .map(([skillName, scores]) => ({
        skillName,
        scores,
        min: Math.min(...scores),
        max: Math.max(...scores),
        range: Math.max(...scores) - Math.min(...scores),
      }))
      .filter((s) => s.range > 1)
      .sort((a, b) => b.range - a.range)
      .slice(0, 10); // top 10 most volatile
  }, [allAssessmentData]);

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };
  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

  // ─── Detail View ───────────────────────────────────────────────────────

  if (selectedData && selectedFilename) {
    const results = selectedData.results;
    const skillAssessments = results?.assessments || [];
    const avgConfidence =
      skillAssessments.length > 0
        ? skillAssessments.reduce((sum, a) => sum + (a.confidence_score || 0), 0) /
          skillAssessments.length
        : 0;

    return (
      <motion.div
        className="h-full flex flex-col p-6 space-y-6 overflow-y-auto"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {/* Header */}
        <motion.div variants={fadeUp} className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              Assessment Details
            </h1>
            <p className="text-muted-foreground">
              {formatDate(selectedData.saved_at)} &middot; {results?.model_used || 'Unknown model'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedFilename(null);
                setSelectedData(null);
              }}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              variant="outline-blue"
              onClick={() => exportAssessment(selectedData, selectedFilename)}
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="destructive" onClick={() => setConfirmingDelete(selectedFilename)}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </motion.div>

        {/* Stats cards */}
        <motion.div
          variants={fadeUp}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
        >
          <Card variant="glass">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Model</div>
                <div className="font-semibold text-sm">{results?.model_used || 'Unknown'}</div>
                {selectedData.config?.llmConfig?.provider && (
                  <div className="text-xs text-muted-foreground">
                    {selectedData.config.llmConfig.provider}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <BarChart2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Skills Assessed</div>
                <div className="font-semibold">
                  {results?.total_skills || skillAssessments.length}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${getConfidenceBg(avgConfidence)}`}>
                <CheckCircle className={`w-5 h-5 ${getConfidenceColor(avgConfidence)}`} />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Avg Confidence</div>
                <div className="font-semibold">{(avgConfidence * 100).toFixed(1)}%</div>
              </div>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Processing Time</div>
                <div className="font-semibold">{formatTime(results?.processing_time || 0)}</div>
              </div>
            </CardContent>
          </Card>
          {selectedData.source?.filename && (
            <Card variant="glass">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <Upload className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Source</div>
                  <div className="font-semibold text-sm truncate max-w-[180px]">
                    {selectedData.source.filename}
                  </div>
                  {selectedData.source.extractionSource && (
                    <div className="text-xs text-muted-foreground">
                      {selectedData.source.extractionSource.toUpperCase()}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          {selectedData.summary?.total_tokens_used ? (
            <Card variant="glass">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
                  <Zap className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Tokens Used</div>
                  <div className="font-semibold">
                    {selectedData.summary.total_tokens_used.toLocaleString()}
                  </div>
                  {selectedData.summary.estimated_cost ? (
                    <div className="text-xs text-muted-foreground">
                      ${selectedData.summary.estimated_cost.toFixed(4)}
                    </div>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </motion.div>

        {/* Proficiency Distribution */}
        {skillAssessments.length > 0 && (
          <motion.div variants={fadeUp}>
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-lg">Proficiency Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-6 flex-wrap">
                  {Object.entries(
                    skillAssessments.reduce<Record<number, number>>((acc, a) => {
                      const level = a.proficiency_numeric ?? a.proficiency ?? 0;
                      acc[level] = (acc[level] || 0) + 1;
                      return acc;
                    }, {})
                  )
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([level, count]) => (
                      <div key={level} className="text-center">
                        <div className="text-2xl font-bold">{count}</div>
                        <div
                          className={`text-xs font-medium px-2 py-0.5 rounded ${getProficiencyBadgeClasses(Number(level))}`}
                        >
                          Level {level}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Skills Grid */}
        <motion.div variants={fadeUp}>
          <Card variant="glass">
            <CardHeader>
              <CardTitle className="text-lg">
                Skill Proficiencies ({skillAssessments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {skillAssessments.map((skill) => (
                  <Card key={skill.skill_name} className="bg-muted/50">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-sm">{skill.skill_name}</div>
                        <div
                          className={`px-2 py-1 rounded text-xs font-bold ${getProficiencyBadgeClasses(skill.proficiency_numeric ?? skill.proficiency)}`}
                        >
                          Level {skill.proficiency_numeric ?? skill.proficiency}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {skill.reasoning}
                      </p>
                      <div className="mt-2 flex justify-between items-center text-xs">
                        <span className="text-muted-foreground">Confidence</span>
                        <span
                          className={`font-medium ${getConfidenceColor(skill.confidence_score)}`}
                        >
                          {(skill.confidence_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Config info */}
        {selectedData.config?.llmConfig && (
          <motion.div variants={fadeUp}>
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="text-lg">Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  {selectedData.config.llmConfig.provider && (
                    <div>
                      <div className="text-xs text-muted-foreground">Provider</div>
                      <div className="font-medium">{selectedData.config.llmConfig.provider}</div>
                    </div>
                  )}
                  {selectedData.config.llmConfig.model && (
                    <div>
                      <div className="text-xs text-muted-foreground">Model</div>
                      <div className="font-medium">{selectedData.config.llmConfig.model}</div>
                    </div>
                  )}
                  {selectedData.config.proficiencyLevels && (
                    <div>
                      <div className="text-xs text-muted-foreground">Proficiency Levels</div>
                      <div className="font-medium">
                        {selectedData.config.proficiencyLevels.length} levels
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <ConfirmDialog
          open={confirmingDelete !== null}
          onOpenChange={(open) => {
            if (!open) setConfirmingDelete(null);
          }}
          onConfirm={() => {
            if (confirmingDelete) deleteAssessment(confirmingDelete);
            setConfirmingDelete(null);
          }}
          title="Delete Assessment"
          description="Are you sure you want to delete this assessment? This cannot be undone."
          confirmText="Delete"
          variant="destructive"
        />
      </motion.div>
    );
  }

  // ─── List View ─────────────────────────────────────────────────────────

  return (
    <motion.div
      className="h-full flex flex-col p-6 space-y-6 overflow-y-auto"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <History className="w-6 h-6" />
            Assessment History
          </h1>
          <p className="text-muted-foreground">View and manage past proficiency assessments</p>
        </div>
        <Button variant="outline" onClick={loadHistory} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </motion.div>

      {/* Error */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4 flex items-center gap-3 text-destructive">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      <motion.div variants={fadeUp}>
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : assessments.length === 0 ? (
          /* Empty state */
          <Card variant="glass">
            <CardContent className="p-12 text-center">
              <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Assessments Found</h3>
              <p className="text-muted-foreground">
                Run a proficiency assessment to see it appear here. Results are automatically saved.
              </p>
            </CardContent>
          </Card>
        ) : (
          /* Assessment list */
          <>
            <CardDescription>
              {assessments.length} saved assessment{assessments.length !== 1 ? 's' : ''}
            </CardDescription>

            {/* High Variance Skills panel */}
            {highVarianceSkills.length > 0 && (
              <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <TrendingUp className="w-4 h-4" />
                    High Variance Skills
                    <span className="text-xs font-normal text-amber-600 dark:text-amber-500">
                      — scored differently across assessments. Consider correcting these scores to
                      calibrate future results.
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2">
                    {highVarianceSkills.map(({ skillName, scores, min, max }) => (
                      <div
                        key={skillName}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700"
                      >
                        <span className="text-xs font-medium text-amber-800 dark:text-amber-300">
                          {skillName}
                        </span>
                        <span className="text-xs text-amber-600 dark:text-amber-500 tabular-nums">
                          {min}–{max}
                          <span className="ml-1 text-amber-500 dark:text-amber-600">
                            ({scores.length} runs)
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              {assessments.map((assessment) => {
                // Build a human-readable source label
                const rawFilename = assessment.source_filename;
                const basename = rawFilename
                  ? (rawFilename.replace(/\\/g, '/').split('/').pop() ?? rawFilename)
                  : null;
                const sourceLabel = assessment.environment_name
                  ? assessment.environment_name
                  : basename
                    ? basename
                    : assessment.extraction_source === 'api'
                      ? 'Eightfold API'
                      : assessment.extraction_source === 'csv'
                        ? 'CSV Upload'
                        : assessment.extraction_source === 'sftp'
                          ? 'SFTP'
                          : null;

                return (
                  <Card
                    key={assessment.filename}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => loadDetail(assessment.filename)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium flex items-center gap-2">
                              <span className="truncate">
                                {assessment.model_used || 'Unknown Model'}
                              </span>
                              {assessment.provider && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                                  {assessment.provider}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-3">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(assessment.saved_at)}
                              </span>
                              {sourceLabel && (
                                <span className="flex items-center gap-1">
                                  <Upload className="w-3 h-3" />
                                  {sourceLabel}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-5 shrink-0">
                          <div className="text-center">
                            <div className="text-lg font-bold">{assessment.total_skills}</div>
                            <div className="text-xs text-muted-foreground">Skills</div>
                          </div>
                          <div className="text-center">
                            <div
                              className={`text-lg font-bold ${getConfidenceColor(assessment.avg_confidence)}`}
                            >
                              {(assessment.avg_confidence * 100).toFixed(0)}%
                            </div>
                            <div className="text-xs text-muted-foreground">Confidence</div>
                          </div>
                          {assessment.processing_time > 0 && (
                            <div className="text-center">
                              <div className="text-lg font-bold">
                                {formatTime(assessment.processing_time)}
                              </div>
                              <div className="text-xs text-muted-foreground">Time</div>
                            </div>
                          )}
                          {assessment.total_tokens > 0 && (
                            <div className="text-center">
                              <div className="text-lg font-bold">
                                {assessment.total_tokens.toLocaleString()}
                              </div>
                              <div className="text-xs text-muted-foreground">Tokens</div>
                            </div>
                          )}
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                loadDetail(assessment.filename);
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmingDelete(assessment.filename);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </motion.div>

      {/* Loading overlay for detail fetch */}
      {loadingDetail && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
          <Card className="p-6">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Loading assessment details...</span>
            </div>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={confirmingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmingDelete(null);
        }}
        onConfirm={() => {
          if (confirmingDelete) deleteAssessment(confirmingDelete);
          setConfirmingDelete(null);
        }}
        title="Delete Assessment"
        description="Are you sure you want to delete this assessment? This cannot be undone."
        confirmText="Delete"
        variant="destructive"
      />
    </motion.div>
  );
};

export default AssessmentHistory;
