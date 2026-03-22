import React, { useState, useMemo } from 'react';
import { Button } from '../ui/button';

interface JsonViewerProps {
    data: unknown;
    title?: string;
    maxHeight?: string;
    searchable?: boolean;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({
    data,
    title = "JSON Data",
    maxHeight = "600px",
    searchable = true
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);

    // Convert data to formatted JSON string
    const jsonString = useMemo(() => {
        try {
            return JSON.stringify(data, null, 2);
        } catch (e) {
            return String(data);
        }
    }, [data]);

    // Filter and highlight JSON based on search
    const highlightedJson = useMemo((): { lineNumber: number; content: string }[] => {
        if (!searchTerm || !searchable) {
            return [];
        }

        const lines = jsonString.split('\n');
        const searchLower = searchTerm.toLowerCase();

        return lines
            .map((line, index) => {
                const lineLower = line.toLowerCase();
                if (lineLower.includes(searchLower)) {
                    // Highlight matching text
                    const parts = line.split(new RegExp(`(${searchTerm})`, 'gi'));
                    return {
                        lineNumber: index + 1,
                        content: parts.map((part, _i) =>
                            part.toLowerCase() === searchLower
                                ? `<mark class="bg-yellow-300 text-black">${part}</mark>`
                                : part
                        ).join('')
                    };
                }
                return null;
            })
            .filter((item): item is { lineNumber: number; content: string } => item !== null);
    }, [jsonString, searchTerm, searchable]);

    // Get matching lines or all lines
    const displayLines = useMemo(() => {
        if (!searchTerm || !searchable) {
            return jsonString.split('\n').map((line, index) => ({
                lineNumber: index + 1,
                content: line
            }));
        }
        return highlightedJson;
    }, [jsonString, highlightedJson, searchTerm, searchable]);

    const matchCount = searchTerm ? highlightedJson.length : 0;

    return (
        <div className="border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
            {/* Header */}
            <div className="bg-gray-50 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
                    {searchable && searchTerm && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {matchCount} match{matchCount !== 1 ? 'es' : ''}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {searchable && (
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search JSON..."
                            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            style={{ width: '200px' }}
                        />
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                        {isExpanded ? 'Collapse' : 'Expand'}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            navigator.clipboard.writeText(jsonString);
                        }}
                        className="text-gray-600 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                        📋 Copy
                    </Button>
                </div>
            </div>

            {/* JSON Content */}
            {isExpanded && (
                <div
                    className="overflow-auto bg-gray-900 text-gray-100"
                    style={{ maxHeight }}
                >
                    <pre className="p-4 text-xs font-mono leading-relaxed">
                        <code>
                            {displayLines.map((line, index) => (
                                <div key={index} className="hover:bg-gray-800">
                                    <span className="text-gray-500 select-none inline-block w-12 text-right pr-4">
                                        {line.lineNumber}
                                    </span>
                                    <span
                                        dangerouslySetInnerHTML={{ __html: line.content }}
                                    />
                                </div>
                            ))}
                        </code>
                    </pre>
                </div>
            )}

            {/* Collapsed preview */}
            {!isExpanded && (
                <div className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-mono">
                        {'{'}...{'}'}
                    </span>
                    <span className="ml-2">
                        ({jsonString.split('\n').length} lines)
                    </span>
                </div>
            )}
        </div>
    );
};

export default JsonViewer;
