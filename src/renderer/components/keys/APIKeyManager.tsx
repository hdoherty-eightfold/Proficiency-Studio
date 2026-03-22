// SECURITY NOTE: API keys are currently stored in plain text in localStorage.
// This is a known security concern. A future improvement should migrate key
// storage to use Electron's safeStorage API via the IPC store (PersistentStore
// in the main process), similar to how SFTP credentials are handled in
// src/main/ipc-handlers.ts. This would encrypt keys at rest using OS-level
// credential storage. See: https://www.electronjs.org/docs/latest/api/safe-storage

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import Select from '../ui/Select';
import { api } from '../../services/api';
import { PROVIDERS, getDefaultModel, getModelsForProvider } from '../../config/models';

interface APIKey {
    id: string;
    provider: 'google' | 'kimi';
    name: string;
    key: string;
    model?: string;
    status: 'untested' | 'valid' | 'invalid' | 'testing';
    created_at: string;
    last_tested?: string;
}

interface APIKeyManagerProps {
    onKeySelect?: (provider: string, keyId: string) => void;
    selectedProvider?: string;
    selectedKeyId?: string;
}

interface TestKeyResponse {
    valid: boolean;
    error?: string;
    message?: string;
}

// Use centralized provider config
const PROVIDER_INFO = PROVIDERS;

export const APIKeyManager: React.FC<APIKeyManagerProps> = ({
    onKeySelect,
    selectedProvider,
    selectedKeyId
}) => {
    const [keys, setKeys] = useState<APIKey[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newKey, setNewKey] = useState({
        provider: 'google' as keyof typeof PROVIDER_INFO,
        name: '',
        key: '',
        model: getDefaultModel('google')
    });
    const [error, setError] = useState<string | null>(null);
    const [showNewKeyPassword, setShowNewKeyPassword] = useState(false);
    const [showKeyPasswords, _setShowKeyPasswords] = useState<{ [key: string]: boolean }>({});
    const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: '', key: '', model: '' });

    useEffect(() => {
        loadKeys();
    }, []);

    const loadKeys = async () => {
        try {
            // Primary source: PersistentStore (survives app restarts reliably)
            let parsedKeys: APIKey[] | null = null;

            const storedKeys = await window.electron?.store?.get('llm_api_keys');
            if (Array.isArray(storedKeys) && storedKeys.length > 0) {
                parsedKeys = storedKeys as APIKey[];
            }

            // Fallback: migrate from localStorage if PersistentStore is empty
            if (!parsedKeys) {
                const savedKeys = localStorage.getItem('llm_api_keys');
                if (savedKeys) {
                    parsedKeys = JSON.parse(savedKeys);
                    // Migrate to PersistentStore
                    if (parsedKeys && parsedKeys.length > 0) {
                        window.electron?.store?.set('llm_api_keys', parsedKeys);
                    }
                }
            }

            if (parsedKeys && parsedKeys.length > 0) {
                // Migrate keys with outdated models to current defaults
                let migrated = false;
                for (const key of parsedKeys) {
                    const allowedModels = getModelsForProvider(key.provider);
                    if (key.model && allowedModels.length > 0 && !allowedModels.includes(key.model)) {
                        key.model = getDefaultModel(key.provider);
                        migrated = true;
                    }
                }
                if (migrated) {
                    window.electron?.store?.set('llm_api_keys', parsedKeys);
                }
                setKeys(parsedKeys);
                // Keep localStorage in sync as a cache
                localStorage.setItem('llm_api_keys', JSON.stringify(parsedKeys));

                // Auto-select the last used key if available
                const lastSelectedId = localStorage.getItem('llm_last_selected_key');
                if (lastSelectedId) {
                    const lastKey = parsedKeys.find((k: APIKey) => k.id === lastSelectedId);
                    if (lastKey) {
                        onKeySelect?.(lastKey.provider, lastKey.id);
                    }
                } else {
                    // If no last selected, select the first key
                    const firstKey = parsedKeys[0];
                    onKeySelect?.(firstKey.provider, firstKey.id);
                    localStorage.setItem('llm_last_selected_key', firstKey.id);
                }
                return;
            }

            // No saved keys - start with empty list
            setKeys([]);
        } catch (err) {
            console.error('Failed to load API keys:', err);
            setKeys([]);
        }
    };

    const saveKeys = (updatedKeys: APIKey[]) => {
        setKeys(updatedKeys);
        // Save to localStorage as cache
        localStorage.setItem('llm_api_keys', JSON.stringify(updatedKeys));
        // Save full key list to PersistentStore (primary, survives restarts)
        window.electron?.store?.set('llm_api_keys', updatedKeys);

        // Sync the first key per provider to PersistentStore
        // so backend-manager can pass them as env vars to the backend
        const providerKeys: Record<string, string> = {};
        for (const k of updatedKeys) {
            if (!providerKeys[k.provider]) {
                providerKeys[k.provider] = k.key;
            }
        }
        for (const [provider, key] of Object.entries(providerKeys)) {
            const storeKey = provider === 'google' ? 'apiKeys.gemini' : `apiKeys.${provider}`;
            window.electron?.store?.set(storeKey, key);
        }
    };

    const addKey = () => {
        if (!newKey.name || !newKey.key) {
            setError('Name and API key are required');
            return;
        }

        const keyToAdd: APIKey = {
            id: `${newKey.provider}-${Date.now()}`,
            provider: newKey.provider as APIKey['provider'],
            name: newKey.name,
            key: newKey.key,
            model: newKey.model,
            status: 'untested',
            created_at: new Date().toISOString()
        };

        const updatedKeys = [keyToAdd, ...keys];
        saveKeys(updatedKeys);

        // Auto-select the newly added key
        localStorage.setItem('llm_last_selected_key', keyToAdd.id);
        onKeySelect?.(keyToAdd.provider, keyToAdd.id);

        setNewKey({ provider: 'google', name: '', key: '', model: getDefaultModel('google') });
        setShowNewKeyPassword(false);
        setShowAddForm(false);
        setError(null);
    };

    const testKey = async (keyId: string) => {
        const keyToTest = keys.find(k => k.id === keyId);
        if (!keyToTest) return;

        const testingKeys = keys.map(k =>
            k.id === keyId ? { ...k, status: 'testing' as const } : k
        );
        setKeys(testingKeys);

        try {
            // Test via IPC to main process (bypasses CSP restrictions)
            // Falls back to backend API if IPC not available
            let response: TestKeyResponse;

            if (window.electron?.llm?.testKey) {
                response = await window.electron.llm.testKey(
                    keyToTest.provider,
                    keyToTest.key,
                    keyToTest.model
                );
            } else {
                // Fallback to backend API
                response = await api.post<TestKeyResponse>('/api/llm/test-key', {
                    provider: keyToTest.provider,
                    api_key: keyToTest.key,
                    model: keyToTest.model
                });
            }

            const isValid = response.valid === true;
            const newStatus: APIKey['status'] = isValid ? 'valid' : 'invalid';
            const updatedKeys: APIKey[] = testingKeys.map(k =>
                k.id === keyId
                    ? {
                        ...k,
                        status: newStatus,
                        last_tested: new Date().toISOString()
                    }
                    : k
            );
            saveKeys(updatedKeys);

            if (!isValid) {
                setError(`Test failed: ${response.error || 'Unknown error'}`);
            } else {
                setError(null);
            }
        } catch (err: unknown) {
            const updatedKeys: APIKey[] = testingKeys.map(k =>
                k.id === keyId
                    ? {
                        ...k,
                        status: 'invalid' as const,
                        last_tested: new Date().toISOString()
                    }
                    : k
            );
            saveKeys(updatedKeys);

            // Provide helpful error messages
            let errorMsg = err instanceof Error ? err.message : 'Unknown error';
            if (errorMsg.includes('ECONNREFUSED')) {
                errorMsg = 'Backend server not running. Please rebuild the app or start the backend.';
            }
            setError(`Test failed: ${errorMsg}`);
        }
    };

    const deleteKey = (keyId: string) => {
        const deletedKey = keys.find(k => k.id === keyId);
        const updatedKeys = keys.filter(k => k.id !== keyId);
        saveKeys(updatedKeys);

        // If no keys remain for this provider, clear from PersistentStore
        if (deletedKey && !updatedKeys.some(k => k.provider === deletedKey.provider)) {
            const storeKey = deletedKey.provider === 'google' ? 'apiKeys.gemini' : `apiKeys.${deletedKey.provider}`;
            window.electron?.store?.delete(storeKey);
        }

        // If we deleted the last selected key, clear the selection
        const lastSelectedId = localStorage.getItem('llm_last_selected_key');
        if (lastSelectedId === keyId) {
            if (updatedKeys.length > 0) {
                // Select the first remaining key
                const firstKey = updatedKeys[0];
                localStorage.setItem('llm_last_selected_key', firstKey.id);
                onKeySelect?.(firstKey.provider, firstKey.id);
            } else {
                localStorage.removeItem('llm_last_selected_key');
            }
        }
    };

    const startEditing = (key: APIKey) => {
        setEditingKeyId(key.id);
        setEditForm({ name: key.name, key: key.key, model: key.model || getDefaultModel(key.provider) });
    };

    const saveEdit = (keyId: string) => {
        if (!editForm.name || !editForm.key) {
            setError('Name and API key are required');
            return;
        }
        const updatedKeys = keys.map(k =>
            k.id === keyId ? { ...k, name: editForm.name, key: editForm.key, model: editForm.model } : k
        );
        saveKeys(updatedKeys);
        setEditingKeyId(null);
        setError(null);
    };

    const cancelEdit = () => {
        setEditingKeyId(null);
        setError(null);
    };

    const getStatusColor = (status: APIKey['status']) => {
        switch (status) {
            case 'valid': return 'text-green-600 bg-green-100';
            case 'invalid': return 'text-red-600 bg-red-100';
            case 'testing': return 'text-yellow-600 bg-yellow-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    return (
        <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-foreground">LLM API Keys</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage your API keys for different LLM providers
                    </p>
                </div>
                <Button
                    onClick={() => setShowAddForm(true)}
                    size="sm"
                    disabled={showAddForm}
                >
                    + Add Key
                </Button>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
                    {error}
                </div>
            )}

            {showAddForm && (
                <Card className="mb-6 p-4 bg-muted/30">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Provider
                            </label>
                            <Select
                                value={newKey.provider}
                                onValueChange={(value) => {
                                    const newProvider = value as keyof typeof PROVIDER_INFO;
                                    setNewKey({
                                        ...newKey,
                                        provider: newProvider,
                                        model: PROVIDER_INFO[newProvider].models[0]
                                    });
                                }}
                                options={Object.entries(PROVIDER_INFO).map(([key, info]) => ({
                                    value: key,
                                    label: info.name,
                                    icon: info.icon
                                }))}
                                placeholder="Select Provider"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Model
                            </label>
                            <Select
                                value={newKey.model}
                                onValueChange={(value) => setNewKey({ ...newKey, model: value })}
                                options={PROVIDER_INFO[newKey.provider].models.map(model => ({
                                    value: model,
                                    label: model
                                }))}
                                placeholder="Select Model"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Key Name
                            </label>
                            <input
                                type="text"
                                value={newKey.name}
                                onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                                placeholder="e.g., Production Gemini Key"
                                className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                API Key
                            </label>
                            <div className="relative">
                                <input
                                    type={showNewKeyPassword ? "text" : "password"}
                                    value={newKey.key}
                                    onChange={(e) => setNewKey({ ...newKey, key: e.target.value })}
                                    placeholder="Enter your API key..."
                                    className="w-full px-3 py-2 pr-10 border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewKeyPassword(!showNewKeyPassword)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    aria-label={showNewKeyPassword ? 'Hide API key' : 'Show API key'}
                                >
                                    {showNewKeyPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                        </div>

                        <div className="flex space-x-2">
                            <Button onClick={addKey} size="sm">
                                Add Key
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowAddForm(false);
                                    setError(null);
                                }}
                                size="sm"
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            <div className="space-y-3">
                {keys.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <p className="mb-2">No API keys configured.</p>
                        <p className="text-sm">Click "+ Add Key" above to add your first API key.</p>
                        <p className="text-xs mt-2 text-muted-foreground/70">
                            Get a free Gemini API key at{' '}
                            <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
                                aistudio.google.com/apikey
                            </a>
                        </p>
                    </div>
                ) : (
                    keys.map((key) => {
                        const providerKey = key.provider as keyof typeof PROVIDER_INFO;
                        const provider = PROVIDER_INFO[providerKey] || { name: key.provider, icon: 'Unknown' };
                        const isSelected = selectedProvider === key.provider && selectedKeyId === key.id;
                        const isEditing = editingKeyId === key.id;

                        if (isEditing) {
                            return (
                                <Card key={key.id} className="p-4 border-primary bg-primary/5">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <span className="text-lg">{provider.icon}</span>
                                            <span>{provider.name}</span>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">Name</label>
                                            <input
                                                type="text"
                                                value={editForm.name}
                                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">Model</label>
                                            <Select
                                                value={editForm.model}
                                                onValueChange={(value) => setEditForm({ ...editForm, model: value })}
                                                options={PROVIDER_INFO[providerKey].models.map(model => ({
                                                    value: model,
                                                    label: model
                                                }))}
                                                placeholder="Select Model"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-foreground mb-1">API Key</label>
                                            <input
                                                type="text"
                                                value={editForm.key}
                                                onChange={(e) => setEditForm({ ...editForm, key: e.target.value })}
                                                className="w-full px-3 py-2 border rounded-lg bg-background text-foreground font-mono text-sm focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={() => saveEdit(key.id)}>Save</Button>
                                            <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                                        </div>
                                    </div>
                                </Card>
                            );
                        }

                        return (
                            <div
                                key={key.id}
                                className={`p-4 border rounded-lg cursor-pointer transition-all ${isSelected
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-primary/50'
                                    }`}
                                onClick={() => {
                                    localStorage.setItem('llm_last_selected_key', key.id);
                                    onKeySelect?.(key.provider, key.id);
                                }}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <div className="text-2xl">{provider.icon}</div>
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2">
                                                <span className="font-medium text-foreground">{key.name}</span>
                                                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(key.status)}`}>
                                                    {key.status}
                                                </span>
                                            </div>
                                            <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                <span className="font-mono text-xs">
                                                    {showKeyPasswords[key.id] ? key.key : `${key.key.substring(0, 12)}...`}
                                                </span>
                                                {key.model && (
                                                    <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                                        {key.model}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                startEditing(key);
                                            }}
                                        >
                                            Edit
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                testKey(key.id);
                                            }}
                                        >
                                            Test
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteKey(key.id);
                                            }}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </Card>
    );
};
