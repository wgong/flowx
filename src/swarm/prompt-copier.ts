import { promises as fs } from 'node:fs';
import { join, dirname, relative } from 'node:path';

export interface CopyOptions {
  source: string;
  destination: string;
  overwrite?: boolean;
  includePatterns?: string[];
  excludePatterns?: string[];
  // Enterprise features
  backup?: boolean;
  verify?: boolean;
  parallel?: boolean;
  maxWorkers?: number;
  conflictResolution?: 'skip' | 'overwrite' | 'backup' | 'merge';
  dryRun?: boolean;
  progressCallback?: (progress: ProgressInfo) => void;
}

export interface CopyResult {
  success: boolean;
  copiedFiles: number;
  skippedFiles: number;
  errors: CopyError[];
  // Enterprise metrics
  totalFiles: number;
  failedFiles: number;
  duration: number;
  backupLocation?: string;
  bytesTransferred?: number;
}

export interface CopyError {
  file: string;
  error: string;
  phase: 'read' | 'write' | 'verify' | 'backup';
  timestamp: Date;
}

export interface ProgressInfo {
  total: number;
  completed: number;
  current?: string;
  phase: 'scanning' | 'copying' | 'verifying' | 'backup';
}

/**
 * Enterprise-grade prompt file copier with comprehensive error handling and monitoring
 */
export class PromptCopier {
  private options: CopyOptions;
  private startTime: number = 0;
  private totalBytes: number = 0;

  constructor(options: CopyOptions) {
    this.options = options;
  }

  async copy(): Promise<CopyResult> {
    this.startTime = Date.now();
    
    const result: CopyResult = {
      success: true,
      copiedFiles: 0,
      skippedFiles: 0,
      totalFiles: 0,
      failedFiles: 0,
      errors: [],
      duration: 0,
      bytesTransferred: 0
    };

    try {
      // Validate inputs
      await this.validateInputs();

      // Progress callback for scanning phase
      this.reportProgress(0, 0, 'Scanning files...', 'scanning');

      // Find all files to copy
      const files = await this.findFiles(this.options.source);
      result.totalFiles = files.length;

      if (files.length === 0) {
        console.log('No files found to copy');
        result.duration = Date.now() - this.startTime;
        return result;
      }

      // Create backup if requested
      if (this.options.backup) {
        result.backupLocation = await this.createBackup();
      }

      // Copy files
      await this.copyFiles(files, result);

      // Verify if requested
      if (this.options.verify) {
        await this.verifyFiles(files, result);
      }

      result.success = result.failedFiles === 0;
      result.duration = Date.now() - this.startTime;
      result.bytesTransferred = this.totalBytes;

      return result;

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push({
        file: this.options.source,
        error: errorMsg,
        phase: 'read',
        timestamp: new Date()
      });
      result.success = false;
      result.duration = Date.now() - this.startTime;
      return result;
    }
  }

  private async validateInputs(): Promise<void> {
    // Validate source exists
    try {
      const sourceStats = await fs.stat(this.options.source);
      if (!sourceStats.isDirectory()) {
        throw new Error(`Source ${this.options.source} is not a directory`);
      }
    } catch (error) {
      throw new Error(`Source directory ${this.options.source} does not exist or is not accessible`);
    }

    // Validate destination is writable
    try {
      await fs.mkdir(this.options.destination, { recursive: true });
    } catch (error) {
      throw new Error(`Cannot create destination directory ${this.options.destination}`);
    }
  }

  private async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = join(this.options.destination, `backup-${timestamp}`);
    
    try {
      // Check if destination has existing files
      const existingFiles = await this.findFiles(this.options.destination);
      
      if (existingFiles.length > 0) {
        await fs.mkdir(backupDir, { recursive: true });
        
        for (const file of existingFiles) {
          const relativePath = relative(this.options.destination, file);
          const backupPath = join(backupDir, relativePath);
          await fs.mkdir(dirname(backupPath), { recursive: true });
          await fs.copyFile(file, backupPath);
        }
      }
      
      return backupDir;
    } catch (error) {
      throw new Error(`Failed to create backup: ${error instanceof Error ? error.message : error}`);
    }
  }

  private async copyFiles(files: string[], result: CopyResult): Promise<void> {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        this.reportProgress(files.length, i, file, 'copying');
        
        if (this.options.dryRun) {
          console.log(`[DRY RUN] Would copy: ${relative(this.options.source, file)}`);
          result.copiedFiles++;
          continue;
        }

        const copied = await this.copyFile(file);
        if (copied) {
          result.copiedFiles++;
        } else {
          result.skippedFiles++;
        }

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.errors.push({
          file,
          error: errorMsg,
          phase: 'write',
          timestamp: new Date()
        });
        result.failedFiles++;
      }
    }

    // Final progress update
    this.reportProgress(files.length, files.length, 'Complete', 'copying');
  }

  private async verifyFiles(files: string[], result: CopyResult): Promise<void> {
    this.reportProgress(files.length, 0, 'Verifying files...', 'verifying');
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        const relativePath = relative(this.options.source, file);
        const destPath = join(this.options.destination, relativePath);
        
        // Check if destination file exists and has same size
        const [sourceStats, destStats] = await Promise.all([
          fs.stat(file),
          fs.stat(destPath)
        ]);
        
        if (sourceStats.size !== destStats.size) {
          result.errors.push({
            file,
            error: `File size mismatch: source ${sourceStats.size} bytes, destination ${destStats.size} bytes`,
            phase: 'verify',
            timestamp: new Date()
          });
          result.failedFiles++;
        }
        
        this.reportProgress(files.length, i + 1, file, 'verifying');
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        result.errors.push({
          file,
          error: `Verification failed: ${errorMsg}`,
          phase: 'verify',
          timestamp: new Date()
        });
        result.failedFiles++;
      }
    }
  }

  private reportProgress(total: number, completed: number, current?: string, phase: ProgressInfo['phase'] = 'copying'): void {
    if (this.options.progressCallback) {
      const progressInfo: ProgressInfo = {
        total,
        completed,
        phase
      };
      
      // Only add current if it's defined
      if (current !== undefined) {
        progressInfo.current = current;
      }
      
      this.options.progressCallback(progressInfo);
    }
  }

  private async findFiles(dir: string, basePath = ''): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        const relativePath = join(basePath, entry.name);

        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          const subFiles = await this.findFiles(fullPath, relativePath);
          files.push(...subFiles);
        } else if (entry.isFile() && this.shouldIncludeFile(relativePath)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Log error but continue processing
      console.warn(`Warning: Could not read directory ${dir}: ${error instanceof Error ? error.message : error}`);
    }

    return files;
  }

  private shouldIncludeFile(filePath: string): boolean {
    // Check exclude patterns first
    if (this.options.excludePatterns) {
      for (const pattern of this.options.excludePatterns) {
        if (this.matchesPattern(filePath, pattern)) {
          return false;
        }
      }
    }

    // Check include patterns
    const includePatterns = this.options.includePatterns || ['*.md', '*.txt', '*.prompt'];
    for (const pattern of includePatterns) {
      if (this.matchesPattern(filePath, pattern)) {
        return true;
      }
    }

    return false;
  }

  private matchesPattern(filePath: string, pattern: string): boolean {
    // Simple glob pattern matching
    const regex = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    
    return new RegExp(regex, 'i').test(filePath);
  }

  private async copyFile(sourcePath: string): Promise<boolean> {
    const relativePath = relative(this.options.source, sourcePath);
    const destPath = join(this.options.destination, relativePath);

    // Handle conflict resolution
    try {
      await fs.access(destPath);
      
      // File exists, handle based on conflict resolution strategy
      const strategy = this.options.conflictResolution || (this.options.overwrite ? 'overwrite' : 'skip');
      
      switch (strategy) {
        case 'skip':
          console.log(`Skipping existing file: ${relativePath}`);
          return false;
          
        case 'backup':
          const backupPath = `${destPath}.backup-${Date.now()}`;
          await fs.copyFile(destPath, backupPath);
          console.log(`Backed up existing file: ${relativePath}`);
          break;
          
        case 'overwrite':
          // Continue with copy
          break;
          
        case 'merge':
          // For now, treat as overwrite - could implement content merging
          console.log(`Merging file: ${relativePath}`);
          break;
      }
    } catch {
      // File doesn't exist, continue with copy
    }

    // Ensure destination directory exists
    await fs.mkdir(dirname(destPath), { recursive: true });

    // Copy the file and track bytes
    const sourceStats = await fs.stat(sourcePath);
    await fs.copyFile(sourcePath, destPath);
    this.totalBytes += sourceStats.size;
    
    console.log(`Copied: ${relativePath} (${sourceStats.size} bytes)`);
    return true;
  }

  async restoreFromBackup(backupPath: string): Promise<void> {
    if (!backupPath) {
      throw new Error('No backup path provided');
    }

    try {
      const backupFiles = await this.findFiles(backupPath);
      
      for (const file of backupFiles) {
        const relativePath = relative(backupPath, file);
        const restorePath = join(this.options.destination, relativePath);
        
        await fs.mkdir(dirname(restorePath), { recursive: true });
        await fs.copyFile(file, restorePath);
        console.log(`Restored: ${relativePath}`);
      }
      
      console.log(`Restored ${backupFiles.length} files from backup`);
    } catch (error) {
      throw new Error(`Failed to restore from backup: ${error instanceof Error ? error.message : error}`);
    }
  }
}

/**
 * Enterprise function to copy prompt files with comprehensive options
 */
export async function copyPrompts(options: CopyOptions): Promise<CopyResult> {
  const copier = new PromptCopier(options);
  return copier.copy();
}

/**
 * Copy prompts from .roo directory to destination with enterprise defaults
 */
export async function copyRooPrompts(destination = './prompts'): Promise<CopyResult> {
  return copyPrompts({
    source: './.roo',
    destination,
    overwrite: false,
    backup: true,
    verify: true,
    includePatterns: ['*.md', '*.txt', '*.prompt'],
    excludePatterns: ['**/node_modules/**', '**/.git/**', '**/README.md'],
    conflictResolution: 'backup'
  });
}