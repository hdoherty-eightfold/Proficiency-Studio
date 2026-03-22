/**
 * Shared types for CSV editor components
 */

export type CSVRow = Record<string, unknown>;

export interface PendingUpdate {
    row_index: number;
    column_name: string;
    new_value: unknown;
}

export interface ValidationSummary {
    totalRows: number;
    activeRows: number;
    deletedRows: number;
    invalidRows: number;
    validRows: number;
    pendingChanges: number;
    fieldIssues: Record<string, number>;
}

export interface CSVEditorProps {
    fileId: string;
    entityName?: string;
    requiredFields?: string[];
    onDataChange?: (data: CSVRow[]) => void;
    onSave?: () => void;
    onExport?: () => void;
}
