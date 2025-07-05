import { EventEmitter } from 'events';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'progress';
  title: string;
  message?: string;
  details?: string;
  priority: 'low' | 'normal' | 'high' | 'critical';
  category?: string;
  timestamp: Date;
  duration?: number; // Auto-dismiss time in ms
  persistent?: boolean; // Don't auto-dismiss
  actions?: NotificationAction[];
  progress?: number; // 0-100 for progress notifications
  metadata?: Record<string, any>;
  source?: string; // Component that created the notification
  read?: boolean;
  dismissed?: boolean;
}

export interface NotificationAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'danger';
  callback: () => void | Promise<void>;
  shortcut?: string;
}

export interface NotificationFilter {
  type?: Notification['type'][];
  priority?: Notification['priority'][];
  category?: string[];
  source?: string[];
  read?: boolean;
  dismissed?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface NotificationGroup {
  id: string;
  title: string;
  notifications: Notification[];
  collapsed: boolean;
  category: string;
  priority: Notification['priority'];
  lastUpdated: Date;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<Notification['type'], number>;
  byPriority: Record<Notification['priority'], number>;
  byCategory: Record<string, number>;
  recentActivity: number; // Last 24 hours
}

/**
 * Comprehensive notification service with advanced features
 */
export class NotificationService extends EventEmitter {
  private notifications = new Map<string, Notification>();
  private groups = new Map<string, NotificationGroup>();
  private maxNotifications = 1000;
  private defaultDuration = 5000; // 5 seconds
  private cleanupInterval?: NodeJS.Timeout;
  private soundEnabled = true;
  private vibrationEnabled = true;

  constructor() {
    super();
    this.startCleanupTimer();
  }

  /**
   * Create a new notification
   */
  create(options: Omit<Notification, 'id' | 'timestamp' | 'read' | 'dismissed'>): string {
    const id = `notification-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    const notification: Notification = {
      id,
      timestamp: new Date(),
      read: false,
      dismissed: false,
      duration: options.persistent ? undefined : (options.duration || this.getDefaultDuration(options.type, options.priority)),
      ...options
    };

    this.notifications.set(id, notification);
    
    // Auto-dismiss if duration is set
    if (notification.duration && !notification.persistent) {
      setTimeout(() => {
        this.dismiss(id);
      }, notification.duration);
    }

    // Group notifications if category is provided
    if (notification.category) {
      this.addToGroup(notification);
    }

    // Play sound/vibration for high priority notifications
    if (notification.priority === 'high' || notification.priority === 'critical') {
      this.playNotificationSound(notification.type);
    }

    // Clean up old notifications if we exceed max
    this.cleanupOldNotifications();

    this.emit('notificationCreated', notification);
    return id;
  }

  /**
   * Create info notification
   */
  info(title: string, message?: string, options?: Partial<Notification>): string {
    return this.create({
      type: 'info',
      title,
      message,
      priority: 'normal',
      ...options
    });
  }

  /**
   * Create success notification
   */
  success(title: string, message?: string, options?: Partial<Notification>): string {
    return this.create({
      type: 'success',
      title,
      message,
      priority: 'normal',
      ...options
    });
  }

  /**
   * Create warning notification
   */
  warning(title: string, message?: string, options?: Partial<Notification>): string {
    return this.create({
      type: 'warning',
      title,
      message,
      priority: 'high',
      ...options
    });
  }

  /**
   * Create error notification
   */
  error(title: string, message?: string, options?: Partial<Notification>): string {
    return this.create({
      type: 'error',
      title,
      message,
      priority: 'critical',
      persistent: true, // Errors are persistent by default
      ...options
    });
  }

  /**
   * Create progress notification
   */
  progress(title: string, initialProgress: number = 0, options?: Partial<Notification>): string {
    return this.create({
      type: 'progress',
      title,
      progress: initialProgress,
      priority: 'normal',
      persistent: true, // Progress notifications are persistent
      ...options
    });
  }

  /**
   * Update progress notification
   */
  updateProgress(id: string, progress: number, message?: string): boolean {
    const notification = this.notifications.get(id);
    if (!notification || notification.type !== 'progress') {
      return false;
    }

    notification.progress = Math.max(0, Math.min(100, progress));
    if (message) {
      notification.message = message;
    }

    // Auto-dismiss when progress reaches 100%
    if (progress >= 100 && !notification.persistent) {
      setTimeout(() => {
        this.dismiss(id);
      }, 2000);
    }

    this.emit('notificationUpdated', notification);
    return true;
  }

  /**
   * Update notification
   */
  update(id: string, updates: Partial<Notification>): boolean {
    const notification = this.notifications.get(id);
    if (!notification) {
      return false;
    }

    Object.assign(notification, updates);
    this.emit('notificationUpdated', notification);
    return true;
  }

  /**
   * Mark notification as read
   */
  markAsRead(id: string): boolean {
    const notification = this.notifications.get(id);
    if (!notification) {
      return false;
    }

    notification.read = true;
    this.emit('notificationRead', notification);
    return true;
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(filter?: NotificationFilter): number {
    const notifications = this.getNotifications(filter);
    let count = 0;

    for (const notification of notifications) {
      if (!notification.read) {
        notification.read = true;
        count++;
        this.emit('notificationRead', notification);
      }
    }

    if (count > 0) {
      this.emit('allNotificationsRead', count);
    }

    return count;
  }

  /**
   * Dismiss notification
   */
  dismiss(id: string): boolean {
    const notification = this.notifications.get(id);
    if (!notification) {
      return false;
    }

    notification.dismissed = true;
    this.emit('notificationDismissed', notification);
    
    // Remove from groups
    this.removeFromGroup(notification);
    
    // Actually remove after a delay to allow for animations
    setTimeout(() => {
      this.notifications.delete(id);
      this.emit('notificationRemoved', notification);
    }, 1000);

    return true;
  }

  /**
   * Dismiss all notifications
   */
  dismissAll(filter?: NotificationFilter): number {
    const notifications = this.getNotifications(filter);
    let count = 0;

    for (const notification of notifications) {
      if (!notification.dismissed) {
        this.dismiss(notification.id);
        count++;
      }
    }

    return count;
  }

  /**
   * Get notification by ID
   */
  getNotification(id: string): Notification | undefined {
    return this.notifications.get(id);
  }

  /**
   * Get all notifications with optional filtering
   */
  getNotifications(filter?: NotificationFilter): Notification[] {
    let notifications = Array.from(this.notifications.values());

    if (filter) {
      notifications = notifications.filter(notification => {
        // Type filter
        if (filter.type && !filter.type.includes(notification.type)) {
          return false;
        }

        // Priority filter
        if (filter.priority && !filter.priority.includes(notification.priority)) {
          return false;
        }

        // Category filter
        if (filter.category && notification.category && !filter.category.includes(notification.category)) {
          return false;
        }

        // Source filter
        if (filter.source && notification.source && !filter.source.includes(notification.source)) {
          return false;
        }

        // Read filter
        if (filter.read !== undefined && notification.read !== filter.read) {
          return false;
        }

        // Dismissed filter
        if (filter.dismissed !== undefined && notification.dismissed !== filter.dismissed) {
          return false;
        }

        // Date range filter
        if (filter.dateRange) {
          const timestamp = notification.timestamp.getTime();
          const start = filter.dateRange.start.getTime();
          const end = filter.dateRange.end.getTime();
          
          if (timestamp < start || timestamp > end) {
            return false;
          }
        }

        return true;
      });
    }

    // Sort by timestamp (newest first), then by priority
    return notifications.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      
      if (priorityDiff !== 0) {
        return priorityDiff;
      }
      
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }

  /**
   * Get notification statistics
   */
  getStats(): NotificationStats {
    const notifications = Array.from(this.notifications.values());
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const stats: NotificationStats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      byType: {
        info: 0,
        success: 0,
        warning: 0,
        error: 0,
        progress: 0
      },
      byPriority: {
        low: 0,
        normal: 0,
        high: 0,
        critical: 0
      },
      byCategory: {},
      recentActivity: notifications.filter(n => n.timestamp > yesterday).length
    };

    // Count by type and priority
    for (const notification of notifications) {
      stats.byType[notification.type]++;
      stats.byPriority[notification.priority]++;
      
      if (notification.category) {
        stats.byCategory[notification.category] = (stats.byCategory[notification.category] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Create notification group
   */
  createGroup(category: string, title: string): string {
    const id = `group-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    const group: NotificationGroup = {
      id,
      title,
      notifications: [],
      collapsed: false,
      category,
      priority: 'normal',
      lastUpdated: new Date()
    };

    this.groups.set(id, group);
    this.emit('groupCreated', group);
    
    return id;
  }

  /**
   * Get notification groups
   */
  getGroups(): NotificationGroup[] {
    return Array.from(this.groups.values())
      .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
  }

  /**
   * Toggle group collapsed state
   */
  toggleGroup(groupId: string): boolean {
    const group = this.groups.get(groupId);
    if (!group) {
      return false;
    }

    group.collapsed = !group.collapsed;
    this.emit('groupToggled', group);
    return true;
  }

  /**
   * Clear all notifications
   */
  clear(): void {
    const count = this.notifications.size;
    this.notifications.clear();
    this.groups.clear();
    this.emit('allNotificationsCleared', count);
  }

  /**
   * Enable/disable sound notifications
   */
  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    this.emit('soundSettingChanged', enabled);
  }

  /**
   * Enable/disable vibration notifications
   */
  setVibrationEnabled(enabled: boolean): void {
    this.vibrationEnabled = enabled;
    this.emit('vibrationSettingChanged', enabled);
  }

  /**
   * Get notification settings
   */
  getSettings(): {
    soundEnabled: boolean;
    vibrationEnabled: boolean;
    maxNotifications: number;
    defaultDuration: number;
  } {
    return {
      soundEnabled: this.soundEnabled,
      vibrationEnabled: this.vibrationEnabled,
      maxNotifications: this.maxNotifications,
      defaultDuration: this.defaultDuration
    };
  }

  /**
   * Destroy service and clean up
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
    this.removeAllListeners();
  }

  // Private methods

  private getDefaultDuration(type: Notification['type'], priority: Notification['priority']): number {
    // Critical errors stay longer
    if (type === 'error' && priority === 'critical') {
      return 10000;
    }
    
    // High priority notifications stay longer
    if (priority === 'high' || priority === 'critical') {
      return 8000;
    }
    
    // Success messages can be shorter
    if (type === 'success') {
      return 3000;
    }
    
    return this.defaultDuration;
  }

  private addToGroup(notification: Notification): void {
    if (!notification.category) return;

    // Find or create group
    let group = Array.from(this.groups.values())
      .find(g => g.category === notification.category);

    if (!group) {
      const groupId = this.createGroup(notification.category, notification.category);
      group = this.groups.get(groupId)!;
    }

    group.notifications.push(notification);
    group.lastUpdated = new Date();
    
    // Update group priority to highest priority notification
    const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
    if (priorityOrder[notification.priority] > priorityOrder[group.priority]) {
      group.priority = notification.priority;
    }

    this.emit('groupUpdated', group);
  }

  private removeFromGroup(notification: Notification): void {
    if (!notification.category) return;

    const group = Array.from(this.groups.values())
      .find(g => g.category === notification.category);

    if (group) {
      group.notifications = group.notifications.filter(n => n.id !== notification.id);
      group.lastUpdated = new Date();
      
      // Remove empty groups
      if (group.notifications.length === 0) {
        this.groups.delete(group.id);
        this.emit('groupRemoved', group);
      } else {
        this.emit('groupUpdated', group);
      }
    }
  }

  private playNotificationSound(type: Notification['type']): void {
    if (!this.soundEnabled) return;

    // In a real implementation, play different sounds for different types
    // For now, just emit an event
    this.emit('playSound', type);
  }

  private cleanupOldNotifications(): void {
    if (this.notifications.size <= this.maxNotifications) return;

    const notifications = Array.from(this.notifications.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const toRemove = notifications.slice(0, notifications.length - this.maxNotifications);
    
    for (const notification of toRemove) {
      this.notifications.delete(notification.id);
      this.removeFromGroup(notification);
    }

    this.emit('notificationsCleanedUp', toRemove.length);
  }

  private startCleanupTimer(): void {
    // Clean up dismissed notifications every 5 minutes
    this.cleanupInterval = setInterval(() => {
      const dismissed = Array.from(this.notifications.values())
        .filter(n => n.dismissed);

      for (const notification of dismissed) {
        this.notifications.delete(notification.id);
      }

      if (dismissed.length > 0) {
        this.emit('dismissedNotificationsCleanedUp', dismissed.length);
      }
    }, 5 * 60 * 1000);
  }
}

// Global notification service instance
let notificationServiceInstance: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService();
  }
  return notificationServiceInstance;
}

// Convenience functions for common notification types
export function notify(title: string, message?: string, type: Notification['type'] = 'info'): string {
  const service = getNotificationService();
  return service.create({ type, title, message, priority: 'normal' });
}

export function notifySuccess(title: string, message?: string): string {
  return getNotificationService().success(title, message);
}

export function notifyWarning(title: string, message?: string): string {
  return getNotificationService().warning(title, message);
}

export function notifyError(title: string, message?: string): string {
  return getNotificationService().error(title, message);
}

export function notifyProgress(title: string, progress: number = 0): string {
  return getNotificationService().progress(title, progress);
} 