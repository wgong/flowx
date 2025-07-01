"""Unified metrics collection system for benchmarks."""

import asyncio
import time
import psutil
import threading
from typing import Dict, List, Any, Optional, Set, Union
from dataclasses import dataclass, field
from datetime import datetime
import json
import os
from pathlib import Path
import uuid
import subprocess
from contextlib import contextmanager

from ..core.models import PerformanceMetrics, ResourceUsage, Result


@dataclass
class SystemMetrics:
    """System-wide metrics."""
    timestamp: datetime
    cpu_percent: float
    memory_percent: float
    memory_available_mb: float
    memory_used_mb: float
    disk_read_bytes: int
    disk_write_bytes: int
    network_sent_bytes: int
    network_recv_bytes: int


@dataclass
class ProcessSnapshot:
    """Snapshot of process metrics."""
    pid: int
    name: str
    cpu_percent: float
    memory_mb: float
    threads: int
    read_bytes: int
    write_bytes: int
    io_count: int
    timestamp: datetime


@dataclass
class MetricsSnapshot:
    """Complete metrics snapshot."""
    id: str
    timestamp: datetime
    system: SystemMetrics
    processes: List[ProcessSnapshot]
    interval_ms: float


class MetricsCollector:
    """Base class for metrics collection."""
    
    def __init__(self, sampling_interval: float = 0.1):
        """Initialize metrics collector.
        
        Args:
            sampling_interval: Time between samples in seconds
        """
        self.sampling_interval = sampling_interval
        self.snapshots: List[MetricsSnapshot] = []
        self._running = False
        self._collection_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._start_time: Optional[float] = None
        self._end_time: Optional[float] = None
        self._baseline_system = None
    
    def start_collection(self) -> None:
        """Start metrics collection."""
        if self._running:
            return
            
        self._running = True
        self._start_time = time.time()
        self._stop_event.clear()
        self._collection_thread = threading.Thread(
            target=self._collection_loop,
            daemon=True
        )
        self._collection_thread.start()
        
        # Take baseline system metrics
        self._baseline_system = self._collect_system_metrics()
    
    def stop_collection(self) -> PerformanceMetrics:
        """Stop metrics collection and return aggregated metrics.
        
        Returns:
            Aggregated performance metrics
        """
        if not self._running:
            return PerformanceMetrics()
            
        self._end_time = time.time()
        self._stop_event.set()
        self._running = False
        
        if self._collection_thread:
            self._collection_thread.join(timeout=2.0)
            self._collection_thread = None
            
        return self._aggregate_metrics()
    
    def _collection_loop(self) -> None:
        """Main collection loop."""
        while not self._stop_event.is_set():
            loop_start = time.time()
            
            try:
                # Collect all metrics
                snapshot = self._collect_snapshot()
                self.snapshots.append(snapshot)
                
                # Limit snapshots to prevent memory issues
                if len(self.snapshots) > 10000:  # ~16 minutes at 0.1s interval
                    self.snapshots = self.snapshots[-5000:]
            except Exception as e:
                # Log error but continue collection
                print(f"Error in metrics collection: {str(e)}")
            
            # Sleep for remainder of interval
            elapsed = time.time() - loop_start
            sleep_time = max(0, self.sampling_interval - elapsed)
            if sleep_time > 0:
                time.sleep(sleep_time)
    
    def _collect_snapshot(self) -> MetricsSnapshot:
        """Collect a complete metrics snapshot.
        
        Returns:
            Complete metrics snapshot
        """
        timestamp = datetime.now()
        system_metrics = self._collect_system_metrics()
        process_metrics = self._collect_process_metrics()
        
        return MetricsSnapshot(
            id=str(uuid.uuid4()),
            timestamp=timestamp,
            system=system_metrics,
            processes=process_metrics,
            interval_ms=self.sampling_interval * 1000
        )
    
    def _collect_system_metrics(self) -> SystemMetrics:
        """Collect system-wide metrics.
        
        Returns:
            System metrics
        """
        # Get CPU metrics
        cpu_percent = psutil.cpu_percent(interval=None)
        
        # Get memory metrics
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        memory_available_mb = memory.available / (1024 * 1024)
        memory_used_mb = memory.used / (1024 * 1024)
        
        # Get disk I/O metrics
        disk_io = psutil.disk_io_counters()
        disk_read_bytes = disk_io.read_bytes if disk_io else 0
        disk_write_bytes = disk_io.write_bytes if disk_io else 0
        
        # Get network I/O metrics
        net_io = psutil.net_io_counters()
        network_sent_bytes = net_io.bytes_sent if net_io else 0
        network_recv_bytes = net_io.bytes_recv if net_io else 0
        
        return SystemMetrics(
            timestamp=datetime.now(),
            cpu_percent=cpu_percent,
            memory_percent=memory_percent,
            memory_available_mb=memory_available_mb,
            memory_used_mb=memory_used_mb,
            disk_read_bytes=disk_read_bytes,
            disk_write_bytes=disk_write_bytes,
            network_sent_bytes=network_sent_bytes,
            network_recv_bytes=network_recv_bytes
        )
    
    def _collect_process_metrics(self) -> List[ProcessSnapshot]:
        """Collect metrics for all relevant processes.
        
        Returns:
            List of process snapshots
        """
        process_snapshots = []
        
        try:
            # Get current process and children
            current_process = psutil.Process()
            processes = [current_process] + current_process.children(recursive=True)
            
            for proc in processes:
                try:
                    with proc.oneshot():
                        # Get memory info
                        mem_info = proc.memory_info()
                        
                        # Get I/O counters (may not be available on all platforms)
                        io_counters = proc.io_counters() if hasattr(proc, 'io_counters') else None
                        
                        snapshot = ProcessSnapshot(
                            pid=proc.pid,
                            name=proc.name(),
                            cpu_percent=proc.cpu_percent(interval=None),
                            memory_mb=mem_info.rss / (1024 * 1024),
                            threads=proc.num_threads(),
                            read_bytes=io_counters.read_bytes if io_counters else 0,
                            write_bytes=io_counters.write_bytes if io_counters else 0,
                            io_count=io_counters.read_count + io_counters.write_count if io_counters else 0,
                            timestamp=datetime.now()
                        )
                        process_snapshots.append(snapshot)
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    # Process may have terminated or we don't have access
                    continue
        except Exception as e:
            # Fallback to just the current process if there's an error
            print(f"Error collecting process metrics: {str(e)}")
            try:
                current_process = psutil.Process()
                mem_info = current_process.memory_info()
                
                snapshot = ProcessSnapshot(
                    pid=current_process.pid,
                    name=current_process.name(),
                    cpu_percent=current_process.cpu_percent(interval=None),
                    memory_mb=mem_info.rss / (1024 * 1024),
                    threads=current_process.num_threads(),
                    read_bytes=0,
                    write_bytes=0,
                    io_count=0,
                    timestamp=datetime.now()
                )
                process_snapshots.append(snapshot)
            except:
                pass
        
        return process_snapshots
    
    def _aggregate_metrics(self) -> PerformanceMetrics:
        """Aggregate collected metrics into a performance metrics object.
        
        Returns:
            Aggregated performance metrics
        """
        if not self.snapshots or self._start_time is None:
            return PerformanceMetrics()
        
        # Calculate execution time
        execution_time = (self._end_time or time.time()) - self._start_time
        
        # Calculate CPU and memory metrics
        total_cpu = 0
        peak_memory = 0
        avg_memory = 0
        
        for snapshot in self.snapshots:
            # Sum CPU across all processes
            snapshot_cpu = sum(p.cpu_percent for p in snapshot.processes)
            total_cpu += snapshot_cpu
            
            # Sum memory across all processes
            snapshot_memory = sum(p.memory_mb for p in snapshot.processes)
            peak_memory = max(peak_memory, snapshot_memory)
            avg_memory += snapshot_memory
        
        avg_cpu = total_cpu / len(self.snapshots) if self.snapshots else 0
        avg_memory = avg_memory / len(self.snapshots) if self.snapshots else 0
        
        # Calculate I/O metrics (delta between first and last snapshot)
        if len(self.snapshots) >= 2:
            first, last = self.snapshots[0], self.snapshots[-1]
            
            # Calculate disk I/O delta
            disk_read_delta = last.system.disk_read_bytes - first.system.disk_read_bytes
            disk_write_delta = last.system.disk_write_bytes - first.system.disk_write_bytes
            
            # Calculate network I/O delta
            net_sent_delta = last.system.network_sent_bytes - first.system.network_sent_bytes
            net_recv_delta = last.system.network_recv_bytes - first.system.network_recv_bytes
        else:
            disk_read_delta = 0
            disk_write_delta = 0
            net_sent_delta = 0
            net_recv_delta = 0
        
        # Create resource usage object
        resource_usage = ResourceUsage(
            cpu_percent=avg_cpu,
            memory_mb=avg_memory,
            peak_memory_mb=peak_memory,
            average_cpu_percent=avg_cpu,
            network_bytes_sent=net_sent_delta,
            network_bytes_recv=net_recv_delta,
            disk_bytes_read=disk_read_delta,
            disk_bytes_write=disk_write_delta
        )
        
        # Create performance metrics
        return PerformanceMetrics(
            execution_time=execution_time,
            throughput=1.0 / execution_time if execution_time > 0 else 0,
            success_rate=1.0,  # Will be updated by caller
            error_rate=0.0,    # Will be updated by caller
            retry_count=0,     # Will be updated by caller
            coordination_overhead=0.0  # Will be updated by caller
        )
    
    def save_metrics_report(self, filepath: Path) -> None:
        """Save detailed metrics report to a file.
        
        Args:
            filepath: Path to save the report
        """
        # Create report structure
        report = {
            "collection_info": {
                "start_time": self._start_time,
                "end_time": self._end_time,
                "duration": (self._end_time or time.time()) - self._start_time if self._start_time else 0,
                "sampling_interval": self.sampling_interval,
                "samples_count": len(self.snapshots)
            },
            "summary": {
                "execution_time": (self._end_time or time.time()) - self._start_time if self._start_time else 0,
                "average_cpu_percent": sum(s.system.cpu_percent for s in self.snapshots) / len(self.snapshots) if self.snapshots else 0,
                "peak_cpu_percent": max((s.system.cpu_percent for s in self.snapshots), default=0),
                "average_memory_mb": sum(s.system.memory_used_mb for s in self.snapshots) / len(self.snapshots) if self.snapshots else 0,
                "peak_memory_mb": max((s.system.memory_used_mb for s in self.snapshots), default=0),
                "total_disk_read_mb": (self.snapshots[-1].system.disk_read_bytes - self.snapshots[0].system.disk_read_bytes) / (1024 * 1024) if len(self.snapshots) > 1 else 0,
                "total_disk_write_mb": (self.snapshots[-1].system.disk_write_bytes - self.snapshots[0].system.disk_write_bytes) / (1024 * 1024) if len(self.snapshots) > 1 else 0,
                "total_network_sent_mb": (self.snapshots[-1].system.network_sent_bytes - self.snapshots[0].system.network_sent_bytes) / (1024 * 1024) if len(self.snapshots) > 1 else 0,
                "total_network_recv_mb": (self.snapshots[-1].system.network_recv_bytes - self.snapshots[0].system.network_recv_bytes) / (1024 * 1024) if len(self.snapshots) > 1 else 0,
            },
            "processes": {
                # Group processes by name
                proc_name: {
                    "average_cpu_percent": sum(s.cpu_percent for s in [p for snap in self.snapshots for p in snap.processes if p.name == proc_name]) / len([p for snap in self.snapshots for p in snap.processes if p.name == proc_name]) if [p for snap in self.snapshots for p in snap.processes if p.name == proc_name] else 0,
                    "peak_memory_mb": max((p.memory_mb for snap in self.snapshots for p in snap.processes if p.name == proc_name), default=0)
                }
                for proc_name in set(p.name for snap in self.snapshots for p in snap.processes)
            }
        }
        
        # Add time series data (down-sampled if there are many samples)
        if len(self.snapshots) > 100:
            # Take every Nth sample to get ~100 samples
            n = len(self.snapshots) // 100
            sampled_snapshots = self.snapshots[::n]
        else:
            sampled_snapshots = self.snapshots
            
        report["time_series"] = {
            "timestamps": [s.timestamp.isoformat() for s in sampled_snapshots],
            "system_cpu": [s.system.cpu_percent for s in sampled_snapshots],
            "system_memory_mb": [s.system.memory_used_mb for s in sampled_snapshots],
            "processes_count": [len(s.processes) for s in sampled_snapshots]
        }
        
        # Save to file
        with open(filepath, 'w') as f:
            json.dump(report, f, indent=2, default=str)


class ProcessExecutionResult:
    """Result of process execution with metrics."""
    
    def __init__(
        self, 
        command: List[str], 
        exit_code: int, 
        stdout: str, 
        stderr: str, 
        start_time: float, 
        end_time: float,
        performance_metrics: PerformanceMetrics,
        resource_usage: ResourceUsage
    ):
        """Initialize process execution result."""
        self.command = command
        self.exit_code = exit_code
        self.stdout = stdout
        self.stderr = stderr
        self.start_time = start_time
        self.end_time = end_time
        self.duration = end_time - start_time
        self.success = exit_code == 0
        self.performance_metrics = performance_metrics
        self.resource_usage = resource_usage
        
        # Additional metrics
        self.output_size = len(stdout.splitlines()) if stdout else 0
        self.error_count = len(stderr.splitlines()) if stderr else 0


class ProcessMonitor:
    """Monitor for process execution with metrics collection."""
    
    def __init__(self, sampling_interval: float = 0.1):
        """Initialize the process monitor."""
        self.sampling_interval = sampling_interval
        self.metrics_collector = MetricsCollector(sampling_interval)
    
    @contextmanager
    def monitor_process(self, process: subprocess.Popen):
        """Context manager to monitor a process.
        
        Args:
            process: The subprocess to monitor
        """
        try:
            # Start metrics collection for this process
            self.metrics_collector.start_collection()
            yield
        finally:
            # Stop metrics collection
            self.metrics_collector.stop_collection()
    
    async def execute_command_async(
        self, 
        command: List[str], 
        timeout: Optional[float] = None,
        env: Optional[Dict[str, str]] = None
    ) -> ProcessExecutionResult:
        """Execute a command asynchronously with metrics collection.
        
        Args:
            command: Command to execute as list of strings
            timeout: Optional timeout in seconds
            env: Optional environment variables
            
        Returns:
            Process execution result with metrics
        """
        # Prepare environment
        process_env = os.environ.copy()
        if env:
            process_env.update(env)
            
        start_time = time.time()
        
        # Start metrics collection
        self.metrics_collector.start_collection()
        
        try:
            # Create and run the process
            process = await asyncio.create_subprocess_exec(
                *command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=process_env
            )
            
            # Wait for process to complete with timeout
            try:
                stdout_bytes, stderr_bytes = await asyncio.wait_for(
                    process.communicate(), 
                    timeout=timeout
                )
                stdout = stdout_bytes.decode('utf-8', errors='replace')
                stderr = stderr_bytes.decode('utf-8', errors='replace')
                exit_code = process.returncode
                
            except asyncio.TimeoutError:
                # Handle timeout
                try:
                    process.terminate()
                    await asyncio.sleep(0.5)
                    process.kill()
                except:
                    pass
                    
                stdout = ""
                stderr = "Process execution timed out"
                exit_code = -1
                
        except Exception as e:
            # Handle execution errors
            stdout = ""
            stderr = f"Error executing process: {str(e)}"
            exit_code = -1
            
        finally:
            end_time = time.time()
            
            # Stop metrics collection
            metrics = self.metrics_collector.stop_collection()
            resource_usage = ResourceUsage()
            
            # Get resource usage from the last snapshot if available
            if self.metrics_collector.snapshots:
                last_snapshot = self.metrics_collector.snapshots[-1]
                total_memory_mb = sum(p.memory_mb for p in last_snapshot.processes)
                avg_cpu = sum(p.cpu_percent for p in last_snapshot.processes)
                
                resource_usage = ResourceUsage(
                    cpu_percent=avg_cpu,
                    memory_mb=total_memory_mb,
                    peak_memory_mb=max((sum(p.memory_mb for p in s.processes) for s in self.metrics_collector.snapshots), default=0),
                    average_cpu_percent=avg_cpu
                )
            
            # Create execution result
            return ProcessExecutionResult(
                command=command,
                exit_code=exit_code,
                stdout=stdout,
                stderr=stderr,
                start_time=start_time,
                end_time=end_time,
                performance_metrics=metrics,
                resource_usage=resource_usage
            )
    
    def execute_command(
        self, 
        command: List[str], 
        timeout: Optional[float] = None,
        env: Optional[Dict[str, str]] = None
    ) -> ProcessExecutionResult:
        """Execute a command synchronously with metrics collection.
        
        Args:
            command: Command to execute as list of strings
            timeout: Optional timeout in seconds
            env: Optional environment variables
            
        Returns:
            Process execution result with metrics
        """
        # Prepare environment
        process_env = os.environ.copy()
        if env:
            process_env.update(env)
            
        start_time = time.time()
        
        # Start metrics collection
        self.metrics_collector.start_collection()
        
        try:
            # Execute the command
            process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                env=process_env,
                universal_newlines=True  # Text mode
            )
            
            try:
                stdout, stderr = process.communicate(timeout=timeout)
                exit_code = process.returncode
                
            except subprocess.TimeoutExpired:
                # Handle timeout
                process.kill()
                stdout, stderr = process.communicate()
                exit_code = -1
                stderr += "\nProcess execution timed out"
                
        except Exception as e:
            # Handle execution errors
            stdout = ""
            stderr = f"Error executing process: {str(e)}"
            exit_code = -1
            
        finally:
            end_time = time.time()
            
            # Stop metrics collection
            metrics = self.metrics_collector.stop_collection()
            resource_usage = ResourceUsage()
            
            # Get resource usage from the last snapshot if available
            if self.metrics_collector.snapshots:
                last_snapshot = self.metrics_collector.snapshots[-1]
                total_memory_mb = sum(p.memory_mb for p in last_snapshot.processes)
                avg_cpu = sum(p.cpu_percent for p in last_snapshot.processes)
                
                resource_usage = ResourceUsage(
                    cpu_percent=avg_cpu,
                    memory_mb=total_memory_mb,
                    peak_memory_mb=max((sum(p.memory_mb for p in s.processes) for s in self.metrics_collector.snapshots), default=0),
                    average_cpu_percent=avg_cpu
                )
            
            # Create execution result
            return ProcessExecutionResult(
                command=command,
                exit_code=exit_code,
                stdout=stdout,
                stderr=stderr,
                start_time=start_time,
                end_time=end_time,
                performance_metrics=metrics,
                resource_usage=resource_usage
            )