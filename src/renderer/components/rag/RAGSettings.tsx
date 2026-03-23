import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { useToast } from '../../stores/toast-store';
import {
    Brain,
    Upload,
    Search,
    FileText,
    Trash2,
    Loader2,
    Plus,
    X,
    Sparkles,
    Database,
    Zap
} from 'lucide-react';

interface ContextDocument {
    id: string;
    name: string;
    content: string;
    type: 'text' | 'file';
    indexed_at?: string;
    token_count?: number;
}

interface SearchResult {
    skill: string;
    score: number;
    context?: string;
}

interface RAGSettingsProps {
    onSettingsChange?: (enabled: boolean) => void;
}

const RAGSettings: React.FC<RAGSettingsProps> = ({ onSettingsChange }) => {
    const { toast } = useToast();
    const [ragEnabled, setRagEnabled] = useState(false);
    const [contextDocuments, setContextDocuments] = useState<ContextDocument[]>([]);
    const [indexing, setIndexing] = useState(false);
    const [searching, setSearching] = useState(false);

    // Add document state
    const [showAddDocument, setShowAddDocument] = useState(false);
    const [newDocName, setNewDocName] = useState('');
    const [newDocContent, setNewDocContent] = useState('');

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

    // Enhance prompt state
    const [promptToEnhance, setPromptToEnhance] = useState('');
    const [enhancedPrompt, setEnhancedPrompt] = useState('');
    const [enhancing, setEnhancing] = useState(false);

    // Load settings from localStorage
    useEffect(() => {
        const savedEnabled = localStorage.getItem('profstudio_rag_enabled');
        const savedDocs = localStorage.getItem('profstudio_rag_documents');

        if (savedEnabled) {
            setRagEnabled(savedEnabled === 'true');
        }
        if (savedDocs) {
            try {
                setContextDocuments(JSON.parse(savedDocs));
            } catch {
                toast({ title: 'Failed to load RAG documents', description: 'Starting fresh', variant: 'destructive' });
            }
        }
    }, []);

    // Save settings to localStorage
    useEffect(() => {
        localStorage.setItem('profstudio_rag_enabled', String(ragEnabled));
        localStorage.setItem('profstudio_rag_documents', JSON.stringify(contextDocuments));
        onSettingsChange?.(ragEnabled);
    }, [ragEnabled, contextDocuments, onSettingsChange]);

    const handleToggleRAG = () => {
        setRagEnabled(!ragEnabled);
        toast({
            title: ragEnabled ? 'RAG Disabled' : 'RAG Enabled',
            description: ragEnabled
                ? 'Semantic search is now disabled for assessments'
                : 'Semantic search is now enabled for assessments'
        });
    };

    const handleAddDocument = async () => {
        if (!newDocName.trim() || !newDocContent.trim()) {
            toast({
                title: 'Validation error',
                description: 'Document name and content are required',
                variant: 'destructive'
            });
            return;
        }

        try {
            setIndexing(true);

            // Add context to backend
            await api.addRAGContext({
                documents: [{
                    content: newDocContent,
                    metadata: { name: newDocName }
                }]
            });

            const newDoc: ContextDocument = {
                id: `doc-${Date.now()}`,
                name: newDocName,
                content: newDocContent,
                type: 'text',
                indexed_at: new Date().toISOString(),
                token_count: newDocContent.split(/\s+/).length
            };

            setContextDocuments(prev => [...prev, newDoc]);
            setNewDocName('');
            setNewDocContent('');
            setShowAddDocument(false);

            toast({
                title: 'Document added',
                description: `"${newDocName}" has been indexed for RAG`
            });
        } catch (err: unknown) {
            toast({
                title: 'Failed to add document',
                description: err instanceof Error ? err.message : 'Unknown error',
                variant: 'destructive'
            });
        } finally {
            setIndexing(false);
        }
    };

    const handleRemoveDocument = (docId: string) => {
        setContextDocuments(prev => prev.filter(d => d.id !== docId));
        toast({ title: 'Document removed', description: 'Context document has been removed' });
    };

    const handleSemanticSearch = async () => {
        if (!searchQuery.trim()) return;

        try {
            setSearching(true);
            const response = await api.searchSkillsSemantic({
                query: searchQuery,
                top_k: 10
            });

            setSearchResults((response.results || []).map(r => ({
                skill: r.skill || r.skill_name,
                score: r.score,
                context: r.category,
            })));

            if (!response.results?.length) {
                toast({
                    title: 'No results',
                    description: 'No matching skills found for your query'
                });
            }
        } catch (err: unknown) {
            toast({
                title: 'Search failed',
                description: err instanceof Error ? err.message : 'Unknown error',
                variant: 'destructive'
            });
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    const handleEnhancePrompt = async () => {
        if (!promptToEnhance.trim()) return;

        try {
            setEnhancing(true);
            const response = await api.enhancePromptWithRAG({
                prompt: promptToEnhance,
                skill_name: 'general', // Will use context from all indexed skills
                use_context: true
            });

            setEnhancedPrompt(response.enhanced_prompt || response.prompt || '');

            toast({
                title: 'Prompt enhanced',
                description: 'Context has been added to your prompt'
            });
        } catch (err: unknown) {
            toast({
                title: 'Enhancement failed',
                description: err instanceof Error ? err.message : 'Unknown error',
                variant: 'destructive'
            });
        } finally {
            setEnhancing(false);
        }
    };

    const handleIndexSkills = async () => {
        try {
            setIndexing(true);

            // Get skills from localStorage or state
            const skillsData = localStorage.getItem('profstudio_extracted_skills');
            const skills = skillsData ? JSON.parse(skillsData) : [];

            if (skills.length === 0) {
                toast({
                    title: 'No skills to index',
                    description: 'Extract skills first before indexing',
                    variant: 'destructive'
                });
                return;
            }

            await api.indexSkillsForRAG({
                skills: skills.map((s: Record<string, unknown>) => ({
                    id: (s.id || s.name) as string,
                    name: s.name as string,
                    description: (s.description || '') as string,
                    category: (s.category || '') as string
                }))
            });

            toast({
                title: 'Skills indexed',
                description: `${skills.length} skills have been indexed for semantic search`
            });
        } catch (err: unknown) {
            toast({
                title: 'Indexing failed',
                description: err instanceof Error ? err.message : 'Unknown error',
                variant: 'destructive'
            });
        } finally {
            setIndexing(false);
        }
    };

    return (
        <div className="space-y-6 p-6">
            {/* RAG Toggle */}
            <Card className="bg-white dark:bg-gray-800">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${ragEnabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                <Brain className={`w-6 h-6 ${ragEnabled ? 'text-green-600' : 'text-gray-500'}`} />
                            </div>
                            <div>
                                <CardTitle className="text-lg">RAG Enhancement</CardTitle>
                                <CardDescription>
                                    Use semantic search to enhance skill assessments with context
                                </CardDescription>
                            </div>
                        </div>
                        <Button
                            variant={ragEnabled ? 'default' : 'outline'}
                            onClick={handleToggleRAG}
                        >
                            {ragEnabled ? 'Enabled' : 'Disabled'}
                        </Button>
                    </div>
                </CardHeader>
            </Card>

            {ragEnabled && (
                <>
                    {/* Context Documents */}
                    <Card className="bg-white dark:bg-gray-800">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <FileText className="w-5 h-5" />
                                        Context Documents
                                    </CardTitle>
                                    <CardDescription>
                                        Add reference documents to enhance assessments
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleIndexSkills}
                                        disabled={indexing}
                                    >
                                        {indexing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Database className="w-4 h-4 mr-2" />}
                                        Index Skills
                                    </Button>
                                    <Button size="sm" onClick={() => setShowAddDocument(true)}>
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Document
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {showAddDocument && (
                                <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-medium">Add New Context Document</h4>
                                        <Button variant="ghost" size="sm" onClick={() => setShowAddDocument(false)}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={newDocName}
                                            onChange={(e) => setNewDocName(e.target.value)}
                                            placeholder="Document name"
                                            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800"
                                        />
                                        <textarea
                                            value={newDocContent}
                                            onChange={(e) => setNewDocContent(e.target.value)}
                                            placeholder="Paste document content here (skill definitions, competency frameworks, etc.)"
                                            rows={5}
                                            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 resize-none"
                                        />
                                        <Button onClick={handleAddDocument} disabled={indexing} className="w-full">
                                            {indexing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                            Add & Index Document
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {contextDocuments.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                    <p>No context documents added yet</p>
                                    <p className="text-sm">Add documents to enhance assessment accuracy</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {contextDocuments.map(doc => (
                                        <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <FileText className="w-5 h-5 text-blue-500" />
                                                <div>
                                                    <p className="font-medium text-sm">{doc.name}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {doc.token_count} tokens • Indexed {doc.indexed_at ? new Date(doc.indexed_at).toLocaleDateString() : 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRemoveDocument(doc.id)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Semantic Search */}
                    <Card className="bg-white dark:bg-gray-800">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Search className="w-5 h-5" />
                                Semantic Skill Search
                            </CardTitle>
                            <CardDescription>
                                Search for skills using natural language
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="e.g., 'communication skills for leadership'"
                                    className="flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-900"
                                    onKeyDown={(e) => e.key === 'Enter' && handleSemanticSearch()}
                                />
                                <Button onClick={handleSemanticSearch} disabled={searching}>
                                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                </Button>
                            </div>

                            {searchResults.length > 0 && (
                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                    {searchResults.map((result, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded">
                                            <span className="text-sm">{result.skill}</span>
                                            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                                                {(result.score * 100).toFixed(0)}% match
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Prompt Enhancement */}
                    <Card className="bg-white dark:bg-gray-800">
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Sparkles className="w-5 h-5" />
                                Prompt Enhancement
                            </CardTitle>
                            <CardDescription>
                                Enhance prompts with relevant context from your documents
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Original Prompt</label>
                                <textarea
                                    value={promptToEnhance}
                                    onChange={(e) => setPromptToEnhance(e.target.value)}
                                    placeholder="Enter your assessment prompt..."
                                    rows={3}
                                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-900 resize-none"
                                />
                            </div>
                            <Button onClick={handleEnhancePrompt} disabled={enhancing || !promptToEnhance.trim()}>
                                {enhancing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                                Enhance with Context
                            </Button>
                            {enhancedPrompt && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Enhanced Prompt</label>
                                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                        <pre className="text-sm whitespace-pre-wrap">{enhancedPrompt}</pre>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
};

export default RAGSettings;
