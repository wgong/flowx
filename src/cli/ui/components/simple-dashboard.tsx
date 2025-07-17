import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { getPersistenceManager } from '../../core/global-initialization.js';

interface SimpleDashboardProps {
  onBack: () => void;
}

export const SimpleDashboard: React.FC<SimpleDashboardProps> = ({ onBack }) => {
  const [agentCount, setAgentCount] = useState(0);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useInput((input, key) => {
    if (key.escape || input === 'q') {
      onBack();
      return;
    }
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const persistenceManager = await getPersistenceManager();
        const agents = await persistenceManager.getAllAgents();
        setAgentCount(agents.length);
        setLastUpdate(new Date());
        setIsLoading(false);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        setIsLoading(false);
      }
    };

    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return <Text color="yellow">Loading dashboard...</Text>;
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">🚀 FlowX Simple Dashboard</Text>
      <Text color="gray">Last Update: {lastUpdate.toLocaleTimeString()}</Text>
      <Text>Agents: {agentCount}</Text>
      {error && <Text color="red">Error: {error}</Text>}
      <Text color="gray">Press Q or ESC to go back</Text>
    </Box>
  );
}; 