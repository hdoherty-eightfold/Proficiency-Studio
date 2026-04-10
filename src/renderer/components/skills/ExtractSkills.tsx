import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  Server,
  HardDrive,
  CheckCircle,
  Zap,
  Database,
  Users,
  Clock,
  Activity,
  Eye,
  ChevronLeft,
} from 'lucide-react';
import { useAppStore, Skill } from '../../stores/app-store';
import { useToast } from '../../stores/toast-store';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { api } from '../../services/api';
import SkillsTableEditor from './SkillsTableEditor';

// Types
interface ExtractedSkillsResponse {
  skills: Skill[];
  total_count: number;
  extraction_source: 'csv' | 'api' | 'sftp';
  extraction_time: string;
  source_info: Record<string, unknown>;
  roles?: Array<Record<string, unknown>>;
}

export default function ExtractSkills() {
  const {
    skillsState,
    updateSkillsState,
    nextStep,
    previousStep,
    setLoading,
    setError,
    isLoading,
  } = useAppStore();

  const { toast } = useToast();

  // Local state
  const [showSkillsList, setShowSkillsList] = useState(false);
  const [sourceType, setSourceType] = useState<'csv' | 'api' | 'sftp' | null>(null);
  const [sourceInfo, setSourceInfo] = useState<{
    filename?: string | null;
    fileId?: string | null;
    csvContent?: string | null;
    sftpCredentialId?: string | null;
    sftpRemotePath?: string | null;
  } | null>(null);

  const [rolesCount, setRolesCount] = useState(0);

  // Load integration source — prefer store (live) over localStorage (persisted)
  useEffect(() => {
    // If the store already has a successful extraction, use its source directly
    const storeSource = skillsState.extractionSource;
    const localSource = localStorage.getItem('profstudio_integration_type') as
      | 'csv'
      | 'api'
      | 'sftp'
      | null;
    const resolvedSource = storeSource ?? localSource;
    setSourceType(resolvedSource);

    if (resolvedSource === 'csv') {
      setSourceInfo({
        filename: localStorage.getItem('profstudio_csv_filename'),
        fileId: localStorage.getItem('profstudio_csv_file_id'),
        csvContent: localStorage.getItem('profstudio_csv_content'),
      });
    } else if (resolvedSource === 'sftp') {
      setSourceInfo({
        filename: localStorage.getItem('profstudio_sftp_filename'),
        fileId: null,
        csvContent: null,
        sftpCredentialId: localStorage.getItem('profstudio_sftp_credential_id'),
        sftpRemotePath: localStorage.getItem('profstudio_sftp_remote_path'),
      });
    }

    // Load roles count from Eightfold extraction data (API path only)
    if (resolvedSource === 'api') {
      try {
        const raw = localStorage.getItem('skillsExtractionData');
        if (raw) {
          const data = JSON.parse(raw);
          if (data.roles && Array.isArray(data.roles)) {
            setRolesCount(data.roles.length);
          }
        }
      } catch {
        /* ignore */
      }
    } else {
      setRolesCount(0);
    }
  }, [skillsState.extractionSource]);

  const handleExtractSkills = async () => {
    if (!sourceType) {
      setError('No data source selected. Please go back to Step 1.');
      return;
    }

    try {
      setLoading(true, 'Extracting skills...');
      setError(null);
      updateSkillsState({
        extractionStatus: 'extracting',
        extractionError: null,
      });

      let endpoint = '';
      let payload = {};

      switch (sourceType) {
        case 'csv':
          endpoint = '/api/skills/extract/csv';
          payload = {
            filename: sourceInfo?.filename,
          };
          // If we had file content stored, we might want to send it, but usually file_id is better
          // For now assuming backend can handle it or we re-upload if needed.
          // In the desktop app, we might need a dedicated "re-read file" logic.
          const content = localStorage.getItem('profstudio_csv_content');
          if (content) {
            payload = { ...payload, file_content: content };
          }
          break;
        case 'api':
          endpoint = '/api/skills/extract/api';
          break;
        case 'sftp':
          endpoint = '/api/skills/extract/sftp';
          payload = {
            credential_id: localStorage.getItem('profstudio_sftp_credential_id'),
            remote_path: localStorage.getItem('profstudio_sftp_remote_path'),
          };
          break;
      }

      const response = await api.post<ExtractedSkillsResponse>(endpoint, payload);

      updateSkillsState({
        skills: response.skills,
        totalCount: response.total_count,
        extractionStatus: 'success',
        extractionSource: response.extraction_source,
        extractionError: null,
        extractedAt: response.extraction_time,
      });

      setRolesCount(response.roles?.length ?? 0);

      toast({
        title: 'Success',
        description: `Extracted ${response.total_count} skills`,
      });
    } catch (err: unknown) {
      console.error('Skills extraction error:', err);
      const message = err instanceof Error ? err.message : 'Failed to extract skills';
      updateSkillsState({
        extractionStatus: 'error',
        extractionError: message,
      });
      setError(message);
      toast({
        variant: 'destructive',
        title: 'Extraction Failed',
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  const getSourceIcon = () => {
    switch (sourceType) {
      case 'csv':
        return <FileText className="w-5 h-5" />;
      case 'api':
        return <Server className="w-5 h-5" />;
      case 'sftp':
        return <HardDrive className="w-5 h-5" />;
      default:
        return <Database className="w-5 h-5" />;
    }
  };

  const getSourceLabel = () => {
    switch (sourceType) {
      case 'csv':
        return 'CSV Upload';
      case 'api':
        return 'API Connection';
      case 'sftp':
        return 'SFTP Server';
      default:
        return 'Unknown Source';
    }
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };
  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

  return (
    <motion.div className="p-6 space-y-6" variants={stagger} initial="hidden" animate="show">
      <Card className="border-none shadow-none bg-transparent">
        <motion.div variants={fadeUp} className="mb-4">
          <Button variant="back-nav" size="sm" onClick={previousStep} className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
        </motion.div>
        <motion.div variants={fadeUp} className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-success/20 to-success/5 mb-4">
            <Zap className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-3xl font-bold mb-2">Extract Skills</h2>
          <p className="text-muted-foreground">
            Extract unique skills from your selected data source
          </p>
        </motion.div>

        {/* Data Source Info */}
        <motion.div
          variants={fadeUp}
          className="mb-8 p-4 bg-muted/50 rounded-lg border border-border"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getSourceIcon()}
              <div>
                <p className="font-semibold text-foreground">Data Source: {getSourceLabel()}</p>
                <p className="text-sm text-muted-foreground">
                  {(sourceType === 'csv' || sourceType === 'sftp') &&
                    sourceInfo?.filename &&
                    `File: ${sourceInfo.filename}`}
                </p>
              </div>
            </div>
            {skillsState.extractionStatus === 'success' && (
              <div className="flex items-center gap-2 text-sm text-success">
                <CheckCircle className="w-4 h-4" />
                <span>Extracted {skillsState.totalCount} skills</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          variants={fadeUp}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
        >
          <Card variant="glass" className="bg-primary/5 border-primary/20">
            <CardContent className="p-6 text-center">
              <div className="inline-flex justify-center items-center w-12 h-12 rounded-xl bg-primary/10 mb-3">
                <Database className="w-6 h-6 text-primary" />
              </div>
              <div className="text-2xl font-bold">{skillsState.totalCount}</div>
              <div className="text-sm text-muted-foreground">Total Skills</div>
            </CardContent>
          </Card>

          <Card variant="glass" className="bg-warning/5 border-warning/20">
            <CardContent className="p-6 text-center">
              <div className="inline-flex justify-center items-center w-12 h-12 rounded-xl bg-warning/10 mb-3">
                <Users className="w-6 h-6 text-warning" />
              </div>
              {sourceType === 'api' ? (
                <>
                  <div className="text-2xl font-bold">{rolesCount}</div>
                  <div className="text-sm text-muted-foreground">Roles Found</div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {new Set(skillsState.skills.map((s) => s.category).filter(Boolean)).size}
                  </div>
                  <div className="text-sm text-muted-foreground">Categories</div>
                </>
              )}
            </CardContent>
          </Card>

          <Card variant="glass" className="bg-success/5 border-success/20">
            <CardContent className="p-6 text-center">
              <div className="inline-flex justify-center items-center w-12 h-12 rounded-xl bg-success/10 mb-3">
                <Activity className="w-6 h-6 text-success" />
              </div>
              <div className="text-xl font-bold capitalize">
                {skillsState.extractionStatus === 'idle' ? 'Pending' : skillsState.extractionStatus}
              </div>
              <div className="text-sm text-muted-foreground">Status</div>
            </CardContent>
          </Card>

          <Card variant="glass" className="bg-info/5 border-info/20">
            <CardContent className="p-6 text-center">
              <div className="inline-flex justify-center items-center w-12 h-12 rounded-xl bg-info/10 mb-3">
                <Clock className="w-6 h-6 text-info" />
              </div>
              <div className="text-lg font-bold">
                {skillsState.extractedAt
                  ? new Date(skillsState.extractedAt).toLocaleDateString()
                  : '--'}
              </div>
              <div className="text-sm text-muted-foreground">Last Extracted</div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Error state */}
        {skillsState.extractionStatus === 'error' && skillsState.extractionError && (
          <div
            role="alert"
            className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-center"
          >
            <p className="text-sm font-medium text-destructive">{skillsState.extractionError}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Correct the issue above and try again.
            </p>
          </div>
        )}

        {/* Empty state — no source configured */}
        {!sourceType && skillsState.extractionStatus === 'idle' && (
          <div className="mb-6 p-6 bg-muted/30 border border-border rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              No data source detected. Go back to Step 1 to choose an integration type.
            </p>
          </div>
        )}

        {/* Actions */}
        {skillsState.extractionStatus !== 'success' && (
          <div className="flex justify-center mb-8">
            <Button
              size="lg"
              onClick={handleExtractSkills}
              disabled={isLoading || !sourceType}
              className="px-8"
            >
              {isLoading ? 'Extracting...' : 'Extract Skills'}
            </Button>
          </div>
        )}

        {skillsState.extractionStatus === 'success' && skillsState.skills.length === 0 && (
          <div className="mb-6 p-8 bg-muted/30 border border-border rounded-lg text-center">
            <Database className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">No skills extracted</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The extraction completed but found no skills. Check that your data source contains
              skill information.
            </p>
            <Button variant="outline" onClick={handleExtractSkills}>
              Try Again
            </Button>
          </div>
        )}

        {skillsState.extractionStatus === 'success' && skillsState.skills.length > 0 && (
          <div className="space-y-6">
            <div className="flex justify-center gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowSkillsList(!showSkillsList)}
                className="gap-2 arc-border"
              >
                <Eye className="w-4 h-4" />
                {showSkillsList ? 'Hide' : 'View'} Skills List
              </Button>
              <Button onClick={nextStep}>Continue</Button>
            </div>

            {showSkillsList && (
              <div className="mt-6">
                <SkillsTableEditor
                  skills={skillsState.skills}
                  onSkillsChange={(updatedSkills) => {
                    updateSkillsState({ skills: updatedSkills });
                    localStorage.setItem('extractedSkills', JSON.stringify(updatedSkills));
                  }}
                />
              </div>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
}
