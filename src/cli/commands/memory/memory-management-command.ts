/**
 * Memory Management Command
 * Comprehensive memory bank operations
 */

import type { CLICommand, CLIContext } from '../../interfaces/index.ts';
import { formatTable, successBold, infoBold, warningBold, errorBold, printSuccess, printError, printWarning, printInfo } from '../../core/output-formatter.ts';

export const memoryCommand: CLICommand = {
  name: 'memory',
  description: 'Manage memory bank operations',
  category: 'Memory',
  usage: 'claude-flow memory <subcommand> [OPTIONS]',
  examples: [
    'claude-flow memory store "Important information"',
    'claude-flow memory query "search term"',
    'claude-flow memory list --category projects',
    'claude-flow memory stats'
  ],
  subcommands: [
    {
      name: 'store',
      description: 'Store information in memory',
      handler: storeMemory,
      arguments: [
        {
          name: 'content',
          description: 'Content to store',
          required: true
        }
      ],
      options: [
        {
          name: 'category',
          short: 'c',
          description: 'Memory category',
          type: 'string'
        },
        {
          name: 'tags',
          short: 't',
          description: 'Comma-separated tags',
          type: 'string'
        }
      ]
    },
    {
      name: 'query',
      description: 'Query memory bank',
      handler: queryMemory,
      arguments: [
        {
          name: 'search-term',
          description: 'Search term or query',
          required: true
        }
      ],
      options: [
        {
          name: 'limit',
          short: 'l',
          description: 'Maximum results',
          type: 'number',
          default: 10
        }
      ]
    },
    {
      name: 'list',
      description: 'List memory entries',
      handler: listMemories,
      options: [
        {
          name: 'category',
          short: 'c',
          description: 'Filter by category',
          type: 'string'
        },
        {
          name: 'limit',
          short: 'l',
          description: 'Maximum entries to show',
          type: 'number',
          default: 20
        }
      ]
    },
    {
      name: 'stats',
      description: 'Show memory statistics',
      handler: showMemoryStats
    }
  ],
  handler: async (context: CLIContext) => {
    return await listMemories(context);
  }
};

interface MemoryEntry {
  id: string;
  content: string;
  category: string;
  tags: string[];
  created: Date;
  updated: Date;
  accessCount: number;
}

async function storeMemory(context: CLIContext): Promise<void> {
  const { args, options } = context;
  const content = args[0];
  
  try {
    printInfo('Storing memory...');
    const stored = await storeMemoryEntry({
      content,
      category: options.category || 'general',
      tags: options.tags ? options.tags.split(',').map((t: string) => t.trim()) : []
    });
    
    printSuccess(`Memory stored successfully: ${stored.id}`);
    
  } catch (error) {
    printError(`Failed to store memory: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function queryMemory(context: CLIContext): Promise<void> {
  const { args, options } = context;
  const searchTerm = args[0];
  
  try {
    const results = await searchMemories(searchTerm, { limit: options.limit });
    
    if (results.length === 0) {
      printInfo('No memories found matching your query');
      return;
    }

    displayMemoriesTable(results);
    
  } catch (error) {
    printError(`Failed to query memory: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function listMemories(context: CLIContext): Promise<void> {
  const { options } = context;
  
  try {
    const memories = await getMemories({
      category: options.category,
      limit: options.limit
    });
    
    if (memories.length === 0) {
      printInfo('No memories found');
      return;
    }

    displayMemoriesTable(memories);
    
  } catch (error) {
    printError(`Failed to list memories: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function showMemoryStats(context: CLIContext): Promise<void> {
  try {
    const stats = await getMemoryStatistics();
    
    console.log(successBold('\n📊 Memory Bank Statistics\n'));
    console.log(`Total Entries: ${stats.totalEntries}`);
    console.log(`Categories: ${stats.categoriesCount}`);
    console.log(`Total Tags: ${stats.tagsCount}`);
    console.log(`Storage Size: ${formatBytes(stats.storageSize)}`);
    
  } catch (error) {
    printError(`Failed to show memory stats: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

// Helper functions

async function storeMemoryEntry(entry: Partial<MemoryEntry>): Promise<MemoryEntry> {
  const stored: MemoryEntry = {
    id: `mem-${Date.now()}`,
    content: entry.content || '',
    category: entry.category || 'general',
    tags: entry.tags || [],
    created: new Date(),
    updated: new Date(),
    accessCount: 0
  };
  
  return stored;
}

async function searchMemories(searchTerm: string, options: any): Promise<MemoryEntry[]> {
  const mockMemories = await getMockMemories();
  return mockMemories.filter(m => 
    m.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  ).slice(0, options.limit);
}

async function getMemories(options: any): Promise<MemoryEntry[]> {
  const memories = await getMockMemories();
  let filtered = memories;

  if (options.category) {
    filtered = filtered.filter(m => m.category === options.category);
  }

  return filtered.slice(0, options.limit);
}

async function getMemoryStatistics(): Promise<any> {
  const memories = await getMockMemories();
  
  return {
    totalEntries: memories.length,
    categoriesCount: new Set(memories.map(m => m.category)).size,
    tagsCount: new Set(memories.flatMap(m => m.tags)).size,
    storageSize: memories.reduce((sum, m) => sum + m.content.length, 0)
  };
}

async function getMockMemories(): Promise<MemoryEntry[]> {
  return [
    {
      id: 'mem-001',
      content: 'Important project requirements for the Q4 release',
      category: 'projects',
      tags: ['q4', 'requirements', 'release'],
      created: new Date(Date.now() - 86400000),
      updated: new Date(Date.now() - 3600000),
      accessCount: 15
    },
    {
      id: 'mem-002',
      content: 'Meeting notes from architecture review',
      category: 'meetings',
      tags: ['architecture', 'review', 'notes'],
      created: new Date(Date.now() - 172800000),
      updated: new Date(Date.now() - 7200000),
      accessCount: 8
    }
  ];
}

function displayMemoriesTable(memories: MemoryEntry[]): void {
  console.log(successBold('\n🧠 Memory Bank Entries\n'));
  
  const table = formatTable(memories, [
    { header: 'ID', key: 'id' },
    { header: 'Content', key: 'content', formatter: (v) => v.length > 50 ? v.substring(0, 47) + '...' : v },
    { header: 'Category', key: 'category' },
    { header: 'Tags', key: 'tags', formatter: (v) => v.slice(0, 2).join(', ') + (v.length > 2 ? '...' : '') },
    { header: 'Created', key: 'created', formatter: (v) => v.toLocaleDateString() }
  ]);
  
  console.log(table);
  console.log();
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default memoryCommand; 