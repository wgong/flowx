import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface ExportOptions {
  format: 'csv' | 'json' | 'xml' | 'yaml' | 'xlsx' | 'chart';
  filename?: string;
  directory?: string;
  fields?: string[];
  includeHeaders?: boolean;
  compression?: boolean;
  timestamp?: boolean;
  metadata?: Record<string, any>;
  chartType?: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap';
  chartOptions?: ChartOptions;
}

export interface ChartOptions {
  title?: string;
  width?: number;
  height?: number;
  xAxis?: string;
  yAxis?: string;
  groupBy?: string;
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max';
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  format?: 'svg' | 'png' | 'html';
}

export interface ExportResult {
  success: boolean;
  filename: string;
  filepath: string;
  size: number;
  recordCount: number;
  duration: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface ExportTemplate {
  id: string;
  name: string;
  description?: string;
  options: ExportOptions;
  dataTransform?: (data: any[]) => any[];
  createdAt: Date;
  lastUsed: Date;
  useCount: number;
}

export interface BatchExportJob {
  id: string;
  name: string;
  exports: Array<{
    data: any[];
    options: ExportOptions;
    template?: string;
  }>;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  results: ExportResult[];
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

/**
 * Comprehensive data export service with multiple format support
 */
export class ExportService extends EventEmitter {
  private templates = new Map<string, ExportTemplate>();
  private batchJobs = new Map<string, BatchExportJob>();
  private defaultDirectory = './exports';

  constructor() {
    super();
    this.ensureExportDirectory();
    this.loadTemplates();
  }

  /**
   * Export data in specified format
   */
  async exportData<T>(data: T[], options: ExportOptions): Promise<ExportResult> {
    const startTime = Date.now();
    
    try {
      // Validate options
      this.validateExportOptions(options);
      
      // Generate filename if not provided
      const filename = this.generateFilename(options);
      const filepath = path.join(options.directory || this.defaultDirectory, filename);
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(filepath), { recursive: true });
      
      // Transform data if needed
      const transformedData = this.transformData(data, options);
      
      // Export based on format
      let content: string | Buffer;
      let actualFilename = filename;
      
      switch (options.format) {
        case 'csv':
          content = this.exportToCsv(transformedData, options);
          break;
        case 'json':
          content = this.exportToJson(transformedData, options);
          break;
        case 'xml':
          content = this.exportToXml(transformedData, options);
          break;
        case 'yaml':
          content = this.exportToYaml(transformedData, options);
          break;
        case 'xlsx':
          content = await this.exportToXlsx(transformedData, options);
          break;
        case 'chart':
          const chartResult = await this.exportToChart(transformedData, options);
          content = chartResult.content;
          actualFilename = chartResult.filename;
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
      
      // Write file
      await fs.writeFile(path.join(path.dirname(filepath), actualFilename), content);
      
      // Get file stats
      const stats = await fs.stat(path.join(path.dirname(filepath), actualFilename));
      
      const result: ExportResult = {
        success: true,
        filename: actualFilename,
        filepath: path.join(path.dirname(filepath), actualFilename),
        size: stats.size,
        recordCount: Array.isArray(transformedData) ? transformedData.length : 1,
        duration: Date.now() - startTime,
        metadata: {
          format: options.format,
          exportedAt: new Date().toISOString(),
          ...options.metadata
        }
      };
      
      this.emit('exportCompleted', result);
      return result;
      
    } catch (error) {
      const result: ExportResult = {
        success: false,
        filename: options.filename || 'unknown',
        filepath: '',
        size: 0,
        recordCount: 0,
        duration: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error)
      };
      
      this.emit('exportFailed', result);
      return result;
    }
  }

  /**
   * Export to CSV format
   */
  private exportToCsv(data: any[], options: ExportOptions): string {
    if (data.length === 0) return '';
    
    const fields = options.fields || Object.keys(data[0]);
    const lines: string[] = [];
    
    // Add headers
    if (options.includeHeaders !== false) {
      lines.push(fields.map(field => this.escapeCsvField(field)).join(','));
    }
    
    // Add data rows
    for (const item of data) {
      const row = fields.map(field => {
        const value = this.getFieldValue(item, field);
        return this.escapeCsvField(String(value || ''));
      });
      lines.push(row.join(','));
    }
    
    return lines.join('\n');
  }

  /**
   * Export to JSON format
   */
  private exportToJson(data: any[], options: ExportOptions): string {
    const exportData = {
      data,
      metadata: {
        exportedAt: new Date().toISOString(),
        recordCount: data.length,
        format: 'json',
        ...options.metadata
      }
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Export to XML format
   */
  private exportToXml(data: any[], options: ExportOptions): string {
    const lines = ['<?xml version="1.0" encoding="UTF-8"?>'];
    lines.push('<export>');
    lines.push(`  <metadata>`);
    lines.push(`    <exportedAt>${new Date().toISOString()}</exportedAt>`);
    lines.push(`    <recordCount>${data.length}</recordCount>`);
    lines.push(`    <format>xml</format>`);
    lines.push(`  </metadata>`);
    lines.push('  <data>');
    
    for (const item of data) {
      lines.push('    <record>');
      for (const [key, value] of Object.entries(item)) {
        const escapedValue = String(value || '').replace(/[<>&'"]/g, (char) => {
          switch (char) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case "'": return '&apos;';
            case '"': return '&quot;';
            default: return char;
          }
        });
        lines.push(`      <${key}>${escapedValue}</${key}>`);
      }
      lines.push('    </record>');
    }
    
    lines.push('  </data>');
    lines.push('</export>');
    
    return lines.join('\n');
  }

  /**
   * Export to YAML format
   */
  private exportToYaml(data: any[], options: ExportOptions): string {
    // Simple YAML export (in production, use a proper YAML library)
    const lines = ['# Exported data'];
    lines.push(`# Exported at: ${new Date().toISOString()}`);
    lines.push(`# Record count: ${data.length}`);
    lines.push('');
    lines.push('data:');
    
    for (let i = 0; i < data.length; i++) {
      lines.push(`  - # Record ${i + 1}`);
      for (const [key, value] of Object.entries(data[i])) {
        const yamlValue = typeof value === 'string' 
          ? `"${value.replace(/"/g, '\\"')}"` 
          : String(value);
        lines.push(`    ${key}: ${yamlValue}`);
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Export to Excel format (simplified)
   */
  private async exportToXlsx(data: any[], options: ExportOptions): Promise<Buffer> {
    // In a real implementation, use a library like 'xlsx' or 'exceljs'
    // For now, return CSV content as buffer
    const csvContent = this.exportToCsv(data, options);
    return Buffer.from(csvContent, 'utf8');
  }

  /**
   * Export to chart format
   */
  private async exportToChart(data: any[], options: ExportOptions): Promise<{ content: string | Buffer; filename: string }> {
    const chartOptions = options.chartOptions || {};
    const chartType = options.chartType || 'line';
    
    // Generate chart data
    const chartData = this.prepareChartData(data, chartOptions);
    
    // Generate chart based on format
    switch (chartOptions.format || 'html') {
      case 'html':
        const htmlContent = this.generateHtmlChart(chartData, chartType, chartOptions);
        return {
          content: htmlContent,
          filename: options.filename?.replace(/\.[^.]*$/, '.html') || 'chart.html'
        };
      
      case 'svg':
        const svgContent = this.generateSvgChart(chartData, chartType, chartOptions);
        return {
          content: svgContent,
          filename: options.filename?.replace(/\.[^.]*$/, '.svg') || 'chart.svg'
        };
      
      default:
        throw new Error(`Unsupported chart format: ${chartOptions.format}`);
    }
  }

  /**
   * Prepare data for chart generation
   */
  private prepareChartData(data: any[], options: ChartOptions): any {
    const xAxis = options.xAxis || Object.keys(data[0] || {})[0];
    const yAxis = options.yAxis || Object.keys(data[0] || {})[1];
    
    if (options.groupBy) {
      // Group and aggregate data
      const grouped = new Map<string, any[]>();
      
      for (const item of data) {
        const groupKey = String(this.getFieldValue(item, options.groupBy));
        if (!grouped.has(groupKey)) {
          grouped.set(groupKey, []);
        }
        grouped.get(groupKey)!.push(item);
      }
      
      const chartData = Array.from(grouped.entries()).map(([group, items]) => {
        let value = 0;
        
        switch (options.aggregation || 'sum') {
          case 'sum':
            value = items.reduce((sum, item) => sum + (Number(this.getFieldValue(item, yAxis)) || 0), 0);
            break;
          case 'avg':
            value = items.reduce((sum, item) => sum + (Number(this.getFieldValue(item, yAxis)) || 0), 0) / items.length;
            break;
          case 'count':
            value = items.length;
            break;
          case 'min':
            value = Math.min(...items.map(item => Number(this.getFieldValue(item, yAxis)) || 0));
            break;
          case 'max':
            value = Math.max(...items.map(item => Number(this.getFieldValue(item, yAxis)) || 0));
            break;
        }
        
        return { x: group, y: value };
      });
      
      return { data: chartData, xAxis, yAxis };
    }
    
    // Simple x,y mapping
    const chartData = data.map(item => ({
      x: this.getFieldValue(item, xAxis),
      y: Number(this.getFieldValue(item, yAxis)) || 0
    }));
    
    return { data: chartData, xAxis, yAxis };
  }

  /**
   * Generate HTML chart
   */
  private generateHtmlChart(chartData: any, type: string, options: ChartOptions): string {
    const title = options.title || 'Data Chart';
    const width = options.width || 800;
    const height = options.height || 400;
    
    // Simple HTML chart with inline SVG
    return `
<!DOCTYPE html>
<html>
<head>
    <title>${title}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .chart-container { border: 1px solid #ccc; padding: 20px; }
        .chart-title { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="chart-container">
        <div class="chart-title">${title}</div>
        ${this.generateSvgChart(chartData, type, { ...options, width, height })}
    </div>
</body>
</html>`;
  }

  /**
   * Generate SVG chart
   */
  private generateSvgChart(chartData: any, type: string, options: ChartOptions): string {
    const width = options.width || 800;
    const height = options.height || 400;
    const margin = 50;
    const chartWidth = width - 2 * margin;
    const chartHeight = height - 2 * margin;
    
    const data = chartData.data;
    if (data.length === 0) {
      return `<svg width="${width}" height="${height}"><text x="${width/2}" y="${height/2}" text-anchor="middle">No data available</text></svg>`;
    }
    
    // Calculate scales
    const xValues = data.map((d: any) => d.x);
    const yValues = data.map((d: any) => d.y);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    
    let svgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
    
    // Background
    svgContent += `<rect width="${width}" height="${height}" fill="white"/>`;
    
    // Grid
    if (options.showGrid !== false) {
      // Horizontal grid lines
      for (let i = 0; i <= 5; i++) {
        const y = margin + (chartHeight * i / 5);
        svgContent += `<line x1="${margin}" y1="${y}" x2="${width - margin}" y2="${y}" stroke="#f0f0f0" stroke-width="1"/>`;
      }
      
      // Vertical grid lines
      for (let i = 0; i <= 5; i++) {
        const x = margin + (chartWidth * i / 5);
        svgContent += `<line x1="${x}" y1="${margin}" x2="${x}" y2="${height - margin}" stroke="#f0f0f0" stroke-width="1"/>`;
      }
    }
    
    // Chart content based on type
    switch (type) {
      case 'line':
        const points = data.map((d: any, i: number) => {
          const x = margin + (chartWidth * i / (data.length - 1));
          const y = height - margin - (chartHeight * (d.y - yMin) / (yMax - yMin));
          return `${x},${y}`;
        }).join(' ');
        svgContent += `<polyline points="${points}" fill="none" stroke="blue" stroke-width="2"/>`;
        break;
        
      case 'bar':
        const barWidth = chartWidth / data.length * 0.8;
        data.forEach((d: any, i: number) => {
          const x = margin + (chartWidth * i / data.length) + (chartWidth / data.length - barWidth) / 2;
          const barHeight = chartHeight * (d.y - yMin) / (yMax - yMin);
          const y = height - margin - barHeight;
          svgContent += `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" fill="steelblue"/>`;
        });
        break;
        
      case 'scatter':
        data.forEach((d: any, i: number) => {
          const x = margin + (chartWidth * i / (data.length - 1));
          const y = height - margin - (chartHeight * (d.y - yMin) / (yMax - yMin));
          svgContent += `<circle cx="${x}" cy="${y}" r="4" fill="red"/>`;
        });
        break;
    }
    
    // Axes
    svgContent += `<line x1="${margin}" y1="${height - margin}" x2="${width - margin}" y2="${height - margin}" stroke="black" stroke-width="2"/>`;
    svgContent += `<line x1="${margin}" y1="${margin}" x2="${margin}" y2="${height - margin}" stroke="black" stroke-width="2"/>`;
    
    // Labels
    svgContent += `<text x="${width/2}" y="${height - 10}" text-anchor="middle" font-size="12">${chartData.xAxis}</text>`;
    svgContent += `<text x="20" y="${height/2}" text-anchor="middle" font-size="12" transform="rotate(-90 20 ${height/2})">${chartData.yAxis}</text>`;
    
    svgContent += '</svg>';
    return svgContent;
  }

  /**
   * Create export template
   */
  createTemplate(name: string, options: ExportOptions, description?: string): string {
    const id = `template-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    const template: ExportTemplate = {
      id,
      name,
      description,
      options,
      createdAt: new Date(),
      lastUsed: new Date(),
      useCount: 0
    };
    
    this.templates.set(id, template);
    this.persistTemplates();
    this.emit('templateCreated', template);
    
    return id;
  }

  /**
   * Use export template
   */
  async exportWithTemplate<T>(data: T[], templateId: string, overrides?: Partial<ExportOptions>): Promise<ExportResult> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }
    
    template.lastUsed = new Date();
    template.useCount++;
    this.persistTemplates();
    
    const options = { ...template.options, ...overrides };
    
    // Apply data transformation if defined
    const transformedData = template.dataTransform ? template.dataTransform(data) : data;
    
    return this.exportData(transformedData, options);
  }

  /**
   * Create batch export job
   */
  createBatchJob(name: string, exports: Array<{ data: any[]; options: ExportOptions; template?: string }>): string {
    const id = `batch-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    
    const job: BatchExportJob = {
      id,
      name,
      exports,
      status: 'pending',
      progress: 0,
      results: []
    };
    
    this.batchJobs.set(id, job);
    this.emit('batchJobCreated', job);
    
    return id;
  }

  /**
   * Execute batch export job
   */
  async executeBatchJob(jobId: string): Promise<BatchExportJob> {
    const job = this.batchJobs.get(jobId);
    if (!job) {
      throw new Error(`Batch job not found: ${jobId}`);
    }
    
    job.status = 'running';
    job.startTime = new Date();
    job.progress = 0;
    job.results = [];
    
    this.emit('batchJobStarted', job);
    
    try {
      for (let i = 0; i < job.exports.length; i++) {
        const exportItem = job.exports[i];
        
        let result: ExportResult;
        if (exportItem.template) {
          result = await this.exportWithTemplate(exportItem.data, exportItem.template, exportItem.options);
        } else {
          result = await this.exportData(exportItem.data, exportItem.options);
        }
        
        job.results.push(result);
        job.progress = ((i + 1) / job.exports.length) * 100;
        
        this.emit('batchJobProgress', { job, progress: job.progress, currentResult: result });
      }
      
      job.status = 'completed';
      job.endTime = new Date();
      
      this.emit('batchJobCompleted', job);
      
    } catch (error) {
      job.status = 'failed';
      job.endTime = new Date();
      job.error = error instanceof Error ? error.message : String(error);
      
      this.emit('batchJobFailed', job);
    }
    
    return job;
  }

  /**
   * Get export templates
   */
  getTemplates(): ExportTemplate[] {
    return Array.from(this.templates.values())
      .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());
  }

  /**
   * Get batch jobs
   */
  getBatchJobs(): BatchExportJob[] {
    return Array.from(this.batchJobs.values())
      .sort((a, b) => (b.startTime?.getTime() || 0) - (a.startTime?.getTime() || 0));
  }

  /**
   * Get export statistics
   */
  getExportStats(): {
    totalExports: number;
    templates: number;
    batchJobs: number;
    completedJobs: number;
    totalSize: number;
  } {
    const allResults = Array.from(this.batchJobs.values())
      .flatMap(job => job.results);
    
    return {
      totalExports: allResults.length,
      templates: this.templates.size,
      batchJobs: this.batchJobs.size,
      completedJobs: Array.from(this.batchJobs.values()).filter(job => job.status === 'completed').length,
      totalSize: allResults.reduce((sum, result) => sum + result.size, 0)
    };
  }

  // Helper methods

  private validateExportOptions(options: ExportOptions): void {
    const supportedFormats = ['csv', 'json', 'xml', 'yaml', 'xlsx', 'chart'];
    if (!supportedFormats.includes(options.format)) {
      throw new Error(`Unsupported format: ${options.format}`);
    }
    
    if (options.format === 'chart' && !options.chartType) {
      throw new Error('Chart type is required for chart exports');
    }
  }

  private generateFilename(options: ExportOptions): string {
    if (options.filename) {
      return options.filename;
    }
    
    const timestamp = options.timestamp !== false ? `-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}` : '';
    const extension = this.getFileExtension(options.format, options.chartOptions?.format);
    
    return `export${timestamp}.${extension}`;
  }

  private getFileExtension(format: string, chartFormat?: string): string {
    switch (format) {
      case 'csv': return 'csv';
      case 'json': return 'json';
      case 'xml': return 'xml';
      case 'yaml': return 'yml';
      case 'xlsx': return 'xlsx';
      case 'chart': return chartFormat || 'html';
      default: return 'txt';
    }
  }

  private transformData(data: any[], options: ExportOptions): any[] {
    if (!options.fields) {
      return data;
    }
    
    return data.map(item => {
      const transformed: any = {};
      for (const field of options.fields!) {
        transformed[field] = this.getFieldValue(item, field);
      }
      return transformed;
    });
  }

  private getFieldValue(obj: any, field: string): any {
    return field.split('.').reduce((current, key) => current?.[key], obj);
  }

  private escapeCsvField(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  private async ensureExportDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.defaultDirectory, { recursive: true });
    } catch (error) {
      console.warn('Failed to create export directory:', error);
    }
  }

  private loadTemplates(): void {
    // In a real implementation, load from file or database
  }

  private persistTemplates(): void {
    // In a real implementation, save to file or database
    this.emit('templatesPersisted', Array.from(this.templates.values()));
  }
}

// Global export service instance
let exportServiceInstance: ExportService | null = null;

export function getExportService(): ExportService {
  if (!exportServiceInstance) {
    exportServiceInstance = new ExportService();
  }
  return exportServiceInstance;
} 