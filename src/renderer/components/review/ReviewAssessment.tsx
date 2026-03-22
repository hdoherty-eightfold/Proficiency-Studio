/**
 * Review & Export - Step 5
 * Shows assessment results table and export options
 * Loads data from localStorage for direct navigation
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../stores/app-store';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ExportActions } from './ExportActions';
import type { AssessmentResult } from '../proficiency/assessment-types';

const ReviewAssessment: React.FC = () => {
    const { setCurrentStep } = useAppStore();
    const [assessments, setAssessments] = useState<AssessmentResult[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = () => {
        const saved = localStorage.getItem('assessmentResults');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    setAssessments(parsed);
                } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.assessments)) {
                    setAssessments(parsed.assessments);
                }
            } catch (e) {
                console.error('Failed to load assessments:', e);
            }
        }
    };

    const getConfidenceColor = useCallback((score: number) => {
        if (score >= 0.8) return 'text-green-600 dark:text-green-400';
        if (score >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
        return 'text-red-600 dark:text-red-400';
    }, []);

    return (
        <div className="h-full flex flex-col p-6 space-y-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Review & Export</h1>
                    <p className="text-muted-foreground text-gray-500 dark:text-gray-400">Review assessment results and export to Eightfold</p>
                </div>
                <Button variant="outline" onClick={() => setCurrentStep(4)}>Back</Button>
            </div>

            {/* Results Table */}
            <Card className="bg-white dark:bg-gray-800">
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                        <CardTitle className="text-lg">Assessment Results</CardTitle>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {assessments.length} skills assessed
                        </span>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm" aria-label="Assessment results">
                            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 text-xs uppercase tracking-wider">
                                <tr>
                                    <th scope="col" className="px-4 py-3 text-left font-medium">Skill</th>
                                    <th scope="col" className="px-4 py-3 text-center font-medium w-20">Level</th>
                                    <th scope="col" className="px-4 py-3 text-center font-medium w-24">Confidence</th>
                                    <th scope="col" className="px-4 py-3 text-left font-medium">Reasoning</th>
                                    <th scope="col" className="px-4 py-3 text-center font-medium w-20">Evidence</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {assessments.map((assessment, idx) => {
                                    const level = assessment.proficiency_numeric ?? assessment.proficiency;
                                    return (
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-4 py-3">
                                                <span className="font-medium text-gray-900 dark:text-white">{assessment.skill_name}</span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                                                    level >= 4 ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' :
                                                    level >= 3 ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                                                    level >= 2 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                                                    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                                                }`}>
                                                    {level}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${
                                                                assessment.confidence_score >= 0.8 ? 'bg-green-500' :
                                                                assessment.confidence_score >= 0.6 ? 'bg-yellow-500' :
                                                                'bg-red-500'
                                                            }`}
                                                            style={{ width: `${assessment.confidence_score * 100}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-xs font-medium ${getConfidenceColor(assessment.confidence_score)}`}>
                                                        {(assessment.confidence_score * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-gray-600 dark:text-gray-400 text-xs line-clamp-2 max-w-md" title={assessment.reasoning}>
                                                    {assessment.reasoning || <span className="italic text-gray-400">No reasoning provided</span>}
                                                </p>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-medium ${
                                                    assessment.evidence.length > 0
                                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                                                        : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                                }`}>
                                                    {assessment.evidence.length}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {assessments.length === 0 && (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <p>No assessment results available.</p>
                            <p className="text-sm mt-1">Run an assessment in the previous step to see results here.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Export Actions */}
            <ExportActions assessments={assessments} />
        </div>
    );
};

export default ReviewAssessment;
