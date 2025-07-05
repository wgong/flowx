import React, { useState, useEffect, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { getNotificationService, Notification, NotificationStats } from '../services/notification-service.js';

export interface NotificationToastProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  maxVisible?: number;
  showStats?: boolean;
  autoHide?: boolean;
  compactMode?: boolean;
  visible?: boolean;
}

export function NotificationToast({
  position = 'top-right',
  maxVisible = 5,
  showStats = false,
  autoHide = true,
  compactMode = false,
  visible = true
}: NotificationToastProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const notificationService = getNotificationService();

  // Load notifications and stats
  useEffect(() => {
    const loadData = () => {
      const allNotifications = notificationService.getNotifications({ dismissed: false });
      setNotifications(allNotifications);
      
      if (showStats) {
        setStats(notificationService.getStats());
      }
    };

    loadData();

    // Listen for notification events
    const handleNotificationCreated = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
    };

    const handleNotificationUpdated = (notification: Notification) => {
      setNotifications(prev => prev.map(n => n.id === notification.id ? notification : n));
    };

    const handleNotificationDismissed = (notification: Notification) => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    };

    const handleNotificationRemoved = (notification: Notification) => {
      setNotifications(prev => prev.filter(n => n.id !== notification.id));
    };

    notificationService.on('notificationCreated', handleNotificationCreated);
    notificationService.on('notificationUpdated', handleNotificationUpdated);
    notificationService.on('notificationDismissed', handleNotificationDismissed);
    notificationService.on('notificationRemoved', handleNotificationRemoved);

    return () => {
      notificationService.off('notificationCreated', handleNotificationCreated);
      notificationService.off('notificationUpdated', handleNotificationUpdated);
      notificationService.off('notificationDismissed', handleNotificationDismissed);
      notificationService.off('notificationRemoved', handleNotificationRemoved);
    };
  }, [showStats]);

  // Handle keyboard input
  useInput((input, key) => {
    if (!visible || notifications.length === 0) return;

    if (key.upArrow && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    } else if (key.downArrow && selectedIndex < notifications.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    } else if (key.return) {
      // Dismiss selected notification
      const notification = notifications[selectedIndex];
      if (notification) {
        notificationService.dismiss(notification.id);
      }
    } else if (input === 'x') {
      // Dismiss all notifications
      notificationService.dismissAll();
    } else if (input === 'r') {
      // Mark all as read
      notificationService.markAllAsRead();
    } else if (input === 'v') {
      // Toggle show all
      setShowAll(!showAll);
    }
  });

  // Filter notifications to show
  const visibleNotifications = useMemo(() => {
    if (showAll) {
      return notifications;
    }
    return notifications.slice(0, maxVisible);
  }, [notifications, maxVisible, showAll]);

  if (!visible || notifications.length === 0) {
    return null;
  }

  return (
    <Box
      flexDirection="column"
      width={compactMode ? 40 : 60}
      paddingX={1}
      paddingY={1}
    >
      {/* Stats Header */}
      {showStats && stats && (
        <Box marginBottom={1} borderStyle="single" borderColor="gray" padding={1}>
          <Text color="white" bold>📬 Notifications</Text>
          <Text color="gray"> ({stats.unread} unread)</Text>
        </Box>
      )}

      {/* Notifications */}
      {visibleNotifications.map((notification, index) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          isSelected={index === selectedIndex}
          compact={compactMode}
          onDismiss={() => notificationService.dismiss(notification.id)}
          onMarkAsRead={() => notificationService.markAsRead(notification.id)}
        />
      ))}

      {/* More notifications indicator */}
      {notifications.length > maxVisible && !showAll && (
        <Box borderStyle="single" borderColor="gray" padding={1} marginTop={1}>
          <Text color="gray" dimColor>
            ... and {notifications.length - maxVisible} more notifications
          </Text>
          <Text color="gray" dimColor>Press 'v' to view all</Text>
        </Box>
      )}

      {/* Controls */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
        <Text color="gray" dimColor>
          ↑↓ Select • Enter: Dismiss • X: Dismiss All • R: Mark All Read • V: Toggle View
        </Text>
      </Box>
    </Box>
  );
}

// Individual notification item component
interface NotificationItemProps {
  notification: Notification;
  isSelected: boolean;
  compact: boolean;
  onDismiss: () => void;
  onMarkAsRead: () => void;
}

function NotificationItem({
  notification,
  isSelected,
  compact,
  onDismiss,
  onMarkAsRead
}: NotificationItemProps) {
  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'success': return 'green';
      case 'warning': return 'yellow';
      case 'error': return 'red';
      case 'progress': return 'blue';
      default: return 'cyan';
    }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'progress': return '⏳';
      default: return 'ℹ️';
    }
  };

  const getPriorityIndicator = (priority: Notification['priority']) => {
    switch (priority) {
      case 'critical': return '🔴';
      case 'high': return '🟡';
      case 'normal': return '🟢';
      case 'low': return '🔵';
      default: return '';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  };

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={getNotificationColor(notification.type)}
      padding={compact ? 0 : 1}
      marginBottom={1}
    >
      {/* Header */}
      <Box justifyContent="space-between" alignItems="center">
        <Box>
          <Text color={getNotificationColor(notification.type)}>
            {getNotificationIcon(notification.type)}
          </Text>
          <Text color="white" bold> {notification.title}</Text>
          {notification.priority !== 'normal' && (
            <Text> {getPriorityIndicator(notification.priority)}</Text>
          )}
        </Box>
        <Box>
          {!notification.read && (
            <Text color="blue">●</Text>
          )}
          <Text color="gray" dimColor> {formatTimeAgo(notification.timestamp)}</Text>
        </Box>
      </Box>

      {/* Message */}
      {notification.message && !compact && (
        <Box marginTop={1}>
          <Text color="gray">{notification.message}</Text>
        </Box>
      )}

      {/* Progress bar for progress notifications */}
      {notification.type === 'progress' && typeof notification.progress === 'number' && (
        <Box marginTop={1}>
          <ProgressBar progress={notification.progress} />
        </Box>
      )}

      {/* Actions */}
      {notification.actions && notification.actions.length > 0 && !compact && (
        <Box marginTop={1} flexDirection="row">
          {notification.actions.map(action => (
            <Box key={action.id} marginRight={1}>
              <Text
                color={action.type === 'primary' ? 'cyan' : action.type === 'danger' ? 'red' : 'gray'}
                bold={action.type === 'primary'}
              >
                [{action.shortcut || action.id}] {action.label}
              </Text>
            </Box>
          ))}
        </Box>
      )}

      {/* Category */}
      {notification.category && !compact && (
        <Box marginTop={1}>
          <Text color="gray" dimColor>Category: {notification.category}</Text>
        </Box>
      )}

      {/* Source */}
      {notification.source && !compact && (
        <Box>
          <Text color="gray" dimColor>Source: {notification.source}</Text>
        </Box>
      )}
    </Box>
  );
}

// Progress bar component
interface ProgressBarProps {
  progress: number;
  width?: number;
}

function ProgressBar({ progress, width = 30 }: ProgressBarProps) {
  const filled = Math.round((progress / 100) * width);
  const empty = width - filled;

  return (
    <Box>
      <Text color="cyan">
        {'█'.repeat(filled)}
        {'░'.repeat(empty)}
      </Text>
      <Text color="white"> {progress.toFixed(1)}%</Text>
    </Box>
  );
}

// Notification center component (full overlay)
export interface NotificationCenterProps {
  visible: boolean;
  onClose: () => void;
}

export function NotificationCenter({ visible, onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread' | 'errors' | 'warnings'>('all');

  const notificationService = getNotificationService();

  useEffect(() => {
    if (!visible) return;

    const loadData = () => {
      let notificationFilter = {};
      
      switch (filter) {
        case 'unread':
          notificationFilter = { read: false };
          break;
        case 'errors':
          notificationFilter = { type: ['error'] };
          break;
        case 'warnings':
          notificationFilter = { type: ['warning'] };
          break;
        default:
          notificationFilter = {};
      }

      const allNotifications = notificationService.getNotifications(notificationFilter);
      setNotifications(allNotifications);
      setStats(notificationService.getStats());
    };

    loadData();

    const handleNotificationChange = () => loadData();

    notificationService.on('notificationCreated', handleNotificationChange);
    notificationService.on('notificationUpdated', handleNotificationChange);
    notificationService.on('notificationDismissed', handleNotificationChange);
    notificationService.on('notificationRemoved', handleNotificationChange);

    return () => {
      notificationService.off('notificationCreated', handleNotificationChange);
      notificationService.off('notificationUpdated', handleNotificationChange);
      notificationService.off('notificationDismissed', handleNotificationChange);
      notificationService.off('notificationRemoved', handleNotificationChange);
    };
  }, [visible, filter]);

  useInput((input, key) => {
    if (!visible) return;

    if (key.escape) {
      onClose();
    } else if (key.upArrow && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    } else if (key.downArrow && selectedIndex < notifications.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    } else if (key.return) {
      const notification = notifications[selectedIndex];
      if (notification) {
        notificationService.dismiss(notification.id);
      }
    } else if (input === 'f') {
      // Cycle through filters
      const filters: Array<'all' | 'unread' | 'errors' | 'warnings'> = ['all', 'unread', 'errors', 'warnings'];
      const currentIndex = filters.indexOf(filter);
      const nextIndex = (currentIndex + 1) % filters.length;
      setFilter(filters[nextIndex]);
      setSelectedIndex(0);
    } else if (input === 'x') {
      notificationService.dismissAll();
    } else if (input === 'r') {
      notificationService.markAllAsRead();
    } else if (input === 'c') {
      notificationService.clear();
    }
  });

  if (!visible) return null;

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor="magenta"
      padding={1}
    >
      {/* Header */}
      <Box justifyContent="space-between" marginBottom={1}>
        <Text color="magenta" bold>🔔 Notification Center</Text>
        <Box>
          <Text color="white">Filter: </Text>
          <Text color="cyan" bold>{filter.toUpperCase()}</Text>
          <Text color="gray"> • {notifications.length} notifications</Text>
        </Box>
      </Box>

      {/* Stats */}
      {stats && (
        <Box marginBottom={1} borderStyle="single" borderColor="gray" padding={1}>
          <Text color="white">
            Total: <Text color="cyan">{stats.total}</Text> • 
            Unread: <Text color="yellow">{stats.unread}</Text> • 
            Errors: <Text color="red">{stats.byType.error}</Text> • 
            Warnings: <Text color="yellow">{stats.byType.warning}</Text> • 
            Recent: <Text color="green">{stats.recentActivity}</Text>
          </Text>
        </Box>
      )}

      {/* Notifications List */}
      <Box flexDirection="column" flexGrow={1}>
        {notifications.length === 0 ? (
          <Box justifyContent="center" alignItems="center" flexGrow={1}>
            <Text color="gray" dimColor>No notifications to display</Text>
          </Box>
        ) : (
          notifications.map((notification, index) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              isSelected={index === selectedIndex}
              compact={false}
              onDismiss={() => notificationService.dismiss(notification.id)}
              onMarkAsRead={() => notificationService.markAsRead(notification.id)}
            />
          ))
        )}
      </Box>

      {/* Footer */}
      <Box marginTop={1} borderStyle="single" borderColor="gray" padding={1}>
        <Text color="gray" dimColor>
          [F] Filter • [↑↓] Select • [Enter] Dismiss • [X] Dismiss All • [R] Mark All Read • [C] Clear All • [Esc] Close
        </Text>
      </Box>
    </Box>
  );
}

export default NotificationToast; 