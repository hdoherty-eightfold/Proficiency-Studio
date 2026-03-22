import { create } from 'zustand';
import { LucideIcon } from 'lucide-react';

export interface CommandItem {
    id: string;
    label: string;
    description?: string;
    icon?: LucideIcon;
    shortcut?: string;
    category?: 'navigation' | 'actions' | 'recent' | 'settings';
    action: () => void;
    keywords?: string[]; // Additional search terms
}

interface CommandState {
    isOpen: boolean;
    searchQuery: string;
    recentCommands: string[]; // IDs of recently used commands

    // Actions
    openCommand: () => void;
    closeCommand: () => void;
    toggleCommand: () => void;
    setSearchQuery: (query: string) => void;
    addRecentCommand: (commandId: string) => void;
    clearRecentCommands: () => void;
}

const MAX_RECENT_COMMANDS = 5;

export const useCommandStore = create<CommandState>((set, get) => ({
    isOpen: false,
    searchQuery: '',
    recentCommands: [],

    openCommand: () => set({ isOpen: true, searchQuery: '' }),

    closeCommand: () => set({ isOpen: false, searchQuery: '' }),

    toggleCommand: () => {
        const { isOpen } = get();
        set({ isOpen: !isOpen, searchQuery: '' });
    },

    setSearchQuery: (query) => set({ searchQuery: query }),

    addRecentCommand: (commandId) => {
        set((state) => {
            const filtered = state.recentCommands.filter(id => id !== commandId);
            const updated = [commandId, ...filtered].slice(0, MAX_RECENT_COMMANDS);
            return { recentCommands: updated };
        });
    },

    clearRecentCommands: () => set({ recentCommands: [] }),
}));
