import { useState, useEffect, useRef } from 'react';
import {
  HardDrive,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Folder,
  File,
  ChevronRight,
  Download,
  Server,
  CheckCircle,
  Loader2,
  Plug,
  PlugZap,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { cn } from '../../lib/utils';
import { api } from '../../services/api';
import { useToast } from '../../stores/toast-store';
import { useAppStore } from '../../stores/app-store';

// Types
interface SFTPCredential {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  remote_path?: string;
  status?: 'connected' | 'failed' | 'unknown';
  last_tested?: string;
}

interface RawSFTPFileItem {
  name: string;
  path?: string;
  is_directory?: boolean;
  type?: string;
  size?: number;
  modified?: string;
  modified_at?: string;
  permissions?: string;
}

interface SFTPFile {
  name: string;
  path: string;
  is_directory: boolean;
  size?: number;
  modified?: string;
  permissions?: string;
}

interface SFTPManagerProps {
  onFileSelected?: (content: string, filename: string) => void;
  mode?: 'browse' | 'select';
}

export default function SFTPManager({ onFileSelected, mode = 'browse' }: SFTPManagerProps) {
  const { toast } = useToast();
  const {
    setSkillsState,
    nextStep,
    autoAdvanceEnabled,
    setConnectedSFTPServer,
    connectedSFTPServer,
  } = useAppStore();

  // State
  const [credentials, setCredentials] = useState<SFTPCredential[]>([]);
  const [selectedCredential, setSelectedCredential] = useState<SFTPCredential | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [_error, _setError] = useState<string | null>(null);
  const [confirmingCredDelete, setConfirmingCredDelete] = useState<SFTPCredential | null>(null);

  // Form state for creating/editing credentials
  const [showForm, setShowForm] = useState(false);
  const [editingCredential, setEditingCredential] = useState<SFTPCredential | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 22,
    username: '',
    password: '',
    remote_path: '/',
  });

  // File browser state
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<SFTPFile[]>([]);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'disconnected' | 'testing' | 'connected' | 'failed'
  >('disconnected');
  const [selectedFile, setSelectedFile] = useState<SFTPFile | null>(null);

  // Abort controller refs for cleanup
  const browseAbortRef = useRef<AbortController | null>(null);
  const downloadAbortRef = useRef<AbortController | null>(null);
  const testConnectionAbortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // Load credentials on mount and cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    loadCredentials();

    return () => {
      mountedRef.current = false;
      browseAbortRef.current?.abort();
      downloadAbortRef.current?.abort();
      testConnectionAbortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally mount-only: loadCredentials/handleBrowse are defined below and stable

  const loadCredentials = async () => {
    try {
      setIsLoading(true);
      const response = await api.listSFTPCredentials();
      const loaded: SFTPCredential[] = response.credentials || [];
      setCredentials(loaded);

      // If we already have a connected server from the store, auto-browse it
      if (connectedSFTPServer) {
        const match = loaded.find((c) => c.id === connectedSFTPServer.id);
        if (match && mountedRef.current) {
          handleBrowse({ ...match, status: 'connected' }, match.remote_path || '/');
        }
      }
    } catch (err: unknown) {
      console.error('Failed to load SFTP credentials:', err);
      _setError(err instanceof Error ? err.message : 'Failed to load credentials');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async (credential: SFTPCredential) => {
    // Abort any previous test operation
    testConnectionAbortRef.current?.abort();
    testConnectionAbortRef.current = new AbortController();

    try {
      setConnectionStatus('testing');
      const response = await api.testSFTPConnection({ credential_id: credential.id });

      // Check if component is still mounted
      if (!mountedRef.current) return;

      if (response.success) {
        setConnectionStatus('connected');
        toast({
          title: 'Connection Successful',
          description: `Connected to ${credential.host}`,
        });
        // Update credential status locally
        setCredentials((prev) =>
          prev.map((c) => (c.id === credential.id ? { ...c, status: 'connected' } : c))
        );
      } else {
        setConnectionStatus('failed');
        toast({
          variant: 'destructive',
          title: 'Connection Failed',
          description: response.error || 'Could not connect to server',
        });
      }
    } catch (err: unknown) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') return;
      if (!mountedRef.current) return;

      setConnectionStatus('failed');
      toast({
        variant: 'destructive',
        title: 'Connection Failed',
        description: err instanceof Error ? err.message : 'Could not connect to server',
      });
    }
  };

  const handleBrowse = async (credential: SFTPCredential, path: string = '/') => {
    // Abort any previous browse operation
    browseAbortRef.current?.abort();
    browseAbortRef.current = new AbortController();

    try {
      setIsBrowsing(true);
      setSelectedCredential(credential);
      setCurrentPath(path);

      const response = await api.browseSFTP({
        credential_id: credential.id,
        path: path,
      });

      // Check if component is still mounted
      if (!mountedRef.current) return;

      setSelectedFile(null);
      setFiles(
        (response.files || response.items || []).map((f: RawSFTPFileItem) => {
          const basePath = path === '/' ? '' : path;
          return {
            name: f.name,
            // Backend FileItem has no path field — construct it
            path: f.path ?? `${basePath}/${f.name}`,
            is_directory: f.is_directory ?? f.type === 'directory',
            size: f.size,
            modified: f.modified || f.modified_at,
            permissions: f.permissions,
          };
        })
      );
      setConnectionStatus('connected');
      // Track connected SFTP server in global store for sidebar indicator
      setConnectedSFTPServer({ id: credential.id, name: credential.name, host: credential.host });
      // Update credential status locally
      setCredentials((prev) =>
        prev.map((c) => (c.id === credential.id ? { ...c, status: 'connected' } : c))
      );
    } catch (err: unknown) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') return;
      if (!mountedRef.current) return;

      console.error('Failed to browse SFTP:', err);
      toast({
        variant: 'destructive',
        title: 'Browse Failed',
        description: err instanceof Error ? err.message : 'Could not browse directory',
      });
      setConnectionStatus('failed');
    } finally {
      if (mountedRef.current) {
        setIsBrowsing(false);
      }
    }
  };

  const handleNavigate = (file: SFTPFile) => {
    if (file.is_directory) {
      handleBrowse(selectedCredential!, file.path);
    }
  };

  const handleNavigateUp = () => {
    if (currentPath === '/') return;
    const parentPath = currentPath.split('/').slice(0, -1).join('/') || '/';
    handleBrowse(selectedCredential!, parentPath);
  };

  const handleDownloadFile = async (file: SFTPFile) => {
    if (!selectedCredential) return;

    // Abort any previous download operation
    downloadAbortRef.current?.abort();
    downloadAbortRef.current = new AbortController();

    try {
      setIsDownloading(true);
      toast({
        title: 'Downloading...',
        description: `Downloading ${file.name}`,
      });

      const response = await api.downloadFromSFTP({
        credential_id: selectedCredential.id,
        remote_path: file.path,
      });

      // Check if component is still mounted
      if (!mountedRef.current) return;

      if (mode === 'select' && onFileSelected && response.content) {
        onFileSelected(response.content, file.name);
      }

      // Always record the integration type and source info for downstream steps
      localStorage.setItem('profstudio_integration_type', 'sftp');
      localStorage.setItem('profstudio_sftp_credential_id', selectedCredential.id);
      localStorage.setItem('profstudio_sftp_remote_path', file.path);
      localStorage.setItem('profstudio_sftp_filename', file.name);

      // If it's a CSV, extract skills
      if (file.name.endsWith('.csv')) {
        const skillsResponse = await api.extractSkillsFromSFTP({
          credential_id: selectedCredential.id,
          remote_path: file.path,
        });

        if (!mountedRef.current) return;

        if (skillsResponse.skills) {
          setSkillsState({
            skills: skillsResponse.skills,
            totalCount: skillsResponse.total_count,
            extractionStatus: 'success',
            extractionSource: 'sftp',
            extractionError: null,
            extractedAt: new Date().toISOString(),
          });

          toast({
            title: 'Skills Extracted!',
            description: `Extracted ${skillsResponse.total_count} skills from ${file.name}`,
          });

          if (autoAdvanceEnabled) {
            setTimeout(() => nextStep(), 1500);
          }
        }
      } else {
        toast({
          title: 'File Selected',
          description: `${file.name} selected. Go to Extract Skills to process it.`,
        });
      }
    } catch (err: unknown) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') return;
      if (!mountedRef.current) return;

      console.error('Failed to download file:', err);
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: err instanceof Error ? err.message : 'Could not download file',
      });
    } finally {
      if (mountedRef.current) {
        setIsDownloading(false);
      }
    }
  };

  const handleSaveCredential = async () => {
    try {
      setIsLoading(true);

      if (editingCredential) {
        await api.updateSFTPCredential(editingCredential.id, formData);
        toast({
          title: 'Credential Updated',
          description: `Updated ${formData.name}`,
        });
      } else {
        await api.createSFTPCredential(formData);
        toast({
          title: 'Credential Created',
          description: `Added ${formData.name}`,
        });
      }

      setShowForm(false);
      setEditingCredential(null);
      setFormData({ name: '', host: '', port: 22, username: '', password: '', remote_path: '/' });
      loadCredentials();
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: err instanceof Error ? err.message : 'Could not save credential',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCredential = async (credential: SFTPCredential) => {
    try {
      await api.deleteSFTPCredential(credential.id);
      toast({
        title: 'Credential Deleted',
        description: `Removed ${credential.name}`,
      });
      loadCredentials();
      if (selectedCredential?.id === credential.id) {
        setSelectedCredential(null);
        setFiles([]);
      }
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: err instanceof Error ? err.message : 'Could not delete credential',
      });
    }
  };

  const handleEditCredential = (credential: SFTPCredential) => {
    setEditingCredential(credential);
    setFormData({
      name: credential.name,
      host: credential.host,
      port: credential.port,
      username: credential.username,
      password: '', // Don't show existing password
      remote_path: credential.remote_path || '/',
    });
    setShowForm(true);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <HardDrive className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h3 className="font-semibold">SFTP Server Connection</h3>
            <p className="text-sm text-gray-500">Connect to SFTP servers to download files</p>
          </div>
        </div>
        <Button
          onClick={() => {
            setShowForm(true);
            setEditingCredential(null);
            setFormData({
              name: '',
              host: '',
              port: 22,
              username: '',
              password: '',
              remote_path: '/',
            });
          }}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Server
        </Button>
      </div>

      {/* Credential Form */}
      {showForm && (
        <Card className="border-2 border-orange-200 dark:border-orange-800">
          <CardContent className="p-6">
            <h4 className="font-medium mb-4">
              {editingCredential ? 'Edit Server' : 'New SFTP Server'}
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Server"
                  className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Host</label>
                <input
                  type="text"
                  value={formData.host}
                  onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                  placeholder="sftp.example.com"
                  className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Port</label>
                <input
                  type="number"
                  value={formData.port}
                  onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={editingCredential ? '(unchanged)' : ''}
                  className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Default Path</label>
                <input
                  type="text"
                  value={formData.remote_path}
                  onChange={(e) => setFormData({ ...formData, remote_path: e.target.value })}
                  placeholder="/"
                  className="w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveCredential} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {editingCredential ? 'Update' : 'Save'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Credentials List */}
      {isLoading && credentials.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          Loading credentials...
        </div>
      ) : credentials.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Server className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h4 className="font-medium mb-2">No SFTP Servers</h4>
            <p className="text-sm text-gray-500 mb-4">Add an SFTP server to download files</p>
            <Button variant="outline" onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Server
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {credentials.map((credential) => {
            const isKnownConnected = connectedSFTPServer?.id === credential.id;
            const effectiveStatus =
              credential.status ?? (isKnownConnected ? 'connected' : undefined);
            const displayCredential = { ...credential, status: effectiveStatus };
            return (
              <Card
                key={credential.id}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  selectedCredential?.id === credential.id && 'ring-2 ring-orange-500',
                  isKnownConnected && !selectedCredential && 'ring-2 ring-green-500/50'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'p-2 rounded-lg',
                          displayCredential.status === 'connected'
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : displayCredential.status === 'failed'
                              ? 'bg-red-100 dark:bg-red-900/30'
                              : 'bg-gray-100 dark:bg-gray-800'
                        )}
                      >
                        <Server
                          className={cn(
                            'w-5 h-5',
                            displayCredential.status === 'connected'
                              ? 'text-green-600 dark:text-green-400'
                              : displayCredential.status === 'failed'
                                ? 'text-red-600 dark:text-red-400'
                                : 'text-gray-500'
                          )}
                        />
                      </div>
                      <div>
                        <h4 className="font-medium">{credential.name}</h4>
                        <p className="text-sm text-gray-500">
                          {credential.username}@{credential.host}:{credential.port}
                        </p>
                      </div>
                      {displayCredential.status === 'connected' && (
                        <span className="flex items-center text-xs text-green-600 dark:text-green-400">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Connected
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant={
                          displayCredential.status === 'connected' ? 'outline-green' : 'outline'
                        }
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBrowse(credential, credential.remote_path || '/');
                        }}
                        disabled={isBrowsing && selectedCredential?.id === credential.id}
                        className="gap-1.5"
                      >
                        {isBrowsing && selectedCredential?.id === credential.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : displayCredential.status === 'connected' ? (
                          <PlugZap className="w-4 h-4" />
                        ) : (
                          <Plug className="w-4 h-4" />
                        )}
                        {displayCredential.status === 'connected' ? 'Browse' : 'Connect'}
                      </Button>
                      <Button
                        variant="outline-blue"
                        size="icon-sm"
                        aria-label="Test connection"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestConnection(credential);
                        }}
                        disabled={connectionStatus === 'testing'}
                      >
                        {connectionStatus === 'testing' &&
                        selectedCredential?.id === credential.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline-blue"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditCredential(credential);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline-red"
                        size="icon-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmingCredDelete(credential);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* File Browser */}
      {selectedCredential && files.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-orange-500" />
                <span className="font-medium">{selectedCredential.name}</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">{currentPath}</span>
              </div>
              {currentPath !== '/' && (
                <Button variant="outline" size="sm" onClick={handleNavigateUp}>
                  .. Up
                </Button>
              )}
            </div>

            <div className="border rounded-lg divide-y dark:divide-gray-700">
              {isBrowsing ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Loading...
                </div>
              ) : (
                files.map((file) => (
                  <div
                    key={file.path}
                    className={cn(
                      'flex items-center justify-between p-3 cursor-pointer transition-all',
                      file.is_directory
                        ? 'hover:bg-gray-50 dark:hover:bg-gray-800'
                        : selectedFile?.path === file.path
                          ? 'bg-primary/10 ring-1 ring-inset ring-primary'
                          : 'hover:bg-primary/5'
                    )}
                    onClick={() => {
                      if (file.is_directory) {
                        handleNavigate(file);
                      } else {
                        setSelectedFile((prev) => (prev?.path === file.path ? null : file));
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      {file.is_directory ? (
                        <Folder className="w-5 h-5 text-yellow-500" />
                      ) : (
                        <File
                          className={cn(
                            'w-5 h-5',
                            selectedFile?.path === file.path ? 'text-primary' : 'text-gray-400'
                          )}
                        />
                      )}
                      <span
                        className={cn(
                          'font-medium',
                          !file.is_directory && selectedFile?.path === file.path && 'text-primary'
                        )}
                      >
                        {file.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-500">{formatFileSize(file.size)}</span>
                      {!file.is_directory && selectedFile?.path === file.path && (
                        <CheckCircle className="w-4 h-4 text-primary" />
                      )}
                      {file.is_directory && <ChevronRight className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* File selection action bar */}
            {selectedFile && (
              <div className="mt-3 pt-3 border-t flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm min-w-0">
                  <File className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-medium truncate">{selectedFile.name}</span>
                  <span className="text-muted-foreground shrink-0">selected</span>
                </div>
                <Button
                  onClick={() => handleDownloadFile(selectedFile)}
                  disabled={isDownloading}
                  className="gap-2 shrink-0"
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Use This File
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={confirmingCredDelete !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmingCredDelete(null);
        }}
        onConfirm={() => {
          if (confirmingCredDelete) handleDeleteCredential(confirmingCredDelete);
          setConfirmingCredDelete(null);
        }}
        title="Delete Credential"
        description={`Delete credential "${confirmingCredDelete?.name}"?`}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
