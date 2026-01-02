import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CacheService, CACHE_PATTERNS } from '../services/cache-service';

/**
 * Cache management handler for manual refresh and invalidation
 * Validates: Requirements 21.3, 21.4 (Refresh Now functionality)
 */

const cacheService = new CacheService();

/**
 * Response headers for CORS
 */
const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};

/**
 * Main handler for cache operations
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const httpMethod = event.httpMethod;
    const path = event.path;

    // Route based on path and method
    if (httpMethod === 'POST' && path.endsWith('/refresh')) {
      return handleRefresh(event);
    }

    if (httpMethod === 'DELETE' && path.endsWith('/invalidate')) {
      return handleInvalidate(event);
    }

    if (httpMethod === 'GET' && path.endsWith('/status')) {
      return handleStatus(event);
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({
        error: 'Not Found',
        message: `Unknown cache operation: ${httpMethod} ${path}`,
      }),
    };
  } catch (error) {
    console.error('Cache handler error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

/**
 * Handle cache refresh request
 * POST /cache/refresh
 * Body: { pattern?: string, key?: string }
 * 
 * Validates: Requirements 21.3, 21.4
 */
async function handleRefresh(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { pattern, key } = body as { pattern?: string; key?: string };

    let invalidatedCount = 0;
    const refreshedAt = new Date().toISOString();

    if (key) {
      // Invalidate specific key
      await cacheService.invalidate(key);
      invalidatedCount = 1;
    } else if (pattern) {
      // Invalidate by pattern
      const validPattern = getValidPattern(pattern);
      if (!validPattern) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Invalid pattern',
            message: `Pattern must be one of: ${Object.keys(CACHE_PATTERNS).join(', ')}`,
          }),
        };
      }
      invalidatedCount = await cacheService.invalidatePattern(validPattern);
    } else {
      // Invalidate all cache entries
      const patterns = Object.values(CACHE_PATTERNS);
      for (const p of patterns) {
        invalidatedCount += await cacheService.invalidatePattern(p);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Cache refreshed successfully',
        invalidatedCount,
        refreshedAt,
      }),
    };
  } catch (error) {
    console.error('Cache refresh error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Refresh failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}

/**
 * Handle cache invalidation request
 * DELETE /cache/invalidate
 * Query params: key (required)
 * 
 * Validates: Requirements 21.3, 21.4
 */
async function handleInvalidate(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const key = event.queryStringParameters?.key;

    if (!key) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing parameter',
          message: 'Query parameter "key" is required',
        }),
      };
    }

    await cacheService.invalidate(key);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Cache key invalidated',
        key,
        invalidatedAt: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Cache invalidate error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Invalidation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}

/**
 * Handle cache status request
 * GET /cache/status
 * Query params: key (optional)
 * 
 * Validates: Requirements 21.2 (Last Updated timestamp)
 */
async function handleStatus(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const key = event.queryStringParameters?.key;

    if (key) {
      // Get status for specific key
      const lastUpdated = await cacheService.getLastUpdated(key);
      const exists = lastUpdated !== null;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          key,
          exists,
          lastUpdated,
          checkedAt: new Date().toISOString(),
        }),
      };
    }

    // Return general cache status
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'healthy',
        defaultTtlSeconds: 900,
        availablePatterns: Object.keys(CACHE_PATTERNS),
        checkedAt: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Cache status error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Status check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
}

/**
 * Validate and get the cache pattern
 */
function getValidPattern(patternName: string): string | null {
  const upperName = patternName.toUpperCase();
  const patterns = CACHE_PATTERNS as Record<string, string>;
  
  // Check if it's a valid pattern name
  if (upperName in patterns) {
    return patterns[upperName]!;
  }
  
  // Check if it's already a valid pattern value
  if (Object.values(patterns).includes(patternName)) {
    return patternName;
  }
  
  return null;
}
