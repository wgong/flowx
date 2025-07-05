import React from 'react';
import { Box, Text, Newline } from 'ink';
import { getKeyboardHandler } from '../services/keyboard-handler.js';

interface HelpOverlayProps {
  visible: boolean;
  onClose: () => void;
}

export const HelpOverlay: React.FC<HelpOverlayProps> = ({ visible, onClose }) => {
  if (!visible) return null;

  const keyboardHandler = getKeyboardHandler();
  const shortcuts = keyboardHandler.getContextualShortcuts();
  const currentContext = keyboardHandler.getCurrentContext();

  // Group shortcuts by context
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const contexts = shortcut.context || ['global'];
    contexts.forEach(context => {
      if (!acc[context]) acc[context] = [];
      acc[context].push(shortcut);
    });
    return acc;
  }, {} as Record<string, typeof shortcuts>);

  const formatShortcutKey = (shortcut: any): string => {
    const parts = [];
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');
    
    const key = shortcut.key.length === 1 ? shortcut.key.toUpperCase() : shortcut.key;
    parts.push(key);
    
    return parts.join('+');
  };

  return (
    <Box
      position="absolute"
      borderStyle="double"
      borderColor="cyan"
      padding={2}
      flexDirection="column"
      width="100%"
      height="100%"
    >
      {/* Header */}
      <Box marginBottom={1}>
        <Text color="cyan" bold>
          🎯 Keyboard Shortcuts Help
        </Text>
        <Box justifyContent="flex-end">
          <Text color="gray">
            Current Context: <Text color="yellow">{currentContext}</Text>
          </Text>
        </Box>
      </Box>

      <Box borderStyle="single" borderColor="gray" marginBottom={1}>
        <Text color="gray" dimColor>
          Press 'h' or 'Escape' to close this help • Context-sensitive shortcuts shown
        </Text>
      </Box>

      {/* Shortcuts Content */}
      <Box flexDirection="column" flexGrow={1}>
        {Object.entries(groupedShortcuts).map(([context, contextShortcuts]) => (
          <Box key={context} flexDirection="column" marginBottom={1}>
            <Text color="green" bold>
              📁 {context.toUpperCase()}
            </Text>
            <Box borderStyle="single" borderColor="gray" padding={1}>
              {contextShortcuts.map((shortcut, index) => (
                <Box key={index} justifyContent="space-between" marginBottom={0}>
                  <Text color="yellow" bold>
                    {formatShortcutKey(shortcut).padEnd(15)}
                  </Text>
                  <Text color="white">
                    {shortcut.description}
                  </Text>
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Box>

      {/* Quick Reference */}
      <Box borderStyle="single" borderColor="blue" padding={1}>
        <Box flexDirection="column">
          <Text color="blue" bold>🔥 Quick Reference</Text>
          <Newline />
          <Text color="white">
            <Text color="yellow">Navigation:</Text> Use number keys (1-6) to switch views
          </Text>
          <Text color="white">
            <Text color="yellow">Global:</Text> 'q' to quit, 'h' for help, 'r' to refresh
          </Text>
          <Text color="white">
            <Text color="yellow">Selection:</Text> Arrow keys to navigate, Enter to select
          </Text>
          <Text color="white">
            <Text color="yellow">Advanced:</Text> Ctrl+A (select all), Ctrl+C (copy), Ctrl+V (paste)
          </Text>
        </Box>
      </Box>

      {/* Footer */}
      <Box marginTop={1} justifyContent="center">
        <Text color="gray">
          💡 Tip: Shortcuts are context-aware and change based on your current view
        </Text>
      </Box>
    </Box>
  );
};

export default HelpOverlay; 