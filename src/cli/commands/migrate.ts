/**
 * Migration CLI Command Integration
 */

import { Command, CommandContext } from "../cli-core.ts";
import { MigrationRunner } from '../../migration/migration-runner.ts';
import { MigrationAnalyzer } from '../../migration/migration-analyzer.ts';
import { RollbackManager } from '../../migration/rollback-manager.ts';
import { MigrationStrategy } from '../../migration/types.ts';
import { logger } from '../../migration/logger.ts';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { colors } from '../../utils/colors.ts';

export function createMigrateCommand(): Command {
  return {
    name: 'migrate',
    description: 'Migrate existing claude-flow projects to optimized prompts',
    options: [
      { name: 'path', short: 'p', description: 'Project path', type: 'string', default: '.' },
      { name: 'strategy', short: 's', description: 'Migration strategy: full, selective, merge', type: 'string', default: 'selective' },
      { name: 'backup', short: 'b', description: 'Backup directory', type: 'string', default: '.claude-backup' },
      { name: 'force', short: 'f', description: 'Force migration without prompts', type: 'boolean' },
      { name: 'dry-run', description: 'Simulate migration without making changes', type: 'boolean' },
      { name: 'preserve-custom', description: 'Preserve custom commands and configurations', type: 'boolean' },
      { name: 'skip-validation', description: 'Skip post-migration validation', type: 'boolean' },
      { name: 'analyze-only', description: 'Only analyze project without migrating', type: 'boolean' },
      { name: 'verbose', description: 'Show detailed output', type: 'boolean' },
      // analyze subcommand options
      { name: 'detailed', short: 'd', description: 'Show detailed analysis', type: 'boolean' },
      { name: 'output', short: 'o', description: 'Output analysis to file', type: 'string' },
      // rollback subcommand options
      { name: 'timestamp', short: 't', description: 'Restore from specific timestamp', type: 'string' },
      { name: 'list', description: 'List available backups', type: 'boolean' },
    ],
    action: async (ctx: CommandContext) => {
      const subcommand = ctx.args[0];
      const projectPath = path.resolve(ctx.flags.path as string || '.');

      try {
        switch (subcommand) {
          case 'analyze':
            await analyzeProject(projectPath, ctx.flags);
            break;
          case 'rollback':
            const rollbackManager = new RollbackManager(projectPath, ctx.flags.backup as string);
            if (ctx.flags.list) {
              const backups = await rollbackManager.listBackups();
              rollbackManager.printBackupSummary(backups);
              return;
            }
            await rollbackManager.rollback(ctx.flags.timestamp as string, !ctx.flags.force);
            break;
          case 'validate':
            const runner = new MigrationRunner({
              projectPath: projectPath,
              strategy: 'full'
            });
            const isValid = await runner.validate(ctx.flags.verbose as boolean);
            process.exit(isValid ? 0 : 1);
            break;
          case 'status':
            await showMigrationStatus(projectPath);
            break;
          default:
            if (ctx.flags.analyzeOnly) {
              await analyzeProject(projectPath, ctx.flags);
            } else {
              await runMigration(projectPath, ctx.flags);
            }
        }
      } catch (error) {
        logger.error('Migration command failed:', error);
        process.exit(1);
      }
    },
  };
}

async function analyzeProject(projectPath: string, options: any): Promise<void> {
  logger.info(`Analyzing project at ${projectPath}...`);
  
  const analyzer = new MigrationAnalyzer();
  const analysis = await analyzer.analyze(projectPath);
  
  if (options.output) {
    await analyzer.saveAnalysis(analysis, options.output);
    logger.success(`Analysis saved to ${options.output}`);
  }
  
  analyzer.printAnalysis(analysis, options.detailed || options.verbose);
}

async function runMigration(projectPath: string, options: any): Promise<void> {
  const runner = new MigrationRunner({
    projectPath,
    strategy: options.strategy as MigrationStrategy,
    backupDir: options.backup,
    force: options.force,
    dryRun: options.dryRun,
    preserveCustom: options.preserveCustom,
    skipValidation: options.skipValidation
  });
  
  const result = await runner.run();
  
  if (!result.success) {
    process.exit(1);
  }
}

async function showMigrationStatus(projectPath: string): Promise<void> {
  console.log(colors.bold('\n📊 Migration Status'));
  console.log(colors.gray('─'.repeat(50)));
  
  // Project analysis
  const analyzer = new MigrationAnalyzer();
  const analysis = await analyzer.analyze(projectPath);
  
  console.log(`\n${colors.bold('Project:')} ${projectPath}`);
  console.log(`${colors.bold('Status:')} ${analysis.hasOptimizedPrompts ? colors.hex("#00AA00")('Migrated') : colors.hex("#FFAA00")('Not Migrated')}`);
  console.log(`${colors.bold('Custom Commands:')} ${analysis.customCommands.length}`);
  console.log(`${colors.bold('Conflicts:')} ${analysis.conflictingFiles.length}`);
  
  // Backup status
  const rollbackManager = new RollbackManager(projectPath);
  const backups = await rollbackManager.listBackups();
  
  console.log(`\n${colors.bold('Backups Available:')} ${backups.length}`);
  
  if (backups.length > 0) {
    const latestBackup = backups[0];
    console.log(`${colors.bold('Latest Backup:')} ${latestBackup.timestamp.toLocaleString()}`);
  }
  
  // Recommendations
  if (!analysis.hasOptimizedPrompts) {
    console.log(colors.bold('\n💡 Recommendations:'));
    console.log('  • Run migration analysis: claude-flow migrate analyze');
    console.log('  • Start with dry run: claude-flow migrate --dry-run');
    console.log('  • Use selective strategy: claude-flow migrate --strategy selective');
  }
  
  console.log(colors.gray('\n' + '─'.repeat(50)));
}