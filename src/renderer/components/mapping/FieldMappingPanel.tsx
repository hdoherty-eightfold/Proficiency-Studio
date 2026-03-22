import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { useToast } from '../../stores/toast-store';
import {
    ArrowRight,
    RefreshCw,
    CheckCircle,
    Brain,
    Sparkles,
    Link2,
    Unlink,
    Save,
    Eye
} from 'lucide-react';

// 4-Tier Confidence System
type ConfidenceTier = 'T1' | 'T2' | 'T3' | 'T4';

interface FieldMapping {
    source_field: string;
    target_field: string | null;
    confidence: number;
    tier: ConfidenceTier;
    reasoning?: string;
    source: 'alias' | 'vector' | 'ai' | 'manual';
    confirmed: boolean;
}

interface FieldMappingPanelProps {
    sourceFields: string[];
    entityName: string;
    onMappingsComplete?: (mappings: FieldMapping[]) => void;
}

const TIER_CONFIG = {
    T1: { label: 'Exact Match', color: 'green', bgColor: 'bg-green-100 dark:bg-green-900/30', textColor: 'text-green-700 dark:text-green-300', range: '85-100%', source: 'Alias dictionary' },
    T2: { label: 'Semantic Match', color: 'blue', bgColor: 'bg-blue-100 dark:bg-blue-900/30', textColor: 'text-blue-700 dark:text-blue-300', range: '70-85%', source: 'Vector similarity' },
    T3: { label: 'AI Suggested', color: 'purple', bgColor: 'bg-purple-100 dark:bg-purple-900/30', textColor: 'text-purple-700 dark:text-purple-300', range: '40-70%', source: 'Gemini reasoning' },
    T4: { label: 'Manual Review', color: 'amber', bgColor: 'bg-amber-100 dark:bg-amber-900/30', textColor: 'text-amber-700 dark:text-amber-300', range: '<40%', source: 'Human input needed' }
};

const FieldMappingPanel: React.FC<FieldMappingPanelProps> = ({
    sourceFields,
    entityName,
    onMappingsComplete
}) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [mappings, setMappings] = useState<FieldMapping[]>([]);
    const [expandedField, setExpandedField] = useState<string | null>(null);
    const [targetSchema, setTargetSchema] = useState<string[]>([]);

    // Initialize mappings when source fields change
    useEffect(() => {
        if (sourceFields.length > 0 && mappings.length === 0) {
            setMappings(sourceFields.map(field => ({
                source_field: field,
                target_field: null,
                confidence: 0,
                tier: 'T4',
                source: 'manual',
                confirmed: false
            })));
        }
    }, [sourceFields, mappings.length]);

    const runAutoMapping = async () => {
        try {
            setLoading(true);
            const response = await api.autoMapFields(sourceFields, entityName);

            if (response.status === 'success' && response.mappings) {
                const mappedResults: FieldMapping[] = response.mappings.map(m => ({
                    source_field: m.source_field,
                    target_field: m.target_field,
                    confidence: m.confidence,
                    tier: m.tier || getTierFromConfidence(m.confidence),
                    source: m.source || 'ai' as const,
                    confirmed: m.confirmed || false,
                    reasoning: m.reasoning,
                }));
                setMappings(mappedResults);
                setTargetSchema(response.target_schema || []);

                const autoMapped = mappedResults.filter(m => m.target_field).length;
                toast({
                    title: 'Auto-mapping complete',
                    description: `${autoMapped}/${sourceFields.length} fields mapped automatically`
                });
            }
        } catch (err: unknown) {
            toast({ title: 'Auto-mapping failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const getSuggestion = async (sourceField: string) => {
        try {
            const response = await api.suggestMapping(sourceField, entityName);
            if (response.suggestions && response.suggestions.length > 0) {
                const best = response.suggestions[0];
                updateMapping(sourceField, {
                    target_field: best.target_field,
                    confidence: best.confidence,
                    tier: getTierFromConfidence(best.confidence),
                    reasoning: best.reason,
                    source: 'ai'
                });
            }
        } catch (err: unknown) {
            toast({ title: 'Suggestion failed', variant: 'destructive' });
        }
    };

    const getTierFromConfidence = (confidence: number): ConfidenceTier => {
        if (confidence >= 85) return 'T1';
        if (confidence >= 70) return 'T2';
        if (confidence >= 40) return 'T3';
        return 'T4';
    };

    const updateMapping = (sourceField: string, updates: Partial<FieldMapping>) => {
        setMappings(prev => prev.map(m =>
            m.source_field === sourceField ? { ...m, ...updates } : m
        ));
    };

    const confirmMapping = (sourceField: string) => {
        updateMapping(sourceField, { confirmed: true });
    };

    const clearMapping = (sourceField: string) => {
        updateMapping(sourceField, {
            target_field: null,
            confidence: 0,
            tier: 'T4',
            confirmed: false,
            reasoning: undefined
        });
    };

    const saveMappings = async () => {
        try {
            setSaving(true);
            const confirmedMappings = mappings.filter(m => m.confirmed && m.target_field);
            await api.saveFieldMappings(confirmedMappings.map(m => ({
                source_field: m.source_field,
                target_field: m.target_field!,
            })));
            toast({ title: 'Mappings saved!', description: `${confirmedMappings.length} mappings saved` });
            onMappingsComplete?.(confirmedMappings);
        } catch (err: unknown) {
            toast({ title: 'Failed to save', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    const getConfirmedCount = () => mappings.filter(m => m.confirmed).length;
    const getMappedCount = () => mappings.filter(m => m.target_field).length;

    const TierBadge: React.FC<{ tier: ConfidenceTier; confidence: number }> = ({ tier, confidence }) => {
        const config = TIER_CONFIG[tier];
        return (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}>
                <span>{tier}</span>
                <span>{confidence}%</span>
            </div>
        );
    };

    return (
        <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Link2 className="w-5 h-5" />
                            Field Mapping
                        </CardTitle>
                        <CardDescription>
                            Map source fields to target schema with 4-tier confidence scoring
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={runAutoMapping} disabled={loading} variant="outline">
                            {loading ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Sparkles className="w-4 h-4 mr-2" />
                            )}
                            Auto-Map All
                        </Button>
                        <Button
                            onClick={saveMappings}
                            disabled={saving || getConfirmedCount() === 0}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {saving ? (
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                                <Save className="w-4 h-4 mr-2" />
                            )}
                            Save ({getConfirmedCount()})
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {/* Tier Legend */}
                <div className="flex flex-wrap gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    {Object.entries(TIER_CONFIG).map(([tier, config]) => (
                        <div key={tier} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bgColor}`}>
                            <span className={`font-bold ${config.textColor}`}>{tier}</span>
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                                {config.range} • {config.source}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Progress */}
                <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                        <span>{getMappedCount()}/{sourceFields.length} mapped</span>
                        <span>{getConfirmedCount()} confirmed</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${(getConfirmedCount() / sourceFields.length) * 100}%` }}
                        />
                    </div>
                </div>

                {/* Mappings List */}
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {mappings.map((mapping) => (
                        <div
                            key={mapping.source_field}
                            className={`border rounded-lg p-3 transition-all ${
                                mapping.confirmed
                                    ? 'border-green-300 bg-green-50/50 dark:bg-green-900/10'
                                    : 'border-gray-200 dark:border-gray-700'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                {/* Source Field */}
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-sm truncate">{mapping.source_field}</div>
                                </div>

                                {/* Arrow */}
                                <ArrowRight className="w-4 h-4 text-gray-400 shrink-0" />

                                {/* Target Field */}
                                <div className="flex-1 min-w-0">
                                    {mapping.target_field ? (
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm text-green-700 dark:text-green-300 truncate">
                                                {mapping.target_field}
                                            </span>
                                            <TierBadge tier={mapping.tier} confidence={mapping.confidence} />
                                        </div>
                                    ) : (
                                        <select
                                            className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-gray-900"
                                            value=""
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    updateMapping(mapping.source_field, {
                                                        target_field: e.target.value,
                                                        confidence: 100,
                                                        tier: 'T1',
                                                        source: 'manual'
                                                    });
                                                }
                                            }}
                                        >
                                            <option value="">Select target field...</option>
                                            {targetSchema.map(field => (
                                                <option key={field} value={field}>{field}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 shrink-0">
                                    {!mapping.target_field && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => getSuggestion(mapping.source_field)}
                                            title="Get AI suggestion"
                                        >
                                            <Brain className="w-4 h-4" />
                                        </Button>
                                    )}
                                    {mapping.target_field && !mapping.confirmed && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => confirmMapping(mapping.source_field)}
                                            className="text-green-600"
                                            title="Confirm mapping"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                        </Button>
                                    )}
                                    {mapping.target_field && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => clearMapping(mapping.source_field)}
                                            className="text-red-600"
                                            title="Clear mapping"
                                        >
                                            <Unlink className="w-4 h-4" />
                                        </Button>
                                    )}
                                    {mapping.reasoning && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setExpandedField(
                                                expandedField === mapping.source_field ? null : mapping.source_field
                                            )}
                                            title="View AI reasoning"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    )}
                                    {mapping.confirmed && (
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                    )}
                                </div>
                            </div>

                            {/* AI Reasoning (Expanded) */}
                            {expandedField === mapping.source_field && mapping.reasoning && (
                                <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded text-sm">
                                    <div className="flex items-center gap-1 text-purple-700 dark:text-purple-300 font-medium mb-1">
                                        <Brain className="w-3 h-3" />
                                        AI Reasoning
                                    </div>
                                    <p className="text-gray-600 dark:text-gray-400">{mapping.reasoning}</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};

export default FieldMappingPanel;
