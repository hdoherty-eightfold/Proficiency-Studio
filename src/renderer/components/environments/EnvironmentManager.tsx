import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Server, Plus, Edit3, Trash2, CheckCircle, AlertCircle, RefreshCw, Globe } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { useToast } from '../../stores/toast-store';

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

    useEffect(() => {
        loadEnvironments();
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
            toast({ title: err instanceof Error ? err.message : 'Failed to add environment', variant: 'destructive' });
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
            toast({ title: err instanceof Error ? err.message : 'Failed to update environment', variant: 'destructive' });
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
            toast({ title: err instanceof Error ? err.message : 'Failed to delete environment', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleTestConnection = async (env: Environment) => {
        try {
            setLoading(true);
            const response = await api.post<{ success: boolean; message?: string }>('/api/environments/test-connection', {
                environment_id: env.id,
            });

            if (response?.success) {
                toast({ title: `Connected to ${env.name}`, variant: 'default' });
                loadEnvironments(); // Refresh to update last_connected
            } else {
                toast({ title: 'Connection failed', variant: 'destructive' });
            }
        } catch (err: unknown) {
            toast({ title: err instanceof Error ? err.message : 'Connection test failed', variant: 'destructive' });
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

    return (
        <div className="h-full p-8 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                            Environment Manager
                        </h2>
                        <p className="text-gray-600 dark:text-gray-400">
                            Manage your Eightfold environments and connections
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={loadEnvironments} disabled={loading}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                        <Button onClick={() => { resetForm(); setShowAddModal(true); }}>
                            <Plus className="w-4 h-4 mr-2" />
                            Add Environment
                        </Button>
                    </div>
                </div>

                {loading && environments.length === 0 ? (
                    <div className="text-center py-12">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">Loading environments...</p>
                    </div>
                ) : environments.length === 0 ? (
                    <Card className="text-center py-12">
                        <CardContent>
                            <Server className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                No Environments Yet
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 mb-6">
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
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 h-10 line-clamp-2">
                                        {env.description || 'No description provided.'}
                                    </p>

                                    <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                        <div>
                                            <p className="text-xs text-gray-500">Roles</p>
                                            <p className="text-lg font-semibold">{env.role_count || 0}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Last Connected</p>
                                            <p className="text-sm font-medium">
                                                {env.last_connected
                                                    ? new Date(env.last_connected).toLocaleDateString()
                                                    : 'Never'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 mt-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                                            onClick={() => handleTestConnection(env)}
                                        >
                                            <CheckCircle className="w-3 h-3 mr-2" /> Test
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                            onClick={() => openEditModal(env)}
                                        >
                                            <Edit3 className="w-3 h-3 mr-2" /> Edit
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => setDeletingEnv(env)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

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
                                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Production"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">API URL</label>
                                <input
                                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                                    value={formData.api_url}
                                    onChange={e => setFormData({ ...formData, api_url: e.target.value })}
                                    placeholder="https://api.eightfold.ai"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Description</label>
                                <textarea
                                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <div className="flex gap-3 justify-end mt-4">
                                <Button variant="outline" onClick={() => { setShowAddModal(false); setEditingEnv(null); }}>Cancel</Button>
                                <Button onClick={editingEnv ? handleUpdateEnvironment : handleAddEnvironment}>
                                    {editingEnv ? 'Update' : 'Add'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Delete Confirmation */}
            {deletingEnv && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="max-w-md w-full border-red-200">
                        <CardHeader>
                            <CardTitle className="text-red-600 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" />
                                Delete Environment?
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="mb-4">Are you sure you want to delete <strong>{deletingEnv.name}</strong>? This cannot be undone.</p>
                            <div className="flex gap-3 justify-end">
                                <Button variant="outline" onClick={() => setDeletingEnv(null)}>Cancel</Button>
                                <Button variant="destructive" onClick={handleDeleteEnvironment}>Delete</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default EnvironmentManager;
