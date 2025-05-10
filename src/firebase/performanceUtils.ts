// src/firebase/performanceUtils.ts
import { getDocs, QueryConstraint } from 'firebase/firestore';

/**
 * Measure the performance of a database operation
 * 
 * @param operationName Name of the operation for logging
 * @param queryFn Function that executes the database operation
 * @returns Result of the database operation
 */
export async function measureQueryPerformance<T>(operationName: string, queryFn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    const result = await queryFn();
    return result;
  } finally {
    const duration = performance.now() - start;
    
    // Log performance data
    if (duration > 500) {
      console.warn(`⚠️ Slow operation: ${operationName} took ${duration.toFixed(2)}ms`);
    } else if (duration > 100) {
      console.info(`ℹ️ Operation ${operationName} took ${duration.toFixed(2)}ms`);
    } else {
      console.debug(`Operation ${operationName} took ${duration.toFixed(2)}ms`);
    }
    
    // Potentially track performance metrics to analytics or monitoring service
    // This could be implemented when you add a monitoring solution
    if (duration > 1000) {
      // Example: log to monitoring service
      // logToMonitoring('slow_query', { name: operationName, duration });
    }
  }
}

/**
 * Verify if an index exists for a query by checking if it returns quickly
 * 
 * @param query The query to test
 * @param timeoutMs Timeout in milliseconds (default: 500ms)
 * @returns Boolean indicating if index likely exists
 */
export async function verifyIndexExists(query: any, timeoutMs = 500): Promise<boolean> {
  // Create a promise that resolves if the query completes
  const queryPromise = getDocs(query).then(() => true);
  
  // Create a promise that rejects after the timeout
  const timeoutPromise = new Promise<boolean>((_, reject) => {
    setTimeout(() => reject(new Error("Query timeout - index might be missing")), timeoutMs);
  });
  
  try {
    // Race the query against the timeout
    await Promise.race([queryPromise, timeoutPromise]);
    return true;
  } catch (error) {
    console.error("Query timeout or error - possible missing index:", error);
    return false;
  }
}