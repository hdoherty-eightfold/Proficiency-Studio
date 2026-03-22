import React, { useEffect, useMemo, useCallback } from 'react';
import { useCommandStore, CommandItem } from '@/stores/command-store';
import { useAppStore } from '@/stores/app-store';
import { useThemeStore } from '@/stores/theme-store';
import { cn } from '@/lib/utils';
import {
    Home,
    GitBranch,
    FileText,
    Settings as SettingsIcon,
    Gauge,
    PlayCircle,
    CheckCircle,
    Database,
    History,
    BarChart3,
    Sparkles,
    BookOpen,
    Moon,
    Sun,
    Search,
    Command,
    CornerDownLeft,
    ArrowUp,
    ArrowDown,
    RotateCcw,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

// Build command list
function useCommands(): CommandItem[] {
    const setCurrentStep = useAppStore((state) => state.setCurrentStep);
    const resetWorkflowProgress = useAppStore((state) => state.resetWorkflowProgress);
    const toggleTheme = useThemeStore((state) => state.toggleTheme);
    const theme = useThemeStore((state) => state.theme);

    return useMemo(() => [
        // Navigation commands
        { id: 'nav-welcome', label: 'Go to Welcome', icon: Home, category: 'navigation', action: () => setCurrentStep(0), keywords: ['home', 'start'] },
        { id: 'nav-integration', label: 'Go to Integration', icon: GitBranch, category: 'navigation', action: () => setCurrentStep(1), keywords: ['connect', 'data', 'source'] },
        { id: 'nav-extract', label: 'Go to Extract Skills', icon: FileText, category: 'navigation', action: () => setCurrentStep(2), keywords: ['skills', 'extract'] },
        { id: 'nav-configure', label: 'Go to Configure', icon: Gauge, category: 'navigation', action: () => setCurrentStep(3), keywords: ['proficiency', 'levels', 'config'] },
        { id: 'nav-assessment', label: 'Go to Assessment', icon: PlayCircle, category: 'navigation', action: () => setCurrentStep(4), keywords: ['run', 'ai', 'assess'] },
        { id: 'nav-review', label: 'Go to Review', icon: CheckCircle, category: 'navigation', action: () => setCurrentStep(5), keywords: ['export', 'results'] },
        { id: 'nav-history', label: 'Go to History', icon: History, category: 'navigation', action: () => setCurrentStep(6), keywords: ['past', 'previous'] },
        { id: 'nav-analytics', label: 'Go to Analytics', icon: BarChart3, category: 'navigation', action: () => setCurrentStep(7), keywords: ['insights', 'metrics', 'dashboard'] },
        { id: 'nav-prompts', label: 'Go to Prompts', icon: Sparkles, category: 'navigation', action: () => setCurrentStep(8), keywords: ['ai', 'templates', 'editor'] },
        { id: 'nav-environments', label: 'Go to Environments', icon: Database, category: 'navigation', action: () => setCurrentStep(9), keywords: ['eightfold', 'api'] },
        { id: 'nav-settings', label: 'Go to Settings', icon: SettingsIcon, category: 'navigation', action: () => setCurrentStep(10), keywords: ['preferences', 'config'] },
        { id: 'nav-docs', label: 'Go to Documentation', icon: BookOpen, category: 'navigation', action: () => setCurrentStep(11), keywords: ['help', 'guide'] },

        // Action commands
        { id: 'action-theme', label: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode', icon: theme === 'dark' ? Sun : Moon, category: 'actions', action: toggleTheme, keywords: ['theme', 'dark', 'light'] },
        { id: 'action-reset', label: 'Reset Workflow Progress', icon: RotateCcw, category: 'actions', action: resetWorkflowProgress, keywords: ['clear', 'start over'] },
    ], [setCurrentStep, toggleTheme, theme, resetWorkflowProgress]);
}

function CommandPaletteContent() {
    const { searchQuery, setSearchQuery, closeCommand, addRecentCommand, recentCommands } = useCommandStore();
    const commands = useCommands();
    const [selectedIndex, setSelectedIndex] = React.useState(0);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [localSearchValue, setLocalSearchValue] = React.useState(searchQuery);
    const debounceTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    // Filter commands based on search query
    const filteredCommands = useMemo(() => {
        if (!searchQuery) {
            // Show recent commands first, then all commands
            const recentItems = recentCommands
                .map(id => commands.find(c => c.id === id))
                .filter(Boolean) as CommandItem[];

            const otherItems = commands.filter(c => !recentCommands.includes(c.id));

            return {
                recent: recentItems,
                navigation: otherItems.filter(c => c.category === 'navigation'),
                actions: otherItems.filter(c => c.category === 'actions'),
            };
        }

        const query = searchQuery.toLowerCase();
        const matches = commands.filter(cmd => {
            const labelMatch = cmd.label.toLowerCase().includes(query);
            const keywordMatch = cmd.keywords?.some(k => k.toLowerCase().includes(query));
            const descMatch = cmd.description?.toLowerCase().includes(query);
            return labelMatch || keywordMatch || descMatch;
        });

        return {
            recent: [],
            navigation: matches.filter(c => c.category === 'navigation'),
            actions: matches.filter(c => c.category === 'actions'),
        };
    }, [commands, searchQuery, recentCommands]);

    // Flatten for keyboard navigation
    const flattenedCommands = useMemo(() => {
        return [
            ...filteredCommands.recent,
            ...filteredCommands.navigation,
            ...filteredCommands.actions,
        ];
    }, [filteredCommands]);

    // Reset selection when results change
    useEffect(() => {
        setSelectedIndex(0);
    }, [searchQuery]);

    // Focus input on mount
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const executeCommand = useCallback((command: CommandItem) => {
        addRecentCommand(command.id);
        command.action();
        closeCommand();
    }, [addRecentCommand, closeCommand]);

    // Keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(i => Math.min(i + 1, flattenedCommands.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(i => Math.max(i - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (flattenedCommands[selectedIndex]) {
                    executeCommand(flattenedCommands[selectedIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                closeCommand();
                break;
        }
    }, [flattenedCommands, selectedIndex, executeCommand, closeCommand]);

    const renderCommandGroup = (title: string, items: CommandItem[], startIndex: number) => {
        if (items.length === 0) return null;

        return (
            <div className="py-2">
                <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {title}
                </p>
                {items.map((cmd, i) => {
                    const globalIndex = startIndex + i;
                    const Icon = cmd.icon;
                    const isSelected = selectedIndex === globalIndex;

                    return (
                        <button
                            key={cmd.id}
                            onClick={() => executeCommand(cmd)}
                            onMouseEnter={() => setSelectedIndex(globalIndex)}
                            className={cn(
                                'w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors',
                                isSelected
                                    ? 'bg-accent text-accent-foreground'
                                    : 'text-foreground hover:bg-accent/50'
                            )}
                        >
                            {Icon && <Icon className="h-4 w-4 text-muted-foreground shrink-0" />}
                            <span className="flex-1 text-left truncate">{cmd.label}</span>
                            {cmd.shortcut && (
                                <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                                    {cmd.shortcut}
                                </kbd>
                            )}
                        </button>
                    );
                })}
            </div>
        );
    };

    let currentIndex = 0;
    const recentStartIndex = currentIndex;
    currentIndex += filteredCommands.recent.length;
    const navigationStartIndex = currentIndex;
    currentIndex += filteredCommands.navigation.length;
    const actionsStartIndex = currentIndex;

    return (
        <div
            className="flex flex-col overflow-hidden"
            onKeyDown={handleKeyDown}
        >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b">
                <Search className="h-5 w-5 text-muted-foreground shrink-0" />
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Type a command or search..."
                    value={localSearchValue}
                    onChange={(e) => {
                        const value = e.target.value;
                        setLocalSearchValue(value);
                        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
                        debounceTimerRef.current = setTimeout(() => setSearchQuery(value), 300);
                    }}
                    aria-label="Search commands"
                    className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                />
                <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    ESC
                </kbd>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto max-h-[300px] scrollbar-thin">
                {flattenedCommands.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                        No commands found
                    </div>
                ) : (
                    <>
                        {renderCommandGroup('Recent', filteredCommands.recent, recentStartIndex)}
                        {renderCommandGroup('Navigation', filteredCommands.navigation, navigationStartIndex)}
                        {renderCommandGroup('Actions', filteredCommands.actions, actionsStartIndex)}
                    </>
                )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-4 px-4 py-2 border-t text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                        <ArrowUp className="h-3 w-3" />
                        <ArrowDown className="h-3 w-3" />
                        Navigate
                    </span>
                    <span className="flex items-center gap-1">
                        <CornerDownLeft className="h-3 w-3" />
                        Select
                    </span>
                </div>
                <span className="flex items-center gap-1">
                    <Command className="h-3 w-3" />K to toggle
                </span>
            </div>
        </div>
    );
}

export function CommandPalette() {
    const { isOpen, closeCommand, toggleCommand } = useCommandStore();

    // Global keyboard shortcut (Cmd+K / Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                toggleCommand();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [toggleCommand]);

    return (
        <Dialog.Root open={isOpen} onOpenChange={(open) => !open && closeCommand()}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in" />
                <Dialog.Content
                    className="fixed left-1/2 top-1/4 z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border bg-card shadow-2xl animate-scale-in"
                    aria-label="Command palette"
                >
                    <Dialog.Title className="sr-only">Command Palette</Dialog.Title>
                    <Dialog.Description className="sr-only">Search and execute commands or navigate to pages</Dialog.Description>
                    <CommandPaletteContent />
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
