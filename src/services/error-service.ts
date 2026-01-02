/**
 * Centralized Error Handling Service
 * Provides standardized error types, codes, and retry logic with exponential backoff
 * 
 * Requirements: 13.1, 13.3, 13.4
 */

/**
 * Error codes for the application
 * Categorized by type: validation, business logic, external services, system
 */
export enum ErrorCode {
  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Business logic errors
  DUPLICATE_MEMBER = 'DUPLICATE_MEMBER',
  MEMBER_NOT_FOUND = 'MEMBER_NOT_FOUND',
  NO_AVAILABLE_VOLUNTEER = 'NO_AVAILABLE_VOLUNTEER',
  INVALID_STATUS_TRANSITION = 'INVALID_STATUS_TRANSITION',
  RETURNER_NOT_IN_SYSTEM = 'RETURNER_NOT_IN_SYSTEM',

  // External service errors
  AIRTABLE_API_ERROR = 'AIRTABLE_API_ERROR',
  AIRTABLE_RATE_LIMITED = 'AIRTABLE_RATE_LIMITED',
  DYNAMODB_ERROR = 'DYNAMODB_ERROR',
  COGNITO_ERROR = 'COGNITO_ERROR',

  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
}

/**
 * Error severity levels for notification and logging
 */
export type ErrorSeverity = 'critical' | 'warning' | 'info';

/**
 * Error context for logging and debugging
 */
export interface ErrorContext {
  churchId?: string;
  recordId?: string;
  operation: string;
  timestamp: string;
  requestId?: string;
  userId?: string;
  additionalData?: Record<string, unknown>;
}

/**
 * AppError - Centralized error class for the application
 * Provides consistent error structure with error codes, retryability, and context
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly retryable: boolean;
  public readonly severity: ErrorSeverity;
  public readonly details?: Record<string, unknown>;
  public readonly context?: ErrorContext;
  public readonly originalError?: Error;

  constructor(
    code: ErrorCode,
    message: string,
    options?: {
      retryable?: boolean;
      severity?: ErrorSeverity;
      details?: Record<string, unknown>;
      context?: ErrorContext;
      originalError?: Error;
    }
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.retryable = options?.retryable ?? this.isRetryableByDefault(code);
    this.severity = options?.severity ?? this.getSeverityByDefault(code);
    this.details = options?.details;
    this.context = options?.context;
    this.originalError = options?.originalError;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Determine if an error code is retryable by default
   */
  private isRetryableByDefault(code: ErrorCode): boolean {
    const retryableCodes = [
      ErrorCode.AIRTABLE_RATE_LIMITED,
      ErrorCode.AIRTABLE_API_ERROR,
      ErrorCode.DYNAMODB_ERROR,
      ErrorCode.TIMEOUT_ERROR,
    ];
    return retryableCodes.includes(code);
  }

  /**
   * Determine default severity based on error code
   */
  private getSeverityByDefault(code: ErrorCode): ErrorSeverity {
    const criticalCodes = [
      ErrorCode.DUPLICATE_MEMBER,
      ErrorCode.NO_AVAILABLE_VOLUNTEER,
      ErrorCode.CONFIGURATION_ERROR,
      ErrorCode.INTERNAL_ERROR,
    ];
    const warningCodes = [
      ErrorCode.AIRTABLE_RATE_LIMITED,
      ErrorCode.TIMEOUT_ERROR,
      ErrorCode.INVALID_STATUS_TRANSITION,
    ];

    if (criticalCodes.includes(code)) return 'critical';
    if (warningCodes.includes(code)) return 'warning';
    return 'info';
  }

  /**
   * Convert error to JSON for logging/serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      retryable: this.retryable,
      severity: this.severity,
      details: this.details,
      context: this.context,
      stack: this.stack,
      originalError: this.originalError?.message,
    };
  }

  /**
   * Create an AppError from an unknown error
   */
  static fromError(error: unknown, context?: ErrorContext): AppError {
    if (error instanceof AppError) {
      // Add context if not already present
      if (context && !error.context) {
        return new AppError(error.code, error.message, {
          retryable: error.retryable,
          severity: error.severity,
          details: error.details,
          context,
          originalError: error.originalError,
        });
      }
      return error;
    }

    if (error instanceof Error) {
      return new AppError(ErrorCode.INTERNAL_ERROR, error.message, {
        context,
        originalError: error,
      });
    }

    return new AppError(
      ErrorCode.INTERNAL_ERROR,
      typeof error === 'string' ? error : 'Unknown error occurred',
      { context }
    );
  }
}


/**
 * Retry configuration for exponential backoff
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrors?: ErrorCode[];
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableErrors: [
    ErrorCode.AIRTABLE_RATE_LIMITED,
    ErrorCode.AIRTABLE_API_ERROR,
    ErrorCode.DYNAMODB_ERROR,
    ErrorCode.TIMEOUT_ERROR,
  ],
};

/**
 * Calculate delay for exponential backoff with jitter
 * Formula: min(baseDelay * 2^attempt + jitter, maxDelay)
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 1000;
  return Math.min(exponentialDelay + jitter, config.maxDelayMs);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry result containing the result or final error
 */
export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: AppError;
  attempts: number;
}

/**
 * Execute an operation with exponential backoff retry logic
 * 
 * @param operation - The async operation to execute
 * @param config - Retry configuration
 * @param context - Error context for logging
 * @returns RetryResult with success status and result or error
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  context?: Partial<ErrorContext>
): Promise<RetryResult<T>> {
  let lastError: AppError | undefined;
  const fullContext: ErrorContext = {
    operation: context?.operation || 'unknown',
    timestamp: new Date().toISOString(),
    ...context,
  };

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await operation();
      return {
        success: true,
        result,
        attempts: attempt + 1,
      };
    } catch (error) {
      lastError = AppError.fromError(error, fullContext);

      // Check if error is retryable
      const isRetryable = lastError.retryable ||
        (config.retryableErrors?.includes(lastError.code) ?? false);

      // If not retryable or last attempt, stop retrying
      if (!isRetryable || attempt === config.maxRetries) {
        // Log the final failure
        logError(lastError, {
          ...fullContext,
          additionalData: {
            ...fullContext.additionalData,
            totalAttempts: attempt + 1,
            finalFailure: true,
          },
        });

        return {
          success: false,
          error: lastError,
          attempts: attempt + 1,
        };
      }

      // Calculate delay and wait before retry
      const delay = calculateBackoffDelay(attempt, config);
      
      // Log retry attempt
      logWarning(`Retry attempt ${attempt + 1}/${config.maxRetries} after ${delay}ms`, {
        ...fullContext,
        additionalData: {
          ...fullContext.additionalData,
          errorCode: lastError.code,
          delay,
        },
      });

      await sleep(delay);
    }
  }

  // Should not reach here, but handle edge case
  return {
    success: false,
    error: lastError || new AppError(ErrorCode.INTERNAL_ERROR, 'Retry exhausted'),
    attempts: config.maxRetries + 1,
  };
}

/**
 * Execute an operation with retry, throwing on failure
 * Use this when you want exceptions to propagate
 */
export async function executeWithRetryOrThrow<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  context?: Partial<ErrorContext>
): Promise<T> {
  const result = await executeWithRetry(operation, config, context);
  
  if (!result.success) {
    throw result.error;
  }
  
  return result.result as T;
}

/**
 * Log an error with full context
 * Requirement 13.1 - Log errors with full context
 */
export function logError(error: AppError | Error, context?: ErrorContext): void {
  const appError = error instanceof AppError ? error : AppError.fromError(error, context);
  
  const logEntry = {
    level: 'ERROR',
    timestamp: context?.timestamp || new Date().toISOString(),
    errorCode: appError.code,
    message: appError.message,
    severity: appError.severity,
    retryable: appError.retryable,
    context: {
      ...appError.context,
      ...context,
    },
    details: appError.details,
    stack: appError.stack,
    originalError: appError.originalError?.message,
  };

  // eslint-disable-next-line no-console
  console.error(JSON.stringify(logEntry));
}

/**
 * Log a warning message with context
 */
export function logWarning(message: string, context?: ErrorContext): void {
  const logEntry = {
    level: 'WARN',
    timestamp: context?.timestamp || new Date().toISOString(),
    message,
    context,
  };

  // eslint-disable-next-line no-console
  console.warn(JSON.stringify(logEntry));
}

/**
 * Log an info message with context
 */
export function logInfo(message: string, context?: Partial<ErrorContext>): void {
  const logEntry = {
    level: 'INFO',
    timestamp: context?.timestamp || new Date().toISOString(),
    message,
    context,
  };

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(logEntry));
}

/**
 * Critical error codes that should trigger notifications
 */
export const CRITICAL_ERROR_CODES: ErrorCode[] = [
  ErrorCode.DUPLICATE_MEMBER,
  ErrorCode.NO_AVAILABLE_VOLUNTEER,
  ErrorCode.CONFIGURATION_ERROR,
  ErrorCode.INTERNAL_ERROR,
];

/**
 * Check if an error is critical and should trigger notification
 */
export function isCriticalError(error: AppError | Error): boolean {
  if (error instanceof AppError) {
    return error.severity === 'critical' || CRITICAL_ERROR_CODES.includes(error.code);
  }
  return false;
}
