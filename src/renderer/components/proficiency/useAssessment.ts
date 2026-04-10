/**
 * Hook encapsulating all assessment execution logic
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../../stores/app-store';
import { useToast } from '../../stores/toast-store';
import { electronAPI } from '../../services/electron-api';
import { getFallbackProvider } from '../../config/models';
import type { AssessmentResponse, AssessmentPhase } from './assessment-types';

/**
 * Inactivity timeout scaled to skill count — matches the backend's own scaling formula
 * (2 min base + 1 min per 50 skills, capped at 30 min), plus a 2-minute buffer.
 */
const getStreamingTimeoutMs = (skillCount: number) =>
  Math.min(32, 4 + Math.ceil(skillCount / 50)) * 60 * 1000;

interface BatchSettings {
  batchingEnabled: boolean;
  batchMode: 'auto' | 'manual';
  autoBatchCount: number;
  manualChunkSize: number;
}

interface UseAssessmentReturn {
  // State
  currentPhase: AssessmentPhase;
  assessmentResults: AssessmentResponse | null;
  loadPastAssessment: (results: AssessmentResponse) => void;
  processedSkills: number;
  totalSkills: number;
  elapsedTime: number;
  currentChunk: number;
  totalChunks: number;
  failedSkills: string[];
  retryCount: number;

  // Batch settings
  batchSettings: BatchSettings;
  showBatchSettings: boolean;
  setBatchingEnabled: (enabled: boolean) => void;
  setBatchMode: (mode: 'auto' | 'manual') => void;
  setAutoBatchCount: (count: number) => void;
  setManualChunkSize: (size: number) => void;
  setShowBatchSettings: (show: boolean) => void;

  // Actions
  runAssessment: () => Promise<void>;
  cancelAssessment: () => Promise<void>;
  resetToIdle: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export { formatTime };

export function useAssessment(): UseAssessmentReturn {
  const { skillsState, uploadedFile, setError, setLoading, markStepCompleted, setCurrentStep } =
    useAppStore();
  const { toast } = useToast();

  // Phase state
  const [currentPhase, setCurrentPhase] = useState<AssessmentPhase>('idle');
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResponse | null>(null);

  // Progress state
  const [processedSkills, setProcessedSkills] = useState(0);
  const [totalSkills, setTotalSkills] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Streaming state
  const [streamId, setStreamId] = useState<string | null>(null);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);
  const [failedSkills, setFailedSkills] = useState<string[]>([]);
  const [retryCount, setRetryCount] = useState(0);

  // Batch settings
  const [batchingEnabled, setBatchingEnabled] = useState(false);
  const [batchMode, setBatchMode] = useState<'auto' | 'manual'>('auto');
  const [autoBatchCount, setAutoBatchCount] = useState(3);
  const [manualChunkSize, setManualChunkSize] = useState(20);
  const [showBatchSettings, setShowBatchSettings] = useState(false);

  // Raw response ref for auto-save
  const rawResponseRef = useRef<Record<string, unknown> | null>(null);

  // Streaming inactivity timeout ref
  const streamingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mirror of processedSkills for use inside timeout closure (state reads are stale in closures)
  const processedSkillsRef = useRef(0);

  // Fallback attempt tracking — prevents infinite retry loops
  const fallbackAttemptRef = useRef(false);

  // Clear global error when hook initializes; always start idle so user chooses to run or load a past result
  useEffect(() => {
    setError(null);
  }, [setError]);

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentPhase === 'processing' || currentPhase === 'analyzing') {
      interval = setInterval(() => {
        if (startTime) {
          setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentPhase, startTime]);

  const getEffectiveChunkSize = (): number | null => {
    if (!batchingEnabled) return null;
    if (batchMode === 'auto') {
      return Math.ceil(skillsState.skills.length / autoBatchCount);
    }
    return manualChunkSize;
  };

  const loadConfiguration = () => {
    try {
      const storedConfig = localStorage.getItem('profstudio_proficiency_config');
      if (!storedConfig) {
        throw new Error('Missing configuration. Please go back to the Configure step.');
      }
      return JSON.parse(storedConfig);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Configuration Missing',
        description: 'Please configure the assessment settings first (Step 3)',
      });
      return null;
    }
  };

  const transformAssessmentResults = (summary: Record<string, unknown>): AssessmentResponse => {
    const rawAssessments = (summary.assessments as Array<Record<string, unknown>>) || [];
    return {
      success: true,
      assessments: rawAssessments.map((assessment) => {
        const numericLevel = (assessment.proficiency_numeric ??
          assessment.proficiency_level ??
          assessment.proficiency ??
          0) as number;
        return {
          skill_name: assessment.skill_name as string,
          proficiency: numericLevel,
          proficiency_numeric: numericLevel,
          confidence_score: (assessment.confidence_score ?? assessment.confidence ?? 0) as number,
          reasoning: (assessment.reasoning as string) || '',
          evidence: (assessment.evidence as string[]) || [],
          category: assessment.category as string | undefined,
          years_experience: assessment.years_experience as number | undefined,
        };
      }),
      total_skills: (summary.total_skills as number) || rawAssessments.length,
      avg_proficiency:
        rawAssessments.length > 0
          ? rawAssessments.reduce((sum: number, a) => {
              return (
                sum +
                ((a.proficiency_numeric ?? a.proficiency_level ?? a.proficiency ?? 0) as number)
              );
            }, 0) / rawAssessments.length
          : 0,
      processing_time: (summary.elapsed_seconds as number) || 0,
      model_used: (summary.model_used as string) || (summary.llm_model as string) || 'unknown',
      timestamp: new Date().toISOString(),
      total_tokens: (summary.total_tokens as number) || undefined,
      estimated_cost: (summary.estimated_cost as number) || undefined,
      failed_skills_count: (summary.failed_assessments as number) || undefined,
      requested_skills_count: (summary.total_skills as number) || undefined,
    };
  };

  const saveAssessmentToFile = async (
    transformedData: AssessmentResponse,
    rawResponseData: Record<string, unknown>
  ) => {
    // Don't save failed runs with no actual results
    if (!transformedData.assessments || transformedData.assessments.length === 0) {
      console.log('Skipping save: no assessment results');
      return;
    }

    try {
      const config = loadConfiguration();
      // Strip API key from saved config for security
      const safeConfig = config
        ? {
            llmConfig: {
              provider: config.llmConfig?.provider,
              model: config.llmConfig?.model,
              temperature: config.llmConfig?.temperature,
              max_tokens: config.llmConfig?.max_tokens,
            },
            proficiencyLevels: config.proficiencyLevels,
            promptTemplate: config.promptTemplate,
          }
        : undefined;

      // Get environment name for API-sourced skills
      let environmentName: string | null = null;
      if (skillsState.extractionSource === 'api') {
        try {
          const extractionData = JSON.parse(localStorage.getItem('skillsExtractionData') || '{}');
          environmentName = extractionData.environment_name || null;
        } catch {
          // ignore
        }
      }

      const result = await electronAPI.saveAssessmentResults({
        results: transformedData,
        summary: rawResponseData,
        source: {
          extractionSource: skillsState.extractionSource,
          filename: uploadedFile?.filename || null,
          environmentName,
          skillCount: skillsState.skills.length,
          extractedAt: skillsState.extractedAt,
        },
        config: safeConfig,
      });

      if (result.success) {
        console.log(`Assessment saved to: ${result.filePath}`);
        toast({ title: 'Assessment Saved', description: `Results saved to ${result.filename}` });
      } else {
        console.warn('Failed to save assessment file:', result.error);
        toast({
          title: 'Save Failed',
          description:
            'Could not save assessment to file. Results are available in the current session.',
          variant: 'destructive',
        });
      }
    } catch (e: unknown) {
      console.warn('Assessment file save failed', e);
      toast({
        title: 'Could not save assessment to file',
        description: 'Results are available in the current session but may not persist',
        variant: 'destructive',
      });
    }
  };

  // Handle streaming events
  useEffect(() => {
    if (!streamId) return;

    const clearStreamingTimeout = () => {
      if (streamingTimeoutRef.current) {
        clearTimeout(streamingTimeoutRef.current);
        streamingTimeoutRef.current = null;
      }
    };

    const timeoutMs = getStreamingTimeoutMs(skillsState.skills.length);
    const timeoutMinutes = Math.round(timeoutMs / 60000);
    const resetStreamingTimeout = () => {
      clearStreamingTimeout();
      streamingTimeoutRef.current = setTimeout(() => {
        console.warn(
          `[Assessment] Streaming timeout — no progress received in ${timeoutMinutes} minutes`
        );
        const hint =
          processedSkillsRef.current === 0
            ? 'No skills were processed — check that your API key is valid and the selected model is available.'
            : `Stalled after processing ${processedSkillsRef.current} skills — the LLM provider may be rate-limited or overloaded.`;
        const message = `Assessment timed out after ${timeoutMinutes} minutes. ${hint}`;
        setCurrentPhase('error');
        setError(message);
        setLoading(false);
        setStreamId(null);
        toast({
          title: 'Assessment timed out',
          description: hint,
          variant: 'destructive',
        });
      }, timeoutMs);
    };

    resetStreamingTimeout();

    const unsubscribe = electronAPI.onAssessmentEvent((event) => {
      if (event.streamId !== streamId) return;

      const data = event.data;
      switch (event.eventType) {
        case 'start':
          resetStreamingTimeout();
          setTotalChunks((data.total_chunks as number) || 0);
          setTotalSkills((data.total_skills as number) || skillsState.skills.length);
          break;

        case 'progress':
          resetStreamingTimeout();
          processedSkillsRef.current = (data.processed_skills as number) || 0;
          setProcessedSkills(processedSkillsRef.current);
          setCurrentChunk(
            (data.current_chunk as number) || (data.current_chunk_index as number) || 0
          );
          if (data.total_chunks) {
            setTotalChunks(data.total_chunks as number);
          }
          if (data.retry_count !== undefined) {
            setRetryCount(data.retry_count as number);
          }
          if (
            data.failed_skills &&
            Array.isArray(data.failed_skills) &&
            data.failed_skills.length > 0
          ) {
            setFailedSkills((prev) => [
              ...prev,
              ...(data.failed_skills as Array<Record<string, unknown> | string>).map((s) =>
                typeof s === 'object' && s !== null
                  ? ((s as Record<string, unknown>).name as string)
                  : String(s)
              ),
            ]);
          }
          break;

        case 'complete':
          clearStreamingTimeout();
          setCurrentPhase('analyzing');
          setTimeout(() => {
            const summary = (data.summary as Record<string, unknown>) || data;
            rawResponseRef.current = summary;
            const status = summary.status as string;

            // If all assessments failed, show error instead of empty results
            if (status === 'failed') {
              const errorMsg =
                (summary.last_error as string) ||
                `Assessment failed: ${summary.failed_assessments} of ${summary.total_skills} skills failed after ${summary.retry_count} retries`;
              setCurrentPhase('error');
              setError(errorMsg);
              setLoading(false);
              return;
            }

            const rawAssessments = (summary.assessments as unknown[]) || [];
            const totalTokens = summary.total_tokens as number | undefined;
            const estimatedCost = summary.estimated_cost as number | undefined;
            console.log(
              `Assessment complete: ${rawAssessments.length} results received` +
                (totalTokens != null ? ` | tokens: ${totalTokens}` : '') +
                (estimatedCost != null ? ` | cost: $${estimatedCost.toFixed(4)}` : '')
            );

            const transformedData = transformAssessmentResults(summary);
            setAssessmentResults(transformedData);
            setCurrentPhase('completed');
            markStepCompleted(4);
            markStepCompleted(5);
            setLoading(false);

            // Navigate to Review after a brief delay so the completion animation is visible
            setTimeout(() => setCurrentStep(5), 1500);

            // Warn about partial failures
            if (status === 'completed_with_errors' && summary.failed_assessments) {
              toast({
                title: 'Some skills failed',
                description: `${summary.failed_assessments} of ${summary.total_skills} skills could not be assessed`,
                variant: 'destructive',
              });
            }

            // Save to localStorage for Review & Export page
            localStorage.setItem('assessmentResults', JSON.stringify(transformedData));

            // Save to JSON file for persistent history
            saveAssessmentToFile(transformedData, summary);
          }, 500);
          break;

        case 'error': {
          clearStreamingTimeout();
          const errorMsg = (data.error as string) || 'Assessment failed';
          const isProviderError =
            /api.?key|unauthorized|invalid.?key|quota|rate.?limit|provider|model.?not.?found/i.test(
              errorMsg
            );
          if (isProviderError && !fallbackAttemptRef.current) {
            fallbackAttemptRef.current = true;
            const config = loadConfiguration();
            if (config) {
              const fallback = getFallbackProvider(config.llmConfig?.provider || 'google');
              if (fallback) {
                toast({
                  title: 'Provider error — retrying with fallback',
                  description: `Switching from ${config.llmConfig?.provider} to ${fallback.provider}`,
                  variant: 'default',
                });
                const fallbackConfig = {
                  ...config,
                  llmConfig: {
                    ...config.llmConfig,
                    provider: fallback.provider,
                    model: fallback.model,
                  },
                };
                localStorage.setItem(
                  'profstudio_proficiency_config',
                  JSON.stringify(fallbackConfig)
                );
                // Kick off a fresh attempt with the fallback config
                setStreamId(null);
                setTimeout(() => runAssessmentWithConfig(fallbackConfig), 500);
                break;
              }
            }
          }
          setCurrentPhase('error');
          setError(errorMsg);
          setLoading(false);
          break;
        }

        case 'cancelled':
          clearStreamingTimeout();
          setCurrentPhase('idle');
          setLoading(false);
          break;

        case 'done':
          clearStreamingTimeout();
          setStreamId(null);
          break;
      }
    });

    return () => {
      clearStreamingTimeout();
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamId]);

  /** Build extra few-shot lines from stored user feedback corrections */
  const buildFeedbackExamples = async (): Promise<string> => {
    try {
      if (!window.electron?.feedback) return '';
      const result = await window.electron.feedback.loadAll();
      if (!result.success || !result.feedback.length) return '';

      // Use the most recent correction per skill (take last entry in corrections[])
      const lines: string[] = [];
      for (const item of result.feedback) {
        const corrections = item.corrections;
        if (!corrections.length) continue;
        const latest = corrections[corrections.length - 1];
        if (latest.original_score === latest.corrected_score) continue; // no change
        const note = latest.note ? ` (${latest.note})` : '';
        lines.push(
          `- "${item.skill_name}" → Level ${latest.corrected_score}${note} [user-corrected from ${latest.original_score}]`
        );
      }

      if (!lines.length) return '';
      return `\nUSER-CORRECTED EXAMPLES — these override any other defaults:\n${lines.join('\n')}\n`;
    } catch {
      return '';
    }
  };

  const runAssessmentWithConfig = async (config: ReturnType<typeof loadConfiguration>) => {
    if (!config) return;

    try {
      setCurrentPhase('starting');
      setStartTime(new Date());
      setLoading(true);
      setError(null);
      setTotalSkills(skillsState.skills.length);
      setProcessedSkills(0);
      setCurrentChunk(0);
      setTotalChunks(0);
      setFailedSkills([]);
      setRetryCount(0);
      rawResponseRef.current = null;
      processedSkillsRef.current = 0;

      const cleanedSkills = skillsState.skills.map((skill) => ({
        name: skill.name,
      }));

      const cleanedProficiencyLevels = config.proficiencyLevels.map(
        ({
          color: _color,
          ...level
        }: {
          color?: string;
          level: number;
          name: string;
          description: string;
        }) => level
      );

      // Inject user feedback corrections into prompt template as extra few-shot examples
      const feedbackExamples = await buildFeedbackExamples();
      const promptTemplate = feedbackExamples
        ? config.promptTemplate.replace(/(Skills to assess:|JSON array:)/i, feedbackExamples + '$1')
        : config.promptTemplate;

      const payload = {
        skills: cleanedSkills,
        llm_config: config.llmConfig,
        prompt_template: promptTemplate,
        proficiency_levels: cleanedProficiencyLevels,
        chunk_size: getEffectiveChunkSize(),
      };

      const { streamId: newStreamId } = await electronAPI.streamAssessment(payload);
      setStreamId(newStreamId);
      setCurrentPhase('processing');
    } catch (err: unknown) {
      console.error('Assessment Failed', err);
      setCurrentPhase('error');
      const message = err instanceof Error ? err.message : 'Failed to start assessment';
      setError(message);
      setLoading(false);
    }
  };

  const runAssessment = async () => {
    fallbackAttemptRef.current = false;
    const config = loadConfiguration();
    await runAssessmentWithConfig(config);
  };

  const cancelAssessment = async () => {
    if (streamId) {
      await electronAPI.cancelAssessment(streamId);
      setStreamId(null);
      setCurrentPhase('idle');
      setLoading(false);
      toast({ title: 'Assessment cancelled' });
    }
  };

  const resetToIdle = useCallback(() => {
    localStorage.removeItem('assessmentResults');
    setAssessmentResults(null);
    setCurrentPhase('idle');
  }, []);

  const loadPastAssessment = useCallback((results: AssessmentResponse) => {
    setAssessmentResults(results);
    setCurrentPhase('completed');
  }, []);

  return {
    currentPhase,
    assessmentResults,
    loadPastAssessment,
    processedSkills,
    totalSkills,
    elapsedTime,
    currentChunk,
    totalChunks,
    failedSkills,
    retryCount,

    batchSettings: { batchingEnabled, batchMode, autoBatchCount, manualChunkSize },
    showBatchSettings,
    setBatchingEnabled,
    setBatchMode,
    setAutoBatchCount,
    setManualChunkSize,
    setShowBatchSettings,

    runAssessment,
    cancelAssessment,
    resetToIdle,
  };
}
