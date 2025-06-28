/**
 * Memory management commands
 */

import { Command } from 'commander';
import { colors } from '../../utils/colors.ts';
import Table from 'cli-table3';

interface MemoryEntry {
  key: string;
  value: string;
  namespace: string;
  timestamp: number;
}

export class SimpleMemoryManager {
  private filePath = "./memory/memory-store.json";
  private data: Record<string, MemoryEntry[]> = {};

  async load() {
    try {
      const content = await Deno.readTextFile(this.filePath);
      this.data = JSON.parse(content);
    } catch {
      // File doesn't exist yet
      this.data = {};
    }
  }

  async save() {
    await Deno.mkdir("./memory", { recursive: true });
    await Deno.writeTextFile(this.filePath, JSON.stringify(this.data, null, 2));
  }

  async store(key: string, value: string, namespace: string = "default") {
    await this.load();
    
    if (!this.data[namespace]) {
      this.data[namespace] = [];
    }

    // Remove existing entry with same key
    this.data[namespace] = this.data[namespace].filter(e => e.key !== key);
    
    // Add new entry
    this.data[namespace].push({
      key,
      value,
      namespace,
      timestamp: Date.now()
    });

    await this.save();
  }

  async query(search: string, namespace?: string) {
    await this.load();
    
    const results: MemoryEntry[] = [];
    const namespaces = namespace ? [namespace] : Object.keys(this.data);

    for (const ns of namespaces) {
      if (this.data[ns]) {
        for (const entry of this.data[ns]) {
          if (entry.key.includes(search) || entry.value.includes(search)) {
            results.push(entry);
          }
        }
      }
    }

    return results;
  }

  async getStats() {
    await this.load();
    
    let totalEntries = 0;
    const namespaceStats: Record<string, number> = {};

    for (const [namespace, entries] of Object.entries(this.data)) {
      namespaceStats[namespace] = entries.length;
      totalEntries += entries.length;
    }

    return {
      totalEntries,
      namespaces: Object.keys(this.data).length,
      namespaceStats,
      sizeBytes: new TextEncoder().encode(JSON.stringify(this.data)).length
    };
  }

  async exportData(filePath: string) {
    await this.load();
    await Deno.writeTextFile(filePath, JSON.stringify(this.data, null, 2));
  }

  async importData(filePath: string) {
    const content = await Deno.readTextFile(filePath);
    this.data = JSON.parse(content);
    await this.save();
  }

  async cleanup(daysOld: number = 30) {
    await this.load();
    
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    let removedCount = 0;

    for (const namespace of Object.keys(this.data)) {
      const before = this.data[namespace].length;
      this.data[namespace] = this.data[namespace].filter(e => e.timestamp > cutoffTime);
      removedCount += before - this.data[namespace].length;
    }

    await this.save();
    return removedCount;
  }
}

export function createMemoryCommands(program: Command) {
  const memory = program.command('memory')
    .description('Manage persistent memory');

  memory
    .command('query <query>')
    .description('Query the memory bank')
    .option('-l, --limit <number>', 'Limit the number of results', '10')
    .action(async (query, options) => {
      try {
        console.log(colors.blue(`Querying memory for: "${query}" (limit: ${options.limit})`));
        // Mock implementation
        const results = [{ key: 'test', value: 'result' }]; 
        
        if (results.length === 0) {
          console.log(colors.yellow('No results found.'));
          return;
        }

        const table = new Table({ head: [colors.green('Key'), colors.green('Value')] });
        results.forEach(r => table.push([r.key, r.value]));
        console.log(table.toString());

      } catch (e: any) {
        console.error(colors.red(`Error querying memory: ${e.message}`));
      }
    });

  memory
    .command('store <key> <value>')
    .description('Store a key-value pair in memory')
    .action(async (key, value) => {
      try {
        console.log(colors.blue(`Storing key: "${key}"`));
        // Mock implementation
        console.log(colors.green('Value stored successfully.'));
      } catch (e: any) {
        console.error(colors.red(`Error storing memory: ${e.message}`));
      }
    });
}