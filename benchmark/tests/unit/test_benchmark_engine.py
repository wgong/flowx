"""Unit tests for the unified benchmark engine."""

import unittest
import asyncio
from unittest.mock import patch, MagicMock, AsyncMock
import tempfile
from pathlib import Path

from swarm_benchmark.core.unified_benchmark_engine import (
    UnifiedBenchmarkEngine, EnginePlugin, OptimizationPlugin, MetricsCollectionPlugin
)
from swarm_benchmark.core.models import (
    BenchmarkConfig, Task, Result, StrategyType, CoordinationMode,
    TaskStatus, ResultStatus
)


class TestUnifiedBenchmarkEngine(unittest.TestCase):
    """Tests for the UnifiedBenchmarkEngine class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.config = BenchmarkConfig(
            name="Test Benchmark",
            strategy=StrategyType.AUTO,
            mode=CoordinationMode.CENTRALIZED,
            max_agents=3,
            output_formats=["json"]
        )
        self.engine = UnifiedBenchmarkEngine(self.config)
    
    def test_initialization(self):
        """Test engine initialization."""
        self.assertEqual(self.engine.config.name, "Test Benchmark")
        self.assertEqual(len(self.engine.plugins), 0)
        self.assertEqual(self.engine.status, "READY")
        self.assertIsNone(self.engine.current_benchmark)
    
    def test_add_plugin(self):
        """Test adding plugins to the engine."""
        plugin1 = EnginePlugin()
        plugin2 = OptimizationPlugin()
        
        self.engine.add_plugin(plugin1)
        self.assertEqual(len(self.engine.plugins), 1)
        
        self.engine.add_plugin(plugin2)
        self.assertEqual(len(self.engine.plugins), 2)
        self.assertIs(self.engine.plugins[0], plugin1)
        self.assertIs(self.engine.plugins[1], plugin2)
    
    def test_submit_task(self):
        """Test task submission."""
        task = Task(objective="Test task")
        self.engine.submit_task(task)
        
        self.assertEqual(len(self.engine.task_queue), 1)
        self.assertEqual(self.engine.task_queue[0].objective, "Test task")
    
    @patch('swarm_benchmark.core.unified_benchmark_engine.create_strategy')
    @patch('swarm_benchmark.core.unified_benchmark_engine.OutputManager')
    def test_run_benchmark_success(self, mock_output_manager, mock_create_strategy):
        """Test successful benchmark execution."""
        # Create mocks
        mock_strategy = AsyncMock()
        mock_result = MagicMock()
        mock_result.status = ResultStatus.SUCCESS
        mock_strategy.execute.return_value = mock_result
        mock_create_strategy.return_value = mock_strategy
        
        # Mock output manager
        mock_output = MagicMock()
        mock_output.save_benchmark = AsyncMock()
        mock_output_manager.return_value = mock_output
        
        # Run test
        async def run_test():
            result = await self.engine.run_benchmark("Test objective")
            return result
        
        result = asyncio.run(run_test())
        
        # Verify result
        self.assertEqual(result["status"], "success")
        self.assertIn("benchmark_id", result)
        self.assertIn("duration", result)
        
        # Verify strategy was called
        mock_create_strategy.assert_called_once()
        mock_strategy.execute.assert_called_once()
        mock_output.save_benchmark.assert_awaited_once()
    
    @patch('swarm_benchmark.core.unified_benchmark_engine.create_strategy')
    def test_run_benchmark_with_plugins(self, mock_create_strategy):
        """Test benchmark execution with plugins."""
        # Create mocks
        mock_strategy = AsyncMock()
        mock_result = MagicMock()
        mock_result.status = ResultStatus.SUCCESS
        mock_strategy.execute.return_value = mock_result
        mock_create_strategy.return_value = mock_strategy
        
        # Create plugins
        plugin1 = MagicMock(spec=EnginePlugin)
        plugin1.pre_benchmark = AsyncMock()
        plugin1.post_benchmark = AsyncMock()
        plugin1.pre_task = AsyncMock()
        plugin1.post_task = AsyncMock(return_value=mock_result)
        
        plugin2 = MagicMock(spec=EnginePlugin)
        plugin2.pre_benchmark = AsyncMock()
        plugin2.post_benchmark = AsyncMock()
        plugin2.pre_task = AsyncMock()
        plugin2.post_task = AsyncMock(return_value=mock_result)
        
        # Add plugins to engine
        self.engine.add_plugin(plugin1)
        self.engine.add_plugin(plugin2)
        
        # Run test
        async def run_test():
            result = await self.engine.run_benchmark("Test with plugins")
            return result
        
        result = asyncio.run(run_test())
        
        # Verify result
        self.assertEqual(result["status"], "success")
        
        # Verify plugins were called
        plugin1.pre_benchmark.assert_awaited_once()
        plugin1.post_benchmark.assert_awaited_once()
        plugin1.pre_task.assert_awaited_once()
        plugin1.post_task.assert_awaited_once()
        
        plugin2.pre_benchmark.assert_awaited_once()
        plugin2.post_benchmark.assert_awaited_once()
        plugin2.pre_task.assert_awaited_once()
        plugin2.post_task.assert_awaited_once()
    
    @patch('swarm_benchmark.core.unified_benchmark_engine.create_strategy')
    def test_run_benchmark_failure(self, mock_create_strategy):
        """Test benchmark execution with failure."""
        # Mock strategy to raise exception
        mock_create_strategy.side_effect = Exception("Strategy failed")
        
        # Run test
        async def run_test():
            result = await self.engine.run_benchmark("Test failure")
            return result
        
        result = asyncio.run(run_test())
        
        # Verify result indicates failure
        self.assertEqual(result["status"], "failed")
        self.assertIn("error", result)
        self.assertEqual(result["error"], "Strategy failed")
    
    @patch('swarm_benchmark.core.unified_benchmark_engine.create_strategy')
    def test_execute_task(self, mock_create_strategy):
        """Test individual task execution."""
        # Create mocks
        mock_strategy = AsyncMock()
        mock_result = MagicMock()
        mock_result.status = ResultStatus.SUCCESS
        mock_strategy.execute.return_value = mock_result
        mock_create_strategy.return_value = mock_strategy
        
        # Create task
        task = Task(
            objective="Test task",
            strategy=StrategyType.AUTO
        )
        
        # Run test
        async def run_test():
            result = await self.engine._execute_task(task)
            return result
        
        result = asyncio.run(run_test())
        
        # Verify task status was updated
        self.assertEqual(task.status, TaskStatus.COMPLETED)
        self.assertIsNotNone(task.started_at)
        self.assertIsNotNone(task.completed_at)
        
        # Verify result
        self.assertEqual(result.status, ResultStatus.SUCCESS)
        mock_strategy.execute.assert_called_once()
    
    @patch('swarm_benchmark.core.unified_benchmark_engine.create_strategy')
    def test_execute_task_failure(self, mock_create_strategy):
        """Test task execution with failure."""
        # Mock strategy to raise exception
        mock_create_strategy.side_effect = Exception("Task failed")
        
        # Create task
        task = Task(
            objective="Test failure task",
            strategy=StrategyType.AUTO
        )
        
        # Run test
        async def run_test():
            result = await self.engine._execute_task(task)
            return result
        
        result = asyncio.run(run_test())
        
        # Verify task status was updated to FAILED
        self.assertEqual(task.status, TaskStatus.FAILED)
        
        # Verify result has error information
        self.assertEqual(result.status, ResultStatus.ERROR)
        self.assertEqual(len(result.errors), 1)
        self.assertEqual(result.errors[0], "Task failed")
    
    @patch('swarm_benchmark.core.unified_benchmark_engine.create_strategy')
    def test_execute_parallel_tasks(self, mock_create_strategy):
        """Test parallel task execution."""
        # Create mocks
        mock_strategy = AsyncMock()
        
        def create_result(task_id):
            result = MagicMock()
            result.task_id = task_id
            result.status = ResultStatus.SUCCESS
            return result
            
        mock_strategy.execute.side_effect = lambda task: asyncio.sleep(0.1).then(
            lambda _: create_result(task.id)
        )
        mock_create_strategy.return_value = mock_strategy
        
        # Create tasks
        tasks = [
            Task(objective=f"Task {i}") for i in range(3)
        ]
        
        # Configure engine for parallel execution
        self.engine.config.parallel = True
        self.engine.config.max_agents = 3
        
        # Run test
        async def run_test():
            results = await self.engine._execute_parallel_tasks(tasks)
            return results
        
        results = asyncio.run(run_test())
        
        # Verify results
        self.assertEqual(len(results), 3)
        
        # Verify strategy was called for each task
        self.assertEqual(mock_strategy.execute.call_count, 3)
    
    def test_result_to_dict(self):
        """Test result to dictionary conversion."""
        # Create test result
        result = Result(
            task_id="task1",
            agent_id="agent1",
            status=ResultStatus.SUCCESS,
            output={"test": "data", "raw_output": "Test output"},
            errors=[],
            warnings=["Test warning"]
        )
        
        # Convert to dictionary
        result_dict = self.engine._result_to_dict(result)
        
        # Verify fields
        self.assertEqual(result_dict["task_id"], "task1")
        self.assertEqual(result_dict["agent_id"], "agent1")
        self.assertEqual(result_dict["status"], "success")
        self.assertEqual(len(result_dict["errors"]), 0)
        self.assertEqual(result_dict["warnings"], ["Test warning"])
        self.assertIn("output_summary", result_dict)


class TestOptimizationPlugin(unittest.TestCase):
    """Tests for the OptimizationPlugin class."""
    
    def test_initialization(self):
        """Test plugin initialization."""
        plugin = OptimizationPlugin()
        self.assertEqual(len(plugin.cache), 0)
        self.assertEqual(len(plugin.execution_history), 0)
        
        # With config
        config = {"cache_ttl": 3600}
        plugin = OptimizationPlugin(config)
        self.assertEqual(plugin.config["cache_ttl"], 3600)
    
    @patch('swarm_benchmark.core.models.Benchmark')
    def test_pre_benchmark(self, mock_benchmark):
        """Test pre-benchmark hook."""
        plugin = OptimizationPlugin()
        mock_benchmark.metadata = {}
        
        async def run_test():
            await plugin.pre_benchmark(mock_benchmark)
        
        asyncio.run(run_test())
        
        # Verify metadata was updated
        self.assertTrue(mock_benchmark.metadata["optimized"])
    
    @patch('swarm_benchmark.core.models.Benchmark')
    def test_post_benchmark(self, mock_benchmark):
        """Test post-benchmark hook."""
        plugin = OptimizationPlugin()
        plugin.cache = {"key1": "value1", "key2": "value2"}
        plugin.execution_history = ["task1", "task2"]
        mock_benchmark.metadata = {}
        
        async def run_test():
            await plugin.post_benchmark(mock_benchmark)
        
        asyncio.run(run_test())
        
        # Verify metrics were added to metadata
        self.assertIn("optimization_metrics", mock_benchmark.metadata)
        self.assertEqual(mock_benchmark.metadata["optimization_metrics"]["cache_hits"], 2)
        self.assertEqual(mock_benchmark.metadata["optimization_metrics"]["execution_history"], 2)


class TestMetricsCollectionPlugin(unittest.TestCase):
    """Tests for the MetricsCollectionPlugin class."""
    
    def test_initialization(self):
        """Test plugin initialization."""
        plugin = MetricsCollectionPlugin()
        self.assertEqual(plugin.sampling_interval, 0.1)
        self.assertEqual(len(plugin.metrics_buffer), 0)
        self.assertEqual(len(plugin.active_collectors), 0)
        
        # With custom sampling interval
        plugin = MetricsCollectionPlugin(0.5)
        self.assertEqual(plugin.sampling_interval, 0.5)
    
    @patch('swarm_benchmark.core.models.Benchmark')
    def test_pre_benchmark(self, mock_benchmark):
        """Test pre-benchmark hook."""
        plugin = MetricsCollectionPlugin()
        mock_benchmark.metadata = {}
        
        async def run_test():
            await plugin.pre_benchmark(mock_benchmark)
        
        asyncio.run(run_test())
        
        # Verify metrics collection was initialized
        self.assertIn("metrics_collection", mock_benchmark.metadata)
        self.assertIn("started_at", mock_benchmark.metadata["metrics_collection"])
        self.assertEqual(
            mock_benchmark.metadata["metrics_collection"]["sampling_interval"], 
            plugin.sampling_interval
        )
    
    @patch('swarm_benchmark.core.models.Benchmark')
    def test_post_benchmark(self, mock_benchmark):
        """Test post-benchmark hook."""
        plugin = MetricsCollectionPlugin()
        mock_benchmark.metadata = {"metrics_collection": {"started_at": "2022-01-01T00:00:00"}}
        
        # Create mock results with resource usage
        mock_result1 = MagicMock()
        mock_result1.resource_usage.peak_memory_mb = 100
        mock_result1.resource_usage.average_cpu_percent = 25
        
        mock_result2 = MagicMock()
        mock_result2.resource_usage.peak_memory_mb = 200
        mock_result2.resource_usage.average_cpu_percent = 50
        
        mock_benchmark.results = [mock_result1, mock_result2]
        
        async def run_test():
            await plugin.post_benchmark(mock_benchmark)
        
        asyncio.run(run_test())
        
        # Verify metrics were added
        self.assertIn("completed_at", mock_benchmark.metadata["metrics_collection"])
        self.assertEqual(mock_benchmark.metadata["metrics_collection"]["peak_memory_mb"], 200)
        self.assertEqual(mock_benchmark.metadata["metrics_collection"]["avg_cpu_percent"], 37.5)


if __name__ == "__main__":
    unittest.main()