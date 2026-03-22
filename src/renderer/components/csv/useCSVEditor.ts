/**
 * Hook encapsulating CSV editor state and logic
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../stores/toast-store';
import type { CSVRow, PendingUpdate, ValidationSummary } from './csv-types';

interface UseCSVEditorOptions {
    fileId: string;
    entityName: string;
    requiredFields: string[];
    onDataChange?: (data: CSVRow[]) => void;
    onSave?: () => void;
    onExport?: () => void;
}

export function useCSVEditor({
    fileId,
    entityName,
    requiredFields,
    onDataChange,
    onSave,
    onExport,
}: UseCSVEditorOptions) {
    const { toast } = useToast();

    // Data state
    const [data, setData] = useState<CSVRow[]>([]);
    const [columns, setColumns] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Editing state
    const [editingCell, setEditingCell] = useState<{ row: number; col: string } | null>(null);
    const [editValue, setEditValue] = useState('');
    const [pendingUpdates, setPendingUpdates] = useState<Map<string, PendingUpdate>>(new Map());
    const [deletedRows, setDeletedRows] = useState<Set<number>>(new Set());
    const inputRef = useRef<HTMLInputElement>(null);

    // Validation state
    const [validationErrors, setValidationErrors] = useState<Map<string, string>>(new Map());

    // Search state
    const [searchTerm, setSearchTerm] = useState('');

    // Saving state
    const [isSaving, setIsSaving] = useState(false);
    const [savingCell, setSavingCell] = useState(false);

    // Column resize state
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
    const [resizingColumn, setResizingColumn] = useState<string | null>(null);
    const [resizeStartX, setResizeStartX] = useState(0);
    const [resizeStartWidth, setResizeStartWidth] = useState(0);

    // Hide empty columns toggle
    const [hideEmptyColumns, setHideEmptyColumns] = useState(true);

    // Quick actions panel state
    const [showQuickActions, setShowQuickActions] = useState(false);

    // Load data on mount
    useEffect(() => {
        loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fileId]);

    // Focus input when editing starts
    useEffect(() => {
        if (editingCell && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingCell]);

    // Validate data when it changes
    useEffect(() => {
        validateData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, deletedRows, requiredFields]);

    // Column resize mouse event handlers
    useEffect(() => {
        if (resizingColumn) {
            const handleMouseMove = (e: MouseEvent) => {
                const diff = e.clientX - resizeStartX;
                const newWidth = Math.max(60, Math.min(800, resizeStartWidth + diff));
                setColumnWidths(prev => ({ ...prev, [resizingColumn]: newWidth }));
            };

            const handleMouseUp = () => {
                setResizingColumn(null);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [resizingColumn, resizeStartX, resizeStartWidth]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await api.getFilePreview(fileId, 1000);
            const dataArray = response.transformed_data || response.data;

            if (dataArray && dataArray.length > 0) {
                setData(dataArray);
                setColumns(response.columns || Object.keys(dataArray[0]));
            } else {
                setData([]);
                setColumns([]);
            }
        } catch (err: unknown) {
            const errMessage = err instanceof Error ? err.message : 'Unknown error';
            setError(errMessage || 'Failed to load data');
            toast({ title: 'Load failed', description: errMessage, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const validateData = useCallback(() => {
        const errors = new Map<string, string>();

        data.forEach((row, idx) => {
            if (deletedRows.has(idx)) return;

            requiredFields.forEach(field => {
                const value = row[field];
                if (value === null || value === undefined || String(value).trim() === '') {
                    errors.set(`${idx}-${field}`, `${field} is required`);
                }
            });
        });

        setValidationErrors(errors);
    }, [data, deletedRows, requiredFields]);

    const validationSummary = useMemo((): ValidationSummary => {
        const activeRows = data.filter((_, idx) => !deletedRows.has(idx));
        const invalidRowSet = new Set<number>();
        const fieldIssues: Record<string, number> = {};

        validationErrors.forEach((_error, key) => {
            const [rowIdxStr, fieldName] = key.split('-');
            const rowIdx = parseInt(rowIdxStr);
            if (!deletedRows.has(rowIdx)) {
                invalidRowSet.add(rowIdx);
                fieldIssues[fieldName] = (fieldIssues[fieldName] || 0) + 1;
            }
        });

        return {
            totalRows: data.length,
            activeRows: activeRows.length,
            deletedRows: deletedRows.size,
            invalidRows: invalidRowSet.size,
            validRows: activeRows.length - invalidRowSet.size,
            pendingChanges: pendingUpdates.size,
            fieldIssues
        };
    }, [data, deletedRows, validationErrors, pendingUpdates]);

    const isColumnPopulated = useCallback((col: string): boolean => {
        return data.some(row => {
            const value = row[col];
            return value !== null && value !== undefined && value !== '' && String(value).trim() !== '';
        });
    }, [data]);

    const visibleColumns = useMemo(() => {
        if (!hideEmptyColumns) return columns;
        return columns.filter(col => isColumnPopulated(col));
    }, [columns, hideEmptyColumns, isColumnPopulated]);

    const hiddenColumnCount = columns.length - visibleColumns.length;

    const calculatedWidths = useMemo(() => {
        const widths: Record<string, number> = {};
        visibleColumns.forEach((col) => {
            if (columnWidths[col]) {
                widths[col] = columnWidths[col];
                return;
            }
            let maxWidth = col.length * 8 + 48;
            data.slice(0, 50).forEach((row) => {
                const value = row[col];
                const valueStr = value !== null && value !== undefined ? String(value) : '';
                const contentWidth = valueStr.length * 7.5 + 32;
                maxWidth = Math.max(maxWidth, contentWidth);
            });
            widths[col] = Math.min(Math.max(maxWidth, 80), 400);
        });
        return widths;
    }, [visibleColumns, data, columnWidths]);

    const handleResizeStart = (e: React.MouseEvent, column: string, currentWidth: number) => {
        e.preventDefault();
        e.stopPropagation();
        setResizingColumn(column);
        setResizeStartX(e.clientX);
        setResizeStartWidth(currentWidth);
    };

    const filteredData = useMemo(() => {
        if (!searchTerm.trim()) {
            return data.map((row, idx) => ({ row, originalIndex: idx }));
        }

        const query = searchTerm.toLowerCase();
        return data
            .map((row, idx) => ({ row, originalIndex: idx }))
            .filter(({ row }) => {
                return Object.values(row).some(value => {
                    if (value === null || value === undefined) return false;
                    return String(value).toLowerCase().includes(query);
                });
            });
    }, [data, searchTerm]);

    const handleCellDoubleClick = (rowIdx: number, colName: string) => {
        if (deletedRows.has(rowIdx)) return;
        setEditingCell({ row: rowIdx, col: colName });
        setEditValue(String(data[rowIdx][colName] ?? ''));
    };

    const handleCellSave = async () => {
        if (!editingCell) return;

        const { row, col } = editingCell;
        const oldValue = data[row][col];
        const newValue = editValue;

        setEditingCell(null);

        if (String(newValue) !== String(oldValue ?? '')) {
            try {
                setSavingCell(true);

                await api.updateCellValue({
                    file_id: fileId,
                    row_index: row,
                    column_name: col,
                    new_value: newValue || null
                });

                const newData = [...data];
                newData[row] = { ...newData[row], [col]: newValue || null };
                setData(newData);
                onDataChange?.(newData);

                setPendingUpdates(prev => {
                    const next = new Map(prev);
                    next.set(`${row}-${col}`, { row_index: row, column_name: col, new_value: newValue });
                    return next;
                });

                toast({ title: 'Cell updated', description: `Row ${row + 1}, ${col}` });
            } catch (err: unknown) {
                toast({ title: 'Update failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
            } finally {
                setSavingCell(false);
            }
        }

        setEditValue('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleCellSave();
        } else if (e.key === 'Escape') {
            setEditingCell(null);
            setEditValue('');
        }
    };

    const handleDeleteRow = (rowIdx: number) => {
        setDeletedRows(prev => new Set(prev).add(rowIdx));
        toast({ title: 'Row marked for deletion', description: `Row ${rowIdx + 1} will be removed on save` });
    };

    const handleRestoreRow = (rowIdx: number) => {
        setDeletedRows(prev => {
            const next = new Set(prev);
            next.delete(rowIdx);
            return next;
        });
        toast({ title: 'Row restored', description: `Row ${rowIdx + 1} has been restored` });
    };

    const handleRemoveAllInvalid = () => {
        const invalidIndices: number[] = [];
        validationErrors.forEach((_, key) => {
            const rowIdx = parseInt(key.split('-')[0]);
            if (!deletedRows.has(rowIdx)) {
                invalidIndices.push(rowIdx);
            }
        });

        if (invalidIndices.length > 0) {
            setDeletedRows(prev => new Set([...prev, ...invalidIndices]));
            toast({ title: 'Removed invalid rows', description: `${invalidIndices.length} rows marked for deletion` });
        } else {
            toast({ title: 'All rows valid', description: 'No invalid rows to remove' });
        }
    };

    const handleRestoreAllDeleted = () => {
        if (deletedRows.size > 0) {
            const count = deletedRows.size;
            setDeletedRows(new Set());
            toast({ title: 'Rows restored', description: `${count} rows have been restored` });
        }
    };

    const handleSaveAll = async () => {
        if (deletedRows.size === 0) {
            toast({ title: 'No changes', description: 'No rows to delete' });
            return;
        }

        try {
            setIsSaving(true);

            await api.deleteRows({
                file_id: fileId,
                row_indices: Array.from(deletedRows)
            });

            toast({
                title: 'Changes saved',
                description: `Deleted ${deletedRows.size} rows`
            });

            setDeletedRows(new Set());
            setPendingUpdates(new Map());
            await loadData();
            onSave?.();
        } catch (err: unknown) {
            toast({ title: 'Save failed', description: err instanceof Error ? err.message : 'Unknown error', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleExport = () => {
        const activeData = data.filter((_, idx) => !deletedRows.has(idx));

        if (activeData.length === 0) {
            toast({ title: 'Nothing to export', description: 'All rows have been deleted', variant: 'destructive' });
            return;
        }

        const headers = columns.join(',');
        const rows = activeData.map(row =>
            columns.map(col => {
                const value = row[col];
                if (value === null || value === undefined) return '';
                const stringValue = String(value);
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                    return `"${stringValue.replace(/"/g, '""')}"`;
                }
                return stringValue;
            }).join(',')
        );

        const csvContent = [headers, ...rows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `${entityName}_edited_${timestamp}.csv`;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({ title: 'Export complete', description: `Downloaded ${filename}` });
        onExport?.();
    };

    const handleDownloadValidationReport = () => {
        if (data.length === 0) {
            toast({ title: 'No data', description: 'No data available for report', variant: 'destructive' });
            return;
        }

        const headers = ['Row Number', 'Status', 'Missing Fields', 'Row Data'];
        const rows: string[][] = [];

        data.forEach((row, index) => {
            const isDeleted = deletedRows.has(index);
            const missingFields: string[] = [];

            requiredFields.forEach(field => {
                const value = row[field];
                if (value === null || value === undefined || String(value).trim() === '') {
                    missingFields.push(field);
                }
            });

            let status = 'Valid';
            if (isDeleted) {
                status = 'Deleted';
            } else if (missingFields.length > 0) {
                status = 'Invalid';
            }

            rows.push([
                String(index + 1),
                status,
                missingFields.join(', '),
                JSON.stringify(row)
            ]);
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `validation_report_${entityName}_${timestamp}.csv`;

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({ title: 'Report downloaded', description: filename });
    };

    const isCellEdited = (rowIdx: number, colName: string) => {
        return pendingUpdates.has(`${rowIdx}-${colName}`);
    };

    const getCellError = (rowIdx: number, colName: string) => {
        return validationErrors.get(`${rowIdx}-${colName}`);
    };

    return {
        // Data
        data,
        columns,
        loading,
        error,

        // Editing
        editingCell,
        editValue,
        setEditValue,
        inputRef,
        savingCell,

        // Display
        visibleColumns,
        hiddenColumnCount,
        calculatedWidths,
        filteredData,
        validationSummary,
        validationErrors,
        searchTerm,
        setSearchTerm,
        hideEmptyColumns,
        setHideEmptyColumns,
        showQuickActions,
        setShowQuickActions,
        isSaving,
        deletedRows,
        resizingColumn,
        requiredFields,

        // Actions
        loadData,
        handleCellDoubleClick,
        handleCellSave,
        handleKeyDown,
        handleDeleteRow,
        handleRestoreRow,
        handleRemoveAllInvalid,
        handleRestoreAllDeleted,
        handleSaveAll,
        handleExport,
        handleDownloadValidationReport,
        handleResizeStart,

        // Helpers
        isCellEdited,
        getCellError,
    };
}
