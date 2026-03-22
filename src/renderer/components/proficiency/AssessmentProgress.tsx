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
            <Card className="p-8 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10 border-blue-100 dark:border-blue-900">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <LoadingSpinner size={24} className="mr-2" />
                        <span className="font-semibold text-lg">
                            {currentPhase === 'starting' ? 'Initializing...' :
                                currentPhase === 'processing' ? `Processing ${totalSkills} Skills...` :
                                    'Analyzing Results...'}
                        </span>
                    </div>
                    <div className="font-mono text-xl">{formatTime(elapsedTime)}</div>
                </div>

                <div className="space-y-3">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-600 transition-all duration-500 ease-out"
                            style={{
                                width: currentPhase === 'starting' ? '5%' :
                                    currentPhase === 'analyzing' ? '95%' :
                                        totalSkills > 0 ? `${Math.min((processedSkills / totalSkills) * 100, 90)}%` : '10%'
                            }}
                        />
                    </div>

                    {/* Progress details */}
                    <div className="text-sm text-muted-foreground text-center space-y-1">
                        {totalChunks > 0 && (
                            <div>
                                Chunk {currentChunk} of {totalChunks}
                            </div>
                        )}
                        <div>
                            {processedSkills} of {totalSkills} skills processed
                            {failedSkills.length > 0 && (
                                <span className="text-yellow-600 dark:text-yellow-400 ml-2">
                                    ({failedSkills.length} failed)
                                </span>
                            )}
                        </div>
                        {retryCount > 0 && (
                            <div className="text-yellow-600 dark:text-yellow-400">
                                Retry attempt {retryCount}
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
