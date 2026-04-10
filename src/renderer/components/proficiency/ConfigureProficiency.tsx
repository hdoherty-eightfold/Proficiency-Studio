import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Settings,
  Edit3,
  RotateCcw,
  Sliders,
  Code,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  KeyRound,
  Library,
  Check,
} from 'lucide-react';
import { useAppStore } from '../../stores/app-store';
import { useToast } from '../../stores/toast-store';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
// import { api } from '../../services/api';
import {
  getDefaultPrompt,
  getPromptById,
  interpolateTemplate,
  CONFIDENCE_MODE_TO_TEMPLATE_ID,
  type ConfidenceMode,
} from '../../config/promptTemplates';
import { getDefaultModel } from '../../config/models';
import {
  DEFAULT_PROFICIENCY_LEVELS,
  ensureLevelsHaveColors,
  getColorForIndex,
  type ProficiencyLevel,
} from '../../config/proficiency';
import { APIKeyManager } from '../keys/APIKeyManager';
import { ConfigurationManager } from '../configuration/ConfigurationManager';
import type { PromptSnapshot } from '../configuration/ConfigurationManager';
// import Select from '../ui/Select';
// import { cn } from '../../lib/utils';

const HISTORY_KEY = 'profstudio_prompt_history';
const MAX_HISTORY = 20;

interface LLMConfig {
  provider: 'google' | 'kimi';
  model: string;
  temperature: number;
  max_tokens: number;
  api_key: string;
}

export default function ConfigureProficiency() {
  const { skillsState, nextStep, previousStep, setError, setCurrentStep, error } = useAppStore();
  const { toast } = useToast();

  // State
  const [proficiencyLevels, setProficiencyLevels] = useState<ProficiencyLevel[]>(
    DEFAULT_PROFICIENCY_LEVELS
  );
  const [llmConfig, setLLMConfig] = useState<LLMConfig>({
    provider: 'google',
    model: getDefaultModel('google'),
    temperature: 0.3,
    max_tokens: 8000,
    api_key: '',
  });

  const [selectedKeyId, setSelectedKeyId] = useState<string | undefined>(undefined);
  const [confidenceMode, setConfidenceMode] = useState<ConfidenceMode>('confidence');
  const [promptTemplate, setPromptTemplate] = useState<string>(getDefaultPrompt().template);
  const [promptPreview, setPromptPreview] = useState<string>('');
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [showConfigManager, setShowConfigManager] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveFlash, setAutoSaveFlash] = useState(false);
  const hasInitialized = useRef(false);

  // Collapse state for each section
  const [levelsCollapsed, setLevelsCollapsed] = useState(false);
  const [keysCollapsed, setKeysCollapsed] = useState(false);
  const [paramsCollapsed, setParamsCollapsed] = useState(false);
  const [promptCollapsed, setPromptCollapsed] = useState(false);

  // On mount: restore persisted config and redirect if skills are missing
  useEffect(() => {
    const saved = localStorage.getItem('profstudio_proficiency_config');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as {
          confidenceMode?: ConfidenceMode;
          promptTemplate?: string;
        };
        if (parsed.confidenceMode) setConfidenceMode(parsed.confidenceMode);
        if (parsed.promptTemplate) setPromptTemplate(parsed.promptTemplate);
      } catch {
        // ignore malformed data
      }
    }

    if (skillsState.skills.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Skills Required',
        description: 'Your session expired. Please re-import your skills to continue.',
      });
      setCurrentStep(2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mark initialized after first render (prevents auto-save on mount)
  useEffect(() => {
    hasInitialized.current = true;
  }, []);

  // Auto-save prompt to history after 1.5s of inactivity
  useEffect(() => {
    if (!hasInitialized.current) return;
    const timer = setTimeout(() => {
      if (!promptTemplate) return;
      try {
        const history: PromptSnapshot[] = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        // Don't save if identical to most recent
        if (history[0]?.promptTemplate === promptTemplate) return;
        const snapshot: PromptSnapshot = {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          promptTemplate,
        };
        const updated = [snapshot, ...history].slice(0, MAX_HISTORY);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
        setLastSaved(new Date());
        setAutoSaveFlash(true);
        setTimeout(() => setAutoSaveFlash(false), 2000);
      } catch {
        /* ignore */
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [promptTemplate]);

  // Generate preview
  useEffect(() => {
    const skillsText =
      skillsState.skills.length > 0
        ? skillsState.skills.map((s) => `- ${s.name}`).join('\n')
        : '(No skills loaded yet)';

    const levelsText = proficiencyLevels
      .map((level) => `- ${level.name} (${level.level}): ${level.description}`)
      .join('\n');

    const preview = interpolateTemplate(promptTemplate, {
      skills: skillsText,
      proficiency_levels: levelsText,
    });

    setPromptPreview(preview);
  }, [skillsState.skills, proficiencyLevels, promptTemplate]);

  // Handlers
  const handleKeySelect = (_provider: string, keyId: string) => {
    const savedKeys = localStorage.getItem('llm_api_keys');
    if (savedKeys) {
      const keys = JSON.parse(savedKeys);
      const found = keys.find(
        (k: { id: string; provider: string; model?: string; name: string; key: string }) =>
          k.id === keyId
      );
      if (found) {
        setSelectedKeyId(keyId);
        const updatedConfig: LLMConfig = {
          ...llmConfig,
          provider: found.provider,
          model: found.model || llmConfig.model,
          api_key: found.key,
        };
        setLLMConfig(updatedConfig);

        // Immediately persist so downstream pages see updated model
        localStorage.setItem(
          'profstudio_proficiency_config',
          JSON.stringify({
            proficiencyLevels,
            llmConfig: updatedConfig,
            promptTemplate,
            confidenceMode,
          })
        );

        toast({
          title: 'API Key Selected',
          description: `Using ${found.name}`,
          variant: 'success',
        });
      }
    }
  };

  // Determine which confidence mode a template id corresponds to (or null if custom)
  const getModeForTemplateId = (id: string): ConfidenceMode | null => {
    for (const [mode, tplId] of Object.entries(CONFIDENCE_MODE_TO_TEMPLATE_ID)) {
      if (tplId === id) return mode as ConfidenceMode;
    }
    return null;
  };

  const handleConfidenceModeChange = (mode: ConfidenceMode) => {
    setConfidenceMode(mode);
    const tpl = getPromptById(CONFIDENCE_MODE_TO_TEMPLATE_ID[mode]);
    if (tpl) setPromptTemplate(tpl.template);
  };

  const loadConfiguration = (config: {
    proficiency_levels?: ProficiencyLevel[];
    proficiencyLevels?: ProficiencyLevel[];
    llm_config?: { provider?: string; model?: string; temperature?: number; max_tokens?: number };
    llmConfig?: { provider?: string; model?: string; temperature?: number; max_tokens?: number };
    prompt_template?: string;
    promptTemplate?: string;
    confidenceMode?: ConfidenceMode;
  }) => {
    const levels = config.proficiency_levels || config.proficiencyLevels || [];
    const levelsWithColors = ensureLevelsHaveColors(levels);
    setProficiencyLevels(levelsWithColors);
    // Don't overwrite API key when loading config usually
    setLLMConfig((prev) => ({
      ...prev,
      provider: (config.llm_config?.provider ||
        config.llmConfig?.provider ||
        prev.provider) as LLMConfig['provider'],
      model: config.llm_config?.model || config.llmConfig?.model || prev.model,
      temperature:
        config.llm_config?.temperature ?? config.llmConfig?.temperature ?? prev.temperature,
      max_tokens: config.llm_config?.max_tokens ?? config.llmConfig?.max_tokens ?? prev.max_tokens,
    }));
    const loadedTemplate = config.prompt_template || config.promptTemplate || promptTemplate;
    setPromptTemplate(loadedTemplate);
    if (config.confidenceMode) {
      setConfidenceMode(config.confidenceMode);
    } else {
      // Infer mode from the loaded template id if possible
      for (const tpl of ['basic', 'simple', 'detailed'] as const) {
        // We don't have the id here, so attempt to match by content
        const knownTpl = getPromptById(tpl);
        if (knownTpl && loadedTemplate === knownTpl.template) {
          const mode = getModeForTemplateId(tpl);
          if (mode) {
            setConfidenceMode(mode);
            break;
          }
        }
      }
    }
  };

  const handleContinue = () => {
    if (!llmConfig.api_key) {
      setError('Please configure an API key first');
      toast({
        variant: 'destructive',
        title: 'API Key Required',
        description: 'Please select an API key before proceeding',
      });
      return;
    }

    if (skillsState.skills.length === 0) {
      setError('No skills found');
      toast({
        variant: 'destructive',
        title: 'Skills Required',
        description: 'Please import skills first (Step 2)',
      });
      return;
    }

    // Save config for next steps
    localStorage.setItem(
      'profstudio_proficiency_config',
      JSON.stringify({
        proficiencyLevels,
        llmConfig,
        promptTemplate,
        confidenceMode,
      })
    );

    toast({
      title: 'Configuration Saved',
      description: 'Proceeding to assessment...',
      variant: 'success',
    });

    nextStep();
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };
  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

  return (
    <motion.div className="p-6 space-y-6" variants={stagger} initial="hidden" animate="show">
      <Card className="border-none shadow-none bg-transparent">
        <motion.div variants={fadeUp} className="mb-4">
          <Button variant="back-nav" size="sm" onClick={previousStep} className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
        </motion.div>
        <motion.div variants={fadeUp} className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Settings className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Configure Proficiency Assessment
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Set up proficiency levels, choose your LLM provider, and customize assessment prompts
          </p>
        </motion.div>

        {/* Configuration Actions */}
        <motion.div variants={fadeUp} className="flex justify-end items-center gap-3 mb-6">
          {lastSaved && (
            <span
              className={`text-xs transition-all duration-500 flex items-center gap-1.5 ${
                autoSaveFlash ? 'text-green-500' : 'text-muted-foreground/60'
              }`}
            >
              {autoSaveFlash ? (
                <Check className="w-3 h-3" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
              )}
              {autoSaveFlash
                ? 'Auto-saved'
                : `Saved ${Math.round((Date.now() - lastSaved.getTime()) / 60000) || '<1'}m ago`}
            </span>
          )}
          <Button variant="outline" className="gap-2" onClick={() => setShowConfigManager(true)}>
            <Library className="w-4 h-4" />
            Template Library
          </Button>
        </motion.div>

        {/* Main Grid */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Left Column: Proficiency Levels + API Keys */}
          <div className="space-y-4">
            {/* Proficiency Levels */}
            <Card
              variant="glass"
              className="bg-blue-50/30 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800"
            >
              <CardContent className="p-0">
                <div
                  role="button"
                  tabIndex={0}
                  className="w-full flex justify-between items-center p-4 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors rounded-t-lg cursor-pointer"
                  onClick={() => setLevelsCollapsed((c) => !c)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setLevelsCollapsed((c) => !c);
                  }}
                  aria-expanded={!levelsCollapsed}
                >
                  <h3 className="font-semibold flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-blue-600" /> Proficiency Levels
                    <span className="text-xs text-muted-foreground font-normal ml-1">
                      ({proficiencyLevels.length} levels)
                    </span>
                  </h3>
                  <div className="flex items-center gap-2">
                    {!levelsCollapsed && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setProficiencyLevels(DEFAULT_PROFICIENCY_LEVELS);
                        }}
                        className="h-7 px-2"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
                      </Button>
                    )}
                    {levelsCollapsed ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
                {!levelsCollapsed && (
                  <div className="px-4 pb-4">
                    <div className="space-y-2">
                      {proficiencyLevels.map((level, idx) => (
                        <div
                          key={idx}
                          className="flex gap-3 items-start p-3 bg-background rounded-lg border border-border"
                        >
                          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0 text-sm">
                            {level.level}
                          </div>
                          <div className="flex-1 space-y-1 min-w-0">
                            <input
                              className="w-full font-semibold bg-transparent border-none p-0 focus:outline-none text-sm"
                              value={level.name}
                              onChange={(e) => {
                                const newLevels = [...proficiencyLevels];
                                newLevels[idx].name = e.target.value;
                                setProficiencyLevels(newLevels);
                              }}
                            />
                            <input
                              className="w-full text-xs text-muted-foreground bg-transparent border-none p-0 focus:outline-none"
                              value={level.description}
                              onChange={(e) => {
                                const newLevels = [...proficiencyLevels];
                                newLevels[idx].description = e.target.value;
                                setProficiencyLevels(newLevels);
                              }}
                            />
                          </div>
                          {proficiencyLevels.length > 2 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0 h-7 w-7 p-0"
                              aria-label={`Delete proficiency level ${level.name}`}
                              onClick={() => {
                                const newLevels = proficiencyLevels
                                  .filter((_, i) => i !== idx)
                                  .map((l, i) => ({ ...l, level: i + 1 }));
                                setProficiencyLevels(newLevels);
                              }}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3 w-full"
                      onClick={() => {
                        const newLevel: ProficiencyLevel = {
                          level: proficiencyLevels.length + 1,
                          name: `Level ${proficiencyLevels.length + 1}`,
                          description: 'Enter description...',
                          color: getColorForIndex(proficiencyLevels.length),
                        };
                        setProficiencyLevels([...proficiencyLevels, newLevel]);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" /> Add Level
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* API Key Manager — wrapped in collapsible */}
            <Card variant="glass" className="border-border overflow-hidden">
              <CardContent className="p-0">
                <button
                  className="w-full flex justify-between items-center p-4 hover:bg-muted/30 transition-colors"
                  onClick={() => setKeysCollapsed((c) => !c)}
                  aria-expanded={!keysCollapsed}
                >
                  <h3 className="font-semibold flex items-center gap-2">
                    <KeyRound className="w-5 h-5 text-emerald-600" /> LLM API Keys
                  </h3>
                  {keysCollapsed ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                {!keysCollapsed && (
                  <div className="px-4 pb-4">
                    <APIKeyManager
                      onKeySelect={handleKeySelect}
                      selectedProvider={llmConfig.provider}
                      selectedKeyId={selectedKeyId}
                      embedded
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Prompt Template + LLM Parameters */}
          <div className="space-y-4">
            {/* Prompt Template */}
            <Card
              variant="glass"
              className="bg-orange-50/30 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800"
            >
              <CardContent className="p-0">
                <div
                  role="button"
                  tabIndex={0}
                  className="w-full flex justify-between items-center p-4 hover:bg-orange-50/50 dark:hover:bg-orange-900/20 transition-colors rounded-t-lg cursor-pointer"
                  onClick={() => setPromptCollapsed((c) => !c)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setPromptCollapsed((c) => !c);
                  }}
                  aria-expanded={!promptCollapsed}
                >
                  <h3 className="font-semibold flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-orange-600" /> Prompt Template
                  </h3>
                  <div className="flex items-center gap-2">
                    {!promptCollapsed && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPromptEditor(!showPromptEditor);
                        }}
                        className="h-7 px-2"
                      >
                        <Code className="w-3.5 h-3.5 mr-1" /> {showPromptEditor ? 'Hide' : 'Edit'}
                      </Button>
                    )}
                    {promptCollapsed ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
                {!promptCollapsed && (
                  <div className="px-4 pb-4 space-y-4">
                    {/* Confidence Mode Selector */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        What should the AI return per skill?
                      </p>
                      <div
                        className="grid grid-cols-3 gap-2"
                        role="radiogroup"
                        aria-label="Confidence mode"
                      >
                        {(
                          [
                            {
                              mode: 'basic' as ConfidenceMode,
                              label: 'Basic',
                              desc: 'Proficiency level only. Fastest.',
                            },
                            {
                              mode: 'confidence' as ConfidenceMode,
                              label: 'Confidence',
                              desc: 'Level + confidence score (0–100%).',
                            },
                            {
                              mode: 'full' as ConfidenceMode,
                              label: 'Full Detail',
                              desc: 'Level + confidence + reasoning.',
                            },
                          ] as const
                        ).map(({ mode, label, desc }) => (
                          <button
                            key={mode}
                            role="radio"
                            aria-label={label}
                            aria-checked={confidenceMode === mode}
                            onClick={() => handleConfidenceModeChange(mode)}
                            className={`flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                              confidenceMode === mode
                                ? 'bg-orange-600 border-orange-600 text-white'
                                : 'bg-background border-border hover:bg-muted/60'
                            }`}
                          >
                            <span className="text-sm font-semibold leading-none">{label}</span>
                            <span
                              className={`text-xs leading-snug mt-1 ${confidenceMode === mode ? 'text-orange-100' : 'text-muted-foreground'}`}
                            >
                              {desc}
                            </span>
                          </button>
                        ))}
                      </div>

                      {/* Confidence explanation callout */}
                      {confidenceMode !== 'basic' && (
                        <div className="mt-2 flex gap-2 p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200">
                          <span className="shrink-0 font-bold">ℹ</span>
                          <span>
                            <strong>What is confidence?</strong> The AI rates its own certainty from
                            0–100% for each proficiency level it assigns. High (≥80%) means strong
                            evidence; Low (&lt;60%) suggests that skill may need manual review.
                            {confidenceMode === 'full' &&
                              ' Reasoning explains exactly why each level was chosen.'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Prompt editor + preview */}
                    {showPromptEditor && (
                      <div className="relative">
                        <textarea
                          className="w-full h-48 p-4 font-mono text-xs border rounded-lg bg-background resize-none"
                          value={promptTemplate}
                          onChange={(e) => setPromptTemplate(e.target.value)}
                        />
                        {autoSaveFlash && (
                          <span className="absolute bottom-2 right-2 text-xs text-green-500 flex items-center gap-1 bg-background/80 px-1.5 py-0.5 rounded">
                            <Check className="w-3 h-3" /> saved
                          </span>
                        )}
                      </div>
                    )}
                    <div className="bg-muted p-4 rounded-lg border border-border">
                      <div className="text-xs font-semibold text-muted-foreground mb-2">
                        LIVE PREVIEW
                      </div>
                      <pre className="text-xs whitespace-pre-wrap font-mono text-foreground opacity-80 max-h-[400px] overflow-y-auto">
                        {promptPreview}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* LLM Parameters */}
            <Card
              variant="glass"
              className="bg-purple-50/30 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800"
            >
              <CardContent className="p-0">
                <button
                  className="w-full flex justify-between items-center p-4 hover:bg-purple-50/50 dark:hover:bg-purple-900/20 transition-colors rounded-t-lg"
                  onClick={() => setParamsCollapsed((c) => !c)}
                  aria-expanded={!paramsCollapsed}
                >
                  <h3 className="font-semibold flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-purple-600" /> LLM Parameters
                    {paramsCollapsed && (
                      <span className="text-xs text-muted-foreground font-normal ml-1">
                        temp {llmConfig.temperature.toFixed(2)} ·{' '}
                        {llmConfig.max_tokens >= 1000
                          ? `${llmConfig.max_tokens / 1000}K`
                          : llmConfig.max_tokens}{' '}
                        tokens
                      </span>
                    )}
                  </h3>
                  {paramsCollapsed ? (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                {!paramsCollapsed && (
                  <div className="px-4 pb-4 space-y-4">
                    {/* Temperature */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-sm font-medium" htmlFor="temperature-slider">
                          Temperature
                        </label>
                        <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
                          {llmConfig.temperature.toFixed(2)}
                        </span>
                      </div>
                      <input
                        id="temperature-slider"
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={llmConfig.temperature}
                        onChange={(e) =>
                          setLLMConfig((prev) => ({ ...prev, temperature: Number(e.target.value) }))
                        }
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-purple-600"
                        aria-label="Temperature"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>0.0 (precise)</span>
                        <span>1.0 (creative)</span>
                      </div>
                    </div>
                    {/* Max Tokens */}
                    <div>
                      <label className="text-sm font-medium block mb-2" htmlFor="max-tokens-select">
                        Max Tokens
                      </label>
                      <div className="flex gap-2 flex-wrap">
                        {[2000, 4000, 8000, 16000, 32000].map((tokens) => (
                          <button
                            key={tokens}
                            onClick={() =>
                              setLLMConfig((prev) => ({ ...prev, max_tokens: tokens }))
                            }
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              llmConfig.max_tokens === tokens
                                ? 'bg-purple-600 text-white'
                                : 'bg-muted hover:bg-muted/80'
                            }`}
                            aria-pressed={llmConfig.max_tokens === tokens}
                          >
                            {tokens >= 1000 ? `${tokens / 1000}K` : tokens}
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Higher values allow longer responses but cost more.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Error display */}
        {error && (
          <motion.div
            variants={fadeUp}
            role="alert"
            aria-live="polite"
            className="mt-8 p-3 bg-destructive/10 border border-destructive/30 rounded-lg"
          >
            <p className="text-sm text-destructive">{error}</p>
          </motion.div>
        )}

        {/* Footer Actions */}
        <motion.div variants={fadeUp} className="mt-6 flex justify-end gap-4 border-t pt-6">
          <Button variant="back-nav" size="lg" onClick={() => setCurrentStep(2)}>
            Back
          </Button>
          <Button size="lg" onClick={handleContinue} className="px-8">
            Continue to Assessment
          </Button>
        </motion.div>

        {/* Template Library Modal */}
        {showConfigManager && (
          <ConfigurationManager
            currentConfig={{ proficiencyLevels, llmConfig, promptTemplate }}
            onLoad={loadConfiguration}
            onClose={() => setShowConfigManager(false)}
          />
        )}
      </Card>
    </motion.div>
  );
}
