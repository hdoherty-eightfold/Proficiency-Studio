/**
 * Assessment Config - Idle phase UI for RunAssessment
 * Shows data source info, batch settings, and start button
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Play,
  FileSpreadsheet,
  Cloud,
  Server,
  Clock,
  Database,
  Layers,
  Cpu,
  History,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '../../stores/app-store';
import { Button } from '../ui/button';
import { PROVIDERS } from '../../config/models';
import { electronAPI } from '../../services/electron-api';
import { getProficiencyBadgeClasses } from '../../config/proficiency';
import type { AssessmentResponse } from './assessment-types';

interface RecentAssessment {
  filename: string;
  saved_at: string;
  total_skills: number;
  avg_proficiency: number;
  model_used: string;
  processing_time: number;
  total_tokens: number;
  estimated_cost: number;
}

interface BatchSettings {
  batchingEnabled: boolean;
  batchMode: 'auto' | 'manual';
  autoBatchCount: number;
  manualChunkSize: number;
}

interface AssessmentConfigProps {
  batchSettings: BatchSettings;
  showBatchSettings: boolean;
  onSetBatchingEnabled: (enabled: boolean) => void;
  onSetBatchMode: (mode: 'auto' | 'manual') => void;
  onSetAutoBatchCount: (count: number) => void;
  onSetManualChunkSize: (size: number) => void;
  onToggleBatchSettings: () => void;
  onStart: () => void;
  onBackToConfig: () => void;
  onLoadPastAssessment?: (results: AssessmentResponse) => void;
  isRunning?: boolean;
}

export function AssessmentConfig({
  batchSettings,
  showBatchSettings,
  onSetBatchingEnabled,
  onSetBatchMode,
  onSetAutoBatchCount,
  onSetManualChunkSize,
  onToggleBatchSettings,
  onStart,
  onBackToConfig,
  onLoadPastAssessment,
  isRunning = false,
}: AssessmentConfigProps) {
  const { skillsState, uploadedFile } = useAppStore();
  const { batchingEnabled, batchMode, autoBatchCount, manualChunkSize } = batchSettings;

  // Load LLM config from saved proficiency config - reactive to changes
  const readLLMConfig = useCallback(() => {
    try {
      const stored = localStorage.getItem('profstudio_proficiency_config');
      if (stored) {
        const config = JSON.parse(stored);
        return config.llmConfig as { provider: string; model: string } | undefined;
      }
    } catch {
      /* ignore */
    }
    return undefined;
  }, []);

  const [llmConfig, setLlmConfig] = useState(readLLMConfig);

  // Re-read config when component mounts or becomes visible (e.g. navigating back)
  useEffect(() => {
    setLlmConfig(readLLMConfig());
  }, [readLLMConfig]);

  // Listen for storage changes (from other components updating the config)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'profstudio_proficiency_config') {
        setLlmConfig(readLLMConfig());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [readLLMConfig]);

  // Recent assessments
  const [recentAssessments, setRecentAssessments] = useState<RecentAssessment[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [loadingFilename, setLoadingFilename] = useState<string | null>(null);

  useEffect(() => {
    if (isRunning) return;
    setLoadingRecent(true);
    electronAPI
      .listSavedAssessments()
      .then((res) => {
        if (res.success) setRecentAssessments(res.assessments.slice(0, 5));
      })
      .catch(() => {
        /* silently ignore */
      })
      .finally(() => setLoadingRecent(false));
  }, [isRunning]);

  const handleLoadPast = useCallback(
    async (filename: string) => {
      if (!onLoadPastAssessment) return;
      setLoadingFilename(filename);
      try {
        const res = await electronAPI.loadSavedAssessment(filename);
        if (res.success && res.data) {
          const data = res.data as { results: AssessmentResponse; saved_at: string };
          onLoadPastAssessment({
            ...data.results,
            timestamp: data.saved_at ?? data.results.timestamp,
          });
        }
      } finally {
        setLoadingFilename(null);
      }
    },
    [onLoadPastAssessment]
  );

  return (
    <div
      className={`max-w-xl mx-auto text-center ${isRunning ? 'opacity-60 pointer-events-none' : ''}`}
    >
      {/* Data Source Card */}
      <div className="bg-muted/50 p-6 rounded-xl mb-6 border border-border">
        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
          <div
            className={`p-2 rounded-lg ${
              skillsState.extractionSource === 'csv'
                ? 'bg-green-100 dark:bg-green-900/30'
                : skillsState.extractionSource === 'api'
                  ? 'bg-blue-100 dark:bg-blue-900/30'
                  : skillsState.extractionSource === 'sftp'
                    ? 'bg-purple-100 dark:bg-purple-900/30'
                    : 'bg-muted'
            }`}
          >
            {skillsState.extractionSource === 'csv' ? (
              <FileSpreadsheet className="w-5 h-5 text-green-600 dark:text-green-400" />
            ) : skillsState.extractionSource === 'api' ? (
              <Cloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            ) : skillsState.extractionSource === 'sftp' ? (
              <Server className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            ) : (
              <Database className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div className="text-left flex-1">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Data Source</div>
            <div className="font-semibold">
              {skillsState.extractionSource === 'csv'
                ? 'CSV File'
                : skillsState.extractionSource === 'api'
                  ? 'Eightfold API'
                  : skillsState.extractionSource === 'sftp'
                    ? 'SFTP Server'
                    : 'Unknown Source'}
            </div>
            {uploadedFile?.filename && skillsState.extractionSource === 'csv' && (
              <div
                className="text-sm text-muted-foreground truncate max-w-[280px]"
                title={uploadedFile.filename}
              >
                {uploadedFile.filename}
              </div>
            )}
          </div>
          {skillsState.extractedAt && (
            <div className="text-right text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Extracted</span>
              </div>
              <div>{new Date(skillsState.extractedAt).toLocaleDateString()}</div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Skills to Assess</span>
            <span className="font-bold text-lg">{skillsState.skills.length}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Estimated Time</span>
            <span className="font-bold text-lg">
              ~{Math.ceil(skillsState.skills.length * 1.5)} sec
            </span>
          </div>

          {/* LLM Provider */}
          {llmConfig && (
            <div className="flex justify-between items-center pt-3 border-t border-border">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">LLM Provider</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">{PROVIDERS[llmConfig.provider]?.icon}</span>
                <div className="text-right">
                  <div className="font-bold text-sm">
                    {PROVIDERS[llmConfig.provider]?.name || llmConfig.provider}
                  </div>
                  <div className="text-xs text-muted-foreground">{llmConfig.model}</div>
                </div>
              </div>
            </div>
          )}

          {/* Batching Control */}
          <div className="flex justify-between items-center pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Batching</span>
              <button
                onClick={onToggleBatchSettings}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showBatchSettings ? 'Hide' : 'Configure'}
              </button>
            </div>
            <span className="font-bold text-lg">
              {!batchingEnabled
                ? 'Off'
                : batchMode === 'auto'
                  ? `${autoBatchCount} batches`
                  : `${manualChunkSize} per batch`}
            </span>
          </div>

          {showBatchSettings && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-4 mt-2">
              {/* Batching Toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Enable Batching</span>
                <button
                  onClick={() => onSetBatchingEnabled(!batchingEnabled)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    batchingEnabled ? 'bg-blue-600' : 'bg-gray-400 dark:bg-gray-600'
                  }`}
                  role="switch"
                  aria-checked={batchingEnabled}
                  aria-label="Enable batching"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      batchingEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {batchingEnabled && (
                <>
                  {/* Auto/Manual Mode */}
                  <div className="space-y-2">
                    <span className="text-sm font-medium">Mode</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onSetBatchMode('auto')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          batchMode === 'auto'
                            ? 'bg-blue-600 text-white'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        Auto
                      </button>
                      <button
                        onClick={() => onSetBatchMode('manual')}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                          batchMode === 'manual'
                            ? 'bg-blue-600 text-white'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        Manual
                      </button>
                    </div>
                  </div>

                  {batchMode === 'auto' ? (
                    <div className="space-y-2">
                      <span className="text-sm font-medium">Number of Batches</span>
                      <div className="flex gap-2">
                        {[2, 3, 4, 5].map((count) => (
                          <button
                            key={count}
                            onClick={() => onSetAutoBatchCount(count)}
                            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                              autoBatchCount === count
                                ? 'bg-blue-600 text-white'
                                : 'bg-muted hover:bg-muted/80'
                            }`}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ~{Math.ceil(skillsState.skills.length / autoBatchCount)} skills per batch
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <span className="text-sm font-medium">
                        Skills per Batch: {manualChunkSize}
                      </span>
                      <input
                        type="range"
                        min={5}
                        max={50}
                        value={manualChunkSize}
                        onChange={(e) => onSetManualChunkSize(Number(e.target.value))}
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>5 (more updates)</span>
                        <span>50 (faster)</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              <p className="text-xs text-muted-foreground border-t border-border pt-3">
                {!batchingEnabled
                  ? 'All skills will be processed in a single request.'
                  : 'Batching splits skills into groups for better progress tracking and error recovery.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Assessments */}
      {!isRunning && onLoadPastAssessment && (recentAssessments.length > 0 || loadingRecent) && (
        <div className="mb-6 text-left">
          <div className="flex items-center gap-2 mb-3">
            <History className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Recent Assessments
            </span>
          </div>
          <div className="space-y-2">
            {loadingRecent ? (
              <div className="text-xs text-muted-foreground px-2">Loading...</div>
            ) : (
              recentAssessments.map((run) => (
                <button
                  key={run.filename}
                  onClick={() => handleLoadPast(run.filename)}
                  disabled={loadingFilename === run.filename}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/60 transition-colors text-left disabled:opacity-60"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium">
                        {new Date(run.saved_at).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {run.total_skills} skills
                      </span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${getProficiencyBadgeClasses(Math.round(run.avg_proficiency))}`}
                      >
                        avg {run.avg_proficiency.toFixed(1)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {run.model_used.split('/').pop() ?? run.model_used} ·{' '}
                      {run.processing_time.toFixed(1)}s
                      {run.estimated_cost > 0 && ` · $${run.estimated_cost.toFixed(4)}`}
                    </div>
                  </div>
                  {loadingFilename === run.filename ? (
                    <span className="text-xs text-muted-foreground">Loading…</span>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Warning if no skills */}
      {skillsState.skills.length === 0 && (
        <div className="mb-6 p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 text-sm">
          No skills to assess. Please go back to the Extract Skills step first.
        </div>
      )}

      {!isRunning && (
        <div className="flex justify-center gap-4">
          <Button variant="outline" size="lg" onClick={onBackToConfig}>
            Back to Config
          </Button>
          <Button
            size="lg"
            onClick={onStart}
            className="px-8 min-w-[200px]"
            disabled={skillsState.skills.length === 0}
          >
            <Play className="w-4 h-4 mr-2 fill-current" /> Start Assessment
          </Button>
        </div>
      )}
    </div>
  );
}
