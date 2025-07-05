import { EventEmitter } from 'events';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: string;
  context?: string[];
}

export interface KeyboardAction {
  type: string;
  payload?: any;
}

export class KeyboardHandler extends EventEmitter {
  private shortcuts = new Map<string, KeyboardShortcut>();
  private contextStack: string[] = ['global'];
  private helpVisible = false;

  constructor() {
    super();
    this.initializeDefaultShortcuts();
  }

  private initializeDefaultShortcuts(): void {
    // Global shortcuts
    this.registerShortcut({
      key: 'q',
      description: 'Quit application',
      action: 'quit',
      context: ['global']
    });

    this.registerShortcut({
      key: 'escape',
      description: 'Go back / Cancel',
      action: 'back',
      context: ['global']
    });

    this.registerShortcut({
      key: 'h',
      description: 'Show/hide help',
      action: 'toggle-help',
      context: ['global']
    });

    this.registerShortcut({
      key: 'r',
      description: 'Refresh/reload data',
      action: 'refresh',
      context: ['global']
    });

    // Navigation shortcuts
    this.registerShortcut({
      key: '1',
      description: 'Go to Overview',
      action: 'navigate',
      context: ['dashboard'],
      payload: { view: 'overview' }
    });

    this.registerShortcut({
      key: '2',
      description: 'Go to Agents',
      action: 'navigate',
      context: ['dashboard'],
      payload: { view: 'agents' }
    });

    this.registerShortcut({
      key: '3',
      description: 'Go to Tasks',
      action: 'navigate',
      context: ['dashboard'],
      payload: { view: 'tasks' }
    });

    this.registerShortcut({
      key: '4',
      description: 'Go to Memory',
      action: 'navigate',
      context: ['dashboard'],
      payload: { view: 'memory' }
    });

    this.registerShortcut({
      key: '5',
      description: 'Go to Logs',
      action: 'navigate',
      context: ['dashboard'],
      payload: { view: 'logs' }
    });

    this.registerShortcut({
      key: '6',
      description: 'Go to Config',
      action: 'navigate',
      context: ['dashboard'],
      payload: { view: 'config' }
    });

    // Agent management shortcuts
    this.registerShortcut({
      key: 'n',
      description: 'Create new agent',
      action: 'create-agent',
      context: ['agents']
    });

    this.registerShortcut({
      key: 'd',
      description: 'Delete selected agent',
      action: 'delete-agent',
      context: ['agents']
    });

    this.registerShortcut({
      key: 's',
      description: 'Start selected agent',
      action: 'start-agent',
      context: ['agents']
    });

    this.registerShortcut({
      key: 'x',
      description: 'Stop selected agent',
      action: 'stop-agent',
      context: ['agents']
    });

    this.registerShortcut({
      key: 'i',
      description: 'Show agent info',
      action: 'show-agent-info',
      context: ['agents']
    });

    // Task management shortcuts
    this.registerShortcut({
      key: 'n',
      description: 'Create new task',
      action: 'create-task',
      context: ['tasks']
    });

    this.registerShortcut({
      key: 'c',
      description: 'Cancel selected task',
      action: 'cancel-task',
      context: ['tasks']
    });

    this.registerShortcut({
      key: 'r',
      description: 'Retry selected task',
      action: 'retry-task',
      context: ['tasks']
    });

    this.registerShortcut({
      key: 'p',
      description: 'Pause selected task',
      action: 'pause-task',
      context: ['tasks']
    });

    this.registerShortcut({
      key: 'f',
      description: 'Filter tasks',
      action: 'filter-tasks',
      context: ['tasks']
    });

    // Memory management shortcuts
    this.registerShortcut({
      key: 'n',
      description: 'Store new memory',
      action: 'store-memory',
      context: ['memory']
    });

    this.registerShortcut({
      key: 'd',
      description: 'Delete selected memory',
      action: 'delete-memory',
      context: ['memory']
    });

    this.registerShortcut({
      key: 's',
      description: 'Search memories',
      action: 'search-memory',
      context: ['memory']
    });

    this.registerShortcut({
      key: 'f',
      description: 'Filter memories',
      action: 'filter-memory',
      context: ['memory']
    });

    this.registerShortcut({
      key: 'e',
      description: 'Export memories',
      action: 'export-memory',
      context: ['memory']
    });

    // Advanced shortcuts with modifiers
    this.registerShortcut({
      key: 'a',
      ctrl: true,
      description: 'Select all',
      action: 'select-all',
      context: ['agents', 'tasks', 'memory']
    });

    this.registerShortcut({
      key: 'c',
      ctrl: true,
      description: 'Copy selection',
      action: 'copy',
      context: ['agents', 'tasks', 'memory']
    });

    this.registerShortcut({
      key: 'v',
      ctrl: true,
      description: 'Paste',
      action: 'paste',
      context: ['agents', 'tasks', 'memory']
    });

    this.registerShortcut({
      key: 'z',
      ctrl: true,
      description: 'Undo last action',
      action: 'undo',
      context: ['global']
    });

    this.registerShortcut({
      key: 'y',
      ctrl: true,
      description: 'Redo last action',
      action: 'redo',
      context: ['global']
    });

    this.registerShortcut({
      key: 'f',
      ctrl: true,
      description: 'Find/Search',
      action: 'search',
      context: ['global']
    });

    this.registerShortcut({
      key: 'g',
      ctrl: true,
      description: 'Go to line/item',
      action: 'goto',
      context: ['global']
    });

    // Function key shortcuts
    this.registerShortcut({
      key: 'f1',
      description: 'Show help',
      action: 'show-help',
      context: ['global']
    });

    this.registerShortcut({
      key: 'f2',
      description: 'Rename',
      action: 'rename',
      context: ['agents', 'tasks', 'memory']
    });

    this.registerShortcut({
      key: 'f3',
      description: 'Find next',
      action: 'find-next',
      context: ['global']
    });

    this.registerShortcut({
      key: 'f4',
      description: 'Close current view',
      action: 'close-view',
      context: ['global']
    });

    this.registerShortcut({
      key: 'f5',
      description: 'Refresh',
      action: 'refresh',
      context: ['global']
    });

    this.registerShortcut({
      key: 'f11',
      description: 'Toggle fullscreen',
      action: 'toggle-fullscreen',
      context: ['global']
    });

    this.registerShortcut({
      key: 'f12',
      description: 'Open developer tools',
      action: 'dev-tools',
      context: ['global']
    });
  }

  registerShortcut(shortcut: Omit<KeyboardShortcut, 'payload'> & { payload?: any }): void {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts.set(key, shortcut as KeyboardShortcut);
  }

  unregisterShortcut(key: string, ctrl?: boolean, shift?: boolean, alt?: boolean): void {
    const shortcutKey = this.getShortcutKey({ key, ctrl, shift, alt });
    this.shortcuts.delete(shortcutKey);
  }

  handleKeyPress(input: string, key: any): boolean {
    const shortcutKey = this.getShortcutKey({
      key: key.name || input,
      ctrl: key.ctrl,
      shift: key.shift,
      alt: key.meta
    });

    const shortcut = this.shortcuts.get(shortcutKey);
    if (!shortcut) return false;

    // Check if shortcut is valid in current context
    if (!this.isShortcutValidInContext(shortcut)) return false;

    // Handle special cases
    if (shortcut.action === 'toggle-help') {
      this.helpVisible = !this.helpVisible;
      this.emit('help-toggled', { visible: this.helpVisible });
      return true;
    }

    // Emit the action
    const action: KeyboardAction = {
      type: shortcut.action,
      payload: (shortcut as any).payload
    };

    this.emit('action', action);
    return true;
  }

  pushContext(context: string): void {
    this.contextStack.push(context);
    this.emit('context-changed', { context, stack: [...this.contextStack] });
  }

  popContext(): string | undefined {
    if (this.contextStack.length > 1) {
      const context = this.contextStack.pop();
      this.emit('context-changed', { context, stack: [...this.contextStack] });
      return context;
    }
    return undefined;
  }

  getCurrentContext(): string {
    return this.contextStack[this.contextStack.length - 1];
  }

  getContextualShortcuts(): KeyboardShortcut[] {
    const currentContext = this.getCurrentContext();
    return Array.from(this.shortcuts.values()).filter(shortcut =>
      this.isShortcutValidInContext(shortcut)
    );
  }

  getShortcutHelp(): string {
    const shortcuts = this.getContextualShortcuts();
    const grouped = this.groupShortcutsByContext(shortcuts);
    
    let help = '🎯 Keyboard Shortcuts\n\n';
    
    for (const [context, contextShortcuts] of Object.entries(grouped)) {
      help += `📁 ${context.toUpperCase()}\n`;
      help += '─'.repeat(30) + '\n';
      
      for (const shortcut of contextShortcuts) {
        const keyDisplay = this.formatShortcutKey(shortcut);
        help += `${keyDisplay.padEnd(15)} ${shortcut.description}\n`;
      }
      help += '\n';
    }
    
    return help;
  }

  private getShortcutKey(shortcut: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean }): string {
    const modifiers = [];
    if (shortcut.ctrl) modifiers.push('ctrl');
    if (shortcut.shift) modifiers.push('shift');
    if (shortcut.alt) modifiers.push('alt');
    
    return `${modifiers.join('+')}-${shortcut.key}`.toLowerCase();
  }

  private isShortcutValidInContext(shortcut: KeyboardShortcut): boolean {
    if (!shortcut.context || shortcut.context.length === 0) return true;
    
    const currentContext = this.getCurrentContext();
    return shortcut.context.includes(currentContext) || shortcut.context.includes('global');
  }

  private groupShortcutsByContext(shortcuts: KeyboardShortcut[]): Record<string, KeyboardShortcut[]> {
    const grouped: Record<string, KeyboardShortcut[]> = {};
    
    for (const shortcut of shortcuts) {
      const contexts = shortcut.context || ['global'];
      for (const context of contexts) {
        if (!grouped[context]) grouped[context] = [];
        if (!grouped[context].find(s => s.key === shortcut.key)) {
          grouped[context].push(shortcut);
        }
      }
    }
    
    return grouped;
  }

  private formatShortcutKey(shortcut: KeyboardShortcut): string {
    const parts = [];
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');
    
    const key = shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key;
    parts.push(key);
    
    return parts.join('+');
  }

  // Utility methods for common actions
  isHelpVisible(): boolean {
    return this.helpVisible;
  }

  setHelpVisible(visible: boolean): void {
    this.helpVisible = visible;
    this.emit('help-toggled', { visible });
  }

  // Batch shortcut registration
  registerShortcuts(shortcuts: Array<Omit<KeyboardShortcut, 'payload'> & { payload?: any }>): void {
    shortcuts.forEach(shortcut => this.registerShortcut(shortcut));
  }

  // Get all registered shortcuts
  getAllShortcuts(): KeyboardShortcut[] {
    return Array.from(this.shortcuts.values());
  }

  // Clear all shortcuts
  clearShortcuts(): void {
    this.shortcuts.clear();
  }

  // Export/Import shortcuts configuration
  exportShortcuts(): Record<string, KeyboardShortcut> {
    return Object.fromEntries(this.shortcuts.entries());
  }

  importShortcuts(shortcuts: Record<string, KeyboardShortcut>): void {
    this.shortcuts.clear();
    for (const [key, shortcut] of Object.entries(shortcuts)) {
      this.shortcuts.set(key, shortcut);
    }
  }
}

// Singleton instance
let keyboardHandler: KeyboardHandler | null = null;

export function getKeyboardHandler(): KeyboardHandler {
  if (!keyboardHandler) {
    keyboardHandler = new KeyboardHandler();
  }
  return keyboardHandler;
}

export function createKeyboardHandler(): KeyboardHandler {
  return new KeyboardHandler();
}

// Helper function to create shortcut keys
export function createShortcutKey(key: string, modifiers: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}): string {
  const parts = [];
  if (modifiers.ctrl) parts.push('ctrl');
  if (modifiers.shift) parts.push('shift');
  if (modifiers.alt) parts.push('alt');
  parts.push(key.toLowerCase());
  return parts.join('-');
} 