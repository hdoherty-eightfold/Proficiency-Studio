import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import {
    Wand2,
    CheckCircle,
    XCircle,
    ChevronDown,
    ChevronUp,
    Eye,
    ArrowRight
} from 'lucide-react';

interface Fix {
    id: string;
    row: number;
    column: string;
    original_value: string;
    suggested_value: string;
    fix_type: 'format' | 'spelling' | 'missing' | 'invalid' | 'duplicate';
    confidence: number;
    reasoning: string;
}

interface AutoFixDialogProps {
    isOpen: boolean;
    onClose: () => void;
    fixes: Fix[];
    onApplyFixes: (selectedFixIds: string[]) => void;
    applying?: boolean;
}

const AutoFixDialog: React.FC<AutoFixDialogProps> = ({
    isOpen,
    onClose,
    fixes,
    onApplyFixes,
    applying = false
}) => {
    const [selectedFixes, setSelectedFixes] = useState<Set<string>>(new Set(fixes.map(f => f.id)));
    const [expandedFix, setExpandedFix] = useState<string | null>(null);

    if (!isOpen) return null;

    const toggleFix = (id: string) => {
        setSelectedFixes(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const selectAll = () => setSelectedFixes(new Set(fixes.map(f => f.id)));
    const deselectAll = () => setSelectedFixes(new Set());

    const getFixTypeColor = (type: string) => {
        switch (type) {
            case 'format': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
            case 'spelling': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
            case 'missing': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
            case 'invalid': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
            case 'duplicate': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
        }
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 90) return 'text-green-600';
        if (confidence >= 70) return 'text-blue-600';
        if (confidence >= 50) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="autofix-dialog-title">
            <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-gray-900">
                <CardHeader className="border-b dark:border-gray-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle id="autofix-dialog-title" className="flex items-center gap-2">
                                <Wand2 className="w-5 h-5 text-purple-500" />
                                AI Auto-Fix Suggestions
                            </CardTitle>
                            <CardDescription>
                                Review and apply AI-suggested fixes to your data
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close auto-fix dialog">
                            <XCircle className="w-5 h-5" />
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
                    {/* Selection Controls */}
                    <div className="p-4 border-b dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                {selectedFixes.size} of {fixes.length} selected
                            </span>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={selectAll}>
                                    Select All
                                </Button>
                                <Button variant="ghost" size="sm" onClick={deselectAll}>
                                    Deselect All
                                </Button>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                onClick={() => onApplyFixes(Array.from(selectedFixes))}
                                disabled={selectedFixes.size === 0 || applying}
                                className="bg-purple-600 hover:bg-purple-700"
                            >
                                {applying ? (
                                    <>Applying...</>
                                ) : (
                                    <>
                                        <Wand2 className="w-4 h-4 mr-2" />
                                        Apply {selectedFixes.size} Fixes
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Fixes List */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {fixes.map((fix) => (
                            <div
                                key={fix.id}
                                className={`border rounded-lg p-4 transition-all cursor-pointer ${
                                    selectedFixes.has(fix.id)
                                        ? 'border-purple-300 bg-purple-50/50 dark:bg-purple-900/10'
                                        : 'border-gray-200 dark:border-gray-700'
                                }`}
                                onClick={() => toggleFix(fix.id)}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Checkbox */}
                                    <div className="pt-1">
                                        <input
                                            type="checkbox"
                                            checked={selectedFixes.has(fix.id)}
                                            onChange={() => toggleFix(fix.id)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-4 h-4 rounded border-gray-300"
                                        />
                                    </div>

                                    {/* Fix Details */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap mb-2">
                                            <span className="text-sm font-medium">
                                                Row {fix.row}, Column: {fix.column}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${getFixTypeColor(fix.fix_type)}`}>
                                                {fix.fix_type}
                                            </span>
                                            <span className={`text-xs font-medium ${getConfidenceColor(fix.confidence)}`}>
                                                {fix.confidence}% confident
                                            </span>
                                        </div>

                                        {/* Before/After */}
                                        <div className="flex items-center gap-2 text-sm">
                                            <div className="flex-1 p-2 bg-red-50 dark:bg-red-900/20 rounded border border-red-200 dark:border-red-800">
                                                <span className="text-xs text-red-500 block mb-1">Original</span>
                                                <code className="text-red-700 dark:text-red-300">
                                                    {fix.original_value || '(empty)'}
                                                </code>
                                            </div>
                                            <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />
                                            <div className="flex-1 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                                                <span className="text-xs text-green-500 block mb-1">Suggested</span>
                                                <code className="text-green-700 dark:text-green-300">
                                                    {fix.suggested_value || '(empty)'}
                                                </code>
                                            </div>
                                        </div>

                                        {/* Reasoning Toggle */}
                                        <button
                                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mt-2"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setExpandedFix(expandedFix === fix.id ? null : fix.id);
                                            }}
                                        >
                                            <Eye className="w-3 h-3" />
                                            {expandedFix === fix.id ? 'Hide' : 'Show'} AI reasoning
                                            {expandedFix === fix.id ? (
                                                <ChevronUp className="w-3 h-3" />
                                            ) : (
                                                <ChevronDown className="w-3 h-3" />
                                            )}
                                        </button>

                                        {expandedFix === fix.id && (
                                            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm text-gray-600 dark:text-gray-400">
                                                {fix.reasoning}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {fixes.length === 0 && (
                            <div className="text-center py-12 text-gray-500">
                                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-300" />
                                <p>No fixes needed! Your data looks good.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AutoFixDialog;
