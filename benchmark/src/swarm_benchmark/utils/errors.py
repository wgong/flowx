"""Improved error handling for benchmark operations."""

import traceback
import sys
import logging
import asyncio
from typing import Dict, Any, Optional, Callable, TypeVar, Tuple, List, Union
from functools import wraps

# Set up logging
logger = logging.getLogger("benchmark")

# Type variables for generic functions
T = TypeVar('T')
R = TypeVar('R')


class BenchmarkError(Exception):
    """Base class for all benchmark errors."""
    
    def __init__(self, message: str, cause: Optional[Exception] = None):
        """Initialize benchmark error.
        
        Args:
            message: Error message
            cause: Original exception that caused this error
        """
        self.message = message
        self.cause = cause
        self.traceback = None
        
        if cause:
            self.traceback = traceback.format_exception(
                type(cause), cause, cause.__traceback__
            )
        
        super().__init__(message)


class ConfigurationError(BenchmarkError):
    """Error in benchmark configuration."""
    pass


class ExecutionError(BenchmarkError):
    """Error during benchmark execution."""
    pass


class StrategyError(BenchmarkError):
    """Error in benchmark strategy."""
    pass


class MetricsError(BenchmarkError):
    """Error in metrics collection."""
    pass


class OutputError(BenchmarkError):
    """Error in output handling."""
    pass


class TimeoutError(BenchmarkError):
    """Benchmark operation timed out."""
    pass


class ErrorContext:
    """Context manager for error handling."""
    
    def __init__(self, context_name: str, error_class=BenchmarkError):
        """Initialize error context.
        
        Args:
            context_name: Name of the context for error messages
            error_class: Error class to use for exceptions
        """
        self.context_name = context_name
        self.error_class = error_class
    
    def __enter__(self):
        """Enter the context."""
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Handle exceptions in the context."""
        if exc_type is not None:
            # Log the error
            logger.error(
                f"Error in {self.context_name}: {exc_val}",
                exc_info=(exc_type, exc_val, exc_tb)
            )
            
            # If it's not already a BenchmarkError, wrap it
            if not isinstance(exc_val, BenchmarkError):
                raise self.error_class(
                    f"Error in {self.context_name}: {str(exc_val)}",
                    cause=exc_val
                ) from exc_val
                
            return False  # Re-raise the exception
        return True


class AsyncErrorContext:
    """Async context manager for error handling."""
    
    def __init__(self, context_name: str, error_class=BenchmarkError):
        """Initialize async error context.
        
        Args:
            context_name: Name of the context for error messages
            error_class: Error class to use for exceptions
        """
        self.context_name = context_name
        self.error_class = error_class
    
    async def __aenter__(self):
        """Enter the context."""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Handle exceptions in the context."""
        if exc_type is not None:
            # Log the error
            logger.error(
                f"Error in {self.context_name}: {exc_val}",
                exc_info=(exc_type, exc_val, exc_tb)
            )
            
            # If it's not already a BenchmarkError, wrap it
            if not isinstance(exc_val, BenchmarkError):
                raise self.error_class(
                    f"Error in {self.context_name}: {str(exc_val)}",
                    cause=exc_val
                ) from exc_val
                
            return False  # Re-raise the exception
        return True


def with_error_handling(error_class=BenchmarkError, context: Optional[str] = None):
    """Decorator for functions with error handling.
    
    Args:
        error_class: Error class to use for exceptions
        context: Context name for error messages
    """
    def decorator(func: Callable[..., R]) -> Callable[..., R]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> R:
            ctx_name = context or func.__name__
            with ErrorContext(ctx_name, error_class):
                return func(*args, **kwargs)
        return wrapper
    return decorator


def with_async_error_handling(error_class=BenchmarkError, context: Optional[str] = None):
    """Decorator for async functions with error handling.
    
    Args:
        error_class: Error class to use for exceptions
        context: Context name for error messages
    """
    def decorator(func: Callable[..., R]) -> Callable[..., R]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> R:
            ctx_name = context or func.__name__
            async with AsyncErrorContext(ctx_name, error_class):
                return await func(*args, **kwargs)
        return wrapper
    return decorator


class ErrorReporter:
    """Utility for reporting and aggregating errors."""
    
    def __init__(self):
        """Initialize error reporter."""
        self.errors: List[Dict[str, Any]] = []
    
    def report_error(
        self, 
        message: str, 
        exception: Optional[Exception] = None,
        context: Optional[str] = None,
        severity: str = "error"
    ) -> None:
        """Report an error.
        
        Args:
            message: Error message
            exception: Original exception
            context: Error context
            severity: Error severity (error, warning, info)
        """
        error_info = {
            "message": message,
            "timestamp": asyncio.get_event_loop().time(),
            "context": context or "unknown",
            "severity": severity
        }
        
        if exception:
            error_info["exception"] = {
                "type": type(exception).__name__,
                "message": str(exception),
                "traceback": traceback.format_exception(
                    type(exception), exception, exception.__traceback__
                ) if hasattr(exception, "__traceback__") else None
            }
            
        self.errors.append(error_info)
        
        # Log the error
        log_func = getattr(logger, severity, logger.error)
        log_func(f"{message} [{context or 'unknown'}]", exc_info=exception if exception else None)
    
    def get_errors(self, severity: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all reported errors, optionally filtered by severity.
        
        Args:
            severity: Optional severity to filter by
            
        Returns:
            List of error information dictionaries
        """
        if severity:
            return [e for e in self.errors if e["severity"] == severity]
        return self.errors
    
    def clear(self) -> None:
        """Clear all reported errors."""
        self.errors = []
    
    def has_errors(self, severity: Optional[str] = None) -> bool:
        """Check if there are any reported errors.
        
        Args:
            severity: Optional severity to filter by
            
        Returns:
            True if there are errors, False otherwise
        """
        return len(self.get_errors(severity)) > 0
    
    def get_summary(self) -> Dict[str, int]:
        """Get error summary counts by severity.
        
        Returns:
            Dictionary of severity to count
        """
        summary = {}
        for error in self.errors:
            severity = error["severity"]
            summary[severity] = summary.get(severity, 0) + 1
        return summary


def safe_execute(func: Callable[..., T], *args, **kwargs) -> Tuple[bool, Optional[T], Optional[Exception]]:
    """Safely execute a function and return success status, result, and exception.
    
    Args:
        func: Function to execute
        *args: Positional arguments for the function
        **kwargs: Keyword arguments for the function
        
    Returns:
        Tuple of (success, result, exception)
    """
    try:
        result = func(*args, **kwargs)
        return True, result, None
    except Exception as e:
        return False, None, e


async def safe_execute_async(func: Callable[..., T], *args, **kwargs) -> Tuple[bool, Optional[T], Optional[Exception]]:
    """Safely execute an async function and return success status, result, and exception.
    
    Args:
        func: Async function to execute
        *args: Positional arguments for the function
        **kwargs: Keyword arguments for the function
        
    Returns:
        Tuple of (success, result, exception)
    """
    try:
        result = await func(*args, **kwargs)
        return True, result, None
    except Exception as e:
        return False, None, e


def configure_logging(
    level: int = logging.INFO,
    log_file: Optional[str] = None,
    log_format: Optional[str] = None
) -> None:
    """Configure logging for benchmark operations.
    
    Args:
        level: Logging level
        log_file: Optional log file path
        log_format: Optional log format string
    """
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    
    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Create console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    
    # Create formatter
    formatter = logging.Formatter(
        log_format or '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    console_handler.setFormatter(formatter)
    
    # Add console handler
    root_logger.addHandler(console_handler)
    
    # Add file handler if specified
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setLevel(level)
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)
    
    # Configure benchmark logger
    benchmark_logger = logging.getLogger("benchmark")
    benchmark_logger.setLevel(level)


def format_exception(exc: Exception) -> str:
    """Format an exception with traceback for display.
    
    Args:
        exc: Exception to format
        
    Returns:
        Formatted exception string
    """
    if isinstance(exc, BenchmarkError) and exc.traceback:
        return f"{type(exc).__name__}: {exc.message}\nCaused by: {''.join(exc.traceback)}"
    else:
        return ''.join(traceback.format_exception(type(exc), exc, exc.__traceback__))