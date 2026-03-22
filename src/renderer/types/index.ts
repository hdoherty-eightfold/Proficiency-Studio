export type DataType = "string" | "number" | "date" | "email" | "datetime" | "boolean";
export type MatchMethod = "exact" | "alias" | "partial" | "alias_partial" | "fuzzy" | "manual" | "semantic" | "created";
export type Severity = "error" | "warning" | "info";

export interface FieldDefinition {
  name: string;
  display_name: string;
  type: DataType;
  required: boolean;
  max_length?: number;
  min_length?: number;
  pattern?: string;
  format?: string;
  example: string;
  description: string;
  default_value?: unknown;
}

export interface Mapping {
  source: string;
  target: string;
  confidence: number;
  method: MatchMethod;
  alternatives?: Alternative[];
}

export interface Alternative {
  target: string;
  confidence: number;
}

export interface EntitySchema {
  entity_name: string;
  display_name: string;
  description: string;
  fields: FieldDefinition[];
}

export interface ValidationMessage {
  field: string;
  message: string;
  severity: Severity;
  row_number?: number;
  suggestion?: string;
}

export interface ValidationResult {
  is_valid: boolean;
  errors: ValidationMessage[];
  warnings: ValidationMessage[];
  info: ValidationMessage[];
  summary: ValidationSummary;
}

export interface ValidationSummary {
  total_errors: number;
  total_warnings: number;
  required_fields_mapped: number;
  required_fields_total: number;
  mapping_completeness: number;
}

export interface UploadResponse {
  filename: string;
  file_id: string;
  row_count: number;
  column_count: number;
  columns: string[];
  sample_data: Record<string, unknown>[];
  data_types: Record<string, string>;
  file_size: number;
}

export interface FieldAnalysis {
  field_name: string;
  total_values: number;
  null_count: number;
  null_percentage: number;
  unique_count: number;
  unique_percentage: number;
  detected_type: string;
  type_consistency: number;
  empty_string_count: number;
  whitespace_only_count: number;
  min_length?: number;
  max_length?: number;
  avg_length?: number;
  schema_field?: string;
  schema_violations: number;
  sample_values: string[];
  most_common_values: [string, number][];
  issues: { type: string; count: number; percentage?: number }[];
}

export interface EncodingAnalysis {
  detected_encoding: string;
  confidence: number;
  is_utf8_compatible: boolean;
  problematic_characters: { row: number; column: string; value: string; issue: string }[];
  encoding_issues_count: number;
  recommendation?: string;
}

export interface DataQualityScore {
  overall_score: number;
  completeness_score: number;
  consistency_score: number;
  validity_score: number;
  accuracy_score: number;
  grade: string;
  grade_description: string;
}

export interface RowIssue {
  row_index: number;
  column: string;
  value: unknown;
  issue_type: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

export interface AnalysisSummary {
  total_rows: number;
  total_columns: number;
  rows_with_issues: number;
  rows_without_issues: number;
  critical_issues: number;
  warning_issues: number;
  info_issues: number;
  top_issue_types: { type: string; count: number }[];
  most_problematic_columns: { column: string; issue_count: number }[];
  recommendations: string[];
}

export interface ComprehensiveAnalysisResult {
  success: boolean;
  analysis_timestamp: string;
  file_id: string;
  entity_type?: string;
  encoding_analysis: EncodingAnalysis;
  quality_score: DataQualityScore;
  summary: AnalysisSummary;
  field_analyses: FieldAnalysis[];
  row_issues: RowIssue[];
  total_row_issues: number;
  row_issues_truncated: boolean;
  statistics: Record<string, unknown>;
}
