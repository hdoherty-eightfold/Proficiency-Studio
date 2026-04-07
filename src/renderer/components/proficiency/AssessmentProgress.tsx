/**
 * Assessment Progress - Processing phase UI
 * Shows progress bar, chunk info, cancel button
 */

import { XCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { formatTime } from './useAssessment';
import type { AssessmentPhase } from './assessment-types';

interface AssessmentProgressProps {
  currentPhase: AssessmentPhase;
  processedSkills: number;
  totalSkills: number;
  elapsedTime: number;
  currentChunk: number;
  totalChunks: number;
  failedSkills: string[];
  retryCount: number;
  onCancel: () => void;
}

export function AssessmentProgress({
  currentPhase,
  processedSkills,
  totalSkills,
  elapsedTime,
  currentChunk,
  totalChunks,
  failedSkills,
  retryCount,
  onCancel,
}: AssessmentProgressProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <Card className="p-8 bg-muted/30 border-primary/20">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <LoadingSpinner size={24} className="mr-2" />
            <span className="font-semibold text-lg">
              {currentPhase === 'starting'
                ? 'Initializing...'
                : currentPhase === 'processing'
                  ? `Processing ${totalSkills} Skills...`
                  : 'Analyzing Results...'}
            </span>
          </div>
          <div className="font-mono text-xl">{formatTime(elapsedTime)}</div>
        </div>

        <div className="space-y-3">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            {/* Use indeterminate animation when no batching (no progress events) */}
            {totalChunks === 0 && processedSkills === 0 && currentPhase === 'processing' ? (
              <div
                className="h-full bg-blue-600 animate-pulse rounded-full"
                style={{ width: '40%', animation: 'indeterminate 1.5s ease-in-out infinite' }}
              />
            ) : (
              <div
                className="h-full bg-blue-600 transition-all duration-500 ease-out"
                style={{
                  width:
                    currentPhase === 'starting'
                      ? '5%'
                      : currentPhase === 'analyzing'
                        ? '95%'
                        : totalSkills > 0
                          ? `${Math.min((processedSkills / totalSkills) * 100, 90)}%`
                          : '10%',
                }}
              />
            )}
          </div>

          {/* Progress details */}
          <div className="text-sm text-muted-foreground text-center space-y-1">
            {totalChunks > 0 && (
              <div>
                Chunk {currentChunk} of {totalChunks}
              </div>
            )}
            <div>
              {totalChunks === 0 && processedSkills === 0 && currentPhase === 'processing'
                ? `Processing all ${totalSkills} skills — results will appear when complete`
                : `${processedSkills} of ${totalSkills} skills processed`}
            </div>
            {retryCount > 0 && (
              <div className="mt-2 px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 rounded-md text-yellow-700 dark:text-yellow-400 font-medium">
                Retry attempt {retryCount}/3 — previous attempt failed
              </div>
            )}
            {failedSkills.length > 0 && (
              <div className="mt-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 rounded-md text-red-700 dark:text-red-400">
                <span className="font-medium">{failedSkills.length} skills failed</span>
                {failedSkills.length <= 5 ? (
                  <span className="ml-1">: {failedSkills.join(', ')}</span>
                ) : (
                  <span className="ml-1">
                    : {failedSkills.slice(0, 3).join(', ')} +{failedSkills.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cancel button */}
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={onCancel}
            className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Cancel Assessment
          </Button>
        </div>
      </Card>
    </div>
  );
}
