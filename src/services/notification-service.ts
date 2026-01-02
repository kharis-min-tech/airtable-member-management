/**
 * Notification Service
 * Sends notifications for critical errors to configured admin contacts
 * 
 * Requirements: 13.1, 13.2
 */

import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import {
  AppError,
  ErrorCode,
  ErrorContext,
  ErrorSeverity,
  CRITICAL_ERROR_CODES,
  logError,
  logInfo,
  logWarning,
} from './error-service';

/**
 * Notification configuration
 */
export interface NotificationConfig {
  snsTopicArn?: string;
  adminEmails?: string[];
  senderEmail?: string;
  churchName?: string;
  environment?: string;
}

/**
 * Error notification payload
 */
export interface ErrorNotification {
  severity: ErrorSeverity;
  errorCode: ErrorCode;
  message: string;
  context: ErrorContext;
  timestamp: string;
}

/**
 * NotificationService - Handles sending notifications for critical errors
 */
export class NotificationService {
  private readonly snsClient: SNSClient;
  private readonly sesClient: SESClient;
  private readonly config: NotificationConfig;

  constructor(config?: NotificationConfig) {
    this.snsClient = new SNSClient({});
    this.sesClient = new SESClient({});
    this.config = {
      snsTopicArn: config?.snsTopicArn || process.env.ERROR_SNS_TOPIC_ARN,
      adminEmails: config?.adminEmails || this.parseAdminEmails(),
      senderEmail: config?.senderEmail || process.env.SENDER_EMAIL || 'noreply@church-automation.com',
      churchName: config?.churchName || process.env.CHURCH_NAME || 'Church',
      environment: config?.environment || process.env.NODE_ENV || 'production',
    };
  }

  /**
   * Parse admin emails from environment variable
   */
  private parseAdminEmails(): string[] {
    const emailsEnv = process.env.ADMIN_EMAILS;
    if (!emailsEnv) return [];
    return emailsEnv.split(',').map((email) => email.trim()).filter(Boolean);
  }

  /**
   * Send notification for a critical error
   * Requirement 13.2 - Send notifications for critical errors
   */
  async notifyCriticalError(error: AppError, context?: ErrorContext): Promise<void> {
    const notification = this.createNotification(error, context);

    // Log the notification attempt
    logInfo('Sending critical error notification', {
      operation: 'notifyCriticalError',
      timestamp: notification.timestamp,
      additionalData: {
        errorCode: notification.errorCode,
        severity: notification.severity,
      },
    });

    const promises: Promise<void>[] = [];

    // Send SNS notification if topic is configured
    if (this.config.snsTopicArn) {
      promises.push(this.sendSnsNotification(notification));
    }

    // Send email notifications if admin emails are configured
    if (this.config.adminEmails && this.config.adminEmails.length > 0) {
      promises.push(this.sendEmailNotification(notification));
    }

    // If no notification channels configured, just log
    if (promises.length === 0) {
      logWarning('No notification channels configured for critical error', {
        operation: 'notifyCriticalError',
        timestamp: notification.timestamp,
        additionalData: {
          errorCode: notification.errorCode,
        },
      });
      return;
    }

    // Wait for all notifications to complete
    const results = await Promise.allSettled(promises);
    
    // Log any notification failures
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        logWarning(`Notification channel ${index} failed: ${result.reason}`, {
          operation: 'notifyCriticalError',
          timestamp: new Date().toISOString(),
        });
      }
    });
  }

  /**
   * Create notification payload from error
   */
  private createNotification(error: AppError, context?: ErrorContext): ErrorNotification {
    return {
      severity: error.severity,
      errorCode: error.code,
      message: error.message,
      context: {
        operation: context?.operation || error.context?.operation || 'unknown',
        timestamp: new Date().toISOString(),
        churchId: context?.churchId || error.context?.churchId,
        recordId: context?.recordId || error.context?.recordId,
        requestId: context?.requestId || error.context?.requestId,
        userId: context?.userId || error.context?.userId,
        additionalData: {
          ...error.context?.additionalData,
          ...context?.additionalData,
          stack: error.stack,
          originalError: error.originalError?.message,
        },
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Send notification via SNS
   */
  private async sendSnsNotification(notification: ErrorNotification): Promise<void> {
    if (!this.config.snsTopicArn) return;

    try {
      const subject = this.formatSubject(notification);
      const message = this.formatMessage(notification);

      await this.snsClient.send(
        new PublishCommand({
          TopicArn: this.config.snsTopicArn,
          Subject: subject,
          Message: message,
          MessageAttributes: {
            severity: {
              DataType: 'String',
              StringValue: notification.severity,
            },
            errorCode: {
              DataType: 'String',
              StringValue: notification.errorCode,
            },
          },
        })
      );

      logInfo('SNS notification sent successfully', {
        operation: 'sendSnsNotification',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      logError(AppError.fromError(error, {
        operation: 'sendSnsNotification',
        timestamp: new Date().toISOString(),
      }));
      throw error;
    }
  }


  /**
   * Send notification via SES email
   */
  private async sendEmailNotification(notification: ErrorNotification): Promise<void> {
    if (!this.config.adminEmails || this.config.adminEmails.length === 0) return;
    if (!this.config.senderEmail) return;

    try {
      const subject = this.formatSubject(notification);
      const htmlBody = this.formatHtmlEmail(notification);
      const textBody = this.formatMessage(notification);

      await this.sesClient.send(
        new SendEmailCommand({
          Source: this.config.senderEmail,
          Destination: {
            ToAddresses: this.config.adminEmails,
          },
          Message: {
            Subject: {
              Data: subject,
              Charset: 'UTF-8',
            },
            Body: {
              Html: {
                Data: htmlBody,
                Charset: 'UTF-8',
              },
              Text: {
                Data: textBody,
                Charset: 'UTF-8',
              },
            },
          },
        })
      );

      logInfo('Email notification sent successfully', {
        operation: 'sendEmailNotification',
        timestamp: new Date().toISOString(),
        additionalData: {
          recipientCount: this.config.adminEmails.length,
        },
      });
    } catch (error) {
      logError(AppError.fromError(error, {
        operation: 'sendEmailNotification',
        timestamp: new Date().toISOString(),
      }));
      throw error;
    }
  }

  /**
   * Format notification subject line
   */
  private formatSubject(notification: ErrorNotification): string {
    const severityEmoji = notification.severity === 'critical' ? '🚨' : '⚠️';
    return `${severityEmoji} [${this.config.churchName}] ${notification.severity.toUpperCase()}: ${notification.errorCode}`;
  }

  /**
   * Format notification message as plain text
   */
  private formatMessage(notification: ErrorNotification): string {
    const lines = [
      `Church Member Management System - Error Notification`,
      ``,
      `Environment: ${this.config.environment}`,
      `Church: ${this.config.churchName}`,
      `Timestamp: ${notification.timestamp}`,
      ``,
      `Error Details:`,
      `  Code: ${notification.errorCode}`,
      `  Severity: ${notification.severity}`,
      `  Message: ${notification.message}`,
      ``,
      `Context:`,
      `  Operation: ${notification.context.operation}`,
    ];

    if (notification.context.churchId) {
      lines.push(`  Church ID: ${notification.context.churchId}`);
    }
    if (notification.context.recordId) {
      lines.push(`  Record ID: ${notification.context.recordId}`);
    }
    if (notification.context.requestId) {
      lines.push(`  Request ID: ${notification.context.requestId}`);
    }
    if (notification.context.userId) {
      lines.push(`  User ID: ${notification.context.userId}`);
    }

    if (notification.context.additionalData) {
      lines.push(``, `Additional Data:`);
      lines.push(JSON.stringify(notification.context.additionalData, null, 2));
    }

    return lines.join('\n');
  }

  /**
   * Format notification as HTML email
   */
  private formatHtmlEmail(notification: ErrorNotification): string {
    const severityColor = notification.severity === 'critical' ? '#dc3545' : '#ffc107';
    
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: ${severityColor}; color: white; padding: 15px; border-radius: 5px 5px 0 0; }
    .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px; }
    .section { margin-bottom: 15px; }
    .label { font-weight: bold; color: #555; }
    .value { margin-left: 10px; }
    .code { background-color: #eee; padding: 10px; border-radius: 3px; font-family: monospace; overflow-x: auto; }
    .footer { margin-top: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">${notification.severity.toUpperCase()} Error Alert</h2>
      <p style="margin: 5px 0 0 0;">${this.config.churchName} - Church Member Management System</p>
    </div>
    <div class="content">
      <div class="section">
        <span class="label">Error Code:</span>
        <span class="value">${notification.errorCode}</span>
      </div>
      <div class="section">
        <span class="label">Message:</span>
        <span class="value">${notification.message}</span>
      </div>
      <div class="section">
        <span class="label">Timestamp:</span>
        <span class="value">${notification.timestamp}</span>
      </div>
      <div class="section">
        <span class="label">Environment:</span>
        <span class="value">${this.config.environment}</span>
      </div>
      <div class="section">
        <span class="label">Operation:</span>
        <span class="value">${notification.context.operation}</span>
      </div>
      ${notification.context.recordId ? `
      <div class="section">
        <span class="label">Record ID:</span>
        <span class="value">${notification.context.recordId}</span>
      </div>
      ` : ''}
      ${notification.context.requestId ? `
      <div class="section">
        <span class="label">Request ID:</span>
        <span class="value">${notification.context.requestId}</span>
      </div>
      ` : ''}
      ${notification.context.additionalData ? `
      <div class="section">
        <span class="label">Additional Data:</span>
        <div class="code">${JSON.stringify(notification.context.additionalData, null, 2)}</div>
      </div>
      ` : ''}
    </div>
    <div class="footer">
      <p>This is an automated notification from the Church Member Management System.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Check if an error should trigger a notification
   */
  shouldNotify(error: AppError): boolean {
    return error.severity === 'critical' || CRITICAL_ERROR_CODES.includes(error.code);
  }

  /**
   * Handle error with logging and optional notification
   * Combines logging and notification in one call
   * Requirement 13.1 - Log errors with full context
   * Requirement 13.2 - Send notifications for critical errors
   */
  async handleError(error: AppError | Error, context?: ErrorContext): Promise<void> {
    const appError = error instanceof AppError ? error : AppError.fromError(error, context);

    // Always log the error with full context
    logError(appError, context);

    // Send notification if critical
    if (this.shouldNotify(appError)) {
      try {
        await this.notifyCriticalError(appError, context);
      } catch (notificationError) {
        // Log notification failure but don't throw
        logWarning('Failed to send error notification', {
          operation: 'handleError',
          timestamp: new Date().toISOString(),
          additionalData: {
            originalError: appError.code,
            notificationError: notificationError instanceof Error ? notificationError.message : 'Unknown',
          },
        });
      }
    }
  }
}

/**
 * Singleton instance for convenience
 */
let notificationServiceInstance: NotificationService | null = null;

/**
 * Get or create the notification service singleton
 */
export function getNotificationService(config?: NotificationConfig): NotificationService {
  if (!notificationServiceInstance) {
    notificationServiceInstance = new NotificationService(config);
  }
  return notificationServiceInstance;
}

/**
 * Reset the notification service singleton (for testing)
 */
export function resetNotificationService(): void {
  notificationServiceInstance = null;
}
