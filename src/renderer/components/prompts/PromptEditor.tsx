import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { api } from '../../services/api';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { DEFAULT_PROFICIENCY_LEVELS } from '../../config/proficiency';
import { useToast } from '../../stores/toast-store';
import {
  FileText,
  Save,
  Play,
  RefreshCw,
  Copy,
  History,
  Sparkles,
  FlaskConical,
  BarChart2,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface PromptVersion {
  id: string;
  name: string;
  content: string;
  variables: string[];
  created_at: string;
  updated_at: string;
  stats: {
    uses: number;
    avg_score: number;
    avg_latency_ms: number;
  };
  is_active: boolean;
}

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: 'assessment' | 'extraction' | 'mapping' | 'review' | 'custom';
  versions: PromptVersion[];
  active_version_id: string;
}

interface TestResult {
  prompt_id: string;
  version_id: string;
  input: Record<string, string>;
  output: string;
  latency_ms: number;
  tokens_used: number;
  score?: number;
}

const PromptEditor: React.FC = () => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<PromptVersion | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testInputs, setTestInputs] = useState<Record<string, string>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmingTemplateDelete, setConfirmingTemplateDelete] = useState<string | null>(null);

  // Fetch templates from backend
  const fetchTemplates = useCallback(async () => {
    try {
      setLoadError(null);
      const response = await api.listConfigurations();

      // Transform backend configurations to template format
      const configs = response.configurations || response || [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- transforming unstructured API response
      const transformedTemplates: PromptTemplate[] = configs.map((config: Record<string, any>) => ({
        id: config.id || config.config_id,
        name: config.name || 'Untitled',
        description: config.description || '',
        category: config.category || config.type || 'custom',
        active_version_id: config.active_version_id || 'v1',
        versions: config.versions || [
          {
            id: 'v1',
            name: 'v1.0',
            content: config.system_prompt || config.prompt || '',
            variables: extractVariablesFromContent(config.system_prompt || config.prompt || ''),
            created_at: config.created_at || new Date().toISOString(),
            updated_at: config.updated_at || new Date().toISOString(),
            stats: {
              uses: config.stats?.uses || 0,
              avg_score: config.stats?.avg_score || 0,
              avg_latency_ms: config.stats?.avg_latency_ms || 0,
            },
            is_active: true,
          },
        ],
      }));

      // If no templates from backend, provide defaults
      if (transformedTemplates.length === 0) {
        setTemplates(getDefaultTemplates());
      } else {
        setTemplates(transformedTemplates);
      }
    } catch (err: unknown) {
      console.error('Failed to load configurations:', err);
      setLoadError(err instanceof Error ? err.message : 'Failed to load templates');
      // Fall back to default templates on error
      setTemplates(getDefaultTemplates());
    } finally {
      setInitialLoading(false);
    }
  }, []);

  // Helper to extract variables from content
  const extractVariablesFromContent = (content: string): string[] => {
    const matches = content.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '')))];
  };

  // Default templates when backend is unavailable
  const getDefaultTemplates = (): PromptTemplate[] => [
    {
      id: 'default-1',
      name: 'Proficiency Assessment',
      description: 'Assess skill proficiency level from evidence',
      category: 'assessment',
      active_version_id: 'v1',
      versions: [
        {
          id: 'v1',
          name: 'v1.0 - Default',
          content: `You are an expert skill assessor. Analyze the following evidence and determine the proficiency level (1-5) for the skill "{{skill_name}}".

Evidence:
{{evidence}}

Job Context:
{{job_context}}

Provide your assessment in the following format:
- Proficiency Level: [1-5]
- Confidence: [0-100%]
- Reasoning: [Your detailed reasoning]

Assessment:`,
          variables: ['skill_name', 'evidence', 'job_context'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          stats: { uses: 0, avg_score: 0, avg_latency_ms: 0 },
          is_active: true,
        },
      ],
    },
    {
      id: 'default-2',
      name: 'Skill Extraction',
      description: 'Extract skills from job descriptions',
      category: 'extraction',
      active_version_id: 'v1',
      versions: [
        {
          id: 'v1',
          name: 'v1.0 - Default',
          content: `Extract all technical and soft skills from the following job description.

Job Description:
{{job_description}}

Return as JSON array with format:
[{"skill": "name", "category": "technical|soft|domain", "importance": "required|preferred|nice-to-have"}]`,
          variables: ['job_description'],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          stats: { uses: 0, avg_score: 0, avg_latency_ms: 0 },
          is_active: true,
        },
      ],
    },
  ];

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const selectTemplate = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    const activeVersion =
      template.versions.find((v) => v.id === template.active_version_id) || template.versions[0];
    setSelectedVersion(activeVersion);
    setEditContent(activeVersion.content);
    setTestInputs(Object.fromEntries(activeVersion.variables.map((v) => [v, ''])));
    setTestResult(null);
  };

  const selectVersion = (version: PromptVersion) => {
    setSelectedVersion(version);
    setEditContent(version.content);
    setTestInputs(Object.fromEntries(version.variables.map((v) => [v, ''])));
    setTestResult(null);
  };

  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '')))];
  };

  const saveVersion = async () => {
    if (!selectedTemplate || !selectedVersion) return;

    try {
      setLoading(true);
      const newVariables = extractVariables(editContent);

      // Call API to update configuration
      const configData = {
        name: selectedTemplate.name,
        description: selectedTemplate.description,
        prompt_template: editContent,
        tags: [selectedTemplate.category, 'prompt'],
        proficiency_levels: DEFAULT_PROFICIENCY_LEVELS.map(({ color: _color, ...level }) => level),
      };

      // Check if this is a new template (default-*) or existing one
      if (selectedTemplate.id.startsWith('default-')) {
        // Create new configuration in backend
        const result = await api.createConfiguration(configData);
        toast({ title: 'Template created!', description: 'New prompt template saved to backend.' });

        // Update local state with new ID
        const newId = result.id || result.config_id || selectedTemplate.id;
        setTemplates((prev) =>
          prev.map((t) => (t.id === selectedTemplate.id ? { ...t, id: newId } : t))
        );
        setSelectedTemplate((prev) => (prev ? { ...prev, id: newId } : null));
      } else {
        // Update existing configuration
        await api.updateConfiguration(selectedTemplate.id, configData);
        toast({ title: 'Version saved!', description: 'Prompt version updated successfully.' });
      }

      // Update local state
      setSelectedVersion((prev) =>
        prev
          ? {
              ...prev,
              content: editContent,
              variables: newVariables,
              updated_at: new Date().toISOString(),
            }
          : null
      );
    } catch (err: unknown) {
      console.error('Save failed:', err);
      toast({
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Failed to save prompt',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const testPrompt = async () => {
    if (!selectedVersion) return;

    // Check if we have at least one input filled
    const hasInputs = Object.values(testInputs).some((v) => v.trim() !== '');
    if (!hasInputs) {
      toast({
        title: 'Missing inputs',
        description: 'Please fill in at least one variable to test the prompt.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setTesting(true);
      const startTime = Date.now();

      // Prepare the prompt with substituted variables
      let processedPrompt = editContent;
      Object.entries(testInputs).forEach(([key, value]) => {
        processedPrompt = processedPrompt.replace(
          new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
          value || `[${key}]`
        );
      });

      // Call the real proficiency assessment API
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await api.post<Record<string, any>>('/api/proficiency/assess', {
        prompt: processedPrompt,
        skills: testInputs.skill_name
          ? [{ name: testInputs.skill_name, category: 'test' }]
          : [{ name: 'Test Skill', category: 'test' }],
        evidence: testInputs.evidence || testInputs.job_description || 'Test evidence',
        context: testInputs.job_context || testInputs.context || '',
        test_mode: true, // Indicate this is a prompt test
        system_prompt: editContent,
        variables: testInputs,
      });

      const latency = Date.now() - startTime;

      // Extract response data
      const result = response.results?.[0] || response;

      setTestResult({
        prompt_id: selectedTemplate?.id || '',
        version_id: selectedVersion.id,
        input: testInputs,
        output:
          result.reasoning || result.output || result.assessment || JSON.stringify(result, null, 2),
        latency_ms: result.latency_ms || latency,
        tokens_used: result.tokens_used || result.token_count || 0,
        score: result.proficiency_level || result.score || result.confidence,
      });

      // Update version stats locally
      if (selectedVersion) {
        const currentStats = selectedVersion.stats;
        const newUses = currentStats.uses + 1;
        const newAvgLatency = Math.round(
          (currentStats.avg_latency_ms * currentStats.uses + latency) / newUses
        );
        setSelectedVersion((prev) =>
          prev
            ? {
                ...prev,
                stats: {
                  ...prev.stats,
                  uses: newUses,
                  avg_latency_ms: newAvgLatency,
                },
              }
            : null
        );
      }

      toast({ title: 'Test complete!', description: 'Check the results below.' });
    } catch (err: unknown) {
      console.error('Test failed:', err);
      const errMessage = err instanceof Error ? err.message : 'Unknown error';
      // If API fails, provide meaningful error and fall back to showing processed prompt
      let processedPrompt = editContent;
      Object.entries(testInputs).forEach(([key, value]) => {
        processedPrompt = processedPrompt.replace(
          new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
          value || `[${key}]`
        );
      });

      setTestResult({
        prompt_id: selectedTemplate?.id || '',
        version_id: selectedVersion.id,
        input: testInputs,
        output: `[API Error: ${errMessage}]\n\nProcessed prompt preview:\n${processedPrompt}`,
        latency_ms: 0,
        tokens_used: 0,
        score: undefined,
      });

      toast({
        title: 'Test completed with errors',
        description: 'Could not reach LLM API. Showing prompt preview instead.',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const createNewTemplate = async () => {
    try {
      setCreating(true);
      const newTemplate: PromptTemplate = {
        id: `new-${Date.now()}`,
        name: 'New Template',
        description: 'Enter description...',
        category: 'custom',
        active_version_id: 'v1',
        versions: [
          {
            id: 'v1',
            name: 'v1.0',
            content: `Enter your prompt template here.

Use {{variable_name}} syntax for variables.

Example:
Analyze the following for "{{topic}}":
{{content}}

Provide your analysis:`,
            variables: ['topic', 'content'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            stats: { uses: 0, avg_score: 0, avg_latency_ms: 0 },
            is_active: true,
          },
        ],
      };

      // Add to local state immediately for responsive UI
      setTemplates((prev) => [newTemplate, ...prev]);
      selectTemplate(newTemplate);

      toast({ title: 'Template created', description: 'Edit and save to store in backend.' });
    } catch (err: unknown) {
      toast({
        title: 'Failed to create template',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    try {
      // Only call API for non-default templates
      if (!templateId.startsWith('default-') && !templateId.startsWith('new-')) {
        await api.deleteConfiguration(templateId);
      }

      setTemplates((prev) => prev.filter((t) => t.id !== templateId));
      if (selectedTemplate?.id === templateId) {
        setSelectedTemplate(null);
        setSelectedVersion(null);
        setEditContent('');
      }

      toast({ title: 'Template deleted', description: 'Template removed successfully.' });
    } catch (err: unknown) {
      toast({
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const duplicateTemplate = () => {
    if (!selectedTemplate || !selectedVersion) return;

    const duplicated: PromptTemplate = {
      ...selectedTemplate,
      id: `new-${Date.now()}`,
      name: `${selectedTemplate.name} (Copy)`,
      versions: [
        {
          ...selectedVersion,
          id: 'v1',
          name: 'v1.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          stats: { uses: 0, avg_score: 0, avg_latency_ms: 0 },
          is_active: true,
        },
      ],
    };

    setTemplates((prev) => [duplicated, ...prev]);
    selectTemplate(duplicated);
    toast({ title: 'Template duplicated', description: 'Edit and save to store in backend.' });
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'assessment':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
      case 'extraction':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'mapping':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
      case 'review':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };
  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

  return (
    <motion.div className="p-6 space-y-6" variants={stagger} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Prompt Editor
          </h1>
          <p className="text-muted-foreground text-gray-500 dark:text-gray-400">
            Manage, test, and optimize AI prompts
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loadError && (
            <span className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              Using offline mode
            </span>
          )}
          <Button variant="outline" onClick={fetchTemplates} disabled={initialLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${initialLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={createNewTemplate} disabled={creating}>
            {creating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            New Template
          </Button>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="grid grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Template List */}
        <div className="col-span-3 space-y-2 overflow-y-auto">
          <h3 className="font-semibold text-sm text-gray-500 uppercase tracking-wide mb-3">
            Templates
          </h3>
          {initialLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-2" />
              <p className="text-sm text-gray-500">Loading templates...</p>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No templates yet</p>
              <Button variant="link" onClick={createNewTemplate} className="mt-2">
                Create your first template
              </Button>
            </div>
          ) : (
            templates.map((template) => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all hover:shadow-md group ${
                  selectedTemplate?.id === template.id
                    ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'bg-white dark:bg-gray-800'
                }`}
                onClick={() => selectTemplate(template)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm truncate flex-1">{template.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmingTemplateDelete(template.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                      title="Delete template"
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </button>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(template.category)}`}
                  >
                    {template.category}
                  </span>
                  <p className="text-xs text-gray-500 mt-2 line-clamp-2">{template.description}</p>
                  <div className="text-xs text-gray-400 mt-2">
                    {template.versions.length} version{template.versions.length !== 1 ? 's' : ''}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Editor */}
        <div className="col-span-9 flex flex-col min-h-0">
          {selectedTemplate && selectedVersion ? (
            <>
              {/* Version Selector */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-gray-500" />
                  <select
                    value={selectedVersion.id}
                    onChange={(e) => {
                      const version = selectedTemplate.versions.find(
                        (v) => v.id === e.target.value
                      );
                      if (version) selectVersion(version);
                    }}
                    className="px-3 py-1.5 border rounded-md bg-white dark:bg-gray-900 text-sm"
                  >
                    {selectedTemplate.versions.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name} {v.is_active && '(Active)'}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1" />
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <BarChart2 className="w-4 h-4" />
                  <span>{selectedVersion.stats.uses} uses</span>
                  <span>•</span>
                  <span>{selectedVersion.stats.avg_score.toFixed(1)} avg score</span>
                  <span>•</span>
                  <span>{selectedVersion.stats.avg_latency_ms}ms avg</span>
                </div>
              </div>

              {/* Editor Area */}
              <Card className="flex-1 flex flex-col bg-white dark:bg-gray-800 min-h-0">
                <CardContent className="flex-1 flex flex-col p-4 min-h-0">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="flex-1 w-full p-4 font-mono text-sm bg-gray-50 dark:bg-gray-900 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter your prompt template..."
                  />

                  {/* Variables */}
                  <div className="mt-4">
                    <div className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Variables ({extractVariables(editContent).length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {extractVariables(editContent).map((v) => (
                        <span
                          key={v}
                          className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs font-mono"
                        >
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t dark:border-gray-700">
                    <Button onClick={saveVersion} disabled={loading}>
                      {loading ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      Save Version
                    </Button>
                    <Button variant="outline" onClick={() => setShowHistory(!showHistory)}>
                      <FlaskConical className="w-4 h-4 mr-2" />
                      Test Prompt
                    </Button>
                    <Button variant="ghost" onClick={duplicateTemplate}>
                      <Copy className="w-4 h-4 mr-2" />
                      Duplicate
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Test Panel */}
              {showHistory && (
                <Card className="mt-4 bg-white dark:bg-gray-800">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm">Test Prompt</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {extractVariables(editContent).map((v) => (
                        <div key={v}>
                          <label className="text-xs font-medium text-gray-500 mb-1 block">
                            {v}
                          </label>
                          <input
                            type="text"
                            value={testInputs[v] || ''}
                            onChange={(e) =>
                              setTestInputs((prev) => ({ ...prev, [v]: e.target.value }))
                            }
                            className="w-full px-3 py-2 border rounded-md text-sm bg-white dark:bg-gray-900"
                            placeholder={`Enter ${v}...`}
                          />
                        </div>
                      ))}
                    </div>
                    <Button onClick={testPrompt} disabled={testing} className="w-full">
                      {testing ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      Run Test
                    </Button>
                    {testResult && (
                      <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        <div className="flex items-center gap-4 text-sm mb-2">
                          <span className="text-green-700 dark:text-green-300">
                            <Check className="w-4 h-4 inline mr-1" />
                            {testResult.latency_ms}ms
                          </span>
                          <span>{testResult.tokens_used} tokens</span>
                          {testResult.score && <span>Score: {testResult.score.toFixed(1)}</span>}
                        </div>
                        <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                          {testResult.output}
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>Select a template to edit</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <ConfirmDialog
        open={confirmingTemplateDelete !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmingTemplateDelete(null);
        }}
        onConfirm={() => {
          if (confirmingTemplateDelete) deleteTemplate(confirmingTemplateDelete);
          setConfirmingTemplateDelete(null);
        }}
        title="Delete Template"
        description="Are you sure you want to delete this template?"
        confirmText="Delete"
        variant="destructive"
      />
    </motion.div>
  );
};

export default PromptEditor;
