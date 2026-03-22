/**
 * CSV Table - Data table with inline editing
 */

import React, { useState, useMemo } from 'react';
import {
    AlertTriangle,
    Edit3,
    Trash2,
    RotateCcw,
    Loader2,
    CheckCircle,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import type { CSVRow } from './csv-types';

interface CSVTableProps {
    filteredData: Array<{ row: CSVRow; originalIndex: number }>;
    visibleColumns: string[];
    calculatedWidths: Record<string, number>;
    requiredFields: string[];
    deletedRows: Set<number>;
    editingCell: { row: number; col: string } | null;
    editValue: string;
    savingCell: boolean;
    resizingColumn: string | null;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onEditValueChange: (value: string) => void;
    onCellDoubleClick: (rowIdx: number, colName: string) => void;
    onCellSave: () => void;
    onKeyDown: (e: React.KeyboardEvent) => void;
    onDeleteRow: (rowIdx: number) => void;
    onRestoreRow: (rowIdx: number) => void;
    onResizeStart: (e: React.MouseEvent, column: string, currentWidth: number) => void;
    isCellEdited: (rowIdx: number, colName: string) => boolean;
    getCellError: (rowIdx: number, colName: string) => string | undefined;
    validationErrors: Map<string, string>;
}

export const CSVTable: React.FC<CSVTableProps> = ({
    filteredData,
    visibleColumns,
    calculatedWidths,
    requiredFields,
    deletedRows,
    editingCell,
    editValue,
    savingCell,
    resizingColumn,
    inputRef,
    onEditValueChange,
    onCellDoubleClick,
    onCellSave,
    onKeyDown,
    onDeleteRow,
    onRestoreRow,
    onResizeStart,
    isCellEdited,
    getCellError,
    validationErrors,
}) => {
    const ROWS_PER_PAGE = 50;
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.ceil(filteredData.length / ROWS_PER_PAGE);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * ROWS_PER_PAGE;
        return filteredData.slice(start, start + ROWS_PER_PAGE);
    }, [filteredData, currentPage]);

    // Reset to page 1 when data changes (e.g., search)
    React.useEffect(() => {
        setCurrentPage(1);
    }, [filteredData.length]);

    return (
        <div className="space-y-3 mx-6">
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="border-collapse" style={{ minWidth: '100%' }} aria-label="CSV data editor">
                    <thead className="bg-gray-100 dark:bg-gray-900 sticky top-0 z-20">
                        <tr>
                            <th scope="col" className="px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 sticky left-0 z-30" style={{ width: '40px', minWidth: '40px' }}>
                                <CheckCircle className="w-4 h-4 mx-auto text-gray-500" aria-hidden="true" />
                                <span className="sr-only">Status</span>
                            </th>
                            <th scope="col" className="px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 sticky left-[40px] z-30" style={{ width: '50px', minWidth: '50px' }}>
                                #
                            </th>
                            <th scope="col" className="px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-900 sticky left-[90px] z-30" style={{ width: '40px', minWidth: '40px' }}>
                                <Trash2 className="w-4 h-4 mx-auto text-gray-500" aria-hidden="true" />
                                <span className="sr-only">Actions</span>
                            </th>
                            {visibleColumns.map((col, idx) => (
                                <th
                                    key={idx}
                                    scope="col"
                                    className="px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 whitespace-nowrap relative select-none"
                                    style={{ width: `${calculatedWidths[col] || 150}px`, minWidth: `${calculatedWidths[col] || 150}px` }}
                                >
                                    <div className="flex items-center gap-1">
                                        {col}
                                        {requiredFields.includes(col) && (
                                            <span className="text-red-500">*</span>
                                        )}
                                    </div>
                                    <div
                                        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-purple-500 z-10"
                                        onMouseDown={(e) => onResizeStart(e, col, calculatedWidths[col] || 150)}
                                        style={{
                                            backgroundColor: resizingColumn === col ? 'rgb(147 51 234)' : 'transparent',
                                            transition: 'background-color 0.1s'
                                        }}
                                    />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.map(({ row, originalIndex }) => {
                            const isDeleted = deletedRows.has(originalIndex);
                            const rowHasError = Array.from(validationErrors.keys()).some(
                                key => key.startsWith(`${originalIndex}-`)
                            );

                            return (
                                <tr
                                    key={originalIndex}
                                    className={`
                                        border-b border-gray-200 dark:border-gray-700
                                        ${isDeleted ? 'bg-red-50 dark:bg-red-900/20 opacity-60' : ''}
                                        ${!isDeleted && rowHasError ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''}
                                        ${!isDeleted && !rowHasError ? 'hover:bg-gray-50 dark:hover:bg-gray-800/50' : ''}
                                    `}
                                >
                                    <td className="px-1 py-1 text-center border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky left-0 z-10">
                                        {isDeleted ? (
                                            <Trash2 className="w-4 h-4 mx-auto text-red-400" />
                                        ) : rowHasError ? (
                                            <AlertTriangle className="w-4 h-4 mx-auto text-orange-500" />
                                        ) : (
                                            <CheckCircle className="w-4 h-4 mx-auto text-green-500" />
                                        )}
                                    </td>

                                    <td className="px-2 py-1 text-center text-xs font-medium text-gray-500 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky left-[40px] z-10">
                                        {originalIndex + 1}
                                    </td>

                                    <td className="px-2 py-1 text-center border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky left-[90px] z-10">
                                        {isDeleted ? (
                                            <button
                                                onClick={() => onRestoreRow(originalIndex)}
                                                className="p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                                                title="Restore row"
                                                aria-label={`Restore row ${originalIndex + 1}`}
                                            >
                                                <RotateCcw className="w-3.5 h-3.5" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => onDeleteRow(originalIndex)}
                                                className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                                                title="Delete row"
                                                aria-label={`Delete row ${originalIndex + 1}`}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </td>

                                    {visibleColumns.map((col, colIdx) => {
                                        const isEditing = editingCell?.row === originalIndex && editingCell?.col === col;
                                        const cellError = getCellError(originalIndex, col);
                                        const isEdited = isCellEdited(originalIndex, col);
                                        const value = row[col];

                                        return (
                                            <td
                                                key={colIdx}
                                                className={`
                                                    px-3 py-1 text-sm border-r border-gray-200 dark:border-gray-700
                                                    ${isEdited ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                                                    ${cellError ? 'bg-red-100 dark:bg-red-900/30' : ''}
                                                    ${isDeleted ? 'line-through text-gray-400' : 'text-gray-700 dark:text-gray-300'}
                                                    ${!isDeleted && !isEditing ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700' : ''}
                                                `}
                                                style={{ maxWidth: `${calculatedWidths[col] || 150}px` }}
                                                onDoubleClick={() => onCellDoubleClick(originalIndex, col)}
                                                title={cellError || (isEdited ? 'Edited' : 'Double-click to edit')}
                                            >
                                                {isEditing ? (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            ref={inputRef}
                                                            type="text"
                                                            value={editValue}
                                                            onChange={(e) => onEditValueChange(e.target.value)}
                                                            onBlur={() => onCellSave()}
                                                            onKeyDown={onKeyDown}
                                                            disabled={savingCell}
                                                            className="flex-1 px-2 py-1 text-sm border border-purple-500 rounded focus:outline-none focus:ring-1 focus:ring-purple-500 dark:bg-gray-800 dark:text-white disabled:opacity-50"
                                                        />
                                                        {savingCell && (
                                                            <Loader2 className="w-3 h-3 animate-spin text-purple-500" />
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-between">
                                                        <span className="truncate">
                                                            {value !== null && value !== undefined ? String(value) : (
                                                                <span className="text-gray-400 italic">-</span>
                                                            )}
                                                        </span>
                                                        {isEdited && (
                                                            <Edit3 className="w-3 h-3 text-blue-500 ml-1 flex-shrink-0" />
                                                        )}
                                                        {cellError && (
                                                            <AlertTriangle className="w-3 h-3 text-red-500 ml-1 flex-shrink-0" />
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                    Showing {(currentPage - 1) * ROWS_PER_PAGE + 1}-{Math.min(currentPage * ROWS_PER_PAGE, filteredData.length)} of {filteredData.length} rows
                </span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                    </button>
                    <span className="px-2 text-gray-600 dark:text-gray-400">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Next
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        )}
        </div>
    );
};
