/**
 * Tests for Command Store
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCommandStore } from './command-store';

describe('useCommandStore', () => {
  beforeEach(() => {
    useCommandStore.setState({
      isOpen: false,
      searchQuery: '',
      recentCommands: [],
    });
  });

  describe('initial state', () => {
    it('should initialize with isOpen false', () => {
      expect(useCommandStore.getState().isOpen).toBe(false);
    });

    it('should initialize with empty search query', () => {
      expect(useCommandStore.getState().searchQuery).toBe('');
    });

    it('should initialize with empty recent commands', () => {
      expect(useCommandStore.getState().recentCommands).toEqual([]);
    });
  });

  describe('openCommand', () => {
    it('should set isOpen to true', () => {
      useCommandStore.getState().openCommand();
      expect(useCommandStore.getState().isOpen).toBe(true);
    });

    it('should reset search query when opening', () => {
      useCommandStore.setState({ searchQuery: 'existing query' });
      useCommandStore.getState().openCommand();
      expect(useCommandStore.getState().searchQuery).toBe('');
    });
  });

  describe('closeCommand', () => {
    it('should set isOpen to false', () => {
      useCommandStore.setState({ isOpen: true });
      useCommandStore.getState().closeCommand();
      expect(useCommandStore.getState().isOpen).toBe(false);
    });

    it('should reset search query when closing', () => {
      useCommandStore.setState({ isOpen: true, searchQuery: 'some query' });
      useCommandStore.getState().closeCommand();
      expect(useCommandStore.getState().searchQuery).toBe('');
    });
  });

  describe('toggleCommand', () => {
    it('should open when closed', () => {
      useCommandStore.getState().toggleCommand();
      expect(useCommandStore.getState().isOpen).toBe(true);
    });

    it('should close when open', () => {
      useCommandStore.setState({ isOpen: true });
      useCommandStore.getState().toggleCommand();
      expect(useCommandStore.getState().isOpen).toBe(false);
    });

    it('should reset search query when toggling open', () => {
      useCommandStore.setState({ searchQuery: 'old query' });
      useCommandStore.getState().toggleCommand();
      expect(useCommandStore.getState().searchQuery).toBe('');
    });

    it('should reset search query when toggling closed', () => {
      useCommandStore.setState({ isOpen: true, searchQuery: 'old query' });
      useCommandStore.getState().toggleCommand();
      expect(useCommandStore.getState().searchQuery).toBe('');
    });
  });

  describe('setSearchQuery', () => {
    it('should update search query', () => {
      useCommandStore.getState().setSearchQuery('test query');
      expect(useCommandStore.getState().searchQuery).toBe('test query');
    });

    it('should allow setting empty query', () => {
      useCommandStore.getState().setSearchQuery('something');
      useCommandStore.getState().setSearchQuery('');
      expect(useCommandStore.getState().searchQuery).toBe('');
    });
  });

  describe('addRecentCommand', () => {
    it('should add a command to recent list', () => {
      useCommandStore.getState().addRecentCommand('cmd-1');
      expect(useCommandStore.getState().recentCommands).toEqual(['cmd-1']);
    });

    it('should add most recent command to the front', () => {
      useCommandStore.getState().addRecentCommand('cmd-1');
      useCommandStore.getState().addRecentCommand('cmd-2');
      expect(useCommandStore.getState().recentCommands).toEqual(['cmd-2', 'cmd-1']);
    });

    it('should not duplicate command IDs', () => {
      useCommandStore.getState().addRecentCommand('cmd-1');
      useCommandStore.getState().addRecentCommand('cmd-2');
      useCommandStore.getState().addRecentCommand('cmd-1');
      expect(useCommandStore.getState().recentCommands).toEqual(['cmd-1', 'cmd-2']);
    });

    it('should limit to 5 recent commands', () => {
      for (let i = 1; i <= 7; i++) {
        useCommandStore.getState().addRecentCommand(`cmd-${i}`);
      }
      const recent = useCommandStore.getState().recentCommands;
      expect(recent).toHaveLength(5);
      expect(recent[0]).toBe('cmd-7');
      expect(recent[4]).toBe('cmd-3');
    });

    it('should move re-added command to front without exceeding limit', () => {
      for (let i = 1; i <= 5; i++) {
        useCommandStore.getState().addRecentCommand(`cmd-${i}`);
      }
      // Re-add cmd-1, which is currently last
      useCommandStore.getState().addRecentCommand('cmd-1');
      const recent = useCommandStore.getState().recentCommands;
      expect(recent).toHaveLength(5);
      expect(recent[0]).toBe('cmd-1');
    });
  });

  describe('clearRecentCommands', () => {
    it('should clear all recent commands', () => {
      useCommandStore.getState().addRecentCommand('cmd-1');
      useCommandStore.getState().addRecentCommand('cmd-2');
      expect(useCommandStore.getState().recentCommands).toHaveLength(2);

      useCommandStore.getState().clearRecentCommands();
      expect(useCommandStore.getState().recentCommands).toEqual([]);
    });

    it('should be safe to call when already empty', () => {
      useCommandStore.getState().clearRecentCommands();
      expect(useCommandStore.getState().recentCommands).toEqual([]);
    });
  });
});
