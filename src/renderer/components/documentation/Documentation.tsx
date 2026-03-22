import React, { useState, useMemo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  BookOpen,
  Rocket,
  GitBranch,
  Workflow,
  Keyboard,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Search,
  Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore } from '@/stores/app-store';

interface DocSection {
  id: string;
  title: string;
  icon: React.ElementType;
  content: React.ReactNode;
  keywords: string[]; // For search filtering
}

const GettingStartedContent = () => (
  <div className="space-y-6">
    <div>
      <h3 className="text-lg font-semibold mb-3">Welcome to Proficiency Studio</h3>
      <p className="text-muted-foreground mb-4">
        Proficiency Studio is an AI-powered skills assessment platform that helps you evaluate
        and manage professional competencies across your organization.
      </p>
    </div>

    <div>
      <h4 className="font-medium mb-2">Quick Start</h4>
      <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
        <li>Navigate to <strong>Integration</strong> to import your skills data (CSV, SFTP, or Eightfold API)</li>
        <li>Go to <strong>Extract Skills</strong> to parse and identify skills from your data</li>
        <li>Configure assessment parameters in <strong>Configure</strong></li>
        <li>Run AI-powered assessments in <strong>Assessment</strong></li>
        <li>Review results and export in <strong>Review</strong></li>
      </ol>
    </div>

    <div>
      <h4 className="font-medium mb-2">Prerequisites</h4>
      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
        <li>Backend server running at localhost:8000</li>
        <li>At least one LLM provider API key configured</li>
        <li>Skills data in CSV format (or access to SFTP/Eightfold)</li>
      </ul>
    </div>
  </div>
);

const IntegrationPathsContent = () => {
  const setCurrentStep = useAppStore((state) => state.setCurrentStep);

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Proficiency Studio supports three integration paths for importing skills data:
      </p>

      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-sm">Path 1</span>
            CSV Upload
          </h4>
          <p className="text-sm text-muted-foreground mb-3">
            Upload a CSV file containing skills data directly from your computer.
            Supports files up to 5MB with automatic encoding detection.
          </p>
          <div className="text-sm">
            <strong>Supported formats:</strong>
            <ul className="list-disc list-inside ml-2 text-muted-foreground">
              <li>Comma-separated values (.csv)</li>
              <li>UTF-8, UTF-16, or ISO-8859-1 encoding</li>
              <li>Headers in first row</li>
            </ul>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-sm">Path 2</span>
            SFTP Connection
          </h4>
          <p className="text-sm text-muted-foreground mb-3">
            Connect to an SFTP server to browse and download skills files remotely.
            Credentials are stored securely using system encryption.
          </p>
          <div className="text-sm">
            <strong>Requirements:</strong>
            <ul className="list-disc list-inside ml-2 text-muted-foreground">
              <li>SFTP server hostname and port (default: 22)</li>
              <li>Username and password</li>
              <li>Network access to the server</li>
            </ul>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-sm">Path 3</span>
            Eightfold API
          </h4>
          <p className="text-sm text-muted-foreground mb-3">
            Connect directly to Eightfold's Talent Intelligence Platform to fetch
            roles and extract skills from job data.
          </p>
          <div className="text-sm">
            <strong>Requirements:</strong>
            <ul className="list-disc list-inside ml-2 text-muted-foreground">
              <li>Eightfold base URL</li>
              <li>OAuth credentials (pre-auth value)</li>
              <li>Email and password</li>
            </ul>
          </div>
        </div>
      </div>

      <Button
        variant="outline"
        onClick={() => setCurrentStep(1)}
        className="mt-4"
      >
        Go to Integration <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
};

const WorkflowStepsContent = () => {
  const setCurrentStep = useAppStore((state) => state.setCurrentStep);

  const steps = [
    { step: 0, name: 'Welcome', description: 'Introduction and overview of the application' },
    { step: 1, name: 'Integration', description: 'Choose how to import your skills data' },
    { step: 2, name: 'Extract Skills', description: 'Parse uploaded data and identify skills' },
    { step: 3, name: 'Configure', description: 'Set proficiency levels and LLM providers' },
    { step: 4, name: 'Assessment', description: 'Run AI-powered proficiency assessments' },
    { step: 5, name: 'Review', description: 'Analyze assessment results and confidence scores' },
    { step: 6, name: 'History', description: 'View past assessments and track progress' },
    { step: 7, name: 'Analytics', description: 'Visualize trends and generate reports' },
    { step: 8, name: 'Prompts', description: 'Customize AI prompts for assessments' },
    { step: 9, name: 'Environments', description: 'Manage API configurations and credentials' },
    { step: 10, name: 'Settings', description: 'Application preferences and data management' },
  ];

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground mb-4">
        The application follows an 11-step workflow. Click any step to navigate directly.
      </p>

      <div className="space-y-2">
        {steps.map((item) => (
          <button
            key={item.step}
            onClick={() => setCurrentStep(item.step)}
            className="w-full flex items-center gap-4 p-3 rounded-lg border hover:bg-accent transition-colors text-left"
          >
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-medium">
              {item.step}
            </span>
            <div>
              <div className="font-medium">{item.name}</div>
              <div className="text-sm text-muted-foreground">{item.description}</div>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
};

const KeyboardShortcutsContent = () => (
  <div className="space-y-6">
    <p className="text-muted-foreground">
      Proficiency Studio supports keyboard shortcuts for faster navigation and common actions.
    </p>

    <div className="space-y-4">
      <div>
        <h4 className="font-medium mb-2">Navigation</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between p-2 rounded bg-muted">
            <span>Next Step</span>
            <kbd className="px-2 py-0.5 rounded bg-background border text-xs">Ctrl/Cmd + Right</kbd>
          </div>
          <div className="flex justify-between p-2 rounded bg-muted">
            <span>Previous Step</span>
            <kbd className="px-2 py-0.5 rounded bg-background border text-xs">Ctrl/Cmd + Left</kbd>
          </div>
          <div className="flex justify-between p-2 rounded bg-muted">
            <span>Go to Welcome</span>
            <kbd className="px-2 py-0.5 rounded bg-background border text-xs">Ctrl/Cmd + Home</kbd>
          </div>
          <div className="flex justify-between p-2 rounded bg-muted">
            <span>Go to Settings</span>
            <kbd className="px-2 py-0.5 rounded bg-background border text-xs">Ctrl/Cmd + ,</kbd>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2">Actions</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between p-2 rounded bg-muted">
            <span>Toggle Sidebar</span>
            <kbd className="px-2 py-0.5 rounded bg-background border text-xs">Ctrl/Cmd + B</kbd>
          </div>
          <div className="flex justify-between p-2 rounded bg-muted">
            <span>Toggle Theme</span>
            <kbd className="px-2 py-0.5 rounded bg-background border text-xs">Ctrl/Cmd + Shift + T</kbd>
          </div>
          <div className="flex justify-between p-2 rounded bg-muted">
            <span>New Project</span>
            <kbd className="px-2 py-0.5 rounded bg-background border text-xs">Ctrl/Cmd + N</kbd>
          </div>
          <div className="flex justify-between p-2 rounded bg-muted">
            <span>Refresh Data</span>
            <kbd className="px-2 py-0.5 rounded bg-background border text-xs">Ctrl/Cmd + R</kbd>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const TroubleshootingContent = () => (
  <div className="space-y-6">
    <div className="border-l-4 border-yellow-500 bg-yellow-500/10 p-4 rounded-r-lg">
      <h4 className="font-medium flex items-center gap-2 mb-2">
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
        Backend Connection Issues
      </h4>
      <p className="text-sm text-muted-foreground mb-2">
        If you see "Backend unavailable" at the top of the app:
      </p>
      <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
        <li>Ensure the backend server is running</li>
        <li>Check that it's accessible at http://localhost:8000</li>
        <li>Verify the /health endpoint responds</li>
      </ol>
    </div>

    <div className="space-y-4">
      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-2">Storage Limit Exceeded</h4>
        <p className="text-sm text-muted-foreground mb-2">
          Large CSV files (over 5MB) may exceed browser storage limits.
        </p>
        <p className="text-sm">
          <strong>Solution:</strong> Use smaller files or clear existing data in Settings.
        </p>
      </div>

      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-2">File Encoding Issues</h4>
        <p className="text-sm text-muted-foreground mb-2">
          Special characters appearing incorrectly in your data.
        </p>
        <p className="text-sm">
          <strong>Solution:</strong> Re-save your CSV as UTF-8 with BOM, or the app will
          attempt auto-detection of common encodings.
        </p>
      </div>

      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-2">Request Timeout</h4>
        <p className="text-sm text-muted-foreground mb-2">
          Operations taking longer than 30 seconds will timeout.
        </p>
        <p className="text-sm">
          <strong>Solution:</strong> For large batch operations, reduce the batch size
          or check backend logs for performance issues.
        </p>
      </div>

      <div className="border rounded-lg p-4">
        <h4 className="font-medium mb-2">SFTP Connection Failed</h4>
        <p className="text-sm text-muted-foreground mb-2">
          Cannot connect to your SFTP server.
        </p>
        <p className="text-sm">
          <strong>Solutions:</strong>
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground ml-2">
          <li>Verify credentials are correct</li>
          <li>Check if port 22 is accessible from your network</li>
          <li>Ensure the server allows your IP address</li>
        </ul>
      </div>
    </div>

    <div className="text-sm text-muted-foreground mt-4">
      <p>For additional help, enable debug logging:</p>
      <code className="block mt-2 p-2 rounded bg-muted text-xs">
        localStorage.setItem('debug', 'true');
      </code>
    </div>
  </div>
);

const AIConfigContent = () => {
  const setCurrentStep = useAppStore((state) => state.setCurrentStep);

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Proficiency Studio supports multiple AI providers for skill assessment. Configure your
        preferred provider in the Settings or Environments section.
      </p>

      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <span className="bg-green-500/10 text-green-600 px-2 py-0.5 rounded text-sm">Recommended</span>
            Google Gemini 3.1
          </h4>
          <p className="text-sm text-muted-foreground mb-2">
            Fast and FREE. Supports Gemini 3.1 Flash-Lite (fast) and Pro (advanced reasoning) models.
          </p>
          <div className="text-sm">
            <strong>Setup:</strong> Get API key from <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">aistudio.google.com</a>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-2 flex items-center gap-2">
            <span className="bg-green-500/10 text-green-600 px-2 py-0.5 rounded text-sm">Recommended</span>
            Kimi K2.5 (Moonshot AI)
          </h4>
          <p className="text-sm text-muted-foreground mb-2">
            Powerful multimodal agentic model with 256K context. OpenAI-compatible API.
          </p>
          <div className="text-sm">
            <strong>Setup:</strong> Get API key from <a href="https://platform.moonshot.cn" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">platform.moonshot.cn</a>
          </div>
        </div>
      </div>

      <div className="border-l-4 border-primary bg-primary/5 p-4 rounded-r-lg">
        <h4 className="font-medium mb-2">AI Frameworks</h4>
        <p className="text-sm text-muted-foreground">
          The backend uses <strong>LangChain</strong> for LLM orchestration and <strong>LangGraph</strong> for
          workflow state management. <strong>PydanticAI</strong> provides type-safe structured outputs for assessments.
        </p>
      </div>

      <Button
        variant="outline"
        onClick={() => setCurrentStep(9)}
        className="mt-4"
      >
        Go to Environments <ChevronRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
};

const DOC_SECTIONS: DocSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Rocket,
    content: <GettingStartedContent />,
    keywords: ['welcome', 'start', 'quick', 'setup', 'prerequisites', 'introduction', 'overview', 'begin', 'install'],
  },
  {
    id: 'integration-paths',
    title: 'Integration Paths',
    icon: GitBranch,
    content: <IntegrationPathsContent />,
    keywords: ['csv', 'upload', 'sftp', 'eightfold', 'api', 'import', 'data', 'file', 'connect', 'source', 'integration'],
  },
  {
    id: 'ai-configuration',
    title: 'AI Configuration',
    icon: Cpu,
    content: <AIConfigContent />,
    keywords: ['ai', 'llm', 'kimi', 'moonshot', 'gemini', 'model', 'provider', 'langchain', 'api key'],
  },
  {
    id: 'workflow-steps',
    title: 'Workflow Steps',
    icon: Workflow,
    content: <WorkflowStepsContent />,
    keywords: ['workflow', 'steps', 'navigate', 'assessment', 'review', 'extract', 'configure', 'history', 'analytics', 'settings'],
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    icon: Keyboard,
    content: <KeyboardShortcutsContent />,
    keywords: ['keyboard', 'shortcut', 'hotkey', 'ctrl', 'cmd', 'navigation', 'sidebar', 'theme', 'action'],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: AlertTriangle,
    content: <TroubleshootingContent />,
    keywords: ['error', 'problem', 'issue', 'fix', 'solution', 'backend', 'connection', 'timeout', 'encoding', 'storage', 'debug'],
  },
];

export default function Documentation() {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter sections based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) {
      return DOC_SECTIONS;
    }
    const query = searchQuery.toLowerCase().trim();
    return DOC_SECTIONS.filter((section) => {
      // Check title
      if (section.title.toLowerCase().includes(query)) return true;
      // Check keywords
      if (section.keywords.some((kw) => kw.toLowerCase().includes(query))) return true;
      return false;
    });
  }, [searchQuery]);

  // Auto-select first filtered section when search changes
  useEffect(() => {
    if (searchQuery.trim() && filteredSections.length > 0) {
      const currentInFiltered = filteredSections.find((s) => s.id === activeSection);
      if (!currentInFiltered) {
        setActiveSection(filteredSections[0].id);
      }
    }
  }, [searchQuery, filteredSections, activeSection]);

  const currentSection = DOC_SECTIONS.find((s) => s.id === activeSection);

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Documentation</h1>
          </div>
          <p className="text-muted-foreground">
            Learn how to use Proficiency Studio to assess and manage professional skills.
          </p>
        </div>

        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <div className="w-64 shrink-0">
            <div className="sticky top-8 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search docs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Section Links */}
              <nav className="space-y-1">
                {filteredSections.length > 0 ? (
                  filteredSections.map((section) => {
                    const Icon = section.icon;
                    const isActive = activeSection === section.id;

                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-medium">{section.title}</span>
                      </button>
                    );
                  })
                ) : (
                  <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                    No results for "{searchQuery}"
                  </div>
                )}
              </nav>

              {/* External Links */}
              <div className="pt-4 border-t">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  Resources
                </p>
                <a
                  href="https://github.com/ProfStudio/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="h-3 w-3" />
                  Full Documentation
                </a>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            <div className="bg-card rounded-lg border p-6">
              {currentSection && (
                <>
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                    <currentSection.icon className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">{currentSection.title}</h2>
                  </div>
                  <ScrollArea className="h-[calc(100vh-300px)]">
                    {currentSection.content}
                  </ScrollArea>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
