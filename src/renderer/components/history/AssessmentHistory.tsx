import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { useToast } from '../../stores/toast-store';
import {
    History,
    Download,
    Trash2,
    Eye,
    GitCompare,
    RefreshCw,
    Calendar,
    Clock,
    CheckCircle,
    ChevronLeft,
    BarChart2,
    Brain,
    Server
} from 'lucide-react';
import { JsonViewer } from '../common/JsonViewer';
import { getProficiencyBadgeClasses } from '../../config/proficiency';

interface ComparisonAssessment {
    id: string;
    provider: string;
    model: string;
    total_skills: number;
}

interface ComparisonSkillAssessment {
    assessment_id: string;
    proficiency_level: number;
    confidence_score: number;
}

interface ComparisonSkill {
    skill: string;
    assessments: ComparisonSkillAssessment[];
}

interface ComparisonResult {
    assessments: ComparisonAssessment[];
    common_skills: ComparisonSkill[];
}

interface HistoryResponse {
    status: string;
    message?: string;
    assessments?: AssessmentSummary[];
}

interface DetailResponse {
    status: string;
    message?: string;
    assessment?: AssessmentDetail;
}

interface DeleteResponse {
    status: string;
    message?: string;
}

interface CompareResponse {
    status: string;
    message?: string;
    comparison?: ComparisonResult;
}

interface ExportResponse {
    status: string;
    message?: string;
    [key: string]: unknown;
}

interface AssessmentSummary {
    id: string;
    environment: string;
    provider: string;
    model: string;
    created_at: string;
    total_skills: number;
    average_confidence: number;
    processing_time_seconds: number;
}

interface AssessmentDetail {
    id: string;
    environment: string;
    provider: string;
    model: string;
    created_at: string;
    processing_time_seconds: number;
    total_skills: number;
    statistics: {
        avg_confidence: number;
        min_confidence: number;
        max_confidence: number;
        proficiency_distribution: Record<string, number>;
    };
    proficiencies: Array<{
        skill_name: string;
        proficiency_level: number;
        confidence_score: number;
        reasoning: string;
        evidence?: string[];
    }>;
    metadata: Record<string, unknown>;
}

const AssessmentHistory: React.FC = () => {
    const { toast } = useToast();

    // State
    const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Filters
    const [environmentFilter, setEnvironmentFilter] = useState<string>('');
    const [providerFilter, setProviderFilter] = useState<string>('');
    const [limitFilter, setLimitFilter] = useState<number>(50);

    // Detail view
    const [selectedAssessment, setSelectedAssessment] = useState<AssessmentDetail | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Compare mode
    const [compareMode, setCompareMode] = useState(false);
    const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
    const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);

    // Unique values for filters
    const [environments, setEnvironments] = useState<string[]>([]);
    const [providers, setProviders] = useState<string[]>([]);

    const loadHistory = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            let url = `/api/export/history?limit=${limitFilter}`;
            if (environmentFilter) url += `&environment_name=${encodeURIComponent(environmentFilter)}`;
            if (providerFilter) url += `&model_provider=${encodeURIComponent(providerFilter)}`;

            const response = await api.get<HistoryResponse>(url);

            if (response.status === 'success') {
                setAssessments(response.assessments || []);

                // Extract unique filter values
                const envs = new Set<string>();
                const provs = new Set<string>();
                response.assessments?.forEach((a: AssessmentSummary) => {
                    if (a.environment) envs.add(a.environment);
                    if (a.provider) provs.add(a.provider);
                });
                setEnvironments(Array.from(envs));
                setProviders(Array.from(provs));
            } else {
                throw new Error(response.message || 'Failed to load history');
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to load assessment history');
            toast({ title: 'Failed to load history', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    // NOTE: toast removed from deps to prevent infinite loop - toast function is stable
    }, [environmentFilter, providerFilter, limitFilter]);

    useEffect(() => {
        loadHistory();
    }, [loadHistory]);

    const loadAssessmentDetail = async (id: string) => {
        try {
            setLoadingDetail(true);
            const response = await api.get<DetailResponse>(`/api/export/history/${id}`);

            if (response.status === 'success') {
                setSelectedAssessment(response.assessment ?? null);
            } else {
                throw new Error(response.message || 'Failed to load assessment');
            }
        } catch (err: unknown) {
            toast({ title: err instanceof Error ? err.message : 'Failed to load assessment details', variant: 'destructive' });
        } finally {
            setLoadingDetail(false);
        }
    };

    const deleteAssessment = async (id: string) => {
        if (!confirm('Are you sure you want to delete this assessment? This cannot be undone.')) {
            return;
        }

        try {
            const response = await api.delete<DeleteResponse>(`/api/export/history/${id}?confirm=true`);

            if (response.status === 'success') {
                toast({ title: 'Assessment deleted', variant: 'default' });
                setSelectedAssessment(null);
                loadHistory();
            } else {
                throw new Error(response.message || 'Failed to delete');
            }
        } catch (err: unknown) {
            toast({ title: err instanceof Error ? err.message : 'Failed to delete assessment', variant: 'destructive' });
        }
    };

    const compareAssessments = async () => {
        if (selectedForCompare.length < 2) {
            toast({ title: 'Select at least 2 assessments to compare', variant: 'destructive' });
            return;
        }

        try {
            setLoading(true);
            const response = await api.post<CompareResponse>('/api/export/history/compare', selectedForCompare);

            if (response.status === 'success') {
                setComparisonResult(response.comparison ?? null);
            } else {
                throw new Error(response.message || 'Comparison failed');
            }
        } catch (err: unknown) {
            toast({ title: err instanceof Error ? err.message : 'Failed to compare assessments', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const exportAssessment = async (id: string, format: 'json' | 'csv' | 'xlsx') => {
        try {
            const response = await api.post<ExportResponse>('/api/export/proficiencies', {
                assessment_id: id,
                format,
                include_metadata: true
            });

            if (format === 'json') {
                const blob = new Blob([JSON.stringify(response, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `assessment_${id}_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
            }
            // CSV and XLSX are handled by backend as file download
            toast({ title: `Exported as ${format.toUpperCase()}`, variant: 'default' });
        } catch (err: unknown) {
            toast({ title: 'Export failed', variant: 'destructive' });
        }
    };

    const toggleCompareSelection = (id: string) => {
        setSelectedForCompare(prev => {
            if (prev.includes(id)) {
                return prev.filter(i => i !== id);
            } else if (prev.length < 5) {
                return [...prev, id];
            }
            return prev;
        });
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const getConfidenceColor = (score: number) => {
        if (score >= 0.8) return 'text-green-600 dark:text-green-400';
        if (score >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    };

    const getConfidenceBg = (score: number) => {
        if (score >= 0.8) return 'bg-green-100 dark:bg-green-900/30';
        if (score >= 0.6) return 'bg-yellow-100 dark:bg-yellow-900/30';
        return 'bg-red-100 dark:bg-red-900/30';
    };

    // Comparison View
    if (comparisonResult) {
        return (
            <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Assessment Comparison</h1>
                        <p className="text-muted-foreground">Comparing {comparisonResult.assessments?.length || 0} assessments</p>
                    </div>
                    <Button variant="outline" onClick={() => { setComparisonResult(null); setCompareMode(false); setSelectedForCompare([]); }}>
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Back to History
                    </Button>
                </div>

                {/* Comparison Overview */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {comparisonResult.assessments?.map((a) => (
                        <Card key={a.id} className="bg-white dark:bg-gray-800">
                            <CardContent className="p-4">
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">{a.provider}</div>
                                <div className="font-medium text-sm">{a.model}</div>
                                <div className="text-xs text-gray-400 mt-1">{a.total_skills} skills</div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Common Skills Comparison */}
                <Card className="bg-white dark:bg-gray-800">
                    <CardHeader>
                        <CardTitle className="text-lg">Common Skills ({comparisonResult.common_skills?.length || 0})</CardTitle>
                        <CardDescription>Skills assessed by all selected models</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Skill</th>
                                        {comparisonResult.assessments?.map((a) => (
                                            <th key={a.id} className="px-4 py-2 text-center">{a.model}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {comparisonResult.common_skills?.map((skill) => (
                                        <tr key={skill.skill} className="border-b dark:border-gray-700">
                                            <td className="px-4 py-2 font-medium">{skill.skill}</td>
                                            {skill.assessments?.map((a) => (
                                                <td key={a.assessment_id} className="px-4 py-2 text-center">
                                                    <span className="font-bold">L{a.proficiency_level}</span>
                                                    <span className={`text-xs ml-1 ${getConfidenceColor(a.confidence_score)}`}>
                                                        ({(a.confidence_score * 100).toFixed(0)}%)
                                                    </span>
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Detail View
    if (selectedAssessment) {
        return (
            <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Assessment Details</h1>
                        <p className="text-muted-foreground">{selectedAssessment.environment} • {formatDate(selectedAssessment.created_at)}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setSelectedAssessment(null)}>
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            Back
                        </Button>
                        <Button variant="outline" onClick={() => exportAssessment(selectedAssessment.id, 'json')}>
                            <Download className="w-4 h-4 mr-2" />
                            Export JSON
                        </Button>
                        <Button variant="destructive" onClick={() => deleteAssessment(selectedAssessment.id)}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                        </Button>
                    </div>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-white dark:bg-gray-800">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Model</div>
                                <div className="font-semibold">{selectedAssessment.provider}/{selectedAssessment.model}</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white dark:bg-gray-800">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                <BarChart2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Skills Assessed</div>
                                <div className="font-semibold">{selectedAssessment.total_skills}</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white dark:bg-gray-800">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${getConfidenceBg(selectedAssessment.statistics?.avg_confidence || 0)}`}>
                                <CheckCircle className={`w-5 h-5 ${getConfidenceColor(selectedAssessment.statistics?.avg_confidence || 0)}`} />
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Avg Confidence</div>
                                <div className="font-semibold">{((selectedAssessment.statistics?.avg_confidence || 0) * 100).toFixed(1)}%</div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-white dark:bg-gray-800">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                                <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Processing Time</div>
                                <div className="font-semibold">{selectedAssessment.processing_time_seconds?.toFixed(1)}s</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Proficiency Distribution */}
                {selectedAssessment.statistics?.proficiency_distribution && (
                    <Card className="bg-white dark:bg-gray-800">
                        <CardHeader>
                            <CardTitle className="text-lg">Proficiency Distribution</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex gap-4 flex-wrap">
                                {Object.entries(selectedAssessment.statistics.proficiency_distribution).map(([level, count]) => (
                                    <div key={level} className="text-center">
                                        <div className="text-2xl font-bold">{count}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">{level.replace('_', ' ')}</div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Proficiencies Grid */}
                <Card className="bg-white dark:bg-gray-800">
                    <CardHeader>
                        <CardTitle className="text-lg">Skill Proficiencies</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {selectedAssessment.proficiencies?.map((prof, idx) => (
                                <Card key={idx} className="bg-gray-50 dark:bg-gray-900">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-medium text-sm">{prof.skill_name}</div>
                                            <div className={`px-2 py-1 rounded text-xs font-bold ${getProficiencyBadgeClasses(prof.proficiency_level)}`}>
                                                Level {prof.proficiency_level}
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{prof.reasoning}</p>
                                        <div className="mt-2 flex justify-between items-center text-xs">
                                            <span className="text-gray-500">Confidence</span>
                                            <span className={`font-medium ${getConfidenceColor(prof.confidence_score)}`}>
                                                {(prof.confidence_score * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Metadata */}
                {selectedAssessment.metadata && Object.keys(selectedAssessment.metadata).length > 0 && (
                    <Card className="bg-white dark:bg-gray-800">
                        <CardHeader>
                            <CardTitle className="text-lg">Metadata</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <JsonViewer data={selectedAssessment.metadata} maxHeight="300px" />
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    }

    // List View
    return (
        <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                        <History className="w-6 h-6" />
                        Assessment History
                    </h1>
                    <p className="text-muted-foreground text-gray-500 dark:text-gray-400">View and manage past proficiency assessments</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={loadHistory} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    {compareMode ? (
                        <>
                            <Button variant="outline" onClick={() => { setCompareMode(false); setSelectedForCompare([]); }}>
                                Cancel
                            </Button>
                            <Button onClick={compareAssessments} disabled={selectedForCompare.length < 2}>
                                <GitCompare className="w-4 h-4 mr-2" />
                                Compare ({selectedForCompare.length})
                            </Button>
                        </>
                    ) : (
                        <Button variant="outline" onClick={() => setCompareMode(true)}>
                            <GitCompare className="w-4 h-4 mr-2" />
                            Compare Mode
                        </Button>
                    )}
                </div>
            </div>

            {/* Filters */}
            <Card className="bg-white dark:bg-gray-800">
                <CardContent className="p-4">
                    <div className="flex flex-wrap gap-4 items-end">
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Environment</label>
                            <select
                                value={environmentFilter}
                                onChange={(e) => setEnvironmentFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
                            >
                                <option value="">All Environments</option>
                                {environments.map(env => (
                                    <option key={env} value={env}>{env}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Model Provider</label>
                            <select
                                value={providerFilter}
                                onChange={(e) => setProviderFilter(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
                            >
                                <option value="">All Providers</option>
                                {providers.map(prov => (
                                    <option key={prov} value={prov}>{prov}</option>
                                ))}
                            </select>
                        </div>
                        <div className="w-[120px]">
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Limit</label>
                            <select
                                value={limitFilter}
                                onChange={(e) => setLimitFilter(Number(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-900 text-sm"
                            >
                                <option value={10}>10</option>
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span>{error}</span>
                </div>
            )}

            {/* Assessments List */}
            {loading ? (
                <div className="flex justify-center items-center py-12">
                    <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            ) : assessments.length === 0 ? (
                <Card className="bg-white dark:bg-gray-800">
                    <CardContent className="p-12 text-center">
                        <History className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Assessments Found</h3>
                        <p className="text-gray-500 dark:text-gray-400">Run an assessment to see it appear here.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {assessments.map((assessment) => (
                        <Card
                            key={assessment.id}
                            className={`bg-white dark:bg-gray-800 hover:shadow-md transition-shadow cursor-pointer ${compareMode && selectedForCompare.includes(assessment.id) ? 'ring-2 ring-blue-500' : ''
                                }`}
                            onClick={() => {
                                if (compareMode) {
                                    toggleCompareSelection(assessment.id);
                                } else {
                                    loadAssessmentDetail(assessment.id);
                                }
                            }}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        {compareMode && (
                                            <input
                                                type="checkbox"
                                                checked={selectedForCompare.includes(assessment.id)}
                                                onChange={() => toggleCompareSelection(assessment.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="w-5 h-5 rounded border-gray-300"
                                            />
                                        )}
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                                <Server className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">
                                                    {assessment.environment || 'Unknown Environment'}
                                                </div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                                    {assessment.provider}/{assessment.model}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-center">
                                            <div className="text-lg font-bold text-gray-900 dark:text-white">{assessment.total_skills}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">Skills</div>
                                        </div>
                                        <div className="text-center">
                                            <div className={`text-lg font-bold ${getConfidenceColor(assessment.average_confidence)}`}>
                                                {(assessment.average_confidence * 100).toFixed(0)}%
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">Confidence</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-lg font-bold text-gray-900 dark:text-white">
                                                {assessment.processing_time_seconds?.toFixed(1)}s
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">Time</div>
                                        </div>
                                        <div className="text-right min-w-[150px]">
                                            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-300">
                                                <Calendar className="w-4 h-4" />
                                                {formatDate(assessment.created_at)}
                                            </div>
                                        </div>
                                        {!compareMode && (
                                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); loadAssessmentDetail(assessment.id); }}>
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {loadingDetail && (
                <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center">
                    <Card className="p-6 bg-white dark:bg-gray-800">
                        <div className="flex items-center gap-3">
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            <span>Loading assessment details...</span>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default AssessmentHistory;
