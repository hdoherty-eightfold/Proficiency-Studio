import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { useToast } from '../../stores/toast-store';
import {
    Download,
    FileSpreadsheet,
    FileJson,
    FileText,
    CheckCircle,
    AlertCircle,
    Loader2,
    X,
    Settings,
    History,
    Eye
} from 'lucide-react';

interface ExportOptions {
    format: 'json' | 'csv' | 'xlsx';
    includeMetadata: boolean;
    includeTimestamps: boolean;
    includeConfidence: boolean;
    prettify: boolean;
}

interface ExportHistoryItem {
    id: string;
    format: string;
    created_at: string;
    filename: string;
    size_bytes?: number;
    status: 'completed' | 'failed';
}

interface ExportDialogProps {
    isOpen: boolean;
    onClose: () => void;
    assessmentId?: string;
    batchId?: string;
    data?: unknown;
    title?: string;
}

const ExportDialog: React.FC<ExportDialogProps> = ({
    isOpen,
    onClose,
    assessmentId,
    batchId,
    data,
    title = 'Export Data'
}) => {
    const { toast } = useToast();
    const [options, setOptions] = useState<ExportOptions>({
        format: 'json',
        includeMetadata: true,
        includeTimestamps: true,
        includeConfidence: true,
        prettify: true
    });
    const [exporting, setExporting] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState<ExportHistoryItem[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Fetch export history
    useEffect(() => {
        if (showHistory) {
            fetchHistory();
        }
    }, [showHistory]);

    const fetchHistory = async () => {
        try {
            setLoadingHistory(true);
            const response = await api.getExportHistory();
            setHistory(response.exports || []);
        } catch (err: unknown) {
            console.error('Failed to fetch export history:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const getFormatIcon = (format: string) => {
        switch (format) {
            case 'json':
                return <FileJson className="w-5 h-5" />;
            case 'csv':
                return <FileSpreadsheet className="w-5 h-5" />;
            case 'xlsx':
                return <FileSpreadsheet className="w-5 h-5 text-green-600" />;
            default:
                return <FileText className="w-5 h-5" />;
        }
    };

    const handlePreview = () => {
        if (!data && !assessmentId) {
            toast({
                title: 'No data to preview',
                description: 'Please provide data or assessment ID',
                variant: 'destructive'
            });
            return;
        }

        let previewContent = '';

        if (options.format === 'json') {
            const exportData = data || { assessmentId, message: 'Preview will show actual data after export' };
            previewContent = options.prettify
                ? JSON.stringify(exportData, null, 2)
                : JSON.stringify(exportData);
        } else if (options.format === 'csv') {
            // Simple CSV preview
            previewContent = 'skill_name,proficiency_level,confidence,timestamp\n';
            previewContent += '"Example Skill",4,0.85,"2024-01-29T10:00:00Z"\n';
            previewContent += '"Another Skill",3,0.92,"2024-01-29T10:00:00Z"';
        } else {
            previewContent = '[Excel preview not available - will generate .xlsx file on export]';
        }

        setPreview(previewContent);
    };

    const handleExport = async () => {
        try {
            setExporting(true);

            let response;
            const exportParams = {
                format: options.format,
                include_metadata: options.includeMetadata,
                include_timestamps: options.includeTimestamps,
                include_confidence: options.includeConfidence
            };

            if (assessmentId) {
                response = await api.exportAssessment(assessmentId, exportParams);
            } else if (batchId) {
                response = await api.exportBatch(batchId, exportParams);
            } else if (data) {
                // exportData only supports csv/xml, so convert json/xlsx to csv for the API
                const exportFormat: 'csv' | 'xml' = options.format === 'json' ? 'csv' : (options.format === 'xlsx' ? 'csv' : 'csv');
                response = await api.exportData(exportFormat, {
                    data,
                    ...exportParams
                });
            } else {
                toast({
                    title: 'Export failed',
                    description: 'No data provided for export',
                    variant: 'destructive'
                });
                return;
            }

            // Handle download
            if (response.download_url) {
                window.open(response.download_url, '_blank');
            } else if (response.content) {
                // Create download from content
                const blob = new Blob([response.content], {
                    type: options.format === 'json' ? 'application/json' : 'text/csv'
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `export_${Date.now()}.${options.format}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }

            toast({
                title: 'Export successful',
                description: `Data exported as ${options.format.toUpperCase()}`
            });

            onClose();
        } catch (err: unknown) {
            toast({
                title: 'Export failed',
                description: err instanceof Error ? err.message : 'Unknown error',
                variant: 'destructive'
            });
        } finally {
            setExporting(false);
        }
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return 'N/A';
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="export-dialog-title">
            <Card className="w-full max-w-lg bg-white dark:bg-gray-800 max-h-[90vh] overflow-hidden flex flex-col">
                <CardHeader className="border-b dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle id="export-dialog-title" className="flex items-center gap-2">
                                <Download className="w-5 h-5" />
                                {title}
                            </CardTitle>
                            <CardDescription>
                                Choose format and options for export
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close export dialog">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-y-auto py-4">
                    {/* Tab buttons */}
                    <div className="flex gap-2 mb-4">
                        <Button
                            variant={!showHistory ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setShowHistory(false)}
                        >
                            <Settings className="w-4 h-4 mr-2" />
                            Export Options
                        </Button>
                        <Button
                            variant={showHistory ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setShowHistory(true)}
                        >
                            <History className="w-4 h-4 mr-2" />
                            History
                        </Button>
                    </div>

                    {!showHistory ? (
                        <div className="space-y-6">
                            {/* Format Selection */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Export Format</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['json', 'csv', 'xlsx'] as const).map((format) => (
                                        <button
                                            key={format}
                                            onClick={() => setOptions(prev => ({ ...prev, format }))}
                                            className={`p-3 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                                                options.format === format
                                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                            }`}
                                        >
                                            {getFormatIcon(format)}
                                            <span className="text-sm font-medium uppercase">{format}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Options */}
                            <div>
                                <label className="block text-sm font-medium mb-2">Options</label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={options.includeMetadata}
                                            onChange={(e) => setOptions(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                                            className="rounded"
                                        />
                                        <span className="text-sm">Include metadata (IDs, sources)</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={options.includeTimestamps}
                                            onChange={(e) => setOptions(prev => ({ ...prev, includeTimestamps: e.target.checked }))}
                                            className="rounded"
                                        />
                                        <span className="text-sm">Include timestamps</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={options.includeConfidence}
                                            onChange={(e) => setOptions(prev => ({ ...prev, includeConfidence: e.target.checked }))}
                                            className="rounded"
                                        />
                                        <span className="text-sm">Include confidence scores</span>
                                    </label>
                                    {options.format === 'json' && (
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={options.prettify}
                                                onChange={(e) => setOptions(prev => ({ ...prev, prettify: e.target.checked }))}
                                                className="rounded"
                                            />
                                            <span className="text-sm">Pretty print (formatted)</span>
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Preview */}
                            {preview && (
                                <div>
                                    <label className="block text-sm font-medium mb-2">Preview</label>
                                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg max-h-[200px] overflow-auto">
                                        <pre className="text-xs font-mono whitespace-pre-wrap">{preview}</pre>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handlePreview} className="flex-1">
                                    <Eye className="w-4 h-4 mr-2" />
                                    Preview
                                </Button>
                                <Button onClick={handleExport} disabled={exporting} className="flex-1">
                                    {exporting ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Download className="w-4 h-4 mr-2" />
                                    )}
                                    Export
                                </Button>
                            </div>
                        </div>
                    ) : (
                        /* History Tab */
                        <div>
                            {loadingHistory ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                                </div>
                            ) : history.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                    <p>No export history yet</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {history.map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                {getFormatIcon(item.format)}
                                                <div>
                                                    <p className="text-sm font-medium">{item.filename || `export.${item.format}`}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(item.created_at).toLocaleString()} • {formatFileSize(item.size_bytes)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {item.status === 'completed' ? (
                                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                                ) : (
                                                    <AlertCircle className="w-4 h-4 text-red-500" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ExportDialog;
