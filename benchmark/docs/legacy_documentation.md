# Legacy Documentation

This file contains consolidated documentation from older versions.

## From README.md

# Swarm Benchmark Documentation

Welcome to the comprehensive documentation for the Claude Flow Swarm Benchmarking Tool. This documentation covers everything you need to know about benchmarking, optimizing, and analyzing swarm performance.

## 📚 Documentation Index

### Getting Started
- [Quick Start Guide](quick-start.md) - Get up and running in 5 minutes
- [Installation Guide](installation.md) - Detailed installation instructions
- [Basic Usage](basic-usage.md) - Essential commands and workflows

### Core Concepts
- [Benchmark Architecture](architecture.md) - System design and components
- [Swarm Strategies](strategies.md) - Detailed guide to all 7 strategies
- [Coordination Modes](coordination-modes.md) - Understanding the 5 coordination patterns

### Usage Guides
- [CLI Reference](cli-reference.md) - Complete command-line interface documentation
- [Configuration Guide](configuration.md) - Customizing benchmark behavior
- [Output Formats](output-formats.md) - Understanding benchmark results

### Optimization
- [Performance Optimization Guide](optimization-guide.md) - Improving swarm performance
- [Benchmark Analysis](analysis.md) - Interpreting benchmark results
- [Best Practices](best-practices.md) - Recommendations for optimal performance

### Advanced Topics
- [Custom Strategies](custom-strategies.md) - Creating your own strategies
- [Integration Guide](integration.md) - Integrating with Claude Flow
- [Troubleshooting](troubleshooting.md) - Common issues and solutions

## 🚀 Quick Links

- **Run your first benchmark**: `swarm-benchmark run "Your task here"`
- **View available strategies**: `swarm-benchmark list strategies`
- **Check recent results**: `swarm-benchmark list`
- **Get help**: `swarm-benchmark --help`

## 📊 What is Swarm Benchmarking?

The Swarm Benchmarking Tool is designed to measure, analyze, and optimize the performance of agent swarms in the Claude Flow system. It provides:

- **Performance Metrics**: Execution time, resource usage, success rates
- **Quality Assessment**: Accuracy, completeness, and consistency scores
- **Coordination Analysis**: Overhead and efficiency of different coordination patterns
- **Optimization Insights**: Recommendations for improving swarm performance

## 🎯 Key Features

1. **7 Swarm Strategies**: Auto, Research, Development, Analysis, Testing, Optimization, Maintenance
2. **5 Coordination Modes**: Centralized, Distributed, Hierarchical, Mesh, Hybrid
3. **Multiple Output Formats**: JSON, SQLite, CSV, HTML reports
4. **Real-time Monitoring**: Track swarm execution in real-time
5. **Comprehensive Metrics**: Performance, quality, and resource utilization tracking

## 📖 How to Use This Documentation

1. **New Users**: Start with the [Quick Start Guide](quick-start.md)
2. **Developers**: Review the [Architecture](architecture.md) and [API Reference](api-reference.md)
3. **Performance Tuning**: See the [Optimization Guide](optimization-guide.md)
4. **Troubleshooting**: Check the [Troubleshooting Guide](troubleshooting.md)

## 🤝 Contributing

We welcome contributions! See our [Contributing Guide](contributing.md) for details on:
- Reporting issues
- Suggesting improvements
- Submitting pull requests
- Adding new strategies or modes

## 📞 Support

- **GitHub Issues**: Report bugs and request features
- **Documentation**: This comprehensive guide
- **Examples**: See the `examples/` directory for sample benchmarks

---

© 2024 Claude Flow Team | [License](../LICENSE) | [Code of Conduct](code-of-conduct.md)

---

## From analysis.md

# Benchmark Analysis Guide

Learn how to analyze and interpret benchmark results to optimize your swarm performance.

## 📊 Understanding Benchmark Results

### Result Structure

Each benchmark produces a comprehensive result structure:

```json
{
  "benchmark_id": "uuid",
  "name": "benchmark-name",
  "status": "completed",
  "duration": 0.25,
  "config": { ... },
  "tasks": [ ... ],
  "results": [ ... ],
  "metrics": {
    "performance_metrics": { ... },
    "quality_metrics": { ... },
    "resource_usage": { ... },
    "coordination_metrics": { ... }
  }
}
```

### Key Metrics Explained

#### Performance Metrics
- **execution_time**: Total time to complete the task (seconds)
- **queue_time**: Time spent waiting in queue
- **throughput**: Tasks completed per second
- **coordination_overhead**: Time spent on agent coordination
- **communication_latency**: Average inter-agent communication delay

#### Quality Metrics
- **accuracy_score**: How accurate the results are (0-1)
- **completeness_score**: How complete the solution is (0-1)
- **consistency_score**: Consistency across multiple runs (0-1)
- **relevance_score**: How relevant the output is to the objective (0-1)
- **overall_quality**: Weighted average of all quality metrics (0-1)

#### Resource Metrics
- **cpu_percent**: CPU usage percentage
- **memory_mb**: Memory usage in megabytes
- **peak_memory_mb**: Maximum memory used
- **network_bytes**: Total network traffic
- **resource_efficiency**: Resource utilization efficiency (0-1)

## 🔍 Analysis Commands

### Basic Analysis

```bash
# Analyze a specific benchmark
swarm-benchmark analyze <benchmark-id>

# Example output:
# Performance Summary:
# - Execution Time: 0.25s
# - Success Rate: 95%
# - Average Quality: 0.87
# - Resource Efficiency: 0.82
```

### Detailed Analysis

```bash
# Comprehensive analysis
swarm-benchmark analyze <benchmark-id> --detailed

# Specific analysis types
swarm-benchmark analyze <benchmark-id> --type performance
swarm-benchmark analyze <benchmark-id> --type quality
swarm-benchmark analyze <benchmark-id> --type resource
swarm-benchmark analyze <benchmark-id> --type coordination
```

### Comparative Analysis

```bash
# Compare multiple benchmarks
swarm-benchmark compare id1 id2 id3

# Compare specific metrics
swarm-benchmark compare id1 id2 --metrics execution_time,quality_score

# Visual comparison
swarm-benchmark compare id1 id2 --format chart --export comparison.png
```

## 📈 Performance Analysis

### Execution Time Breakdown

Understand where time is spent:

```python
# Time distribution analysis
total_time = benchmark.duration
execution_time = sum(r.execution_time for r in results)
coordination_time = sum(r.coordination_overhead for r in results)
queue_time = sum(r.queue_time for r in results)

print(f"Execution: {execution_time/total_time*100:.1f}%")
print(f"Coordination: {coordination_time/total_time*100:.1f}%")
print(f"Queue: {queue_time/total_time*100:.1f}%")
```

### Identifying Bottlenecks

```bash
# Find performance bottlenecks
swarm-benchmark analyze <id> --bottlenecks

# Output:
# Performance Bottlenecks:
# 1. High coordination overhead (18% of total time)
#    - Consider switching from mesh to hierarchical mode
# 2. Long queue times for analysis tasks
#    - Increase agent pool size or use parallel execution
# 3. Memory peaks during data processing
#    - Enable streaming or batch processing
```

### Performance Trends

Track performance over time:

```bash
# Analyze performance trends
swarm-benchmark analyze --trend --strategy development --days 7

# Generate trend report
swarm-benchmark report --type trends --period weekly
```

## 🎯 Quality Analysis

### Quality Score Components

Understanding quality metrics:

```
Overall Quality = (
    accuracy_score * 0.35 +
    completeness_score * 0.30 +
    consistency_score * 0.20 +
    relevance_score * 0.15
)
```

### Improving Quality Scores

```bash
# Analyze quality issues
swarm-benchmark analyze <id> --quality-breakdown

# Example output:
# Quality Analysis:
# - Accuracy: 0.92 ✅
# - Completeness: 0.78 ⚠️  (Missing test cases)
# - Consistency: 0.85 ✓
# - Relevance: 0.90 ✅
# 
# Recommendations:
# 1. Increase max_retries for better completeness
# 2. Enable review mode for consistency
# 3. Use more specific objectives for relevance
```

### Quality Comparison

```bash
# Compare quality across strategies
swarm-benchmark analyze --compare-quality \
  --strategies research,development,analysis

# Quality by coordination mode
swarm-benchmark analyze --quality-by-mode \
  --task-type "API development"
```

## 💻 Resource Analysis

### Resource Utilization Patterns

```bash
# Detailed resource analysis
swarm-benchmark analyze <id> --resource-details

# Resource usage over time
swarm-benchmark analyze <id> --resource-timeline --export resources.csv
```

### Resource Efficiency Metrics

```python
# Calculate resource efficiency
resource_efficiency = (
    (tasks_completed / total_tasks) * 
    (1 - (avg_cpu_usage / 100)) * 
    (1 - (avg_memory_usage / memory_limit))
)
```

### Optimization Recommendations

```bash
# Get resource optimization suggestions
swarm-benchmark analyze <id> --optimize-resources

# Example output:
# Resource Optimization Suggestions:
# 1. CPU Usage: 85% average (high)
#    - Consider increasing task_timeout
#    - Use distributed mode to spread load
# 2. Memory Usage: 450MB/1024MB
#    - Optimal, no changes needed
# 3. Network: 15MB transferred
#    - Enable compression for large data
```

## 🔗 Coordination Analysis

### Coordination Efficiency

Analyze how well agents work together:

```bash
# Coordination analysis
swarm-benchmark analyze <id> --coordination-metrics

# Output:
# Coordination Analysis:
# - Mode: hierarchical
# - Agents: 8
# - Coordination Overhead: 12%
# - Communication Latency: 45ms avg
# - Task Distribution: balanced
# - Agent Utilization: 78%
```

### Mode Effectiveness

```bash
# Compare coordination modes for task type
swarm-benchmark analyze --mode-effectiveness \
  --task-pattern "Build*" \
  --min-samples 10

# Best modes by task type
swarm-benchmark report --coordination-recommendations
```

## 📊 Advanced Analysis Techniques

### Statistical Analysis

```python
# Python script for statistical analysis
import json
import numpy as np
from scipy import stats

# Load benchmark results
with open('benchmark_results.json') as f:
    data = json.load(f)

# Calculate statistics
execution_times = [r['execution_time'] for r in data['results']]
mean_time = np.mean(execution_times)
std_time = np.std(execution_times)
ci_95 = stats.t.interval(0.95, len(execution_times)-1, 
                          mean_time, std_time/np.sqrt(len(execution_times)))

print(f"Mean execution time: {mean_time:.3f}s")
print(f"95% CI: [{ci_95[0]:.3f}, {ci_95[1]:.3f}]")
```

### Pattern Recognition

Identify patterns in benchmark results:

```bash
# Find patterns in failures
swarm-benchmark analyze --failure-patterns --days 30

# Success patterns by configuration
swarm-benchmark analyze --success-patterns \
  --group-by strategy,mode
```

### Predictive Analysis

```bash
# Predict execution time for configuration
swarm-benchmark predict \
  --strategy development \
  --mode hierarchical \
  --agents 8 \
  --task-complexity high

# Predicted: 0.35s (±0.05s)
# Based on 50 similar benchmarks
```

## 📈 Visualization and Reporting

### Generate Visual Reports

```bash
# Performance dashboard
swarm-benchmark report --type dashboard \
  --period monthly \
  --export dashboard.html

# Strategy comparison chart
swarm-benchmark report --type comparison \
  --strategies all \
  --metrics execution_time,quality_score \
  --export strategy_comparison.png
```

### Custom Analysis Scripts

```python
# custom_analysis.py
import matplotlib.pyplot as plt
import json

# Load benchmark data
def analyze_benchmark(benchmark_id):
    with open(f'reports/{benchmark_id}.json') as f:
        data = json.load(f)
    
    # Extract metrics
    metrics = data['metrics']
    
    # Create visualization
    fig, axes = plt.subplots(2, 2, figsize=(12, 10))
    
    # Performance pie chart
    axes[0, 0].pie(
        [metrics['execution_time'], metrics['coordination_overhead'], metrics['queue_time']],
        labels=['Execution', 'Coordination', 'Queue'],
        autopct='%1.1f%%'
    )
    axes[0, 0].set_title('Time Distribution')
    
    # Quality scores bar chart
    quality = data['quality_metrics']
    axes[0, 1].bar(quality.keys(), quality.values())
    axes[0, 1].set_title('Quality Scores')
    
    # Resource usage over time
    # ... (additional visualizations)
    
    plt.tight_layout()
    plt.savefig(f'analysis_{benchmark_id}.png')
```

## 🎯 Analysis Best Practices

### 1. Regular Analysis

```bash
# Daily analysis script
#!/bin/bash
DATE=$(date +%Y%m%d)
swarm-benchmark analyze --since yesterday \
  --report daily \
  --export "reports/daily_$DATE.html"
```

### 2. Baseline Comparison

Always compare against baselines:

```bash
# Set baseline
swarm-benchmark baseline set <benchmark-id>

# Compare against baseline
swarm-benchmark analyze <new-id> --compare-baseline
```

### 3. Multi-dimensional Analysis

Consider multiple factors:

```bash
# Comprehensive analysis
swarm-benchmark analyze <id> \
  --dimensions performance,quality,resource,coordination \
  --export comprehensive_analysis.json
```

### 4. Actionable Insights

Focus on actionable recommendations:

```bash
# Get specific recommendations
swarm-benchmark analyze <id> --recommendations

# Example output:
# Top 3 Recommendations:
# 1. Switch to distributed mode (est. 25% faster)
# 2. Increase quality threshold to 0.9 (improve accuracy)
# 3. Enable parallel execution (reduce time by 40%)
```

## 📊 Analysis Workflows

### Performance Optimization Workflow

1. **Baseline Measurement**
   ```bash
   swarm-benchmark run "Task" --name baseline
   swarm-benchmark baseline set <id>
   ```

2. **Identify Issues**
   ```bash
   swarm-benchmark analyze <id> --bottlenecks
   ```

3. **Test Improvements**
   ```bash
   swarm-benchmark run "Task" --mode distributed --parallel
   ```

4. **Compare Results**
   ```bash
   swarm-benchmark compare <baseline-id> <new-id>
   ```

5. **Validate Improvements**
   ```bash
   swarm-benchmark analyze <new-id> --compare-baseline
   ```

### Quality Improvement Workflow

1. **Quality Assessment**
   ```bash
   swarm-benchmark analyze <id> --quality-breakdown
   ```

2. **Apply Improvements**
   ```bash
   swarm-benchmark run "Task" \
     --quality-threshold 0.95 \
     --review \
     --max-retries 5
   ```

3. **Verify Quality**
   ```bash
   swarm-benchmark analyze <new-id> --quality-validation
   ```

## 🔍 Troubleshooting with Analysis

### Common Issues and Solutions

```bash
# High failure rate
swarm-benchmark analyze <id> --failure-analysis
# → Increase timeouts, add retries

# Poor quality scores
swarm-benchmark analyze <id> --quality-issues
# → Enable review, increase threshold

# Resource exhaustion
swarm-benchmark analyze <id> --resource-problems
# → Reduce agent count, enable limits

# Coordination overhead
swarm-benchmark analyze <id> --coordination-issues
# → Simplify mode, reduce communication
```

## 📚 Export and Integration

### Export Formats

```bash
# Export for further analysis
swarm-benchmark export <id> --format csv --include-raw
swarm-benchmark export <id> --format json --pretty
swarm-benchmark export <id> --format sql --table benchmarks
```

### Integration with Analytics Tools

```python
# Export to pandas DataFrame
import pandas as pd
import json

def benchmark_to_dataframe(benchmark_file):
    with open(benchmark_file) as f:
        data = json.load(f)
    
    # Flatten results
    records = []
    for result in data['results']:
        record = {
            'benchmark_id': data['id'],
            'task_id': result['task_id'],
            'execution_time': result['execution_time'],
            'quality_score': result['quality_metrics']['overall_quality'],
            'cpu_usage': result['resource_usage']['cpu_percent'],
            'memory_usage': result['resource_usage']['memory_mb']
        }
        records.append(record)
    
    return pd.DataFrame(records)

# Analyze with pandas
df = benchmark_to_dataframe('benchmark_results.json')
print(df.describe())
print(df.groupby('strategy').mean())
```

## 🎉 Summary

Effective benchmark analysis helps you:
- Identify performance bottlenecks
- Improve quality scores
- Optimize resource usage
- Select optimal strategies and modes
- Make data-driven decisions

Remember: Regular analysis and comparison are key to continuous improvement!

---

## From basic-usage.md

# Basic Usage Guide

Learn how to use the swarm benchmarking tool effectively with practical examples and common workflows.

## 🎯 Core Concepts

Before diving into usage, understand these key concepts:

1. **Objective**: The task you want the swarm to accomplish
2. **Strategy**: How the swarm approaches the task (auto, research, development, etc.)
3. **Coordination Mode**: How agents work together (centralized, distributed, etc.)
4. **Agents**: Individual workers in the swarm
5. **Benchmark**: A complete test run with metrics and results

## 🚀 Basic Commands

### Running Your First Benchmark

The simplest way to start:

```bash
swarm-benchmark run "Create a hello world API"
```

This command:
- Uses the `auto` strategy (automatically selects approach)
- Uses `centralized` coordination (single coordinator)
- Allocates 5 agents (default)
- Saves results to `./reports/`

### Viewing Results

After running a benchmark:

```bash
# List all benchmarks
swarm-benchmark list

# Output:
# ID                                   | Name                    | Status    | Duration
# ------------------------------------ | ----------------------- | --------- | --------
# 7263107f-9031-4403-901c-9db6e3fc96c6 | benchmark-auto-central  | completed | 0.20s
```

View specific benchmark details:

```bash
swarm-benchmark show 7263107f-9031-4403-901c-9db6e3fc96c6
```

## 📚 Common Workflows

### 1. Research Workflow

When you need to gather information:

```bash
# Research a topic with distributed agents
swarm-benchmark run "Research best practices for REST API design" \
  --strategy research \
  --mode distributed \
  --max-agents 6

# View the research results
swarm-benchmark show <benchmark-id> --format detailed
```

### 2. Development Workflow

For code creation tasks:

```bash
# Step 1: Research the requirements
swarm-benchmark run "Research authentication methods" --strategy research

# Step 2: Develop the solution
swarm-benchmark run "Implement JWT authentication for Node.js API" \
  --strategy development \
  --mode hierarchical \
  --quality-threshold 0.9

# Step 3: Create tests
swarm-benchmark run "Write unit tests for JWT authentication" \
  --strategy testing
```

### 3. Analysis Workflow

For data analysis tasks:

```bash
# Analyze data with collaborative agents
swarm-benchmark run "Analyze user engagement metrics from CSV data" \
  --strategy analysis \
  --mode mesh \
  --quality-threshold 0.95 \
  --parallel
```

### 4. Optimization Workflow

For performance improvements:

```bash
# Profile and optimize
swarm-benchmark run "Optimize database query performance" \
  --strategy optimization \
  --mode hybrid \
  --monitor \
  --profile
```

## 🎨 Strategy Selection Examples

### Auto Strategy (Default)

Let the system choose the best approach:

```bash
# The system analyzes your objective and selects a strategy
swarm-benchmark run "Build a user registration form"
# Auto-selects: development strategy

swarm-benchmark run "Find the best Python web frameworks"
# Auto-selects: research strategy

swarm-benchmark run "Check API response times"
# Auto-selects: testing strategy
```

### Research Strategy

Best for information gathering:

```bash
# Market research
swarm-benchmark run "Research competitor pricing strategies" \
  --strategy research \
  --max-agents 8 \
  --parallel

# Technical research
swarm-benchmark run "Compare cloud providers for ML workloads" \
  --strategy research \
  --output json html
```

### Development Strategy

For creating code and systems:

```bash
# API development
swarm-benchmark run "Create CRUD API for product management" \
  --strategy development \
  --mode hierarchical \
  --review

# Frontend development
swarm-benchmark run "Build React dashboard component" \
  --strategy development \
  --quality-threshold 0.85
```

### Analysis Strategy

For data processing and insights:

```bash
# Business analysis
swarm-benchmark run "Analyze Q4 sales data and identify trends" \
  --strategy analysis \
  --mode mesh

# Log analysis
swarm-benchmark run "Analyze server logs for error patterns" \
  --strategy analysis \
  --parallel
```

### Testing Strategy

For quality assurance:

```bash
# API testing
swarm-benchmark run "Create comprehensive test suite for user API" \
  --strategy testing \
  --mode distributed

# Performance testing
swarm-benchmark run "Load test the checkout process" \
  --strategy testing \
  --max-agents 10
```

### Optimization Strategy

For performance improvements:

```bash
# Code optimization
swarm-benchmark run "Optimize image processing algorithm" \
  --strategy optimization \
  --profile

# Query optimization
swarm-benchmark run "Optimize slow database queries" \
  --strategy optimization \
  --monitor
```

### Maintenance Strategy

For updates and documentation:

```bash
# Documentation
swarm-benchmark run "Update API documentation for v2" \
  --strategy maintenance \
  --mode centralized

# Refactoring
swarm-benchmark run "Refactor user service to use async/await" \
  --strategy maintenance
```

## 🔗 Coordination Mode Examples

### Centralized (Simple Tasks)

Best for small teams and straightforward tasks:

```bash
# Simple task with few agents
swarm-benchmark run "Create a contact form" \
  --mode centralized \
  --max-agents 3
```

### Distributed (Parallel Work)

For tasks that can be split across multiple coordinators:

```bash
# Parallel research across topics
swarm-benchmark run "Research multiple database technologies" \
  --mode distributed \
  --max-agents 8 \
  --parallel
```

### Hierarchical (Complex Projects)

For multi-layered projects with clear structure:

```bash
# Large development project
swarm-benchmark run "Build e-commerce platform" \
  --mode hierarchical \
  --max-agents 10 \
  --task-timeout 600
```

### Mesh (Collaborative Work)

When agents need to work together closely:

```bash
# Collaborative code review
swarm-benchmark run "Review and improve codebase architecture" \
  --mode mesh \
  --max-agents 5 \
  --review
```

### Hybrid (Adaptive)

Let the system choose the best mode per task:

```bash
# Mixed workload
swarm-benchmark run "Complete full project lifecycle" \
  --mode hybrid \
  --adaptive \
  --max-agents 8
```

## 📊 Output Management

### Output Formats

Save results in different formats:

```bash
# Multiple output formats
swarm-benchmark run "Analyze data" \
  --output json sqlite csv \
  --output-dir ./analysis-results

# Pretty-printed JSON
swarm-benchmark run "Task" \
  --output json \
  --pretty-print

# Compressed output
swarm-benchmark run "Large analysis" \
  --output json \
  --compress
```

### Working with Results

```bash
# Export specific benchmark
swarm-benchmark show <id> --format json > benchmark-result.json

# Process results with jq
swarm-benchmark show <id> --format json | \
  jq '.results[] | {task: .task_id, time: .execution_time}'

# Generate HTML report
swarm-benchmark show <id> --format report --export report.html
```

## ⚡ Performance Options

### Parallel Execution

Speed up execution with parallel processing:

```bash
# Enable parallel execution
swarm-benchmark run "Process multiple files" \
  --parallel \
  --max-agents 8

# Parallel with monitoring
swarm-benchmark run "Analyze dataset" \
  --parallel \
  --monitor \
  --metrics-interval 2
```

### Resource Limits

Control resource usage:

```bash
# Set resource limits
swarm-benchmark run "Resource-intensive task" \
  --memory-limit 2048 \
  --cpu-limit 75 \
  --timeout 30
```

### Background Execution

Run long benchmarks in the background:

```bash
# Start in background
swarm-benchmark run "Long analysis task" \
  --background \
  --name "overnight-analysis"

# Check status later
swarm-benchmark list --filter-name "overnight-analysis"
```

## 🎯 Quality Control

### Quality Thresholds

Ensure high-quality results:

```bash
# High quality requirement
swarm-benchmark run "Critical calculation" \
  --quality-threshold 0.95 \
  --max-retries 5

# With review process
swarm-benchmark run "Important document" \
  --quality-threshold 0.9 \
  --review \
  --testing
```

### Validation

Enable strict validation:

```bash
# Strict validation
swarm-benchmark run "Generate secure code" \
  --validation-mode strict \
  --testing

# With automated testing
swarm-benchmark run "Create API endpoints" \
  --testing \
  --test-coverage 0.8
```

## 📈 Monitoring and Debugging

### Real-time Monitoring

Watch execution in real-time:

```bash
# Basic monitoring
swarm-benchmark run "Long task" --monitor

# Detailed monitoring
swarm-benchmark run "Complex task" \
  --monitor \
  --verbose \
  --metrics-interval 1
```

### Debugging

Troubleshoot issues:

```bash
# Verbose output
swarm-benchmark -v run "Problematic task"

# With execution trace
swarm-benchmark run "Debug this" \
  --verbose \
  --trace \
  --profile

# Dry run to check configuration
swarm-benchmark run "Test configuration" \
  --dry-run \
  --verbose
```

## 🔄 Cleanup and Maintenance

### Managing Results

Keep your results organized:

```bash
# Clean old results
swarm-benchmark clean --older-than 7

# Keep only recent benchmarks
swarm-benchmark clean --keep-recent 50

# Clean by status
swarm-benchmark clean --status failed
```

## 💡 Best Practices

### 1. Start Simple

Begin with basic commands and add complexity:

```bash
# Start here
swarm-benchmark run "Your task"

# Then add strategy
swarm-benchmark run "Your task" --strategy development

# Then optimize
swarm-benchmark run "Your task" \
  --strategy development \
  --mode hierarchical \
  --parallel
```

### 2. Use Descriptive Objectives

Be specific about what you want:

```bash
# ❌ Too vague
swarm-benchmark run "Make API"

# ✅ Clear and specific
swarm-benchmark run "Create REST API for user management with JWT authentication"
```

### 3. Monitor Important Runs

Always monitor critical benchmarks:

```bash
swarm-benchmark run "Production task" \
  --monitor \
  --quality-threshold 0.9 \
  --name "prod-deploy-$(date +%Y%m%d)"
```

### 4. Save Important Results

Export and backup critical benchmarks:

```bash
# Export important results
swarm-benchmark show <important-id> --format json \
  > backups/benchmark-$(date +%Y%m%d).json

# Compress old results
tar -czf benchmarks-archive.tar.gz ./reports/
```

### 5. Use Configuration Files

For complex or repeated benchmarks:

```yaml
# benchmark-config.yaml
name: "Daily Analysis"
strategy: analysis
mode: distributed
max_agents: 8
parallel: true
output_formats:
  - json
  - sqlite
```

```bash
swarm-benchmark -c benchmark-config.yaml run "Daily data analysis"
```

## 🎉 Next Steps

Now that you understand basic usage:

1. Explore [Optimization Guide](optimization-guide.md) for performance tips
2. Read [Strategies Guide](strategies.md) for detailed strategy information
3. Check [Coordination Modes](coordination-modes.md) for mode selection
4. See [CLI Reference](cli-reference.md) for all available options

Happy benchmarking! 🚀

---

## From best-practices.md

# Best Practices Guide

A comprehensive guide to best practices for swarm benchmarking, optimization, and performance tuning.

## 🎯 General Best Practices

### 1. Start Simple, Then Optimize

Always begin with the simplest configuration and gradually add complexity:

```bash
# ❌ Don't start with this
swarm-benchmark run "Complex task" \
  --strategy optimization \
  --mode hybrid \
  --max-agents 20 \
  --parallel \
  --distributed \
  --monitor \
  --profile

# ✅ Start with this
swarm-benchmark run "Complex task"

# Then optimize based on results
swarm-benchmark analyze <id> --recommendations
```

### 2. Use Clear and Specific Objectives

The quality of results depends heavily on objective clarity:

```bash
# ❌ Vague objectives
swarm-benchmark run "Make it better"
swarm-benchmark run "Fix the code"
swarm-benchmark run "Analyze stuff"

# ✅ Clear and specific objectives
swarm-benchmark run "Optimize the user authentication API response time to under 100ms"
swarm-benchmark run "Fix the memory leak in the image processing module"
swarm-benchmark run "Analyze Q4 2023 sales data to identify top 3 growth regions"
```

### 3. Benchmark Before Optimizing

Always establish baselines before making changes:

```bash
# Establish baseline
BASELINE_ID=$(swarm-benchmark run "Task" --output json | jq -r '.benchmark_id')
swarm-benchmark baseline set $BASELINE_ID

# Test optimization
NEW_ID=$(swarm-benchmark run "Task" --mode distributed --output json | jq -r '.benchmark_id')

# Compare results
swarm-benchmark compare $BASELINE_ID $NEW_ID
```

## 📊 Strategy Selection Best Practices

### Match Strategy to Task Type

Use this decision matrix:

| Task Contains | Recommended Strategy | Example |
|--------------|---------------------|---------|
| "research", "investigate", "find" | research | "Research best database for our needs" |
| "build", "create", "implement" | development | "Build user authentication service" |
| "analyze", "process", "insights" | analysis | "Analyze customer churn data" |
| "test", "validate", "verify" | testing | "Test API endpoints for security" |
| "optimize", "improve", "faster" | optimization | "Optimize query performance" |
| "update", "document", "refactor" | maintenance | "Update API documentation" |
| Mixed/unclear | auto | "Handle user feedback" |

### Strategy-Specific Tips

#### Research Strategy
```bash
# Use distributed mode for broader coverage
swarm-benchmark run "Research topic" \
  --strategy research \
  --mode distributed \
  --max-agents 8

# Set longer timeouts for complex research
swarm-benchmark run "Deep research task" \
  --strategy research \
  --task-timeout 600
```

#### Development Strategy
```bash
# Use hierarchical mode for complex projects
swarm-benchmark run "Build system" \
  --strategy development \
  --mode hierarchical \
  --quality-threshold 0.9

# Enable review for critical code
swarm-benchmark run "Security module" \
  --strategy development \
  --review \
  --testing
```

#### Analysis Strategy
```bash
# Use mesh mode for collaborative analysis
swarm-benchmark run "Analyze data" \
  --strategy analysis \
  --mode mesh \
  --quality-threshold 0.95

# Enable parallel processing for large datasets
swarm-benchmark run "Big data analysis" \
  --strategy analysis \
  --parallel \
  --max-agents 10
```

## 🔗 Coordination Mode Best Practices

### Agent Count Guidelines

| Mode | Optimal Agent Count | Maximum Effective |
|------|-------------------|-------------------|
| Centralized | 2-3 | 5 |
| Distributed | 4-6 | 10 |
| Hierarchical | 5-8 | 15 |
| Mesh | 3-4 | 6 |
| Hybrid | 4-6 | 10 |

### Mode Selection Criteria

```python
def select_coordination_mode(task_complexity, agent_count, priority):
    if agent_count <= 3:
        return "centralized"
    
    if priority == "speed" and task_complexity == "simple":
        return "centralized"
    elif priority == "reliability":
        return "mesh" if agent_count <= 5 else "distributed"
    elif priority == "scalability":
        return "hierarchical"
    elif task_complexity == "complex":
        return "hierarchical" if agent_count >= 5 else "distributed"
    else:
        return "hybrid"  # Adaptive selection
```

### Avoiding Coordination Overhead

```bash
# Monitor coordination overhead
swarm-benchmark run "Task" --monitor | grep "coordination"

# If overhead > 15%, simplify mode
# From mesh → distributed → hierarchical → centralized
```

## 🚀 Performance Optimization Best Practices

### 1. Task Decomposition

Break large tasks into smaller, manageable pieces:

```bash
# ❌ Monolithic task
swarm-benchmark run "Build complete e-commerce platform with payment, inventory, and shipping"

# ✅ Decomposed tasks
swarm-benchmark run "Design e-commerce database schema"
swarm-benchmark run "Implement user authentication module"
swarm-benchmark run "Create product catalog API"
swarm-benchmark run "Build payment processing service"
```

### 2. Parallel Execution

Use parallel execution for independent tasks:

```bash
# Identify parallelizable work
swarm-benchmark analyze <previous-id> --parallelization-opportunities

# Enable parallel execution
swarm-benchmark run "Process multiple files" \
  --parallel \
  --max-agents 8 \
  --mode distributed
```

### 3. Resource Optimization

Set appropriate resource limits:

```bash
# Calculate optimal resources
AGENTS=$(swarm-benchmark calculate-agents --task-complexity medium)
MEMORY=$(swarm-benchmark calculate-memory --task-type analysis)

# Run with optimized resources
swarm-benchmark run "Task" \
  --max-agents $AGENTS \
  --memory-limit $MEMORY \
  --cpu-limit 70
```

### 4. Caching Strategies

```bash
# Enable result caching for repeated tasks
swarm-benchmark run "Daily analysis" \
  --cache-results \
  --cache-ttl 3600

# Use cached research results
swarm-benchmark run "Build on previous research" \
  --use-cache \
  --cache-namespace "research"
```

## 📈 Quality Assurance Best Practices

### 1. Set Appropriate Quality Thresholds

| Task Criticality | Recommended Threshold | Max Retries |
|-----------------|---------------------|-------------|
| Critical | 0.95+ | 5 |
| Important | 0.85-0.94 | 3 |
| Standard | 0.75-0.84 | 2 |
| Experimental | 0.70+ | 1 |

```bash
# Critical task configuration
swarm-benchmark run "Deploy payment system" \
  --quality-threshold 0.95 \
  --max-retries 5 \
  --review \
  --testing \
  --validation-mode strict
```

### 2. Enable Review Processes

```bash
# Peer review for important tasks
swarm-benchmark run "API redesign" \
  --review \
  --review-threshold 0.9 \
  --reviewer-count 2

# Automated testing
swarm-benchmark run "New feature" \
  --testing \
  --test-coverage 0.8 \
  --test-types "unit,integration"
```

### 3. Validation Strategies

```bash
# Strict validation for critical paths
swarm-benchmark run "Security implementation" \
  --validation-mode strict \
  --security-check \
  --compliance-check

# Output validation
swarm-benchmark run "Data processing" \
  --output-validation \
  --schema-file output-schema.json
```

## 🔍 Monitoring and Debugging Best Practices

### 1. Proactive Monitoring

```bash
# Always monitor important runs
swarm-benchmark run "Production task" \
  --monitor \
  --alert-on-failure \
  --metrics-interval 2

# Set up alerts
swarm-benchmark run "Critical task" \
  --alert-email admin@example.com \
  --alert-threshold 0.8
```

### 2. Debugging Workflows

```bash
# Step 1: Verbose dry run
swarm-benchmark run "Problematic task" --dry-run --verbose

# Step 2: Trace execution
swarm-benchmark run "Problematic task" --trace --log-level debug

# Step 3: Profile performance
swarm-benchmark run "Problematic task" --profile --profile-output debug.json

# Step 4: Analyze results
swarm-benchmark analyze <id> --debug --include-logs
```

### 3. Log Management

```bash
# Enable comprehensive logging
swarm-benchmark run "Task" \
  --log-level info \
  --log-file benchmark.log \
  --log-format json

# Aggregate logs for analysis
swarm-benchmark logs aggregate --since "1 hour ago" \
  --filter-level warning \
  --export logs-analysis.json
```

## 💾 Data Management Best Practices

### 1. Result Organization

```bash
# Use meaningful names and tags
swarm-benchmark run "Q4 Analysis" \
  --name "quarterly-analysis-2024-q4" \
  --tags finance,quarterly,analysis \
  --metadata '{"department": "finance", "priority": "high"}'

# Organize by project
swarm-benchmark run "Task" \
  --output-dir "./projects/project-x/benchmarks" \
  --namespace "project-x"
```

### 2. Backup Strategies

```bash
# Regular backups
#!/bin/bash
# backup-benchmarks.sh
DATE=$(date +%Y%m%d)
BACKUP_DIR="/backups/benchmarks/$DATE"

# Export important benchmarks
swarm-benchmark export --since "7 days ago" \
  --format json \
  --compress \
  --output "$BACKUP_DIR/weekly-backup.tar.gz"

# Backup configurations
cp -r ~/.swarm-benchmark/configs "$BACKUP_DIR/"
```

### 3. Data Retention

```bash
# Automated cleanup policy
swarm-benchmark policy set \
  --retain-successful 30 \
  --retain-failed 90 \
  --archive-after 180 \
  --delete-after 365

# Manual cleanup
swarm-benchmark clean \
  --older-than 30 \
  --keep-tagged \
  --keep-baselines
```

## 🔧 Configuration Best Practices

### 1. Use Configuration Files

```yaml
# benchmark-config.yaml
defaults:
  strategy: auto
  mode: distributed
  max_agents: 6
  quality_threshold: 0.85
  output_formats: ["json", "sqlite"]

profiles:
  development:
    strategy: development
    mode: hierarchical
    review: true
    
  production:
    quality_threshold: 0.95
    max_retries: 5
    alert_on_failure: true
```

### 2. Environment-Specific Settings

```bash
# Development environment
export SWARM_BENCHMARK_ENV=development
export SWARM_BENCHMARK_TIMEOUT=300

# Production environment
export SWARM_BENCHMARK_ENV=production
export SWARM_BENCHMARK_TIMEOUT=3600
export SWARM_BENCHMARK_ALERT_EMAIL=ops@example.com
```

### 3. Version Control

```bash
# Track benchmark configurations
git add benchmark-config.yaml
git commit -m "Updated benchmark configuration for v2.0"

# Tag important benchmarks
swarm-benchmark tag <id> --tag "v2.0-baseline"
git tag -a "benchmark-v2.0" -m "Baseline for v2.0 release"
```

## 🔄 CI/CD Integration Best Practices

### 1. Automated Benchmarking

```yaml
# .github/workflows/benchmark.yml
name: Automated Benchmarking
on:
  push:
    branches: [main]
  pull_request:

jobs:
  benchmark:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Run Benchmarks
        run: |
          swarm-benchmark run "${{ github.event.head_commit.message }}" \
            --name "ci-${{ github.run_id }}" \
            --tags ci,automated \
            --output json \
            > benchmark-results.json
      
      - name: Analyze Results
        run: |
          swarm-benchmark analyze $(jq -r '.benchmark_id' benchmark-results.json) \
            --compare-baseline \
            --fail-on-regression
```

### 2. Performance Gates

```bash
# Fail if performance degrades
swarm-benchmark gate \
  --baseline main \
  --max-regression 10 \
  --metrics "execution_time,quality_score"

# Fail if quality drops
swarm-benchmark gate \
  --min-quality 0.85 \
  --required-tests "unit,integration"
```

## 📊 Reporting Best Practices

### 1. Regular Reports

```bash
# Weekly performance report
swarm-benchmark report weekly \
  --include-trends \
  --compare-previous \
  --export weekly-report.html

# Monthly executive summary
swarm-benchmark report monthly \
  --format executive \
  --metrics-summary \
  --cost-analysis
```

### 2. Custom Dashboards

```python
# dashboard.py
import matplotlib.pyplot as plt
from datetime import datetime, timedelta

def generate_dashboard():
    # Get recent benchmarks
    benchmarks = get_benchmarks_since(datetime.now() - timedelta(days=7))
    
    # Create dashboard
    fig, axes = plt.subplots(2, 2, figsize=(15, 10))
    
    # Performance trends
    plot_performance_trends(axes[0, 0], benchmarks)
    
    # Strategy effectiveness
    plot_strategy_comparison(axes[0, 1], benchmarks)
    
    # Resource utilization
    plot_resource_usage(axes[1, 0], benchmarks)
    
    # Quality scores
    plot_quality_trends(axes[1, 1], benchmarks)
    
    plt.savefig('weekly_dashboard.png')
```

## 🎯 Team Collaboration Best Practices

### 1. Shared Baselines

```bash
# Create team baseline
swarm-benchmark run "Standard task" --name "team-baseline-v1"
swarm-benchmark baseline set <id> --shared --team "engineering"

# Everyone compares against baseline
swarm-benchmark run "My implementation" --compare-baseline team-baseline-v1
```

### 2. Knowledge Sharing

```bash
# Document successful configurations
swarm-benchmark document <successful-id> \
  --title "Optimal config for API development" \
  --export docs/api-benchmark-guide.md

# Share optimization findings
swarm-benchmark insights export \
  --strategy development \
  --successes \
  --export insights/development-tips.json
```

### 3. Benchmark Reviews

```bash
# Schedule regular reviews
swarm-benchmark schedule \
  --review-meeting weekly \
  --participants "team@example.com" \
  --include-trends \
  --include-recommendations
```

## 🚨 Common Pitfalls to Avoid

### 1. Over-Engineering

```bash
# ❌ Don't over-configure
swarm-benchmark run "Simple task" \
  --max-agents 20 \
  --mode hybrid \
  --parallel \
  --distributed \
  --monitor \
  --profile \
  --trace \
  --validation-mode strict

# ✅ Use appropriate configuration
swarm-benchmark run "Simple task" --max-agents 3
```

### 2. Ignoring Baselines

```bash
# ❌ Don't skip baseline comparison
swarm-benchmark run "Optimized version"

# ✅ Always compare
swarm-benchmark run "Optimized version" --compare-baseline
```

### 3. Premature Optimization

```bash
# ❌ Don't optimize without data
swarm-benchmark run "Task" --mode mesh --max-agents 15

# ✅ Measure first, then optimize
swarm-benchmark run "Task"  # Measure
swarm-benchmark analyze <id> --recommendations  # Analyze
# Then apply recommended optimizations
```

## 📚 Continuous Improvement

### 1. Regular Retrospectives

```bash
# Monthly performance review
swarm-benchmark retrospective \
  --period monthly \
  --identify-patterns \
  --generate-recommendations
```

### 2. Benchmark Evolution

```bash
# Track configuration evolution
git log --follow benchmark-config.yaml

# Document learnings
echo "## Learnings from Q4 2024" >> BENCHMARK_LEARNINGS.md
echo "- Distributed mode works best for research tasks" >> BENCHMARK_LEARNINGS.md
echo "- Quality threshold of 0.9 optimal for production" >> BENCHMARK_LEARNINGS.md
```

### 3. Community Contribution

```bash
# Share successful patterns
swarm-benchmark patterns export \
  --successful \
  --anonymize \
  --contribute
```

## 🎉 Summary Checklist

- [ ] Always start simple and iterate
- [ ] Use clear, specific objectives
- [ ] Establish baselines before optimizing
- [ ] Match strategies to task types
- [ ] Choose appropriate coordination modes
- [ ] Monitor important benchmarks
- [ ] Set realistic quality thresholds
- [ ] Organize and backup results
- [ ] Use configuration files
- [ ] Integrate with CI/CD
- [ ] Share learnings with team
- [ ] Continuously improve based on data

Remember: The best configuration is the one that meets your specific needs while using resources efficiently!

---

## From cli-reference.md

# CLI Reference Guide

Complete command-line interface documentation for the swarm benchmarking tool.

## 📋 Command Overview

```
swarm-benchmark [GLOBAL OPTIONS] COMMAND [OPTIONS] [ARGS]
```

### Global Options
- `--version` - Show version and exit
- `-v, --verbose` - Enable verbose output
- `-c, --config PATH` - Configuration file path
- `--help` - Show help message and exit

### Available Commands
- `run` - Run a swarm benchmark
- `list` - List recent benchmark runs
- `show` - Show details for a specific benchmark
- `clean` - Clean up benchmark results
- `serve` - Start the web interface
- `analyze` - Analyze benchmark results
- `compare` - Compare multiple benchmarks

## 🚀 run - Execute Benchmarks

Run a swarm benchmark with the specified objective.

### Syntax
```bash
swarm-benchmark run [OPTIONS] OBJECTIVE
```

### Arguments
- `OBJECTIVE` - The goal or task for the swarm to accomplish (required)

### Options

#### Strategy Options
```bash
--strategy [auto|research|development|analysis|testing|optimization|maintenance]
    # Execution strategy (default: auto)
    
--strategy-params JSON
    # Custom strategy parameters as JSON string
    # Example: '{"search_depth": 3, "quality_iterations": 2}'
```

#### Coordination Options
```bash
--mode [centralized|distributed|hierarchical|mesh|hybrid]
    # Coordination mode (default: centralized)
    
--coordinator-count INT
    # Number of coordinators (distributed mode)
    
--hierarchy-levels INT
    # Number of hierarchy levels (hierarchical mode)
```

#### Agent Options
```bash
--max-agents INT
    # Maximum number of agents (default: 5)
    
--agent-selection [capability|load|performance|random|round-robin]
    # Agent selection strategy (default: capability)
    
--agent-pool PATH
    # Path to agent pool configuration
```

#### Task Options
```bash
--max-tasks INT
    # Maximum tasks to execute (default: 100)
    
--task-timeout INT
    # Individual task timeout in seconds (default: 300)
    
--max-retries INT
    # Maximum retries per task (default: 3)
    
--priority INT
    # Task priority 1-10 (default: 5)
```

#### Execution Options
```bash
--parallel
    # Enable parallel execution
    
--background
    # Run in background mode
    
--distributed
    # Enable distributed coordination
    
--stream-output
    # Stream real-time output
```

#### Quality Options
```bash
--quality-threshold FLOAT
    # Quality threshold 0-1 (default: 0.8)
    
--review
    # Enable peer review
    
--testing
    # Enable automated testing
    
--validation-mode [strict|normal|lenient]
    # Validation strictness (default: normal)
```

#### Performance Options
```bash
--timeout MINUTES
    # Overall timeout in minutes (default: 60)
    
--memory-limit MB
    # Memory limit in MB (default: 1024)
    
--cpu-limit PERCENT
    # CPU limit percentage (default: 80)
    
--optimization-level [0|1|2|3]
    # Optimization level (default: 1)
```

#### Monitoring Options
```bash
--monitor
    # Enable real-time monitoring
    
--metrics-interval SECONDS
    # Metrics collection interval (default: 5)
    
--profile
    # Enable performance profiling
    
--trace
    # Enable execution tracing
```

#### Output Options
```bash
--output FORMAT [FORMAT...]
    # Output formats: json, sqlite, csv, html
    # Can specify multiple formats
    
--output-dir PATH
    # Output directory (default: ./reports)
    
--compress
    # Compress output files
    
--pretty-print
    # Pretty print JSON output
```

#### Additional Options
```bash
--name TEXT
    # Benchmark name
    
--description TEXT
    # Benchmark description
    
--tags TAG [TAG...]
    # Tags for categorization
    
--metadata JSON
    # Additional metadata as JSON
    
--dry-run
    # Show configuration without executing
```

### Examples

#### Basic Usage
```bash
# Simple benchmark
swarm-benchmark run "Build a user authentication system"

# With specific strategy
swarm-benchmark run "Research cloud providers" --strategy research

# With coordination mode
swarm-benchmark run "Develop API" --mode hierarchical
```

#### Advanced Usage
```bash
# Full configuration
swarm-benchmark run "Build microservices architecture" \
  --strategy development \
  --mode hierarchical \
  --max-agents 10 \
  --parallel \
  --quality-threshold 0.9 \
  --output json sqlite \
  --monitor \
  --name "Microservices Benchmark" \
  --tags architecture api
```

#### Performance Optimization
```bash
# Optimized for speed
swarm-benchmark run "Quick analysis" \
  --strategy analysis \
  --mode distributed \
  --parallel \
  --task-timeout 60 \
  --optimization-level 3

# Optimized for quality
swarm-benchmark run "Critical system" \
  --strategy development \
  --mode mesh \
  --quality-threshold 0.95 \
  --review \
  --testing \
  --max-retries 5
```

## 📋 list - View Benchmarks

List recent benchmark runs.

### Syntax
```bash
swarm-benchmark list [OPTIONS]
```

### Options
```bash
--format [table|json|csv]
    # Output format (default: table)
    
--filter-strategy TEXT
    # Filter by strategy name
    
--filter-mode TEXT
    # Filter by coordination mode
    
--filter-status [completed|failed|running]
    # Filter by status
    
--limit INT
    # Limit number of results (default: 10)
    
--offset INT
    # Offset for pagination (default: 0)
    
--sort-by [date|duration|status|strategy]
    # Sort results (default: date)
    
--reverse
    # Reverse sort order
    
--since DATE
    # Show benchmarks since date
    
--until DATE
    # Show benchmarks until date
```

### Examples
```bash
# List recent benchmarks
swarm-benchmark list

# Filter by strategy
swarm-benchmark list --filter-strategy development

# Export as JSON
swarm-benchmark list --format json --limit 50

# List failed benchmarks
swarm-benchmark list --filter-status failed
```

## 🔍 show - Benchmark Details

Show details for a specific benchmark run.

### Syntax
```bash
swarm-benchmark show [OPTIONS] BENCHMARK_ID
```

### Arguments
- `BENCHMARK_ID` - Benchmark identifier (required)

### Options
```bash
--format [json|summary|detailed|report]
    # Output format (default: summary)
    
--include [all|results|metrics|logs]
    # What to include (default: all)
    
--export PATH
    # Export to file
    
--pretty
    # Pretty print output
```

### Examples
```bash
# Show benchmark summary
swarm-benchmark show abc123

# Detailed JSON output
swarm-benchmark show abc123 --format json --pretty

# Export detailed report
swarm-benchmark show abc123 --format report --export report.html
```

## 🧹 clean - Cleanup Results

Clean up benchmark results.

### Syntax
```bash
swarm-benchmark clean [OPTIONS]
```

### Options
```bash
--all
    # Delete all benchmark results
    
--older-than DAYS
    # Delete results older than N days
    
--strategy TEXT
    # Delete results for specific strategy
    
--status [completed|failed|all]
    # Delete by status (default: all)
    
--keep-recent INT
    # Keep N most recent benchmarks
    
--dry-run
    # Show what would be deleted
    
--force
    # Skip confirmation prompt
```

### Examples
```bash
# Clean old results
swarm-benchmark clean --older-than 30

# Clean failed benchmarks
swarm-benchmark clean --status failed

# Keep only recent
swarm-benchmark clean --keep-recent 100
```

## 🌐 serve - Web Interface

Start the benchmark web interface.

### Syntax
```bash
swarm-benchmark serve [OPTIONS]
```

### Options
```bash
--port INT
    # Server port (default: 8080)
    
--host TEXT
    # Server host (default: localhost)
    
--public
    # Allow external connections
    
--auth USERNAME:PASSWORD
    # Enable basic authentication
    
--ssl-cert PATH
    # SSL certificate path
    
--ssl-key PATH
    # SSL key path
```

### Examples
```bash
# Start local server
swarm-benchmark serve

# Public server with auth
swarm-benchmark serve --public --auth admin:password --port 8443
```

## 📊 analyze - Result Analysis

Analyze benchmark results.

### Syntax
```bash
swarm-benchmark analyze [OPTIONS] [BENCHMARK_ID]
```

### Options
```bash
--type [performance|quality|resource|coordination]
    # Analysis type (default: performance)
    
--compare-with ID [ID...]
    # Compare with other benchmarks
    
--report FORMAT
    # Generate report (html, pdf, json)
    
--metrics METRIC [METRIC...]
    # Specific metrics to analyze
    
--export PATH
    # Export analysis results
```

### Examples
```bash
# Analyze specific benchmark
swarm-benchmark analyze abc123

# Compare benchmarks
swarm-benchmark analyze --compare-with abc123 def456 ghi789

# Generate performance report
swarm-benchmark analyze --type performance --report html
```

## 🔄 compare - Compare Benchmarks

Compare multiple benchmark runs.

### Syntax
```bash
swarm-benchmark compare [OPTIONS] ID1 ID2 [ID3...]
```

### Arguments
- `ID1, ID2, ...` - Benchmark IDs to compare (minimum 2)

### Options
```bash
--metrics METRIC [METRIC...]
    # Metrics to compare
    
--format [table|chart|json]
    # Output format (default: table)
    
--export PATH
    # Export comparison
    
--visualization [bar|line|radar]
    # Chart type for visual comparison
```

### Examples
```bash
# Compare two benchmarks
swarm-benchmark compare abc123 def456

# Compare specific metrics
swarm-benchmark compare abc123 def456 --metrics execution_time quality_score

# Export comparison chart
swarm-benchmark compare abc123 def456 ghi789 --format chart --export comparison.png
```

## 🎯 Advanced Usage

### Configuration Files

Create a configuration file for complex benchmarks:

```yaml
# benchmark.yaml
name: "Production Benchmark"
strategy: development
mode: hierarchical
max_agents: 10
parallel: true
quality_threshold: 0.9
output_formats:
  - json
  - sqlite
  - html
monitoring:
  enabled: true
  interval: 5
resource_limits:
  memory_mb: 2048
  cpu_percent: 75
```

Use with:
```bash
swarm-benchmark -c benchmark.yaml run "Build production system"
```

### Environment Variables

```bash
# Set defaults via environment
export SWARM_BENCHMARK_OUTPUT_DIR="/var/benchmarks"
export SWARM_BENCHMARK_DEFAULT_STRATEGY="development"
export SWARM_BENCHMARK_MAX_AGENTS="8"

# Run with environment defaults
swarm-benchmark run "Task"
```

### Pipelines and Automation

```bash
# Chain commands
swarm-benchmark run "Research task" --strategy research --output json | \
  jq '.results[0].output' | \
  swarm-benchmark run "Implement findings" --strategy development

# Batch processing
for task in tasks/*.txt; do
  swarm-benchmark run "$(cat $task)" --output-dir "results/$(basename $task .txt)"
done
```

### Scripting Examples

```bash
#!/bin/bash
# benchmark-suite.sh

# Run benchmark suite
strategies=("auto" "research" "development" "analysis" "testing")
modes=("centralized" "distributed" "hierarchical")

for strategy in "${strategies[@]}"; do
  for mode in "${modes[@]}"; do
    echo "Testing $strategy with $mode coordination..."
    swarm-benchmark run "Test task for $strategy" \
      --strategy "$strategy" \
      --mode "$mode" \
      --name "suite-$strategy-$mode" \
      --output json
  done
done

# Generate comparison report
swarm-benchmark list --format json | \
  jq -r '.[] | select(.name | startswith("suite-")) | .id' | \
  xargs swarm-benchmark compare --format chart --export suite-comparison.html
```

## 💡 Tips and Tricks

### Performance Tips
```bash
# Use aliases for common operations
alias sb='swarm-benchmark'
alias sbr='swarm-benchmark run'
alias sbl='swarm-benchmark list'

# Quick benchmark with monitoring
sbr "Quick test" --monitor --parallel

# Benchmark with profiling
sbr "Performance test" --profile --output json | \
  jq '.performance_metrics'
```

### Debugging
```bash
# Verbose mode for troubleshooting
swarm-benchmark -v run "Debug task" --trace

# Dry run to check configuration
swarm-benchmark run "Test" --dry-run --verbose

# Check coordination overhead
swarm-benchmark analyze --type coordination
```

### Integration
```bash
# CI/CD integration
swarm-benchmark run "$CI_COMMIT_MESSAGE" \
  --name "CI-$CI_PIPELINE_ID" \
  --metadata '{"commit": "'$CI_COMMIT_SHA'", "branch": "'$CI_COMMIT_BRANCH'"}'

# Slack notification
swarm-benchmark run "Deploy task" --output json | \
  jq '{text: "Benchmark completed: \(.status)"}' | \
  curl -X POST -H 'Content-type: application/json' \
    --data @- $SLACK_WEBHOOK_URL
```

## 🎉 Quick Reference Card

```bash
# Most common commands
swarm-benchmark run "Task"                    # Basic run
swarm-benchmark run "Task" -v                 # Verbose
swarm-benchmark list                          # List results  
swarm-benchmark show <id>                     # Show details
swarm-benchmark clean --older-than 30         # Cleanup

# Strategy shortcuts
sbr "Task" --strategy auto                    # Auto-select
sbr "Task" --strategy research                # Research
sbr "Task" --strategy development             # Development

# Mode shortcuts  
sbr "Task" --mode centralized                 # Simple
sbr "Task" --mode distributed                 # Parallel
sbr "Task" --mode hierarchical                # Complex

# Common combinations
sbr "Research task" --strategy research --mode distributed --parallel
sbr "Build system" --strategy development --mode hierarchical --monitor
sbr "Optimize code" --strategy optimization --mode hybrid --profile
```

---

## From coordination-modes.md

# Coordination Modes Guide

This guide explains the 5 coordination modes available for agent swarm orchestration and when to use each one.

## 🎯 Coordination Mode Overview

| Mode | Structure | Best For | Agent Count | Overhead |
|------|-----------|----------|-------------|----------|
| Centralized | Single coordinator | Simple tasks | 2-4 | Low (~50ms) |
| Distributed | Multiple coordinators | Parallel work | 4-8 | Medium (~100ms) |
| Hierarchical | Tree structure | Complex projects | 5-10 | Medium (~80ms) |
| Mesh | Peer-to-peer | Collaborative | 3-6 | High (~150ms) |
| Hybrid | Adaptive mix | Variable tasks | 4-8 | Variable |

## 🎯 Centralized Mode

### Overview
A single coordinator agent manages all tasks and delegates to worker agents.

```
    [Coordinator]
    /     |     \
[Agent1] [Agent2] [Agent3]
```

### Characteristics
- **Structure**: Star topology with central coordinator
- **Communication**: All through coordinator
- **Decision Making**: Centralized
- **Fault Tolerance**: Low (single point of failure)

### Usage Example
```bash
swarm-benchmark run "Build user login form" \
  --mode centralized \
  --max-agents 3
```

### When to Use
- ✅ Small teams (2-4 agents)
- ✅ Simple, well-defined tasks
- ✅ Tasks requiring consistency
- ✅ Quick coordination needed
- ❌ NOT for complex parallel work

### Performance Profile
- **Coordination Overhead**: ~50ms
- **Communication Latency**: ~25ms
- **Scalability**: Limited (up to 5 agents)
- **Efficiency**: High for small teams

### Best Practices
1. Keep agent count low (≤4)
2. Use for sequential tasks
3. Assign clear roles to agents
4. Monitor coordinator load

## 🌐 Distributed Mode

### Overview
Multiple coordinators share responsibility for task management.

```
[Coordinator1]        [Coordinator2]
   /    \               /    \
[A1]    [A2]         [A3]    [A4]
```

### Characteristics
- **Structure**: Multiple coordination points
- **Communication**: Regional coordination
- **Decision Making**: Distributed consensus
- **Fault Tolerance**: High (redundancy)

### Usage Example
```bash
swarm-benchmark run "Research cloud providers and pricing" \
  --mode distributed \
  --max-agents 8 \
  --parallel
```

### When to Use
- ✅ Medium teams (4-8 agents)
- ✅ Parallel, independent tasks
- ✅ Research and exploration
- ✅ Fault tolerance needed
- ❌ NOT for tightly coupled work

### Performance Profile
- **Coordination Overhead**: ~100ms + network
- **Communication Latency**: ~50ms
- **Scalability**: Good (up to 10 agents)
- **Efficiency**: High for parallel work

### Best Practices
1. Balance coordinator count (2-3)
2. Minimize inter-coordinator communication
3. Use for embarrassingly parallel tasks
4. Enable result aggregation

## 🌳 Hierarchical Mode

### Overview
Tree structure with multiple levels of coordination.

```
      [Root Coordinator]
       /            \
  [Manager1]     [Manager2]
   /    \         /    \
[W1]   [W2]    [W3]   [W4]
```

### Characteristics
- **Structure**: Multi-level tree
- **Communication**: Up/down the hierarchy
- **Decision Making**: Delegated by level
- **Fault Tolerance**: Medium

### Usage Example
```bash
swarm-benchmark run "Develop microservices architecture" \
  --mode hierarchical \
  --max-agents 10 \
  --quality-threshold 0.9
```

### When to Use
- ✅ Large teams (5-10 agents)
- ✅ Complex, multi-part projects
- ✅ Tasks with clear subtasks
- ✅ Need for oversight
- ❌ NOT for simple tasks

### Performance Profile
- **Coordination Overhead**: ~80ms per level
- **Communication Latency**: ~40ms per hop
- **Scalability**: Excellent (10+ agents)
- **Efficiency**: Good for structured work

### Best Practices
1. Keep hierarchy shallow (≤3 levels)
2. Balance tree structure
3. Clear responsibilities per level
4. Minimize cross-branch communication

### Hierarchy Design
```python
# Optimal hierarchy structure
if agent_count <= 4:
    levels = 2  # Root + workers
elif agent_count <= 10:
    levels = 3  # Root + managers + workers
else:
    levels = 3  # Keep at 3, add more managers
```

## 🕸️ Mesh Mode

### Overview
Peer-to-peer network where agents communicate directly.

```
[Agent1] ←→ [Agent2]
   ↕  ╳  ↕
[Agent3] ←→ [Agent4]
```

### Characteristics
- **Structure**: Fully connected network
- **Communication**: Direct peer-to-peer
- **Decision Making**: Consensus-based
- **Fault Tolerance**: Very high

### Usage Example
```bash
swarm-benchmark run "Analyze dataset collaboratively" \
  --mode mesh \
  --max-agents 6 \
  --consensus-threshold 0.8
```

### When to Use
- ✅ Collaborative tasks
- ✅ Peer review needed
- ✅ Consensus decisions
- ✅ High reliability required
- ❌ NOT for time-critical tasks

### Performance Profile
- **Coordination Overhead**: ~150ms + negotiation
- **Communication Latency**: ~30ms per peer
- **Scalability**: Limited (up to 6 agents)
- **Efficiency**: Lower due to overhead

### Best Practices
1. Limit agent count (≤6)
2. Use for quality-critical tasks
3. Set consensus thresholds
4. Monitor communication overhead

### Mesh Coordination
```python
# Communication complexity
connections = n * (n - 1) / 2  # Full mesh
# For 6 agents: 15 connections
# For 10 agents: 45 connections (too many!)
```

## 🔄 Hybrid Mode

### Overview
Adaptive coordination that switches between modes based on task requirements.

```
Task Analysis → Mode Selection → Dynamic Coordination
     ↓               ↓                    ↓
[Centralized]  [Distributed]      [Hierarchical]
```

### Characteristics
- **Structure**: Adaptive topology
- **Communication**: Mode-dependent
- **Decision Making**: Context-aware
- **Fault Tolerance**: Adaptive

### Usage Example
```bash
swarm-benchmark run "Complete project with research, development, and testing" \
  --mode hybrid \
  --max-agents 8 \
  --adaptive
```

### When to Use
- ✅ Mixed task types
- ✅ Unknown optimal approach
- ✅ Long-running projects
- ✅ Variable workloads
- ❌ NOT for simple, uniform tasks

### Performance Profile
- **Coordination Overhead**: 100-200ms (variable)
- **Communication Latency**: Mode-dependent
- **Scalability**: Good (adaptive)
- **Efficiency**: Optimizes per task

### Mode Selection Logic
```python
def select_mode(task, agents):
    if agents <= 3:
        return "centralized"
    elif task.is_parallel():
        return "distributed"
    elif task.is_complex():
        return "hierarchical"
    elif task.needs_consensus():
        return "mesh"
    else:
        return "centralized"  # default
```

### Best Practices
1. Let system adapt naturally
2. Monitor mode switching
3. Set switching thresholds
4. Review mode selection patterns

## 📊 Mode Comparison

### Performance Metrics

| Metric | Centralized | Distributed | Hierarchical | Mesh | Hybrid |
|--------|-------------|-------------|--------------|------|---------|
| Setup Time | ⚡ Fast | Medium | Medium | Slow | Variable |
| Coordination | ⚡ Minimal | Medium | Medium | High | Adaptive |
| Scalability | ❌ Poor | ✅ Good | ✅ Excellent | ❌ Poor | ✅ Good |
| Reliability | ❌ Low | ✅ High | Medium | ✅ Highest | ✅ High |
| Complexity | ⚡ Simple | Medium | Medium | Complex | Complex |

### Decision Matrix

| If you need... | Use this mode |
|----------------|---------------|
| Quick results with few agents | Centralized |
| Parallel processing | Distributed |
| Complex project management | Hierarchical |
| Collaborative decision making | Mesh |
| Flexibility for various tasks | Hybrid |

## 🎯 Optimization Strategies

### 1. Agent Pool Optimization

```bash
# Centralized: Minimize agents
swarm-benchmark run "Task" --mode centralized --max-agents 3

# Distributed: Balance load
swarm-benchmark run "Task" --mode distributed --max-agents 6

# Hierarchical: Optimal tree
swarm-benchmark run "Task" --mode hierarchical --max-agents 9

# Mesh: Limit connections
swarm-benchmark run "Task" --mode mesh --max-agents 4
```

### 2. Communication Optimization

```python
# Reduce coordination overhead
optimization_tips = {
    "centralized": "Batch task assignments",
    "distributed": "Minimize coordinator sync",
    "hierarchical": "Reduce tree depth",
    "mesh": "Limit peer connections",
    "hybrid": "Cache mode decisions"
}
```

### 3. Mode Selection Guide

```python
def recommend_mode(task_type, agent_count, priority):
    if priority == "speed" and agent_count <= 3:
        return "centralized"
    elif priority == "reliability":
        return "mesh" if agent_count <= 5 else "distributed"
    elif priority == "scalability":
        return "hierarchical"
    elif task_type == "research":
        return "distributed"
    elif task_type == "development":
        return "hierarchical"
    else:
        return "hybrid"  # Let system decide
```

## 💡 Advanced Features

### Custom Coordination Parameters

```bash
# Fine-tune coordination behavior
swarm-benchmark run "Task" \
  --mode distributed \
  --coordinator-count 3 \
  --sync-interval 500 \
  --consensus-timeout 30
```

### Mode Switching in Hybrid

```bash
# Configure hybrid mode behavior
swarm-benchmark run "Task" \
  --mode hybrid \
  --mode-switch-threshold 0.7 \
  --preferred-modes "distributed,hierarchical" \
  --adaptation-rate 0.2
```

### Fault Tolerance Settings

```bash
# Enable fault tolerance features
swarm-benchmark run "Task" \
  --mode distributed \
  --enable-failover \
  --coordinator-redundancy 2 \
  --heartbeat-interval 10
```

## 📈 Monitoring Coordination

### Key Metrics to Watch

1. **Coordination Overhead**: Should be <15% of total time
2. **Message Count**: Monitor inter-agent communication
3. **Decision Time**: Time to assign tasks
4. **Synchronization Delay**: Time agents wait for others

### Monitoring Commands

```bash
# Real-time coordination monitoring
swarm-benchmark run "Task" --mode hierarchical --monitor-coordination

# Post-execution analysis
swarm-benchmark analyze <benchmark-id> --coordination-metrics

# Compare mode efficiency
swarm-benchmark compare-modes <task-type> --agent-counts 3,5,8
```

## 🎉 Best Practices Summary

1. **Start Simple**: Use centralized for initial tests
2. **Match Mode to Task**: Consider task characteristics
3. **Right-size Teams**: Don't over-provision agents
4. **Monitor Overhead**: Keep coordination efficient
5. **Test Thoroughly**: Benchmark different modes
6. **Document Findings**: Record what works best

Remember: The optimal coordination mode depends on your specific task requirements, team size, and performance goals. Always benchmark to find the best fit!

---

## From optimization-guide.md

# Performance Optimization Guide

This guide provides comprehensive strategies for optimizing swarm performance based on benchmark results.

## 🎯 Optimization Overview

Swarm optimization focuses on four key areas:
1. **Strategy Selection** - Choosing the right approach
2. **Coordination Efficiency** - Minimizing overhead
3. **Resource Utilization** - Optimizing CPU/memory usage
4. **Task Distribution** - Balancing workload

## 📊 Analyzing Benchmark Results

### Key Metrics to Monitor

```json
{
  "performance_metrics": {
    "execution_time": 0.25,        // Target: < 1s for simple tasks
    "coordination_overhead": 0.08,  // Target: < 10% of execution time
    "success_rate": 0.95           // Target: > 90%
  },
  "resource_usage": {
    "cpu_percent": 25.0,           // Target: < 80% to avoid throttling
    "memory_mb": 256.0,            // Target: < available memory
    "peak_memory_mb": 300.0        // Monitor for memory spikes
  },
  "quality_metrics": {
    "overall_quality": 0.87,       // Target: > 0.85
    "accuracy_score": 0.90,        // Task-specific target
    "completeness_score": 0.85     // Ensure comprehensive results
  }
}
```

### Performance Analysis Commands

```bash
# Compare strategy performance
swarm-benchmark analyze --compare-strategies

# Identify bottlenecks
swarm-benchmark analyze --bottlenecks <benchmark-id>

# Generate performance report
swarm-benchmark report --performance <benchmark-id>
```

## 🚀 Strategy Optimization

### 1. Auto Strategy Optimization

The auto strategy uses pattern matching to select approaches. Optimize by:

```bash
# Test auto strategy effectiveness
swarm-benchmark run "Your task" --strategy auto --verbose

# Fine-tune with hints
swarm-benchmark run "Build API" --strategy auto --hint development
```

**Best Practices:**
- Use clear, descriptive objectives
- Include keywords that indicate task type
- Monitor which strategy auto selects

### 2. Research Strategy Optimization

Optimize research tasks for speed and accuracy:

```bash
# Parallel research with multiple agents
swarm-benchmark run "Research topic" \
  --strategy research \
  --mode distributed \
  --max-agents 8 \
  --parallel
```

**Optimization Tips:**
- Use distributed mode for broad research
- Increase agents for comprehensive coverage
- Set quality thresholds for accuracy

### 3. Development Strategy Optimization

Optimize code generation and development:

```bash
# Hierarchical development for complex projects
swarm-benchmark run "Build microservices" \
  --strategy development \
  --mode hierarchical \
  --max-agents 6 \
  --task-timeout 600
```

**Optimization Tips:**
- Use hierarchical mode for large projects
- Allocate more time for complex tasks
- Enable code review with quality checks

### 4. Analysis Strategy Optimization

Optimize data analysis tasks:

```bash
# Mesh coordination for collaborative analysis
swarm-benchmark run "Analyze dataset" \
  --strategy analysis \
  --mode mesh \
  --parallel \
  --quality-threshold 0.9
```

**Optimization Tips:**
- Use mesh mode for peer review
- Set high quality thresholds
- Enable parallel processing

### 5. Testing Strategy Optimization

Optimize test generation and execution:

```bash
# Distributed testing for speed
swarm-benchmark run "Create test suite" \
  --strategy testing \
  --mode distributed \
  --max-retries 2
```

### 6. Optimization Strategy

For performance tuning tasks:

```bash
# Hybrid mode for adaptive optimization
swarm-benchmark run "Optimize performance" \
  --strategy optimization \
  --mode hybrid \
  --monitor
```

### 7. Maintenance Strategy

For documentation and refactoring:

```bash
# Centralized for consistency
swarm-benchmark run "Update documentation" \
  --strategy maintenance \
  --mode centralized
```

## 🔗 Coordination Mode Optimization

### Centralized Mode
- **Best for**: Small teams (2-3 agents), simple tasks
- **Optimization**: Minimize coordinator selection time
- **Overhead**: ~50ms

```bash
swarm-benchmark run "Simple task" --mode centralized --max-agents 3
```

### Distributed Mode
- **Best for**: Research, parallel tasks
- **Optimization**: Balance coordinator count
- **Overhead**: ~100ms + network latency

```bash
swarm-benchmark run "Research task" --mode distributed --max-agents 8
```

### Hierarchical Mode
- **Best for**: Complex projects, large teams
- **Optimization**: Optimize tree depth
- **Overhead**: ~80ms per level

```bash
swarm-benchmark run "Complex project" --mode hierarchical --max-agents 10
```

### Mesh Mode
- **Best for**: Collaborative tasks, peer review
- **Optimization**: Limit peer connections
- **Overhead**: ~150ms + negotiation time

```bash
swarm-benchmark run "Collaborative task" --mode mesh --max-agents 6
```

### Hybrid Mode
- **Best for**: Mixed workloads, adaptive scenarios
- **Optimization**: Monitor strategy switching
- **Overhead**: Variable, typically 100-200ms

```bash
swarm-benchmark run "Mixed workload" --mode hybrid --max-agents 8
```

## 💡 Optimization Techniques

### 1. Agent Pool Sizing

```python
# Optimal agent count formula
optimal_agents = min(
    task_complexity * 2,  # Scale with complexity
    available_resources,  # Resource constraints
    10                   # Practical upper limit
)
```

### 2. Task Decomposition

Break large tasks into smaller sub-tasks:

```bash
# Instead of:
swarm-benchmark run "Build complete e-commerce platform"

# Use:
swarm-benchmark run "Build user authentication module"
swarm-benchmark run "Build product catalog service"
swarm-benchmark run "Build payment processing"
```

### 3. Resource Limits

Set appropriate resource constraints:

```bash
swarm-benchmark run "Task" \
  --max-memory 512 \
  --max-cpu 80 \
  --timeout 300
```

### 4. Parallel Execution

Enable parallel processing when possible:

```bash
swarm-benchmark run "Independent tasks" \
  --parallel \
  --max-agents 8 \
  --mode distributed
```

### 5. Quality vs Speed Trade-off

```bash
# Fast execution, lower quality
swarm-benchmark run "Task" --quality-threshold 0.7 --task-timeout 60

# High quality, slower execution
swarm-benchmark run "Task" --quality-threshold 0.95 --task-timeout 300
```

## 📈 Performance Monitoring

### Real-time Monitoring

```bash
# Enable monitoring
swarm-benchmark run "Task" --monitor

# Detailed metrics
swarm-benchmark run "Task" --monitor --metrics-interval 1
```

### Post-execution Analysis

```bash
# Generate performance report
swarm-benchmark analyze <benchmark-id> --report performance

# Compare multiple benchmarks
swarm-benchmark compare <id1> <id2> --metrics execution_time,quality
```

## 🎯 Optimization Checklist

- [ ] **Choose appropriate strategy** based on task type
- [ ] **Select optimal coordination mode** for team size
- [ ] **Set realistic resource limits** to prevent waste
- [ ] **Enable parallel execution** when tasks are independent
- [ ] **Monitor coordination overhead** and adjust if > 15%
- [ ] **Balance quality threshold** with execution time
- [ ] **Use task decomposition** for complex objectives
- [ ] **Review benchmark results** and iterate
- [ ] **Cache results** when tasks are repetitive
- [ ] **Profile resource usage** to identify bottlenecks

## 🔍 Troubleshooting Performance Issues

### High Execution Time
1. Check task complexity - decompose if needed
2. Increase agent count for parallel work
3. Switch to distributed/mesh mode
4. Extend timeout limits

### Low Success Rate
1. Review task objectives for clarity
2. Increase quality threshold
3. Add retry logic
4. Use more specialized strategies

### High Resource Usage
1. Limit agent pool size
2. Set memory/CPU constraints
3. Use centralized mode for efficiency
4. Enable resource monitoring

### Coordination Overhead
1. Simplify coordination mode
2. Reduce agent communication
3. Use hierarchical for large teams
4. Cache coordination decisions

## 📚 Advanced Optimization

### Custom Strategy Parameters

```python
# In your benchmark config
{
  "strategy_params": {
    "search_depth": 3,
    "quality_iterations": 2,
    "parallel_factor": 0.8
  }
}
```

### Adaptive Optimization

```bash
# Let the system adapt
swarm-benchmark run "Complex task" \
  --mode hybrid \
  --adaptive \
  --learning-rate 0.1
```

### Performance Profiling

```bash
# Enable detailed profiling
swarm-benchmark run "Task" \
  --profile \
  --profile-output profile.json
```

## 🎉 Best Practices Summary

1. **Start simple** - Use auto strategy and centralized mode
2. **Measure baseline** - Run initial benchmarks
3. **Optimize incrementally** - Change one parameter at a time
4. **Monitor metrics** - Track performance over time
5. **Document findings** - Record what works best
6. **Share results** - Help others optimize

Remember: The best optimization strategy depends on your specific use case. Always benchmark and measure!

---

## From quick-start.md

# Quick Start Guide

Get started with swarm benchmarking in 5 minutes!

## 🚀 Installation

```bash
# Install the benchmark tool
cd benchmark/
pip install -e .
```

## 🎯 Your First Benchmark

### 1. Basic Benchmark

Run a simple benchmark with default settings:

```bash
swarm-benchmark run "Build a user authentication system"
```

### 2. Specify Strategy

Choose a specific strategy for your task:

```bash
swarm-benchmark run "Research cloud providers" --strategy research
```

### 3. Select Coordination Mode

Test different coordination patterns:

```bash
swarm-benchmark run "Develop microservices" --mode distributed
```

### 4. View Results

Check your benchmark results:

```bash
# List recent benchmarks
swarm-benchmark list

# Show specific benchmark details
swarm-benchmark show <benchmark-id>
```

## 📊 Understanding Output

After running a benchmark, you'll see:

```
✅ Benchmark completed successfully!
📊 Results saved to: ./reports
```

The JSON output includes:
- **Task execution time**: How long each task took
- **Resource usage**: CPU and memory consumption
- **Success rate**: Percentage of successful tasks
- **Quality scores**: Accuracy and completeness metrics

## 🎨 Common Scenarios

### Development Tasks
```bash
swarm-benchmark run "Create REST API with authentication" \
  --strategy development \
  --mode hierarchical \
  --max-agents 6
```

### Research Tasks
```bash
swarm-benchmark run "Analyze market trends" \
  --strategy research \
  --mode distributed \
  --parallel
```

### Optimization Tasks
```bash
swarm-benchmark run "Optimize database performance" \
  --strategy optimization \
  --mode hybrid \
  --monitor
```

## 🔧 Quick Tips

1. **Use `--parallel`** for faster execution with multiple agents
2. **Add `--monitor`** to see real-time progress
3. **Use `-v`** flag for verbose output
4. **Check `./reports/` for detailed JSON results**

## 📚 Next Steps

- Read the [Basic Usage Guide](basic-usage.md) for more examples
- Learn about [Swarm Strategies](strategies.md)
- Explore [Coordination Modes](coordination-modes.md)
- See [Optimization Guide](optimization-guide.md) for performance tips

## ❓ Need Help?

- Run `swarm-benchmark --help` for command help
- Check [Troubleshooting Guide](troubleshooting.md) for common issues
- See [CLI Reference](cli-reference.md) for all commands

---

## From strategies.md

# Swarm Strategies Guide

This guide provides detailed information about each of the 7 swarm strategies available in the benchmarking tool.

## 📋 Strategy Overview

| Strategy | Best For | Coordination | Speed | Quality |
|----------|----------|--------------|-------|---------|
| Auto | General tasks | Adaptive | Variable | High |
| Research | Information gathering | Distributed | Medium | Very High |
| Development | Code creation | Hierarchical | Medium | High |
| Analysis | Data processing | Mesh | Slow | Very High |
| Testing | Quality assurance | Distributed | Fast | High |
| Optimization | Performance tuning | Hybrid | Slow | Medium |
| Maintenance | Updates & docs | Centralized | Fast | Medium |

## 🤖 Auto Strategy

The auto strategy intelligently selects the best approach based on task analysis.

### How It Works

```python
# Pattern matching for strategy selection
keywords = {
    "research": ["investigate", "analyze", "study", "explore"],
    "development": ["build", "create", "implement", "code"],
    "analysis": ["analyze", "process", "data", "metrics"],
    "testing": ["test", "validate", "verify", "check"],
    "optimization": ["optimize", "improve", "faster", "performance"],
    "maintenance": ["update", "fix", "refactor", "document"]
}
```

### Usage Example

```bash
swarm-benchmark run "Build a REST API with authentication" --strategy auto
# Auto-selects: development strategy
```

### When to Use
- First-time users
- Mixed or unclear objectives
- Rapid prototyping
- General purpose tasks

### Optimization Tips
- Use clear, descriptive objectives
- Include domain-specific keywords
- Monitor which strategies are selected
- Fine-tune with `--hint` parameter

## 🔍 Research Strategy

Optimized for information gathering, investigation, and exploratory tasks.

### Characteristics
- **Focus**: Breadth of information
- **Approach**: Parallel search paths
- **Validation**: Cross-reference findings
- **Output**: Comprehensive reports

### Usage Example

```bash
swarm-benchmark run "Research best practices for microservices architecture" \
  --strategy research \
  --mode distributed \
  --max-agents 8
```

### Best Practices
1. Use distributed mode for wider coverage
2. Increase agent count for thorough research
3. Set longer timeouts for complex topics
4. Enable result validation

### Typical Tasks
- Technology research
- Market analysis
- Best practices investigation
- Literature reviews
- Competitive analysis

## 💻 Development Strategy

Designed for software development, code generation, and implementation tasks.

### Characteristics
- **Focus**: Code quality and completeness
- **Approach**: Modular development
- **Validation**: Syntax and logic checking
- **Output**: Working code with tests

### Usage Example

```bash
swarm-benchmark run "Develop user authentication microservice" \
  --strategy development \
  --mode hierarchical \
  --max-agents 6 \
  --quality-threshold 0.9
```

### Development Workflow
1. **Architecture Phase**: Design system structure
2. **Implementation Phase**: Write code modules
3. **Integration Phase**: Connect components
4. **Testing Phase**: Validate functionality

### Best Practices
- Use hierarchical mode for complex projects
- Enable code review (high quality threshold)
- Set appropriate timeouts for compilation
- Include test requirements in objective

### Typical Tasks
- API development
- Microservices creation
- Feature implementation
- Code refactoring
- Library development

## 📊 Analysis Strategy

Optimized for data analysis, pattern recognition, and insight generation.

### Characteristics
- **Focus**: Accuracy and insights
- **Approach**: Multi-perspective analysis
- **Validation**: Statistical verification
- **Output**: Reports with visualizations

### Usage Example

```bash
swarm-benchmark run "Analyze customer behavior patterns in sales data" \
  --strategy analysis \
  --mode mesh \
  --parallel \
  --quality-threshold 0.95
```

### Analysis Pipeline
1. **Data Exploration**: Understand dataset
2. **Pattern Detection**: Identify trends
3. **Statistical Analysis**: Validate findings
4. **Insight Generation**: Create recommendations

### Best Practices
- Use mesh mode for peer validation
- Set high quality thresholds (>0.9)
- Enable parallel processing for large datasets
- Include specific metrics in objective

### Typical Tasks
- Data analysis
- Trend identification
- Performance metrics analysis
- User behavior studies
- Business intelligence

## 🧪 Testing Strategy

Specialized for test creation, validation, and quality assurance.

### Characteristics
- **Focus**: Coverage and reliability
- **Approach**: Systematic testing
- **Validation**: Test effectiveness
- **Output**: Test suites with reports

### Usage Example

```bash
swarm-benchmark run "Create comprehensive test suite for payment API" \
  --strategy testing \
  --mode distributed \
  --max-retries 2
```

### Testing Approach
1. **Unit Tests**: Individual components
2. **Integration Tests**: Component interactions
3. **End-to-End Tests**: Complete workflows
4. **Performance Tests**: Load and stress testing

### Best Practices
- Use distributed mode for parallel test execution
- Set retries for flaky test handling
- Include coverage requirements
- Specify test frameworks in objective

### Typical Tasks
- Test suite creation
- API testing
- Integration testing
- Performance testing
- Security testing

## ⚡ Optimization Strategy

Focused on performance improvement, efficiency, and resource optimization.

### Characteristics
- **Focus**: Performance metrics
- **Approach**: Iterative improvement
- **Validation**: Benchmark comparisons
- **Output**: Optimized solutions

### Usage Example

```bash
swarm-benchmark run "Optimize database query performance" \
  --strategy optimization \
  --mode hybrid \
  --monitor \
  --iterations 3
```

### Optimization Process
1. **Profiling**: Identify bottlenecks
2. **Analysis**: Understand root causes
3. **Implementation**: Apply optimizations
4. **Validation**: Measure improvements

### Best Practices
- Use hybrid mode for adaptive optimization
- Enable monitoring for real-time feedback
- Set baseline measurements
- Use iterative approach

### Typical Tasks
- Performance tuning
- Query optimization
- Algorithm improvement
- Resource utilization
- Scalability enhancement

## 🔧 Maintenance Strategy

Designed for updates, documentation, refactoring, and system maintenance.

### Characteristics
- **Focus**: Consistency and clarity
- **Approach**: Systematic updates
- **Validation**: Compatibility checking
- **Output**: Updated code/docs

### Usage Example

```bash
swarm-benchmark run "Update API documentation and refactor legacy code" \
  --strategy maintenance \
  --mode centralized \
  --max-agents 3
```

### Maintenance Workflow
1. **Assessment**: Identify needed updates
2. **Planning**: Prioritize changes
3. **Implementation**: Apply updates
4. **Verification**: Ensure compatibility

### Best Practices
- Use centralized mode for consistency
- Keep agent count low (2-3)
- Include specific maintenance goals
- Enable version tracking

### Typical Tasks
- Documentation updates
- Code refactoring
- Dependency updates
- Bug fixes
- Technical debt reduction

## 🎯 Strategy Selection Guide

### Decision Matrix

| If your task involves... | Use this strategy |
|-------------------------|-------------------|
| Multiple possible approaches | Auto |
| Information gathering | Research |
| Creating new code | Development |
| Processing data | Analysis |
| Ensuring quality | Testing |
| Improving performance | Optimization |
| Updating existing systems | Maintenance |

### Combining Strategies

For complex projects, combine strategies:

```bash
# Research first
swarm-benchmark run "Research authentication methods" --strategy research

# Then develop
swarm-benchmark run "Implement chosen auth method" --strategy development

# Finally test
swarm-benchmark run "Test authentication system" --strategy testing
```

## 📊 Performance Comparison

### Execution Time (Average)
- Maintenance: 0.14s ⚡
- Research: 0.10s ⚡
- Testing: 0.12s ⚡
- Analysis: 0.15s 
- Optimization: 0.18s 
- Development: 0.20s 
- Auto: 0.16s (varies)

### Quality Scores (Average)
- Research: 0.95 ⭐
- Analysis: 0.93 ⭐
- Testing: 0.90 ⭐
- Development: 0.88
- Auto: 0.87
- Optimization: 0.85
- Maintenance: 0.82

## 🚀 Advanced Strategy Features

### Custom Parameters

Each strategy supports custom parameters:

```bash
swarm-benchmark run "Task" \
  --strategy development \
  --strategy-params '{"code_style": "functional", "test_coverage": 0.95}'
```

### Strategy Chaining

Chain strategies for complex workflows:

```bash
# Research → Development → Testing pipeline
swarm-benchmark pipeline \
  --stages research,development,testing \
  --objective "Create authentication system"
```

### Adaptive Strategies

Enable learning from previous runs:

```bash
swarm-benchmark run "Task" \
  --strategy auto \
  --adaptive \
  --history-weight 0.3
```

## 💡 Tips for Success

1. **Match strategy to task type** - Use the decision matrix
2. **Start with auto** - Let the system guide you
3. **Experiment with modes** - Different coordinations work better with different strategies
4. **Monitor metrics** - Track what works best for your use cases
5. **Combine strategies** - Use pipelines for complex projects
6. **Customize parameters** - Fine-tune for your specific needs

Remember: The best strategy depends on your specific requirements. Benchmark different approaches to find what works best!

---

## From PARALLEL_EXECUTION.md

# Parallel Execution System for Swarm Benchmarking

## Overview

The parallel execution system provides efficient, scalable execution of multiple benchmark tasks with comprehensive resource management, task scheduling, and progress monitoring.

## Key Components

### 1. ParallelExecutor (`parallel_executor.py`)

The core execution engine that manages concurrent task execution with multiple execution modes:

- **Thread-based execution**: For I/O-bound tasks
- **Process-based execution**: For CPU-bound tasks  
- **Asyncio-based execution**: For async/await compatible tasks
- **Hybrid execution**: Automatically chooses the best mode based on task characteristics

#### Features:
- Priority-based task queue with configurable size limits
- Resource monitoring and enforcement (CPU, memory)
- Automatic resource violation detection and throttling
- Execution metrics tracking (throughput, latency, resource usage)
- Graceful shutdown with task cleanup

### 2. TaskScheduler (`task_scheduler.py`)

Advanced task scheduling with multiple algorithms:

#### Scheduling Algorithms:
- **Round Robin**: Simple fair distribution
- **Least Loaded**: Assigns tasks to least busy agents
- **Capability-Based**: Matches task requirements to agent capabilities
- **Priority-Based**: Assigns high-priority tasks to best-performing agents
- **Dynamic**: Multi-factor scheduling considering capabilities, workload, and performance
- **Work Stealing**: Allows idle agents to steal tasks from busy agents

#### Features:
- Task dependency resolution with topological sorting
- Agent capability indexing for O(1) capability matching
- Work stealing queue for load balancing
- Scheduling metrics (load balance score, capability match score)
- Dynamic workload rebalancing

### 3. OrchestrationManager (`orchestration_manager.py`)

High-level orchestration for managing complex benchmark suites:

#### Features:
- Parallel benchmark suite execution
- Auto-scaling based on resource utilization
- Progress tracking and reporting
- Agent pool management with diverse agent types
- Comprehensive metrics aggregation
- Adaptive execution with optimization support

## Usage Examples

### Basic Parallel Execution

```python
from swarm_benchmark.core import ParallelExecutor, ExecutionMode, ResourceLimits

# Configure resource limits
limits = ResourceLimits(
    max_cpu_percent=80.0,
    max_memory_mb=1024.0,
    max_concurrent_tasks=10
)

# Create executor
executor = ParallelExecutor(
    mode=ExecutionMode.HYBRID,
    limits=limits
)

# Start executor
await executor.start()

# Submit tasks
task_ids = []
for task in tasks:
    task_id = await executor.submit_task(task, priority=1)
    task_ids.append(task_id)

# Wait for completion
await executor.wait_for_completion(timeout=300)

# Get results
results = await executor.get_all_results()

# Shutdown
await executor.stop()
```

### Advanced Orchestration

```python
from swarm_benchmark.core import (
    OrchestrationManager, 
    OrchestrationConfig,
    SchedulingAlgorithm
)

# Configure orchestration
config = OrchestrationConfig(
    execution_mode=ExecutionMode.HYBRID,
    scheduling_algorithm=SchedulingAlgorithm.DYNAMIC,
    enable_work_stealing=True,
    auto_scaling=True,
    max_parallel_benchmarks=10
)

# Create manager
orchestrator = OrchestrationManager(config)

# Run benchmark suite
results = await orchestrator.run_benchmark_suite(
    objectives=["objective1", "objective2", "objective3"],
    config=benchmark_config
)

# Get comprehensive metrics
metrics = orchestrator.get_orchestration_metrics()
```

## Resource Management

### Resource Monitoring
- Real-time CPU and memory usage tracking
- Network I/O monitoring (when available)
- Resource violation detection and logging
- Peak usage tracking for capacity planning

### Resource Limits
```python
ResourceLimits(
    max_cpu_percent=80.0,      # Maximum CPU usage percentage
    max_memory_mb=1024.0,      # Maximum memory in MB
    max_concurrent_tasks=10,   # Maximum parallel tasks
    max_queue_size=1000,       # Maximum queued tasks
    task_timeout=300,          # Task timeout in seconds
    monitoring_interval=1.0    # Resource check interval
)
```

## Task Scheduling

### Task Priority
Tasks can be assigned priorities (higher number = higher priority):
- Priority 1-3: Low priority (eligible for work stealing)
- Priority 4-6: Normal priority
- Priority 7-9: High priority (assigned to best agents)
- Priority 10: Critical (immediate execution)

### Agent Capabilities
Agents have capabilities that are matched to task requirements:
- Research: `research`, `analysis`, `web_search`
- Development: `development`, `coding`, `architecture`
- Analysis: `analysis`, `data_processing`, `statistics`
- Testing: `testing`, `validation`, `quality_assurance`
- Optimization: `optimization`, `performance`, `profiling`

## Metrics and Monitoring

### Execution Metrics
```python
ExecutionMetrics(
    tasks_queued=0,            # Number of tasks waiting
    tasks_running=0,           # Currently executing tasks
    tasks_completed=0,         # Successfully completed tasks
    tasks_failed=0,            # Failed tasks
    total_execution_time=0.0,  # Total execution time
    average_execution_time=0.0,# Average per task
    peak_cpu_usage=0.0,        # Peak CPU percentage
    peak_memory_usage=0.0,     # Peak memory in MB
    throughput=0.0             # Tasks per second
)
```

### Scheduling Metrics
```python
SchedulingMetrics(
    total_scheduled=0,         # Total tasks scheduled
    scheduling_time=0.0,       # Time spent scheduling
    load_balance_score=0.0,    # Load distribution quality (0-1)
    capability_match_score=0.0,# Capability matching quality (0-1)
    max_agent_load=0,          # Maximum tasks per agent
    min_agent_load=0           # Minimum tasks per agent
)
```

## Performance Optimization

### Execution Modes
Choose the appropriate execution mode based on your workload:

1. **ASYNCIO**: Best for I/O-bound tasks with async/await support
2. **THREAD**: Good for I/O-bound tasks without async support
3. **PROCESS**: Best for CPU-bound tasks that can be parallelized
4. **HYBRID**: Automatically selects based on task characteristics

### Optimization Tips

1. **Use Work Stealing** for dynamic workloads with varying task durations
2. **Enable Auto-scaling** for unpredictable workloads
3. **Set appropriate resource limits** to prevent system overload
4. **Use capability-based scheduling** for heterogeneous tasks
5. **Monitor metrics** to identify bottlenecks and optimize

## Error Handling

The system provides comprehensive error handling:

1. **Task Failures**: Failed tasks are tracked separately with error details
2. **Resource Violations**: Automatic throttling when limits are exceeded
3. **Timeout Handling**: Tasks exceeding timeout are cancelled gracefully
4. **Graceful Shutdown**: All running tasks are completed or cancelled properly

## Integration with Benchmark Engine

The parallel execution system integrates seamlessly with the benchmark engine:

```python
# Using OptimizedBenchmarkEngine with parallel execution
engine = OptimizedBenchmarkEngine(
    config=benchmark_config,
    enable_optimizations=True
)

# The engine automatically uses parallel execution
result = await engine.run_benchmark(objective)
```

## Best Practices

1. **Start with conservative resource limits** and increase based on monitoring
2. **Use priority levels** to ensure critical tasks complete first
3. **Enable work stealing** for better load distribution
4. **Monitor queue wait times** to identify capacity issues
5. **Use appropriate execution modes** for your task types
6. **Implement proper error handling** for task failures
7. **Set reasonable timeouts** to prevent hanging tasks
8. **Use auto-scaling** for variable workloads

## Troubleshooting

### High CPU Usage
- Reduce `max_concurrent_tasks`
- Lower `max_cpu_percent` limit
- Use THREAD mode instead of PROCESS for I/O tasks

### High Memory Usage
- Reduce `max_memory_mb` limit
- Limit queue size with `max_queue_size`
- Use streaming/chunking for large data

### Poor Load Balance
- Switch to DYNAMIC or WORK_STEALING scheduling
- Enable work stealing
- Check agent capability distribution

### Task Timeouts
- Increase `task_timeout` for long-running tasks
- Break large tasks into smaller subtasks
- Check for resource contention

## Future Enhancements

1. **Distributed Execution**: Support for multi-node execution
2. **GPU Support**: Resource monitoring and scheduling for GPU tasks
3. **Advanced Scheduling**: Machine learning-based task scheduling
4. **Checkpointing**: Save and resume long-running benchmarks
5. **Real-time Dashboard**: Web-based monitoring interface

---

## From integration_guide.md

# Claude-Flow Integration Guide

This guide explains how to use the claude-flow integration layer for benchmark testing and automation.

## Overview

The integration layer provides a robust Python interface to execute claude-flow commands with:

- **Command Construction**: Build valid claude-flow commands with proper validation
- **Subprocess Execution**: Execute commands with timeout and error handling
- **Output Capture**: Comprehensive capture and parsing of command output
- **Performance Monitoring**: Track CPU, memory, disk, and network usage
- **Error Handling**: Categorize errors and provide recovery suggestions
- **Retry Logic**: Automatic retry for transient failures

## Installation

The integration layer is part of the benchmark suite. Ensure you have:

```bash
# Claude-flow installed and accessible
claude-flow --version

# Python dependencies
pip install psutil
```

## Core Components

### 1. ClaudeFlowExecutor

The main executor class for running claude-flow commands:

```python
from swarm_benchmark.core.claude_flow_executor import (
    ClaudeFlowExecutor, SwarmConfig, SparcConfig,
    ExecutionStrategy, CoordinationMode, SparcMode
)

# Initialize executor
executor = ClaudeFlowExecutor(
    claude_flow_path=None,  # Auto-detect
    working_dir=None,       # Use current directory
    retry_attempts=3,       # Retry failed commands
    retry_delay=2.0        # Seconds between retries
)

# Validate installation
if executor.validate_installation():
    print("Claude-flow is ready!")
```

### 2. Swarm Execution

Execute swarm commands with full configuration:

```python
# Configure swarm
config = SwarmConfig(
    objective="Build a REST API with authentication",
    strategy=ExecutionStrategy.DEVELOPMENT,
    mode=CoordinationMode.HIERARCHICAL,
    max_agents=8,
    timeout=30,  # minutes
    parallel=True,
    monitor=True,
    output=OutputFormat.JSON,
    output_dir="./reports",
    
    # Advanced options
    batch_optimized=True,
    memory_shared=True,
    file_ops_parallel=True
)

# Execute
result = executor.execute_swarm(config)

# Check results
if result.success:
    print(f"Success! Duration: {result.duration}s")
    print(f"Output files: {result.output_files}")
    print(f"Metrics: {result.metrics}")
else:
    print(f"Failed: {result.stderr}")
```

### 3. SPARC Execution

Execute SPARC commands with different modes:

```python
# Configure SPARC
config = SparcConfig(
    prompt="Optimize database queries for performance",
    mode=SparcMode.OPTIMIZER,
    memory_key="db_optimization",
    parallel=True,
    batch=True,
    timeout=15  # minutes
)

# Execute
result = executor.execute_sparc(config)
```

### 4. Output Parsing

Parse and extract structured information from output:

```python
from swarm_benchmark.core.integration_utils import OutputParser

# Parse command output
parsed = OutputParser.parse_output(result.stdout)

# Access parsed data
print(f"Tasks created: {parsed['tasks']['created']}")
print(f"Agents used: {parsed['agents']['started']}")
print(f"Errors: {parsed['errors']}")
print(f"Test coverage: {parsed['tests']['coverage']}%")

# Extract JSON blocks
json_blocks = OutputParser.extract_json_blocks(result.stdout)
```

### 5. Performance Monitoring

Monitor system resources during execution:

```python
from swarm_benchmark.core.integration_utils import performance_monitoring

# Monitor performance
with performance_monitoring(interval=1.0) as monitor:
    result = executor.execute_swarm(config)
    
# Get metrics
metrics = monitor.metrics.get_summary()
print(f"Average CPU: {metrics['cpu']['avg']}%")
print(f"Peak Memory: {metrics['memory']['max']}%")
print(f"Total disk write: {metrics['disk_io']['write_total']} bytes")
```

### 6. Error Handling

Handle and categorize errors intelligently:

```python
from swarm_benchmark.core.integration_utils import ErrorHandler

if not result.success:
    # Categorize error
    category = ErrorHandler.categorize_error(result.stderr)
    suggestion = ErrorHandler.get_recovery_suggestion(category)
    should_retry = ErrorHandler.should_retry(category)
    
    print(f"Error category: {category}")
    print(f"Suggestion: {suggestion}")
    
    if should_retry:
        # Retry with different configuration
        config.timeout *= 2
        result = executor.execute_swarm(config)
```

## Usage Patterns

### Basic Swarm Execution

```python
# Simple development swarm
config = SwarmConfig(
    objective="Create a TODO app with React",
    strategy=ExecutionStrategy.DEVELOPMENT,
    max_agents=5
)
result = executor.execute_swarm(config)
```

### Research Swarm with Parallel Execution

```python
# Research swarm with advanced features
config = SwarmConfig(
    objective="Research microservices best practices",
    strategy=ExecutionStrategy.RESEARCH,
    mode=CoordinationMode.DISTRIBUTED,
    max_agents=10,
    parallel=True,
    batch_optimized=True,
    memory_shared=True
)
result = executor.execute_swarm(config)
```

### Testing Swarm with Coverage

```python
# Comprehensive testing
config = SwarmConfig(
    objective="Run full test suite with coverage",
    strategy=ExecutionStrategy.TESTING,
    mode=CoordinationMode.DISTRIBUTED,
    max_agents=12,
    parallel=True,
    test_types=["unit", "integration", "e2e"],
    coverage_target=90,
    file_ops_parallel=True
)
result = executor.execute_swarm(config)
```

### SPARC Mode Execution

```python
# Different SPARC modes
modes = [
    (SparcMode.TDD, "Create tests for user service"),
    (SparcMode.CODER, "Implement user authentication"),
    (SparcMode.REVIEWER, "Review security implementation"),
    (SparcMode.OPTIMIZER, "Optimize query performance"),
    (SparcMode.DOCUMENTER, "Generate API documentation")
]

for mode, prompt in modes:
    config = SparcConfig(prompt=prompt, mode=mode)
    result = executor.execute_sparc(config)
```

### Memory Operations

```python
# Store results in memory
data = {"benchmark": "results", "score": 95}
executor.execute_memory_store("benchmark_key", data)

# Retrieve from memory
result, data = executor.execute_memory_get("benchmark_key")
```

## Advanced Features

### Async Execution

```python
import asyncio

async def run_multiple_swarms():
    configs = [
        SwarmConfig(objective="Task 1", strategy=ExecutionStrategy.DEVELOPMENT),
        SwarmConfig(objective="Task 2", strategy=ExecutionStrategy.TESTING),
        SwarmConfig(objective="Task 3", strategy=ExecutionStrategy.ANALYSIS)
    ]
    
    # Execute in parallel
    tasks = [
        executor.execute_async("swarm", config) 
        for config in configs
    ]
    results = await asyncio.gather(*tasks)
    return results
```

### Progress Tracking

```python
from swarm_benchmark.core.integration_utils import ProgressTracker

tracker = ProgressTracker()
tracker.start()

# Parse output stream
for line in result.stdout.splitlines():
    tracker.parse_output_stream(line)
    
# Get summary
summary = tracker.get_summary()
print(f"Tasks completed: {summary['tasks']['completed']}")
```

### Command Validation

```python
from swarm_benchmark.core.integration_utils import CommandBuilder

# Validate configuration
config_dict = {
    "objective": "Build API",
    "strategy": "development",
    "max_agents": 5
}

errors = CommandBuilder.validate_swarm_config(config_dict)
if errors:
    print(f"Configuration errors: {errors}")
```

## Best Practices

1. **Always validate installation** before running commands
2. **Use dry_run=True** for testing configurations
3. **Set appropriate timeouts** based on task complexity
4. **Enable performance monitoring** for resource-intensive tasks
5. **Parse output** to extract meaningful metrics
6. **Handle errors gracefully** with retry logic
7. **Use memory** for cross-agent coordination
8. **Monitor progress** for long-running tasks

## Error Recovery

The integration layer provides automatic error recovery:

```python
# Configure with retry
executor = ClaudeFlowExecutor(
    retry_attempts=5,
    retry_delay=3.0
)

# Errors are automatically retried for:
# - Network failures
# - Timeouts
# - Resource exhaustion

# Manual retry logic
max_attempts = 3
for attempt in range(max_attempts):
    result = executor.execute_swarm(config)
    if result.success:
        break
    
    if not ErrorHandler.should_retry(
        ErrorHandler.categorize_error(result.stderr)
    ):
        break
        
    # Increase timeout for next attempt
    config.timeout *= 1.5
```

## Troubleshooting

### Command Not Found

```python
# Specify explicit path
executor = ClaudeFlowExecutor(
    claude_flow_path="/path/to/claude-flow"
)
```

### Timeout Issues

```python
# Increase timeout
config.timeout = 120  # 2 hours

# Or disable timeout
result = executor._execute_command(
    command, 
    timeout=None
)
```

### Output Too Large

```python
# Use output files instead
config.output = OutputFormat.JSON
config.output_dir = "./large_output"

# Files will be in result.output_files
```

## Example Scripts

See the following example scripts:

- `example_usage.py` - Comprehensive examples
- `test_integration.py` - Integration test suite
- `quick_test_integration.py` - Quick validation test

## Integration with Benchmarks

The integration layer is designed to work seamlessly with the benchmark system:

```python
from swarm_benchmark.core.benchmark_runner import BenchmarkRunner
from swarm_benchmark.core.claude_flow_executor import ClaudeFlowExecutor

# Use executor within benchmarks
class MyBenchmark:
    def __init__(self):
        self.executor = ClaudeFlowExecutor()
        
    def run_test(self):
        config = SwarmConfig(...)
        result = self.executor.execute_swarm(config)
        return result.metrics
```

---

## From real-benchmark-architecture.md

# Real Claude-Flow Benchmark Architecture

## Overview

The Real Benchmark Engine is a comprehensive system designed to execute and measure actual `claude-flow` commands, capturing detailed performance metrics, resource usage, and quality assessments. This architecture enables systematic testing of all 17 SPARC modes and 6 swarm strategies across 5 coordination modes.

## Architecture Components

### 1. Core Engine (`RealBenchmarkEngine`)

The main orchestrator that manages the entire benchmarking lifecycle:

```python
class RealBenchmarkEngine:
    - Locates claude-flow executable
    - Manages benchmark execution
    - Coordinates resource monitoring
    - Handles result aggregation
    - Manages temporary workspaces
```

**Key Features:**
- Automatic claude-flow discovery across multiple paths
- Subprocess-based execution with full isolation
- Configurable parallelism and timeout handling
- Comprehensive error handling and recovery

### 2. Resource Monitoring System

#### ProcessMetrics
Captures fine-grained resource usage data:
- CPU utilization (per-process and children)
- Memory consumption (RSS, peak usage)
- I/O operations (read/write bytes and counts)
- Temporal sampling for trend analysis

#### ResourceMonitor
Background thread-based monitoring:
- Configurable sampling interval (default: 100ms)
- Hierarchical process tracking (parent + children)
- Non-blocking operation
- Graceful handling of process termination

#### SystemMonitor
Overall system resource tracking:
- Baseline measurements
- System-wide CPU and memory usage
- Disk and network I/O statistics
- Comparative analysis capabilities

### 3. Execution Pipeline

```
Task Definition → Command Building → Process Execution → Resource Monitoring → Result Collection → Quality Assessment → Persistence
```

#### Command Building
Intelligent command construction based on:
- Task strategy type (SPARC mode vs. Swarm)
- Coordination mode selection
- Configuration parameters
- Non-interactive flag enforcement

#### Process Execution
Asynchronous subprocess management:
- `asyncio`-based process control
- Configurable timeout enforcement
- Stdout/stderr capture
- Environment variable injection

### 4. Quality Metrics System

Multi-dimensional quality assessment:

```python
QualityMetrics:
    - accuracy_score: Command execution correctness
    - completeness_score: Output comprehensiveness
    - consistency_score: Result reliability
    - relevance_score: Task alignment
    - overall_quality: Weighted composite score
```

Quality estimation algorithm:
1. Base scoring on execution success
2. Output analysis for completeness
3. Error pattern detection
4. Weighted aggregation

### 5. Parallel Execution Framework

Configurable parallelism modes:

#### Sequential Mode
- Ordered task execution
- Predictable resource usage
- Simplified debugging

#### Parallel Mode
- Semaphore-based concurrency control
- Configurable max parallel tasks
- Resource-aware scheduling
- Exception isolation

### 6. Data Models Integration

Seamless integration with existing benchmark models:
- `Task`: Enhanced with real execution parameters
- `Result`: Populated with actual metrics
- `Benchmark`: Comprehensive execution records
- `Agent`: Real claude-flow process representation

## Execution Modes

### 1. Single Task Benchmarking
```python
result = await engine.run_benchmark("Create a REST API")
```

### 2. Batch Execution
```python
results = await engine.execute_batch(task_list)
```

### 3. Comprehensive Mode Testing
```python
all_results = await engine.benchmark_all_modes("Build a web app")
```

## SPARC Mode Support

All 17 SPARC modes with specialized handling:

### Core Development Modes
- **coder**: Code generation benchmarks
- **architect**: System design evaluation
- **reviewer**: Code review simulation
- **tdd**: Test-driven development cycles

### Analysis & Research Modes
- **researcher**: Information gathering tests
- **analyzer**: Code analysis benchmarks
- **optimizer**: Performance optimization
- **debugger**: Issue resolution testing

### Creative & Support Modes
- **designer**: UI/UX design tasks
- **innovator**: Creative problem solving
- **documenter**: Documentation generation
- **tester**: Test suite creation

### Orchestration Modes
- **orchestrator**: Multi-agent coordination
- **swarm-coordinator**: Swarm management
- **workflow-manager**: Process automation
- **batch-executor**: Parallel execution
- **memory-manager**: Knowledge management

## Swarm Strategy Support

### Strategies (6 types)
1. **auto**: Adaptive strategy selection
2. **research**: Information gathering swarms
3. **development**: Code creation swarms
4. **analysis**: Code analysis swarms
5. **testing**: Quality assurance swarms
6. **optimization**: Performance improvement swarms
7. **maintenance**: System maintenance swarms

### Coordination Modes (5 types)
1. **centralized**: Single coordinator model
2. **distributed**: Peer-to-peer coordination
3. **hierarchical**: Multi-level management
4. **mesh**: Full interconnection
5. **hybrid**: Adaptive coordination

## Monitoring & Metrics

### Performance Metrics
- Execution time (wall clock)
- Queue time (if applicable)
- Throughput (tasks/second)
- Success/failure rates
- Retry counts
- Coordination overhead

### Resource Metrics
- CPU utilization (average, peak)
- Memory usage (average, peak)
- I/O operations (read/write)
- Network traffic (if measurable)
- Process count
- Thread count

### Quality Metrics
- Output quality scoring
- Task completion assessment
- Error rate analysis
- Consistency evaluation

## Output Formats

### JSON Reports
Structured data with:
- Complete execution details
- Resource usage graphs
- Quality assessments
- Comparative analysis

### SQLite Database
Queryable storage for:
- Historical trending
- Cross-benchmark analysis
- Performance regression detection
- Resource usage patterns

## Error Handling

### Graceful Degradation
- Process timeout handling
- Resource exhaustion management
- Network failure resilience
- Filesystem error recovery

### Error Classification
- Execution errors
- Resource errors
- Quality failures
- System errors

## Best Practices

### 1. Resource Management
- Use temporary workspaces for isolation
- Clean up after execution
- Monitor system resources
- Set appropriate timeouts

### 2. Parallel Execution
- Configure based on system capacity
- Use semaphores for rate limiting
- Monitor resource contention
- Handle partial failures

### 3. Quality Assessment
- Define task-specific quality criteria
- Use multiple quality dimensions
- Validate output correctness
- Track quality trends

### 4. Performance Optimization
- Batch similar tasks
- Reuse process resources
- Cache command templates
- Minimize I/O operations

## Integration Points

### 1. CLI Integration
```bash
# Run real benchmarks
python -m swarm_benchmark real --objective "Build a CLI tool" --all-modes

# Specific mode testing
python -m swarm_benchmark real --mode sparc-coder --objective "Create a parser"

# Swarm strategy testing
python -m swarm_benchmark real --strategy development --mode hierarchical
```

### 2. API Integration
```python
from swarm_benchmark.core.real_benchmark_engine import RealBenchmarkEngine

engine = RealBenchmarkEngine(config)
results = await engine.run_benchmark("Create a web scraper")
```

### 3. Continuous Integration
```yaml
# CI/CD pipeline integration
- name: Run Claude-Flow Benchmarks
  run: |
    python -m swarm_benchmark real \
      --objective "${{ matrix.objective }}" \
      --timeout 300 \
      --output-format json sqlite
```

## Future Enhancements

### 1. Advanced Monitoring
- GPU usage tracking
- Container resource limits
- Distributed execution support
- Cloud provider integration

### 2. Quality Improvements
- ML-based quality scoring
- Semantic output analysis
- Task-specific validators
- Human evaluation integration

### 3. Scalability Features
- Distributed benchmarking
- Result streaming
- Incremental processing
- Cloud-native deployment

### 4. Analysis Capabilities
- Real-time dashboards
- Anomaly detection
- Performance prediction
- Optimization recommendations

## Conclusion

The Real Benchmark Engine provides a robust, extensible framework for systematically evaluating claude-flow performance across all supported modes and strategies. Its modular architecture enables easy extension while maintaining reliability and accuracy in measurements.

---

## From real-benchmark-quickstart.md

# Real Claude-Flow Benchmark Quick Start Guide

## Overview

The Real Benchmark Engine executes actual `claude-flow` commands and captures comprehensive performance metrics, resource usage, and quality assessments. This guide helps you get started quickly.

## Installation

1. Ensure `claude-flow` is installed and accessible:
```bash
which claude-flow
# or
claude-flow --version
```

2. Install benchmark dependencies:
```bash
cd benchmark
pip install -r requirements.txt
pip install -e .
```

## Basic Usage

### 1. Simple Benchmark

Run a basic benchmark with default settings:

```bash
python -m swarm_benchmark real "Create a hello world function"
```

### 2. Test Specific SPARC Mode

Test a specific SPARC mode:

```bash
python -m swarm_benchmark real "Build a REST API" --sparc-mode coder
python -m swarm_benchmark real "Analyze code quality" --sparc-mode analyzer
python -m swarm_benchmark real "Design system architecture" --sparc-mode architect
```

### 3. Test Swarm Strategies

Test different swarm strategies with coordination modes:

```bash
# Development strategy with hierarchical coordination
python -m swarm_benchmark real "Build a web app" \
  --strategy development \
  --mode hierarchical

# Research strategy with distributed coordination
python -m swarm_benchmark real "Research AI trends" \
  --strategy research \
  --mode distributed \
  --parallel

# Analysis strategy with mesh coordination
python -m swarm_benchmark real "Analyze codebase" \
  --strategy analysis \
  --mode mesh \
  --monitor
```

### 4. Parallel Execution

Enable parallel task execution for faster benchmarking:

```bash
python -m swarm_benchmark real "Create multiple components" \
  --parallel \
  --max-agents 4 \
  --task-timeout 60
```

### 5. Resource Monitoring

Enable detailed resource monitoring:

```bash
python -m swarm_benchmark real "Process large dataset" \
  --monitor \
  --output json sqlite \
  --output-dir ./benchmark-results
```

### 6. Comprehensive Testing

Test all SPARC modes and swarm strategies:

```bash
# WARNING: This is resource-intensive and may take a long time!
python -m swarm_benchmark real "Build a complete application" \
  --all-modes \
  --parallel \
  --timeout 120
```

## Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--strategy` | Swarm strategy (auto, research, development, etc.) | auto |
| `--mode` | Coordination mode (centralized, distributed, etc.) | centralized |
| `--sparc-mode` | Specific SPARC mode to test | None |
| `--all-modes` | Test all SPARC modes and strategies | False |
| `--max-agents` | Maximum parallel agents | 5 |
| `--timeout` | Overall timeout in minutes | 60 |
| `--task-timeout` | Individual task timeout in seconds | 300 |
| `--parallel` | Enable parallel execution | False |
| `--monitor` | Enable resource monitoring | False |
| `--output` | Output formats (json, sqlite) | json |
| `--output-dir` | Output directory | ./reports |
| `--verbose` | Enable verbose output | False |

## Examples

### Example 1: Quick SPARC Mode Comparison

```bash
#!/bin/bash
# compare_sparc_modes.sh

OBJECTIVE="Create a user authentication system"

for mode in coder architect reviewer tdd; do
    echo "Testing SPARC mode: $mode"
    python -m swarm_benchmark real "$OBJECTIVE" \
        --sparc-mode $mode \
        --output-dir ./sparc-comparison
done
```

### Example 2: Strategy Performance Analysis

```bash
#!/bin/bash
# analyze_strategies.sh

OBJECTIVE="Build a data processing pipeline"

for strategy in development research analysis optimization; do
    for mode in centralized distributed hierarchical; do
        echo "Testing $strategy with $mode coordination"
        python -m swarm_benchmark real "$OBJECTIVE" \
            --strategy $strategy \
            --mode $mode \
            --parallel \
            --monitor \
            --output json sqlite
    done
done
```

### Example 3: Resource Usage Profiling

```python
#!/usr/bin/env python3
# profile_resources.py

import asyncio
from swarm_benchmark.core.real_benchmark_engine import RealBenchmarkEngine
from swarm_benchmark.core.models import BenchmarkConfig, StrategyType

async def profile_task():
    config = BenchmarkConfig(
        name="resource-profile",
        monitoring=True,
        parallel=True,
        max_agents=3
    )
    
    engine = RealBenchmarkEngine(config)
    result = await engine.run_benchmark("Analyze system performance")
    
    # Extract resource metrics
    if result['results']:
        metrics = result['results'][0]['resource_usage']
        print(f"Peak Memory: {metrics['peak_memory_mb']:.1f} MB")
        print(f"Average CPU: {metrics['average_cpu_percent']:.1f}%")

asyncio.run(profile_task())
```

## Output Analysis

### JSON Output Structure

```json
{
  "benchmark_id": "uuid",
  "status": "success",
  "duration": 45.2,
  "results": [{
    "task_id": "uuid",
    "status": "success",
    "execution_time": 42.1,
    "resource_usage": {
      "cpu_percent": 35.2,
      "memory_mb": 128.5,
      "peak_memory_mb": 256.0
    },
    "quality_metrics": {
      "accuracy": 0.9,
      "completeness": 0.85,
      "overall": 0.88
    }
  }]
}
```

### Analyzing Results

1. **Performance Metrics**
   - Execution time comparison
   - Resource utilization patterns
   - Parallelization efficiency

2. **Quality Assessment**
   - Output completeness
   - Task accuracy
   - Consistency across runs

3. **Resource Usage**
   - CPU utilization trends
   - Memory consumption patterns
   - I/O operation statistics

## Best Practices

1. **Start Small**
   - Test individual SPARC modes first
   - Use shorter timeouts initially
   - Monitor resource usage

2. **Scale Gradually**
   - Increase parallel agents incrementally
   - Test complex strategies after simple ones
   - Use comprehensive mode sparingly

3. **Monitor Resources**
   - Always enable monitoring for long runs
   - Set appropriate resource limits
   - Watch for memory leaks

4. **Analyze Results**
   - Compare across multiple runs
   - Look for performance patterns
   - Identify bottlenecks

## Troubleshooting

### Issue: claude-flow not found
```bash
# Check installation
which claude-flow

# Add to PATH if needed
export PATH="$PATH:/path/to/claude-flow"
```

### Issue: Timeout errors
```bash
# Increase timeout
python -m swarm_benchmark real "Complex task" \
  --task-timeout 600 \
  --timeout 120
```

### Issue: Resource exhaustion
```bash
# Limit parallel execution
python -m swarm_benchmark real "Heavy task" \
  --max-agents 2 \
  --monitor
```

## Advanced Usage

For advanced usage patterns and comprehensive examples, see:
- [Real Benchmark Architecture](./real-benchmark-architecture.md)
- [Examples Directory](../examples/)
- [API Documentation](./api-reference.md)

## Next Steps

1. Run your first benchmark
2. Compare different SPARC modes
3. Test swarm strategies
4. Analyze performance patterns
5. Optimize based on results

Happy benchmarking! 🚀

---

## From real_metrics_collection.md

# Real Metrics Collection for Claude-Flow Benchmarks

## Overview

The real metrics collection system provides accurate, real-time performance monitoring for claude-flow benchmarks. Unlike simulated metrics, this system captures actual execution data including:

- **Execution time** (wall clock and CPU time)
- **Memory usage** (peak and average)
- **Process metrics** (subprocess resource usage)
- **Output size and complexity**
- **Success/failure rates**

## Architecture

### Core Components

1. **PerformanceCollector** - Collects timing and CPU metrics
2. **ResourceMonitor** - Monitors memory and system resources
3. **ProcessTracker** - Tracks claude-flow subprocess execution
4. **MetricsAggregator** - Aggregates metrics from all sources

### Metrics Flow

```
claude-flow command
    ↓
ProcessTracker (subprocess monitoring)
    ↓
PerformanceCollector + ResourceMonitor (real-time sampling)
    ↓
MetricsAggregator (aggregation & analysis)
    ↓
BenchmarkMetrics (final results)
```

## Usage

### Basic Usage

Run benchmarks with real metrics collection:

```bash
swarm-benchmark run "Your objective" --real-metrics
```

### Programmatic Usage

```python
from swarm_benchmark.core.real_benchmark_engine import RealBenchmarkEngine
from swarm_benchmark.core.models import BenchmarkConfig

config = BenchmarkConfig(
    name="my-benchmark",
    strategy=StrategyType.AUTO,
    mode=CoordinationMode.CENTRALIZED
)

engine = RealBenchmarkEngine(config)
result = await engine.run_benchmark("Build a REST API")

# Access metrics
metrics = result['metrics']
print(f"Peak memory: {metrics['peak_memory_mb']} MB")
print(f"Success rate: {metrics['success_rate']}")
```

## Collected Metrics

### Performance Metrics

- **execution_time**: Total wall clock time
- **cpu_time**: Total CPU time consumed
- **throughput**: Tasks completed per second
- **queue_time**: Time spent waiting in queue
- **coordination_overhead**: Time spent on coordination
- **communication_latency**: Inter-agent communication delay

### Resource Metrics

- **cpu_percent**: CPU utilization percentage
- **memory_mb**: Current memory usage in MB
- **peak_memory_mb**: Maximum memory usage
- **average_cpu_percent**: Average CPU usage over time
- **network_bytes_sent/recv**: Network I/O
- **disk_bytes_read/write**: Disk I/O

### Process Metrics

- **pid**: Process ID
- **num_threads**: Thread count
- **num_fds**: Open file descriptors
- **create_time**: Process creation timestamp
- **exit_code**: Process exit status

### Output Metrics

- **total_output_size**: Total lines of output
- **average_output_size**: Average output per task
- **output_complexity_score**: Output generation rate
- **error_count**: Number of errors in output

## Features

### Real-Time Monitoring

The system samples metrics at configurable intervals (default 100ms):

```python
collector = PerformanceCollector(sample_interval=0.05)  # 50ms sampling
```

### Resource Alerts

Set thresholds and receive alerts when exceeded:

```python
monitor = ResourceMonitor(alert_callback=handle_alert)
monitor.set_thresholds({
    "cpu_percent": 80.0,
    "memory_mb": 1024.0
})
```

### Process Tracking

Track all claude-flow subprocess executions:

```python
tracker = ProcessTracker()
result = await tracker.execute_command_async(
    ["swarm", "Build API", "--parallel"],
    timeout=300
)
```

### Metrics Aggregation

Aggregate metrics from multiple sources:

```python
aggregator = MetricsAggregator()
aggregator.start_collection()

# Create named collectors
perf1 = aggregator.create_performance_collector("agent1")
res1 = aggregator.create_resource_monitor("agent1")

# ... execute tasks ...

# Get aggregated results
metrics = aggregator.stop_collection()
```

## Output Formats

### Detailed Metrics Report

Saved as `metrics_{benchmark_id}.json`:

```json
{
  "summary": {
    "wall_clock_time": 45.23,
    "tasks_per_second": 2.21,
    "success_rate": 0.95,
    "peak_memory_mb": 256.4,
    "average_cpu_percent": 65.3
  },
  "performance": {
    "average_duration": 0.45,
    "median_duration": 0.42,
    "p95_duration": 0.68,
    "p99_duration": 0.89
  },
  "resources": {
    "memory": {
      "peak_mb": 256.4,
      "average_mb": 185.2
    },
    "cpu": {
      "average_percent": 65.3,
      "total_seconds": 29.5
    }
  }
}
```

### Process Execution Report

Saved as `process_report_{benchmark_id}.json`:

```json
{
  "summary": {
    "total_executions": 10,
    "successful_executions": 9,
    "failed_executions": 1,
    "overall_success_rate": 0.9,
    "average_duration": 4.52
  },
  "command_statistics": {
    "swarm:research": {
      "execution_count": 5,
      "success_rate": 1.0,
      "average_duration": 3.2,
      "peak_memory_mb": 128.5
    }
  }
}
```

## Advanced Features

### Custom Metrics Collection

Extend the base collectors for custom metrics:

```python
class CustomCollector(PerformanceCollector):
    def _collect_custom_metrics(self):
        # Add custom metric collection
        pass
```

### Batch Processing

Process multiple tasks with shared metrics:

```python
results = await engine.execute_batch(tasks)
```

### Historical Analysis

Compare metrics across benchmark runs:

```python
# Load historical metrics
history = load_metrics_history("./reports")
trends = analyze_performance_trends(history)
```

## Performance Considerations

### Overhead

The metrics collection system is designed for minimal overhead:
- ~2-5% CPU overhead for monitoring
- ~10-20 MB memory overhead
- Configurable sampling rates

### Optimization

For production benchmarks:
- Use larger sampling intervals (0.1-0.5s)
- Disable detailed collection for long runs
- Use batch operations for efficiency

## Troubleshooting

### Common Issues

1. **High memory usage**: Reduce history size or sampling rate
2. **Missing metrics**: Ensure claude-flow is in PATH
3. **Permission errors**: Check file permissions for output directory

### Debug Mode

Enable detailed logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Examples

See `/benchmark/examples/real_metrics_demo.py` for comprehensive examples.

## Future Enhancements

- GPU metrics collection
- Distributed metrics aggregation
- Real-time visualization dashboard
- Machine learning performance prediction

---

## From architecture-design.md

# Agent Swarm Benchmarking Tool - Architecture Design

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CLI Interface                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │
│  │   Commands  │ │  Arguments  │ │   Validation    │   │
│  └─────────────┘ └─────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                 Benchmark Engine                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │
│  │ Orchestrator│ │  Scheduler  │ │   Executor      │   │
│  └─────────────┘ └─────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                Strategy Framework                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │
│  │    Auto     │ │  Research   │ │  Development    │   │
│  ├─────────────┤ ├─────────────┤ ├─────────────────┤   │
│  │  Analysis   │ │   Testing   │ │  Optimization   │   │
│  └─────────────┘ └─────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│              Coordination Framework                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │
│  │ Centralized │ │ Distributed │ │  Hierarchical   │   │
│  ├─────────────┤ ├─────────────┤ ├─────────────────┤   │
│  │    Mesh     │ │   Hybrid    │ │      Pool       │   │
│  └─────────────┘ └─────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                Metrics Collection                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │
│  │ Performance │ │  Resource   │ │    Quality      │   │
│  │   Metrics   │ │   Monitor   │ │   Metrics       │   │
│  └─────────────┘ └─────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────┐
│                 Output Framework                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐   │
│  │    JSON     │ │   SQLite    │ │      CSV        │   │
│  │   Export    │ │  Database   │ │    Reports      │   │
│  └─────────────┘ └─────────────┘ └─────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## 🧩 Core Components

### 1. CLI Interface (`cli/`)
- **Command Parser** - Parse command line arguments
- **Validation Engine** - Validate inputs and options
- **Help System** - Provide contextual help
- **Configuration Manager** - Handle config files

### 2. Benchmark Engine (`core/`)
- **Orchestrator** - Main coordination logic
- **Scheduler** - Task scheduling and queuing
- **Executor** - Task execution management
- **Result Aggregator** - Collect and process results

### 3. Strategy Framework (`strategies/`)
Each strategy implements the `Strategy` interface:
```python
class Strategy(ABC):
    @abstractmethod
    async def execute(self, task: Task) -> Result:
        pass
    
    @abstractmethod
    def get_metrics(self) -> Dict[str, Any]:
        pass
```

### 4. Coordination Framework (`modes/`)
Each mode implements the `CoordinationMode` interface:
```python
class CoordinationMode(ABC):
    @abstractmethod
    async def coordinate(self, agents: List[Agent], tasks: List[Task]) -> Results:
        pass
    
    @abstractmethod
    def get_coordination_metrics(self) -> Dict[str, Any]:
        pass
```

### 5. Metrics Collection (`metrics/`)
- **Performance Monitor** - Time, throughput, latency
- **Resource Monitor** - CPU, memory, network, disk
- **Quality Assessor** - Result quality metrics
- **Coordination Analyzer** - Communication overhead

### 6. Output Framework (`output/`)
- **JSON Writer** - Structured data export
- **SQLite Manager** - Database operations
- **Report Generator** - Human-readable reports
- **Visualization** - Charts and graphs

## 📋 Data Models

### Task Model
```python
@dataclass
class Task:
    id: str
    objective: str
    strategy: str
    mode: str
    parameters: Dict[str, Any]
    timeout: int
    max_retries: int
    created_at: datetime
    priority: int = 1
```

### Agent Model
```python
@dataclass
class Agent:
    id: str
    type: str
    capabilities: List[str]
    status: AgentStatus
    current_task: Optional[Task]
    performance_history: List[Performance]
    created_at: datetime
```

### Result Model
```python
@dataclass
class Result:
    task_id: str
    agent_id: str
    status: ResultStatus
    output: Dict[str, Any]
    metrics: Dict[str, Any]
    errors: List[str]
    execution_time: float
    resource_usage: ResourceUsage
    completed_at: datetime
```

### Benchmark Model
```python
@dataclass
class Benchmark:
    id: str
    name: str
    description: str
    strategy: str
    mode: str
    configuration: Dict[str, Any]
    tasks: List[Task]
    results: List[Result]
    metrics: BenchmarkMetrics
    started_at: datetime
    completed_at: Optional[datetime]
```

## 🔄 Data Flow

### 1. Input Processing
```
CLI Command → Validation → Configuration → Task Generation
```

### 2. Execution Flow
```
Task Queue → Strategy Selection → Agent Assignment → Coordination → Execution
```

### 3. Metrics Collection
```
Execution Events → Metric Collectors → Aggregation → Storage
```

### 4. Output Generation
```
Results → Processors → Formatters → Writers → Files/Database
```

## 🏛️ Module Architecture

### Core Module (`core/`)
```python
core/
├── __init__.py
├── benchmark_engine.py      # Main orchestration
├── task_scheduler.py        # Task scheduling
├── result_aggregator.py     # Result processing
├── config_manager.py        # Configuration handling
└── exceptions.py            # Custom exceptions
```

### Strategy Module (`strategies/`)
```python
strategies/
├── __init__.py
├── base_strategy.py         # Abstract base class
├── auto_strategy.py         # Automatic selection
├── research_strategy.py     # Research workflows
├── development_strategy.py  # Development tasks
├── analysis_strategy.py     # Data analysis
├── testing_strategy.py      # Quality assurance
├── optimization_strategy.py # Performance optimization
└── maintenance_strategy.py  # System maintenance
```

### Coordination Module (`modes/`)
```python
modes/
├── __init__.py
├── base_mode.py            # Abstract base class
├── centralized_mode.py     # Single coordinator
├── distributed_mode.py     # Multiple coordinators
├── hierarchical_mode.py    # Tree structure
├── mesh_mode.py           # Peer-to-peer
└── hybrid_mode.py         # Mixed strategies
```

### Metrics Module (`metrics/`)
```python
metrics/
├── __init__.py
├── performance_monitor.py   # Performance tracking
├── resource_monitor.py      # Resource usage
├── quality_assessor.py      # Result quality
├── coordination_analyzer.py # Communication metrics
└── metric_aggregator.py     # Metric collection
```

### Output Module (`output/`)
```python
output/
├── __init__.py
├── json_writer.py          # JSON export
├── sqlite_manager.py       # Database operations
├── csv_writer.py          # CSV export
├── report_generator.py     # HTML reports
└── visualizer.py          # Charts and graphs
```

## 🔧 Configuration System

### Configuration Hierarchy
1. Default configuration (built-in)
2. System configuration (/etc/swarm-benchmark/)
3. User configuration (~/.swarm-benchmark/)
4. Project configuration (./swarm-benchmark.json)
5. Command line arguments

### Configuration Schema
```json
{
  "benchmark": {
    "name": "string",
    "description": "string",
    "timeout": 3600,
    "max_retries": 3,
    "parallel_limit": 10
  },
  "strategies": {
    "enabled": ["auto", "research", "development"],
    "default": "auto",
    "parameters": {}
  },
  "modes": {
    "enabled": ["centralized", "distributed"],
    "default": "centralized",
    "parameters": {}
  },
  "output": {
    "formats": ["json", "sqlite", "html"],
    "directory": "./reports",
    "compression": true
  },
  "metrics": {
    "performance": true,
    "resources": true,
    "quality": true,
    "coordination": true
  }
}
```

## 🔐 Security Considerations

### Input Validation
- Sanitize all command line inputs
- Validate configuration files
- Prevent injection attacks
- Rate limiting for API calls

### Resource Protection
- Memory usage limits
- CPU usage monitoring
- Network rate limiting
- Disk space checks

### Data Protection
- Secure storage of sensitive data
- Encryption for network communication
- Access control for configuration
- Audit logging

## 🚀 Performance Optimization

### Asynchronous Operations
- Non-blocking I/O operations
- Concurrent task execution
- Efficient resource pooling
- Smart scheduling algorithms

### Memory Management
- Lazy loading of large datasets
- Streaming data processing
- Garbage collection optimization
- Memory usage monitoring

### Caching Strategy
- Result caching for repeated operations
- Configuration caching
- Metric aggregation caching
- Smart cache invalidation

## 📊 Monitoring and Observability

### Logging Strategy
- Structured logging with JSON format
- Log levels: DEBUG, INFO, WARN, ERROR
- Centralized log aggregation
- Performance logging

### Metrics Collection
- Real-time performance metrics
- Resource utilization tracking
- Error rate monitoring
- Custom business metrics

### Health Checks
- System health monitoring
- Service availability checks
- Performance threshold alerts
- Automated recovery procedures

This architecture provides a solid foundation for building a comprehensive, scalable, and maintainable agent swarm benchmarking tool.

---

## From deployment-guide.md

# Agent Swarm Benchmarking Tool - Deployment Guide

## 🚀 Deployment Overview

This guide covers the deployment, distribution, and maintenance of the Agent Swarm Benchmarking Tool across different environments and platforms.

## 📦 Packaging Strategy

### Python Package Structure
```
swarm-benchmark/
├── setup.py                    # Package configuration
├── setup.cfg                   # Additional metadata
├── pyproject.toml              # Modern Python packaging
├── MANIFEST.in                 # Include additional files
├── requirements.txt            # Runtime dependencies
├── requirements-dev.txt        # Development dependencies
├── README.md                   # Package documentation
├── LICENSE                     # License information
└── swarm_benchmark/            # Package source
    ├── __init__.py
    ├── __main__.py            # CLI entry point
    └── ...                    # Source modules
```

### Setup Configuration
```python
# setup.py
from setuptools import setup, find_packages

setup(
    name="swarm-benchmark",
    version="1.0.0",
    description="Agent swarm benchmarking tool for Claude Flow",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    author="Claude Flow Team",
    author_email="support@claude-flow.dev",
    url="https://github.com/claude-flow/swarm-benchmark",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
    ],
    python_requires=">=3.8",
    install_requires=[
        "click>=8.0",
        "aiohttp>=3.8",
        "psutil>=5.9",
        "sqlite3",  # Built-in
        "pydantic>=1.10",
        "matplotlib>=3.5",
        "plotly>=5.0",
        "pandas>=1.4",
        "numpy>=1.21",
    ],
    extras_require={
        "dev": [
            "pytest>=7.0",
            "pytest-cov>=4.0",
            "pytest-asyncio>=0.21",
            "pytest-benchmark>=4.0",
            "black>=22.0",
            "flake8>=5.0",
            "mypy>=1.0",
            "pre-commit>=2.20",
        ],
        "docs": [
            "sphinx>=5.0",
            "sphinx-rtd-theme>=1.0",
            "myst-parser>=0.18",
        ],
        "viz": [
            "seaborn>=0.11",
            "jupyter>=1.0",
            "ipywidgets>=8.0",
        ]
    },
    entry_points={
        "console_scripts": [
            "swarm-benchmark=swarm_benchmark.__main__:main",
            "swarm-bench=swarm_benchmark.__main__:main",
        ],
    },
    include_package_data=True,
    zip_safe=False,
)
```

### Modern Packaging (pyproject.toml)
```toml
[build-system]
requires = ["setuptools>=45", "wheel", "setuptools_scm[toml]>=6.2"]
build-backend = "setuptools.build_meta"

[project]
name = "swarm-benchmark"
dynamic = ["version"]
description = "Agent swarm benchmarking tool for Claude Flow"
readme = "README.md"
requires-python = ">=3.8"
license = {text = "MIT"}
authors = [
    {name = "Claude Flow Team", email = "support@claude-flow.dev"},
]
keywords = ["benchmark", "swarm", "agents", "performance", "testing"]
classifiers = [
    "Development Status :: 5 - Production/Stable",
    "Intended Audience :: Developers",
    "License :: OSI Approved :: MIT License",
    "Programming Language :: Python :: 3",
    "Programming Language :: Python :: 3.8",
    "Programming Language :: Python :: 3.9",
    "Programming Language :: Python :: 3.10",
    "Programming Language :: Python :: 3.11",
]

dependencies = [
    "click>=8.0",
    "aiohttp>=3.8",
    "psutil>=5.9",
    "pydantic>=1.10",
    "matplotlib>=3.5",
    "plotly>=5.0",
    "pandas>=1.4",
    "numpy>=1.21",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0",
    "pytest-cov>=4.0",
    "pytest-asyncio>=0.21",
    "pytest-benchmark>=4.0",
    "black>=22.0",
    "flake8>=5.0",
    "mypy>=1.0",
    "pre-commit>=2.20",
]

[project.scripts]
swarm-benchmark = "swarm_benchmark.__main__:main"
swarm-bench = "swarm_benchmark.__main__:main"

[project.urls]
Homepage = "https://github.com/claude-flow/swarm-benchmark"
Documentation = "https://swarm-benchmark.readthedocs.io"
Repository = "https://github.com/claude-flow/swarm-benchmark"
Issues = "https://github.com/claude-flow/swarm-benchmark/issues"
```

## 🐳 Docker Deployment

### Dockerfile
```dockerfile
# Multi-stage build for optimization
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir --user -r requirements.txt

# Production stage
FROM python:3.11-slim as production

# Create non-root user
RUN groupadd -r swarm && useradd -r -g swarm swarm

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python packages from builder
COPY --from=builder /root/.local /home/swarm/.local

# Set up application
WORKDIR /app
COPY . .

# Change ownership to swarm user
RUN chown -R swarm:swarm /app
USER swarm

# Set environment variables
ENV PATH="/home/swarm/.local/bin:$PATH"
ENV PYTHONPATH="/app"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD swarm-benchmark --version || exit 1

# Default command
ENTRYPOINT ["swarm-benchmark"]
CMD ["--help"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  swarm-benchmark:
    build: .
    container_name: swarm-benchmark
    environment:
      - BENCHMARK_CONFIG=/app/config/production.json
      - BENCHMARK_OUTPUT_DIR=/app/reports
    volumes:
      - ./config:/app/config:ro
      - ./reports:/app/reports
      - ./data:/app/data
    ports:
      - "8080:8080"  # If web interface is added
    networks:
      - swarm-network
    restart: unless-stopped
    
  database:
    image: postgres:14-alpine
    container_name: swarm-db
    environment:
      POSTGRES_DB: swarm_benchmark
      POSTGRES_USER: swarm
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - swarm-network
    restart: unless-stopped

volumes:
  postgres_data:

networks:
  swarm-network:
    driver: bridge
```

## ☁️ Cloud Deployment

### AWS Deployment
```yaml
# docker-compose.aws.yml
version: '3.8'

services:
  swarm-benchmark:
    image: ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/swarm-benchmark:latest
    environment:
      - AWS_DEFAULT_REGION=${AWS_REGION}
      - BENCHMARK_CONFIG=s3://swarm-benchmark-config/production.json
      - BENCHMARK_OUTPUT_DIR=s3://swarm-benchmark-reports/
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 4G
        reservations:
          cpus: '1.0'
          memory: 2G
```

### Kubernetes Deployment
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: swarm-benchmark
  labels:
    app: swarm-benchmark
spec:
  replicas: 3
  selector:
    matchLabels:
      app: swarm-benchmark
  template:
    metadata:
      labels:
        app: swarm-benchmark
    spec:
      containers:
      - name: swarm-benchmark
        image: swarm-benchmark:latest
        ports:
        - containerPort: 8080
        env:
        - name: BENCHMARK_CONFIG
          valueFrom:
            configMapKeyRef:
              name: swarm-config
              key: config.json
        resources:
          limits:
            cpu: 2000m
            memory: 4Gi
          requests:
            cpu: 1000m
            memory: 2Gi
        livenessProbe:
          exec:
            command:
            - swarm-benchmark
            - --version
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          exec:
            command:
            - swarm-benchmark
            - status
          initialDelaySeconds: 5
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: swarm-benchmark-service
spec:
  selector:
    app: swarm-benchmark
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
  type: LoadBalancer
```

## 🔄 CI/CD Pipeline

### GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: [3.8, 3.9, 3.10, 3.11]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python ${{ matrix.python-version }}
      uses: actions/setup-python@v4
      with:
        python-version: ${{ matrix.python-version }}
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
        pip install -r requirements-dev.txt
    
    - name: Run tests
      run: |
        pytest --cov=swarm_benchmark --cov-report=xml
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3

  build:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: 3.11
    
    - name: Build package
      run: |
        python -m pip install --upgrade pip build
        python -m build
    
    - name: Store package artifacts
      uses: actions/upload-artifact@v3
      with:
        name: python-package
        path: dist/

  publish-pypi:
    needs: build
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && startsWith(github.ref, 'refs/tags/')
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Download package artifacts
      uses: actions/download-artifact@v3
      with:
        name: python-package
        path: dist/
    
    - name: Publish to PyPI
      uses: pypa/gh-action-pypi-publish@release/v1
      with:
        password: ${{ secrets.PYPI_API_TOKEN }}

  build-docker:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to DockerHub
      uses: docker/login-action@v2
      with:
        username: ${{ secrets.DOCKERHUB_USERNAME }}
        password: ${{ secrets.DOCKERHUB_TOKEN }}
    
    - name: Build and push
      uses: docker/build-push-action@v4
      with:
        context: .
        push: true
        tags: |
          swarmteam/swarm-benchmark:latest
          swarmteam/swarm-benchmark:${{ github.ref_name }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
```

## 📋 Installation Methods

### PyPI Installation
```bash
# Install from PyPI
pip install swarm-benchmark

# Install with extras
pip install swarm-benchmark[dev,viz]

# Install from source
pip install git+https://github.com/claude-flow/swarm-benchmark.git
```

### Conda Installation
```yaml
# conda-recipe/meta.yaml
package:
  name: swarm-benchmark
  version: "1.0.0"

source:
  url: https://pypi.io/packages/source/s/swarm-benchmark/swarm-benchmark-1.0.0.tar.gz
  sha256: <hash>

build:
  number: 0
  script: python -m pip install . -vv
  entry_points:
    - swarm-benchmark = swarm_benchmark.__main__:main

requirements:
  host:
    - python >=3.8
    - pip
  run:
    - python >=3.8
    - click >=8.0
    - aiohttp >=3.8
    - psutil >=5.9

test:
  imports:
    - swarm_benchmark
  commands:
    - swarm-benchmark --help
```

### Homebrew Formula
```ruby
# Formula/swarm-benchmark.rb
class SwarmBenchmark < Formula
  desc "Agent swarm benchmarking tool for Claude Flow"
  homepage "https://github.com/claude-flow/swarm-benchmark"
  url "https://github.com/claude-flow/swarm-benchmark/archive/v1.0.0.tar.gz"
  sha256 "<hash>"
  license "MIT"

  depends_on "python@3.11"

  def install
    virtualenv_install_with_resources
  end

  test do
    system "#{bin}/swarm-benchmark", "--version"
  end
end
```

## 🔧 Configuration Management

### Environment-Specific Configs
```bash
# Development
export BENCHMARK_ENV=development
export BENCHMARK_CONFIG=./config/development.json
export BENCHMARK_LOG_LEVEL=DEBUG

# Staging
export BENCHMARK_ENV=staging
export BENCHMARK_CONFIG=./config/staging.json
export BENCHMARK_LOG_LEVEL=INFO

# Production
export BENCHMARK_ENV=production
export BENCHMARK_CONFIG=./config/production.json
export BENCHMARK_LOG_LEVEL=WARNING
```

### Configuration Templates
```json
{
  "environment": "production",
  "benchmark": {
    "timeout": 3600,
    "max_retries": 3,
    "parallel_limit": 20
  },
  "output": {
    "directory": "/var/lib/swarm-benchmark/reports",
    "formats": ["json", "sqlite"],
    "compression": true
  },
  "logging": {
    "level": "INFO",
    "file": "/var/log/swarm-benchmark.log",
    "rotate": true,
    "max_size": "100MB"
  },
  "claude_flow": {
    "endpoint": "https://api.claude-flow.com",
    "timeout": 300,
    "max_concurrent": 10
  }
}
```

## 📊 Monitoring and Observability

### Health Checks
```python
# swarm_benchmark/health.py
async def health_check():
    """Comprehensive health check endpoint"""
    checks = {
        "database": await check_database(),
        "claude_flow": await check_claude_flow_connection(),
        "filesystem": check_filesystem_access(),
        "memory": check_memory_usage(),
        "cpu": check_cpu_usage()
    }
    
    overall_status = all(checks.values())
    return {
        "status": "healthy" if overall_status else "unhealthy",
        "checks": checks,
        "timestamp": datetime.utcnow().isoformat()
    }
```

### Metrics Collection
```python
# Prometheus metrics
from prometheus_client import Counter, Histogram, Gauge

BENCHMARK_COUNTER = Counter('benchmark_total', 'Total benchmarks run')
BENCHMARK_DURATION = Histogram('benchmark_duration_seconds', 'Benchmark duration')
ACTIVE_BENCHMARKS = Gauge('benchmark_active', 'Currently active benchmarks')
```

## 🔐 Security Hardening

### Security Checklist
- [ ] Use non-root user in containers
- [ ] Scan images for vulnerabilities
- [ ] Implement resource limits
- [ ] Use secrets management
- [ ] Enable audit logging
- [ ] Regular security updates
- [ ] Network segmentation
- [ ] Access control policies

### Vulnerability Scanning
```bash
# Scan dependencies
safety check

# Scan code
bandit -r swarm_benchmark/

# Scan Docker image
docker scan swarmteam/swarm-benchmark:latest
```

## 📈 Performance Optimization

### Production Optimizations
- Use production WSGI server (gunicorn)
- Enable connection pooling
- Implement caching strategies
- Optimize database queries
- Use CDN for static assets
- Enable compression
- Monitor and tune JVM parameters

### Scaling Strategies
- Horizontal pod autoscaling (Kubernetes)
- Load balancing
- Database read replicas
- Distributed caching
- Async processing queues

This deployment guide provides comprehensive coverage for deploying the swarm benchmarking tool across various environments and platforms.

---

## From implementation-plan.md

# Agent Swarm Benchmarking Tool - Implementation Plan

## Project Overview
A comprehensive Python-based benchmarking tool for agent swarms that interfaces with the Claude Flow Advanced Swarm System. This tool will measure performance, efficiency, and effectiveness of different swarm strategies and coordination modes.

## 📋 Project Structure
```
benchmark/
├── plans/                    # Detailed implementation plans
│   ├── implementation-plan.md
│   ├── architecture-design.md
│   ├── testing-strategy.md
│   └── deployment-guide.md
├── src/                      # Source code
│   ├── core/                 # Core benchmarking framework
│   ├── strategies/           # Swarm strategy implementations
│   ├── modes/               # Coordination mode implementations
│   ├── metrics/             # Performance metrics collection
│   ├── output/              # JSON/SQLite output modules
│   ├── cli/                 # Command-line interface
│   └── utils/               # Utility functions
├── tests/                   # Test suite
│   ├── unit/                # Unit tests
│   ├── integration/         # Integration tests
│   └── performance/         # Performance benchmarks
├── config/                  # Configuration files
├── data/                    # Benchmark data and results
└── reports/                 # Generated reports
```

## 🎯 SPARC Development Process

### Phase 1: Specification
- Define comprehensive requirements
- Map all claude-flow swarm commands to benchmark tests
- Create detailed user stories and acceptance criteria
- Establish performance metrics and KPIs

### Phase 2: Pseudocode
- Design high-level algorithms for each component
- Plan data flow and processing pipelines
- Define interfaces between modules
- Create test scenarios and edge cases

### Phase 3: Architecture
- Design modular, extensible system architecture
- Plan database schema for SQLite storage
- Define API contracts and interfaces
- Design scalable coordination patterns

### Phase 4: Refinement (TDD Implementation)
- Implement core framework with comprehensive tests
- Build strategy and mode implementations
- Create output modules (JSON/SQLite)
- Develop CLI interface

### Phase 5: Completion
- Integration testing and validation
- Performance optimization
- Documentation and deployment
- Monitoring and maintenance setup

## 🔧 Key Features

### Swarm Strategies to Benchmark
1. **auto** - Automatic strategy selection
2. **research** - Information gathering workflows
3. **development** - Software development processes
4. **analysis** - Data analysis and insights
5. **testing** - Quality assurance workflows
6. **optimization** - Performance optimization
7. **maintenance** - System maintenance tasks

### Coordination Modes to Test
1. **centralized** - Single coordinator
2. **distributed** - Multiple coordinators
3. **hierarchical** - Tree structure coordination
4. **mesh** - Peer-to-peer coordination
5. **hybrid** - Mixed coordination strategies

### Performance Metrics
- Task completion time
- Resource utilization (CPU, memory, network)
- Success/failure rates
- Coordination overhead
- Scalability metrics
- Quality of results

### Output Formats
- **JSON** - Structured data for analysis
- **SQLite** - Relational database for complex queries
- **CSV** - Spreadsheet-compatible format
- **HTML** - Human-readable reports

## 🧪 Testing Strategy

### Test-Driven Development
1. Write failing tests first (Red)
2. Implement minimal code to pass (Green)
3. Refactor and optimize (Refactor)
4. Repeat for each feature

### Test Categories
- **Unit Tests** - Individual component testing
- **Integration Tests** - Component interaction testing
- **Performance Tests** - Benchmark validation
- **End-to-End Tests** - Complete workflow testing

## 📊 Benchmark Scenarios

### Basic Scenarios
- Single agent tasks
- Simple coordination patterns
- Standard resource constraints

### Advanced Scenarios
- Multi-agent workflows
- Complex coordination patterns
- Resource-constrained environments
- Fault tolerance testing

### Stress Testing
- High load scenarios
- Resource exhaustion
- Network latency simulation
- Failure recovery testing

## 🛠️ Technology Stack
- **Python 3.8+** - Core implementation
- **SQLite** - Database storage
- **Click** - CLI framework
- **pytest** - Testing framework
- **JSON** - Data serialization
- **asyncio** - Asynchronous operations
- **psutil** - System monitoring
- **matplotlib/plotly** - Visualization

## 📈 Success Criteria
- Comprehensive coverage of all swarm strategies
- Support for all coordination modes
- Reliable performance metrics collection
- Flexible output formats
- Intuitive CLI interface
- 95%+ test coverage
- Clear documentation and examples

## 🚀 Deployment Plan
- Package as pip-installable module
- Docker containerization
- CI/CD pipeline setup
- Performance regression testing
- Automated report generation

## 📋 Development Milestones

### Week 1: Foundation
- Project setup and structure
- Core framework implementation
- Basic CLI interface

### Week 2: Strategies & Modes
- Implement all swarm strategies
- Implement all coordination modes
- Basic metrics collection

### Week 3: Output & Testing
- JSON/SQLite output modules
- Comprehensive test suite
- Performance benchmarks

### Week 4: Integration & Polish
- Full system integration
- Documentation and examples
- Performance optimization
- Deployment preparation

## 🔍 Risk Mitigation
- Modular design for easy maintenance
- Comprehensive testing strategy
- Clear documentation
- Performance monitoring
- Graceful error handling
- Backup and recovery procedures

This implementation plan provides a comprehensive roadmap for building a robust, scalable, and maintainable agent swarm benchmarking tool that will help optimize code swarms effectively.

---

## From testing-strategy.md

# Agent Swarm Benchmarking Tool - Testing Strategy

## 🧪 Test-Driven Development (TDD) Approach

### TDD Cycle
1. **RED** - Write a failing test
2. **GREEN** - Write minimal code to pass the test
3. **REFACTOR** - Improve code while keeping tests green
4. **REPEAT** - Continue until feature is complete

### TDD Benefits
- Ensures code correctness from the start
- Provides living documentation
- Enables confident refactoring
- Catches regressions early
- Improves code design

## 📋 Testing Pyramid

```
                    ▲
                   / \
                  /   \
                 /  E2E \
                /       \
               /─────────\
              /Integration\
             /             \
            /───────────────\
           /      Unit       \
          /                   \
         /─────────────────────\
```

### Test Distribution
- **70% Unit Tests** - Fast, isolated, comprehensive
- **20% Integration Tests** - Component interactions
- **10% E2E Tests** - Complete workflows

## 🔬 Test Categories

### 1. Unit Tests (`tests/unit/`)
Test individual components in isolation.

#### Core Components
```python
# tests/unit/core/test_benchmark_engine.py
def test_benchmark_engine_initialization():
    engine = BenchmarkEngine()
    assert engine.status == EngineStatus.READY
    assert engine.task_queue.is_empty()

def test_benchmark_engine_task_submission():
    engine = BenchmarkEngine()
    task = Task(id="1", objective="test", strategy="auto")
    engine.submit_task(task)
    assert len(engine.task_queue) == 1
```

#### Strategy Tests
```python
# tests/unit/strategies/test_auto_strategy.py
def test_auto_strategy_selection():
    strategy = AutoStrategy()
    task = Task(objective="analyze data", parameters={})
    selected = strategy.select_strategy(task)
    assert selected == "analysis"

def test_auto_strategy_execution():
    strategy = AutoStrategy()
    task = create_test_task()
    result = await strategy.execute(task)
    assert result.status == ResultStatus.SUCCESS
```

#### Coordination Mode Tests
```python
# tests/unit/modes/test_centralized_mode.py
def test_centralized_mode_agent_assignment():
    mode = CentralizedMode()
    agents = create_test_agents(5)
    tasks = create_test_tasks(10)
    assignments = mode.assign_tasks(agents, tasks)
    assert len(assignments) == 10
```

### 2. Integration Tests (`tests/integration/`)
Test component interactions and data flow.

#### Strategy-Mode Integration
```python
# tests/integration/test_strategy_mode_integration.py
async def test_research_strategy_with_distributed_mode():
    strategy = ResearchStrategy()
    mode = DistributedMode()
    task = create_research_task()
    
    result = await mode.execute_with_strategy(strategy, task)
    assert result.status == ResultStatus.SUCCESS
    assert result.coordination_metrics["overhead"] < 0.1
```

#### Output Integration
```python
# tests/integration/test_output_integration.py
def test_json_sqlite_consistency():
    results = create_test_results()
    
    json_writer = JSONWriter()
    sqlite_manager = SQLiteManager()
    
    json_data = json_writer.export(results)
    sqlite_manager.store(results)
    
    sqlite_data = sqlite_manager.query_all()
    assert normalize_data(json_data) == normalize_data(sqlite_data)
```

### 3. Performance Tests (`tests/performance/`)
Validate system performance under various conditions.

#### Load Testing
```python
# tests/performance/test_load_handling.py
async def test_high_task_volume():
    engine = BenchmarkEngine()
    tasks = create_test_tasks(1000)
    
    start_time = time.time()
    results = await engine.execute_batch(tasks)
    execution_time = time.time() - start_time
    
    assert len(results) == 1000
    assert execution_time < 60  # Should complete within 1 minute
    assert all(r.status == ResultStatus.SUCCESS for r in results)
```

#### Stress Testing
```python
# tests/performance/test_resource_limits.py
def test_memory_usage_under_load():
    with resource_monitor() as monitor:
        engine = BenchmarkEngine()
        tasks = create_memory_intensive_tasks(100)
        engine.execute_batch(tasks)
    
    assert monitor.peak_memory < 1024 * 1024 * 1024  # < 1GB
```

### 4. End-to-End Tests (`tests/e2e/`)
Test complete user workflows through the CLI.

#### CLI Workflow Tests
```python
# tests/e2e/test_cli_workflows.py
def test_complete_benchmark_workflow():
    # Execute via CLI
    result = subprocess.run([
        "python", "-m", "swarm_benchmark",
        "run", "test-benchmark",
        "--strategy", "research",
        "--mode", "distributed",
        "--output", "json,sqlite"
    ], capture_output=True, text=True)
    
    assert result.returncode == 0
    assert "Benchmark completed successfully" in result.stdout
    
    # Verify outputs exist
    assert os.path.exists("reports/test-benchmark.json")
    assert os.path.exists("reports/test-benchmark.db")
```

## 🛠️ Test Infrastructure

### Test Fixtures (`tests/fixtures/`)
Reusable test data and objects.

```python
# tests/fixtures/tasks.py
def create_test_task(**kwargs):
    defaults = {
        "id": str(uuid.uuid4()),
        "objective": "test objective",
        "strategy": "auto",
        "mode": "centralized",
        "timeout": 60,
        "max_retries": 3
    }
    defaults.update(kwargs)
    return Task(**defaults)

def create_test_tasks(count: int) -> List[Task]:
    return [create_test_task(id=str(i)) for i in range(count)]
```

### Mock Objects (`tests/mocks/`)
Mock external dependencies for isolated testing.

```python
# tests/mocks/claude_flow_client.py
class MockClaudeFlowClient:
    def __init__(self):
        self.calls = []
    
    async def execute_swarm(self, objective: str, **kwargs):
        self.calls.append(("execute_swarm", objective, kwargs))
        return MockResult(success=True, output="mock output")
```

### Test Utilities (`tests/utils/`)
Helper functions for testing.

```python
# tests/utils/assertions.py
def assert_result_valid(result: Result):
    assert result.task_id is not None
    assert result.status in [ResultStatus.SUCCESS, ResultStatus.FAILURE]
    assert result.execution_time >= 0
    assert isinstance(result.metrics, dict)

def assert_metrics_complete(metrics: Dict[str, Any]):
    required_keys = ["execution_time", "resource_usage", "quality_score"]
    for key in required_keys:
        assert key in metrics
```

## 📊 Test Coverage Strategy

### Coverage Goals
- **Overall Coverage**: ≥ 95%
- **Unit Tests**: ≥ 98%
- **Integration Tests**: ≥ 90%
- **Critical Paths**: 100%

### Coverage Measurement
```bash
# Run tests with coverage
pytest --cov=src --cov-report=html --cov-report=term

# Coverage requirements in pytest.ini
[tool:pytest]
addopts = --cov=src --cov-fail-under=95
```

### Coverage Exclusions
- Configuration files
- CLI entry points
- Error handling for unreachable states
- Development/debug utilities

## 🔄 Continuous Testing

### Pre-commit Hooks
```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: pytest
        name: pytest
        entry: pytest
        language: python
        stages: [commit]
        types: [python]
```

### GitHub Actions
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: [3.8, 3.9, 3.10, 3.11]
    
    steps:
    - uses: actions/checkout@v2
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: ${{ matrix.python-version }}
    - name: Install dependencies
      run: |
        pip install -r requirements.txt
        pip install -r requirements-dev.txt
    - name: Run tests
      run: pytest --cov=src --cov-report=xml
    - name: Upload coverage
      uses: codecov/codecov-action@v1
```

## 🎯 Test Data Management

### Test Data Strategy
- **Synthetic Data** - Generated test data for consistency
- **Fixtures** - Predefined test scenarios
- **Factories** - Dynamic test data generation
- **Snapshots** - Golden master testing for outputs

### Data Generation
```python
# tests/data/generators.py
class TaskGenerator:
    @staticmethod
    def simple_task() -> Task:
        return Task(
            id="simple-001",
            objective="Simple test task",
            strategy="auto",
            mode="centralized"
        )
    
    @staticmethod
    def complex_workflow() -> List[Task]:
        return [
            Task(id=f"complex-{i}", objective=f"Step {i}")
            for i in range(10)
        ]
```

## 🚨 Test Environment Setup

### Local Development
```bash
# Setup test environment
python -m venv venv
source venv/bin/activate
pip install -r requirements-dev.txt

# Run tests
pytest

# Run with coverage
pytest --cov=src

# Run specific test category
pytest tests/unit/
pytest tests/integration/
pytest tests/performance/
```

### Docker Testing
```dockerfile
# Dockerfile.test
FROM python:3.9-slim

WORKDIR /app
COPY requirements*.txt ./
RUN pip install -r requirements-dev.txt

COPY . .
CMD ["pytest", "--cov=src", "--cov-report=html"]
```

## 📈 Test Metrics and Reporting

### Key Metrics
- **Test Coverage** - Code coverage percentage
- **Test Execution Time** - Performance of test suite
- **Test Reliability** - Flaky test detection
- **Bug Detection** - Tests catching real issues

### Reporting Tools
- **Coverage.py** - Code coverage measurement
- **pytest-html** - HTML test reports
- **pytest-benchmark** - Performance benchmarking
- **allure-pytest** - Advanced test reporting

## 🔍 Test Quality Assurance

### Test Review Checklist
- [ ] Tests follow naming conventions
- [ ] Tests are independent and isolated
- [ ] Tests have clear assertions
- [ ] Tests cover edge cases
- [ ] Tests are maintainable
- [ ] Tests execute quickly
- [ ] Tests are deterministic

### Code Quality Tools
```bash
# Linting
flake8 tests/
pylint tests/

# Type checking
mypy tests/

# Security scanning
bandit -r tests/
```

This comprehensive testing strategy ensures robust, reliable, and maintainable code through systematic test-driven development practices.