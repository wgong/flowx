/**
 * Output manager for benchmark results
 */

import { Benchmark } from '../core/models';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const writeFileAsync = promisify(fs.writeFile);
const mkdirAsync = promisify(fs.mkdir);

/**
 * Interface for output handlers
 */
interface OutputHandler {
  save(benchmark: Benchmark, outputPath: string): Promise<string>;
}

/**
 * JSON output handler
 */
class JSONOutputHandler implements OutputHandler {
  async save(benchmark: Benchmark, outputPath: string): Promise<string> {
    const filename = `${benchmark.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    const filePath = path.join(outputPath, filename);
    
    // Create a simplified benchmark object for serialization
    const serializableBenchmark = {
      id: benchmark.id,
      name: benchmark.name,
      description: benchmark.description,
      status: benchmark.status,
      duration: benchmark.duration(),
      tasks: benchmark.tasks.map(task => ({
        id: task.id,
        objective: task.objective,
        description: task.description,
        strategy: task.strategy,
        mode: task.mode,
        status: task.status,
        duration: task.duration(),
        parameters: task.parameters,
        metadata: task.metadata
      })),
      results: benchmark.results.map(result => ({
        id: result.id,
        taskId: result.taskId,
        agentId: result.agentId,
        status: result.status,
        errors: result.errors,
        warnings: result.warnings,
        performanceMetrics: result.performanceMetrics,
        resourceUsage: result.resourceUsage,
        duration: result.duration(),
        metadata: result.metadata
      })),
      metrics: benchmark.metrics,
      metadata: benchmark.metadata,
      startedAt: benchmark.startedAt ? benchmark.startedAt.toISOString() : null,
      completedAt: benchmark.completedAt ? benchmark.completedAt.toISOString() : null,
      createdAt: benchmark.createdAt.toISOString()
    };
    
    // Write to file
    await writeFileAsync(filePath, JSON.stringify(serializableBenchmark, null, 2));
    
    return filePath;
  }
}

/**
 * SQLite output handler
 */
class SQLiteOutputHandler implements OutputHandler {
  async save(benchmark: Benchmark, outputPath: string): Promise<string> {
    // In a real implementation, this would use sqlite3 to create a database
    // For now, we'll just write a placeholder file
    const filename = `${benchmark.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.sqlite`;
    const filePath = path.join(outputPath, filename);
    
    await writeFileAsync(filePath, `SQLite database for benchmark: ${benchmark.name}`);
    
    return filePath;
  }
}

/**
 * CSV output handler
 */
class CSVOutputHandler implements OutputHandler {
  async save(benchmark: Benchmark, outputPath: string): Promise<string> {
    const filename = `${benchmark.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    const filePath = path.join(outputPath, filename);
    
    // Create CSV content for results
    let csvContent = 'task_id,agent_id,status,execution_time,success_rate,peak_memory_mb,cpu_percent\n';
    
    for (const result of benchmark.results) {
      csvContent += [
        result.taskId,
        result.agentId,
        result.status,
        result.performanceMetrics.executionTime,
        result.performanceMetrics.successRate,
        result.resourceUsage.peakMemoryMb,
        result.resourceUsage.cpuPercent
      ].join(',') + '\n';
    }
    
    await writeFileAsync(filePath, csvContent);
    
    return filePath;
  }
}

/**
 * Unified manager for all output formats
 */
export class OutputManager {
  private handlers: Record<string, OutputHandler>;
  
  constructor() {
    this.handlers = {
      'json': new JSONOutputHandler(),
      'sqlite': new SQLiteOutputHandler(),
      'csv': new CSVOutputHandler()
    };
  }
  
  /**
   * Save benchmark to all specified formats
   */
  async save_benchmark(benchmark: Benchmark, outputDir: string, formats: string[] = ['json']): Promise<{ outputFiles: Record<string, string> }> {
    // Create output directory if it doesn't exist
    await mkdirAsync(outputDir, { recursive: true });
    
    const outputFiles: Record<string, string> = {};
    
    // Save in each format
    for (const format of formats) {
      if (this.handlers[format]) {
        try {
          const filePath = await this.handlers[format].save(benchmark, outputDir);
          outputFiles[format] = filePath;
        } catch (error) {
          console.error(`Error saving in ${format} format:`, error);
        }
      }
    }
    
    return { outputFiles };
  }
}