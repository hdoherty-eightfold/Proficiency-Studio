/**
 * CSV Toolbar - Header, stats, search, and quick actions
 */

import React from 'react';
import {
  AlertTriangle,
  Edit3,
  RefreshCw,
  Save,
  Download,
  Search,
  X,
  Loader2,
  CheckCircle,
  Eye,
  EyeOff,
  FileText,
  Wand2,
  ChevronDown,
  ChevronUp,
  RotateCcw,
} from 'lucide-react';
import { Button } from '../ui/button';
import { CardHeader, CardTitle, CardDescription } from '../ui/card';
import type { ValidationSummary } from './csv-types';

interface CSVToolbarProps {
  validationSummary: ValidationSummary;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  hideEmptyColumns: boolean;
  onToggleHideEmpty: () => void;
  hiddenColumnCount: number;
  showQuickActions: boolean;
  onToggleQuickActions: () => void;
  isSaving: boolean;
  deletedRowCount: number;
  dataLength: number;
  filteredDataLength: number;
  onSaveAll: () => void;
  onExport: () => void;
  onRefresh: () => void;
  onRemoveAllInvalid: () => void;
  onRestoreAllDeleted: () => void;
  onDownloadReport: () => void;
}

export const CSVToolbar: React.FC<CSVToolbarProps> = ({
  validationSummary,
  searchTerm,
  onSearchChange,
  hideEmptyColumns,
  onToggleHideEmpty,
  hiddenColumnCount,
  showQuickActions,
  onToggleQuickActions,
  isSaving,
  deletedRowCount,
  dataLength,
  filteredDataLength,
  onSaveAll,
  onExport,
  onRefresh,
  onRemoveAllInvalid,
  onRestoreAllDeleted,
  onDownloadReport,
}) => {
  return (
    <>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Edit3 className="w-5 h-5" />
              CSV Editor
            </CardTitle>
            <CardDescription>
              Double-click any cell to edit. Changes are saved immediately.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {deletedRowCount > 0 && (
              <Button onClick={onSaveAll} disabled={isSaving} variant="outline-red">
                {isSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Deletions ({deletedRowCount})
              </Button>
            )}
            <Button onClick={onExport} variant="outline-blue">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={onRefresh}
              variant="ghost"
              size="icon"
              title="Refresh data"
              aria-label="Refresh data"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Summary Stats with Validation Badge */}
      <div className="flex items-center gap-4 mb-4 flex-wrap px-6">
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
            validationSummary.invalidRows === 0
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
          }`}
        >
          {validationSummary.invalidRows === 0 ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <AlertTriangle className="w-4 h-4" />
          )}
          <span>
            {validationSummary.invalidRows === 0
              ? 'All Valid'
              : `${validationSummary.invalidRows} Issues`}
          </span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            <strong className="text-gray-900 dark:text-white">{validationSummary.totalRows}</strong>{' '}
            total
          </span>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <span className="text-green-600 dark:text-green-400">
            <strong>{validationSummary.validRows}</strong> valid
          </span>
          {validationSummary.deletedRows > 0 && (
            <>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span className="text-red-600 dark:text-red-400">
                <strong>{validationSummary.deletedRows}</strong> deleted
              </span>
            </>
          )}
          {validationSummary.pendingChanges > 0 && (
            <>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span className="text-blue-600 dark:text-blue-400">
                <strong>{validationSummary.pendingChanges}</strong> edited
              </span>
            </>
          )}
        </div>

        {Object.keys(validationSummary.fieldIssues).length > 0 && (
          <div className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">
            Missing:{' '}
            {Object.entries(validationSummary.fieldIssues).map(([field, count], i) => (
              <React.Fragment key={field}>
                {i > 0 && ', '}
                <span>
                  <strong>{field}</strong> ({count})
                </span>
              </React.Fragment>
            ))}
          </div>
        )}

        <button
          onClick={onToggleQuickActions}
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded transition-colors"
        >
          {showQuickActions ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
          Quick Actions
        </button>
      </div>

      {/* Quick Actions Panel */}
      {showQuickActions && (
        <div className="flex gap-2 mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg mx-6">
          <button
            onClick={onRemoveAllInvalid}
            disabled={validationSummary.invalidRows === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Wand2 className="w-4 h-4" />
            Remove {validationSummary.invalidRows} Invalid Rows
          </button>
          {deletedRowCount > 0 && (
            <button
              onClick={onRestoreAllDeleted}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Restore {deletedRowCount} Deleted
            </button>
          )}
          <button
            onClick={onDownloadReport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded transition-colors"
          >
            <FileText className="w-4 h-4" />
            Download Validation Report
          </button>
        </div>
      )}

      {/* Search Bar and Column Toggle */}
      <div className="flex gap-3 mb-4 px-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search rows..."
            className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={onToggleHideEmpty}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            hideEmptyColumns
              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
              : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
          title={hideEmptyColumns ? 'Show all columns' : 'Hide empty columns'}
          aria-label={hideEmptyColumns ? 'Show all columns' : 'Hide empty columns'}
        >
          {hideEmptyColumns ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {hideEmptyColumns ? `${hiddenColumnCount} Hidden` : 'Show All'}
        </button>
      </div>

      {searchTerm && (
        <p className="text-sm text-gray-500 mb-2 px-6">
          Showing {filteredDataLength} of {dataLength} rows
        </p>
      )}
    </>
  );
};
