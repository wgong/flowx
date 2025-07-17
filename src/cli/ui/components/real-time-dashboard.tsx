import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { getPersistenceManager, getSwarmCoordinator } from '../../core/global-initialization.js';
import { SwarmMonitor } from '../../../coordination/swarm-monitor.js';
import { TaskEngine } from '../../../task/engine.js';

interface DashboardMetrics {
  agents: AgentMetrics[];
  tasks: TaskMetrics[];
  system: SystemMetrics;
  swarm: SwarmMetrics;
  performance: PerformanceMetrics;
  alerts: Alert[];
}

interface AgentMetrics {
  id: string;
  name: string;
  type: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'stalled';
  currentTask?: string;
  cpuUsage: number;
  memoryUsage: number;
  tasksCompleted: number;
  tasksFailed: number;
  successRate: number;
  lastActivity: Date;
  health: number;
  performance: number;
}

interface TaskMetrics {
  id: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  progress: number;
  assignedAgent?: string;
  duration?: number;
  quality?: number;
  startTime?: Date;
  endTime?: Date;
}

interface SystemMetrics {
  uptime: number;
  cpuUsage: number;
  memoryUsage: number;
  memoryTotal: number;
  diskUsage: number;
  networkActivity: number;
  loadAverage: [number, number, number];
  activeConnections: number;
}

interface SwarmMetrics {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'degraded' | 'critical';
  agentCount: number;
  activeAgents: number;
  taskThroughput: number;
  messageThroughput: number;
  consensusSuccess: number;
  memoryHitRate: number;
  neuralAccuracy: number;
}

interface PerformanceMetrics {
  avgTaskCompletion: number;
  tasksPerMinute: number;
  errorRate: number;
  memoryEfficiency: number;
  networkLatency: number;
  responseTime: number;
  queueWaitTime: number;
  systemLoad: number;
}

interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: Date;
  source: string;
  resolved: boolean;
}

export interface RealTimeDashboardProps {
  onBack: () => void;
}

export const RealTimeDashboard: React.FC<RealTimeDashboardProps> = ({ onBack }) => {
  const { exit } = useApp();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    agents: [],
    tasks: [],
    system: {
      uptime: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      memoryTotal: 0,
      diskUsage: 0,
      networkActivity: 0,
      loadAverage: [0, 0, 0],
      activeConnections: 0
    },
    swarm: {
      id: '',
      name: '',
      status: 'idle',
      agentCount: 0,
      activeAgents: 0,
      taskThroughput: 0,
      messageThroughput: 0,
      consensusSuccess: 0,
      memoryHitRate: 0,
      neuralAccuracy: 0
    },
    performance: {
      avgTaskCompletion: 0,
      tasksPerMinute: 0,
      errorRate: 0,
      memoryEfficiency: 0,
      networkLatency: 0,
      responseTime: 0,
      queueWaitTime: 0,
      systemLoad: 0
    },
    alerts: []
  });

  const [selectedTab, setSelectedTab] = useState<'overview' | 'agents' | 'tasks' | 'system' | 'performance' | 'alerts'>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(2000); // 2 seconds
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  const swarmMonitor = useRef<SwarmMonitor | null>(null);
  const taskEngine = useRef<TaskEngine | null>(null);

  // Handle keyboard input
  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onBack();
      return;
    }

    switch (input) {
      case '1':
        setSelectedTab('overview');
        break;
      case '2':
        setSelectedTab('agents');
        break;
      case '3':
        setSelectedTab('tasks');
        break;
      case '4':
        setSelectedTab('system');
        break;
      case '5':
        setSelectedTab('performance');
        break;
      case '6':
        setSelectedTab('alerts');
        break;
      case 'r':
        loadMetrics();
        break;
      case 'p':
        setAutoRefresh(!autoRefresh);
        break;
      case '+':
        setRefreshInterval(Math.min(10000, refreshInterval + 1000));
        break;
      case '-':
        setRefreshInterval(Math.max(1000, refreshInterval - 1000));
        break;
    }
  });

  // Initialize monitoring systems
  useEffect(() => {
    const initializeMonitoring = async () => {
      try {
        // Initialize SwarmMonitor
        swarmMonitor.current = new SwarmMonitor({
          updateInterval: 1000,
          enableAlerts: true,
          enableHistory: true
        });

                          // Initialize TaskEngine
         taskEngine.current = new TaskEngine(10); // maxConcurrent = 10

         // Set up event listeners
         swarmMonitor.current.on('metrics:updated', (data) => {
           updateMetricsFromMonitor(data);
         });

         swarmMonitor.current.on('alert:created', (alert) => {
           addAlert(alert);
         });

         await swarmMonitor.current.start();
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize monitoring');
        setIsLoading(false);
      }
    };

    initializeMonitoring();

    return () => {
      if (swarmMonitor.current) {
        swarmMonitor.current.stop();
      }
    };
  }, []);

  // Auto-refresh data
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadMetrics();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Initial load
  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const [agentMetrics, taskMetrics, systemMetrics] = await Promise.all([
        loadAgentMetrics(),
        loadTaskMetrics(),
        loadSystemMetrics()
      ]);

      const swarmMetrics = await loadSwarmMetrics();
      const performanceMetrics = calculatePerformanceMetrics(agentMetrics, taskMetrics, systemMetrics);

      setMetrics(prev => ({
        ...prev,
        agents: agentMetrics,
        tasks: taskMetrics,
        system: systemMetrics,
        swarm: swarmMetrics,
        performance: performanceMetrics
      }));

      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    }
  };

  const loadAgentMetrics = async (): Promise<AgentMetrics[]> => {
    try {
      const persistenceManager = await getPersistenceManager();
      const agents = await persistenceManager.getAllAgents();
      
      return agents.map(agent => ({
        id: agent.id,
        name: agent.name || `Agent-${agent.id.slice(-8)}`,
        type: agent.type || 'general',
        status: mapAgentStatus(agent.status),
        currentTask: agent.currentTask || undefined,
        cpuUsage: Math.random() * 50, // Mock data - would come from process monitoring
        memoryUsage: Math.random() * 100,
        tasksCompleted: agent.successCount || 0,
        tasksFailed: agent.errorCount || 0,
        successRate: agent.successCount ? (agent.successCount / (agent.successCount + agent.errorCount)) * 100 : 0,
        lastActivity: new Date(agent.lastActiveAt || agent.createdAt),
        health: agent.healthScore || 1.0,
        performance: agent.performanceRating || 1.0
      }));
    } catch (error) {
      return [];
    }
  };

  const loadTaskMetrics = async (): Promise<TaskMetrics[]> => {
    try {
      if (!taskEngine.current) return [];
      
      const taskList = await taskEngine.current.listTasks({ 
        status: ['pending', 'running', 'completed', 'failed']
      });
      
      return taskList.tasks.map(task => ({
        id: task.id,
        description: task.description,
        status: task.status as any,
        priority: task.priority as any,
        progress: (task as any).progress || 0,
        assignedAgent: task.assignedAgent,
        duration: task.completedAt && task.startedAt ? 
          new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime() : undefined,
        quality: (task as any).qualityScore,
        startTime: task.startedAt ? new Date(task.startedAt) : undefined,
        endTime: task.completedAt ? new Date(task.completedAt) : undefined
      }));
    } catch (error) {
      return [];
    }
  };

  const loadSystemMetrics = async (): Promise<SystemMetrics> => {
    const os = await import('node:os');
    const process = await import('node:process');
    
    return {
      uptime: process.uptime() * 1000,
      cpuUsage: Math.random() * 50, // Mock - would use actual CPU monitoring
      memoryUsage: (os.totalmem() - os.freemem()) / 1024 / 1024 / 1024,
      memoryTotal: os.totalmem() / 1024 / 1024 / 1024,
      diskUsage: Math.random() * 30, // Mock - would use actual disk monitoring
      networkActivity: Math.random() * 1000,
      loadAverage: os.loadavg() as [number, number, number],
      activeConnections: Math.floor(Math.random() * 50)
    };
  };

  const loadSwarmMetrics = async (): Promise<SwarmMetrics> => {
    try {
      const coordinator = await getSwarmCoordinator();
      const analytics = await (coordinator as any).getAnalytics();
      
      return {
        id: analytics.swarmId || 'default',
        name: analytics.swarmName || 'Default Swarm',
        status: determineSwarmStatus(analytics),
        agentCount: analytics.agentCount || 0,
        activeAgents: analytics.activeAgents || 0,
        taskThroughput: analytics.taskThroughput || 0,
        messageThroughput: analytics.messageThroughput || 0,
        consensusSuccess: analytics.consensusSuccess || 0,
        memoryHitRate: analytics.memoryHitRate || 0,
        neuralAccuracy: analytics.neuralAccuracy || 0
      };
    } catch (error) {
      return {
        id: 'unknown',
        name: 'Unknown Swarm',
        status: 'idle',
        agentCount: 0,
        activeAgents: 0,
        taskThroughput: 0,
        messageThroughput: 0,
        consensusSuccess: 0,
        memoryHitRate: 0,
        neuralAccuracy: 0
      };
    }
  };

  const calculatePerformanceMetrics = (
    agents: AgentMetrics[],
    tasks: TaskMetrics[],
    system: SystemMetrics
  ): PerformanceMetrics => {
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const avgCompletion = completedTasks.length > 0 
      ? completedTasks.reduce((sum, t) => sum + (t.duration || 0), 0) / completedTasks.length
      : 0;
    
    const totalTasks = tasks.length;
    const failedTasks = tasks.filter(t => t.status === 'failed').length;
    const errorRate = totalTasks > 0 ? (failedTasks / totalTasks) * 100 : 0;
    
    return {
      avgTaskCompletion: avgCompletion,
      tasksPerMinute: calculateTasksPerMinute(tasks),
      errorRate,
      memoryEfficiency: system.memoryUsage > 0 ? (1 - system.memoryUsage / system.memoryTotal) * 100 : 100,
      networkLatency: Math.random() * 50, // Mock
      responseTime: Math.random() * 100,
      queueWaitTime: Math.random() * 1000,
      systemLoad: system.loadAverage[0]
    };
  };

  const calculateTasksPerMinute = (tasks: TaskMetrics[]): number => {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const recentTasks = tasks.filter(t => 
      t.endTime && t.endTime > oneMinuteAgo && t.status === 'completed'
    );
    return recentTasks.length;
  };

  const mapAgentStatus = (status: string): AgentMetrics['status'] => {
    switch (status) {
      case 'active': return 'running';
      case 'busy': return 'running';
      case 'error': return 'failed';
      case 'offline': return 'stalled';
      default: return 'idle';
    }
  };

  const determineSwarmStatus = (analytics: any): SwarmMetrics['status'] => {
    if (!analytics.agentCount) return 'idle';
    if (analytics.errorRate > 20) return 'critical';
    if (analytics.errorRate > 10) return 'degraded';
    return 'active';
  };

  const updateMetricsFromMonitor = (data: any) => {
    // Update metrics from SwarmMonitor events
    setMetrics(prev => ({
      ...prev,
      ...data
    }));
  };

  const addAlert = (alert: any) => {
    setMetrics(prev => ({
      ...prev,
      alerts: [
        {
          id: Math.random().toString(36),
          type: alert.type,
          message: alert.message,
          timestamp: new Date(),
          source: alert.source || 'system',
          resolved: false
        },
        ...prev.alerts.slice(0, 49) // Keep last 50 alerts
      ]
    }));
  };

  const formatUptime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'running': case 'active': return 'green';
      case 'idle': return 'yellow';
      case 'failed': case 'error': case 'critical': return 'red';
      case 'stalled': case 'degraded': return 'magenta';
      default: return 'white';
    }
  };

  const renderHeader = () => (
    <Box flexDirection="column" marginBottom={1}>
      <Box justifyContent="space-between">
        <Text bold color="cyan">🚀 FlowX Real-Time Monitoring Dashboard</Text>
        <Text color="gray">
          Last Update: {lastUpdate.toLocaleTimeString()} 
          {autoRefresh && ` (Auto: ${refreshInterval/1000}s)`}
        </Text>
      </Box>
      
      <Box marginTop={1}>
        <Text color="gray">
          Press: 1=Overview 2=Agents 3=Tasks 4=System 5=Performance 6=Alerts | 
          R=Refresh P=Pause +/-=Interval Q=Quit
        </Text>
      </Box>
      
      {error && (
        <Box marginTop={1}>
          <Text color="red">⚠️  Error: {error}</Text>
        </Box>
      )}
    </Box>
  );

  const renderTabBar = () => (
    <Box marginBottom={1}>
      {[
        { key: 'overview', label: '📊 Overview', tab: 'overview' },
        { key: 'agents', label: '🤖 Agents', tab: 'agents' },
        { key: 'tasks', label: '📋 Tasks', tab: 'tasks' },
        { key: 'system', label: '💻 System', tab: 'system' },
        { key: 'performance', label: '⚡ Performance', tab: 'performance' },
        { key: 'alerts', label: '🚨 Alerts', tab: 'alerts' }
      ].map(({ key, label, tab }) => (
        <Text 
          key={key}
          color={selectedTab === tab ? 'cyan' : 'gray'}
          backgroundColor={selectedTab === tab ? 'blue' : undefined}

        >
          {selectedTab === tab ? `[${label}]` : ` ${label} `}
        </Text>
      ))}
    </Box>
  );

  const renderOverview = () => (
    <Box flexDirection="column">
      <Box justifyContent="space-between" marginBottom={1}>
        <Box flexDirection="column" width="50%">
          <Text bold color="cyan">🐝 Swarm Status</Text>
          <Text>Name: <Text color="white">{metrics.swarm.name}</Text></Text>
          <Text>Status: <Text color={getStatusColor(metrics.swarm.status)}>{metrics.swarm.status.toUpperCase()}</Text></Text>
          <Text>Agents: <Text color="green">{metrics.swarm.activeAgents}</Text>/<Text color="white">{metrics.swarm.agentCount}</Text></Text>
          <Text>Throughput: <Text color="yellow">{metrics.swarm.taskThroughput.toFixed(1)} tasks/min</Text></Text>
        </Box>
        
        <Box flexDirection="column" width="50%">
          <Text bold color="cyan">📈 Performance</Text>
          <Text>Avg Task Time: <Text color="white">{(metrics.performance.avgTaskCompletion / 1000).toFixed(1)}s</Text></Text>
          <Text>Error Rate: <Text color={metrics.performance.errorRate > 10 ? 'red' : 'green'}>{metrics.performance.errorRate.toFixed(1)}%</Text></Text>
          <Text>Memory Efficiency: <Text color="green">{metrics.performance.memoryEfficiency.toFixed(1)}%</Text></Text>
          <Text>System Load: <Text color={metrics.performance.systemLoad > 2 ? 'red' : 'green'}>{metrics.performance.systemLoad.toFixed(2)}</Text></Text>
        </Box>
      </Box>
      
      <Box justifyContent="space-between" marginBottom={1}>
        <Box flexDirection="column" width="50%">
          <Text bold color="cyan">🎯 Task Summary</Text>
          <Text>Total Tasks: <Text color="white">{metrics.tasks.length}</Text></Text>
          <Text>Running: <Text color="yellow">{metrics.tasks.filter(t => t.status === 'running').length}</Text></Text>
          <Text>Completed: <Text color="green">{metrics.tasks.filter(t => t.status === 'completed').length}</Text></Text>
          <Text>Failed: <Text color="red">{metrics.tasks.filter(t => t.status === 'failed').length}</Text></Text>
        </Box>
        
        <Box flexDirection="column" width="50%">
          <Text bold color="cyan">🖥️  System Resources</Text>
          <Text>Uptime: <Text color="white">{formatUptime(metrics.system.uptime)}</Text></Text>
          <Text>CPU: <Text color={metrics.system.cpuUsage > 80 ? 'red' : 'green'}>{metrics.system.cpuUsage.toFixed(1)}%</Text></Text>
          <Text>Memory: <Text color={metrics.system.memoryUsage > metrics.system.memoryTotal * 0.8 ? 'red' : 'green'}>{formatBytes(metrics.system.memoryUsage * 1024 * 1024 * 1024)}</Text></Text>
          <Text>Connections: <Text color="white">{metrics.system.activeConnections}</Text></Text>
        </Box>
      </Box>
      
      {metrics.alerts.filter(a => !a.resolved).length > 0 && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="red">🚨 Active Alerts ({metrics.alerts.filter(a => !a.resolved).length})</Text>
          {metrics.alerts.filter(a => !a.resolved).slice(0, 3).map(alert => (
            <Text key={alert.id} color={alert.type === 'critical' ? 'red' : alert.type === 'warning' ? 'yellow' : 'gray'}>
              [{alert.type.toUpperCase()}] {alert.message}
            </Text>
          ))}
        </Box>
      )}
    </Box>
  );

  const renderAgents = () => (
    <Box flexDirection="column">
      <Text bold color="cyan">🤖 Agent Status ({metrics.agents.length} total)</Text>
      
      {metrics.agents.slice(0, 10).map(agent => (
        <Box key={agent.id} justifyContent="space-between" marginBottom={1}>
          <Box width="40%">
            <Text>{agent.name} </Text>
            <Text color="gray">({agent.type})</Text>
          </Box>
          <Box width="15%">
            <Text color={getStatusColor(agent.status)}>{agent.status.toUpperCase()}</Text>
          </Box>
          <Box width="25%">
            <Text color="white">
              {agent.currentTask ? agent.currentTask.slice(0, 20) + '...' : 'No task'}
            </Text>
          </Box>
          <Box width="20%">
            <Text color="green">{agent.tasksCompleted}</Text>
            <Text color="gray">/</Text>
            <Text color="red">{agent.tasksFailed}</Text>
            <Text color="gray"> (</Text>
            <Text color={agent.successRate > 90 ? 'green' : agent.successRate > 70 ? 'yellow' : 'red'}>
              {agent.successRate.toFixed(0)}%
            </Text>
            <Text color="gray">)</Text>
          </Box>
        </Box>
      ))}
      
      {metrics.agents.length > 10 && (
        <Text color="gray">... and {metrics.agents.length - 10} more agents</Text>
      )}
    </Box>
  );

  const renderTasks = () => (
    <Box flexDirection="column">
      <Text bold color="cyan">📋 Task Status ({metrics.tasks.length} total)</Text>
      
      {metrics.tasks.slice(0, 10).map(task => (
        <Box key={task.id} justifyContent="space-between">
          <Box width="40%">
            <Text>{task.description.slice(0, 30)}...</Text>
          </Box>
          <Box width="15%">
            <Text color={getStatusColor(task.status)}>{task.status.toUpperCase()}</Text>
          </Box>
          <Box width="15%">
            <Text color={task.priority === 'critical' ? 'red' : task.priority === 'high' ? 'yellow' : 'white'}>
              {task.priority.toUpperCase()}
            </Text>
          </Box>
          <Box width="15%">
            <Text color="white">{task.progress}%</Text>
          </Box>
          <Box width="15%">
            <Text color="gray">
              {task.assignedAgent ? task.assignedAgent.slice(-8) : 'Unassigned'}
            </Text>
          </Box>
        </Box>
      ))}
      
      {metrics.tasks.length > 10 && (
        <Text color="gray">... and {metrics.tasks.length - 10} more tasks</Text>
      )}
    </Box>
  );

  const renderSystem = () => (
    <Box flexDirection="column">
      <Text bold color="cyan">💻 System Metrics</Text>
      
      <Box justifyContent="space-between">
        <Box flexDirection="column" width="50%">
          <Text bold color="white">Resource Usage</Text>
          <Text>CPU Usage: <Text color={metrics.system.cpuUsage > 80 ? 'red' : 'green'}>{metrics.system.cpuUsage.toFixed(1)}%</Text></Text>
          <Text>Memory: <Text color="white">{formatBytes(metrics.system.memoryUsage * 1024 * 1024 * 1024)}</Text> / <Text color="gray">{formatBytes(metrics.system.memoryTotal * 1024 * 1024 * 1024)}</Text></Text>
          <Text>Disk Usage: <Text color={metrics.system.diskUsage > 80 ? 'red' : 'green'}>{metrics.system.diskUsage.toFixed(1)}%</Text></Text>
          <Text>Network: <Text color="white">{formatBytes(metrics.system.networkActivity)}/s</Text></Text>
        </Box>
        
        <Box flexDirection="column" width="50%">
          <Text bold color="white">System Info</Text>
          <Text>Uptime: <Text color="white">{formatUptime(metrics.system.uptime)}</Text></Text>
          <Text>Load Avg: <Text color="white">{metrics.system.loadAverage.map(l => l.toFixed(2)).join(' ')}</Text></Text>
          <Text>Connections: <Text color="white">{metrics.system.activeConnections}</Text></Text>
        </Box>
      </Box>
    </Box>
  );

  const renderPerformance = () => (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">⚡ Performance Metrics</Text>
      </Box>
      
      <Box justifyContent="space-between" marginBottom={1}>
        <Box flexDirection="column" width="50%">
          <Text bold color="white">Task Performance</Text>
          <Text>Avg Completion: <Text color="white">{(metrics.performance.avgTaskCompletion / 1000).toFixed(1)}s</Text></Text>
          <Text>Tasks/Minute: <Text color="yellow">{metrics.performance.tasksPerMinute}</Text></Text>
          <Text>Error Rate: <Text color={metrics.performance.errorRate > 10 ? 'red' : 'green'}>{metrics.performance.errorRate.toFixed(1)}%</Text></Text>
          <Text>Queue Wait: <Text color="white">{(metrics.performance.queueWaitTime / 1000).toFixed(1)}s</Text></Text>
        </Box>
        
        <Box flexDirection="column" width="50%">
          <Text bold color="white">System Performance</Text>
          <Text>Memory Efficiency: <Text color="green">{metrics.performance.memoryEfficiency.toFixed(1)}%</Text></Text>
          <Text>Network Latency: <Text color="white">{metrics.performance.networkLatency.toFixed(1)}ms</Text></Text>
          <Text>Response Time: <Text color="white">{metrics.performance.responseTime.toFixed(1)}ms</Text></Text>
          <Text>System Load: <Text color={metrics.performance.systemLoad > 2 ? 'red' : 'green'}>{metrics.performance.systemLoad.toFixed(2)}</Text></Text>
        </Box>
      </Box>
      
      <Box flexDirection="column" marginTop={1}>
        <Text bold color="white">Swarm Intelligence</Text>
        <Text>Neural Accuracy: <Text color="green">{(metrics.swarm.neuralAccuracy * 100).toFixed(1)}%</Text></Text>
        <Text>Consensus Success: <Text color="green">{(metrics.swarm.consensusSuccess * 100).toFixed(1)}%</Text></Text>
        <Text>Memory Hit Rate: <Text color="green">{(metrics.swarm.memoryHitRate * 100).toFixed(1)}%</Text></Text>
        <Text>Message Throughput: <Text color="yellow">{metrics.swarm.messageThroughput.toFixed(1)}/s</Text></Text>
      </Box>
    </Box>
  );

  const renderAlerts = () => (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">🚨 System Alerts ({metrics.alerts.filter(a => !a.resolved).length} active)</Text>
      </Box>
      
      {metrics.alerts.slice(0, 15).map(alert => (
        <Box key={alert.id} justifyContent="space-between" marginBottom={1}>
          <Box width="10%">
            <Text color={alert.type === 'critical' ? 'red' : alert.type === 'warning' ? 'yellow' : 'gray'}>
              {alert.type.toUpperCase()}
            </Text>
          </Box>
          <Box width="15%">
            <Text color="gray">{alert.source}</Text>
          </Box>
          <Box width="60%">
            <Text color="white">{alert.message}</Text>
          </Box>
          <Box width="15%">
            <Text color="gray">{alert.timestamp.toLocaleTimeString()}</Text>
          </Box>
        </Box>
      ))}
      
      {metrics.alerts.length === 0 && (
        <Text color="gray">No alerts at this time ✨</Text>
      )}
    </Box>
  );

  const renderContent = () => {
    if (isLoading) {
      return <Text color="yellow">Loading monitoring data...</Text>;
    }

    switch (selectedTab) {
      case 'overview': return renderOverview();
      case 'agents': return renderAgents();
      case 'tasks': return renderTasks();
      case 'system': return renderSystem();
      case 'performance': return renderPerformance();
      case 'alerts': return renderAlerts();
      default: return renderOverview();
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      {renderHeader()}
      {renderTabBar()}
      {renderContent()}
    </Box>
  );
}; 