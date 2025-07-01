"""Unified output manager for benchmark results."""

import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional, Set, Union
import json
import sqlite3

from ..core.models import Benchmark, Result


class OutputHandler:
    """Base class for output handlers."""
    
    async def save_benchmark(
        self, benchmark: Benchmark, output_dir: Path
    ) -> Path:
        """Save benchmark results to the specified format.
        
        Args:
            benchmark: The benchmark to save
            output_dir: Directory to save results in
            
        Returns:
            Path to the saved output file
        """
        raise NotImplementedError("Output handlers must implement save_benchmark")


class JSONOutputHandler(OutputHandler):
    """Handler for JSON output format."""
    
    async def save_benchmark(
        self, benchmark: Benchmark, output_dir: Path
    ) -> Path:
        """Save benchmark results to JSON format.
        
        Args:
            benchmark: The benchmark to save
            output_dir: Directory to save results in
            
        Returns:
            Path to the saved JSON file
        """
        # Ensure the output directory exists
        output_dir.mkdir(exist_ok=True, parents=True)
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{benchmark.name}_{benchmark.id}_{timestamp}.json"
        output_path = output_dir / filename
        
        # Convert benchmark to dict
        benchmark_dict = self._benchmark_to_dict(benchmark)
        
        # Write to file
        async def write_file():
            with open(output_path, 'w') as f:
                json.dump(benchmark_dict, f, indent=2, default=str)
                
        await asyncio.get_event_loop().run_in_executor(None, write_file)
        
        return output_path
    
    def _benchmark_to_dict(self, benchmark: Benchmark) -> Dict[str, Any]:
        """Convert benchmark to serializable dictionary."""
        return {
            "id": benchmark.id,
            "name": benchmark.name,
            "description": benchmark.description,
            "status": benchmark.status.value if hasattr(benchmark.status, 'value') else str(benchmark.status),
            "created_at": benchmark.created_at.isoformat(),
            "started_at": benchmark.started_at.isoformat() if benchmark.started_at else None,
            "completed_at": benchmark.completed_at.isoformat() if benchmark.completed_at else None,
            "duration": benchmark.duration(),
            "config": {
                "strategy": benchmark.config.strategy.value if hasattr(benchmark.config.strategy, 'value') else str(benchmark.config.strategy),
                "mode": benchmark.config.mode.value if hasattr(benchmark.config.mode, 'value') else str(benchmark.config.mode),
                "max_agents": benchmark.config.max_agents,
                "parallel": benchmark.config.parallel,
                "timeout": benchmark.config.timeout
            },
            "metrics": {
                "total_tasks": benchmark.metrics.total_tasks,
                "completed_tasks": benchmark.metrics.completed_tasks,
                "failed_tasks": benchmark.metrics.failed_tasks,
                "success_rate": benchmark.metrics.success_rate,
                "average_execution_time": benchmark.metrics.average_execution_time,
                "total_execution_time": benchmark.metrics.total_execution_time,
                "throughput": benchmark.metrics.throughput,
                "quality_score": benchmark.metrics.quality_score,
                "peak_memory_usage": benchmark.metrics.peak_memory_usage
            },
            "tasks": [
                {
                    "id": task.id,
                    "objective": task.objective,
                    "strategy": task.strategy.value if hasattr(task.strategy, 'value') else str(task.strategy),
                    "status": task.status.value if hasattr(task.status, 'value') else str(task.status),
                    "duration": task.duration()
                }
                for task in benchmark.tasks
            ],
            "results": [
                {
                    "id": result.id,
                    "task_id": result.task_id,
                    "agent_id": result.agent_id,
                    "status": result.status.value if hasattr(result.status, 'value') else str(result.status),
                    "errors": result.errors,
                    "warnings": result.warnings,
                    "performance_metrics": {
                        "execution_time": result.performance_metrics.execution_time,
                        "success_rate": result.performance_metrics.success_rate,
                        "throughput": result.performance_metrics.throughput
                    },
                    "resource_usage": {
                        "cpu_percent": result.resource_usage.cpu_percent,
                        "memory_mb": result.resource_usage.memory_mb,
                        "peak_memory_mb": result.resource_usage.peak_memory_mb
                    }
                }
                for result in benchmark.results
            ],
            "error_log": benchmark.error_log,
            "metadata": benchmark.metadata
        }


class SQLiteOutputHandler(OutputHandler):
    """Handler for SQLite output format."""
    
    async def save_benchmark(
        self, benchmark: Benchmark, output_dir: Path
    ) -> Path:
        """Save benchmark results to SQLite format.
        
        Args:
            benchmark: The benchmark to save
            output_dir: Directory to save results in
            
        Returns:
            Path to the saved SQLite file
        """
        # Ensure the output directory exists
        output_dir.mkdir(exist_ok=True, parents=True)
        
        # Generate DB filename
        db_path = output_dir / "benchmarks.db"
        
        # Define async function for SQLite operations
        async def save_to_sqlite():
            conn = sqlite3.connect(str(db_path))
            cursor = conn.cursor()
            
            # Create tables if they don't exist
            self._create_tables(cursor)
            
            # Insert benchmark
            self._insert_benchmark(cursor, benchmark)
            
            # Insert tasks
            for task in benchmark.tasks:
                self._insert_task(cursor, task, benchmark.id)
            
            # Insert results
            for result in benchmark.results:
                self._insert_result(cursor, result)
            
            # Commit and close
            conn.commit()
            conn.close()
            
        # Run SQLite operations in a thread pool
        await asyncio.get_event_loop().run_in_executor(None, save_to_sqlite)
        
        return db_path
    
    def _create_tables(self, cursor: sqlite3.Cursor) -> None:
        """Create database tables if they don't exist."""
        # Benchmarks table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS benchmarks (
            id TEXT PRIMARY KEY,
            name TEXT,
            description TEXT,
            status TEXT,
            created_at TEXT,
            started_at TEXT,
            completed_at TEXT,
            duration REAL,
            strategy TEXT,
            mode TEXT,
            max_agents INTEGER,
            parallel INTEGER,
            success_rate REAL,
            quality_score REAL
        )
        ''')
        
        # Tasks table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            benchmark_id TEXT,
            objective TEXT,
            strategy TEXT,
            status TEXT,
            duration REAL,
            FOREIGN KEY (benchmark_id) REFERENCES benchmarks (id)
        )
        ''')
        
        # Results table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS results (
            id TEXT PRIMARY KEY,
            task_id TEXT,
            agent_id TEXT,
            status TEXT,
            execution_time REAL,
            cpu_percent REAL,
            memory_mb REAL,
            created_at TEXT,
            completed_at TEXT,
            FOREIGN KEY (task_id) REFERENCES tasks (id)
        )
        ''')
        
        # Errors table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS errors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            result_id TEXT,
            error_text TEXT,
            FOREIGN KEY (result_id) REFERENCES results (id)
        )
        ''')
        
        # Metrics table
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS metrics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            benchmark_id TEXT,
            metric_name TEXT,
            metric_value REAL,
            FOREIGN KEY (benchmark_id) REFERENCES benchmarks (id)
        )
        ''')
    
    def _insert_benchmark(self, cursor: sqlite3.Cursor, benchmark: Benchmark) -> None:
        """Insert benchmark record into database."""
        cursor.execute('''
        INSERT OR REPLACE INTO benchmarks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            benchmark.id,
            benchmark.name,
            benchmark.description,
            benchmark.status.value if hasattr(benchmark.status, 'value') else str(benchmark.status),
            benchmark.created_at.isoformat(),
            benchmark.started_at.isoformat() if benchmark.started_at else None,
            benchmark.completed_at.isoformat() if benchmark.completed_at else None,
            benchmark.duration(),
            benchmark.config.strategy.value if hasattr(benchmark.config.strategy, 'value') else str(benchmark.config.strategy),
            benchmark.config.mode.value if hasattr(benchmark.config.mode, 'value') else str(benchmark.config.mode),
            benchmark.config.max_agents,
            1 if benchmark.config.parallel else 0,
            benchmark.metrics.success_rate,
            benchmark.metrics.quality_score
        ))
        
        # Insert metrics
        self._insert_metrics(cursor, benchmark)
    
    def _insert_task(self, cursor: sqlite3.Cursor, task, benchmark_id: str) -> None:
        """Insert task record into database."""
        cursor.execute('''
        INSERT OR REPLACE INTO tasks VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            task.id,
            benchmark_id,
            task.objective,
            task.strategy.value if hasattr(task.strategy, 'value') else str(task.strategy),
            task.status.value if hasattr(task.status, 'value') else str(task.status),
            task.duration()
        ))
    
    def _insert_result(self, cursor: sqlite3.Cursor, result: Result) -> None:
        """Insert result record into database."""
        cursor.execute('''
        INSERT OR REPLACE INTO results VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            result.id,
            result.task_id,
            result.agent_id,
            result.status.value if hasattr(result.status, 'value') else str(result.status),
            result.performance_metrics.execution_time,
            result.resource_usage.cpu_percent,
            result.resource_usage.memory_mb,
            result.created_at.isoformat(),
            result.completed_at.isoformat() if result.completed_at else None
        ))
        
        # Insert errors
        for error in result.errors:
            cursor.execute('''
            INSERT INTO errors (result_id, error_text) VALUES (?, ?)
            ''', (result.id, error))
    
    def _insert_metrics(self, cursor: sqlite3.Cursor, benchmark: Benchmark) -> None:
        """Insert benchmark metrics into database."""
        metrics = [
            ("total_tasks", benchmark.metrics.total_tasks),
            ("completed_tasks", benchmark.metrics.completed_tasks),
            ("failed_tasks", benchmark.metrics.failed_tasks),
            ("success_rate", benchmark.metrics.success_rate),
            ("average_execution_time", benchmark.metrics.average_execution_time),
            ("total_execution_time", benchmark.metrics.total_execution_time),
            ("throughput", benchmark.metrics.throughput),
            ("quality_score", benchmark.metrics.quality_score),
            ("peak_memory_usage", benchmark.metrics.peak_memory_usage),
            ("total_cpu_time", benchmark.metrics.total_cpu_time)
        ]
        
        for name, value in metrics:
            cursor.execute('''
            INSERT INTO metrics (benchmark_id, metric_name, metric_value) VALUES (?, ?, ?)
            ''', (benchmark.id, name, value))


class CSVOutputHandler(OutputHandler):
    """Handler for CSV output format."""
    
    async def save_benchmark(
        self, benchmark: Benchmark, output_dir: Path
    ) -> Path:
        """Save benchmark results to CSV format.
        
        Args:
            benchmark: The benchmark to save
            output_dir: Directory to save results in
            
        Returns:
            Path to the saved CSV directory
        """
        # Ensure the output directory exists
        csv_dir = output_dir / f"benchmark_{benchmark.id}"
        csv_dir.mkdir(exist_ok=True, parents=True)
        
        # Write CSV files in a thread pool
        async def write_csv_files():
            # Write benchmark summary
            with open(csv_dir / "benchmark.csv", "w") as f:
                f.write("id,name,description,status,created_at,started_at,completed_at,duration,strategy,mode\n")
                f.write(f"{benchmark.id},{benchmark.name},{benchmark.description},{benchmark.status.value if hasattr(benchmark.status, 'value') else benchmark.status},{benchmark.created_at.isoformat()},{benchmark.started_at.isoformat() if benchmark.started_at else ''},{benchmark.completed_at.isoformat() if benchmark.completed_at else ''},{benchmark.duration()},{benchmark.config.strategy.value if hasattr(benchmark.config.strategy, 'value') else benchmark.config.strategy},{benchmark.config.mode.value if hasattr(benchmark.config.mode, 'value') else benchmark.config.mode}\n")
            
            # Write metrics
            with open(csv_dir / "metrics.csv", "w") as f:
                f.write("benchmark_id,metric_name,metric_value\n")
                metrics = [
                    ("total_tasks", benchmark.metrics.total_tasks),
                    ("completed_tasks", benchmark.metrics.completed_tasks),
                    ("failed_tasks", benchmark.metrics.failed_tasks),
                    ("success_rate", benchmark.metrics.success_rate),
                    ("average_execution_time", benchmark.metrics.average_execution_time),
                    ("total_execution_time", benchmark.metrics.total_execution_time),
                    ("throughput", benchmark.metrics.throughput),
                    ("quality_score", benchmark.metrics.quality_score),
                    ("peak_memory_usage", benchmark.metrics.peak_memory_usage)
                ]
                for name, value in metrics:
                    f.write(f"{benchmark.id},{name},{value}\n")
            
            # Write tasks
            with open(csv_dir / "tasks.csv", "w") as f:
                f.write("id,benchmark_id,objective,strategy,status,duration\n")
                for task in benchmark.tasks:
                    f.write(f"{task.id},{benchmark.id},{task.objective},{task.strategy.value if hasattr(task.strategy, 'value') else task.strategy},{task.status.value if hasattr(task.status, 'value') else task.status},{task.duration() or ''}\n")
            
            # Write results
            with open(csv_dir / "results.csv", "w") as f:
                f.write("id,task_id,agent_id,status,execution_time,cpu_percent,memory_mb\n")
                for result in benchmark.results:
                    f.write(f"{result.id},{result.task_id},{result.agent_id},{result.status.value if hasattr(result.status, 'value') else result.status},{result.performance_metrics.execution_time},{result.resource_usage.cpu_percent},{result.resource_usage.memory_mb}\n")
            
            # Write errors
            with open(csv_dir / "errors.csv", "w") as f:
                f.write("result_id,error_text\n")
                for result in benchmark.results:
                    for error in result.errors:
                        # Escape commas and quotes in error text
                        error_text = error.replace('"', '""')
                        f.write(f"{result.id},\"{error_text}\"\n")
        
        await asyncio.get_event_loop().run_in_executor(None, write_csv_files)
        
        return csv_dir


class OutputManager:
    """Unified manager for all output formats."""
    
    def __init__(self):
        """Initialize the output manager."""
        self.handlers = {
            "json": JSONOutputHandler(),
            "sqlite": SQLiteOutputHandler(),
            "csv": CSVOutputHandler()
        }
    
    async def save_benchmark(
        self, 
        benchmark: Benchmark, 
        output_dir: Path,
        formats: Optional[List[str]] = None
    ) -> Dict[str, Path]:
        """Save benchmark results to all specified formats.
        
        Args:
            benchmark: The benchmark to save
            output_dir: Directory to save results in
            formats: List of output formats to use
            
        Returns:
            Dictionary of format to output path
        """
        # Default to JSON if no formats specified
        formats = formats or ["json"]
        
        # Run all handlers concurrently
        tasks = []
        for fmt in formats:
            if fmt in self.handlers:
                task = asyncio.create_task(
                    self.handlers[fmt].save_benchmark(benchmark, output_dir)
                )
                tasks.append((fmt, task))
        
        # Wait for all handlers to complete
        results = {}
        for fmt, task in tasks:
            try:
                results[fmt] = await task
            except Exception as e:
                print(f"Error saving to {fmt} format: {e}")
        
        return results
    
    def register_handler(self, format_name: str, handler: OutputHandler) -> None:
        """Register a new output handler.
        
        Args:
            format_name: Format name (e.g., "json", "sqlite")
            handler: Handler instance
        """
        self.handlers[format_name] = handler