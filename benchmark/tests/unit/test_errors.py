"""Unit tests for the error handling utilities."""

import unittest
import asyncio
import logging
from unittest.mock import patch, MagicMock
import tempfile
from pathlib import Path
import os

from swarm_benchmark.utils.error_handling import (
    BenchmarkError, ConfigurationError, ExecutionError,
    ErrorContext, AsyncErrorContext, ErrorReporter,
    with_error_handling, with_async_error_handling,
    safe_execute, safe_execute_async, configure_logging,
    format_exception
)


class TestErrorClasses(unittest.TestCase):
    """Tests for error classes."""
    
    def test_benchmark_error_basic(self):
        """Test basic BenchmarkError functionality."""
        error = BenchmarkError("Test error")
        self.assertEqual(str(error), "Test error")
        self.assertEqual(error.message, "Test error")
        self.assertIsNone(error.cause)
        self.assertIsNone(error.traceback)
    
    def test_benchmark_error_with_cause(self):
        """Test BenchmarkError with a cause."""
        cause = ValueError("Original error")
        error = BenchmarkError("Wrapped error", cause)
        
        self.assertEqual(error.message, "Wrapped error")
        self.assertEqual(error.cause, cause)
        self.assertIsNotNone(error.traceback)
        self.assertTrue(isinstance(error.traceback, list))
    
    def test_specialized_errors(self):
        """Test specialized error classes."""
        config_error = ConfigurationError("Config error")
        self.assertTrue(isinstance(config_error, BenchmarkError))
        self.assertEqual(config_error.message, "Config error")
        
        exec_error = ExecutionError("Execution error")
        self.assertTrue(isinstance(exec_error, BenchmarkError))
        self.assertEqual(exec_error.message, "Execution error")


class TestErrorContext(unittest.TestCase):
    """Tests for error context managers."""
    
    def test_error_context_no_error(self):
        """Test ErrorContext with no errors."""
        with ErrorContext("test_context"):
            # No error should occur
            value = 1 + 1
            self.assertEqual(value, 2)
    
    def test_error_context_with_error(self):
        """Test ErrorContext with error."""
        with self.assertRaises(BenchmarkError) as ctx:
            with ErrorContext("test_error"):
                # Raise an error
                raise ValueError("Test error")
        
        error = ctx.exception
        self.assertEqual(error.message, "Error in test_error: Test error")
        self.assertTrue(isinstance(error.cause, ValueError))
    
    def test_error_context_with_custom_error_class(self):
        """Test ErrorContext with custom error class."""
        with self.assertRaises(ConfigurationError) as ctx:
            with ErrorContext("test_config", error_class=ConfigurationError):
                # Raise an error
                raise ValueError("Config error")
        
        error = ctx.exception
        self.assertTrue(isinstance(error, ConfigurationError))
        self.assertEqual(error.message, "Error in test_config: Config error")


class TestAsyncErrorContext(unittest.IsolatedAsyncioTestCase):
    """Tests for async error context managers."""
    
    async def test_async_error_context_no_error(self):
        """Test AsyncErrorContext with no errors."""
        async with AsyncErrorContext("test_async"):
            # No error should occur
            await asyncio.sleep(0.01)
    
    async def test_async_error_context_with_error(self):
        """Test AsyncErrorContext with error."""
        with self.assertRaises(BenchmarkError) as ctx:
            async with AsyncErrorContext("test_async_error"):
                # Raise an error
                raise ValueError("Async error")
        
        error = ctx.exception
        self.assertEqual(error.message, "Error in test_async_error: Async error")
        self.assertTrue(isinstance(error.cause, ValueError))


class TestErrorDecorators(unittest.TestCase):
    """Tests for error handling decorators."""
    
    def test_with_error_handling_no_error(self):
        """Test with_error_handling decorator with no errors."""
        @with_error_handling()
        def test_func():
            return 42
        
        result = test_func()
        self.assertEqual(result, 42)
    
    def test_with_error_handling_with_error(self):
        """Test with_error_handling decorator with error."""
        @with_error_handling(error_class=ConfigurationError)
        def test_func():
            raise ValueError("Function error")
        
        with self.assertRaises(ConfigurationError) as ctx:
            test_func()
        
        error = ctx.exception
        self.assertTrue(isinstance(error, ConfigurationError))
        self.assertEqual(error.message, "Error in test_func: Function error")
        self.assertTrue(isinstance(error.cause, ValueError))
    
    def test_with_error_handling_custom_context(self):
        """Test with_error_handling decorator with custom context."""
        @with_error_handling(context="custom_context")
        def test_func():
            raise ValueError("Custom context error")
        
        with self.assertRaises(BenchmarkError) as ctx:
            test_func()
        
        error = ctx.exception
        self.assertEqual(error.message, "Error in custom_context: Custom context error")


class TestAsyncErrorDecorators(unittest.IsolatedAsyncioTestCase):
    """Tests for async error handling decorators."""
    
    async def test_with_async_error_handling_no_error(self):
        """Test with_async_error_handling decorator with no errors."""
        @with_async_error_handling()
        async def test_func():
            await asyncio.sleep(0.01)
            return 42
        
        result = await test_func()
        self.assertEqual(result, 42)
    
    async def test_with_async_error_handling_with_error(self):
        """Test with_async_error_handling decorator with error."""
        @with_async_error_handling(error_class=ExecutionError)
        async def test_func():
            await asyncio.sleep(0.01)
            raise ValueError("Async function error")
        
        with self.assertRaises(ExecutionError) as ctx:
            await test_func()
        
        error = ctx.exception
        self.assertTrue(isinstance(error, ExecutionError))
        self.assertEqual(error.message, "Error in test_func: Async function error")
        self.assertTrue(isinstance(error.cause, ValueError))


class TestErrorReporter(unittest.TestCase):
    """Tests for ErrorReporter class."""
    
    def setUp(self):
        """Set up test fixtures."""
        self.reporter = ErrorReporter()
    
    def test_report_error_basic(self):
        """Test basic error reporting."""
        self.reporter.report_error("Test error")
        
        errors = self.reporter.get_errors()
        self.assertEqual(len(errors), 1)
        self.assertEqual(errors[0]["message"], "Test error")
        self.assertEqual(errors[0]["context"], "unknown")
        self.assertEqual(errors[0]["severity"], "error")
    
    def test_report_error_with_context(self):
        """Test error reporting with context."""
        self.reporter.report_error("Context error", context="test_context")
        
        errors = self.reporter.get_errors()
        self.assertEqual(errors[0]["context"], "test_context")
    
    def test_report_error_with_exception(self):
        """Test error reporting with exception."""
        ex = ValueError("Exception error")
        self.reporter.report_error("Error with exception", exception=ex)
        
        errors = self.reporter.get_errors()
        self.assertEqual(errors[0]["exception"]["type"], "ValueError")
        self.assertEqual(errors[0]["exception"]["message"], "Exception error")
        self.assertIsNotNone(errors[0]["exception"]["traceback"])
    
    def test_report_error_severity(self):
        """Test error reporting with different severities."""
        self.reporter.report_error("Error message", severity="error")
        self.reporter.report_error("Warning message", severity="warning")
        self.reporter.report_error("Info message", severity="info")
        
        all_errors = self.reporter.get_errors()
        self.assertEqual(len(all_errors), 3)
        
        error_only = self.reporter.get_errors(severity="error")
        self.assertEqual(len(error_only), 1)
        self.assertEqual(error_only[0]["message"], "Error message")
        
        warning_only = self.reporter.get_errors(severity="warning")
        self.assertEqual(len(warning_only), 1)
        self.assertEqual(warning_only[0]["message"], "Warning message")
    
    def test_has_errors(self):
        """Test has_errors method."""
        self.assertFalse(self.reporter.has_errors())
        
        self.reporter.report_error("Test error")
        self.assertTrue(self.reporter.has_errors())
        
        self.reporter.clear()
        self.assertFalse(self.reporter.has_errors())
    
    def test_get_summary(self):
        """Test get_summary method."""
        self.reporter.report_error("Error 1", severity="error")
        self.reporter.report_error("Error 2", severity="error")
        self.reporter.report_error("Warning", severity="warning")
        self.reporter.report_error("Info", severity="info")
        
        summary = self.reporter.get_summary()
        self.assertEqual(summary["error"], 2)
        self.assertEqual(summary["warning"], 1)
        self.assertEqual(summary["info"], 1)


class TestSafeExecute(unittest.TestCase):
    """Tests for safe_execute function."""
    
    def test_safe_execute_success(self):
        """Test safe_execute with successful function."""
        def success_func():
            return 42
        
        success, result, exception = safe_execute(success_func)
        self.assertTrue(success)
        self.assertEqual(result, 42)
        self.assertIsNone(exception)
    
    def test_safe_execute_failure(self):
        """Test safe_execute with failing function."""
        def fail_func():
            raise ValueError("Fail")
        
        success, result, exception = safe_execute(fail_func)
        self.assertFalse(success)
        self.assertIsNone(result)
        self.assertTrue(isinstance(exception, ValueError))
        self.assertEqual(str(exception), "Fail")
    
    def test_safe_execute_with_args(self):
        """Test safe_execute with function arguments."""
        def add_func(a, b):
            return a + b
        
        success, result, exception = safe_execute(add_func, 2, 3)
        self.assertTrue(success)
        self.assertEqual(result, 5)
        self.assertIsNone(exception)
    
    def test_safe_execute_with_kwargs(self):
        """Test safe_execute with keyword arguments."""
        def greet_func(name, greeting="Hello"):
            return f"{greeting}, {name}!"
        
        success, result, exception = safe_execute(greet_func, "World", greeting="Hi")
        self.assertTrue(success)
        self.assertEqual(result, "Hi, World!")
        self.assertIsNone(exception)


class TestSafeExecuteAsync(unittest.IsolatedAsyncioTestCase):
    """Tests for safe_execute_async function."""
    
    async def test_safe_execute_async_success(self):
        """Test safe_execute_async with successful function."""
        async def success_func():
            await asyncio.sleep(0.01)
            return 42
        
        success, result, exception = await safe_execute_async(success_func)
        self.assertTrue(success)
        self.assertEqual(result, 42)
        self.assertIsNone(exception)
    
    async def test_safe_execute_async_failure(self):
        """Test safe_execute_async with failing function."""
        async def fail_func():
            await asyncio.sleep(0.01)
            raise ValueError("Async fail")
        
        success, result, exception = await safe_execute_async(fail_func)
        self.assertFalse(success)
        self.assertIsNone(result)
        self.assertTrue(isinstance(exception, ValueError))
        self.assertEqual(str(exception), "Async fail")


class TestLoggingConfiguration(unittest.TestCase):
    """Tests for logging configuration."""
    
    def tearDown(self):
        """Clean up after tests."""
        # Reset logging configuration
        logging.getLogger().handlers = []
    
    def test_configure_logging_basic(self):
        """Test basic logging configuration."""
        configure_logging()
        
        root_logger = logging.getLogger()
        self.assertEqual(root_logger.level, logging.INFO)
        self.assertEqual(len(root_logger.handlers), 1)
        
        # Check handler type
        handler = root_logger.handlers[0]
        self.assertTrue(isinstance(handler, logging.StreamHandler))
    
    def test_configure_logging_with_file(self):
        """Test logging configuration with file handler."""
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            log_path = temp_file.name
            
            try:
                configure_logging(log_file=log_path)
                
                root_logger = logging.getLogger()
                self.assertEqual(len(root_logger.handlers), 2)
                
                # Check handler types
                handlers = root_logger.handlers
                self.assertTrue(any(isinstance(h, logging.StreamHandler) for h in handlers))
                self.assertTrue(any(isinstance(h, logging.FileHandler) for h in handlers))
                
                # Write a log message
                logging.error("Test log message")
                
                # Verify file contains the message
                with open(log_path, 'r') as f:
                    content = f.read()
                    self.assertIn("Test log message", content)
                    
            finally:
                # Clean up the file
                try:
                    os.unlink(log_path)
                except:
                    pass


class TestFormatException(unittest.TestCase):
    """Tests for format_exception function."""
    
    def test_format_regular_exception(self):
        """Test formatting a regular exception."""
        try:
            # Raise a regular exception
            raise ValueError("Regular error")
        except Exception as e:
            result = format_exception(e)
            
            self.assertIn("ValueError: Regular error", result)
            self.assertIn("Traceback", result)
    
    def test_format_benchmark_error(self):
        """Test formatting a BenchmarkError."""
        cause = ValueError("Original error")
        error = BenchmarkError("Benchmark error", cause)
        
        result = format_exception(error)
        
        self.assertIn("BenchmarkError: Benchmark error", result)
        self.assertIn("Caused by:", result)
        self.assertIn("ValueError: Original error", result)


if __name__ == "__main__":
    unittest.main()