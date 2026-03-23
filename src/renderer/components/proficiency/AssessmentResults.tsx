/**
 * Assessment Results - Completed phase UI
 * Shows summary stats and grouped skill results
 */

import { useState, useMemo, useCallback } from 'react';
import { Award } from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { getProficiencyBadgeClasses, getProficiencyNames } from '../../config/proficiency';
import { ExportActions } from '../review/ExportActions';
import type { AssessmentResponse, AssessmentResult } from './assessment-types';

interface AssessmentResultsProps {
    results: AssessmentResponse;
    onRestart: () => void;
}

export function AssessmentResults({ results, onRestart }: AssessmentResultsProps) {
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    const getProficiencyColor = useCallback((level: number) => getProficiencyBadgeClasses(level), []);

    const groupSkillsByCategory = useCallback((assessments: AssessmentResult[]) => {
        const grouped: { [key: string]: AssessmentResult[] } = {};
        assessments.forEach(assessment => {
            const category = assessment.category || 'Uncategorized';
            if (!grouped[category]) grouped[category] = [];
            grouped[category].push(assessment);
        });
        return grouped;
    }, []);

    const groupedResults = useMemo(() => {
        return groupSkillsByCategory(results.assessments);
    }, [results, groupSkillsByCategory]);

    const toggleCategory = (category: string) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(category)) {
            newExpanded.delete(category);
        } else {
            newExpanded.add(category);
        }
        setExpandedCategories(newExpanded);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">Total Skills</div>
                    <div className="text-2xl font-bold">{results.total_skills}</div>
                </Card>
                <Card className="p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                    <div className="text-sm text-green-600 dark:text-green-400 mb-1">Avg Proficiency</div>
                    <div className="text-2xl font-bold">{results.avg_proficiency.toFixed(1)}</div>
                </Card>
                <Card className="p-4 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
                    <div className="text-sm text-purple-600 dark:text-purple-400 mb-1">Processing Time</div>
                    <div className="text-2xl font-bold">{results.processing_time.toFixed(1)}s</div>
                </Card>
                <Card className="p-4 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800">
                    <div className="text-sm text-orange-600 dark:text-orange-400 mb-1">Model</div>
                    <div className="text-lg font-bold truncate" title={results.model_used}>
                        {results.model_used.split('/')[1] || results.model_used}
                    </div>
                </Card>
            </div>

            {/* Results List */}
            <div>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-yellow-500" /> Assessment Results
                </h3>

                <div className="grid grid-cols-1 gap-4">
                    {Object.entries(groupedResults).map(([category, skills]) => (
                        <Card key={category} className="overflow-hidden">
                            <div
                                className="p-4 bg-muted/50 flex justify-between items-center cursor-pointer hover:bg-muted/70 transition-colors"
                                onClick={() => toggleCategory(category)}
                                role="button"
                                tabIndex={0}
                                aria-expanded={expandedCategories.has(category)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleCategory(category); } }}
                            >
                                <div className="font-semibold flex items-center gap-2">
                                    {category}
                                    <span className="px-2 py-0.5 bg-background rounded-full text-xs border">
                                        {skills.length}
                                    </span>
                                </div>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" aria-label={expandedCategories.has(category) ? `Collapse ${category}` : `Expand ${category}`}>
                                    {expandedCategories.has(category) ? '-' : '+'}
                                </Button>
                            </div>

                            {expandedCategories.has(category) && (
                                <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {skills.map((skill, idx) => (
                                        <div key={idx} className="p-3 rounded-lg border border-border/50 hover:bg-muted/10 transition-colors">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <h4 className="font-semibold text-sm text-foreground truncate">{skill.skill_name}</h4>
                                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {(skill.confidence_score * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getProficiencyColor(skill.proficiency)}`}>
                                                L{skill.proficiency}: {getProficiencyNames()[skill.proficiency - 1]}
                                            </span>
                                            {skill.reasoning && (
                                                <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                                    {skill.reasoning}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    ))}
                </div>
            </div>

            {/* Export Actions */}
            <ExportActions assessments={results.assessments} />

            {/* Actions */}
            <div className="flex justify-end gap-4 pt-4">
                <Button variant="outline" onClick={onRestart}>Run New Assessment</Button>
            </div>
        </div>
    );
}
