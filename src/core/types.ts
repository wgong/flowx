export interface AgentProfile {
  id: string;
  name: string;
  type: string;
  status: 'idle' | 'active' | 'busy' | 'error' | 'offline';
  capabilities?: string[];
  priority?: number;
  metadata?: Record<string, any>;
}

export interface Task {
  id: string;
  type: string;
  name?: string;
  description: string;
  status: TaskStatus;
  priority: number;
  assignedAgent?: string;
  requiredCapabilities?: string[];
  dependencies?: string[];
  input?: Record<string, any>;
  output?: Record<string, any>;
  error?: Error;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt?: Date;
  completedAt?: Date;
  startedAt?: Date;
}

export type TaskStatus = 'pending' | 'queued' | 'assigned' | 'running' | 'completed' | 'failed' | 'cancelled'; 