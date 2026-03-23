/**
 * ExportActions - Reusable export UI for assessment results
 * Supports: Export CSV, Upload SFTP, Export to Eightfold
 * Extracted from ReviewAssessment for use in both Step 4 (completed) and Step 5 (review)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../services/api';
import {
    Download, Send, RefreshCw, CheckCircle, AlertCircle, XCircle,
    Search, Eye, Upload, Server, Settings, StopCircle, RotateCcw, Zap, Clock
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { JsonViewer } from '../common/JsonViewer';
import { useToast } from '../../stores/toast-store';
import type { AssessmentResult } from '../proficiency/assessment-types';

interface ExportDetail {
    role_index: number;
    role_id: string;
    role_title: string;
    request?: Record<string, unknown>;
    response?: Record<string, unknown> & { method_used?: string; total_skills?: number; assessed_skills?: number; success?: boolean; reason?: string; message?: string };
    error?: string;
    success: boolean;
    skipped?: boolean;
    timestamp: string;
    role: EightfoldRole;
    cancelled?: boolean;
}

interface EightfoldRole {
    id: string;
    title: string;
    [key: string]: unknown;
}

interface SFTPCredential {
    id: string;
    name: string;
    host: string;
    port?: number;
    username: string;
}

interface ExportActionsProps {
    assessments: AssessmentResult[];
}

export function ExportActions({ assessments }: ExportActionsProps) {
    const { toast } = useToast();

    // Export state
    const [exporting, setExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [exportLog, setExportLog] = useState<string[]>([]);
    const [exportResults, setExportResults] = useState<{ success: number; failed: number; skipped: number; total: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Details state
    const [exportDetails, setExportDetails] = useState<ExportDetail[]>([]);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState<ExportDetail | null>(null);

    // Context from localStorage
    const [connectedEnvironment, setConnectedEnvironment] = useState('');
    const [availableRoles, setAvailableRoles] = useState<EightfoldRole[]>([]);

    // SFTP state
    const [showSFTPModal, setShowSFTPModal] = useState(false);
    const [sftpCredentials, setSftpCredentials] = useState<SFTPCredential[]>([]);
    const [selectedSFTPCredential, setSelectedSFTPCredential] = useState('');
    const [sftpUploading, setSftpUploading] = useState(false);
    const [sftpRemotePath, setSftpRemotePath] = useState('/');

    // Batch processing
    const [concurrency, setConcurrency] = useState(5);
    const [showExportSettings, setShowExportSettings] = useState(false);
    const cancelRef = useRef(false);

    // Timing
    const [startTime, setStartTime] = useState<number | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);

    // Retry
    const [failedRoles, setFailedRoles] = useState<EightfoldRole[]>([]);

    useEffect(() => {
        loadContext();
        loadSFTPCredentials();
    }, []);

    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (exporting && startTime) {
            interval = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [exporting, startTime]);

    const loadContext = () => {
        const envId = localStorage.getItem('profstudio_env_id');
        const envName = localStorage.getItem('profstudio_env_name') || envId;
        setConnectedEnvironment(envName || 'Not connected');

        const skillsData = localStorage.getItem('skillsExtractionData');
        if (skillsData) {
            try {
                const data = JSON.parse(skillsData);
                if (data.roles && Array.isArray(data.roles)) {
                    setAvailableRoles(data.roles);
                }
            } catch {
                toast({ title: 'Could not load roles for export', variant: 'destructive' });
            }
        }
    };

    const loadSFTPCredentials = async () => {
        try {
            const response = await api.listSFTPCredentials();
            setSftpCredentials((response?.credentials as SFTPCredential[]) || []);
        } catch {
            console.warn('Failed to load SFTP credentials');
        }
    };

    const generateCSVContent = useCallback(() => {
        if (!assessments || assessments.length === 0) return '';
        const headers = ['Skill Name', 'Proficiency Level', 'Proficiency Numeric', 'Confidence Score', 'Reasoning', 'Evidence', 'Years Experience'];
        const csvData = assessments.map(a => [
            a.skill_name,
            a.proficiency_numeric ?? a.proficiency,
            a.proficiency_numeric ?? a.proficiency,
            a.confidence_score,
            a.reasoning,
            a.evidence.join('; '),
            a.years_experience || ''
        ]);
        return [headers, ...csvData]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');
    }, [assessments]);

    const exportToCSV = () => {
        if (!assessments || assessments.length === 0) {
            toast({ title: 'No assessments available to export', variant: 'destructive' });
            return;
        }
        const csvContent = generateCSVContent();
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `proficiency_assessment_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: 'CSV Exported Successfully', variant: 'success' });
    };

    const exportToSFTP = async () => {
        if (!selectedSFTPCredential) {
            toast({ title: 'Please select an SFTP server', variant: 'destructive' });
            return;
        }
        if (!assessments || assessments.length === 0) {
            toast({ title: 'No assessments available to export', variant: 'destructive' });
            return;
        }
        setSftpUploading(true);
        try {
            const csvContent = generateCSVContent();
            const filename = `proficiency_assessment_${new Date().toISOString().split('T')[0]}.csv`;
            const result = await api.uploadToSFTP({
                credential_id: selectedSFTPCredential,
                content: csvContent,
                filename,
                remote_path: sftpRemotePath || undefined
            });
            if (result.success) {
                toast({ title: 'Upload Successful', description: `File uploaded to ${result.path}`, variant: 'success' });
                setShowSFTPModal(false);
            } else {
                toast({ title: 'Upload Failed', description: result.error || 'Unknown error', variant: 'destructive' });
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to upload to SFTP';
            toast({ title: 'Upload Failed', description: message, variant: 'destructive' });
        } finally {
            setSftpUploading(false);
        }
    };

    const formatElapsedTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };

    const cancelExport = () => {
        cancelRef.current = true;
        toast({ title: 'Cancelling export...', variant: 'default' });
    };

    const exportToEightfold = async (rolesToExport?: EightfoldRole[]) => {
        const roles = rolesToExport || availableRoles;
        try {
            setExporting(true);
            setExportLog([]);
            setExportResults(null);
            setError(null);
            setFailedRoles([]);
            cancelRef.current = false;
            setStartTime(Date.now());
            setElapsedTime(0);

            const addLog = (message: string) => {
                const timestamp = new Date().toLocaleTimeString();
                setExportLog(prev => [...prev, `[${timestamp}] ${message}`]);
            };

            addLog('Starting export to Eightfold...');
            addLog(`Concurrency: ${concurrency} parallel requests`);

            if (!assessments || assessments.length === 0) throw new Error('No assessment results to export');
            if (!roles || roles.length === 0) throw new Error('No roles found in context. Please extract skills first.');

            const environmentId = localStorage.getItem('profstudio_env_id');
            if (!environmentId) throw new Error('No environment connected. Please complete Step 2 first.');

            addLog(`Environment: ${connectedEnvironment}`);
            addLog(`Processing ${roles.length} role(s) in batches of ${concurrency}`);

            const proficiencyMap: Record<string, number> = {};
            assessments.forEach(a => {
                proficiencyMap[a.skill_name.toLowerCase().trim()] = a.proficiency_numeric ?? a.proficiency;
            });

            let successCount = 0;
            let failedCount = 0;
            let skippedCount = 0;
            let processedCount = 0;
            const totalRoles = roles.length;
            const details: ExportDetail[] = [];
            const failed: EightfoldRole[] = [];

            const processRole = async (role: EightfoldRole, index: number): Promise<ExportDetail> => {
                if (cancelRef.current) {
                    return { cancelled: true, role, role_index: index + 1, role_id: role.id, role_title: role.title, success: false, timestamp: new Date().toISOString() };
                }
                try {
                    const authToken = localStorage.getItem('profstudio_auth_token');
                    const requestPayload = {
                        assessments, proficiency_map: proficiencyMap,
                        environment_id: environmentId, role_id: role.id,
                        role_title: role.title, role_data: role, auth_token: authToken
                    };
                    const response = await api.post<Record<string, unknown>>('/api/proficiency/export-to-eightfold', requestPayload);
                    const resData = response as ExportDetail['response'];
                    const wasSkipped = resData?.method_used === 'SKIPPED' || resData?.total_skills === 0;
                    return {
                        role_index: index + 1, role_id: role.id, role_title: role.title,
                        request: { ...requestPayload, auth_token: '***' }, response: resData,
                        success: !!resData?.success, skipped: wasSkipped,
                        timestamp: new Date().toISOString(), role
                    };
                } catch (err: unknown) {
                    const message = err instanceof Error ? err.message : 'Unknown error';
                    return { role_index: index + 1, role_id: role.id, role_title: role.title, error: message, success: false, timestamp: new Date().toISOString(), role };
                }
            };

            for (let i = 0; i < roles.length; i += concurrency) {
                if (cancelRef.current) { addLog('Export cancelled by user'); break; }
                const batch = roles.slice(i, i + concurrency);
                const batchNum = Math.floor(i / concurrency) + 1;
                const totalBatches = Math.ceil(roles.length / concurrency);
                addLog(`Batch ${batchNum}/${totalBatches}: Processing ${batch.length} roles in parallel...`);

                const batchResults = await Promise.all(batch.map((role, idx) => processRole(role, i + idx)));

                for (const result of batchResults) {
                    if (result.cancelled) continue;
                    processedCount++;
                    setExportProgress(Math.round((processedCount / totalRoles) * 100));
                    details.push(result);

                    if (result.success) {
                        const logMessage = result.response?.reason || result.response?.message ||
                            `Updated ${result.response?.assessed_skills}/${result.response?.total_skills} skills`;
                        if (result.skipped) { skippedCount++; addLog(`  ${result.role_title}: SKIPPED - ${logMessage}`); }
                        else { successCount++; addLog(`  ${result.role_title}: SUCCESS - ${logMessage}`); }
                    } else {
                        failedCount++;
                        failed.push(result.role);
                        addLog(`  ${result.role_title}: FAILED - ${result.error || result.response?.message || 'Unknown error'}`);
                    }
                }
            }

            setExportDetails(details);
            setFailedRoles(failed);
            setExportResults({ success: successCount, failed: failedCount, skipped: skippedCount, total: totalRoles });

            const finalTime = formatElapsedTime(Math.floor((Date.now() - (startTime || Date.now())) / 1000));
            addLog(`Export complete in ${finalTime}.`);

            if (cancelRef.current) toast({ title: `Export cancelled. Processed ${processedCount}/${totalRoles} roles.`, variant: 'default' });
            else if (successCount > 0) toast({ title: `Successfully exported ${successCount} roles`, variant: 'success' });
            else if (failedCount > 0) toast({ title: `Failed to export ${failedCount} roles`, variant: 'destructive' });

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            toast({ title: message, variant: 'destructive' });
        } finally {
            setExporting(false);
            setExportProgress(100);
            setStartTime(null);
        }
    };

    const retryFailedRoles = () => {
        if (failedRoles.length > 0) exportToEightfold(failedRoles);
    };

    const hasAssessments = assessments.length > 0;

    return (
        <>
            {/* Export Buttons */}
            <div className="flex flex-wrap gap-2 pt-6 border-t">
                <Button variant="outline" onClick={exportToCSV} disabled={!hasAssessments}>
                    <Download className="w-4 h-4 mr-2" /> Export CSV
                </Button>
                <Button variant="outline" onClick={() => setShowSFTPModal(true)} disabled={!hasAssessments}>
                    <Upload className="w-4 h-4 mr-2" /> Upload to SFTP
                </Button>
                <Button
                    variant="outline"
                    onClick={() => setShowExportSettings(true)}
                    disabled={!hasAssessments || exporting || availableRoles.length === 0}
                    title={availableRoles.length === 0 ? 'No roles found — extract skills with roles first' : undefined}
                >
                    {exporting ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Export to Eightfold{availableRoles.length === 0 && ' (no roles)'}
                </Button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative mt-4" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span>{error}</span>
                </div>
            )}

            {/* Export Progress */}
            {(exporting || exportResults) && (
                <Card className="mt-4">
                    <CardHeader className="py-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <RefreshCw className={`w-5 h-5 ${exporting ? 'animate-spin' : ''}`} />
                                Export Progress
                            </CardTitle>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Clock className="w-4 h-4" />
                                    <span>{formatElapsedTime(elapsedTime)}</span>
                                </div>
                                {exporting && (
                                    <div className="flex items-center gap-1 text-sm text-indigo-600 dark:text-indigo-400">
                                        <Zap className="w-4 h-4" />
                                        <span>{concurrency}x parallel</span>
                                    </div>
                                )}
                                {exporting && (
                                    <Button variant="outline" size="sm" onClick={cancelExport}
                                        className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20">
                                        <StopCircle className="w-4 h-4 mr-1" /> Cancel
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {exporting && (
                            <div className="w-full bg-muted rounded-full h-2.5 mb-4">
                                <div className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${exportProgress}%` }} />
                            </div>
                        )}
                        {exportResults && (
                            <div className="grid grid-cols-4 gap-4 mb-4">
                                <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-green-700 dark:text-green-400">{exportResults.success}</div>
                                    <div className="text-xs text-green-600 dark:text-green-500">Success</div>
                                </div>
                                <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{exportResults.skipped}</div>
                                    <div className="text-xs text-yellow-600 dark:text-yellow-500">Skipped</div>
                                </div>
                                <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-red-700 dark:text-red-400">{exportResults.failed}</div>
                                    <div className="text-xs text-red-600 dark:text-red-500">Failed</div>
                                </div>
                                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">{exportResults.total}</div>
                                    <div className="text-xs text-blue-600 dark:text-blue-500">Total</div>
                                </div>
                            </div>
                        )}
                        <div className="bg-gray-900 text-gray-300 p-4 rounded-md font-mono text-xs h-40 overflow-y-auto">
                            {exportLog.map((log, i) => <div key={i}>{log}</div>)}
                        </div>
                        <div className="mt-4 flex justify-center gap-2">
                            {exportDetails.length > 0 && (
                                <Button variant="ghost" onClick={() => setShowDetailsModal(true)}>
                                    <Search className="w-4 h-4 mr-2" /> View Details
                                </Button>
                            )}
                            {!exporting && failedRoles.length > 0 && (
                                <Button variant="outline" onClick={retryFailedRoles}
                                    className="text-orange-600 border-orange-300 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-900/20">
                                    <RotateCcw className="w-4 h-4 mr-2" /> Retry Failed ({failedRoles.length})
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Details Modal */}
            {showDetailsModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="details-modal-title">
                    <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <CardHeader className="border-b flex flex-row items-center justify-between py-4">
                            <CardTitle id="details-modal-title">Export Details</CardTitle>
                            <Button variant="ghost" size="sm" onClick={() => setShowDetailsModal(false)} aria-label="Close export details">
                                <XCircle className="w-5 h-5" />
                            </Button>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
                            {selectedDetail ? (
                                <div className="flex-1 overflow-y-auto p-6">
                                    <Button variant="ghost" size="sm" onClick={() => setSelectedDetail(null)} className="mb-4">
                                        ← Back to List
                                    </Button>
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="font-semibold text-lg mb-2">Request</h3>
                                            <JsonViewer data={selectedDetail.request} title="Request Payload" maxHeight="300px" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-lg mb-2">Response</h3>
                                            <JsonViewer data={selectedDetail.response} title="Response Payload" maxHeight="300px" />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto">
                                    <table className="w-full text-sm text-left" aria-label="Export details by role">
                                        <thead className="bg-muted/50 text-muted-foreground sticky top-0">
                                            <tr>
                                                <th scope="col" className="px-6 py-3">Role</th>
                                                <th scope="col" className="px-6 py-3">Status</th>
                                                <th scope="col" className="px-6 py-3">Time</th>
                                                <th scope="col" className="px-6 py-3">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {exportDetails.map((detail, idx) => (
                                                <tr key={idx} className="border-b hover:bg-muted/30">
                                                    <td className="px-6 py-4 font-medium">{detail.role_title}</td>
                                                    <td className="px-6 py-4">
                                                        {detail.skipped ? (
                                                            <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Skipped</span>
                                                        ) : detail.success ? (
                                                            <span className="text-green-600 dark:text-green-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Success</span>
                                                        ) : (
                                                            <span className="text-red-600 dark:text-red-400 flex items-center gap-1"><XCircle className="w-3 h-3" /> Failed</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-muted-foreground">{new Date(detail.timestamp).toLocaleTimeString()}</td>
                                                    <td className="px-6 py-4">
                                                        <Button variant="ghost" size="sm" onClick={() => setSelectedDetail(detail)}>
                                                            <Eye className="w-3 h-3 mr-1" /> View
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Export Settings Modal */}
            {showExportSettings && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="export-settings-title">
                    <Card className="w-full max-w-md">
                        <CardHeader className="border-b">
                            <div className="flex items-center justify-between">
                                <CardTitle id="export-settings-title" className="flex items-center gap-2">
                                    <Settings className="w-5 h-5" /> Export Settings
                                </CardTitle>
                                <Button variant="ghost" size="sm" onClick={() => setShowExportSettings(false)} aria-label="Close export settings">
                                    <XCircle className="w-5 h-5" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium mb-2">Parallel Requests (Concurrency)</label>
                                <div className="flex items-center gap-4">
                                    <input type="range" min="1" max="10" value={concurrency}
                                        onChange={(e) => setConcurrency(parseInt(e.target.value))}
                                        className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer" />
                                    <span className="w-8 text-center font-bold text-indigo-600 dark:text-indigo-400">{concurrency}</span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">Higher values = faster export, but may hit API rate limits</p>
                            </div>
                            <div className="bg-muted/50 p-4 rounded-md space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Roles to export:</span>
                                    <span className="font-medium">{availableRoles.length}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Assessments:</span>
                                    <span className="font-medium">{assessments.length}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Batch size:</span>
                                    <span className="font-medium">{concurrency} parallel</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Total batches:</span>
                                    <span className="font-medium">{Math.ceil(availableRoles.length / concurrency)}</span>
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button variant="outline" onClick={() => setShowExportSettings(false)} className="flex-1">Cancel</Button>
                                <Button onClick={() => { setShowExportSettings(false); exportToEightfold(); }}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white">
                                    <Zap className="w-4 h-4 mr-2" /> Start Export
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* SFTP Upload Modal */}
            {showSFTPModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="sftp-modal-title">
                    <Card className="w-full max-w-md">
                        <CardHeader className="border-b">
                            <div className="flex items-center justify-between">
                                <CardTitle id="sftp-modal-title" className="flex items-center gap-2">
                                    <Server className="w-5 h-5" /> Upload to SFTP
                                </CardTitle>
                                <Button variant="ghost" size="sm" onClick={() => setShowSFTPModal(false)} aria-label="Close SFTP upload">
                                    <XCircle className="w-5 h-5" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {sftpCredentials.length === 0 ? (
                                <div className="text-center py-4">
                                    <p className="text-muted-foreground mb-2">No SFTP servers configured.</p>
                                    <p className="text-sm text-muted-foreground">Add SFTP credentials in Settings</p>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Select SFTP Server</label>
                                        <select value={selectedSFTPCredential}
                                            onChange={(e) => setSelectedSFTPCredential(e.target.value)}
                                            className="w-full px-3 py-2 border rounded-md bg-background text-foreground">
                                            <option value="">-- Select Server --</option>
                                            {sftpCredentials.map((cred) => (
                                                <option key={cred.id} value={cred.id}>{cred.name} ({cred.host})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Remote Path (optional)</label>
                                        <input type="text" value={sftpRemotePath}
                                            onChange={(e) => setSftpRemotePath(e.target.value)}
                                            placeholder="/uploads"
                                            className="w-full px-3 py-2 border rounded-md bg-background text-foreground" />
                                        <p className="text-xs text-muted-foreground mt-1">Leave empty to use server default path</p>
                                    </div>
                                    <div className="bg-muted/50 p-3 rounded-md">
                                        <p className="text-sm text-muted-foreground">
                                            <strong>File:</strong> proficiency_assessment_{new Date().toISOString().split('T')[0]}.csv
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            <strong>Skills:</strong> {assessments.length} assessments
                                        </p>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <Button variant="outline" onClick={() => setShowSFTPModal(false)} className="flex-1">Cancel</Button>
                                        <Button onClick={exportToSFTP} disabled={!selectedSFTPCredential || sftpUploading}
                                            className="flex-1 bg-teal-600 hover:bg-teal-700 text-white">
                                            {sftpUploading ? (
                                                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                                            ) : (
                                                <><Upload className="w-4 h-4 mr-2" /> Upload</>
                                            )}
                                        </Button>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    );
}
