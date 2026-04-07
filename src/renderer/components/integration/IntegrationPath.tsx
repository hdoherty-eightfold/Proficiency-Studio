import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Upload,
  FileText,
  Server,
  HardDrive,
  CheckCircle,
  X,
  Download,
  RefreshCw,
  ArrowRight,
  ChevronLeft,
} from 'lucide-react';
import { useAppStore, type Skill } from '../../stores/app-store';
import { useToast } from '../../stores/toast-store';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';
import { api } from '../../services/api';
import SFTPManager from '../sftp/SFTPManager';
import EightfoldAuth from '../api/EightfoldAuth';
import SkillsTableEditor from '../skills/SkillsTableEditor';
import {
  safeStorage,
  fetchWithTimeout,
  readFileWithEncoding,
  validateFile,
  getUserFriendlyMessage,
} from '../../lib/errors';

// Types
type IntegrationType = 'csv' | 'api' | 'sftp' | null;

interface SampleFile {
  name: string;
  path: string;
  description: string;
  skillCount: number;
}

export default function IntegrationPath() {
  const {
    nextStep,
    previousStep,
    setLoading,
    setError,
    currentStep,
    getStepName,
    setSkillsState,
    skillsState,
    markStepCompleted,
  } = useAppStore();
  const { toast } = useToast();

  // Clear global error on mount
  useEffect(() => {
    setError(null);
  }, [setError]);

  // State
  const [selectedType, setSelectedType] = useState<IntegrationType>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [csvUploadStatus, setCsvUploadStatus] = useState<
    'idle' | 'uploading' | 'success' | 'error'
  >('idle');
  const [loadingSample, setLoadingSample] = useState<string | null>(null);
  const [showCSVEditor, setShowCSVEditor] = useState(false);

  // Sample files with proper descriptions
  const sampleFiles: SampleFile[] = [
    {
      name: 'Comprehensive Tech Skills',
      path: '/samples/skills/comprehensive_tech_skills.csv',
      description: 'Full tech stack coverage',
      skillCount: 170,
    },
    {
      name: 'Software Engineering',
      path: '/samples/skills/software_engineering_skills.csv',
      description: 'Core dev skills',
      skillCount: 40,
    },
    {
      name: 'Data Science',
      path: '/samples/skills/data_science_skills.csv',
      description: 'ML & analytics',
      skillCount: 40,
    },
    {
      name: 'Cybersecurity',
      path: '/samples/skills/cybersecurity_skills.csv',
      description: 'Security & compliance',
      skillCount: 40,
    },
  ];

  // Load saved state
  useEffect(() => {
    const savedType = localStorage.getItem('profstudio_integration_type') as IntegrationType;
    if (savedType) {
      setSelectedType(savedType);
    }
  }, []);

  // Handlers
  const handleFileSelect = useCallback(
    async (file: File) => {
      // Validate file using error utilities
      const validation = validateFile(file, {
        maxSize: 100 * 1024 * 1024, // 100MB
        allowedExtensions: ['.csv'],
      });

      if (!validation.valid && validation.error) {
        setError(getUserFriendlyMessage(validation.error));
        toast({
          variant: 'destructive',
          title: 'Invalid File',
          description: validation.error.details || validation.error.message,
        });
        return;
      }

      try {
        setLoading(true, 'Processing CSV...');
        setError(null);
        setCsvUploadStatus('uploading');

        // Read file with proper encoding detection
        const { content: fileContent } = await readFileWithEncoding(file);
        // Extract skills
        const response = await api.post<{ skills: Skill[]; total_count: number; file_id?: string }>(
          '/api/skills/extract/csv',
          {
            filename: file.name,
            file_content: fileContent,
          }
        );

        setCsvFile(file);
        setCsvUploadStatus('success');

        // Use safe storage to avoid quota errors
        safeStorage.setItem('profstudio_integration_type', 'csv');
        safeStorage.setItem('profstudio_csv_filename', file.name);

        // For large content, check if we can store it
        const contentResult = safeStorage.setItem('profstudio_csv_content', fileContent);
        if (!contentResult.success) {
          // Content too large - store flag and rely on file_id
          console.warn('CSV content too large for localStorage, using file_id reference');
          safeStorage.setItem('profstudio_csv_content_large', 'true');
          safeStorage.removeItem('profstudio_csv_content');
        } else if (contentResult.warning) {
          console.warn(contentResult.warning);
        }

        if (response.skills) {
          setSkillsState({
            skills: response.skills,
            totalCount: response.total_count,
            extractionStatus: 'success',
            extractionSource: 'csv',
            extractionError: null,
            extractedAt: new Date().toISOString(),
          });
        }

        toast({
          title: `${getStepName(currentStep)} Completed!`,
          description: `CSV processed: ${response.total_count || 0} skills extracted. Review your data before continuing.`,
        });

        // Show skills editor automatically so user can review data
        setShowCSVEditor(true);
      } catch (err: unknown) {
        console.error('CSV upload error:', err);
        const errMessage = err instanceof Error ? err.message : 'Error processing CSV file';
        setCsvUploadStatus('error');
        setError(errMessage);
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: errMessage,
        });
      } finally {
        setLoading(false);
      }
    },
    [setError, setLoading, currentStep, getStepName, toast, setSkillsState]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files && files[0]) handleFileSelect(files[0]);
    },
    [handleFileSelect]
  );

  // Handle loading sample files
  const handleSampleLoad = useCallback(
    async (sample: SampleFile) => {
      try {
        setLoadingSample(sample.path);
        setLoading(true, `Loading ${sample.name}...`);
        setError(null);
        setCsvUploadStatus('uploading');

        // Fetch the sample file with timeout (30 seconds)
        const fetchResponse = await fetchWithTimeout(sample.path, {}, 30000);
        if (!fetchResponse.ok) {
          throw new Error(`Failed to load sample file: ${fetchResponse.statusText}`);
        }

        const fileContent = await fetchResponse.text();
        const filename = sample.path.split('/').pop() || 'sample.csv';

        // Send to backend API for processing and storage (same as handleFileSelect)
        const response = await api.post<{ skills: Skill[]; total_count: number; file_id?: string }>(
          '/api/skills/extract/csv',
          {
            filename: filename,
            file_content: fileContent,
          }
        );

        // Create a mock File object for display
        const blob = new Blob([fileContent], { type: 'text/csv' });
        const file = new File([blob], filename, { type: 'text/csv' });
        setCsvFile(file);
        setCsvUploadStatus('success');

        // Use safe storage to avoid quota errors
        safeStorage.setItem('profstudio_integration_type', 'csv');
        safeStorage.setItem('profstudio_csv_filename', filename);

        // For large content, check if we can store it
        const contentResult = safeStorage.setItem('profstudio_csv_content', fileContent);
        if (!contentResult.success) {
          console.warn('Sample content too large for localStorage, using file_id reference');
          safeStorage.setItem('profstudio_csv_content_large', 'true');
          safeStorage.removeItem('profstudio_csv_content');
        }

        // Use skills from backend response
        if (response.skills) {
          setSkillsState({
            skills: response.skills,
            totalCount: response.total_count,
            extractionStatus: 'success',
            extractionSource: 'csv',
            extractionError: null,
            extractedAt: new Date().toISOString(),
          });
        }

        toast({
          title: 'Sample Loaded!',
          description: `Loaded ${sample.name} with ${response.total_count || 0} items.`,
        });

        // Show skills editor automatically so user can review data
        setShowCSVEditor(true);
      } catch (err: unknown) {
        console.error('Sample load error:', err);
        setCsvUploadStatus('error');
        // Provide better error message for timeouts
        const errMsg = err instanceof Error ? err.message : 'Error loading sample file';
        const errorMessage = errMsg.includes('timed out')
          ? 'Request timed out. Please check your connection and try again.'
          : errMsg;
        setError(errorMessage);
        toast({
          variant: 'destructive',
          title: 'Load Failed',
          description: errorMessage,
        });
      } finally {
        setLoading(false);
        setLoadingSample(null);
      }
    },
    [setError, setLoading, toast, setSkillsState]
  );

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };
  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

  return (
    <motion.div
      className="max-w-6xl mx-auto p-8"
      variants={stagger}
      initial="hidden"
      animate="show"
    >
      <Card className="border-none shadow-none bg-transparent">
        <motion.div variants={fadeUp} className="mb-4">
          <Button variant="back-nav" size="sm" onClick={previousStep} className="gap-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>
        </motion.div>
        <motion.div variants={fadeUp} className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 mb-4">
            <Server className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-2">Choose Integration Path</h2>
          <p className="text-muted-foreground">Select how you want to import your skills data</p>

          {selectedType && (
            <div className="mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedType(null);
                  setCsvFile(null);
                  setCsvUploadStatus('idle');
                }}
                className="gap-2"
              >
                <X className="w-4 h-4" />
                Change Integration Type
              </Button>
            </div>
          )}
        </motion.div>

        {!selectedType && (
          <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card
              variant="glass"
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 hover:border-purple-400 dark:hover:border-purple-400"
              onClick={() => setSelectedType('csv')}
            >
              <CardContent className="p-6 text-center pt-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
                  <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">CSV Upload</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Upload a CSV file with your skills data
                </p>
                <Button variant="outline-blue" className="w-full">
                  Select CSV
                </Button>
              </CardContent>
            </Card>

            <Card
              variant="glass"
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 hover:border-purple-400 dark:hover:border-purple-400"
              onClick={() => setSelectedType('sftp')}
            >
              <CardContent className="p-6 text-center pt-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/30 mb-4">
                  <HardDrive className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">SFTP Server</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Connect to SFTP server to download files
                </p>
                <Button variant="outline-orange" className="w-full">
                  Select SFTP
                </Button>
              </CardContent>
            </Card>

            <Card
              variant="glass"
              className="cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-2 hover:border-purple-400 dark:hover:border-purple-400"
              onClick={() => setSelectedType('api')}
            >
              <CardContent className="p-6 text-center pt-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                  <Server className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-xl font-bold mb-2">API Connection</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Connect to Eightfold API to fetch roles
                </p>
                <Button variant="outline-green" className="w-full">
                  Select API
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {selectedType === 'csv' && (
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-6">
            <div className="max-w-2xl mx-auto space-y-6">
              <div
                className={cn(
                  'relative border-2 border-dashed rounded-lg p-12 text-center transition-all duration-200',
                  isDragging && 'border-purple-500 bg-purple-50 dark:bg-purple-900/20',
                  !isDragging && 'border-gray-300 dark:border-gray-600 hover:border-purple-400',
                  csvUploadStatus === 'success' &&
                    'border-green-500 bg-green-50 dark:bg-green-900/20',
                  csvUploadStatus === 'error' && 'border-red-500 bg-red-50 dark:bg-red-900/20'
                )}
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                }}
              >
                {csvUploadStatus === 'success' ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-lg font-semibold text-green-700 dark:text-green-300">
                      File uploaded successfully!
                    </p>
                    <p className="text-sm text-gray-500">
                      {csvFile?.name} ({(csvFile!.size / 1024).toFixed(2)} KB)
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Upload className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold mb-1">Drop your CSV file here</p>
                      <p className="text-sm text-gray-500">
                        Supports CSV files (.csv) • Max size: 100 MB
                      </p>
                    </div>
                    <Button onClick={() => document.getElementById('csv-upload')?.click()}>
                      Browse Files
                    </Button>
                    <input
                      type="file"
                      id="csv-upload"
                      className="hidden"
                      accept=".csv"
                      onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                    />
                  </div>
                )}
              </div>

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">Or load sample data:</p>
                <div className="grid grid-cols-2 gap-3">
                  {sampleFiles.map((sample) => (
                    <button
                      key={sample.path}
                      onClick={() => handleSampleLoad(sample)}
                      disabled={loadingSample !== null}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg border text-left transition-all',
                        'bg-card hover:bg-accent hover:border-primary/50',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        loadingSample === sample.path && 'border-primary bg-primary/5'
                      )}
                    >
                      <div
                        className={cn(
                          'shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
                          loadingSample === sample.path ? 'bg-primary/10' : 'bg-muted'
                        )}
                      >
                        {loadingSample === sample.path ? (
                          <RefreshCw className="w-4 h-4 text-primary animate-spin" />
                        ) : (
                          <Download className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{sample.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {sample.description} • {sample.skillCount} records
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Continue button - always visible when CSV upload succeeds */}
              {csvUploadStatus === 'success' && skillsState.extractionStatus === 'success' && (
                <div className="flex justify-center py-4">
                  <Button onClick={nextStep} size="lg" className="gap-2 px-8">
                    Continue to Extract Skills
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Skills Editor - full width */}
            {showCSVEditor && skillsState.skills.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Review & Edit Data
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowCSVEditor(false)}>
                    <X className="w-4 h-4 mr-1" />
                    Close Editor
                  </Button>
                </div>
                <SkillsTableEditor
                  skills={skillsState.skills}
                  onSkillsChange={(updatedSkills) => {
                    setSkillsState({
                      ...skillsState,
                      skills: updatedSkills,
                      totalCount: updatedSkills.length,
                    });
                  }}
                  onClose={() => setShowCSVEditor(false)}
                />
              </div>
            )}
          </motion.div>
        )}

        {/* SFTP Integration - Full Implementation */}
        {selectedType === 'sftp' && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="max-w-4xl mx-auto"
          >
            <SFTPManager mode="select" />
          </motion.div>
        )}

        {/* API Integration - Full Implementation */}
        {selectedType === 'api' && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="max-w-4xl mx-auto"
          >
            <EightfoldAuth
              onSkillsExtracted={() => {
                markStepCompleted(1); // Mark Integration step complete
                safeStorage.setItem('profstudio_integration_type', 'api');
              }}
            />
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
}
