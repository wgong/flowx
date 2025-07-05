/**
 * Compare Command
 * Performance comparison and regression detection
 */

import type { CLICommand, CLIContext } from '../../interfaces/index.ts';
import { formatTable, successBold, infoBold, warningBold, errorBold, printSuccess, printError, printWarning, printInfo } from '../../core/output-formatter.ts';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ComparisonResult {
  metric: string;
  baseline: number;
  current: number;
  change: number;
  changePercent: number;
  status: 'improved' | 'degraded' | 'stable';
  threshold?: number;
}

interface BenchmarkData {
  timestamp: Date;
  version: string;
  metrics: Record<string, number>;
  environment: {
    platform: string;
    nodeVersion: string;
    memory: number;
    cpu: string;
  };
}

export const compareCommand: CLICommand = {
  name: 'compare',
  description: 'Compare performance metrics and detect regressions',
  category: 'System',
  usage: 'claude-flow compare <subcommand> [OPTIONS]',
  examples: [
    'claude-flow compare baseline --file baseline.json',
    'claude-flow compare current --baseline baseline.json',
    'claude-flow compare versions --from v1.0 --to v2.0',
    'claude-flow compare regression --threshold 10',
    'claude-flow compare trends --period 7d'
  ],
  options: [
    {
      name: 'baseline',
      short: 'b',
      description: 'Baseline file or version',
      type: 'string'
    },
    {
      name: 'current',
      short: 'c',
      description: 'Current metrics file',
      type: 'string'
    },
    {
      name: 'threshold',
      short: 't',
      description: 'Regression threshold percentage',
      type: 'number',
      default: 5
    },
    {
      name: 'format',
      short: 'f',
      description: 'Output format (table, json, report)',
      type: 'string',
      default: 'table'
    },
    {
      name: 'output',
      short: 'o',
      description: 'Output file path',
      type: 'string'
    },
    {
      name: 'metrics',
      short: 'm',
      description: 'Specific metrics to compare (comma-separated)',
      type: 'string'
    },
    {
      name: 'period',
      short: 'p',
      description: 'Time period for trend comparison',
      type: 'string',
      default: '7d'
    }
  ],
  subcommands: [
    {
      name: 'baseline',
      description: 'Create or update performance baseline',
      handler: async (context: CLIContext) => await createBaseline(context)
    },
    {
      name: 'current',
      description: 'Compare current metrics against baseline',
      handler: async (context: CLIContext) => await compareAgainstBaseline(context)
    },
    {
      name: 'versions',
      description: 'Compare performance between versions',
      handler: async (context: CLIContext) => await compareVersions(context)
    },
    {
      name: 'regression',
      description: 'Detect performance regressions',
      handler: async (context: CLIContext) => await detectRegressions(context)
    },
    {
      name: 'trends',
      description: 'Compare performance trends over time',
      handler: async (context: CLIContext) => await compareTrends(context)
    },
    {
      name: 'environments',
      description: 'Compare performance across environments',
      handler: async (context: CLIContext) => await compareEnvironments(context)
    }
  ],
  handler: async (context: CLIContext) => {
    const { args } = context;
    
    if (args.length === 0) {
      await compareAgainstBaseline(context);
      return;
    }
    
    printError('Invalid subcommand. Use "claude-flow compare --help" for usage information.');
  }
};

async function createBaseline(context: CLIContext): Promise<void> {
  const { options } = context;
  
  try {
    printInfo('📊 Creating performance baseline...');
    
    const currentMetrics = await getCurrentMetrics();
    const baseline: BenchmarkData = {
      timestamp: new Date(),
      version: await getSystemVersion(),
      metrics: currentMetrics,
      environment: await getEnvironmentInfo()
    };
    
    const baselineFile = options.file || 'performance-baseline.json';
    await fs.writeFile(baselineFile, JSON.stringify(baseline, null, 2));
    
    printSuccess(`✅ Baseline created: ${baselineFile}`);
    
    console.log(infoBold('\n📊 Baseline Metrics:\n'));
    Object.entries(baseline.metrics).forEach(([key, value]) => {
      console.log(`  ${key}: ${formatMetricValue(key, value)}`);
    });
    
  } catch (error) {
    printError(`Failed to create baseline: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function compareAgainstBaseline(context: CLIContext): Promise<void> {
  const { options } = context;
  
  try {
    const baselineFile = options.baseline || 'performance-baseline.json';
    
    printInfo(`🔍 Comparing against baseline: ${baselineFile}`);
    
    const baseline = await loadBenchmarkData(baselineFile);
    const current = await getCurrentMetrics();
    
    const comparisons = await performComparison(baseline.metrics, current, options.threshold);
    
    if (options.format === 'json') {
      console.log(JSON.stringify(comparisons, null, 2));
    } else if (options.format === 'report') {
      await generateComparisonReport(comparisons, baseline, options.output);
    } else {
      displayComparisonResults(comparisons, baseline);
    }
    
    const regressions = comparisons.filter(c => c.status === 'degraded');
    if (regressions.length > 0) {
      printWarning(`⚠️  ${regressions.length} performance regressions detected`);
      process.exit(1);
    } else {
      printSuccess('✅ No performance regressions detected');
    }
    
  } catch (error) {
    printError(`Failed to compare against baseline: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function compareVersions(context: CLIContext): Promise<void> {
  const { options } = context;
  
  try {
    printInfo('🔍 Comparing versions...');
    
    const fromVersion = options.from;
    const toVersion = options.to;
    
    if (!fromVersion || !toVersion) {
      printError('Both --from and --to versions are required');
      return;
    }
    
    const fromData = await loadVersionData(fromVersion);
    const toData = await loadVersionData(toVersion);
    
    const comparisons = await performComparison(fromData.metrics, toData.metrics, options.threshold);
    
    console.log(infoBold(`\n📊 Version Comparison: ${fromVersion} → ${toVersion}\n`));
    
    displayComparisonResults(comparisons, fromData, toData);
    
  } catch (error) {
    printError(`Failed to compare versions: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function detectRegressions(context: CLIContext): Promise<void> {
  const { options } = context;
  
  try {
    printInfo('🔍 Detecting performance regressions...');
    
    const baselineFile = options.baseline || 'performance-baseline.json';
    const baseline = await loadBenchmarkData(baselineFile);
    const current = await getCurrentMetrics();
    
    const comparisons = await performComparison(baseline.metrics, current, options.threshold);
    const regressions = comparisons.filter(c => c.status === 'degraded');
    
    if (regressions.length === 0) {
      printSuccess('✅ No performance regressions detected');
      return;
    }
    
    console.log(errorBold(`\n🚨 Performance Regressions Detected (${regressions.length})\n`));
    
    const tableData = regressions.map(r => ({
      metric: r.metric,
      baseline: formatMetricValue(r.metric, r.baseline),
      current: formatMetricValue(r.metric, r.current),
      change: `${r.changePercent > 0 ? '+' : ''}${r.changePercent.toFixed(1)}%`,
      impact: getImpactLevel(r.changePercent)
    }));
    
    console.log(formatTable(tableData, [
      { header: 'Metric', key: 'metric' },
      { header: 'Baseline', key: 'baseline' },
      { header: 'Current', key: 'current' },
      { header: 'Change', key: 'change' },
      { header: 'Impact', key: 'impact' }
    ]));
    
    printWarning(`\n⚠️  Regression threshold: ${options.threshold}%`);
    
  } catch (error) {
    printError(`Failed to detect regressions: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function compareTrends(context: CLIContext): Promise<void> {
  const { options } = context;
  
  try {
    printInfo('📈 Comparing performance trends...');
    
    const trends = await getPerformanceTrends(options.period);
    
    console.log(infoBold('\n📈 Performance Trends Comparison\n'));
    
    trends.forEach(trend => {
      const arrow = trend.direction === 'improving' ? '📈' : 
                   trend.direction === 'degrading' ? '📉' : '➡️';
      const color = trend.direction === 'improving' ? successBold : 
                   trend.direction === 'degrading' ? errorBold : infoBold;
      
      console.log(`${arrow} ${trend.metric}: ${color(trend.change)} over ${options.period}`);
      if (trend.confidence) {
        console.log(`   Confidence: ${trend.confidence}%`);
      }
    });
    
  } catch (error) {
    printError(`Failed to compare trends: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function compareEnvironments(context: CLIContext): Promise<void> {
  const { options } = context;
  
  try {
    printInfo('🌍 Comparing environments...');
    
    const environments = await getEnvironmentComparisons();
    
    console.log(infoBold('\n🌍 Environment Performance Comparison\n'));
    
    const tableData = environments.map(env => ({
      environment: env.name,
      responseTime: `${env.avgResponseTime}ms`,
      throughput: `${env.throughput}/s`,
      errorRate: `${env.errorRate}%`,
      availability: `${env.availability}%`
    }));
    
    console.log(formatTable(tableData, [
      { header: 'Environment', key: 'environment' },
      { header: 'Response Time', key: 'responseTime' },
      { header: 'Throughput', key: 'throughput' },
      { header: 'Error Rate', key: 'errorRate' },
      { header: 'Availability', key: 'availability' }
    ]));
    
  } catch (error) {
    printError(`Failed to compare environments: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Helper functions

async function getCurrentMetrics(): Promise<Record<string, number>> {
  // Mock implementation - would collect actual system metrics
  return {
    responseTime: 150 + Math.random() * 50,
    throughput: 1000 + Math.random() * 200,
    memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024,
    cpuUsage: Math.random() * 100,
    errorRate: Math.random() * 5,
    uptime: process.uptime()
  };
}

async function getSystemVersion(): Promise<string> {
  try {
    const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
    return packageJson.version || '1.0.0';
  } catch {
    return '1.0.0';
  }
}

async function getEnvironmentInfo(): Promise<any> {
  return {
    platform: process.platform,
    nodeVersion: process.version,
    memory: process.memoryUsage().heapTotal,
    cpu: process.arch
  };
}

async function loadBenchmarkData(filePath: string): Promise<BenchmarkData> {
  const content = await fs.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

async function loadVersionData(version: string): Promise<BenchmarkData> {
  const filePath = `benchmarks/${version}.json`;
  return await loadBenchmarkData(filePath);
}

async function performComparison(
  baseline: Record<string, number>,
  current: Record<string, number>,
  threshold: number
): Promise<ComparisonResult[]> {
  const results: ComparisonResult[] = [];
  
  for (const [metric, baselineValue] of Object.entries(baseline)) {
    const currentValue = current[metric];
    if (currentValue === undefined) continue;
    
    const change = currentValue - baselineValue;
    const changePercent = (change / baselineValue) * 100;
    
    let status: 'improved' | 'degraded' | 'stable';
    if (Math.abs(changePercent) < threshold) {
      status = 'stable';
    } else if (isImprovementMetric(metric)) {
      status = changePercent > 0 ? 'improved' : 'degraded';
    } else {
      status = changePercent < 0 ? 'improved' : 'degraded';
    }
    
    results.push({
      metric,
      baseline: baselineValue,
      current: currentValue,
      change,
      changePercent,
      status,
      threshold
    });
  }
  
  return results;
}

function isImprovementMetric(metric: string): boolean {
  const improvementMetrics = ['throughput', 'uptime', 'availability'];
  return improvementMetrics.includes(metric);
}

function displayComparisonResults(
  comparisons: ComparisonResult[],
  baseline: BenchmarkData,
  current?: BenchmarkData
): void {
  console.log(infoBold('\n📊 Performance Comparison Results\n'));
  
  console.log(`Baseline: ${baseline.timestamp} (${baseline.version})`);
  if (current) {
    console.log(`Current: ${current.timestamp} (${current.version})`);
  }
  
  const tableData = comparisons.map(c => ({
    metric: c.metric,
    baseline: formatMetricValue(c.metric, c.baseline),
    current: formatMetricValue(c.metric, c.current),
    change: `${c.changePercent > 0 ? '+' : ''}${c.changePercent.toFixed(1)}%`,
    status: getStatusDisplay(c.status)
  }));
  
  console.log(formatTable(tableData, [
    { header: 'Metric', key: 'metric' },
    { header: 'Baseline', key: 'baseline' },
    { header: 'Current', key: 'current' },
    { header: 'Change', key: 'change' },
    { header: 'Status', key: 'status' }
  ]));
  
  const summary = getSummary(comparisons);
  console.log(`\nSummary: ${summary.improved} improved, ${summary.degraded} degraded, ${summary.stable} stable`);
}

async function generateComparisonReport(
  comparisons: ComparisonResult[],
  baseline: BenchmarkData,
  outputPath?: string
): Promise<void> {
  const report = `
# Performance Comparison Report

**Baseline:** ${baseline.timestamp} (${baseline.version})
**Generated:** ${new Date().toISOString()}

## Results Summary

${comparisons.map(c => `
### ${c.metric}
- **Baseline:** ${formatMetricValue(c.metric, c.baseline)}
- **Current:** ${formatMetricValue(c.metric, c.current)}
- **Change:** ${c.changePercent > 0 ? '+' : ''}${c.changePercent.toFixed(1)}%
- **Status:** ${c.status}
`).join('\n')}

## Environment Information
- **Platform:** ${baseline.environment.platform}
- **Node Version:** ${baseline.environment.nodeVersion}
- **Memory:** ${formatBytes(baseline.environment.memory)}
`;

  if (outputPath) {
    await fs.writeFile(outputPath, report);
    printSuccess(`Report saved to ${outputPath}`);
  } else {
    console.log(report);
  }
}

async function getPerformanceTrends(period: string): Promise<any[]> {
  // Mock implementation - would analyze historical data
  return [
    {
      metric: 'Response Time',
      direction: 'improving',
      change: '-12%',
      confidence: 95
    },
    {
      metric: 'Memory Usage',
      direction: 'degrading',
      change: '+8%',
      confidence: 87
    },
    {
      metric: 'Throughput',
      direction: 'stable',
      change: '+2%',
      confidence: 92
    }
  ];
}

async function getEnvironmentComparisons(): Promise<any[]> {
  // Mock implementation - would compare actual environments
  return [
    {
      name: 'Development',
      avgResponseTime: 180,
      throughput: 800,
      errorRate: 0.5,
      availability: 99.2
    },
    {
      name: 'Staging',
      avgResponseTime: 150,
      throughput: 950,
      errorRate: 0.3,
      availability: 99.5
    },
    {
      name: 'Production',
      avgResponseTime: 120,
      throughput: 1200,
      errorRate: 0.1,
      availability: 99.9
    }
  ];
}

function formatMetricValue(metric: string, value: number): string {
  switch (metric) {
    case 'responseTime':
      return `${value.toFixed(0)}ms`;
    case 'throughput':
      return `${value.toFixed(0)}/s`;
    case 'memoryUsage':
      return `${value.toFixed(1)}MB`;
    case 'cpuUsage':
      return `${value.toFixed(1)}%`;
    case 'errorRate':
      return `${value.toFixed(2)}%`;
    case 'uptime':
      return `${(value / 3600).toFixed(1)}h`;
    default:
      return value.toFixed(2);
  }
}

function getStatusDisplay(status: string): string {
  switch (status) {
    case 'improved':
      return '✅ Improved';
    case 'degraded':
      return '❌ Degraded';
    case 'stable':
      return '➡️ Stable';
    default:
      return status;
  }
}

function getImpactLevel(changePercent: number): string {
  const abs = Math.abs(changePercent);
  if (abs < 5) return 'Low';
  if (abs < 15) return 'Medium';
  return 'High';
}

function getSummary(comparisons: ComparisonResult[]): any {
  return {
    improved: comparisons.filter(c => c.status === 'improved').length,
    degraded: comparisons.filter(c => c.status === 'degraded').length,
    stable: comparisons.filter(c => c.status === 'stable').length
  };
}

function formatBytes(bytes: number): string {
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
} 