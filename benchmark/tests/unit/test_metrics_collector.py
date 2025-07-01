"""Unit tests for the unified metrics collector."""

import unittest
import asyncio
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock, AsyncMock
import json
import time
import psutil

from swarm_benchmark.metrics.unified_metrics_collector import (
    SystemMetrics,
    ProcessSnapshot,
    MetricsSnapshot,
    MetricsCollector,
    ProcessExecutionResult,
    ProcessMonitor
)
from swarm_benchmark.core.models import (
    PerformanceMetrics,
    ResourceUsage
)


class TestSystemMetrics(unittest.TestCase):
    """Tests for SystemMetrics class."""
    
    def test_initialization(self):
        """Test SystemMetrics initialization."""
        from datetime import datetime
        
        timestamp = datetime.now()
        metrics = SystemMetrics(
            timestamp=timestamp,
            cpu_percent=10.5,
            memory_percent=25.0,
            memory_available_mb=1024.0,
            memory_used_mb=512.0,
            disk_read_bytes=1024,
            disk_write_bytes=2048,
            network_sent_bytes=4096,
            network_recv_bytes=8192
        )
        
        self.assertEqual(metrics.timestamp, timestamp)
        self.assertEqual(metrics.cpu_percent, 10.5)
        self.assertEqual(metrics.memory_percent, 25.0)
        self.assertEqual(metrics.memory_available_mb, 1024.0)
        self.assertEqual(metrics.memory_used_mb, 512.0)
        self.assertEqual(metrics.disk_read_bytes, 1024)
        self.assertEqual(metrics.disk_write_bytes, 2048)
        self.assertEqual(metrics.network_sent_bytes, 4096)
        self.assertEqual(metrics.network_recv_bytes, 8192)


class TestProcessSnapshot(unittest.TestCase):
    """Tests for ProcessSnapshot class."""
    
    def test_initialization(self):
        """Test ProcessSnapshot initialization."""
        from datetime import datetime
        
        timestamp = datetime.now()
        snapshot = ProcessSnapshot(
            pid=1234,
            name="test_process",
            cpu_percent=5.0,
            memory_mb=256.0,
            threads=4,
            read_bytes=1024,
            write_bytes=2048,
            io_count=10,
            timestamp=timestamp
        )
        
        self.assertEqual(snapshot.pid, 1234)
        self.assertEqual(snapshot.name, "test_process")
        self.assertEqual(snapshot.cpu_percent, 5.0)
        self.assertEqual(snapshot.memory_mb, 256.0)
        self.assertEqual(snapshot.threads, 4)
        self.assertEqual(snapshot.read_bytes, 1024)
        self.assertEqual(snapshot.write_bytes, 2048)
        self.assertEqual(snapshot.io_count, 10)
        self.assertEqual(snapshot.timestamp, timestamp)


class TestMetricsSnapshot(unittest.TestCase):
    """Tests for MetricsSnapshot class."""
    
    def test_initialization(self):
        """Test MetricsSnapshot initialization."""
        from datetime import datetime
        
        timestamp = datetime.now()
        system = MagicMock()
        process1 = MagicMock()
        process2 = MagicMock()
        
        snapshot = MetricsSnapshot(
            id="test-id",
            timestamp=timestamp,
            system=system,
            processes=[process1, process2],
            interval_ms=100.0
        )
        
        self.assertEqual(snapshot.id, "test-id")
        self.assertEqual(snapshot.timestamp, timestamp)
        self.assertEqual(snapshot.system, system)
        self.assertEqual(snapshot.processes, [process1, process2])
        self.assertEqual(snapshot.interval_ms, 100.0)


class TestMetricsCollector(unittest.TestCase):
    """Tests for MetricsCollector class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.collector = MetricsCollector(sampling_interval=0.01)
    
    @patch('swarm_benchmark.metrics.unified_metrics_collector.MetricsCollector._collect_snapshot')
    def test_start_stop_collection(self, mock_collect):
        """Test starting and stopping metrics collection."""
        # Mock snapshot collection
        mock_snapshot = MagicMock()
        mock_collect.return_value = mock_snapshot
        
        # Start collection
        self.collector.start_collection()
        self.assertTrue(self.collector._running)
        self.assertIsNotNone(self.collector._collection_thread)
        self.assertIsNotNone(self.collector._start_time)
        
        # Give it time to collect a few snapshots
        time.sleep(0.05)
        
        # Stop collection
        metrics = self.collector.stop_collection()
        self.assertFalse(self.collector._running)
        self.assertIsNotNone(self.collector._end_time)
        
        # Check that we got metrics and snapshots
        self.assertIsInstance(metrics, PerformanceMetrics)
        self.assertTrue(len(self.collector.snapshots) > 0)
        
        # Clean up
        if self.collector._collection_thread and self.collector._collection_thread.is_alive():
            self.collector._collection_thread.join(timeout=1.0)
    
    @patch('swarm_benchmark.metrics.unified_metrics_collector.psutil')
    def test_collect_system_metrics(self, mock_psutil):
        """Test collecting system metrics."""
        # Mock psutil functions
        mock_cpu = MagicMock(return_value=10.0)
        mock_psutil.cpu_percent = mock_cpu
        
        mock_virtual_memory = MagicMock()
        mock_virtual_memory.percent = 25.0
        mock_virtual_memory.available = 1024 * 1024 * 1024  # 1 GB
        mock_virtual_memory.used = 512 * 1024 * 1024  # 512 MB
        mock_psutil.virtual_memory.return_value = mock_virtual_memory
        
        mock_disk_io = MagicMock()
        mock_disk_io.read_bytes = 1024
        mock_disk_io.write_bytes = 2048
        mock_psutil.disk_io_counters.return_value = mock_disk_io
        
        mock_net_io = MagicMock()
        mock_net_io.bytes_sent = 4096
        mock_net_io.bytes_recv = 8192
        mock_psutil.net_io_counters.return_value = mock_net_io
        
        # Collect metrics
        metrics = self.collector._collect_system_metrics()
        
        # Verify metrics
        self.assertEqual(metrics.cpu_percent, 10.0)
        self.assertEqual(metrics.memory_percent, 25.0)
        self.assertAlmostEqual(metrics.memory_available_mb, 1024.0, delta=0.1)
        self.assertAlmostEqual(metrics.memory_used_mb, 512.0, delta=0.1)
        self.assertEqual(metrics.disk_read_bytes, 1024)
        self.assertEqual(metrics.disk_write_bytes, 2048)
        self.assertEqual(metrics.network_sent_bytes, 4096)
        self.assertEqual(metrics.network_recv_bytes, 8192)
    
    @patch('swarm_benchmark.metrics.unified_metrics_collector.Path')
    def test_save_metrics_report(self, mock_path):
        """Test saving metrics report to file."""
        # Create mock snapshots
        from datetime import datetime
        
        timestamp1 = datetime.now()
        system1 = SystemMetrics(
            timestamp=timestamp1,
            cpu_percent=10.0,
            memory_percent=20.0,
            memory_available_mb=1024.0,
            memory_used_mb=512.0,
            disk_read_bytes=1000,
            disk_write_bytes=2000,
            network_sent_bytes=3000,
            network_recv_bytes=4000
        )
        
        process1 = ProcessSnapshot(
            pid=1000,
            name="process1",
            cpu_percent=5.0,
            memory_mb=200.0,
            threads=2,
            read_bytes=500,
            write_bytes=1000,
            io_count=10,
            timestamp=timestamp1
        )
        
        snapshot1 = MetricsSnapshot(
            id="snap1",
            timestamp=timestamp1,
            system=system1,
            processes=[process1],
            interval_ms=10.0
        )
        
        timestamp2 = datetime.now()
        system2 = SystemMetrics(
            timestamp=timestamp2,
            cpu_percent=15.0,
            memory_percent=25.0,
            memory_available_mb=900.0,
            memory_used_mb=600.0,
            disk_read_bytes=1500,
            disk_write_bytes=2500,
            network_sent_bytes=3500,
            network_recv_bytes=4500
        )
        
        process2 = ProcessSnapshot(
            pid=1000,
            name="process1",
            cpu_percent=6.0,
            memory_mb=220.0,
            threads=2,
            read_bytes=600,
            write_bytes=1200,
            io_count=12,
            timestamp=timestamp2
        )
        
        snapshot2 = MetricsSnapshot(
            id="snap2",
            timestamp=timestamp2,
            system=system2,
            processes=[process2],
            interval_ms=10.0
        )
        
        # Set up collector with snapshots and timing
        self.collector._start_time = time.time() - 1.0
        self.collector._end_time = time.time()
        self.collector.snapshots = [snapshot1, snapshot2]
        
        # Mock file operations
        mock_open = MagicMock()
        mock_json_dump = MagicMock()
        
        with patch('builtins.open', mock_open), \
             patch('json.dump', mock_json_dump):
            
            # Save the report
            filepath = Path("test_report.json")
            self.collector.save_metrics_report(filepath)
            
            # Verify file was opened and json.dump was called
            mock_open.assert_called_once_with(filepath, 'w')
            self.assertEqual(mock_json_dump.call_count, 1)


class TestProcessMonitor(unittest.TestCase):
    """Tests for ProcessMonitor class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.monitor = ProcessMonitor(sampling_interval=0.01)
    
    @patch('subprocess.Popen')
    @patch('swarm_benchmark.metrics.unified_metrics_collector.MetricsCollector')
    def test_monitor_process(self, mock_collector_class, mock_popen):
        """Test process monitoring context manager."""
        # Create mock process
        mock_process = MagicMock()
        
        # Create mock collector
        mock_collector = MagicMock()
        mock_collector.start_collection = MagicMock()
        mock_collector.stop_collection = MagicMock()
        self.monitor.metrics_collector = mock_collector
        
        # Use the context manager
        with self.monitor.monitor_process(mock_process):
            # Check that collection was started
            mock_collector.start_collection.assert_called_once()
        
        # Check that collection was stopped
        mock_collector.stop_collection.assert_called_once()
    
    @patch('asyncio.create_subprocess_exec')
    @patch('swarm_benchmark.metrics.unified_metrics_collector.MetricsCollector')
    async def test_execute_command_async_success(self, mock_collector_class, mock_create_subprocess):
        """Test async command execution with success."""
        # Create mock process
        mock_process = MagicMock()
        mock_process.returncode = 0
        mock_process.communicate = AsyncMock(return_value=(b"stdout output", b"stderr output"))
        mock_create_subprocess.return_value = mock_process
        
        # Create mock collector
        mock_collector = MagicMock()
        mock_collector.start_collection = MagicMock()
        mock_collector.stop_collection = MagicMock(return_value=PerformanceMetrics())
        mock_collector.snapshots = [MagicMock()]
        self.monitor.metrics_collector = mock_collector
        
        # Execute command
        result = await self.monitor.execute_command_async(["test", "command"])
        
        # Check result
        self.assertIsInstance(result, ProcessExecutionResult)
        self.assertEqual(result.command, ["test", "command"])
        self.assertEqual(result.exit_code, 0)
        self.assertEqual(result.stdout, "stdout output")
        self.assertEqual(result.stderr, "stderr output")
        self.assertTrue(result.success)
        self.assertIsInstance(result.performance_metrics, PerformanceMetrics)
        self.assertIsInstance(result.resource_usage, ResourceUsage)
        
        # Verify collector was used
        mock_collector.start_collection.assert_called_once()
        mock_collector.stop_collection.assert_called_once()


if __name__ == "__main__":
    unittest.main()