"""Unified benchmark engine with pluggable architecture."""

import asyncio
from datetime import datetime
from typing import Dict, List, Any, Optional, Type, Union
from pathlib import Path
import uuid

from .models import (
    Benchmark, Task, Result, BenchmarkConfig, TaskStatus, 
    StrategyType, CoordinationMode, ResultStatus
)
from ..strategies import create_strategy
from ..output.output_manager import OutputManager


class EnginePlugin:
    """Base class for engine plugins."""
    
    async def pre_benchmark(self, benchmark: Benchmark) -> None:
        """Called before benchmark execution."""
        pass
    
    async def post_benchmark(self, benchmark: Benchmark) -> None:
        """Called after benchmark execution."""
        pass
    
    async def pre_task(self, task: Task) -> None:
        """Called before task execution."""
        pass
    
    async def post_task(self, task: Task, result: Result) -> Result:
        """Called after task execution."""
        return result


class OptimizationPlugin(EnginePlugin):
    """Plugin for optimized execution."""
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """Initialize the optimization plugin."""
        self.config = config or {}
        self.cache = {}
        self.execution_history = []
        
    async def pre_benchmark(self, benchmark: Benchmark) -> None:
        """Initialize optimization for benchmark."""
        # Setup connection pooling, caching, etc.
        benchmark.metadata["optimized"] = True
    
    async def post_benchmark(self, benchmark: Benchmark) -> None:
        """Cleanup optimization resources."""
        # Log optimization metrics
        benchmark.metadata["optimization_metrics"] = {
            "cache_hits": len(self.cache),
            "execution_history": len(self.execution_history)
        }
    
    async def pre_task(self, task: Task) -> None:
        """Apply task-level optimizations."""
        task.parameters["optimized"] = True
    
    async def post_task(self, task: Task, result: Result) -> Result:
        """Process task result with optimizations."""
        # Cache result for reuse
        cache_key = f"{task.strategy}-{task.objective}"
        self.cache[cache_key] = {
            "result": result.id,
            "timestamp": datetime.now().isoformat()
        }
        
        # Record execution for metrics
        self.execution_history.append({
            "task_id": task.id,
            "execution_time": result.performance_metrics.execution_time,
            "timestamp": datetime.now().isoformat()
        })
        
        return result


class MetricsCollectionPlugin(EnginePlugin):
    """Plugin for metrics collection."""
    
    def __init__(self, sampling_interval: float = 0.1):
        """Initialize the metrics collection plugin."""
        self.sampling_interval = sampling_interval
        self.metrics_buffer = []
        self.active_collectors = {}
        
    async def pre_benchmark(self, benchmark: Benchmark) -> None:
        """Initialize metrics collection for benchmark."""
        # Initialize system-wide metrics
        benchmark.metadata["metrics_collection"] = {
            "started_at": datetime.now().isoformat(),
            "sampling_interval": self.sampling_interval
        }
    
    async def post_benchmark(self, benchmark: Benchmark) -> None:
        """Finalize metrics collection and aggregate results."""
        # Aggregate and store final metrics
        benchmark.metadata["metrics_collection"]["completed_at"] = datetime.now().isoformat()
        
        # Aggregate metrics across all tasks
        if benchmark.results:
            peak_memory = max(r.resource_usage.peak_memory_mb for r in benchmark.results) if benchmark.results else 0
            avg_cpu = sum(r.resource_usage.average_cpu_percent for r in benchmark.results) / len(benchmark.results) if benchmark.results else 0
            
            benchmark.metadata["metrics_collection"]["peak_memory_mb"] = peak_memory
            benchmark.metadata["metrics_collection"]["avg_cpu_percent"] = avg_cpu
    
    async def pre_task(self, task: Task) -> None:
        """Initialize metrics collection for task."""
        # Start performance collector for this task
        collector_id = f"task_{task.id}"
        self.active_collectors[collector_id] = {
            "start_time": datetime.now(),
            "metrics": []
        }
    
    async def post_task(self, task: Task, result: Result) -> Result:
        """Process task metrics and enhance result."""
        # Get collector for this task
        collector_id = f"task_{task.id}"
        if collector_id in self.active_collectors:
            collector = self.active_collectors[collector_id]
            collector["end_time"] = datetime.now()
            
            # Calculate execution time
            execution_time = (collector["end_time"] - collector["start_time"]).total_seconds()
            result.performance_metrics.execution_time = execution_time
            
            # Clean up
            self.metrics_buffer.extend(collector["metrics"])
            del self.active_collectors[collector_id]
            
        return result


class UnifiedBenchmarkEngine:
    """Unified benchmark engine with pluggable architecture."""
    
    def __init__(self, config: Optional[BenchmarkConfig] = None, plugins: Optional[List[EnginePlugin]] = None):
        """Initialize the unified benchmark engine."""
        self.config = config or BenchmarkConfig()
        self.plugins = plugins or []
        self.status = "READY"
        self.task_queue = []
        self.current_benchmark: Optional[Benchmark] = None
        self.output_manager = OutputManager()
    
    def add_plugin(self, plugin: EnginePlugin) -> None:
        """Add a plugin to the engine."""
        self.plugins.append(plugin)
    
    def submit_task(self, task: Task) -> None:
        """Submit a task to the benchmark queue."""
        self.task_queue.append(task)
    
    async def run_benchmark(self, objective: str) -> Dict[str, Any]:
        """Run a complete benchmark for the given objective.
        
        Args:
            objective: The main objective for the benchmark
            
        Returns:
            Benchmark results dictionary
        """
        # Create the main task
        main_task = Task(
            objective=objective,
            description=f"Benchmark task: {objective}",
            strategy=self.config.strategy,
            mode=self.config.mode,
            timeout=self.config.task_timeout,
            max_retries=self.config.max_retries
        )
        
        # Create benchmark
        benchmark = Benchmark(
            name=self.config.name or f"benchmark-{str(uuid.uuid4())[:8]}",
            description=self.config.description or f"Benchmark for: {objective}",
            config=self.config
        )
        benchmark.add_task(main_task)
        benchmark.status = TaskStatus.RUNNING
        benchmark.started_at = datetime.now()
        
        self.current_benchmark = benchmark
        
        try:
            # Run pre-benchmark hooks for all plugins
            for plugin in self.plugins:
                await plugin.pre_benchmark(benchmark)
            
            # Execute the task
            if self.config.parallel and len(benchmark.tasks) > 1:
                # Execute tasks in parallel
                results = await self._execute_parallel_tasks(benchmark.tasks)
                for result in results:
                    benchmark.add_result(result)
            else:
                # Execute main task
                result = await self._execute_task(main_task)
                benchmark.add_result(result)
            
            # Update benchmark status
            benchmark.status = TaskStatus.COMPLETED
            benchmark.completed_at = datetime.now()
            
            # Run post-benchmark hooks for all plugins
            for plugin in self.plugins:
                await plugin.post_benchmark(benchmark)
            
            # Save results
            await self._save_benchmark_results(benchmark)
            
            return self._create_benchmark_response(benchmark)
            
        except Exception as e:
            benchmark.status = TaskStatus.FAILED
            benchmark.completed_at = datetime.now()
            benchmark.error_log.append(str(e))
            
            # Run post-benchmark hooks even on failure
            for plugin in self.plugins:
                try:
                    await plugin.post_benchmark(benchmark)
                except Exception as plugin_error:
                    benchmark.error_log.append(f"Plugin error during cleanup: {str(plugin_error)}")
            
            return {
                "benchmark_id": benchmark.id,
                "status": "failed",
                "error": str(e),
                "duration": benchmark.duration()
            }
    
    async def _execute_task(self, task: Task) -> Result:
        """Execute a single task with all plugins."""
        # Run pre-task hooks for all plugins
        for plugin in self.plugins:
            await plugin.pre_task(task)
        
        # Update task status
        task.status = TaskStatus.RUNNING
        task.started_at = datetime.now()
        
        try:
            # Execute the task using the specified strategy
            strategy = create_strategy(task.strategy.value.lower() if hasattr(task.strategy, 'value') else task.strategy)
            result = await strategy.execute(task)
            
            # Update task status
            task.status = TaskStatus.COMPLETED
            task.completed_at = datetime.now()
            
        except Exception as e:
            # Handle task execution error
            task.status = TaskStatus.FAILED
            task.completed_at = datetime.now()
            
            # Create error result
            result = Result(
                task_id=task.id,
                agent_id="error-agent",
                status=ResultStatus.ERROR,
                output={},
                errors=[str(e)]
            )
        
        # Run post-task hooks for all plugins
        for plugin in self.plugins:
            try:
                result = await plugin.post_task(task, result)
            except Exception as e:
                # Log plugin errors but don't fail the entire process
                if not result.errors:
                    result.errors = []
                result.errors.append(f"Plugin error: {str(e)}")
        
        return result
    
    async def _execute_parallel_tasks(self, tasks: List[Task]) -> List[Result]:
        """Execute multiple tasks in parallel."""
        # Create a semaphore to limit concurrency
        semaphore = asyncio.Semaphore(self.config.max_agents or 5)
        
        async def execute_with_semaphore(task: Task) -> Result:
            async with semaphore:
                return await self._execute_task(task)
        
        # Execute all tasks concurrently with the semaphore
        return await asyncio.gather(
            *(execute_with_semaphore(task) for task in tasks),
            return_exceptions=False
        )
    
    async def _save_benchmark_results(self, benchmark: Benchmark) -> None:
        """Save benchmark results to configured output formats."""
        output_dir = Path(self.config.output_directory)
        output_dir.mkdir(exist_ok=True)
        
        # Use output manager to save in all configured formats
        await self.output_manager.save_benchmark(
            benchmark, 
            output_dir, 
            formats=self.config.output_formats
        )
    
    def _create_benchmark_response(self, benchmark: Benchmark) -> Dict[str, Any]:
        """Create a standardized benchmark response dictionary."""
        return {
            "benchmark_id": benchmark.id,
            "name": benchmark.name,
            "status": "success",
            "summary": f"Completed {len(benchmark.results)} tasks",
            "duration": benchmark.duration(),
            "task_count": len(benchmark.tasks),
            "success_rate": benchmark.metrics.success_rate,
            "metrics": {
                "execution_time": benchmark.duration(),
                "tasks_per_second": benchmark.metrics.throughput,
                "success_rate": benchmark.metrics.success_rate,
                "peak_memory_mb": benchmark.metrics.peak_memory_usage,
                "average_cpu_percent": benchmark.metrics.total_cpu_time
            },
            "results": [self._result_to_dict(r) for r in benchmark.results],
            "metadata": benchmark.metadata
        }
    
    def _result_to_dict(self, result: Result) -> Dict[str, Any]:
        """Convert result to dictionary for JSON serialization."""
        return {
            "id": result.id,
            "task_id": result.task_id,
            "agent_id": result.agent_id,
            "status": result.status.value if hasattr(result.status, 'value') else str(result.status),
            "output_summary": self._summarize_output(result.output),
            "errors": result.errors,
            "warnings": result.warnings,
            "performance": {
                "execution_time": result.performance_metrics.execution_time,
                "success_rate": result.performance_metrics.success_rate,
                "throughput": result.performance_metrics.throughput
            },
            "resources": {
                "cpu_percent": result.resource_usage.cpu_percent,
                "memory_mb": result.resource_usage.memory_mb,
                "peak_memory_mb": result.resource_usage.peak_memory_mb
            },
            "created_at": result.created_at.isoformat(),
            "completed_at": result.completed_at.isoformat() if result.completed_at else None
        }
    
    def _summarize_output(self, output: Dict[str, Any]) -> Dict[str, Any]:
        """Create a summary version of the output for the response."""
        if not output:
            return {}
            
        # If output has raw_output, provide a truncated version
        if "raw_output" in output and isinstance(output["raw_output"], str):
            raw = output["raw_output"]
            return {
                "truncated_output": raw[:200] + "..." if len(raw) > 200 else raw,
                "output_length": len(raw),
                "sections_count": len(output.get("sections", {}))
            }
            
        return output