/**
 * Run Assessment Component - Step 4
 * Execute the AI-powered proficiency assessment
 *
 * Composed from sub-components:
 * - AssessmentConfig: idle phase (data source, batch settings, start)
 * - AssessmentProgress: processing phase (progress bar, cancel)
 * - AssessmentResults: completed phase (summary, grouped results)
 * - useAssessment: all state and logic
 */

import { CheckCircle, XCircle, Brain, RefreshCw } from 'lucide-react';
import { useAppStore } from '../../stores/app-store';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { useAssessment } from './useAssessment';
import { AssessmentConfig } from './AssessmentConfig';
import { AssessmentProgress } from './AssessmentProgress';
import { AssessmentResults } from './AssessmentResults';

export default function RunAssessment() {
    const { error, setCurrentStep } = useAppStore();

    const assessment = useAssessment();

    const {
        currentPhase,
        assessmentResults,
        processedSkills,
        totalSkills,
        elapsedTime,
        currentChunk,
        totalChunks,
        failedSkills,
        retryCount,
        batchSettings,
        showBatchSettings,
        runAssessment,
        cancelAssessment,
        resetToIdle,
    } = assessment;

    const isRunning = currentPhase === 'starting' || currentPhase === 'processing' || currentPhase === 'analyzing';
    const showConfig = currentPhase === 'idle' || isRunning || currentPhase === 'error';

    return (
        <div className="max-w-7xl mx-auto p-8 fade-in">
            <Card className="p-8 border-none bg-background shadow-none">

                {/* Header */}
                <div className="text-center mb-8">
                    <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${currentPhase === 'completed' ? 'bg-green-100 dark:bg-green-900/30' :
                        currentPhase === 'error' ? 'bg-red-100 dark:bg-red-900/30' :
                            'bg-purple-100 dark:bg-purple-900/30'
                        }`}>
                        {currentPhase === 'completed' ? <CheckCircle className="w-8 h-8 text-green-600" /> :
                            currentPhase === 'error' ? <XCircle className="w-8 h-8 text-red-600" /> :
                                <Brain className="w-8 h-8 text-purple-600" />}
                    </div>
                    <h2 className="text-3xl font-bold mb-2">
                        {currentPhase === 'completed' ? 'Assessment Complete!' :
                            currentPhase === 'error' ? 'Assessment Failed' :
                                'Run Proficiency Assessment'}
                    </h2>
                    <p className="text-muted-foreground">
                        {currentPhase === 'idle' ? 'Ready to assess proficiency levels for your skills' :
                            currentPhase === 'starting' ? 'Initializing assessment...' :
                                currentPhase === 'processing' ? 'AI is analyzing your skills...' :
                                    currentPhase === 'analyzing' ? 'Finalizing results...' :
                                        currentPhase === 'error' ? 'Something went wrong during the assessment' :
                                            'Your proficiency assessment is ready for review'}
                    </p>
                </div>

                {/* Config + Progress on same screen */}
                {showConfig && (
                    <AssessmentConfig
                        batchSettings={batchSettings}
                        showBatchSettings={showBatchSettings}
                        onSetBatchingEnabled={assessment.setBatchingEnabled}
                        onSetBatchMode={assessment.setBatchMode}
                        onSetAutoBatchCount={assessment.setAutoBatchCount}
                        onSetManualChunkSize={assessment.setManualChunkSize}
                        onToggleBatchSettings={() => assessment.setShowBatchSettings(!showBatchSettings)}
                        onStart={runAssessment}
                        onBackToConfig={() => setCurrentStep(3)}
                        isRunning={isRunning}
                    />
                )}

                {/* Progress appears below config */}
                {isRunning && (
                    <div className="mt-6">
                        <AssessmentProgress
                            currentPhase={currentPhase}
                            processedSkills={processedSkills}
                            totalSkills={totalSkills}
                            elapsedTime={elapsedTime}
                            currentChunk={currentChunk}
                            totalChunks={totalChunks}
                            failedSkills={failedSkills}
                            retryCount={retryCount}
                            onCancel={cancelAssessment}
                        />
                    </div>
                )}

                {/* Phase: Error */}
                {currentPhase === 'error' && (
                    <div className="max-w-2xl mx-auto space-y-6 mt-6">
                        <ErrorDisplay
                            error={error}
                            variant="card"
                            onRetry={runAssessment}
                            onDismiss={resetToIdle}
                        />
                        <div className="flex justify-center gap-4">
                            <Button variant="outline" onClick={() => setCurrentStep(3)}>
                                Back to Config
                            </Button>
                            <Button onClick={runAssessment}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Try Again
                            </Button>
                        </div>
                    </div>
                )}

                {/* Phase: Completed */}
                {currentPhase === 'completed' && assessmentResults && (
                    <AssessmentResults
                        results={assessmentResults}
                        onRestart={resetToIdle}
                    />
                )}
            </Card>
        </div>
    );
}
