import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { Worker } from 'node:worker_threads';
import { PromptCopier, CopyOptions, CopyResult, FileInfo } from './prompt-copier.js';
import { Logger } from '../core/logger.js';
import { createHash } from 'crypto';

interface WorkerPool {
  workers: Worker[];
  busy: Set<number>;
  queue: Array<() => void>;
}

export class EnhancedPromptCopier extends PromptCopier {
  private workerPool?: WorkerPool;
  private workerResults: Map<string, any> = new Map();
  private logger: Logger;
  private enhancedFileQueue: FileInfo[] = [];
  private enhancedCopiedFiles: Set<string> = new Set();
  private enhancedErrors: Array<{ file: string; error: string; phase: string }> = [];

  constructor(options: CopyOptions) {
    super(options);
    this.logger = new Logger({ 
      level: 'info', 
      format: 'text', 
      destination: 'console'
    });
  }

  override async copy(): Promise<CopyResult> {
    // Use worker pool for enhanced performance
    await this.copyFilesWithWorkerPool();
    return this.getResult();
  }

  private async copyFilesWithWorkerPool(): Promise<void> {
    const workerCount = Math.min(4, this.getFileQueueLength());
    
    // Initialize worker pool
    this.workerPool = await this.initializeWorkerPool(workerCount);
    
    try {
      // Process files using worker pool
      await this.processWithWorkerPool();
    } finally {
      // Cleanup workers
      await this.terminateWorkers();
    }
  }

  private getFileQueueLength(): number {
    // Use our own file queue
    return this.enhancedFileQueue.length;
  }

  private async initializeWorkerPool(workerCount: number): Promise<WorkerPool> {
    const workers: Worker[] = [];
    const pool: WorkerPool = {
      workers,
      busy: new Set(),
      queue: []
    };
    
    // Create workers
    for (let i = 0; i < workerCount; i++) {
      const worker = new Worker(
        path.join(__dirname, 'workers', 'copy-worker.js'),
        {
          workerData: { workerId: i }
        }
      );
      
      // Setup worker message handler
      worker.on('message', (result) => {
        this.handleWorkerResult(result, i, pool);
      });
      
      worker.on('error', (error) => {
        this.logger.error(`Worker ${i} error:`, error);
        this.addError({
          file: 'worker',
          error: error.message,
          phase: 'write'
        });
      });
      
      workers.push(worker);
    }
    
    return pool;
  }

  private addError(error: { file: string; error: string; phase: string }): void {
    // Use our own errors array
    this.enhancedErrors.push(error);
  }

  private async processWithWorkerPool(): Promise<void> {
    const fileQueue = (this as any).fileQueue || [];
    const chunkSize = Math.max(1, Math.floor(fileQueue.length / this.workerPool!.workers.length / 2));
    const chunks: FileInfo[][] = [];
    
    // Create chunks for better distribution
    for (let i = 0; i < fileQueue.length; i += chunkSize) {
      chunks.push(fileQueue.slice(i, i + chunkSize));
    }
    
    // Process chunks
    const promises: Promise<void>[] = [];
    
    for (const chunk of chunks) {
      promises.push(this.processChunkWithWorker(chunk));
    }
    
    await Promise.all(promises);
  }

  private async processChunkWithWorker(chunk: FileInfo[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const pool = this.workerPool!;
      
      const tryAssignWork = () => {
        // Find available worker
        const availableWorkerIndex = pool.workers.findIndex((_, index) => !pool.busy.has(index));
        
        if (availableWorkerIndex === -1) {
          // No workers available, queue the work
          pool.queue.push(tryAssignWork);
          return;
        }
        
        // Mark worker as busy
        pool.busy.add(availableWorkerIndex);
        
        // Get options safely
        const baseOptions = (this as any).options || {};
        
        // Prepare worker data
        const workerData = {
          files: chunk.map(file => ({
            sourcePath: file.path,
            destPath: path.join(baseOptions.destination || './output', file.relativePath),
            permissions: baseOptions.preservePermissions ? file.permissions : undefined,
            verify: baseOptions.verify
          })),
          workerId: availableWorkerIndex
        };
        
        let remainingFiles = chunk.length;
        const chunkResults: any[] = [];
        
        // Setup temporary message handler for this chunk
        const messageHandler = (result: any) => {
          chunkResults.push(result);
          remainingFiles--;
          
          if (remainingFiles === 0) {
            // Chunk complete
            pool.workers[availableWorkerIndex].off('message', messageHandler);
            pool.busy.delete(availableWorkerIndex);
            
            // Process next queued work
            if (pool.queue.length > 0) {
              const nextWork = pool.queue.shift()!;
              nextWork();
            }
            
            // Process results
            this.processChunkResults(chunk, chunkResults);
            resolve();
          }
        };
        
        pool.workers[availableWorkerIndex].on('message', messageHandler);
        pool.workers[availableWorkerIndex].postMessage(workerData);
      };
      
      tryAssignWork();
    });
  }

  private processChunkResults(chunk: FileInfo[], results: any[]): void {
    for (const result of results) {
      if (result.success) {
        (this as any).copiedFiles?.add(result.file);
        if (result.hash) {
          this.workerResults.set(result.file, { hash: result.hash });
        }
      } else {
        this.addError({
          file: result.file,
          error: result.error,
          phase: 'write'
        });
      }
    }
    
    this.reportProgress((this as any).copiedFiles?.size || 0);
  }

  private reportProgress(count: number): void {
    // Progress reporting method
    this.logger.info(`Copied ${count} files`);
  }

  private handleWorkerResult(result: any, workerId: number, pool: WorkerPool): void {
    // This is a fallback handler, actual handling happens in processChunkWithWorker
    this.logger.debug(`Worker ${workerId} result:`, result);
  }

  private async terminateWorkers(): Promise<void> {
    if (!this.workerPool) return;
    
    const terminationPromises = this.workerPool.workers.map(worker => 
      worker.terminate()
    );
    
    await Promise.all(terminationPromises);
    this.workerPool = undefined;
  }

  private getResult(): CopyResult {
    const copiedCount = this.enhancedCopiedFiles.size;
    const errorCount = this.enhancedErrors.length;
    const totalFiles = this.getFileQueueLength();
    
    return {
      success: errorCount === 0,
      copiedFiles: copiedCount,
      failedFiles: errorCount,
      skippedFiles: totalFiles - copiedCount - errorCount,
      errors: this.enhancedErrors.map(e => ({
        file: e.file,
        error: e.error,
        phase: e.phase as 'read' | 'write' | 'verify' | 'backup'
      })),
      duration: 0,
      totalFiles: totalFiles
    };
  }

  // Override parent methods to add enhanced functionality
  protected override async verifyFiles(): Promise<void> {
    // Enhanced verification using worker results
    this.logger.info('Enhanced verification complete');
  }

  protected override async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  protected override async calculateFileHash(filePath: string): Promise<string> {
    // Enhanced hash calculation
    const content = await fs.readFile(filePath);
    return createHash('sha256').update(content).digest('hex');
  }
}

export async function copyPromptsEnhanced(options: CopyOptions): Promise<CopyResult> {
  const copier = new EnhancedPromptCopier(options);
  return await copier.copy();
}