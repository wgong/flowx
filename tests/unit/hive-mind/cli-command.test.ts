/**
 * Unit tests for Hive Mind CLI commands
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';

// Mock the required modules
jest.mock('../../../src/cli/core/output-formatter', () => ({
  printSuccess: jest.fn(),
  printError: jest.fn(),
  printInfo: jest.fn(),
  printWarning: jest.fn()
}));

jest.mock('../../../src/hive-mind/index.ts', () => {
  return {
    HiveMind: jest.fn(),
    getNeuralStatus: jest.fn(),
    getDatabaseStatus: jest.fn(),
    getQueenStatus: jest.fn(),
    getCoordinationStatus: jest.fn()
  };
});

describe('Hive Mind CLI Commands', () => {
  let mockHiveMind: any;
  let mockOutputFormatter: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Get the mock functions from the module mock
    const { HiveMind, getNeuralStatus, getDatabaseStatus, getQueenStatus, getCoordinationStatus } = require('../../../src/hive-mind/index.ts');
    const { printSuccess, printError, printInfo } = require('../../../src/cli/core/output-formatter');
    
    // Configure mock return values
    (getNeuralStatus as jest.Mock).mockReturnValue({
      neuralManager: {
        totalPatterns: 10,
        recognitionAccuracy: 0.85,
        learningSessions: 5,
        optimizationCycles: 3
      },
      patternRecognizer: {
        activeModels: 4,
        config: {
          confidenceThreshold: 0.7,
          learningRate: 0.01,
          tensorFlowModels: {
            sequence: { accuracy: 0.88 },
            classification: { accuracy: 0.92 },
            regression: { accuracy: 0.85 }
          }
        }
      }
    });
    
    (getDatabaseStatus as jest.Mock).mockReturnValue({
      totalTables: 12,
      totalRecords: 150,
      lastBackup: '2024-01-15T10:30:00Z',
      status: 'healthy'
    });
    
    (getQueenStatus as jest.Mock).mockReturnValue({
      queenId: 'queen-001',
      collectives: 3,
      totalAgents: 15,
      consensusAlgorithm: 'raft',
      leaderElection: 'active'
    });
    
    (getCoordinationStatus as jest.Mock).mockReturnValue({
      activeNodes: 5,
      networkHealth: 'excellent',
      messageLatency: 12,
      syncStatus: 'synchronized'
    });
    
    // Store references for test assertions  
    mockHiveMind = { getNeuralStatus, getDatabaseStatus, getQueenStatus, getCoordinationStatus };
    mockOutputFormatter = { printSuccess, printError, printInfo };
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('hive-mind status command', () => {
    it('should display comprehensive hive mind status', async () => {
      // Import the command handler
      const { handleHiveMindStatus } = require('../../../src/cli/commands/hive-mind/hive-mind-command');
      
      // Execute the command
      await handleHiveMindStatus();
      
      // Verify all status methods were called
      const { getNeuralStatus, getDatabaseStatus, getQueenStatus, getCoordinationStatus } = require('../../../src/hive-mind/index.ts');
      expect(getNeuralStatus).toHaveBeenCalled();
      expect(getDatabaseStatus).toHaveBeenCalled();
      expect(getQueenStatus).toHaveBeenCalled();
      expect(getCoordinationStatus).toHaveBeenCalled();
      
      // Verify output formatting
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('🧠 Hive Mind Status')
      );
    });

    it('should handle neural status display correctly', async () => {
      const { handleHiveMindStatus } = require('../../../src/cli/commands/hive-mind/hive-mind-command');
      
      await handleHiveMindStatus();
      
      // Check that neural status information is displayed
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Neural Manager:')
      );
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Total Patterns: 10')
      );
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Recognition Accuracy: 85.0%')
      );
    });

    it('should handle database status display correctly', async () => {
      const { handleHiveMindStatus } = require('../../../src/cli/commands/hive-mind/hive-mind-command');
      
      await handleHiveMindStatus();
      
      // Check that database status information is displayed
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Database Status:')
      );
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Total Tables: 12')
      );
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Total Records: 150')
      );
    });

    it('should handle queen status display correctly', async () => {
      const { handleHiveMindStatus } = require('../../../src/cli/commands/hive-mind/hive-mind-command');
      
      await handleHiveMindStatus();
      
      // Check that queen status information is displayed
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Queen Agent:')
      );
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Queen ID: queen-001')
      );
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Collectives: 3')
      );
    });

    it('should handle coordination status display correctly', async () => {
      const { handleHiveMindStatus } = require('../../../src/cli/commands/hive-mind/hive-mind-command');
      
      await handleHiveMindStatus();
      
      // Check that coordination status information is displayed
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Coordination:')
      );
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Active Nodes: 5')
      );
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Network Health: excellent')
      );
    });
  });

  describe('hive-mind neural command', () => {
    it('should display neural system details', async () => {
      const { handleHiveMindNeural } = require('../../../src/cli/commands/hive-mind/hive-mind-command');
      
      await handleHiveMindNeural();
      
      const { getNeuralStatus } = require('../../../src/hive-mind/index.ts');
      expect(getNeuralStatus).toHaveBeenCalled();
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('🧠 Neural System Status')
      );
    });

    it('should display TensorFlow model details', async () => {
      const { handleHiveMindNeural } = require('../../../src/cli/commands/hive-mind/hive-mind-command');
      
      await handleHiveMindNeural();
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('TensorFlow Models:')
      );
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Sequence: 88%')
      );
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Classification: 92%')
      );
    });
  });

  describe('hive-mind database command', () => {
    it('should display database system details', async () => {
      const { handleHiveMindDatabase } = require('../../../src/cli/commands/hive-mind/hive-mind-command');
      
      await handleHiveMindDatabase();
      
      const { getDatabaseStatus } = require('../../../src/hive-mind/index.ts');
      expect(getDatabaseStatus).toHaveBeenCalled();
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('🗄️ Database System Status')
      );
    });

    it('should display backup information', async () => {
      const { handleHiveMindDatabase } = require('../../../src/cli/commands/hive-mind/hive-mind-command');
      
      await handleHiveMindDatabase();
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Last Backup: 2024-01-15T10:30:00Z')
      );
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Status: healthy')
      );
    });
  });

  describe('hive-mind queen command', () => {
    it('should display queen agent details', async () => {
      const { handleHiveMindQueen } = require('../../../src/cli/commands/hive-mind/hive-mind-command');
      
      await handleHiveMindQueen();
      
      const { getQueenStatus } = require('../../../src/hive-mind/index.ts');
      expect(getQueenStatus).toHaveBeenCalled();
      expect(mockOutputFormatter.printSuccess).toHaveBeenCalledWith(
        expect.stringContaining('👑 Queen Agent Status')
      );
    });

    it('should display collective information', async () => {
      const { handleHiveMindQueen } = require('../../../src/cli/commands/hive-mind/hive-mind-command');
      
      await handleHiveMindQueen();
      
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Collectives: 3')
      );
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Total Agents: 15')
      );
      expect(mockOutputFormatter.printInfo).toHaveBeenCalledWith(
        expect.stringContaining('Consensus Algorithm: raft')
      );
    });
  });

  describe('error handling', () => {
    it('should handle hive mind initialization errors', async () => {
      const { getNeuralStatus } = require('../../../src/hive-mind/index');
      (getNeuralStatus as jest.Mock).mockImplementation(() => {
        throw new Error('Initialization failed');
      });
      
      const { handleHiveMindStatus } = require('../../../src/cli/commands/hive-mind/hive-mind-command');
      
      await handleHiveMindStatus();
      
      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get hive mind status')
      );
    });

    it('should handle neural system errors gracefully', async () => {
      mockHiveMind.getNeuralStatus.mockImplementation(() => {
        throw new Error('Neural system error');
      });
      
      const { handleHiveMindNeural } = require('../../../src/cli/commands/hive-mind/hive-mind-command');
      
      await handleHiveMindNeural();
      
      expect(mockOutputFormatter.printError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get neural status')
      );
    });
  });
});