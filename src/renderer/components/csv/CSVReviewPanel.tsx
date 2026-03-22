import React, { useState } from 'react';
import { api } from '../../services/api';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { useToast } from '../../stores/toast-store';
import {
    AlertTriangle,
    CheckCircle,
    XCircle,
    RefreshCw,
    Wand2,
    FileWarning,
    Info,
    ChevronDown,
    ChevronUp
} from 'lucide-react';

interface Issue {
    row: number;
    column: string;
    issue_type: 'error' | 'warning' | 'info';
    message: string;
    suggestion?: string;
    auto_fixable: boolean;
}

interface ReviewResult {
    file_id: string;
    total_rows: number;
    issues: Issue[];
    summary: {
        errors: number;
        warnings: number;
        info: number;
        auto_fixable: number;
    };
    quality_score: number;
}

interface CSVReviewPanelProps {
    fileId: string;
    entityName: string;
    onReviewComplete?: (result: ReviewResult) => void;
    onApplyFixes?: () => void;
}

const CSVReviewPanel: React.FC<CSVReviewPanelProps> = ({
    fileId,
    entityName,
    onReviewComplete,
    onApplyFixes
}) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [applyingFixes, setApplyingFixes] = useState(false);
    const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
    const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set());

    const runReview = async () => {
        try {
            setLoading(true);
            const response = await api.reviewFile(fileId, entityName);

            if (response.status === 'success' && response.result) {
                setReviewResult(response.result);
                onReviewComplete?.(response.result);

                if (response.result.issues.length === 0) {
                    toast({ title: 'No issues found!', description: 'Your file looks clean.' });
                }
            }
        } catch (err: unknown) {
            toast({ title: 'Review failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const applyFixes = async () => {
        try {
            setApplyingFixes(true);
            const response = await api.applyFixes(fileId, entityName);

            if (response.status === 'success') {
                toast({
                    title: 'Fixes applied!',
                    description: `${response.fixes_applied} issues were auto-fixed.`
                });
                onApplyFixes?.();
                // Re-run review to show updated state
                await runReview();
            }
        } catch (err: unknown) {
            toast({ title: 'Failed to apply fixes', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
        } finally {
            setApplyingFixes(false);
        }
    };

    const toggleIssueExpand = (index: number) => {
        setExpandedIssues(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    const getIssueIcon = (type: string) => {
        switch (type) {
            case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
            case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
            default: return <Info className="w-4 h-4 text-blue-500" />;
        }
    };

    const getIssueBg = (type: string) => {
        switch (type) {
            case 'error': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
            case 'warning': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
            default: return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
        }
    };

    return (
        <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <FileWarning className="w-5 h-5" />
                            AI File Review
                        </CardTitle>
                        <CardDescription>Analyze your CSV for data quality issues</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        {reviewResult && reviewResult.summary.auto_fixable > 0 && (
                            <Button
                                onClick={applyFixes}
                                disabled={applyingFixes}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                {applyingFixes ? (
                                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Wand2 className="w-4 h-4 mr-2" />
                                )}
                                Auto-Fix ({reviewResult.summary.auto_fixable})
                            </Button>
                        )}
                        <Button onClick={runReview} disabled={loading} variant="outline">
                            {loading ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <RefreshCw className="w-4 h-4 mr-2" />
                            )}
                            {reviewResult ? 'Re-scan' : 'Scan File'}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {!reviewResult && !loading && (
                    <div className="text-center py-8 text-gray-500">
                        <FileWarning className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>Click "Scan File" to analyze your CSV for issues</p>
                    </div>
                )}

                {loading && (
                    <div className="text-center py-8">
                        <RefreshCw className="w-8 h-8 mx-auto animate-spin text-purple-500 mb-4" />
                        <p className="text-gray-500">Analyzing file with AI...</p>
                    </div>
                )}

                {reviewResult && (
                    <div className="space-y-4">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-4 gap-4">
                            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg text-center">
                                <div className="text-2xl font-bold">{reviewResult.total_rows}</div>
                                <div className="text-xs text-gray-500">Total Rows</div>
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg text-center">
                                <div className="text-2xl font-bold text-red-600">{reviewResult.summary.errors}</div>
                                <div className="text-xs text-red-600">Errors</div>
                            </div>
                            <div className="bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-lg text-center">
                                <div className="text-2xl font-bold text-yellow-600">{reviewResult.summary.warnings}</div>
                                <div className="text-xs text-yellow-600">Warnings</div>
                            </div>
                            <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg text-center">
                                <div className="text-2xl font-bold text-green-600">{reviewResult.summary.auto_fixable}</div>
                                <div className="text-xs text-green-600">Auto-Fixable</div>
                            </div>
                        </div>

                        {/* Issues List */}
                        {reviewResult.issues.length === 0 ? (
                            <div className="text-center py-6 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
                                <p className="text-green-700 dark:text-green-300 font-medium">No issues found!</p>
                                <p className="text-sm text-green-600 dark:text-green-400">Your file passes all quality checks.</p>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {reviewResult.issues.map((issue, idx) => (
                                    <div
                                        key={idx}
                                        className={`border rounded-lg p-3 cursor-pointer transition-all ${getIssueBg(issue.issue_type)}`}
                                        onClick={() => toggleIssueExpand(idx)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {getIssueIcon(issue.issue_type)}
                                                <span className="font-medium text-sm">
                                                    Row {issue.row}, Column: {issue.column}
                                                </span>
                                                {issue.auto_fixable && (
                                                    <span className="text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full">
                                                        Auto-fixable
                                                    </span>
                                                )}
                                            </div>
                                            {expandedIssues.has(idx) ? (
                                                <ChevronUp className="w-4 h-4 text-gray-400" />
                                            ) : (
                                                <ChevronDown className="w-4 h-4 text-gray-400" />
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{issue.message}</p>
                                        {expandedIssues.has(idx) && issue.suggestion && (
                                            <div className="mt-2 p-2 bg-white/50 dark:bg-black/20 rounded text-sm">
                                                <span className="font-medium">Suggestion: </span>
                                                {issue.suggestion}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default CSVReviewPanel;
