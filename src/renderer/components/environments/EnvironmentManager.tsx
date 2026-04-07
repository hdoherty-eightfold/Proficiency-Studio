import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { api } from '../../services/api';
import {
  Server,
  Plus,
  Edit3,
  Trash2,
  CheckCircle,
  RefreshCw,
  Globe,
  Upload,
  Loader2,
  XCircle,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { useToast } from '../../stores/toast-store';
import type { SFTPCredential } from '../../types/api';

interface Environment {
  id: string;
  name: string;
  api_url: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  last_connected?: string;
  role_count?: number;
}

const EnvironmentManager: React.FC = () => {
  const { toast } = useToast();
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null);
  const [deletingEnv, setDeletingEnv] = useState<Environment | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    api_url: '',
    description: '',
  });

  // SFTP state
  const [sftpCredentials, setSftpCredentials] = useState<SFTPCredential[]>([]);
  const [sftpLoading, setSftpLoading] = useState(false);
  const [showSFTPForm, setShowSFTPForm] = useState(false);
  const [editingSFTP, setEditingSFTP] = useState<SFTPCredential | null>(null);
  const [testingSFTP, setTestingSFTP] = useState<string | null>(null);
  const [sftpSaving, setSftpSaving] = useState(false);
  const [sftpForm, setSftpForm] = useState({
    name: '',
    host: '',
    port: 22,
    username: '',
    password: '',
    remote_path: '/',
  });
  const [confirmingSFTPDelete, setConfirmingSFTPDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    loadEnvironments();
    loadSFTPCredentials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEnvironments = async () => {
    try {
      setLoading(true);
      const response = await api.get<Environment[]>('/api/environments');
      setEnvironments(response || []);
    } catch (err: unknown) {
      console.error('Failed to load environments:', err);
      toast({ title: 'Failed to load environments', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddEnvironment = async () => {
    if (!formData.name || !formData.api_url) {
      toast({ title: 'Environment name and URL are required', variant: 'destructive' });
      return;
    }

    try {
      setLoading(true);
      await api.post('/api/environments', {
        name: formData.name,
        key: formData.name.toUpperCase().replace(/\s+/g, '_'),
        base_url: formData.api_url,
        description: formData.description,
        username: 'api_user',
        password: 'placeholder',
      });

      toast({ title: 'Environment Added', variant: 'default' });
      setShowAddModal(false);
      resetForm();
      loadEnvironments();
    } catch (err: unknown) {
      console.error('Add failed:', err);
      toast({
        title: err instanceof Error ? err.message : 'Failed to add environment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEnvironment = async () => {
    if (!editingEnv) return;

    try {
      setLoading(true);
      await api.put(`/api/environments/${editingEnv.id}`, {
        name: formData.name,
        base_url: formData.api_url,
        description: formData.description,
      });

      toast({ title: 'Environment Updated', variant: 'default' });
      setEditingEnv(null);
      resetForm();
      loadEnvironments();
    } catch (err: unknown) {
      toast({
        title: err instanceof Error ? err.message : 'Failed to update environment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEnvironment = async () => {
    if (!deletingEnv) return;

    try {
      setLoading(true);
      await api.delete(`/api/environments/${deletingEnv.id}`);
      toast({ title: 'Environment Deleted', variant: 'default' });
      setDeletingEnv(null);
      loadEnvironments();
    } catch (err: unknown) {
      toast({
        title: err instanceof Error ? err.message : 'Failed to delete environment',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (env: Environment) => {
    try {
      setLoading(true);
      const response = await api.post<{ success: boolean; message?: string }>(
        '/api/environments/test-connection',
        {
          environment_id: env.id,
        }
      );

      if (response?.success) {
        toast({ title: `Connected to ${env.name}`, variant: 'default' });
        loadEnvironments(); // Refresh to update last_connected
      } else {
        toast({ title: 'Connection failed', variant: 'destructive' });
      }
    } catch (err: unknown) {
      toast({
        title: err instanceof Error ? err.message : 'Connection test failed',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      api_url: '',
      description: '',
    });
  };

  const openEditModal = (env: Environment) => {
    setEditingEnv(env);
    setFormData({
      name: env.name,
      api_url: env.api_url,
      description: env.description || '',
    });
    setShowAddModal(true);
  };

  // SFTP functions
  const loadSFTPCredentials = async () => {
    try {
      setSftpLoading(true);
      const response = await api.listSFTPCredentials();
      setSftpCredentials(response?.credentials || []);
    } catch {
      console.warn('Failed to load SFTP credentials');
    } finally {
      setSftpLoading(false);
    }
  };

  const handleSaveSFTP = async () => {
    if (!sftpForm.name || !sftpForm.host || !sftpForm.username) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    if (!editingSFTP && !sftpForm.password) {
      toast({ title: 'Password is required for new connections', variant: 'destructive' });
      return;
    }
    try {
      setSftpSaving(true);
      if (editingSFTP) {
        const data: Record<string, unknown> = { ...sftpForm };
        if (!sftpForm.password) delete data.password;
        await api.updateSFTPCredential(
          editingSFTP.id,
          data as Parameters<typeof api.updateSFTPCredential>[1]
        );
        toast({ title: 'Connection updated', variant: 'default' });
      } else {
        await api.createSFTPCredential(sftpForm);
        toast({ title: 'Connection added', variant: 'default' });
      }
      resetSFTPForm();
      loadSFTPCredentials();
    } catch {
      toast({ title: 'Failed to save connection', variant: 'destructive' });
    } finally {
      setSftpSaving(false);
    }
  };

  const handleDeleteSFTP = async (id: string, name: string) => {
    try {
      await api.deleteSFTPCredential(id);
      toast({ title: `Deleted "${name}"`, variant: 'default' });
      loadSFTPCredentials();
    } catch {
      toast({ title: 'Failed to delete connection', variant: 'destructive' });
    }
  };

  const handleTestSFTP = async (id: string, name: string) => {
    try {
      setTestingSFTP(id);
      const result = await api.testSFTPConnection({ credential_id: id });
      if (result.success) {
        toast({ title: `Connected to "${name}"`, variant: 'success' });
      } else {
        toast({
          title: 'Connection failed',
          description: result.error || 'Could not connect',
          variant: 'destructive',
        });
      }
    } catch {
      toast({ title: 'Connection test failed', variant: 'destructive' });
    } finally {
      setTestingSFTP(null);
    }
  };

  const openEditSFTPForm = (credential: SFTPCredential) => {
    setSftpForm({
      name: credential.name,
      host: credential.host,
      port: credential.port,
      username: credential.username,
      password: '',
      remote_path: credential.remote_path || '/',
    });
    setEditingSFTP(credential);
    setShowSFTPForm(true);
  };

  const resetSFTPForm = () => {
    setSftpForm({ name: '', host: '', port: 22, username: '', password: '', remote_path: '/' });
    setEditingSFTP(null);
    setShowSFTPForm(false);
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };
  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

  return (
    <div className="h-full p-8 overflow-y-auto bg-muted/20">
      <motion.div
        className="max-w-6xl mx-auto space-y-6"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={fadeUp} className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Environment Manager</h2>
            <p className="text-muted-foreground">
              Manage your Eightfold environments and connections
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadEnvironments} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              onClick={() => {
                resetForm();
                setShowAddModal(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Environment
            </Button>
          </div>
        </motion.div>

        <motion.div variants={fadeUp}>
          {loading && environments.length === 0 ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Loading environments...</p>
            </div>
          ) : environments.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Server className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No Environments Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Add your first Eightfold environment to get started
                </p>
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Environment
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {environments.map((env) => (
                <Card key={env.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl flex items-center gap-2">
                          {env.name}
                          {env.is_active && (
                            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full">
                              Active
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1 flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {env.api_url}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 h-10 line-clamp-2">
                      {env.description || 'No description provided.'}
                    </p>

                    <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="text-xs text-muted-foreground">Roles</p>
                        <p className="text-lg font-semibold">{env.role_count || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Last Connected</p>
                        <p className="text-sm font-medium">
                          {env.last_connected
                            ? new Date(env.last_connected).toLocaleDateString()
                            : 'Never'}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="outline-green"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleTestConnection(env)}
                      >
                        <CheckCircle className="w-3 h-3 mr-2" /> Test
                      </Button>
                      <Button
                        variant="outline-blue"
                        size="sm"
                        className="flex-1"
                        onClick={() => openEditModal(env)}
                      >
                        <Edit3 className="w-3 h-3 mr-2" /> Edit
                      </Button>
                      <Button variant="outline-red" size="sm" onClick={() => setDeletingEnv(env)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* SFTP Connections Section */}
      <motion.div
        className="max-w-6xl mx-auto space-y-6 mt-8 pt-8 border-t border-border"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={fadeUp} className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">SFTP Connections</h2>
            <p className="text-muted-foreground">
              Manage remote server connections for file uploads
            </p>
          </div>
          <Button
            onClick={() => {
              resetSFTPForm();
              setShowSFTPForm(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Connection
          </Button>
        </motion.div>

        <motion.div variants={fadeUp}>
          {sftpLoading && sftpCredentials.length === 0 ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Loading SFTP connections...</p>
            </div>
          ) : sftpCredentials.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <Upload className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No SFTP Connections</h3>
                <p className="text-muted-foreground mb-4">
                  Add an SFTP connection to enable remote file uploads
                </p>
                <Button
                  onClick={() => {
                    resetSFTPForm();
                    setShowSFTPForm(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Connection
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sftpCredentials.map((cred) => (
                <Card key={cred.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <Upload className="w-5 h-5 text-teal-600" />
                      {cred.name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {cred.username}@{cred.host}:{cred.port}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {cred.remote_path && (
                      <p className="text-sm text-muted-foreground mb-4">Path: {cred.remote_path}</p>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="outline-green"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleTestSFTP(cred.id, cred.name)}
                        disabled={testingSFTP === cred.id}
                      >
                        {testingSFTP === cred.id ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-2" />
                        ) : (
                          <CheckCircle className="w-3 h-3 mr-2" />
                        )}
                        Test
                      </Button>
                      <Button
                        variant="outline-blue"
                        size="sm"
                        className="flex-1"
                        onClick={() => openEditSFTPForm(cred)}
                      >
                        <Edit3 className="w-3 h-3 mr-2" /> Edit
                      </Button>
                      <Button
                        variant="outline-red"
                        size="sm"
                        onClick={() => setConfirmingSFTPDelete({ id: cred.id, name: cred.name })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* SFTP Add/Edit Modal */}
      {showSFTPForm && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <Card className="max-w-md w-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{editingSFTP ? 'Edit' : 'Add'} SFTP Connection</CardTitle>
                <Button variant="outline" size="icon-sm" onClick={resetSFTPForm} aria-label="Close">
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Connection Name *</label>
                <input
                  type="text"
                  value={sftpForm.name}
                  onChange={(e) => setSftpForm({ ...sftpForm, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background border-border"
                  placeholder="Production Server"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-sm font-medium mb-1 block">Host *</label>
                  <input
                    type="text"
                    value={sftpForm.host}
                    onChange={(e) => setSftpForm({ ...sftpForm, host: e.target.value })}
                    className="w-full px-3 py-2 border rounded-md bg-background border-border"
                    placeholder="ftp.example.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Port *</label>
                  <input
                    type="number"
                    value={sftpForm.port}
                    onChange={(e) =>
                      setSftpForm({ ...sftpForm, port: parseInt(e.target.value) || 22 })
                    }
                    className="w-full px-3 py-2 border rounded-md bg-background border-border"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Username *</label>
                <input
                  type="text"
                  value={sftpForm.username}
                  onChange={(e) => setSftpForm({ ...sftpForm, username: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background border-border"
                  placeholder="username"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Password {!editingSFTP && '*'}
                </label>
                <input
                  type="password"
                  value={sftpForm.password}
                  onChange={(e) => setSftpForm({ ...sftpForm, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background border-border"
                  placeholder={editingSFTP ? 'Leave blank to keep existing' : 'password'}
                />
                {editingSFTP && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave blank to keep existing password
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Remote Path</label>
                <input
                  type="text"
                  value={sftpForm.remote_path}
                  onChange={(e) => setSftpForm({ ...sftpForm, remote_path: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md bg-background border-border"
                  placeholder="/uploads"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Default upload directory on the remote server
                </p>
              </div>
              <div className="flex gap-3 justify-end mt-4">
                <Button variant="outline" onClick={resetSFTPForm}>
                  Cancel
                </Button>
                <Button onClick={handleSaveSFTP} disabled={sftpSaving}>
                  {sftpSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                    </>
                  ) : editingSFTP ? (
                    'Update'
                  ) : (
                    'Add Connection'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingEnv) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>{editingEnv ? 'Edit Environment' : 'Add Environment'}</CardTitle>
              <CardDescription>Enter details for the Eightfold instance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Name</label>
                <input
                  className="w-full px-3 py-2 border rounded-md bg-background border-border"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Production"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">API URL</label>
                <input
                  className="w-full px-3 py-2 border rounded-md bg-background border-border"
                  value={formData.api_url}
                  onChange={(e) => setFormData({ ...formData, api_url: e.target.value })}
                  placeholder="https://api.eightfold.ai"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <textarea
                  className="w-full px-3 py-2 border rounded-md bg-background border-border"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex gap-3 justify-end mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingEnv(null);
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={editingEnv ? handleUpdateEnvironment : handleAddEnvironment}>
                  {editingEnv ? 'Update' : 'Add'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={deletingEnv !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingEnv(null);
        }}
        onConfirm={handleDeleteEnvironment}
        title="Delete Environment?"
        description={`Are you sure you want to delete "${deletingEnv?.name}"? This cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
      />

      <ConfirmDialog
        open={confirmingSFTPDelete !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmingSFTPDelete(null);
        }}
        onConfirm={() => {
          if (confirmingSFTPDelete)
            handleDeleteSFTP(confirmingSFTPDelete.id, confirmingSFTPDelete.name);
          setConfirmingSFTPDelete(null);
        }}
        title="Delete SFTP Connection"
        description={`Delete SFTP connection "${confirmingSFTPDelete?.name}"?`}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
};

export default EnvironmentManager;
