/**
 * CSV Editor Component
 * Full-featured CSV editor with inline editing, validation, and export.
 *
 * Composed from sub-components:
 * - CSVToolbar: header, stats, search, quick actions
 * - CSVTable: data table with inline editing
 * - useCSVEditor: all state and logic
 */

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import type { CSVEditorProps } from './csv-types';
import { useCSVEditor } from './useCSVEditor';
import { CSVToolbar } from './CSVToolbar';
import { CSVTable } from './CSVTable';

const CSVEditor: React.FC<CSVEditorProps> = ({
  fileId,
  entityName = 'employee',
  requiredFields = [],
  onDataChange,
  onSave,
  onExport,
}) => {
  const editor = useCSVEditor({
    fileId,
    entityName,
    requiredFields,
    onDataChange,
    onSave,
    onExport,
  });

  if (editor.loading) {
    return (
      <Card className="bg-white dark:bg-gray-800">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-500 mb-4" />
            <p className="text-gray-500">Loading data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (editor.error) {
    return (
      <Card className="bg-white dark:bg-gray-800">
        <CardContent className="py-12">
          <div className="flex flex-col items-center justify-center text-red-500">
            <AlertTriangle className="w-12 h-12 mb-4" />
            <p className="font-medium">Failed to load data</p>
            <p className="text-sm text-gray-500 mt-2">{editor.error}</p>
            <Button onClick={editor.loadData} variant="outline" className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-gray-800">
      <CSVToolbar
        validationSummary={editor.validationSummary}
        searchTerm={editor.searchTerm}
        onSearchChange={editor.setSearchTerm}
        hideEmptyColumns={editor.hideEmptyColumns}
        onToggleHideEmpty={() => editor.setHideEmptyColumns(!editor.hideEmptyColumns)}
        hiddenColumnCount={editor.hiddenColumnCount}
        showQuickActions={editor.showQuickActions}
        onToggleQuickActions={() => editor.setShowQuickActions(!editor.showQuickActions)}
        isSaving={editor.isSaving}
        deletedRowCount={editor.deletedRows.size}
        dataLength={editor.data.length}
        filteredDataLength={editor.filteredData.length}
        onSaveAll={editor.handleSaveAll}
        onExport={editor.handleExport}
        onRefresh={editor.loadData}
        onRemoveAllInvalid={editor.handleRemoveAllInvalid}
        onRestoreAllDeleted={editor.handleRestoreAllDeleted}
        onDownloadReport={editor.handleDownloadValidationReport}
      />

      <CardContent className="px-0 pb-4">
        <CSVTable
          filteredData={editor.filteredData}
          visibleColumns={editor.visibleColumns}
          calculatedWidths={editor.calculatedWidths}
          requiredFields={requiredFields}
          deletedRows={editor.deletedRows}
          editingCell={editor.editingCell}
          editValue={editor.editValue}
          savingCell={editor.savingCell}
          resizingColumn={editor.resizingColumn}
          inputRef={editor.inputRef}
          onEditValueChange={editor.setEditValue}
          onCellDoubleClick={editor.handleCellDoubleClick}
          onCellSave={editor.handleCellSave}
          onKeyDown={editor.handleKeyDown}
          onDeleteRow={editor.handleDeleteRow}
          onRestoreRow={editor.handleRestoreRow}
          onResizeStart={editor.handleResizeStart}
          isCellEdited={editor.isCellEdited}
          getCellError={editor.getCellError}
          validationErrors={editor.validationErrors}
        />

        {editor.data.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CSVEditor;
