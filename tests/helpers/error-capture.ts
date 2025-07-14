/**
 * Error handling utilities for tests
 */

/**
 * Wrap a function to safely execute it and catch any errors
 */
export function safeFn(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error(`Error in function: ${error?.message}`);
      return null;
    }
  };
}

/**
 * Try executing a function and catch any errors
 */
export async function tryCatch(fn, fallback = null) {
  try {
    return await fn();
  } catch (error) {
    console.error(`Error: ${error?.message}`);
    return fallback;
  }
}

/**
 * Execute a function with retry logic
 */
export async function withRetry(fn, options = {}) {
  const { maxRetries = 3, delay = 500, onRetry = null } = options;
  
  let lastError = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (onRetry) {
        onRetry(error, attempt);
      }
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}
