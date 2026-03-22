import { useState, useEffect } from 'react';
import {
    FileText, Server, HardDrive, CheckCircle,
    Zap, Database, Users, Clock, Activity, Eye, BarChart3
} from 'lucide-react';
import { useAppStore, Skill } from '../../stores/app-store';
import { useToast } from '../../stores/toast-store';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { api } from '../../services/api';
import SkillsTableEditor from './SkillsTableEditor';
import DataQualityDashboard from '../quality/DataQualityDashboard';

// Types
interface ExtractedSkillsResponse {
    skills: Skill[];
    total_count: number;
    extraction_source: 'csv' | 'api' | 'sftp';
    extraction_time: string;
    source_info: Record<string, unknown>;
    roles?: Array<Record<string, unknown>>;
}

export default function ExtractSkills() {
    const {
        skillsState,
        updateSkillsState,
        nextStep,
        setLoading,
        setError,
        isLoading
    } = useAppStore();

    const { toast } = useToast();

    // Local state
    const [showSkillsList, setShowSkillsList] = useState(false);
    const [showQualityDashboard, setShowQualityDashboard] = useState(false);
    const [sourceType, setSourceType] = useState<'csv' | 'api' | 'sftp' | null>(null);
    const [sourceInfo, setSourceInfo] = useState<{ filename?: string | null; fileId?: string | null; csvContent?: string | null } | null>(null);

    // Load integration source from localStorage
    useEffect(() => {
        const integrationType = localStorage.getItem('profstudio_integration_type') as 'csv' | 'api' | 'sftp';
        setSourceType(integrationType);

        if (integrationType === 'csv') {
            setSourceInfo({
                filename: localStorage.getItem('profstudio_csv_filename'),
                fileId: localStorage.getItem('profstudio_csv_file_id'),
                csvContent: localStorage.getItem('profstudio_csv_content'),
            });
        }
    }, []);

    const handleExtractSkills = async () => {
        if (!sourceType) {
            setError('No data source selected. Please go back to Step 1.');
            return;
        }

        try {
            setLoading(true, 'Extracting skills...');
            setError(null);
            updateSkillsState({
                extractionStatus: 'extracting',
                extractionError: null
            });

            let endpoint = '';
            let payload = {};

            switch (sourceType) {
                case 'csv':
                    endpoint = '/api/skills/extract/csv';
                    payload = {
                        filename: sourceInfo?.filename,
                    };
                    // If we had file content stored, we might want to send it, but usually file_id is better
                    // For now assuming backend can handle it or we re-upload if needed.
                    // In the desktop app, we might need a dedicated "re-read file" logic.
                    const content = localStorage.getItem('profstudio_csv_content');
                    if (content) {
                        payload = { ...payload, file_content: content };
                    }
                    break;
                case 'api':
                    endpoint = '/api/skills/extract/api';
                    break;
                case 'sftp':
                    endpoint = '/api/skills/extract/sftp';
                    break;
            }

            const response = await api.post<ExtractedSkillsResponse>(endpoint, payload);

            updateSkillsState({
                skills: response.skills,
                totalCount: response.total_count,
                extractionStatus: 'success',
                extractionSource: response.extraction_source,
                extractionError: null,
                extractedAt: response.extraction_time,
            });

            toast({
                title: "Success",
                description: `Extracted ${response.total_count} skills`
            });

        } catch (err: unknown) {
            console.error('Skills extraction error:', err);
            const message = err instanceof Error ? err.message : 'Failed to extract skills';
            updateSkillsState({
                extractionStatus: 'error',
                extractionError: message
            });
            setError(message);
            toast({
                variant: "destructive",
                title: "Extraction Failed",
                description: message
            });
        } finally {
            setLoading(false);
        }
    };

    const getSourceIcon = () => {
        switch (sourceType) {
            case 'csv': return <FileText className="w-5 h-5" />;
            case 'api': return <Server className="w-5 h-5" />;
            case 'sftp': return <HardDrive className="w-5 h-5" />;
            default: return <Database className="w-5 h-5" />;
        }
    };

    const getSourceLabel = () => {
        switch (sourceType) {
            case 'csv': return 'CSV Upload';
            case 'api': return 'API Connection';
            case 'sftp': return 'SFTP Server';
            default: return 'Unknown Source';
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-8 fade-in">
            <Card className="border-none shadow-none bg-transparent">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-success/20 to-success/5 mb-4">
                        <Zap className="w-8 h-8 text-success" />
                    </div>
                    <h2 className="text-3xl font-bold mb-2">
                        Extract Skills
                    </h2>
                    <p className="text-muted-foreground">
                        Extract unique skills from your selected data source
                    </p>
                </div>

                {/* Data Source Info */}
                <div className="mb-8 p-4 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {getSourceIcon()}
                            <div>
                                <p className="font-semibold text-foreground">
                                    Data Source: {getSourceLabel()}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {sourceType === 'csv' && sourceInfo?.filename && `File: ${sourceInfo.filename}`}
                                </p>
                            </div>
                        </div>
                        {skillsState.extractionStatus === 'success' && (
                            <div className="flex items-center gap-2 text-sm text-success">
                                <CheckCircle className="w-4 h-4" />
                                <span>Extracted {skillsState.totalCount} skills</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <Card variant="outlined" className="bg-primary/5 border-primary/20">
                        <CardContent className="p-6 text-center">
                            <div className="inline-flex justify-center items-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
                                <Database className="w-6 h-6 text-primary" />
                            </div>
                            <div className="text-2xl font-bold">{skillsState.totalCount}</div>
                            <div className="text-sm text-muted-foreground">Total Skills</div>
                        </CardContent>
                    </Card>

                    <Card variant="outlined" className="bg-warning/5 border-warning/20">
                        <CardContent className="p-6 text-center">
                            <div className="inline-flex justify-center items-center w-12 h-12 rounded-xl bg-warning/10 mb-3">
                                <Users className="w-6 h-6 text-warning" />
                            </div>
                            <div className="text-2xl font-bold">0</div>
                            <div className="text-sm text-muted-foreground">Roles Found</div>
                        </CardContent>
                    </Card>

                    <Card variant="outlined" className="bg-success/5 border-success/20">
                        <CardContent className="p-6 text-center">
                            <div className="inline-flex justify-center items-center w-12 h-12 rounded-xl bg-success/10 mb-3">
                                <Activity className="w-6 h-6 text-success" />
                            </div>
                            <div className="text-xl font-bold capitalize">
                                {skillsState.extractionStatus === 'idle' ? 'Pending' : skillsState.extractionStatus}
                            </div>
                            <div className="text-sm text-muted-foreground">Status</div>
                        </CardContent>
                    </Card>

                    <Card variant="outlined" className="bg-info/5 border-info/20">
                        <CardContent className="p-6 text-center">
                            <div className="inline-flex justify-center items-center w-12 h-12 rounded-xl bg-info/10 mb-3">
                                <Clock className="w-6 h-6 text-info" />
                            </div>
                            <div className="text-lg font-bold">
                                {skillsState.extractedAt ? new Date(skillsState.extractedAt).toLocaleDateString() : '--'}
                            </div>
                            <div className="text-sm text-muted-foreground">Last Extracted</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Actions */}
                {skillsState.extractionStatus !== 'success' && (
                    <div className="flex justify-center mb-8">
                        <Button
                            size="lg"
                            onClick={handleExtractSkills}
                            disabled={isLoading || !sourceType}
                            className="px-8"
                        >
                            {isLoading ? 'Extracting...' : 'Extract Skills'}
                        </Button>
                    </div>
                )}

                {skillsState.extractionStatus === 'success' && (
                    <div className="space-y-6">
                        <div className="flex justify-center gap-3">
                            <Button
                                variant="secondary"
                                onClick={() => setShowSkillsList(!showSkillsList)}
                                className="gap-2"
                            >
                                <Eye className="w-4 h-4" />
                                {showSkillsList ? 'Hide' : 'View'} Skills List
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => setShowQualityDashboard(!showQualityDashboard)}
                                className="gap-2"
                            >
                                <BarChart3 className="w-4 h-4" />
                                {showQualityDashboard ? 'Hide' : 'Show'} Quality Analysis
                            </Button>
                            <Button onClick={nextStep}>
                                Continue
                            </Button>
                        </div>

                        {showSkillsList && (
                            <div className="mt-6">
                                <SkillsTableEditor
                                    skills={skillsState.skills}
                                    onSkillsChange={(updatedSkills) => {
                                        updateSkillsState({ skills: updatedSkills });
                                        localStorage.setItem('extractedSkills', JSON.stringify(updatedSkills));
                                    }}
                                />
                            </div>
                        )}

                        {showQualityDashboard && (sourceInfo?.fileId || sourceInfo?.csvContent) && (
                            <div className="mt-6">
                                <DataQualityDashboard
                                    fileId={sourceInfo?.fileId ?? undefined}
                                    csvContent={sourceInfo?.csvContent ?? undefined}
                                    filename={sourceInfo?.filename ?? undefined}
                                    onAnalysisComplete={(result) => {
                                        toast({
                                            title: `Data Quality: Grade ${result.overall_grade}`,
                                            description: `Overall score: ${result.overall_score}%`
                                        });
                                    }}
                                />
                            </div>
                        )}

                        {showQualityDashboard && !sourceInfo?.fileId && !sourceInfo?.csvContent && (
                            <div className="mt-6 p-4 bg-warning/10 border border-warning/20 rounded-lg text-center">
                                <p className="text-warning-foreground">
                                    Quality analysis is only available for CSV file uploads.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </Card>
        </div>
    );
}
