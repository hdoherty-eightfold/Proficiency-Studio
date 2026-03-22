import { useState } from 'react';
import { api } from '../../services/api';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { useToast } from '../../stores/toast-store';
import {
    BarChart3,
    RefreshCw,
    CheckCircle,
    TrendingUp,
    TrendingDown,
    Minus,
    FileSpreadsheet,
    Hash,
    Calendar,
    Mail,
    Phone
} from 'lucide-react';

interface FieldAnalysis {
    field_name: string;
    data_type: 'string' | 'number' | 'date' | 'email' | 'phone' | 'boolean' | 'unknown';
    completeness: number;
    uniqueness: number;
    validity: number;
    sample_values: string[];
    issues: string[];
}

interface QualityResult {
    overall_grade: 'A' | 'B' | 'C' | 'D' | 'F';
    overall_score: number;
    total_rows: number;
    total_columns: number;
    completeness_score: number;
    validity_score: number;
    consistency_score: number;
    uniqueness_score: number;
    field_analyses: FieldAnalysis[];
    recommendations: string[];
}

interface DataQualityDashboardProps {
    fileId?: string;
    csvContent?: string;
    filename?: string;
    onAnalysisComplete?: (result: QualityResult) => void;
}

const DataQualityDashboard: React.FC<DataQualityDashboardProps> = ({
    fileId,
    csvContent,
    filename,
    onAnalysisComplete
}) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<QualityResult | null>(null);

    const runAnalysis = async () => {
        try {
            setLoading(true);
            let response;

            if (fileId) {
                response = await api.analyzeData(fileId);
            } else if (csvContent) {
                response = await api.analyzeDataContent(csvContent, filename || 'data.csv');
            } else {
                throw new Error('No data source provided for analysis');
            }

            if (response.success && response.analysis) {
                // Map backend response to frontend QualityResult format
                // Backend structure: analysis.quality_score, analysis.summary, analysis.field_analyses
                const analysis = response.analysis;
                const qualityScore = analysis.quality_score || {};
                const summary = analysis.summary || {};

                const mappedResult: QualityResult = {
                    overall_grade: qualityScore.grade || analysis.overall_grade || 'C',
                    overall_score: Math.round(qualityScore.overall_score || analysis.overall_score || 0),
                    total_rows: summary.total_rows || analysis.total_rows || 0,
                    total_columns: summary.total_columns || analysis.total_columns || 0,
                    completeness_score: Math.round(qualityScore.completeness_score || analysis.completeness_score || 0),
                    validity_score: Math.round(qualityScore.validity_score || analysis.validity_score || 0),
                    consistency_score: Math.round(qualityScore.consistency_score || analysis.consistency_score || 0),
                    uniqueness_score: Math.round(qualityScore.accuracy_score || analysis.uniqueness_score || 0),
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- transforming unstructured API response
                    field_analyses: (analysis.field_analyses || []).map((f: Record<string, any>) => ({
                        field_name: f.field_name || f.column_name || '',
                        data_type: f.detected_type || f.data_type || 'unknown',
                        completeness: Math.round(100 - (f.null_percentage || 0)),
                        uniqueness: Math.round(f.unique_percentage || 0),
                        validity: Math.round(f.type_consistency || f.validity || 100),
                        sample_values: f.sample_values || [],
                        issues: f.issues || [],
                    })),
                    recommendations: summary.recommendations || analysis.recommendations || [],
                };
                setResult(mappedResult);
                onAnalysisComplete?.(mappedResult);
            }
        } catch (err: unknown) {
            toast({ title: 'Analysis failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const getGradeColor = (grade: string) => {
        switch (grade) {
            case 'A': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
            case 'B': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
            case 'C': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
            case 'D': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
            case 'F': return 'text-red-600 bg-red-100 dark:bg-red-900/30';
            default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-green-600';
        if (score >= 70) return 'text-blue-600';
        if (score >= 50) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getScoreIcon = (score: number) => {
        if (score >= 80) return <TrendingUp className="w-4 h-4 text-green-500" />;
        if (score >= 50) return <Minus className="w-4 h-4 text-yellow-500" />;
        return <TrendingDown className="w-4 h-4 text-red-500" />;
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'number': return <Hash className="w-4 h-4" />;
            case 'date': return <Calendar className="w-4 h-4" />;
            case 'email': return <Mail className="w-4 h-4" />;
            case 'phone': return <Phone className="w-4 h-4" />;
            default: return <FileSpreadsheet className="w-4 h-4" />;
        }
    };

    return (
        <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <BarChart3 className="w-5 h-5" />
                            Data Quality Dashboard
                        </CardTitle>
                        <CardDescription>Comprehensive data quality analysis with A-F grading</CardDescription>
                    </div>
                    <Button onClick={runAnalysis} disabled={loading} variant="outline">
                        {loading ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <BarChart3 className="w-4 h-4 mr-2" />
                        )}
                        {result ? 'Re-analyze' : 'Analyze Quality'}
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {!result && !loading && (
                    <div className="text-center py-8 text-gray-500">
                        <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>Click "Analyze Quality" to get a comprehensive data quality report</p>
                    </div>
                )}

                {loading && (
                    <div className="text-center py-8">
                        <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-500 mb-4" />
                        <p className="text-gray-500">Analyzing data quality...</p>
                    </div>
                )}

                {result && (
                    <div className="space-y-6">
                        {/* Overall Grade */}
                        <div className="flex items-center justify-center gap-8">
                            <div className={`text-center p-6 rounded-xl ${getGradeColor(result.overall_grade)}`}>
                                <div className="text-6xl font-bold">{result.overall_grade}</div>
                                <div className="text-sm mt-1">Overall Grade</div>
                            </div>
                            <div className="text-center">
                                <div className={`text-4xl font-bold ${getScoreColor(result.overall_score)}`}>
                                    {result.overall_score}%
                                </div>
                                <div className="text-sm text-gray-500">Quality Score</div>
                            </div>
                        </div>

                        {/* Dimension Scores */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-500">Completeness</span>
                                    {getScoreIcon(result.completeness_score)}
                                </div>
                                <div className={`text-2xl font-bold ${getScoreColor(result.completeness_score)}`}>
                                    {result.completeness_score}%
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                                    <div
                                        className="bg-blue-500 h-2 rounded-full transition-all"
                                        style={{ width: `${result.completeness_score}%` }}
                                    />
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-500">Validity</span>
                                    {getScoreIcon(result.validity_score)}
                                </div>
                                <div className={`text-2xl font-bold ${getScoreColor(result.validity_score)}`}>
                                    {result.validity_score}%
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                                    <div
                                        className="bg-green-500 h-2 rounded-full transition-all"
                                        style={{ width: `${result.validity_score}%` }}
                                    />
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-500">Consistency</span>
                                    {getScoreIcon(result.consistency_score)}
                                </div>
                                <div className={`text-2xl font-bold ${getScoreColor(result.consistency_score)}`}>
                                    {result.consistency_score}%
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                                    <div
                                        className="bg-purple-500 h-2 rounded-full transition-all"
                                        style={{ width: `${result.consistency_score}%` }}
                                    />
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-500">Uniqueness</span>
                                    {getScoreIcon(result.uniqueness_score)}
                                </div>
                                <div className={`text-2xl font-bold ${getScoreColor(result.uniqueness_score)}`}>
                                    {result.uniqueness_score}%
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                                    <div
                                        className="bg-orange-500 h-2 rounded-full transition-all"
                                        style={{ width: `${result.uniqueness_score}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Field Analysis */}
                        <div>
                            <h3 className="font-semibold mb-3">Field Analysis</h3>
                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                {result.field_analyses.map((field, idx) => (
                                    <div key={idx} className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {getTypeIcon(field.data_type)}
                                                <span className="font-medium">{field.field_name}</span>
                                                <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
                                                    {field.data_type}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className={getScoreColor(field.completeness)}>
                                                    {field.completeness}% complete
                                                </span>
                                                <span className={getScoreColor(field.validity)}>
                                                    {field.validity}% valid
                                                </span>
                                            </div>
                                        </div>
                                        {field.issues.length > 0 && (
                                            <div className="mt-2 flex gap-2 flex-wrap">
                                                {field.issues.map((issue, i) => (
                                                    <span key={i} className="text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded">
                                                        {issue}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recommendations */}
                        {result.recommendations.length > 0 && (
                            <div>
                                <h3 className="font-semibold mb-3">Recommendations</h3>
                                <ul className="space-y-2">
                                    {result.recommendations.map((rec, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm">
                                            <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                            <span>{rec}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default DataQualityDashboard;
