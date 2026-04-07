/**
 * SkillRoleMatcher
 *
 * Two-panel modal for matching assessed skills to Eightfold roles before export.
 * Features:
 *  - Single Role view: select a role, review skill mapping, export
 *  - All Roles view: auto-match all roles in parallel, see summary table, bulk export
 *  - Preview cache: navigating between roles is instant (no re-fetch)
 *  - Eightfold window: see the API request & response after every export
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  X,
  Search,
  ChevronDown,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
  Send,
  AlertCircle,
  ArrowRight,
  Zap,
  Layers,
  Eye,
  CheckCircle,
  Server,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { JsonViewer } from '../common/JsonViewer';
import { api } from '../../services/api';
import { useToast } from '../../stores/toast-store';
import type { AssessmentResult } from '../proficiency/assessment-types';
import type {
  PreviewMappingResponse,
  ExplicitSkillMapping,
  EightfoldExportResponse,
} from '../../types/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EightfoldRole {
  id: string;
  title: string;
  skillProficiencies?: Array<{ name: string; proficiency?: number | null }>;
  [key: string]: unknown;
}

interface SkillRoleMatcherProps {
  assessments: AssessmentResult[];
  availableRoles: EightfoldRole[];
  eightfoldEnvId: string | null;
  eightfoldAuthToken: string | null;
  environmentName: string;
  onClose: () => void;
  onExportComplete?: (result: EightfoldExportResponse) => void;
}

interface MappingEntry {
  assessedSkill: string;
  proficiencyNumeric: number;
  roleSkill: string | null;
  confidence: number;
  method: 'exact' | 'partial' | 'fuzzy' | 'semantic' | 'manual' | 'none';
}

interface ExportRecord {
  role: EightfoldRole;
  request: Record<string, unknown>;
  response: Record<string, unknown>;
  success: boolean;
  timestamp: string;
}

interface BulkRoleState {
  preview: PreviewMappingResponse | null;
  loading: boolean;
  error: string | null;
  exported: boolean;
  exportRecord: ExportRecord | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function confidenceColor(confidence: number, method: string): string {
  if (method === 'manual')
    return 'text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/40';
  if (confidence >= 0.95)
    return 'text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/40';
  if (confidence >= 0.8)
    return 'text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/40';
  return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800';
}

function methodLabel(method: string): string {
  switch (method) {
    case 'exact':
      return 'EXACT';
    case 'partial':
      return 'PARTIAL';
    case 'fuzzy':
      return 'FUZZY';
    case 'semantic':
      return 'AI';
    case 'manual':
      return 'MANUAL';
    default:
      return '';
  }
}

function buildMappingEntries(
  preview: PreviewMappingResponse,
  overrides: Map<string, string | null>
): MappingEntry[] {
  const byAssessed = new Map<string, MappingEntry>();

  for (const m of preview.matches) {
    byAssessed.set(m.assessed_skill, {
      assessedSkill: m.assessed_skill,
      proficiencyNumeric: m.proficiency_numeric,
      roleSkill: m.role_skill,
      confidence: m.confidence,
      method: m.method,
    });
  }

  for (const u of preview.unmatched_assessed) {
    byAssessed.set(u.assessed_skill, {
      assessedSkill: u.assessed_skill,
      proficiencyNumeric: u.proficiency_numeric,
      roleSkill: null,
      confidence: 0,
      method: 'none',
    });
  }

  for (const [assessedSkill, roleSkill] of overrides.entries()) {
    const entry = byAssessed.get(assessedSkill);
    if (entry) {
      byAssessed.set(assessedSkill, {
        ...entry,
        roleSkill,
        confidence: roleSkill !== null ? 1.0 : 0,
        method: roleSkill !== null ? 'manual' : 'none',
      });
    }
  }

  return Array.from(byAssessed.values()).sort((a, b) => {
    if (a.roleSkill && !b.roleSkill) return -1;
    if (!a.roleSkill && b.roleSkill) return 1;
    return b.confidence - a.confidence;
  });
}

// ─── Sub-component: Dropdown for manual re-mapping ───────────────────────────

function RoleSkillDropdown({
  currentRoleSkill,
  roleSkillOptions,
  onSelect,
}: {
  currentRoleSkill: string | null;
  roleSkillOptions: string[];
  onSelect: (roleSkill: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = useMemo(
    () => roleSkillOptions.filter((s) => s.toLowerCase().includes(search.toLowerCase())),
    [roleSkillOptions, search]
  );

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
        aria-label="Change role skill mapping"
      >
        change <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-50 w-56 bg-gray-900 border border-gray-700 rounded-lg shadow-xl">
          <div className="p-2 border-b border-gray-800">
            <div className="relative">
              <Search className="absolute left-2 top-1.5 w-3 h-3 text-gray-400" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search skills..."
                className="w-full pl-6 pr-2 py-1 text-xs bg-gray-800 text-gray-100 placeholder:text-gray-500 rounded border-0 outline-none"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            <button
              onClick={() => {
                onSelect(null);
                setOpen(false);
                setSearch('');
              }}
              className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-gray-800"
            >
              ✕ Remove mapping
            </button>
            {filtered.map((skill) => (
              <button
                key={skill}
                onClick={() => {
                  onSelect(skill);
                  setOpen(false);
                  setSearch('');
                }}
                className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-800 truncate ${skill === currentRoleSkill ? 'font-medium text-blue-400' : 'text-gray-200'}`}
              >
                {skill}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-xs text-gray-500">No skills found</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Eightfold Window — request/response viewer ───────────────────────────────

function EightfoldWindow({ records, onClose }: { records: ExportRecord[]; onClose: () => void }) {
  const [selected, setSelected] = useState<ExportRecord | null>(
    records.length === 1 ? records[0] : null
  );

  return (
    <div
      className="fixed inset-0 bg-black/70 z-[60] flex items-stretch justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ef-window-title"
    >
      <Card className="w-full max-w-5xl flex flex-col max-h-full overflow-hidden">
        <CardHeader className="border-b flex-shrink-0 py-3">
          <div className="flex items-center justify-between">
            <CardTitle id="ef-window-title" className="flex items-center gap-2 text-base">
              <Server className="w-4 h-4 text-indigo-500" />
              Eightfold API — Export Result{records.length > 1 ? `s (${records.length} roles)` : ''}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              aria-label="Close Eightfold window"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0 flex">
          {/* Sidebar: role list (only when multiple records) */}
          {records.length > 1 && (
            <div className="w-56 flex-shrink-0 border-r flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto">
                {records.map((rec, i) => (
                  <button
                    key={i}
                    onClick={() => setSelected(rec)}
                    className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-muted/60 transition-colors ${selected === rec ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-l-indigo-500' : ''}`}
                  >
                    <p className="text-xs font-medium truncate">{rec.role.title}</p>
                    <p
                      className={`text-xs mt-0.5 ${rec.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                    >
                      {rec.success ? '✓ Success' : '✗ Failed'}
                    </p>
                  </button>
                ))}
              </div>
              <div className="p-2 border-t bg-muted/20 text-xs text-muted-foreground">
                {records.filter((r) => r.success).length}/{records.length} succeeded
              </div>
            </div>
          )}

          {/* Detail pane */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {selected ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  {selected.success ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="font-medium text-sm">{selected.role.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(selected.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                    Request
                  </h3>
                  <JsonViewer data={selected.request} title="Request Payload" maxHeight="280px" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wide">
                    Response
                  </h3>
                  <JsonViewer data={selected.response} title="Response Payload" maxHeight="280px" />
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
                <Eye className="w-8 h-8 opacity-30" />
                <p className="text-sm">Select a role to view its request &amp; response</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SkillRoleMatcher({
  assessments,
  availableRoles,
  eightfoldEnvId,
  eightfoldAuthToken,
  environmentName,
  onClose,
  onExportComplete,
}: SkillRoleMatcherProps) {
  const { toast } = useToast();

  // ── View mode ──────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState<'single' | 'all'>('single');

  // ── Role list ──────────────────────────────────────────────────────────────
  const [roles, setRoles] = useState<EightfoldRole[]>(availableRoles);
  const [rolesLoading, setRolesLoading] = useState(availableRoles.length === 0);
  const [roleSearch, setRoleSearch] = useState('');

  // ── Single role view ───────────────────────────────────────────────────────
  const [selectedRole, setSelectedRole] = useState<EightfoldRole | null>(null);
  const [preview, setPreview] = useState<PreviewMappingResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Map<string, string | null>>(new Map());
  const [exporting, setExporting] = useState(false);

  // ── Preview + overrides cache (back/forward navigation) ───────────────────
  const previewCache = useRef<Map<string, PreviewMappingResponse>>(new Map());
  const overridesCache = useRef<Map<string, Map<string, string | null>>>(new Map());

  // ── Eightfold window (request/response display) ────────────────────────────
  const [windowRecords, setWindowRecords] = useState<ExportRecord[] | null>(null);

  // ── All Roles view ─────────────────────────────────────────────────────────
  const [bulkStates, setBulkStates] = useState<Map<string, BulkRoleState>>(new Map());
  const [bulkMatchRunning, setBulkMatchRunning] = useState(false);
  const [bulkMatchProgress, setBulkMatchProgress] = useState(0);
  const [bulkMatchDone, setBulkMatchDone] = useState(false);
  const [bulkExporting, setBulkExporting] = useState(false);
  const [bulkExportProgress, setBulkExportProgress] = useState(0);
  const [bulkExportSummary, setBulkExportSummary] = useState<{
    success: number;
    failed: number;
    total: number;
  } | null>(null);
  const [bulkRoleSearch, setBulkRoleSearch] = useState('');

  // ── Load roles ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (availableRoles.length > 0) {
      setRoles(availableRoles);
      setRolesLoading(false);
      return;
    }
    if (!eightfoldAuthToken || !environmentName) {
      setRolesLoading(false);
      return;
    }
    setRolesLoading(true);
    api
      .getRoles(environmentName, eightfoldAuthToken)
      .then((res) => {
        const fetched = (res?.roles ?? []) as unknown as EightfoldRole[];
        setRoles(fetched);
      })
      .catch(() => {
        toast({ title: 'Could not fetch roles from Eightfold', variant: 'destructive' });
      })
      .finally(() => setRolesLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Filtered role list ─────────────────────────────────────────────────────
  const filteredRoles = useMemo(() => {
    if (!roleSearch.trim()) return roles;
    const q = roleSearch.toLowerCase();
    return roles.filter((r) => r.title?.toLowerCase().includes(q));
  }, [roles, roleSearch]);

  // ── Fetch preview for selected role (uses cache) ───────────────────────────
  const handleSelectRole = useCallback(
    async (role: EightfoldRole) => {
      // Save current overrides before switching
      if (selectedRole) {
        overridesCache.current.set(selectedRole.id, overrides);
      }

      setSelectedRole(role);
      setPreviewError(null);

      // Restore overrides from cache
      const cachedOverrides =
        overridesCache.current.get(role.id) ?? new Map<string, string | null>();
      setOverrides(cachedOverrides);

      // Use cached preview if available
      const cached = previewCache.current.get(role.id);
      if (cached) {
        setPreview(cached);
        setPreviewLoading(false);
        return;
      }

      setPreview(null);
      setPreviewLoading(true);

      const assessmentPayload = assessments.map((a) => ({
        skill_name: a.skill_name,
        proficiency_numeric: a.proficiency_numeric ?? a.proficiency ?? 3,
      }));

      try {
        const result = await api.previewSkillMapping({
          assessments: assessmentPayload,
          role_id: role.id,
          role_data: role as Record<string, unknown>,
          environment_id: eightfoldEnvId ?? '',
          auth_token: eightfoldAuthToken ?? undefined,
        });
        previewCache.current.set(role.id, result);
        setPreview(result);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load skill mapping';
        setPreviewError(message);
      } finally {
        setPreviewLoading(false);
      }
    },
    [assessments, eightfoldEnvId, eightfoldAuthToken, selectedRole, overrides]
  );

  // ── Mapping entries from preview + overrides ───────────────────────────────
  const mappingEntries = useMemo<MappingEntry[]>(() => {
    if (!preview) return [];
    return buildMappingEntries(preview, overrides);
  }, [preview, overrides]);

  const matchedEntries = mappingEntries.filter((e) => e.roleSkill !== null);
  const unmatchedEntries = mappingEntries.filter((e) => e.roleSkill === null);

  const allRoleSkills = useMemo<string[]>(() => {
    if (!selectedRole?.skillProficiencies) return preview?.unmatched_role ?? [];
    const names = selectedRole.skillProficiencies.map((s) => s.name).filter(Boolean);
    return names.length > 0 ? names : (preview?.unmatched_role ?? []);
  }, [selectedRole, preview]);

  const handleOverride = useCallback(
    (assessedSkill: string, roleSkill: string | null) => {
      setOverrides((prev) => {
        const next = new Map(prev);
        next.set(assessedSkill, roleSkill);
        // Update cache
        if (selectedRole) {
          overridesCache.current.set(selectedRole.id, next);
        }
        return next;
      });
    },
    [selectedRole]
  );

  // ── Single-role export ─────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!selectedRole || !eightfoldEnvId || matchedEntries.length === 0) return;

    const explicitMappings: ExplicitSkillMapping[] = matchedEntries
      .filter((e) => e.roleSkill !== null)
      .map((e) => ({ assessed_skill: e.assessedSkill, role_skill: e.roleSkill! }));

    const assessmentPayload = assessments.map((a) => ({
      skill_name: a.skill_name,
      proficiency_numeric: a.proficiency_numeric ?? a.proficiency ?? 3,
    }));

    const requestPayload = {
      assessments: assessmentPayload,
      environment_id: eightfoldEnvId,
      role_id: selectedRole.id,
      role_title: selectedRole.title,
      role_data: selectedRole as Record<string, unknown>,
      auth_token: eightfoldAuthToken ?? undefined,
      explicit_mappings: explicitMappings,
    };

    setExporting(true);
    try {
      const result = await api.exportToEightfoldWithMappings(requestPayload);

      const record: ExportRecord = {
        role: selectedRole,
        request: { ...requestPayload, auth_token: '***' },
        response: result as unknown as Record<string, unknown>,
        success: result.success,
        timestamp: new Date().toISOString(),
      };

      if (result.success) {
        toast({
          title: `Exported ${result.assessed_skills} skill${result.assessed_skills !== 1 ? 's' : ''} to "${selectedRole.title}"`,
          variant: 'success',
        });
        onExportComplete?.(result);
      } else {
        toast({ title: 'Export failed', description: result.message, variant: 'destructive' });
      }

      // Show the Eightfold window
      setWindowRecords([record]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Export failed';
      toast({ title: message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  // ── Bulk Match All Roles ────────────────────────────────────────────────────
  const handleBulkMatch = async () => {
    setBulkMatchRunning(true);
    setBulkMatchProgress(0);
    setBulkMatchDone(false);
    setBulkExportSummary(null);

    const CONCURRENCY = 5;
    const assessmentPayload = assessments.map((a) => ({
      skill_name: a.skill_name,
      proficiency_numeric: a.proficiency_numeric ?? a.proficiency ?? 3,
    }));

    // Initialize all roles
    const initial = new Map<string, BulkRoleState>();
    for (const role of roles) {
      initial.set(role.id, {
        preview: null,
        loading: true,
        error: null,
        exported: false,
        exportRecord: null,
      });
    }
    setBulkStates(initial);

    let processed = 0;

    for (let i = 0; i < roles.length; i += CONCURRENCY) {
      const batch = roles.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (role) => {
          try {
            // Check preview cache first
            let preview = previewCache.current.get(role.id);
            if (!preview) {
              preview = await api.previewSkillMapping({
                assessments: assessmentPayload,
                role_id: role.id,
                role_data: role as Record<string, unknown>,
                environment_id: eightfoldEnvId ?? '',
                auth_token: eightfoldAuthToken ?? undefined,
              });
              previewCache.current.set(role.id, preview);
            }
            setBulkStates((prev) => {
              const next = new Map(prev);
              const existing = next.get(role.id)!;
              next.set(role.id, { ...existing, preview, loading: false });
              return next;
            });
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed';
            setBulkStates((prev) => {
              const next = new Map(prev);
              const existing = next.get(role.id)!;
              next.set(role.id, { ...existing, loading: false, error: message });
              return next;
            });
          }
          processed++;
          setBulkMatchProgress(Math.round((processed / roles.length) * 100));
        })
      );
    }

    setBulkMatchRunning(false);
    setBulkMatchDone(true);
  };

  // ── Bulk Export All Matched Roles ───────────────────────────────────────────
  const handleBulkExport = async () => {
    const rolesToExport = roles.filter((r) => {
      const state = bulkStates.get(r.id);
      return state?.preview && state.preview.match_count > 0 && !state.exported;
    });

    if (rolesToExport.length === 0) {
      toast({ title: 'No roles with matches to export', variant: 'destructive' });
      return;
    }

    setBulkExporting(true);
    setBulkExportProgress(0);
    setBulkExportSummary(null);

    const CONCURRENCY = 3;
    const assessmentPayload = assessments.map((a) => ({
      skill_name: a.skill_name,
      proficiency_numeric: a.proficiency_numeric ?? a.proficiency ?? 3,
    }));

    let successCount = 0;
    let failedCount = 0;
    let processed = 0;
    const allRecords: ExportRecord[] = [];

    for (let i = 0; i < rolesToExport.length; i += CONCURRENCY) {
      const batch = rolesToExport.slice(i, i + CONCURRENCY);
      await Promise.all(
        batch.map(async (role) => {
          const state = bulkStates.get(role.id)!;
          const preview = state.preview!;
          const explicitMappings: ExplicitSkillMapping[] = preview.matches.map((m) => ({
            assessed_skill: m.assessed_skill,
            role_skill: m.role_skill,
          }));

          const requestPayload = {
            assessments: assessmentPayload,
            environment_id: eightfoldEnvId ?? '',
            role_id: role.id,
            role_title: role.title,
            role_data: role as Record<string, unknown>,
            auth_token: eightfoldAuthToken ?? undefined,
            explicit_mappings: explicitMappings,
          };

          try {
            const response = await api.exportToEightfoldWithMappings(requestPayload);
            const record: ExportRecord = {
              role,
              request: { ...requestPayload, auth_token: '***' },
              response: response as unknown as Record<string, unknown>,
              success: response.success,
              timestamp: new Date().toISOString(),
            };
            if (response.success) successCount++;
            else failedCount++;
            allRecords.push(record);
            setBulkStates((prev) => {
              const next = new Map(prev);
              next.set(role.id, { ...state, exported: true, exportRecord: record });
              return next;
            });
          } catch (err: unknown) {
            failedCount++;
            const record: ExportRecord = {
              role,
              request: { ...requestPayload, auth_token: '***' },
              response: {
                error: err instanceof Error ? err.message : 'Unknown error',
                success: false,
              },
              success: false,
              timestamp: new Date().toISOString(),
            };
            allRecords.push(record);
            setBulkStates((prev) => {
              const next = new Map(prev);
              next.set(role.id, { ...state, exported: true, exportRecord: record });
              return next;
            });
          }
          processed++;
          setBulkExportProgress(Math.round((processed / rolesToExport.length) * 100));
        })
      );
    }

    setBulkExporting(false);
    setBulkExportSummary({
      success: successCount,
      failed: failedCount,
      total: rolesToExport.length,
    });
    setWindowRecords(allRecords);

    if (successCount > 0) {
      toast({
        title: `Exported to ${successCount} role${successCount !== 1 ? 's' : ''} successfully`,
        variant: 'success',
      });
    } else {
      toast({
        title: `Export failed for all ${rolesToExport.length} roles`,
        variant: 'destructive',
      });
    }
  };

  // ── Expanded rows in All Roles table ──────────────────────────────────────
  const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());
  const toggleExpanded = useCallback((roleId: string) => {
    setExpandedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
      return next;
    });
  }, []);

  // ── Filtered bulk role list ────────────────────────────────────────────────
  const filteredBulkRoles = useMemo(() => {
    if (!bulkRoleSearch.trim()) return roles;
    const q = bulkRoleSearch.toLowerCase();
    return roles.filter((r) => r.title?.toLowerCase().includes(q));
  }, [roles, bulkRoleSearch]);

  const bulkMatchedRoleCount = useMemo(
    () => [...bulkStates.values()].filter((s) => s.preview && s.preview.match_count > 0).length,
    [bulkStates]
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-50 flex items-stretch justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="skill-role-matcher-title"
      >
        <Card className="w-full max-w-6xl flex flex-col max-h-full overflow-hidden">
          {/* Header */}
          <CardHeader className="border-b flex-shrink-0 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle
                  id="skill-role-matcher-title"
                  className="flex items-center gap-2 text-lg"
                >
                  <Zap className="w-5 h-5 text-indigo-500" />
                  Export to Eightfold — Skill Matcher
                </CardTitle>
                {/* Mode toggle */}
                <div className="flex items-center rounded-md border border-border overflow-hidden text-xs">
                  <button
                    onClick={() => setViewMode('single')}
                    className={`px-3 py-1.5 font-medium transition-colors ${viewMode === 'single' ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                  >
                    Single Role
                  </button>
                  <button
                    onClick={() => setViewMode('all')}
                    className={`px-3 py-1.5 font-medium transition-colors flex items-center gap-1 ${viewMode === 'all' ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                  >
                    <Layers className="w-3 h-3" /> All Roles
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {environmentName && (
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {environmentName}
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={onClose}
                  aria-label="Close skill matcher"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {viewMode === 'single'
                ? "Select a role, review how your assessed skills map to the role's skills, then export."
                : 'Auto-match all roles at once, then bulk-export with one click.'}
            </p>
          </CardHeader>

          {/* Body */}
          <CardContent className="flex-1 overflow-hidden p-0 flex">
            {/* ── SINGLE ROLE MODE ─────────────────────────────────── */}
            {viewMode === 'single' && (
              <>
                {/* LEFT: Role list */}
                <div className="w-72 flex-shrink-0 border-r flex flex-col">
                  <div className="p-3 border-b">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                      <input
                        value={roleSearch}
                        onChange={(e) => setRoleSearch(e.target.value)}
                        placeholder="Search roles..."
                        className="w-full pl-8 pr-3 py-2 text-sm bg-muted rounded-md border-0 outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {rolesLoading ? (
                      <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" /> Loading roles...
                      </div>
                    ) : filteredRoles.length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground text-sm px-4">
                        {roles.length === 0 ? 'No roles available.' : 'No roles match your search.'}
                      </div>
                    ) : (
                      filteredRoles.map((role) => {
                        const isSelected = selectedRole?.id === role.id;
                        const skillCount =
                          (role.skillProficiencies as Array<unknown> | undefined)?.length ?? 0;
                        const isCached = previewCache.current.has(role.id);
                        return (
                          <button
                            key={role.id}
                            onClick={() => handleSelectRole(role)}
                            className={`w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-800 hover:bg-muted/60 transition-colors ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-2 border-l-indigo-500' : ''}`}
                          >
                            <div className="flex items-center gap-1">
                              <p
                                className={`text-sm font-medium leading-tight truncate flex-1 ${isSelected ? 'text-indigo-700 dark:text-indigo-300' : ''}`}
                              >
                                {role.title}
                              </p>
                              {isCached && !isSelected && (
                                <span className="text-xs text-indigo-400 shrink-0" title="Cached">
                                  ●
                                </span>
                              )}
                            </div>
                            {skillCount > 0 && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {skillCount} skills
                              </p>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                  <div className="p-3 border-t bg-muted/30 text-xs text-muted-foreground">
                    {roles.length} role{roles.length !== 1 ? 's' : ''} · {assessments.length}{' '}
                    assessed skills
                  </div>
                </div>

                {/* RIGHT: Skill mapping */}
                <div className="flex-1 flex flex-col overflow-hidden">
                  {!selectedRole ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 p-8">
                      <ArrowRight className="w-10 h-10 opacity-30" />
                      <p className="text-base font-medium">Select a role</p>
                      <p className="text-sm text-center max-w-xs">
                        Click a role on the left to see how your assessed skills match its required
                        skills.
                      </p>
                      <p className="text-xs text-muted-foreground/60 text-center max-w-xs mt-2">
                        Or switch to <strong>All Roles</strong> to auto-match and export all at
                        once.
                      </p>
                    </div>
                  ) : previewLoading ? (
                    <div className="flex-1 flex items-center justify-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="w-5 h-5 animate-spin" /> Matching skills...
                    </div>
                  ) : previewError ? (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-red-600 dark:text-red-400">
                      <AlertCircle className="w-8 h-8" />
                      <p className="text-sm font-medium">Failed to load mapping</p>
                      <p className="text-xs text-center">{previewError}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelectRole(selectedRole)}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" /> Retry
                      </Button>
                    </div>
                  ) : preview ? (
                    <>
                      {/* Mapping header */}
                      <div className="flex-shrink-0 px-5 py-3 border-b bg-muted/20 flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold truncate">{selectedRole.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              {matchedEntries.length} matched
                            </span>
                            {' · '}
                            <span className="text-muted-foreground">
                              {unmatchedEntries.length} unmatched
                            </span>
                            {' · '}
                            {preview.total_role_skills} role skills total
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setWindowRecords(windowRecords ?? [])}
                            disabled={!windowRecords || windowRecords.length === 0}
                            className="text-xs"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> View Last Export
                          </Button>
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={handleExport}
                            disabled={exporting || matchedEntries.length === 0}
                          >
                            {exporting ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Exporting...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-1.5" /> Export {matchedEntries.length}{' '}
                                skill{matchedEntries.length !== 1 ? 's' : ''}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Column headers */}
                      <div className="flex-shrink-0 grid grid-cols-2 gap-0 px-5 py-2 text-xs font-semibold text-muted-foreground border-b bg-muted/10">
                        <span>Assessed Skills (from CSV)</span>
                        <span>Role Skills (Eightfold)</span>
                      </div>

                      {/* Mapping rows */}
                      <div className="flex-1 overflow-y-auto px-5">
                        {matchedEntries.length === 0 && unmatchedEntries.length === 0 ? (
                          <div className="py-12 text-center text-muted-foreground text-sm">
                            No skills to display.
                          </div>
                        ) : (
                          <>
                            {matchedEntries.map((entry) => (
                              <div
                                key={entry.assessedSkill}
                                className="grid grid-cols-2 gap-3 py-2.5 border-b border-gray-100 dark:border-gray-800 items-center"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">
                                      {entry.assessedSkill}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {entry.proficiencyNumeric}/5
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm truncate">{entry.roleSkill}</p>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                      <span
                                        className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${confidenceColor(entry.confidence, entry.method)}`}
                                      >
                                        {entry.method !== 'manual'
                                          ? `${Math.round(entry.confidence * 100)}%`
                                          : ''}{' '}
                                        {methodLabel(entry.method)}
                                      </span>
                                    </div>
                                  </div>
                                  <RoleSkillDropdown
                                    currentRoleSkill={entry.roleSkill}
                                    roleSkillOptions={allRoleSkills}
                                    onSelect={(roleSkill) =>
                                      handleOverride(entry.assessedSkill, roleSkill)
                                    }
                                  />
                                </div>
                              </div>
                            ))}

                            {unmatchedEntries.length > 0 && (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-muted-foreground py-2">
                                  {unmatchedEntries.length} assessed skill
                                  {unmatchedEntries.length !== 1 ? 's' : ''} with no role match —
                                  click "change" to assign manually
                                </p>
                                {unmatchedEntries.map((entry) => (
                                  <div
                                    key={entry.assessedSkill}
                                    className="grid grid-cols-2 gap-3 py-2 border-b border-gray-100 dark:border-gray-800 items-center opacity-60"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <XCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                      <div className="min-w-0">
                                        <p className="text-sm truncate">{entry.assessedSkill}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {entry.proficiencyNumeric}/5
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground italic">
                                        no match
                                      </span>
                                      <RoleSkillDropdown
                                        currentRoleSkill={null}
                                        roleSkillOptions={allRoleSkills}
                                        onSelect={(roleSkill) =>
                                          handleOverride(entry.assessedSkill, roleSkill)
                                        }
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {preview.unmatched_role.length > 0 && (
                              <div className="mt-2 mb-4">
                                <p className="text-xs font-medium text-muted-foreground py-2">
                                  {preview.unmatched_role.length} role skill
                                  {preview.unmatched_role.length !== 1 ? 's' : ''} not covered by
                                  assessment
                                </p>
                                {preview.unmatched_role.map((roleSk) => (
                                  <div
                                    key={roleSk}
                                    className="py-1.5 text-sm text-muted-foreground/60 truncate pl-6 border-b border-gray-50 dark:border-gray-900"
                                  >
                                    {roleSk}
                                  </div>
                                ))}
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      {/* Footer legend */}
                      <div className="flex-shrink-0 border-t px-5 py-2 bg-muted/10 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="px-1.5 py-0.5 rounded-full text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/40 font-medium">
                            95%+ EXACT
                          </span>
                          exact match
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="px-1.5 py-0.5 rounded-full text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/40 font-medium">
                            84% FUZZY
                          </span>
                          fuzzy / AI match
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="px-1.5 py-0.5 rounded-full text-purple-700 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/40 font-medium">
                            MANUAL
                          </span>
                          you chose this
                        </span>
                      </div>
                    </>
                  ) : null}
                </div>
              </>
            )}

            {/* ── ALL ROLES MODE ───────────────────────────────────── */}
            {viewMode === 'all' && (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Toolbar */}
                <div className="flex-shrink-0 px-5 py-3 border-b bg-muted/20 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    {!bulkMatchDone && !bulkMatchRunning && (
                      <p className="text-sm text-muted-foreground">
                        Auto-match your {assessments.length} assessed skills against all{' '}
                        {roles.length} roles in parallel.
                      </p>
                    )}
                    {bulkMatchDone && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-foreground">
                          {bulkMatchedRoleCount} of {roles.length}
                        </span>{' '}
                        roles have matched skills ready to export.
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!bulkMatchDone && (
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={handleBulkMatch}
                        disabled={bulkMatchRunning || roles.length === 0}
                      >
                        {bulkMatchRunning ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Matching{' '}
                            {bulkMatchProgress}%...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 mr-1.5" /> Auto-Match All {roles.length} Roles
                          </>
                        )}
                      </Button>
                    )}
                    {bulkMatchDone && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleBulkMatch}
                          disabled={bulkMatchRunning}
                        >
                          <RefreshCw className="w-3.5 h-3.5 mr-1" /> Re-run
                        </Button>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={handleBulkExport}
                          disabled={bulkExporting || bulkMatchedRoleCount === 0}
                        >
                          {bulkExporting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Exporting{' '}
                              {bulkExportProgress}%...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-1.5" /> Export All Matched (
                              {bulkMatchedRoleCount} roles)
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                {(bulkMatchRunning || bulkExporting) && (
                  <div className="flex-shrink-0 px-5 pt-2">
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                        style={{
                          width: `${bulkMatchRunning ? bulkMatchProgress : bulkExportProgress}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Export summary */}
                {bulkExportSummary && (
                  <div className="flex-shrink-0 px-5 py-3 border-b">
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">Export complete:</span>
                      <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                        {bulkExportSummary.success} succeeded
                      </span>
                      {bulkExportSummary.failed > 0 && (
                        <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                          {bulkExportSummary.failed} failed
                        </span>
                      )}
                      {windowRecords && windowRecords.length > 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setWindowRecords(windowRecords)}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" /> View Details
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Search */}
                {bulkMatchDone && (
                  <div className="flex-shrink-0 px-5 pt-3 pb-2">
                    <div className="relative max-w-xs">
                      <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        value={bulkRoleSearch}
                        onChange={(e) => setBulkRoleSearch(e.target.value)}
                        placeholder="Filter roles..."
                        className="w-full pl-7 pr-3 py-1.5 text-sm bg-muted rounded-md border-0 outline-none focus:ring-1 focus:ring-indigo-400"
                      />
                    </div>
                  </div>
                )}

                {/* Empty / loading state */}
                {!bulkMatchRunning && !bulkMatchDone && (
                  <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 p-8">
                    <Layers className="w-10 h-10 opacity-30" />
                    <p className="text-base font-medium">Match all roles at once</p>
                    <p className="text-sm text-center max-w-sm">
                      Click <strong>Auto-Match All Roles</strong> to run skill matching for all{' '}
                      {roles.length} roles in parallel. Then review the results and export all with
                      one click.
                    </p>
                  </div>
                )}

                {/* Results table */}
                {(bulkMatchRunning || bulkMatchDone) && bulkStates.size > 0 && (
                  <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-sm" aria-label="Auto-match results by role">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th
                            scope="col"
                            className="px-5 py-2 text-left text-xs font-semibold text-muted-foreground"
                          >
                            Role
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground w-24"
                          >
                            Matched
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground w-24"
                          >
                            Unmatched
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground w-28"
                          >
                            Coverage
                          </th>
                          <th
                            scope="col"
                            className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground w-32"
                          >
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBulkRoles.map((role) => {
                          const state = bulkStates.get(role.id);
                          if (!state) return null;
                          const coverage = state.preview
                            ? Math.round(
                                (state.preview.match_count /
                                  Math.max(state.preview.total_role_skills, 1)) *
                                  100
                              )
                            : 0;
                          const isExpanded = expandedRoles.has(role.id);
                          const canExpand =
                            !state.loading &&
                            !state.error &&
                            state.preview &&
                            state.preview.match_count > 0;
                          return (
                            <React.Fragment key={role.id}>
                              <tr
                                className={`border-b border-gray-100 dark:border-gray-800 hover:bg-muted/30 ${canExpand ? 'cursor-pointer' : ''}`}
                                onClick={() => canExpand && toggleExpanded(role.id)}
                              >
                                <td className="px-5 py-2.5">
                                  <div className="flex items-center gap-2">
                                    {canExpand ? (
                                      <ChevronDown
                                        className={`w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-180' : ''}`}
                                      />
                                    ) : (
                                      <span className="w-3.5 h-3.5 shrink-0" />
                                    )}
                                    <p className="font-medium text-sm truncate max-w-xs">
                                      {role.title}
                                    </p>
                                    {state.exportRecord && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setWindowRecords([state.exportRecord!]);
                                        }}
                                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 shrink-0"
                                      >
                                        <Eye className="w-3 h-3" /> result
                                      </button>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  {state.loading ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground mx-auto" />
                                  ) : state.error ? (
                                    <span className="text-red-500 text-xs" title={state.error}>
                                      err
                                    </span>
                                  ) : (
                                    <span className="font-medium text-green-600 dark:text-green-400">
                                      {state.preview?.match_count ?? 0}
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2.5 text-center text-muted-foreground">
                                  {!state.loading && !state.error && state.preview
                                    ? state.preview.unmatched_assessed.length
                                    : '—'}
                                </td>
                                <td className="px-3 py-2.5 text-center">
                                  {!state.loading && !state.error && state.preview ? (
                                    <div className="flex items-center gap-2 justify-center">
                                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${coverage >= 70 ? 'bg-green-500' : coverage >= 40 ? 'bg-yellow-500' : 'bg-red-400'}`}
                                          style={{ width: `${coverage}%` }}
                                        />
                                      </div>
                                      <span className="text-xs tabular-nums">{coverage}%</span>
                                    </div>
                                  ) : (
                                    '—'
                                  )}
                                </td>
                                <td className="px-3 py-2.5">
                                  {state.loading ? (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Loader2 className="w-3 h-3 animate-spin" /> matching...
                                    </span>
                                  ) : state.error ? (
                                    <span className="text-xs text-red-500 flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3" /> error
                                    </span>
                                  ) : state.exported ? (
                                    state.exportRecord?.success ? (
                                      <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" /> exported
                                      </span>
                                    ) : (
                                      <span className="text-xs text-red-500 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> failed
                                      </span>
                                    )
                                  ) : state.preview && state.preview.match_count > 0 ? (
                                    <span className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" /> ready
                                    </span>
                                  ) : state.preview ? (
                                    <span className="text-xs text-muted-foreground/60">
                                      no matches
                                    </span>
                                  ) : null}
                                </td>
                              </tr>
                              {isExpanded && canExpand && state.preview && (
                                <tr key={`${role.id}-detail`} className="bg-muted/20">
                                  <td colSpan={5} className="px-8 pb-3 pt-1">
                                    <div className="rounded-md border border-border overflow-hidden">
                                      <table className="w-full text-xs">
                                        <thead className="bg-muted/60">
                                          <tr>
                                            <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">
                                              Assessed Skill
                                            </th>
                                            <th className="px-3 py-1.5 text-left font-semibold text-muted-foreground">
                                              Role Skill (Eightfold)
                                            </th>
                                            <th className="px-3 py-1.5 text-center font-semibold text-muted-foreground w-20">
                                              Match
                                            </th>
                                            <th className="px-3 py-1.5 text-center font-semibold text-muted-foreground w-16">
                                              Conf.
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {state.preview.matches.map((m, i) => (
                                            <tr key={i} className="border-t border-border/50">
                                              <td className="px-3 py-1.5 font-medium">
                                                {m.assessed_skill}
                                              </td>
                                              <td className="px-3 py-1.5 text-muted-foreground">
                                                {m.role_skill}
                                              </td>
                                              <td className="px-3 py-1.5 text-center">
                                                <span
                                                  className={`px-1.5 py-0.5 rounded-full font-medium ${confidenceColor(m.confidence, m.method)}`}
                                                >
                                                  {methodLabel(m.method)}
                                                </span>
                                              </td>
                                              <td className="px-3 py-1.5 text-center tabular-nums text-muted-foreground">
                                                {Math.round(m.confidence * 100)}%
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Eightfold Window — request/response overlay */}
      {windowRecords !== null && windowRecords.length > 0 && (
        <EightfoldWindow records={windowRecords} onClose={() => setWindowRecords(null)} />
      )}
    </>
  );
}
