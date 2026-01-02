/**
 * Health Check Handler
 * Verifies system connectivity and returns status
 * 
 * Requirements: 13.5
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AirtableClient, AIRTABLE_TABLES } from '../services/airtable-client';
import { ConfigService } from '../services/config-service';
import { CacheService } from '../services/cache-service';
import { logInfo, logError, AppError } from '../services/error-service';
import { AirtableConfig } from '../types';

/**
 * Health check status for individual components
 */
type HealthStatus = 'ok' | 'degraded' | 'unhealthy';

/**
 * Individual health check result
 */
interface HealthCheckResult {
  status: HealthStatus;
  latencyMs?: number;
  message?: string;
  error?: string;
}

/**
 * Overall health response
 */
interface HealthResponse {
  status: HealthStatus;
  timestamp: string;
  version: string;
  environment: string;
  checks: {
    lambda: HealthCheckResult;
    airtable: HealthCheckResult;
    dynamodb: HealthCheckResult;
    configuration: HealthCheckResult;
  };
  uptime?: number;
}

// Track Lambda start time for uptime calculation
const lambdaStartTime = Date.now();

/**
 * Check Airtable connectivity by attempting to list records
 * Requirement 13.5 - Verify Airtable connectivity
 */
async function checkAirtableHealth(airtableClient: AirtableClient): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Try to fetch a single record from Members table to verify connectivity
    // Using a filter that should return quickly (limit to 1 record)
    await airtableClient.findRecords(AIRTABLE_TABLES.MEMBERS, 'TRUE()', { maxRecords: 1 });
    
    const latencyMs = Date.now() - startTime;
    
    return {
      status: latencyMs > 5000 ? 'degraded' : 'ok',
      latencyMs,
      message: latencyMs > 5000 ? 'High latency detected' : 'Connected successfully',
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Rate limit errors indicate the service is reachable but throttled
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      return {
        status: 'degraded',
        latencyMs,
        message: 'Rate limited - service reachable but throttled',
      };
    }
    
    return {
      status: 'unhealthy',
      latencyMs,
      error: errorMessage,
    };
  }
}

/**
 * Check DynamoDB connectivity via cache service
 */
async function checkDynamoDBHealth(cacheService: CacheService): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const testKey = `health-check-${Date.now()}`;
  
  try {
    // Write a test value
    await cacheService.set(testKey, { test: true }, 60);
    
    // Read it back
    const result = await cacheService.get<{ test: boolean }>(testKey);
    
    // Clean up
    await cacheService.invalidate(testKey);
    
    const latencyMs = Date.now() - startTime;
    
    if (!result || !result.test) {
      return {
        status: 'degraded',
        latencyMs,
        message: 'Read/write verification failed',
      };
    }
    
    return {
      status: latencyMs > 1000 ? 'degraded' : 'ok',
      latencyMs,
      message: latencyMs > 1000 ? 'High latency detected' : 'Connected successfully',
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    return {
      status: 'unhealthy',
      latencyMs,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check configuration availability
 */
async function checkConfigurationHealth(configService: ConfigService): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    const config = await configService.getAirtableConfig();
    const latencyMs = Date.now() - startTime;
    
    if (!config.baseId || !config.apiKey) {
      return {
        status: 'unhealthy',
        latencyMs,
        error: 'Missing required Airtable configuration',
      };
    }
    
    return {
      status: 'ok',
      latencyMs,
      message: 'Configuration loaded successfully',
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    return {
      status: 'unhealthy',
      latencyMs,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Determine overall health status from individual checks
 */
function determineOverallStatus(checks: HealthResponse['checks']): HealthStatus {
  const statuses = Object.values(checks).map((check) => check.status);
  
  if (statuses.some((s) => s === 'unhealthy')) {
    return 'unhealthy';
  }
  if (statuses.some((s) => s === 'degraded')) {
    return 'degraded';
  }
  return 'ok';
}

/**
 * Lambda handler for health check endpoint
 * Requirement 13.5 - Health check endpoint for monitoring
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const requestId = event.requestContext?.requestId || 'unknown';
  
  logInfo('Health check requested', {
    operation: 'healthCheck',
    timestamp: new Date().toISOString(),
    requestId,
  });

  // Initialize checks with Lambda status (always ok if we're running)
  const checks: HealthResponse['checks'] = {
    lambda: { status: 'ok', message: 'Lambda function running' },
    airtable: { status: 'unhealthy', error: 'Not checked' },
    dynamodb: { status: 'unhealthy', error: 'Not checked' },
    configuration: { status: 'unhealthy', error: 'Not checked' },
  };

  try {
    // Check configuration first
    const configService = new ConfigService();
    checks.configuration = await checkConfigurationHealth(configService);

    // Only check Airtable if configuration is healthy
    if (checks.configuration.status === 'ok') {
      try {
        const config = await configService.getAirtableConfig();
        const airtableConfig: AirtableConfig = {
          baseId: config.baseId,
          apiKey: config.apiKey,
          rateLimitPerSecond: 5,
        };
        const airtableClient = new AirtableClient(airtableConfig);
        checks.airtable = await checkAirtableHealth(airtableClient);
      } catch (error) {
        checks.airtable = {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Failed to initialize Airtable client',
        };
      }
    } else {
      checks.airtable = {
        status: 'unhealthy',
        error: 'Skipped due to configuration failure',
      };
    }

    // Check DynamoDB
    try {
      const cacheService = new CacheService();
      checks.dynamodb = await checkDynamoDBHealth(cacheService);
    } catch (error) {
      checks.dynamodb = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Failed to initialize cache service',
      };
    }

    const overallStatus = determineOverallStatus(checks);
    const uptime = Math.floor((Date.now() - lambdaStartTime) / 1000);

    const healthResponse: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'production',
      checks,
      uptime,
    };

    const statusCode = overallStatus === 'unhealthy' ? 503 : 200;

    logInfo(`Health check completed: ${overallStatus}`, {
      operation: 'healthCheck',
      timestamp: new Date().toISOString(),
      requestId,
      additionalData: {
        status: overallStatus,
        checks: Object.fromEntries(
          Object.entries(checks).map(([key, value]) => [key, value.status])
        ),
      },
    });

    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      body: JSON.stringify(healthResponse),
    };
  } catch (error) {
    const appError = AppError.fromError(error, {
      operation: 'healthCheck',
      timestamp: new Date().toISOString(),
      requestId,
    });

    logError(appError);

    return {
      statusCode: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      body: JSON.stringify({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: process.env.APP_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'production',
        checks: {
          lambda: { status: 'ok', message: 'Lambda function running' },
          airtable: { status: 'unhealthy', error: 'Health check failed' },
          dynamodb: { status: 'unhealthy', error: 'Health check failed' },
          configuration: { status: 'unhealthy', error: 'Health check failed' },
        },
        error: appError.message,
      }),
    };
  }
};
