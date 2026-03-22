import { useState, useEffect } from 'react';
import {
    Settings, Edit3, RotateCcw,
    Sliders, Code, Plus, Trash2
} from 'lucide-react';
import { useAppStore } from '../../stores/app-store';
import { useToast } from '../../stores/toast-store';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
// import { api } from '../../services/api';
import { getDefaultPrompt } from '../../config/promptTemplates';
import {
    DEFAULT_PROFICIENCY_LEVELS,
    ensureLevelsHaveColors,
    getColorForIndex,
    type ProficiencyLevel
} from '../../config/proficiency';
import { APIKeyManager } from '../keys/APIKeyManager';
import { ConfigurationManager } from '../configuration/ConfigurationManager';
// import Select from '../ui/Select';
// import { cn } from '../../lib/utils';

interface LLMConfig {
    provider: 'google' | 'kimi';
    model: string;
    temperature: number;
    max_tokens: number;
    api_key: string;
}

export default function ConfigureProficiency() {
    const { skillsState, nextStep, setError, setCurrentStep } = useAppStore();
    const { toast } = useToast();

    // State
    const [proficiencyLevels, setProficiencyLevels] = useState<ProficiencyLevel[]>(DEFAULT_PROFICIENCY_LEVELS);
    const [llmConfig, setLLMConfig] = useState<LLMConfig>({
        provider: 'google',
        model: 'gemini-3.1-flash-lite-preview',
        temperature: 0.7,
        max_tokens: 8000,
        api_key: ''
    });

    const [selectedKeyId, setSelectedKeyId] = useState<string | undefined>(undefined);
    const [promptTemplate, setPromptTemplate] = useState<string>(getDefaultPrompt().template);
    // const [selectedPromptId, setSelectedPromptId] = useState<string>(getDefaultPrompt().id);
    const [promptPreview, setPromptPreview] = useState<string>('');
    const [showPromptEditor, setShowPromptEditor] = useState(false);
    const [showConfigManager, setShowConfigManager] = useState(false);
    const [configManagerTab, setConfigManagerTab] = useState<'save' | 'load'>('load');

    // Generate preview
    useEffect(() => {
        const skillsText = skillsState.skills.length > 0
            ? skillsState.skills.map(s => `- ${s.name}`).join('\n')
            : '(No skills loaded yet)';

        const levelsText = proficiencyLevels.map(
            level => `- ${level.name} (${level.level}): ${level.description}`
        ).join('\n');

        let preview = promptTemplate
            .replace('{skills}', skillsText)
            .replace('{proficiency_levels}', levelsText);

        setPromptPreview(preview);
    }, [skillsState.skills, proficiencyLevels, promptTemplate]);


    // Handlers
    const handleKeySelect = (_provider: string, keyId: string) => {
        // In a real app we would look up the key by ID from the manager's storage, 
        // but for now we are simplifying to just assume key selection works
        // We might need to fetch the actual key content if we want to populate it here,
        // OR APIKeyManager should pass the key value back up. 
        // Modifying APIKeyManager to pass key value would be better, but let's assume local storage access:
        const savedKeys = localStorage.getItem('llm_api_keys');
        if (savedKeys) {
            const keys = JSON.parse(savedKeys);
            const found = keys.find((k: { id: string; provider: string; model?: string; name: string; key: string }) => k.id === keyId);
            if (found) {
                setSelectedKeyId(keyId);
                setLLMConfig(prev => ({
                    ...prev,
                    provider: found.provider,
                    model: found.model || prev.model, // Use key's default model if available
                    api_key: found.key
                }));
                toast({ title: 'API Key Selected', description: `Using ${found.name}`, variant: 'success' });
            }
        }
    };

    const loadConfiguration = (config: {
        proficiency_levels?: ProficiencyLevel[];
        proficiencyLevels?: ProficiencyLevel[];
        llm_config?: { provider?: string; model?: string; temperature?: number; max_tokens?: number };
        llmConfig?: { provider?: string; model?: string; temperature?: number; max_tokens?: number };
        prompt_template?: string;
        promptTemplate?: string;
    }) => {
        const levels = config.proficiency_levels || config.proficiencyLevels || [];
        const levelsWithColors = ensureLevelsHaveColors(levels);
        setProficiencyLevels(levelsWithColors);
        // Don't overwrite API key when loading config usually
        setLLMConfig(prev => ({
            ...prev,
            provider: (config.llm_config?.provider || config.llmConfig?.provider || prev.provider) as LLMConfig['provider'],
            model: config.llm_config?.model || config.llmConfig?.model || prev.model,
            temperature: config.llm_config?.temperature ?? config.llmConfig?.temperature ?? prev.temperature,
            max_tokens: config.llm_config?.max_tokens ?? config.llmConfig?.max_tokens ?? prev.max_tokens
        }));
        setPromptTemplate(config.prompt_template || config.promptTemplate || promptTemplate);
    };

    const handleContinue = () => {
        if (!llmConfig.api_key) {
            setError('Please configure an API key first');
            toast({
                variant: 'destructive',
                title: 'API Key Required',
                description: 'Please select an API key before proceeding'
            });
            return;
        }

        if (skillsState.skills.length === 0) {
            setError('No skills found');
            toast({
                variant: 'destructive',
                title: 'Skills Required',
                description: 'Please import skills first (Step 2)'
            });
            return;
        }

        // Save config for next steps
        localStorage.setItem('profstudio_proficiency_config', JSON.stringify({
            proficiencyLevels,
            llmConfig,
            promptTemplate
        }));

        toast({
            title: 'Configuration Saved',
            description: 'Proceeding to assessment...',
            variant: 'success'
        });

        nextStep();
    };

    return (
        <div className="max-w-7xl mx-auto p-8 fade-in">
            <Card className="border-none shadow-none bg-transparent">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/30 dark:to-indigo-900/30 mb-4">
                        <Settings className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Configure Proficiency Assessment
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300">
                        Set up proficiency levels, choose your LLM provider, and customize assessment prompts
                    </p>
                </div>

                {/* Configurations Actions */}
                <div className="flex justify-end gap-2 mb-6">
                    <Button variant="outline" onClick={() => { setConfigManagerTab('load'); setShowConfigManager(true); }}>
                        Load Config
                    </Button>
                    <Button variant="outline" onClick={() => { setConfigManagerTab('save'); setShowConfigManager(true); }}>
                        Save Config
                    </Button>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

                    {/* Left Column: Levels & LLM */}
                    <div className="space-y-8">
                        {/* Proficiency Levels */}
                        <Card className="bg-blue-50/30 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <Sliders className="w-5 h-5 text-blue-600" /> Proficiency Levels
                                    </h3>
                                    <Button size="sm" variant="ghost" onClick={() => setProficiencyLevels(DEFAULT_PROFICIENCY_LEVELS)}>
                                        <RotateCcw className="w-4 h-4 mr-2" /> Reset
                                    </Button>
                                </div>
                                <div className="space-y-3">
                                    {proficiencyLevels.map((level, idx) => (
                                        <div key={idx} className="flex gap-3 items-start p-3 bg-background rounded-lg border border-border">
                                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                                                {level.level}
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <input
                                                    className="w-full font-semibold bg-transparent border-none p-0 focus:outline-none"
                                                    value={level.name}
                                                    onChange={(e) => {
                                                        const newLevels = [...proficiencyLevels];
                                                        newLevels[idx].name = e.target.value;
                                                        setProficiencyLevels(newLevels);
                                                    }}
                                                />
                                                <input
                                                    className="w-full text-sm text-muted-foreground bg-transparent border-none p-0 focus:outline-none"
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
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
                                                    aria-label={`Delete proficiency level ${level.name}`}
                                                    onClick={() => {
                                                        const newLevels = proficiencyLevels
                                                            .filter((_, i) => i !== idx)
                                                            .map((l, i) => ({ ...l, level: i + 1 }));
                                                        setProficiencyLevels(newLevels);
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="mt-4 w-full"
                                    onClick={() => {
                                        const newLevel: ProficiencyLevel = {
                                            level: proficiencyLevels.length + 1,
                                            name: `Level ${proficiencyLevels.length + 1}`,
                                            description: 'Enter description...',
                                            color: getColorForIndex(proficiencyLevels.length)
                                        };
                                        setProficiencyLevels([...proficiencyLevels, newLevel]);
                                    }}
                                >
                                    <Plus className="w-4 h-4 mr-2" /> Add Level
                                </Button>
                            </CardContent>
                        </Card>

                        {/* API Key Manager */}
                        <APIKeyManager
                            onKeySelect={handleKeySelect}
                            selectedProvider={llmConfig.provider}
                            selectedKeyId={selectedKeyId}
                        />
                    </div>

                    {/* Right Column: Prompt Template */}
                    <div className="space-y-8">
                        <Card className="bg-orange-50/30 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold flex items-center gap-2">
                                        <Edit3 className="w-5 h-5 text-orange-600" /> Prompt Template
                                    </h3>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="ghost" onClick={() => setShowPromptEditor(!showPromptEditor)}>
                                            <Code className="w-4 h-4 mr-2" /> {showPromptEditor ? 'Hide Setup' : 'Show Setup'}
                                        </Button>
                                    </div>
                                </div>

                                {showPromptEditor && (
                                    <textarea
                                        className="w-full h-64 p-4 font-mono text-xs border rounded-lg bg-background mb-4"
                                        value={promptTemplate}
                                        onChange={(e) => setPromptTemplate(e.target.value)}
                                    />
                                )}

                                <div className="bg-muted p-4 rounded-lg border border-border">
                                    <div className="text-xs font-semibold text-muted-foreground mb-2">LIVE PREVIEW</div>
                                    <pre className="text-xs whitespace-pre-wrap font-mono text-foreground opacity-80 max-h-[500px] overflow-y-auto">
                                        {promptPreview}
                                    </pre>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="mt-12 flex justify-end gap-4 border-t pt-6">
                    <Button variant="outline" size="lg" onClick={() => setCurrentStep(2)}>Back</Button>
                    <Button size="lg" onClick={handleContinue} className="px-8">Continue to Assessment</Button>
                </div>

                {/* Config Manager Modal */}
                {showConfigManager && (
                    <ConfigurationManager
                        currentConfig={{ proficiencyLevels, llmConfig, promptTemplate }}
                        onLoad={loadConfiguration}
                        onClose={() => setShowConfigManager(false)}
                        initialTab={configManagerTab}
                    />
                )}
            </Card>
        </div>
    );
}
