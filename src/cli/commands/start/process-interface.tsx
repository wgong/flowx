/**
 * Process Interface
 * Provides a clean interface for process management and monitoring
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import { AgentProcessManager } from '../../../agents/agent-process-manager.ts';
import { ILogger } from '../../../core/logger.ts';
import { generateId } from '../../../utils/helpers.ts';

interface ProcessInfo {
  id: string;
  name: string;
  pid: number;
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  uptime: number;
  memory: number;
  cpu: number;
  lastActivity: Date;
}

interface ProcessInterfaceProps {
  processManager: AgentProcessManager;
  logger: ILogger;
  onExit?: () => void;
}

export const ProcessInterface: React.FC<ProcessInterfaceProps> = ({
  processManager,
  logger,
  onExit
}) => {
  const [processes, setProcesses] = useState<ProcessInfo[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [filter, setFilter] = useState<'all' | 'running' | 'stopped'>('all');
  const { exit } = useApp();

  // Update process list periodically
  useEffect(() => {
    const updateProcesses = async () => {
      try {
        const activeProcesses = processManager.getAgents();
        const processInfos: ProcessInfo[] = activeProcesses.map((proc: any) => ({
          id: proc.id,
          name: proc.type || 'Unknown',
          pid: proc.pid || 0,
          status: proc.status as ProcessInfo['status'],
          uptime: proc.startTime ? Date.now() - proc.startTime.getTime() : 0,
          memory: proc.memoryUsage || 0,
          cpu: proc.cpuUsage || 0,
          lastActivity: new Date(proc.lastActivity || Date.now())
        }));
        setProcesses(processInfos);
      } catch (error) {
        logger.error('Failed to update process list', { error });
      }
    };

    updateProcesses();
    const interval = setInterval(updateProcesses, 2000);
    return () => clearInterval(interval);
  }, [processManager, logger]);

  // Handle keyboard input
  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex(Math.max(0, selectedIndex - 1));
    } else if (key.downArrow) {
      setSelectedIndex(Math.min(filteredProcesses.length - 1, selectedIndex + 1));
    } else if (key.return) {
      setShowDetails(!showDetails);
    } else if (input === 'q' || key.escape) {
      onExit?.();
      exit();
    } else if (input === 'r') {
      restartSelectedProcess();
    } else if (input === 's') {
      stopSelectedProcess();
    } else if (input === 'k') {
      killSelectedProcess();
    } else if (input === 'f') {
      cycleFilter();
    } else if (input === 'c') {
      clearDeadProcesses();
    }
  });

  // Filter processes based on current filter
  const filteredProcesses = processes.filter(proc => {
    switch (filter) {
      case 'running':
        return proc.status === 'running';
      case 'stopped':
        return proc.status === 'stopped' || proc.status === 'error';
      default:
        return true;
    }
  });

  // Ensure selected index is within bounds
  useEffect(() => {
    if (selectedIndex >= filteredProcesses.length) {
      setSelectedIndex(Math.max(0, filteredProcesses.length - 1));
    }
  }, [filteredProcesses.length, selectedIndex]);

  const selectedProcess = filteredProcesses[selectedIndex];

  const restartSelectedProcess = async () => {
    if (selectedProcess) {
      try {
        await processManager.restartAgent(selectedProcess.id);
        logger.info('Process restarted', { processId: selectedProcess.id });
      } catch (error) {
        logger.error('Failed to restart process', { processId: selectedProcess.id, error });
      }
    }
  };

  const stopSelectedProcess = async () => {
    if (selectedProcess) {
      try {
        await processManager.stopAgent(selectedProcess.id);
        logger.info('Process stopped', { processId: selectedProcess.id });
      } catch (error) {
        logger.error('Failed to stop process', { processId: selectedProcess.id, error });
      }
    }
  };

  const killSelectedProcess = async () => {
    if (selectedProcess) {
      try {
        await processManager.stopAgent(selectedProcess.id, true);
        logger.info('Process killed', { processId: selectedProcess.id });
      } catch (error) {
        logger.error('Failed to kill process', { processId: selectedProcess.id, error });
      }
    }
  };

  const cycleFilter = () => {
    const filters: Array<'all' | 'running' | 'stopped'> = ['all', 'running', 'stopped'];
    const currentIndex = filters.indexOf(filter);
    const nextIndex = (currentIndex + 1) % filters.length;
    setFilter(filters[nextIndex]);
    setSelectedIndex(0);
  };

  const clearDeadProcesses = async () => {
    try {
      // Get all agents and filter for dead ones, then stop them
      const agents = processManager.getAgents();
      const deadAgents = agents.filter(agent => agent.status === 'error' || agent.status === 'crashed');
      
      for (const agent of deadAgents) {
        await processManager.stopAgent(agent.id, true);
      }
      
      logger.info('Dead processes cleared', { count: deadAgents.length });
    } catch (error) {
      logger.error('Failed to clear dead processes', { error });
    }
  };

  const formatUptime = (uptime: number): string => {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const formatMemory = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)}MB`;
  };

  const getStatusColor = (status: ProcessInfo['status']): string => {
    switch (status) {
      case 'running': return 'green';
      case 'starting': return 'yellow';
      case 'stopping': return 'yellow';
      case 'stopped': return 'gray';
      case 'error': return 'red';
      default: return 'white';
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="blue">
          Process Interface - {filteredProcesses.length} processes ({filter})
        </Text>
      </Box>

      {/* Process List */}
      <Box flexDirection="column" marginBottom={1}>
        {filteredProcesses.length === 0 ? (
          <Text color="gray">No processes found</Text>
        ) : (
          filteredProcesses.map((proc, index) => (
            <Box key={proc.id} flexDirection="row">
              <Text color={index === selectedIndex ? 'cyan' : 'white'}>
                {index === selectedIndex ? '► ' : '  '}
              </Text>
              <Box width={20}>
                <Text color={getStatusColor(proc.status)}>
                  {proc.name}
                </Text>
              </Box>
              <Box width={8}>
                <Text color="gray">
                  {proc.pid}
                </Text>
              </Box>
              <Box width={12}>
                <Text color={getStatusColor(proc.status)}>
                  {proc.status}
                </Text>
              </Box>
              <Box width={10}>
                <Text color="gray">
                  {formatUptime(proc.uptime)}
                </Text>
              </Box>
              <Box width={10}>
                <Text color="gray">
                  {formatMemory(proc.memory)}
                </Text>
              </Box>
              <Box width={8}>
                <Text color="gray">
                  {proc.cpu.toFixed(1)}%
                </Text>
              </Box>
            </Box>
          ))
        )}
      </Box>

      {/* Process Details */}
      {showDetails && selectedProcess && (
        <Box flexDirection="column" borderStyle="single" padding={1} marginBottom={1}>
          <Text bold color="yellow">Process Details</Text>
          <Text>ID: {selectedProcess.id}</Text>
          <Text>Name: {selectedProcess.name}</Text>
          <Text>PID: {selectedProcess.pid}</Text>
          <Text>Status: <Text color={getStatusColor(selectedProcess.status)}>{selectedProcess.status}</Text></Text>
          <Text>Uptime: {formatUptime(selectedProcess.uptime)}</Text>
          <Text>Memory: {formatMemory(selectedProcess.memory)}</Text>
          <Text>CPU: {selectedProcess.cpu.toFixed(1)}%</Text>
          <Text>Last Activity: {selectedProcess.lastActivity.toLocaleTimeString()}</Text>
        </Box>
      )}

      {/* Controls */}
      <Box flexDirection="column" borderStyle="single" padding={1}>
        <Text bold color="yellow">Controls</Text>
        <Text>↑/↓ - Navigate | Enter - Toggle Details | F - Filter ({filter})</Text>
        <Text>R - Restart | S - Stop | K - Kill | C - Clear Dead</Text>
        <Text>Q/Esc - Exit</Text>
      </Box>

      {/* Status Bar */}
      <Box marginTop={1}>
        <Text color="gray">
          Selected: {selectedProcess?.name || 'None'} | Running: {processes.filter(p => p.status === 'running').length} | Total: {processes.length}
        </Text>
      </Box>
    </Box>
  );
};

// Export helper functions for testing
export const formatters = {
  formatUptime: (uptime: number): string => {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  },

  formatMemory: (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)}MB`;
  },

  getStatusColor: (status: ProcessInfo['status']): string => {
    switch (status) {
      case 'running': return 'green';
      case 'starting': return 'yellow';
      case 'stopping': return 'yellow';
      case 'stopped': return 'gray';
      case 'error': return 'red';
      default: return 'white';
    }
  }
};

export default ProcessInterface; 