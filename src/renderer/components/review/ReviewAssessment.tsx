/**
 * Review Assessment - Step 5
 * Displays the most recently completed assessment with full export capabilities.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import {
  ClipboardList,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  Award,
  TrendingUp,
  Clock,
  Search,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { ExportActions } from './ExportActions';
import { useAppStore } from '../../stores/app-store';
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

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentMeta, setRecentMeta] = useState<SavedAssessmentMeta | null>(null);
  const [assessment, setAssessment] = useState<LoadedAssessment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

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
      // Most recent first
      const sorted = [...result.assessments].sort(
        (a, b) => new Date(b.saved_at).getTime() - new Date(a.saved_at).getTime()
      );
      const latest = sorted[0];
      setRecentMeta(latest);

      const loaded = await window.electron.assessmentStorage.loadSaved(latest.filename);
      if (!loaded.success || !loaded.data)
        throw new Error(loaded.error || 'Failed to load assessment');
      setAssessment(loaded.data as LoadedAssessment);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load assessment');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLatestAssessment();
  }, [loadLatestAssessment]);

  // Filtered + paginated results
  const filteredAssessments =
    assessment?.assessments.filter(
      (a) => !searchTerm || a.skill_name.toLowerCase().includes(searchTerm.toLowerCase())
    ) ?? [];
  const totalPages = Math.ceil(filteredAssessments.length / ROWS_PER_PAGE);
  const pageItems = filteredAssessments.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <RefreshCw className="w-10 h-10 text-primary animate-spin" />
        <p className="text-muted-foreground">Loading latest assessment...</p>
      </div>
    );
  }

  // Error state
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

  // Empty state
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
          Run Assessment
          <ChevronRight className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>
    );
  }

  const avgPct = Math.round(recentMeta.avg_proficiency * 20);
  const avgConfPct = Math.round(recentMeta.avg_confidence * 100);

  return (
    <motion.div className="space-y-6 p-6" variants={stagger} initial="hidden" animate="show">
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
          <Button variant="outline" size="sm" onClick={loadLatestAssessment}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentStep(4)}>
            Run New Assessment
          </Button>
        </div>
      </motion.div>

      {/* Summary Stats */}
      <motion.div variants={fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="glass">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                Skills Assessed
              </span>
            </div>
            <div className="text-3xl font-bold">{recentMeta.total_skills}</div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                Avg Proficiency
              </span>
            </div>
            <div className="text-3xl font-bold text-success">{avgPct}%</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {recentMeta.avg_proficiency.toFixed(1)} / 5
            </div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle className="w-4 h-4 text-info" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                Avg Confidence
              </span>
            </div>
            <div className="text-3xl font-bold text-info">{avgConfPct}%</div>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-wide">
                Processing Time
              </span>
            </div>
            <div className="text-3xl font-bold">
              {recentMeta.processing_time >= 60
                ? `${Math.round(recentMeta.processing_time / 60)}m`
                : `${Math.round(recentMeta.processing_time)}s`}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">{recentMeta.model_used}</div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Export Actions */}
      <motion.div variants={fadeUp}>
        <Card variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Export & Share</CardTitle>
          </CardHeader>
          <CardContent>
            <ExportActions assessments={assessment.assessments} />
          </CardContent>
        </Card>
      </motion.div>

      {/* Results Table */}
      <motion.div variants={fadeUp}>
        <Card variant="glass">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Skill Results
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({filteredAssessments.length} of {assessment.assessments.length})
                </span>
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search skills..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8 pr-3 py-1.5 text-sm border rounded-md bg-background text-foreground w-48 focus:outline-none focus:ring-1 focus:ring-ring"
                  aria-label="Search skills"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredAssessments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="w-8 h-8 mb-2 opacity-40" />
                <p>No skills match "{searchTerm}"</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" aria-label="Assessment results">
                    <thead className="bg-muted/50 text-muted-foreground">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left font-medium">
                          Skill
                        </th>
                        <th scope="col" className="px-4 py-3 text-left font-medium">
                          Category
                        </th>
                        <th scope="col" className="px-4 py-3 text-left font-medium">
                          Proficiency
                        </th>
                        <th scope="col" className="px-4 py-3 text-left font-medium">
                          Confidence
                        </th>
                        <th scope="col" className="px-4 py-3 text-left font-medium">
                          Reasoning
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageItems.map((item, idx) => {
                        const level = item.proficiency_numeric ?? item.proficiency;
                        const levelName = getProficiencyNames()[level - 1] ?? `Level ${level}`;
                        const badgeClass = getProficiencyBadgeClasses(level);
                        return (
                          <tr
                            key={idx}
                            className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                          >
                            <td className="px-4 py-3 font-medium">{item.skill_name}</td>
                            <td className="px-4 py-3 text-muted-foreground text-xs">
                              {item.category || '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${badgeClass}`}
                              >
                                {level} – {levelName}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-muted rounded-full h-1.5 w-16">
                                  <div
                                    className="h-1.5 rounded-full bg-primary"
                                    style={{ width: `${Math.round(item.confidence_score * 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground w-8">
                                  {Math.round(item.confidence_score * 100)}%
                                </span>
                              </div>
                            </td>
                            <td
                              className="px-4 py-3 text-muted-foreground text-xs max-w-xs truncate"
                              title={item.reasoning}
                            >
                              {item.reasoning}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
                    <span className="text-xs text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        aria-label="Previous page"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        aria-label="Next page"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default ReviewAssessment;
