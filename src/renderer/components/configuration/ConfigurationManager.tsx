import React, { useState, useEffect } from 'react';
import {
    Star, X
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { cn } from '../../lib/utils';
import { useToast } from '../../stores/toast-store';
import { api } from '../../services/api';
import {
    DEFAULT_PROFICIENCY_LEVELS,
    ensureLevelsHaveColors,
    type ProficiencyLevel
} from '../../config/proficiency';

interface LLMConfig {
    provider: string;
    model: string;
    temperature: number;
    max_tokens: number;
    api_key: string;
}

interface ConfigurationItem {
    id: string;
    name: string;
    description?: string;
    proficiency_levels: ProficiencyLevel[];
    llm_config: Omit<LLMConfig, 'api_key'>;
    prompt_template: string;
    created_at: string;
    updated_at: string;
    is_default?: boolean;
}

interface ConfigurationManagerProps {
    currentConfig: {
        proficiencyLevels: ProficiencyLevel[];
        llmConfig: LLMConfig;
        promptTemplate: string;
    };
    onLoad: (config: ConfigurationItem) => void;
    onClose: () => void;
    initialTab?: 'save' | 'load';
    initialName?: string;
}

export const ConfigurationManager: React.FC<ConfigurationManagerProps> = ({
    currentConfig,
    onLoad,
    onClose,
    initialTab = 'load',
    initialName = ''
}) => {
    const { toast } = useToast();

    const [activeTab, setActiveTab] = useState<'save' | 'load'>(initialTab);
    const [configurations, setConfigurations] = useState<ConfigurationItem[]>([]);
    const [newConfigName, setNewConfigName] = useState(initialName);
    const [newConfigDescription, setNewConfigDescription] = useState('');

    // Load configuration logic adapted for generic API
    const loadConfigurations = async () => {
        try {
            const response = await api.get<ConfigurationItem[]>('/api/configurations/');
            if (response && Array.isArray(response)) {
                setConfigurations(response);
            }
        } catch (err) {
            console.error('Error loading configurations:', err);
            // Fallback defaults if API fails
            setConfigurations([
                {
                    id: 'default-5-level',
                    name: 'Standard 5-Level Assessment',
                    description: 'Industry-standard 5-level proficiency scale',
                    proficiency_levels: DEFAULT_PROFICIENCY_LEVELS,
                    llm_config: {
                        provider: 'google',
                        model: 'gemini-3.1-flash-lite-preview',
                        temperature: 0.7,
                        max_tokens: 2000
                    },
                    prompt_template: "Default prompt...",
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    is_default: true
                }
            ]);
        }
    };

    useEffect(() => {
        loadConfigurations();
    }, []);

    const saveCurrentConfiguration = async () => {
        // Ensure all proficiency levels have a color
        const proficiencyLevelsWithColors = ensureLevelsHaveColors(currentConfig.proficiencyLevels);

        const configData = {
            name: newConfigName,
            description: newConfigDescription || '',
            proficiency_levels: proficiencyLevelsWithColors,
            llm_config: {
                provider: currentConfig.llmConfig.provider,
                model: currentConfig.llmConfig.model,
                temperature: currentConfig.llmConfig.temperature,
                max_tokens: currentConfig.llmConfig.max_tokens
            },
            prompt_template: currentConfig.promptTemplate,
            author: 'User'
        };

        try {
            await api.post('/api/configurations/', configData);
            toast({ title: 'Configuration Saved', description: newConfigName });
            loadConfigurations();
            setActiveTab('load');
        } catch (e: unknown) {
            toast({ variant: 'destructive', title: 'Save Failed', description: e instanceof Error ? e.message : 'Unknown error' });
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="config-manager-title">
            <Card className="max-w-4xl w-full max-h-[90vh] overflow-hidden bg-background">
                <div className="border-b border-border p-6 flex justify-between items-center">
                    <h3 id="config-manager-title" className="text-xl font-bold">Configuration Manager</h3>
                    <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close configuration manager"><X className="w-5 h-5" /></Button>
                </div>

                <div className="flex border-b border-border">
                    <button
                        className={cn("px-6 py-3 font-medium border-b-2", activeTab === 'load' ? "border-primary text-primary" : "border-transparent")}
                        onClick={() => setActiveTab('load')}
                    >
                        Load
                    </button>
                    <button
                        className={cn("px-6 py-3 font-medium border-b-2", activeTab === 'save' ? "border-primary text-primary" : "border-transparent")}
                        onClick={() => setActiveTab('save')}
                    >
                        Save
                    </button>
                </div>

                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {activeTab === 'load' && (
                        <div className="grid grid-cols-1 gap-4">
                            {configurations.map(config => (
                                <Card key={config.id} className="p-4 cursor-pointer hover:border-primary" onClick={() => { onLoad(config); onClose(); }}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-bold flex items-center gap-2">
                                                {config.name}
                                                {config.is_default && <Star className="w-4 h-4 text-yellow-500 fill-current" />}
                                            </h4>
                                            <p className="text-sm text-muted-foreground">{config.description}</p>
                                        </div>
                                        <Button size="sm" variant="outline">Load</Button>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}

                    {activeTab === 'save' && (
                        <div className="space-y-4 max-w-lg mx-auto">
                            <div>
                                <label className="block text-sm font-medium mb-1">Name</label>
                                <input
                                    className="w-full p-2 border rounded bg-background"
                                    value={newConfigName}
                                    onChange={(e) => setNewConfigName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    className="w-full p-2 border rounded bg-background"
                                    value={newConfigDescription}
                                    onChange={(e) => setNewConfigDescription(e.target.value)}
                                />
                            </div>
                            <Button className="w-full" onClick={saveCurrentConfiguration}>Save Configuration</Button>
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};
