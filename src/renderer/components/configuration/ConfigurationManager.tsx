import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Star,
  X,
  Plus,
  Trash2,
  Edit,
  Copy,
  Clock,
  FileText,
  ChevronDown,
  RotateCcw,
  Save,
  Check,
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useToast } from '../../stores/toast-store';
import { api } from '../../services/api';
import { ensureLevelsHaveColors, type ProficiencyLevel } from '../../config/proficiency';
import {
  promptTemplates,
  type PromptTemplate as BuiltInTemplate,
} from '../../config/promptTemplates';

const HISTORY_KEY = 'profstudio_prompt_history';

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

export interface PromptSnapshot {
  id: string;
  timestamp: string;
  promptTemplate: string;
}

interface EditForm {
  name: string;
  description: string;
  promptTemplate: string;
  temperature: number;
  max_tokens: number;
}

type PanelMode = 'empty' | 'viewing' | 'editing' | 'creating' | 'snapshot' | 'builtin';

interface ConfigurationManagerProps {
  currentConfig: {
    proficiencyLevels: ProficiencyLevel[];
    llmConfig: LLMConfig;
    promptTemplate: string;
  };
  onLoad: (config: Partial<ConfigurationItem> & { prompt_template?: string }) => void;
  onClose: () => void;
  initialTab?: 'save' | 'load';
  initialName?: string;
}

function formatRelativeTime(dateStr: string): string {
  const d = new Date(dateStr);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

const panelVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.18 } },
  exit: { opacity: 0, y: -4, transition: { duration: 0.12 } },
};

export const ConfigurationManager: React.FC<ConfigurationManagerProps> = ({
  currentConfig,
  onLoad,
  onClose,
  initialTab = 'load',
  initialName = '',
}) => {
  const { toast } = useToast();

  const [configs, setConfigs] = useState<ConfigurationItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>(
    initialTab === 'save' ? 'creating' : 'empty'
  );
  const [editForm, setEditForm] = useState<EditForm>({
    name: initialTab === 'save' ? initialName : '',
    description: '',
    promptTemplate: currentConfig.promptTemplate,
    temperature: currentConfig.llmConfig.temperature,
    max_tokens: currentConfig.llmConfig.max_tokens,
  });
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<PromptSnapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<PromptSnapshot | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [selectedBuiltIn, setSelectedBuiltIn] = useState<BuiltInTemplate | null>(null);

  useEffect(() => {
    loadConfigs();
    const saved = localStorage.getItem(HISTORY_KEY);
    if (saved) {
      try {
        setSnapshots(JSON.parse(saved));
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadConfigs = async () => {
    try {
      const response = await api.get<ConfigurationItem[]>('/api/configurations/');
      if (Array.isArray(response)) setConfigs(response);
    } catch {
      toast({ title: 'Could not load templates', variant: 'destructive' });
    }
  };

  const selectedConfig = configs.find((c) => c.id === selectedId) ?? null;

  const selectConfig = (config: ConfigurationItem) => {
    setSelectedId(config.id);
    setSelectedSnapshot(null);
    setSelectedBuiltIn(null);
    setPanelMode('viewing');
  };

  const selectSnapshot = (s: PromptSnapshot) => {
    setSelectedSnapshot(s);
    setSelectedId(null);
    setSelectedBuiltIn(null);
    setPanelMode('snapshot');
  };

  const selectBuiltIn = (tpl: BuiltInTemplate) => {
    setSelectedBuiltIn(tpl);
    setSelectedId(null);
    setSelectedSnapshot(null);
    setPanelMode('builtin');
  };

  const handleLoadBuiltIn = (tpl: BuiltInTemplate) => {
    onLoad({ prompt_template: tpl.template });
    onClose();
    toast({ title: `Loaded: ${tpl.name}`, variant: 'success' });
  };

  const startCreating = () => {
    setSelectedId(null);
    setSelectedSnapshot(null);
    setSelectedBuiltIn(null);
    setEditForm({
      name: '',
      description: '',
      promptTemplate: currentConfig.promptTemplate,
      temperature: currentConfig.llmConfig.temperature,
      max_tokens: currentConfig.llmConfig.max_tokens,
    });
    setPanelMode('creating');
  };

  const startEditing = (config: ConfigurationItem) => {
    setEditForm({
      name: config.name,
      description: config.description ?? '',
      promptTemplate: config.prompt_template,
      temperature: config.llm_config?.temperature ?? 0.3,
      max_tokens: config.llm_config?.max_tokens ?? 8000,
    });
    setPanelMode('editing');
  };

  const handleSave = async () => {
    if (!editForm.name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        description: editForm.description.trim(),
        proficiency_levels: ensureLevelsHaveColors(currentConfig.proficiencyLevels),
        llm_config: {
          provider: currentConfig.llmConfig.provider,
          model: currentConfig.llmConfig.model,
          temperature: editForm.temperature,
          max_tokens: editForm.max_tokens,
        },
        prompt_template: editForm.promptTemplate,
        author: 'User',
      };

      if (panelMode === 'editing' && selectedId) {
        await api.put(`/api/configurations/${selectedId}`, payload);
        toast({ title: 'Template updated', variant: 'success' });
      } else {
        const created = await api.post<ConfigurationItem>('/api/configurations/', payload);
        if (created?.id) setSelectedId(created.id);
        toast({ title: 'Template saved', variant: 'success' });
      }

      await loadConfigs();
      setPanelMode('viewing');
    } catch (e: unknown) {
      toast({
        title: 'Save failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/configurations/${id}`);
      toast({ title: 'Template deleted' });
      setDeleteTarget(null);
      if (selectedId === id) {
        setSelectedId(null);
        setPanelMode('empty');
      }
      await loadConfigs();
    } catch {
      toast({ title: 'Delete failed', variant: 'destructive' });
    }
  };

  const handleDuplicate = async (id: string) => {
    setDuplicating(id);
    try {
      await api.post(`/api/configurations/${id}/duplicate`, {});
      toast({ title: 'Template duplicated', variant: 'success' });
      await loadConfigs();
    } catch {
      toast({ title: 'Duplicate failed', variant: 'destructive' });
    } finally {
      setDuplicating(null);
    }
  };

  const handleLoad = (config: ConfigurationItem) => {
    onLoad(config);
    onClose();
    toast({ title: `Loaded: ${config.name}`, variant: 'success' });
  };

  const handleRestoreSnapshot = (snapshot: PromptSnapshot) => {
    onLoad({ prompt_template: snapshot.promptTemplate });
    onClose();
    toast({ title: 'Prompt restored from history', variant: 'success' });
  };

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setSnapshots([]);
    if (panelMode === 'snapshot') setPanelMode('empty');
    setSelectedSnapshot(null);
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cfg-mgr-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="w-full max-w-5xl max-h-[88vh] flex flex-col rounded-xl overflow-hidden border border-border bg-background shadow-2xl"
        initial={{ opacity: 0, scale: 0.97, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="border-b border-border px-5 py-4 flex items-center justify-between flex-shrink-0">
          <h3 id="cfg-mgr-title" className="text-base font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            Template Library
          </h3>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* ── Left sidebar ── */}
          <div className="w-64 border-r border-border flex flex-col overflow-hidden flex-shrink-0">
            {/* New button */}
            <div className="p-3 border-b border-border">
              <Button
                size="sm"
                variant="outline"
                className="w-full justify-start gap-2"
                onClick={startCreating}
              >
                <Plus className="w-3.5 h-3.5" />
                New Template
              </Button>
            </div>

            {/* Saved templates */}
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
              {configs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6 px-3">
                  No saved templates yet. Click &quot;New Template&quot; to create one.
                </p>
              ) : (
                configs.map((config) => (
                  <button
                    key={config.id}
                    onClick={() => selectConfig(config)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-lg transition-all group',
                      selectedId === config.id && panelMode !== 'creating'
                        ? 'bg-primary/10 border border-primary/20'
                        : 'hover:bg-muted/60 border border-transparent'
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {config.is_default && (
                        <Star className="w-3 h-3 text-yellow-500 fill-current flex-shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate leading-tight">
                        {config.name}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(config.updated_at)}
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Built-in templates */}
            <div className="border-t border-border pt-2 mt-1">
              <p className="text-xs text-muted-foreground px-3 py-1.5 font-semibold uppercase tracking-wide">
                Built-in
              </p>
              {promptTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => selectBuiltIn(tpl)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-lg transition-all',
                    selectedBuiltIn?.id === tpl.id && panelMode === 'builtin'
                      ? 'bg-primary/10 border border-primary/20'
                      : 'hover:bg-muted/60 border border-transparent'
                  )}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {tpl.recommended && (
                      <Star className="w-3 h-3 text-yellow-500 fill-current shrink-0" />
                    )}
                    <span className="text-sm font-medium truncate leading-tight">{tpl.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground line-clamp-1">
                    {tpl.description}
                  </span>
                </button>
              ))}
            </div>

            {/* History section */}
            {snapshots.length > 0 && (
              <div className="border-t border-border flex-shrink-0">
                <button
                  onClick={() => setHistoryOpen((o) => !o)}
                  className="w-full px-3 py-2.5 flex items-center justify-between text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Edit History ({snapshots.length})
                  </span>
                  <ChevronDown
                    className={cn(
                      'w-3.5 h-3.5 transition-transform duration-200',
                      historyOpen && 'rotate-180'
                    )}
                  />
                </button>
                <AnimatePresence>
                  {historyOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="max-h-48 overflow-y-auto p-2 space-y-0.5">
                        {snapshots.slice(0, 12).map((s) => (
                          <button
                            key={s.id}
                            onClick={() => selectSnapshot(s)}
                            className={cn(
                              'w-full text-left px-2.5 py-2 rounded-md transition-all',
                              selectedSnapshot?.id === s.id
                                ? 'bg-muted border border-border'
                                : 'hover:bg-muted/60 border border-transparent'
                            )}
                          >
                            <div className="text-xs font-medium text-muted-foreground">
                              {formatRelativeTime(s.timestamp)}
                            </div>
                            <div className="text-xs text-muted-foreground/60 truncate mt-0.5">
                              {s.promptTemplate.slice(0, 55)}…
                            </div>
                          </button>
                        ))}
                      </div>
                      <div className="px-3 pb-2">
                        <button
                          onClick={clearHistory}
                          className="text-xs text-muted-foreground/60 hover:text-destructive transition-colors"
                        >
                          Clear history
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* ── Right panel ── */}
          <div className="flex-1 overflow-y-auto min-w-0">
            <AnimatePresence mode="wait">
              {panelMode === 'empty' && (
                <motion.div
                  key="empty"
                  variants={panelVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  className="h-full flex flex-col items-center justify-center text-center p-12"
                >
                  <FileText className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">
                    Select a template to preview
                  </p>
                  <p className="text-xs text-muted-foreground/60 mt-1 max-w-xs">
                    Or click &ldquo;New Template&rdquo; to save your current configuration as a
                    reusable template.
                  </p>
                </motion.div>
              )}

              {panelMode === 'viewing' && selectedConfig && (
                <motion.div
                  key={`view-${selectedConfig.id}`}
                  variants={panelVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  className="p-6 space-y-5"
                >
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h4 className="text-lg font-semibold flex items-center gap-2 flex-wrap">
                        {selectedConfig.is_default && (
                          <Star className="w-4 h-4 text-yellow-500 fill-current flex-shrink-0" />
                        )}
                        {selectedConfig.name}
                      </h4>
                      {selectedConfig.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {selectedConfig.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        Saved {formatRelativeTime(selectedConfig.updated_at)} ·{' '}
                        {selectedConfig.proficiency_levels?.length ?? 0} levels · temp{' '}
                        {selectedConfig.llm_config?.temperature?.toFixed(2) ?? '—'}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          deleteTarget === selectedConfig.id
                            ? setDeleteTarget(null)
                            : setDeleteTarget(selectedConfig.id)
                        }
                        className={cn(
                          'gap-1.5',
                          deleteTarget === selectedConfig.id &&
                            'border-destructive text-destructive'
                        )}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {deleteTarget === selectedConfig.id ? 'Cancel' : 'Delete'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDuplicate(selectedConfig.id)}
                        disabled={duplicating === selectedConfig.id}
                        className="gap-1.5"
                      >
                        {duplicating === selectedConfig.id ? (
                          <Check className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        Duplicate
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startEditing(selectedConfig)}
                        className="gap-1.5"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleLoad(selectedConfig)}
                        className="gap-1.5"
                      >
                        Load
                      </Button>
                    </div>
                  </div>

                  {/* Delete confirmation */}
                  <AnimatePresence>
                    {deleteTarget === selectedConfig.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 flex items-center justify-between gap-3">
                          <p className="text-sm text-destructive">
                            Delete &ldquo;{selectedConfig.name}&rdquo;? This cannot be undone.
                          </p>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(selectedConfig.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Prompt preview */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Prompt Template
                    </p>
                    <div className="bg-muted/50 border border-border rounded-lg p-4 max-h-80 overflow-y-auto">
                      <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 leading-relaxed">
                        {selectedConfig.prompt_template}
                      </pre>
                    </div>
                  </div>

                  {/* Proficiency levels */}
                  {selectedConfig.proficiency_levels?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Proficiency Levels
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedConfig.proficiency_levels.map((lvl) => (
                          <span
                            key={lvl.level}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted text-xs font-medium"
                          >
                            <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                              {lvl.level}
                            </span>
                            {lvl.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {(panelMode === 'editing' || panelMode === 'creating') && (
                <motion.div
                  key={panelMode}
                  variants={panelVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  className="p-6 space-y-5"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">
                      {panelMode === 'creating' ? 'New Template' : 'Edit Template'}
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPanelMode(selectedId ? 'viewing' : 'empty')}
                    >
                      Cancel
                    </Button>
                  </div>

                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Name <span className="text-destructive">*</span>
                    </label>
                    <input
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      placeholder="e.g. Data Science Assessment v2"
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium mb-1.5">
                      Description
                      <span className="text-muted-foreground font-normal ml-1">(optional)</span>
                    </label>
                    <input
                      className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      placeholder="What is this template for?"
                      value={editForm.description}
                      onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    />
                  </div>

                  {/* Prompt textarea */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-medium">Prompt Template</label>
                      {panelMode === 'creating' && (
                        <button
                          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                          onClick={() =>
                            setEditForm((f) => ({
                              ...f,
                              promptTemplate: currentConfig.promptTemplate,
                            }))
                          }
                        >
                          <RotateCcw className="w-3 h-3" /> Reset to current
                        </button>
                      )}
                    </div>
                    <textarea
                      className="w-full h-56 px-3 py-2.5 rounded-lg border border-border bg-background font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none leading-relaxed"
                      value={editForm.promptTemplate}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, promptTemplate: e.target.value }))
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use <code className="bg-muted px-1 py-0.5 rounded text-xs">{'{skills}'}</code>{' '}
                      and{' '}
                      <code className="bg-muted px-1 py-0.5 rounded text-xs">
                        {'{proficiency_levels}'}
                      </code>{' '}
                      as placeholders.
                    </p>
                  </div>

                  {/* LLM params */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-sm font-medium">Temperature</label>
                        <span className="text-sm font-bold text-primary">
                          {editForm.temperature.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.05}
                        value={editForm.temperature}
                        onChange={(e) =>
                          setEditForm((f) => ({ ...f, temperature: Number(e.target.value) }))
                        }
                        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>Precise</span>
                        <span>Creative</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5">Max Tokens</label>
                      <div className="flex flex-wrap gap-1.5">
                        {[2000, 4000, 8000, 16000].map((t) => (
                          <button
                            key={t}
                            onClick={() => setEditForm((f) => ({ ...f, max_tokens: t }))}
                            className={cn(
                              'px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                              editForm.max_tokens === t
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted hover:bg-muted/80'
                            )}
                          >
                            {t >= 1000 ? `${t / 1000}K` : t}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Save button */}
                  <div className="flex justify-end pt-2">
                    <Button onClick={handleSave} disabled={saving} className="gap-2">
                      {saving ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          {panelMode === 'editing' ? 'Save Changes' : 'Save Template'}
                        </>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}

              {panelMode === 'builtin' && selectedBuiltIn && (
                <motion.div
                  key={`builtin-${selectedBuiltIn.id}`}
                  variants={panelVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  className="p-6 space-y-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h4 className="text-lg font-semibold flex items-center gap-2 flex-wrap">
                        {selectedBuiltIn.recommended && (
                          <Star className="w-4 h-4 text-yellow-500 fill-current shrink-0" />
                        )}
                        {selectedBuiltIn.name}
                        {selectedBuiltIn.recommended && (
                          <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300">
                            Recommended
                          </span>
                        )}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {selectedBuiltIn.description}
                      </p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Built-in · Read-only</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleLoadBuiltIn(selectedBuiltIn)}
                      className="gap-1.5 shrink-0"
                    >
                      Load
                    </Button>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Prompt Template
                    </p>
                    <div className="bg-muted/50 border border-border rounded-lg p-4 max-h-80 overflow-y-auto">
                      <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 leading-relaxed">
                        {selectedBuiltIn.template}
                      </pre>
                    </div>
                  </div>
                </motion.div>
              )}

              {panelMode === 'snapshot' && selectedSnapshot && (
                <motion.div
                  key={`snap-${selectedSnapshot.id}`}
                  variants={panelVariants}
                  initial="hidden"
                  animate="show"
                  exit="exit"
                  className="p-6 space-y-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-semibold flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        Auto-saved snapshot
                      </h4>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {new Date(selectedSnapshot.timestamp).toLocaleString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleRestoreSnapshot(selectedSnapshot)}
                      className="gap-1.5 flex-shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore Prompt
                    </Button>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      Prompt at this point
                    </p>
                    <div className="bg-muted/50 border border-border rounded-lg p-4 max-h-96 overflow-y-auto">
                      <pre className="text-xs font-mono whitespace-pre-wrap text-foreground/80 leading-relaxed">
                        {selectedSnapshot.promptTemplate}
                      </pre>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Restoring this snapshot will replace your current prompt template. Other
                    settings (levels, LLM config) will not change.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export type { ConfigurationItem };
