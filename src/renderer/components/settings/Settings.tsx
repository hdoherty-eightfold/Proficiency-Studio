import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';
import {
    Settings as SettingsIcon,
    Key,
    Database,
    Shield,
    Palette,
    Bell,
    Keyboard,
    Info,
    Check,
    ExternalLink,
    Monitor,
    Moon,
    Sun,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
// Tabs component available but not currently used for Settings layout
import { useToast } from '@/stores/toast-store';
import { useThemeStore } from '@/stores/theme-store';
import { cn } from '@/lib/utils';

interface ConfigData {
    vector_db: {
        type: string;
        options: Array<{ id: string; name: string }>;
    };
    ai_inference: {
        provider: string;
        options: Array<{ id: string; name: string }>;
    };
    api_keys: {
        gemini_configured: boolean;
        kimi_configured: boolean;
    };
}

interface GeneralSettings {
    autoSave: boolean;
    notifications: boolean;
    desktopNotifications: boolean;
    reducedMotion: boolean;
    compactMode: boolean;
}

interface KeyboardShortcut {
    action: string;
    keys: string;
    description: string;
}

const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
    { action: 'Command Palette', keys: '⌘K', description: 'Open quick actions' },
    { action: 'Next Step', keys: '⌘→', description: 'Go to next workflow step' },
    { action: 'Previous Step', keys: '⌘←', description: 'Go to previous workflow step' },
    { action: 'Settings', keys: '⌘,', description: 'Open settings' },
    { action: 'Toggle Theme', keys: '⌘⇧T', description: 'Switch light/dark mode' },
];

const APP_VERSION = '1.0.0';

const Settings: React.FC = () => {
    const { theme, setTheme } = useThemeStore();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('appearance');
    const [config, setConfig] = useState<ConfigData | null>(null);
    const [, setLoading] = useState(false);
    const [apiKeys, setApiKeys] = useState<{ gemini: string; kimi: string }>({ gemini: '', kimi: '' });

    const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
        autoSave: true,
        notifications: true,
        desktopNotifications: false,
        reducedMotion: false,
        compactMode: false,
    });

    useEffect(() => {
        loadConfig();

        const stored = localStorage.getItem('app_settings_general');
        if (stored) {
            try {
                setGeneralSettings(prev => ({ ...prev, ...JSON.parse(stored) }));
            } catch {
                toast({ title: 'Failed to load settings', description: 'Using defaults', variant: 'destructive' });
            }
        }
    }, []);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const response = await api.get<ConfigData>('/api/config');
            setConfig(response);
        } catch (err: unknown) {
            console.error('Failed to load config', err);
            toast({
                title: 'Configuration Load Failed',
                description: 'Using default settings. Backend may be unavailable.',
                variant: 'destructive'
            });
            setConfig({
                vector_db: { type: 'chromadb', options: [{ id: 'chromadb', name: 'ChromaDB' }] },
                ai_inference: { provider: 'gemini', options: [{ id: 'gemini', name: 'Google Gemini' }] },
                api_keys: { gemini_configured: false, kimi_configured: false }
            });
        } finally {
            setLoading(false);
        }
    };

    const saveApiKey = async (keyName: string, value: string) => {
        if (!value) return;
        try {
            await api.post('/api/config/api-key', { key: keyName, value });
            toast({ title: `${keyName} Saved`, variant: 'default' });
            loadConfig();
            setApiKeys(prev => ({ ...prev, [keyName === 'GEMINI_API_KEY' ? 'gemini' : 'kimi']: '' }));
        } catch (err: unknown) {
            toast({ title: 'Failed to save API Key', variant: 'destructive' });
        }
    };

    const updateGeneralSetting = <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => {
        const newSettings = { ...generalSettings, [key]: value };
        setGeneralSettings(newSettings);
        localStorage.setItem('app_settings_general', JSON.stringify(newSettings));
        toast({ title: 'Setting updated', variant: 'default' });
    };

    const tabs = [
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'keys', label: 'API Keys', icon: Key },
        { id: 'ai', label: 'AI & Data', icon: Database },
        { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'about', label: 'About', icon: Info },
    ];

    return (
        <div className="h-full flex flex-col bg-background">
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <div className="w-56 border-r border-border bg-card p-4 space-y-1">
                    <h2 className="text-lg font-semibold mb-4 px-2">Settings</h2>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                                activeTab === tab.id
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            )}
                        >
                            <tab.icon className="h-4 w-4" />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-2xl mx-auto space-y-6">

                        {/* Appearance */}
                        {activeTab === 'appearance' && (
                            <>
                                <div>
                                    <h3 className="text-lg font-semibold">Appearance</h3>
                                    <p className="text-sm text-muted-foreground">Customize the look and feel of the application</p>
                                </div>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Theme</CardTitle>
                                        <CardDescription>Choose your preferred color scheme</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { value: 'light', icon: Sun, label: 'Light' },
                                                { value: 'dark', icon: Moon, label: 'Dark' },
                                                { value: 'system', icon: Monitor, label: 'System' },
                                            ].map(option => (
                                                <button
                                                    key={option.value}
                                                    onClick={() => setTheme(option.value as 'light' | 'dark' | 'system')}
                                                    className={cn(
                                                        'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all',
                                                        theme === option.value
                                                            ? 'border-primary bg-primary/5'
                                                            : 'border-border hover:border-primary/50'
                                                    )}
                                                >
                                                    <option.icon className={cn('h-5 w-5', theme === option.value ? 'text-primary' : 'text-muted-foreground')} />
                                                    <span className="text-sm font-medium">{option.label}</span>
                                                    {theme === option.value && (
                                                        <Check className="h-4 w-4 text-primary" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Display Options</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <SettingRow
                                            label="Reduced Motion"
                                            description="Minimize animations for accessibility"
                                            checked={generalSettings.reducedMotion}
                                            onCheckedChange={(checked) => updateGeneralSetting('reducedMotion', checked)}
                                        />
                                        <SettingRow
                                            label="Compact Mode"
                                            description="Use denser spacing for more content"
                                            checked={generalSettings.compactMode}
                                            onCheckedChange={(checked) => updateGeneralSetting('compactMode', checked)}
                                        />
                                    </CardContent>
                                </Card>
                            </>
                        )}

                        {/* Notifications */}
                        {activeTab === 'notifications' && (
                            <>
                                <div>
                                    <h3 className="text-lg font-semibold">Notifications</h3>
                                    <p className="text-sm text-muted-foreground">Manage how you receive notifications</p>
                                </div>

                                <Card>
                                    <CardContent className="pt-6 space-y-4">
                                        <SettingRow
                                            label="In-App Notifications"
                                            description="Show notifications within the application"
                                            checked={generalSettings.notifications}
                                            onCheckedChange={(checked) => updateGeneralSetting('notifications', checked)}
                                        />
                                        <SettingRow
                                            label="Desktop Notifications"
                                            description="Show system-level desktop notifications"
                                            checked={generalSettings.desktopNotifications}
                                            onCheckedChange={(checked) => updateGeneralSetting('desktopNotifications', checked)}
                                        />
                                    </CardContent>
                                </Card>
                            </>
                        )}

                        {/* API Keys */}
                        {activeTab === 'keys' && (
                            <>
                                <div>
                                    <h3 className="text-lg font-semibold">API Keys</h3>
                                    <p className="text-sm text-muted-foreground">Configure access tokens for AI services</p>
                                </div>

                                <Card>
                                    <CardContent className="pt-6 space-y-6">
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-medium">Google Gemini API Key</label>
                                                {config?.api_keys.gemini_configured && (
                                                    <Badge variant="success" className="gap-1">
                                                        <Check className="h-3 w-3" /> Configured
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="password"
                                                    className="flex-1 px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                                    placeholder={config?.api_keys.gemini_configured ? '••••••••••••••••' : 'Enter API Key'}
                                                    value={apiKeys.gemini}
                                                    onChange={e => setApiKeys({ ...apiKeys, gemini: e.target.value })}
                                                />
                                                <Button onClick={() => saveApiKey('GEMINI_API_KEY', apiKeys.gemini)}>Save</Button>
                                            </div>
                                        </div>

                                        <div className="border-t border-border pt-6 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <label className="text-sm font-medium">Kimi API Key <span className="text-muted-foreground">(Moonshot AI)</span></label>
                                                {config?.api_keys.kimi_configured && (
                                                    <Badge variant="success" className="gap-1">
                                                        <Check className="h-3 w-3" /> Configured
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="password"
                                                    className="flex-1 px-3 py-2 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                                                    placeholder={config?.api_keys.kimi_configured ? '••••••••••••••••' : 'Enter API Key'}
                                                    value={apiKeys.kimi}
                                                    onChange={e => setApiKeys({ ...apiKeys, kimi: e.target.value })}
                                                />
                                                <Button onClick={() => saveApiKey('KIMI_API_KEY', apiKeys.kimi)}>Save</Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        )}

                        {/* AI & Data */}
                        {activeTab === 'ai' && config && (
                            <>
                                <div>
                                    <h3 className="text-lg font-semibold">AI & Data Configuration</h3>
                                    <p className="text-sm text-muted-foreground">Configure AI models and data storage</p>
                                </div>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Vector Database</CardTitle>
                                        <CardDescription>Choose how embeddings are stored and searched</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-2 gap-3">
                                            {config.vector_db.options.map(opt => (
                                                <button
                                                    key={opt.id}
                                                    className={cn(
                                                        'p-4 rounded-lg border-2 text-left transition-all',
                                                        config.vector_db.type === opt.id
                                                            ? 'border-primary bg-primary/5'
                                                            : 'border-border hover:border-primary/50'
                                                    )}
                                                    onClick={() => {
                                                        api.post('/api/config/vector-db', { key: 'VECTOR_DB_TYPE', value: opt.id }).then(() => {
                                                            toast({ title: 'Vector DB Updated', variant: 'default' });
                                                            loadConfig();
                                                        });
                                                    }}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium">{opt.name}</span>
                                                        {config.vector_db.type === opt.id && (
                                                            <Check className="h-4 w-4 text-primary" />
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Data Management</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <SettingRow
                                            label="Auto-Save"
                                            description="Automatically save changes while working"
                                            checked={generalSettings.autoSave}
                                            onCheckedChange={(checked) => updateGeneralSetting('autoSave', checked)}
                                        />
                                    </CardContent>
                                </Card>
                            </>
                        )}

                        {/* Keyboard Shortcuts */}
                        {activeTab === 'shortcuts' && (
                            <>
                                <div>
                                    <h3 className="text-lg font-semibold">Keyboard Shortcuts</h3>
                                    <p className="text-sm text-muted-foreground">Quick actions to navigate the application</p>
                                </div>

                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="space-y-3">
                                            {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
                                                <div
                                                    key={shortcut.action}
                                                    className={cn(
                                                        'flex items-center justify-between py-3',
                                                        index !== KEYBOARD_SHORTCUTS.length - 1 && 'border-b border-border'
                                                    )}
                                                >
                                                    <div>
                                                        <div className="font-medium text-sm">{shortcut.action}</div>
                                                        <div className="text-xs text-muted-foreground">{shortcut.description}</div>
                                                    </div>
                                                    <kbd className="px-2 py-1 text-xs font-mono bg-muted rounded border border-border">
                                                        {shortcut.keys}
                                                    </kbd>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        )}

                        {/* Security */}
                        {activeTab === 'security' && (
                            <>
                                <div>
                                    <h3 className="text-lg font-semibold">Security & Privacy</h3>
                                    <p className="text-sm text-muted-foreground">Manage your data and privacy settings</p>
                                </div>

                                <Alert variant="destructive">
                                    <Shield className="h-4 w-4" />
                                    <AlertDescription>
                                        Actions in this section are irreversible. Please proceed with caution.
                                    </AlertDescription>
                                </Alert>

                                <Card className="border-destructive/50">
                                    <CardHeader>
                                        <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-medium text-sm">Reset Application Data</div>
                                                <p className="text-xs text-muted-foreground">Clear all local storage and cached data</p>
                                            </div>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => {
                                                    if (confirm('Are you sure? This will clear all local data and cannot be undone.')) {
                                                        localStorage.clear();
                                                        window.location.reload();
                                                    }
                                                }}
                                            >
                                                Reset Data
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </>
                        )}

                        {/* About */}
                        {activeTab === 'about' && (
                            <>
                                <div>
                                    <h3 className="text-lg font-semibold">About Proficiency Studio</h3>
                                    <p className="text-sm text-muted-foreground">Application information and resources</p>
                                </div>

                                <Card>
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                                                <SettingsIcon className="h-8 w-8 text-primary-foreground" />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-semibold">Proficiency Studio</h4>
                                                <p className="text-sm text-muted-foreground">AI-Powered Proficiency Assessment Platform</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3 border-t border-border pt-4">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Version</span>
                                                <span className="font-mono">{APP_VERSION}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Electron</span>
                                                <span className="font-mono">{window.electron?.version || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">Platform</span>
                                                <span className="font-mono">{window.electron?.platform || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">Resources</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <a
                                            href="#"
                                            className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                                        >
                                            <span className="text-sm font-medium">Documentation</span>
                                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                        </a>
                                        <a
                                            href="#"
                                            className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                                        >
                                            <span className="text-sm font-medium">Release Notes</span>
                                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                        </a>
                                        <a
                                            href="#"
                                            className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors"
                                        >
                                            <span className="text-sm font-medium">Report an Issue</span>
                                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                        </a>
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper component for settings rows with switches
function SettingRow({
    label,
    description,
    checked,
    onCheckedChange,
}: {
    label: string;
    description: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between">
            <div className="space-y-0.5">
                <label className="text-sm font-medium">{label}</label>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
            <Switch checked={checked} onCheckedChange={onCheckedChange} />
        </div>
    );
}

export default Settings;
