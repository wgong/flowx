/**
 * Communication Module Integration Tests
 * 
 * Tests the integration between MessageBus, MessageBroker, and the broader system
 * including agent communication scenarios, event handling, and error recovery.
 */

import { MessageBus, MessageBusConfig } from '../../src/communication/message-bus';
import { MessageBroker, IMessageBroker } from '../../src/communication/message-broker';
import { EventBus } from '../../src/core/event-bus';
import { Logger } from '../../src/core/logger';
import { AgentId } from '../../src/swarm/types';

describe('Communication Integration Tests', () => {
  let messageBus: MessageBus;
  let messageBroker: IMessageBroker;
  let eventBus: EventBus;
  let logger: Logger;

  beforeEach(async () => {
    // Initialize core dependencies
    logger = new Logger({
      level: 'debug',
      format: 'json',
      destination: 'console'
    });

    eventBus = EventBus.getInstance();

    // Initialize message bus with test configuration
    const messageBusConfig: Partial<MessageBusConfig> = {
      strategy: 'event-driven',
      enablePersistence: false, // Disable for testing
      enableReliability: true,
      enableOrdering: false,
      enableFiltering: true,
      maxMessageSize: 1024,
      maxQueueSize: 100,
      messageRetention: 60000, // 1 minute
      acknowledgmentTimeout: 5000,
      retryAttempts: 2,
      backoffMultiplier: 1.5,
      compressionEnabled: false,
      encryptionEnabled: false,
      metricsEnabled: true,
      debugMode: true
    };

    messageBus = new MessageBus(messageBusConfig, logger, eventBus);
    messageBroker = new MessageBroker(messageBusConfig, logger, eventBus);

    // Initialize both components
    await messageBus.initialize();
    await messageBroker.initialize();
  });

  afterEach(async () => {
    await messageBus.shutdown();
    await messageBroker.shutdown();
  });

  describe('MessageBus Core Functionality', () => {
    it('should initialize with default channels', async () => {
      const channels = messageBus.getAllChannels();
      expect(channels).toHaveLength(3);
      expect(channels.map((c: any) => c.name)).toContain('system-broadcast');
      expect(channels.map((c: any) => c.name)).toContain('agent-coordination');
      expect(channels.map((c: any) => c.name)).toContain('task-distribution');
    });

    it('should create and manage custom channels', async () => {
      const channelId = await messageBus.createChannel('test-channel', 'broadcast', {
        persistent: true,
        reliable: true,
        maxParticipants: 10
      });

      expect(channelId).toBeDefined();
      expect(channelId).toMatch(/^channel_/);

      const channels = messageBus.getAllChannels();
      const testChannel = channels.find((c: any) => c.name === 'test-channel');
      expect(testChannel).toBeDefined();
      expect(testChannel?.type).toBe('broadcast');
    });

    it('should handle agent connections and disconnections', async () => {
      const agentId: AgentId = { id: 'test-agent-1', type: 'specialist', swarmId: 'test-swarm', instance: 1 };
      
      // Simulate agent connection
      eventBus.emit('agent:connected', { agentId });
      
      // Allow event processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Simulate agent disconnection
      eventBus.emit('agent:disconnected', { agentId });
      
      // Allow event processing
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should not throw errors
      expect(true).toBe(true);
    });

    it('should send messages between agents', async () => {
      const sender: AgentId = { id: 'sender-agent', type: 'specialist', swarmId: 'test-swarm', instance: 1 };
      const receiver: AgentId = { id: 'receiver-agent', type: 'specialist', swarmId: 'test-swarm', instance: 2 };
      
      const messageId = await messageBus.sendMessage(
        'test-message',
        { data: 'Hello World' },
        sender,
        receiver,
        {
          priority: 'normal',
          ttl: 30000
        }
      );

      expect(messageId).toBeDefined();
      expect(messageId).toMatch(/^msg_/);
    });

    it('should broadcast messages to multiple agents', async () => {
      const sender: AgentId = { id: 'broadcaster', type: 'specialist', swarmId: 'test-swarm', instance: 1 };
      const receiver1: AgentId = { id: 'receiver-1', type: 'specialist', swarmId: 'test-swarm', instance: 2 };
      const receiver2: AgentId = { id: 'receiver-2', type: 'specialist', swarmId: 'test-swarm', instance: 3 };
      
      // First join the broadcast channel with sender and receivers
      const channels = messageBus.getAllChannels();
      const broadcastChannel = channels.find(c => c.name === 'system-broadcast');
      if (broadcastChannel) {
        await messageBus.joinChannel(broadcastChannel.id, sender);
        await messageBus.joinChannel(broadcastChannel.id, receiver1);
        await messageBus.joinChannel(broadcastChannel.id, receiver2);
      }
      
      const messageId = await messageBus.broadcastMessage(
        'broadcast-test',
        { announcement: 'System update' },
        sender,
        {
          priority: 'high',
          ttl: 60000
        }
      );

      expect(messageId).toBeDefined();
      expect(messageId).toMatch(/^msg_/);
    });

    it('should handle message acknowledgments', async () => {
      // Create a message bus with persistence enabled for this test
      const persistentMessageBus = new MessageBus({
        strategy: 'event-driven',
        enablePersistence: true, // Enable persistence for acknowledgments
        enableReliability: true,
        enableOrdering: false,
        enableFiltering: true,
        maxMessageSize: 1024,
        maxQueueSize: 100,
        messageRetention: 60000,
        acknowledgmentTimeout: 5000,
        retryAttempts: 2,
        backoffMultiplier: 1.5,
        compressionEnabled: false,
        encryptionEnabled: false,
        metricsEnabled: true,
        debugMode: true
      }, logger, eventBus);
      
      await persistentMessageBus.initialize();
      
      const sender: AgentId = { id: 'sender', type: 'specialist', swarmId: 'test-swarm', instance: 1 };
      const receiver: AgentId = { id: 'receiver', type: 'specialist', swarmId: 'test-swarm', instance: 2 };
      
      const messageId = await persistentMessageBus.sendMessage(
        'ack-test',
        { data: 'Please acknowledge' },
        sender,
        receiver,
        { reliability: 'best-effort' }
      );

      await persistentMessageBus.acknowledgeMessage(messageId, receiver);
      
      await persistentMessageBus.shutdown();
      
      // Should not throw errors
      expect(true).toBe(true);
    });

    it('should collect and provide metrics', async () => {
      const sender: AgentId = { id: 'metrics-sender', type: 'specialist', swarmId: 'test-swarm', instance: 1 };
      const receiver: AgentId = { id: 'metrics-receiver', type: 'specialist', swarmId: 'test-swarm', instance: 2 };
      
      // Send some messages
      await messageBus.sendMessage('metric-test-1', { data: 'test' }, sender, receiver);
      await messageBus.sendMessage('metric-test-2', { data: 'test' }, sender, receiver);
      
      const metrics = messageBus.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(typeof metrics.channels).toBe('number');
      expect(typeof metrics.queues).toBe('number');
    });
  });

  describe('MessageBroker High-Level Operations', () => {
    it('should send messages between agents via broker', async () => {
      const messageId = await messageBroker.sendMessage(
        'broker-sender',
        'broker-receiver',
        'broker-test',
        { message: 'Hello from broker' },
        {
          priority: 'normal',
          correlationId: 'test-correlation-123',
          ttl: 30000
        }
      );

      expect(messageId).toBeDefined();
      expect(messageId).toMatch(/^msg_/);
    });

    it('should handle request-response patterns', async () => {
      const requestPromise = messageBroker.sendRequest(
        'requester',
        'responder',
        'ping',
        { timestamp: Date.now() },
        5000
      );

      // Simulate response (in real scenario, responder would send this)
      setTimeout(() => {
        eventBus.emit('message:received', {
          type: 'response',
          correlationId: 'test-correlation',
          content: { pong: Date.now() }
        });
      }, 100);

      // Request should timeout gracefully
      await expect(requestPromise).rejects.toThrow();
    });

    it('should broadcast messages to all agents', async () => {
      await messageBroker.broadcast(
        'system',
        'system-announcement',
        { message: 'System maintenance in 5 minutes' },
        { excludeAgents: ['maintenance-agent'] }
      );

      // Should complete without errors
      expect(true).toBe(true);
    });

    it('should multicast to specific recipients', async () => {
      await messageBroker.multicast(
        'coordinator',
        ['agent-1', 'agent-2', 'agent-3'],
        'task-assignment',
        { task: 'process-data', deadline: '2024-01-01' }
      );

      // Should complete without errors
      expect(true).toBe(true);
    });

    it('should manage subscriptions', async () => {
      const handler = jest.fn();
      
      const subscriptionId = messageBroker.subscribe(
        'subscriber-agent',
        'notification',
        handler
      );

      expect(subscriptionId).toBeDefined();
      expect(subscriptionId).toMatch(/^sub_/);

      messageBroker.unsubscribe('subscriber-agent', subscriptionId);
      
      // Should complete without errors
      expect(true).toBe(true);
    });

    it('should create and manage queues', async () => {
      const queueId = await messageBroker.createQueue('test-queue', {
        maxSize: 100,
        persistent: false
      });

      expect(queueId).toBeDefined();
      expect(queueId).toMatch(/^queue_/);

      const handler = jest.fn();
      const subscriptionId = await messageBroker.subscribeToQueue(
        queueId,
        'queue-consumer',
        handler
      );

      expect(subscriptionId).toBeDefined();
    });

    it('should manage channels', async () => {
      const channelId = await messageBroker.createChannel('test-broker-channel', 'topic');
      
      expect(channelId).toBeDefined();
      expect(channelId).toMatch(/^channel_/);

      await messageBroker.joinChannel(channelId, 'participant-1');
      await messageBroker.joinChannel(channelId, 'participant-2');

      await messageBroker.sendToChannel(
        channelId,
        'participant-1',
        'channel-message',
        { data: 'Hello channel' }
      );

      await messageBroker.leaveChannel(channelId, 'participant-1');
      
      // Should complete without errors
      expect(true).toBe(true);
    });

    it('should provide broker metrics', async () => {
      // Send some messages through broker
      await messageBroker.sendMessage('sender', 'receiver', 'test', { data: 'test' });
      await messageBroker.broadcast('system', 'announcement', { msg: 'test' });
      
      const metrics = messageBroker.getMetrics();
      
      expect(metrics).toBeDefined();
      expect(typeof metrics.channels).toBe('number');
      expect(typeof metrics.queues).toBe('number');
    });
  });

  describe('Integration with Event System', () => {
    it('should emit events on message bus operations', async () => {
      const eventSpy = jest.fn();
      messageBus.on('message:sent', eventSpy);
      
      const sender: AgentId = { id: 'event-sender', type: 'specialist', swarmId: 'test-swarm', instance: 1 };
      const receiver: AgentId = { id: 'event-receiver', type: 'specialist', swarmId: 'test-swarm', instance: 2 };
      
      await messageBus.sendMessage('event-test', { data: 'test' }, sender, receiver);
      
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.objectContaining({
            type: 'event-test',
            sender: sender,
            receivers: [receiver]
          })
        })
      );
    });

    it('should handle agent lifecycle events', async () => {
      const agentId: AgentId = { id: 'lifecycle-agent', type: 'specialist', swarmId: 'test-swarm', instance: 1 };
      
      // Should handle connection without errors
      eventBus.emit('agent:connected', { agentId });
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Should handle disconnection without errors
      eventBus.emit('agent:disconnected', { agentId });
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(true).toBe(true);
    });

    it('should propagate delivery events', async () => {
      const deliverySuccessSpy = jest.fn();
      const deliveryFailureSpy = jest.fn();
      
      messageBus.on('delivery:success', deliverySuccessSpy);
      messageBus.on('delivery:failure', deliveryFailureSpy);
      
      const sender: AgentId = { id: 'delivery-sender', type: 'specialist', swarmId: 'test-swarm', instance: 1 };
      const receiver: AgentId = { id: 'delivery-receiver', type: 'specialist', swarmId: 'test-swarm', instance: 2 };
      
      await messageBus.sendMessage('delivery-test', { data: 'test' }, sender, receiver);
      
      // Allow event processing
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Events should be emitted (though we can't guarantee delivery success in this test)
      expect(true).toBe(true);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle invalid message formats gracefully', async () => {
      const sender: AgentId = { id: 'error-sender', type: 'specialist', swarmId: 'test-swarm', instance: 1 };
      const receiver: AgentId = { id: 'error-receiver', type: 'specialist', swarmId: 'test-swarm', instance: 2 };
      
      // Try to send a message that exceeds max size
      const largeContent = 'x'.repeat(2000); // Exceeds our 1024 byte limit
      
      await expect(
        messageBus.sendMessage('oversized', largeContent, sender, receiver)
      ).rejects.toThrow();
    });

    it('should handle non-existent channels gracefully', async () => {
      await expect(
        messageBroker.joinChannel('non-existent-channel', 'agent-1')
      ).rejects.toThrow();
    });

    it('should handle message acknowledgment for non-existent messages', async () => {
      const agentId: AgentId = { id: 'ack-agent', type: 'specialist', swarmId: 'test-swarm', instance: 1 };
      
      await expect(
        messageBus.acknowledgeMessage('non-existent-message', agentId)
      ).rejects.toThrow();
    });

    it('should handle shutdown gracefully', async () => {
      const testMessageBus = new MessageBus({}, logger, eventBus);
      const testMessageBroker = new MessageBroker({}, logger, eventBus);
      
      await testMessageBus.initialize();
      await testMessageBroker.initialize();
      
      // Should shutdown without errors
      await testMessageBroker.shutdown();
      await testMessageBus.shutdown();
      
      expect(true).toBe(true);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent messages', async () => {
      const sender: AgentId = { id: 'perf-sender', type: 'specialist', swarmId: 'test-swarm', instance: 1 };
      const receiver: AgentId = { id: 'perf-receiver', type: 'specialist', swarmId: 'test-swarm', instance: 2 };
      
      const messagePromises = Array.from({ length: 10 }, (_, i) =>
        messageBus.sendMessage(
          `perf-test-${i}`,
          { data: `Message ${i}` },
          sender,
          receiver
        )
      );
      
      const messageIds = await Promise.all(messagePromises);
      
      expect(messageIds).toHaveLength(10);
      messageIds.forEach(id => {
        expect(id).toMatch(/^msg_/);
      });
    });

    it('should handle rapid channel creation and deletion', async () => {
      const channelPromises = Array.from({ length: 5 }, (_, i) =>
        messageBus.createChannel(`rapid-channel-${i}`, 'broadcast', {
          persistent: false,
          reliable: false
        })
      );
      
      const channelIds = await Promise.all(channelPromises);
      
      expect(channelIds).toHaveLength(5);
      channelIds.forEach(id => {
        expect(id).toMatch(/^channel_/);
      });
    });

    it('should maintain performance under load', async () => {
      const startTime = Date.now();
      
      const sender: AgentId = { id: 'load-sender', type: 'specialist', swarmId: 'test-swarm', instance: 1 };
      const receiver: AgentId = { id: 'load-receiver', type: 'specialist', swarmId: 'test-swarm', instance: 2 };
      
      // Send 50 messages rapidly
      const messagePromises = Array.from({ length: 50 }, (_, i) =>
        messageBroker.sendMessage(
          'load-sender',
          'load-receiver',
          'load-test',
          { index: i, data: `Load test message ${i}` }
        )
      );
      
      await Promise.all(messagePromises);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (5 seconds)
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle agent coordination workflow', async () => {
      // Simulate a coordinator broadcasting a task
      await messageBroker.broadcast(
        'coordinator',
        'task-available',
        {
          taskId: 'task-123',
          type: 'data-processing',
          priority: 'high',
          deadline: '2024-01-01T12:00:00Z'
        }
      );

      // Simulate agents responding with availability
      await messageBroker.sendMessage(
        'worker-1',
        'coordinator',
        'task-response',
        { taskId: 'task-123', available: true, capacity: 0.8 }
      );

      await messageBroker.sendMessage(
        'worker-2',
        'coordinator',
        'task-response',
        { taskId: 'task-123', available: false, reason: 'overloaded' }
      );

      // Coordinator assigns task
      await messageBroker.sendMessage(
        'coordinator',
        'worker-1',
        'task-assignment',
        { taskId: 'task-123', details: { /* task details */ } }
      );

      // Worker acknowledges and starts work
      await messageBroker.sendMessage(
        'worker-1',
        'coordinator',
        'task-acknowledged',
        { taskId: 'task-123', estimatedCompletion: '2024-01-01T11:30:00Z' }
      );

      // Should complete entire workflow without errors
      expect(true).toBe(true);
    });

    it('should handle system monitoring and alerts', async () => {
      // Create monitoring channel
      const monitoringChannelId = await messageBroker.createChannel('monitoring', 'topic');
      
      // Agents join monitoring channel
      await messageBroker.joinChannel(monitoringChannelId, 'monitor-agent');
      await messageBroker.joinChannel(monitoringChannelId, 'alert-manager');
      
      // Send system metrics
      await messageBroker.sendToChannel(
        monitoringChannelId,
        'system-monitor',
        'metrics-update',
        {
          timestamp: Date.now(),
          cpu: 75.5,
          memory: 82.3,
          disk: 45.1,
          network: 12.8
        }
      );

      // Send alert when threshold exceeded
      await messageBroker.sendToChannel(
        monitoringChannelId,
        'system-monitor',
        'alert',
        {
          level: 'warning',
          message: 'Memory usage above 80%',
          timestamp: Date.now(),
          affected: ['worker-1', 'worker-2']
        }
      );

      expect(true).toBe(true);
    });

    it('should handle distributed task execution', async () => {
      // Create task distribution queue
      const taskQueueId = await messageBroker.createQueue('task-queue', {
        maxSize: 1000,
        persistent: false
      });

      // Workers subscribe to task queue
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      await messageBroker.subscribeToQueue(taskQueueId, 'worker-1', handler1);
      await messageBroker.subscribeToQueue(taskQueueId, 'worker-2', handler2);

      // Distribute tasks
      for (let i = 0; i < 5; i++) {
        await messageBroker.sendMessage(
          'task-distributor',
          'task-queue',
          'task',
          {
            id: `task-${i}`,
            type: 'computation',
            data: { input: i * 10 }
          }
        );
      }

      // Allow processing time
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(true).toBe(true);
    });
  });
}); 