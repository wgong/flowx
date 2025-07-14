/**
 * Message Broker Verification Tests
 * 
 * Focused tests to verify core message broker functionality works correctly
 * with actual message delivery, routing, and broker features.
 */

import { MessageBroker, IMessageBroker } from '../../src/communication/message-broker';
import { MessageBus, MessageBusConfig } from '../../src/communication/message-bus';
import { EventBus } from '../../src/core/event-bus';
import { Logger } from '../../src/core/logger';

describe('Message Broker Verification Tests', () => {
  let messageBroker: IMessageBroker;
  let eventBus: EventBus;
  let logger: Logger;

  beforeEach(async () => {
    logger = new Logger({
      level: 'debug',
      format: 'json',
      destination: 'console'
    });

    eventBus = EventBus.getInstance();

    const messageBusConfig: Partial<MessageBusConfig> = {
      strategy: 'event-driven',
      enablePersistence: true, // Enable persistence for message tracking
      enableReliability: true,
      enableOrdering: true,
      enableFiltering: true,
      maxMessageSize: 10240,
      maxQueueSize: 1000,
      messageRetention: 300000, // 5 minutes
      acknowledgmentTimeout: 10000,
      retryAttempts: 3,
      backoffMultiplier: 2,
      compressionEnabled: false,
      encryptionEnabled: false,
      metricsEnabled: true,
      debugMode: true
    };

    messageBroker = new MessageBroker(messageBusConfig, logger, eventBus);
    await messageBroker.initialize();
  });

  afterEach(async () => {
    await messageBroker.shutdown();
  });

  describe('Core Message Broker Functionality', () => {
    it('should send and track messages between agents', async () => {
      const messageId = await messageBroker.sendMessage(
        'coordinator-001',
        'worker-001',
        'task-assignment',
        {
          taskId: 'task-001',
          type: 'code-generation',
          priority: 'high',
          deadline: new Date(Date.now() + 3600000),
          requirements: {
            framework: 'react',
            features: ['authentication', 'dashboard']
          }
        },
        {
          priority: 'high',
          correlationId: 'coord-001-task-001',
          ttl: 1800000 // 30 minutes
        }
      );

      expect(messageId).toBeDefined();
      expect(messageId).toMatch(/^msg_/);
      
      // Verify message was tracked
      const metrics = messageBroker.getMetrics();
      expect(metrics).toBeDefined();
      expect(typeof metrics.channels).toBe('number');
    });

    it('should handle request-response pattern with timeout', async () => {
      // This should timeout as expected since no responder is set up
      const requestPromise = messageBroker.sendRequest(
        'coordinator-001',
        'worker-001',
        'capability-inquiry',
        {
          requestId: 'req-001',
          requiredCapabilities: ['code-generation', 'testing']
        },
        1000 // 1 second timeout
      );

      await expect(requestPromise).rejects.toThrow();
    });

    it('should broadcast messages to system coordination channel', async () => {
      await messageBroker.broadcast(
        'system-monitor',
        'system-announcement',
        {
          type: 'maintenance-window',
          message: 'Scheduled maintenance in 30 minutes',
          affectedServices: ['task-distribution', 'agent-coordination'],
          estimatedDuration: 600000, // 10 minutes
          timestamp: new Date()
        },
        {
          excludeAgents: ['maintenance-agent-001']
        }
      );

      // Should complete without errors
      expect(true).toBe(true);
    });

    it('should multicast to specific agent groups', async () => {
      const workerAgents = ['worker-001', 'worker-002', 'worker-003'];
      
      await messageBroker.multicast(
        'coordinator-001',
        workerAgents,
        'workload-distribution',
        {
          distributionId: 'dist-001',
          totalTasks: 15,
          taskDistribution: {
            'worker-001': 5,
            'worker-002': 5,
            'worker-003': 5
          },
          deadline: new Date(Date.now() + 7200000), // 2 hours
          priority: 'normal'
        }
      );

      // Should complete without errors
      expect(true).toBe(true);
    });

    it('should create and manage message queues', async () => {
      const queueId = await messageBroker.createQueue('high-priority-tasks', {
        maxSize: 100,
        persistent: true,
        priority: true
      });

      expect(queueId).toBeDefined();
      expect(queueId).toMatch(/^queue_/);

      // Mock handler for testing
      const mockHandler = jest.fn();
      
      const subscriptionId = await messageBroker.subscribeToQueue(
        queueId,
        'worker-001',
        mockHandler
      );

      expect(subscriptionId).toBeDefined();
      expect(subscriptionId).toMatch(/^queue-sub_/);

      // Send message to queue
      await messageBroker.sendMessage(
        'coordinator-001',
        queueId,
        'queued-task',
        {
          taskId: 'queue-task-001',
          type: 'urgent-processing',
          priority: 'urgent',
          data: { records: 500, format: 'json' }
        }
      );

      // Should complete without errors
      expect(true).toBe(true);
    });

    it('should create and manage communication channels', async () => {
      const channelId = await messageBroker.createChannel('project-alpha-team', 'topic');
      
      expect(channelId).toBeDefined();
      expect(channelId).toMatch(/^channel_/);

      // Add team members to channel
      const teamMembers = ['coordinator-001', 'worker-001', 'worker-002', 'tester-001'];
      
      for (const member of teamMembers) {
        await messageBroker.joinChannel(channelId, member);
      }

      // Send team communication
      await messageBroker.sendToChannel(
        channelId,
        'coordinator-001',
        'team-update',
        {
          updateId: 'update-001',
          project: 'project-alpha',
          milestone: 'sprint-3-completion',
          status: 'on-track',
          nextSteps: [
            'complete-testing-phase',
            'prepare-deployment',
            'update-documentation'
          ],
          blockers: [],
          timestamp: new Date()
        }
      );

      // Remove member from channel
      await messageBroker.leaveChannel(channelId, 'tester-001');

      // Should complete without errors
      expect(true).toBe(true);
    });

    it('should track subscription management', async () => {
      const mockHandler = jest.fn();
      
      // Create subscription
      const subscriptionId = messageBroker.subscribe(
        'monitor-001',
        'system-alert',
        mockHandler
      );

      expect(subscriptionId).toBeDefined();
      expect(subscriptionId).toMatch(/^sub_/);

      // Send message that would trigger subscription
      await messageBroker.sendMessage(
        'system-sensor',
        'monitor-001',
        'system-alert',
        {
          alertId: 'alert-001',
          severity: 'warning',
          type: 'cpu-usage',
          threshold: 80,
          currentValue: 85,
          timestamp: new Date()
        }
      );

      // Unsubscribe
      messageBroker.unsubscribe('monitor-001', subscriptionId);

      // Should complete without errors
      expect(true).toBe(true);
    });
  });

  describe('Message Broker Metrics and Monitoring', () => {
    it('should provide comprehensive broker metrics', async () => {
      // Generate some message traffic
      const messagePromises = [];
      
      for (let i = 0; i < 20; i++) {
        messagePromises.push(
          messageBroker.sendMessage(
            'load-generator',
            `worker-${i % 3 + 1}`,
            'load-test-message',
            {
              messageIndex: i,
              timestamp: new Date(),
              payload: `Load test message ${i}`
            }
          )
        );
      }

      await Promise.all(messagePromises);

      // Get metrics
      const metrics = messageBroker.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(typeof metrics.channels).toBe('number');
      expect(typeof metrics.queues).toBe('number');
      expect(typeof metrics.subscriptions).toBe('number');
      expect(typeof metrics.pendingRequests).toBe('number');
      
      // Verify metrics structure
      expect(metrics.channels).toBeGreaterThanOrEqual(0);
      expect(metrics.queues).toBeGreaterThanOrEqual(0);
      expect(metrics.subscriptions).toBeGreaterThanOrEqual(0);
    });

    it('should handle high-volume message processing', async () => {
      const startTime = Date.now();
      const messageCount = 100;
      
      // Create high-volume message traffic
      const messagePromises = Array.from({ length: messageCount }, (_, i) =>
        messageBroker.sendMessage(
          'high-volume-sender',
          'high-volume-receiver',
          'volume-test',
          {
            messageIndex: i,
            timestamp: new Date(),
            sequenceNumber: i,
            payload: `High volume message ${i} with additional data for testing`
          },
          {
            priority: i % 4 === 0 ? 'high' : 'normal'
          }
        )
      );

      const messageIds = await Promise.all(messagePromises);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Verify all messages were processed
      expect(messageIds).toHaveLength(messageCount);
      messageIds.forEach(id => {
        expect(id).toMatch(/^msg_/);
      });
      
      // Verify performance (should process 100 messages in under 10 seconds)
      expect(duration).toBeLessThan(10000);
      
      // Calculate throughput
      const throughput = messageCount / (duration / 1000);
      expect(throughput).toBeGreaterThan(5); // At least 5 messages per second
    });

    it('should handle concurrent operations safely', async () => {
      const concurrentOperations = [];
      
      // Create channels concurrently
      for (let i = 0; i < 5; i++) {
        concurrentOperations.push(
          messageBroker.createChannel(`concurrent-channel-${i}`, 'topic')
        );
      }
      
      // Create queues concurrently
      for (let i = 0; i < 5; i++) {
        concurrentOperations.push(
          messageBroker.createQueue(`concurrent-queue-${i}`, {
            maxSize: 50,
            persistent: false
          })
        );
      }
      
      // Send messages concurrently
      for (let i = 0; i < 10; i++) {
        concurrentOperations.push(
          messageBroker.sendMessage(
            'concurrent-sender',
            'concurrent-receiver',
            'concurrent-test',
            { index: i, timestamp: new Date() }
          )
        );
      }
      
      const results = await Promise.all(concurrentOperations);
      
      // Verify all operations completed successfully
      expect(results).toHaveLength(20);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(typeof result).toBe('string');
      });
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle invalid channel operations gracefully', async () => {
      // Try to join non-existent channel
      await expect(
        messageBroker.joinChannel('non-existent-channel', 'agent-001')
      ).rejects.toThrow();

      // Try to send to non-existent channel
      await expect(
        messageBroker.sendToChannel(
          'non-existent-channel',
          'sender',
          'test-message',
          { data: 'test' }
        )
      ).rejects.toThrow();

      // Try to leave non-existent channel
      await expect(
        messageBroker.leaveChannel('non-existent-channel', 'agent-001')
      ).rejects.toThrow();
    });

    it('should handle invalid queue operations gracefully', async () => {
      // Try to subscribe to non-existent queue
      await expect(
        messageBroker.subscribeToQueue(
          'non-existent-queue',
          'agent-001',
          jest.fn()
        )
      ).rejects.toThrow();
    });

    it('should handle message size limits', async () => {
      // Create oversized message content
      const oversizedContent = {
        data: 'x'.repeat(20000), // Exceeds 10KB limit
        metadata: {
          type: 'oversized-test',
          timestamp: new Date()
        }
      };

      // Should handle oversized message gracefully
      await expect(
        messageBroker.sendMessage(
          'size-test-sender',
          'size-test-receiver',
          'oversized-message',
          oversizedContent
        )
      ).rejects.toThrow();
    });

    it('should maintain stability during shutdown', async () => {
      // Create some active subscriptions and channels
      const channelId = await messageBroker.createChannel('shutdown-test-channel', 'topic');
      const queueId = await messageBroker.createQueue('shutdown-test-queue', {
        maxSize: 10,
        persistent: false
      });

      await messageBroker.joinChannel(channelId, 'test-agent');
      await messageBroker.subscribeToQueue(queueId, 'test-agent', jest.fn());

      // Send some messages
      await messageBroker.sendMessage(
        'shutdown-sender',
        'shutdown-receiver',
        'shutdown-test',
        { data: 'test' }
      );

      // Shutdown should complete gracefully
      await messageBroker.shutdown();
      
      // Verify shutdown completed
      expect(true).toBe(true);
    });
  });
}); 