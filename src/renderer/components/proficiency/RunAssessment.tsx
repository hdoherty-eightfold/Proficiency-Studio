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

import { motion } from 'motion/react';
import { CheckCircle, XCircle, Brain, RefreshCw, ChevronLeft } from 'lucide-react';
import { useAppStore } from '../../stores/app-store';
import { Button } from '../ui/button';
import { ErrorDisplay } from '../common/ErrorDisplay';
import { useAssessment } from './useAssessment';
import { AssessmentConfig } from './AssessmentConfig';
import { AssessmentProgress } from './AssessmentProgress';
import { AssessmentResults } from './AssessmentResults';

export default function RunAssessment() {
  const { error, setCurrentStep, previousStep } = useAppStore();

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
    loadPastAssessment,
  } = assessment;

  const isRunning =
    currentPhase === 'starting' || currentPhase === 'processing' || currentPhase === 'analyzing';
  const showConfig = currentPhase === 'idle' || isRunning;

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };
  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

  return (
    <motion.div className="p-6 space-y-6" variants={stagger} initial="hidden" animate="show">
      {/* Back button - always shown when not running */}
      {!isRunning && (
        <motion.div variants={fadeUp} className="mb-4">
          <Button variant="back-nav" size="sm" onClick={previousStep} className="gap-1.5">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
        </motion.div>
      )}

      {/* Header */}
      <motion.div variants={fadeUp} className="text-center mb-8">
        <div
          className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
            currentPhase === 'completed'
              ? 'bg-green-100 dark:bg-green-900/30'
              : currentPhase === 'error'
                ? 'bg-red-100 dark:bg-red-900/30'
                : 'bg-purple-100 dark:bg-purple-900/30'
          }`}
        >
          {currentPhase === 'completed' ? (
            <CheckCircle className="w-10 h-10 text-green-600" />
          ) : currentPhase === 'error' ? (
            <XCircle className="w-10 h-10 text-red-600" />
          ) : (
            <Brain className="w-10 h-10 text-purple-600" />
          )}
        </div>
        <h2 className="text-3xl font-bold mb-2">
          {currentPhase === 'completed'
            ? 'Assessment Complete!'
            : currentPhase === 'error'
              ? 'Assessment Failed'
              : 'Run Proficiency Assessment'}
        </h2>
        <p className="text-muted-foreground">
          {currentPhase === 'idle'
            ? 'Ready to assess proficiency levels for your skills'
            : currentPhase === 'starting'
              ? 'Initializing assessment...'
              : currentPhase === 'processing'
                ? 'AI is analyzing your skills...'
                : currentPhase === 'analyzing'
                  ? 'Finalizing results...'
                  : currentPhase === 'error'
                    ? 'Something went wrong during the assessment'
                    : 'Your proficiency assessment is ready for review'}
        </p>
      </motion.div>

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
          onLoadPastAssessment={loadPastAssessment}
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
          {/* Batching suggestion for JSON parse errors on large skill sets */}
          {!batchSettings.batchingEnabled &&
            typeof error === 'string' &&
            error.includes('Failed to parse LLM response') && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="text-amber-400 text-lg leading-none">⚡</span>
                  <div>
                    <p className="font-semibold text-amber-300 text-sm">Large skill set detected</p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Assessing {totalSkills} skills in a single LLM call exceeds the model's output
                      limit. Enable batching to process skills in smaller groups and avoid
                      truncation.
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    assessment.setBatchingEnabled(true);
                    runAssessment();
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Enable Batching &amp; Retry
                </Button>
              </div>
            )}
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
        <AssessmentResults results={assessmentResults} onRestart={resetToIdle} />
      )}
    </motion.div>
  );
}
