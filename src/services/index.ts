/**
 * Service exports for the Church Member Management Automation System
 */

export { 
  CacheService, 
  CACHE_KEYS, 
  CACHE_PATTERNS,
  DEFAULT_TTL 
} from './cache-service';
export type { CacheEntry, CacheGetResult } from './cache-service';
export { ConfigService } from './config-service';
export { AuthService, PERMISSIONS, extractAccessToken } from './auth-service';
export type { DataScope } from './auth-service';
export { AirtableClient, AirtableError, AirtableErrorCode, AIRTABLE_TABLES } from './airtable-client';
export { MemberService, MemberError, MemberErrorCode } from './member-service';
export { FollowUpService, FollowUpError, FollowUpErrorCode } from './follow-up-service';
export { AttendanceService, AttendanceError, AttendanceErrorCode } from './attendance-service';
export type { MarkPresentResult } from './attendance-service';
export { QueryService } from './query-service';
export type {
  EvangelismStats,
  FollowUpSummary,
  AttendanceBreakdown,
  DepartmentAttendance,
  FollowUpInteraction,
  EvangelismRecord,
} from './query-service';

// Error handling exports
export {
  AppError,
  ErrorCode,
  DEFAULT_RETRY_CONFIG,
  CRITICAL_ERROR_CODES,
  executeWithRetry,
  executeWithRetryOrThrow,
  calculateBackoffDelay,
  logError,
  logWarning,
  logInfo,
  isCriticalError,
} from './error-service';
export type {
  ErrorSeverity,
  ErrorContext,
  RetryConfig,
  RetryResult,
} from './error-service';

// Notification service exports
export {
  NotificationService,
  getNotificationService,
  resetNotificationService,
} from './notification-service';
export type {
  NotificationConfig,
  ErrorNotification,
} from './notification-service';
