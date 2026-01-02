/**
 * Programs Handler
 * Handles program completion webhooks from Airtable
 * Updates member records when program sessions are completed
 * 
 * Requirements: 10.3, 10.4
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AirtableClient, AIRTABLE_TABLES } from '../services/airtable-client';
import { ConfigService } from '../services/config-service';
import { AirtableConfig, AirtableRecord } from '../types';

/**
 * Program event parsed from webhook payload
 */
export interface ProgramEvent {
  recordId: string;
  memberId?: string;
  session1Completed: boolean;
  session2Completed: boolean;
  session3Completed: boolean;
  session4Completed: boolean;
  session1Date?: string;
  session2Date?: string;
  session3Date?: string;
  session4Date?: string;
}

/**
 * Webhook payload structure from Airtable for Member Programs
 */
export interface ProgramWebhookPayload {
  base: {
    id: string;
  };
  webhook: {
    id: string;
  };
  timestamp: string;
  record: {
    id: string;
    fields: {
      'Member'?: string[];
      'Session 1 Completed'?: boolean;
      'Session 2 Completed'?: boolean;
      'Session 3 Completed'?: boolean;
      'Session 4 Completed'?: boolean;
      'Session 1 Date'?: string;
      'Session 2 Date'?: string;
      'Session 3 Date'?: string;
      'Session 4 Date'?: string;
    };
  };
}

/**
 * Result of processing a program event
 */
export interface ProgramHandlerResult {
  success: boolean;
  memberId?: string;
  allSessionsCompleted: boolean;
  membershipCompletedUpdated: boolean;
  membershipCompletedDate?: string;
  error?: string;
}

/**
 * Parse webhook payload from Airtable into ProgramEvent
 */
export function parseProgramWebhook(payload: ProgramWebhookPayload): ProgramEvent {
  const { record } = payload;
  const fields = record.fields;

  return {
    recordId: record.id,
    memberId: fields['Member']?.[0],
    session1Completed: fields['Session 1 Completed'] ?? false,
    session2Completed: fields['Session 2 Completed'] ?? false,
    session3Completed: fields['Session 3 Completed'] ?? false,
    session4Completed: fields['Session 4 Completed'] ?? false,
    session1Date: fields['Session 1 Date'],
    session2Date: fields['Session 2 Date'],
    session3Date: fields['Session 3 Date'],
    session4Date: fields['Session 4 Date'],
  };
}


/**
 * Check if all four sessions are completed
 * Requirement 10.1, 10.2
 */
export function areAllSessionsCompleted(event: ProgramEvent): boolean {
  return (
    event.session1Completed &&
    event.session2Completed &&
    event.session3Completed &&
    event.session4Completed
  );
}

/**
 * Calculate the latest session date among all completed sessions
 * This will be used as the Membership Completed date
 * Requirement 10.2
 */
export function calculateCompletionDate(event: ProgramEvent): string | null {
  const dates: Date[] = [];

  if (event.session1Date) {
    const date = new Date(event.session1Date);
    if (!isNaN(date.getTime())) dates.push(date);
  }
  if (event.session2Date) {
    const date = new Date(event.session2Date);
    if (!isNaN(date.getTime())) dates.push(date);
  }
  if (event.session3Date) {
    const date = new Date(event.session3Date);
    if (!isNaN(date.getTime())) dates.push(date);
  }
  if (event.session4Date) {
    const date = new Date(event.session4Date);
    if (!isNaN(date.getTime())) dates.push(date);
  }

  if (dates.length === 0) {
    return null;
  }

  // Find the latest date
  const latestDate = dates.reduce((latest, current) => 
    current > latest ? current : latest
  );

  // Return ISO date string (YYYY-MM-DD)
  return latestDate.toISOString().split('T')[0] || null;
}

/**
 * Process program event - core business logic
 * 
 * Requirements:
 * 10.3 - When Member Programs record is created/updated, update linked Member's program tracking fields
 * 10.4 - When all sessions completed for New Believers program, update Member's Membership Completed date if not already set
 */
export async function processProgramEvent(
  event: ProgramEvent,
  airtableClient: AirtableClient
): Promise<ProgramHandlerResult> {
  // Validate required fields
  if (!event.memberId) {
    return {
      success: false,
      allSessionsCompleted: false,
      membershipCompletedUpdated: false,
      error: 'Member ID is required',
    };
  }

  try {
    // Step 1: Check if all four sessions are completed (Requirement 10.3)
    const allCompleted = areAllSessionsCompleted(event);

    if (!allCompleted) {
      // Not all sessions completed yet - nothing to update
      // eslint-disable-next-line no-console
      console.log(`Program ${event.recordId} for member ${event.memberId}: Not all sessions completed yet`);
      
      return {
        success: true,
        memberId: event.memberId,
        allSessionsCompleted: false,
        membershipCompletedUpdated: false,
      };
    }

    // eslint-disable-next-line no-console
    console.log(`Program ${event.recordId} for member ${event.memberId}: All sessions completed`);

    // Step 2: Get the member record to check if Membership Completed is already set
    const memberRecord: AirtableRecord = await airtableClient.getRecord(
      AIRTABLE_TABLES.MEMBERS,
      event.memberId
    );

    const currentMembershipCompleted = memberRecord.fields['Membership Completed'] as string | undefined;

    // Step 3: Only update if Membership Completed is not already set (Requirement 10.4)
    if (currentMembershipCompleted) {
      // eslint-disable-next-line no-console
      console.log(`Member ${event.memberId} already has Membership Completed date: ${currentMembershipCompleted}`);
      
      return {
        success: true,
        memberId: event.memberId,
        allSessionsCompleted: true,
        membershipCompletedUpdated: false,
        membershipCompletedDate: currentMembershipCompleted,
      };
    }

    // Step 4: Calculate completion date from session dates
    const completionDate = calculateCompletionDate(event);

    if (!completionDate) {
      // eslint-disable-next-line no-console
      console.warn(`Program ${event.recordId}: All sessions completed but no session dates available`);
      
      return {
        success: true,
        memberId: event.memberId,
        allSessionsCompleted: true,
        membershipCompletedUpdated: false,
        error: 'No session dates available to calculate completion date',
      };
    }

    // Step 5: Update member's Membership Completed date (Requirement 10.4)
    await airtableClient.updateRecord(
      AIRTABLE_TABLES.MEMBERS,
      event.memberId,
      { 'Membership Completed': completionDate }
    );

    // eslint-disable-next-line no-console
    console.log(`Updated member ${event.memberId} Membership Completed date to ${completionDate}`);

    return {
      success: true,
      memberId: event.memberId,
      allSessionsCompleted: true,
      membershipCompletedUpdated: true,
      membershipCompletedDate: completionDate,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error processing program event:', error);
    return {
      success: false,
      memberId: event.memberId,
      allSessionsCompleted: false,
      membershipCompletedUpdated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Lambda handler for program webhook
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // eslint-disable-next-line no-console
  console.log('Received program webhook:', JSON.stringify(event, null, 2));

  try {
    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing request body' }),
      };
    }

    const payload: ProgramWebhookPayload = JSON.parse(event.body) as ProgramWebhookPayload;
    
    // Parse webhook into event
    const programEvent = parseProgramWebhook(payload);
    
    // eslint-disable-next-line no-console
    console.log('Parsed program event:', JSON.stringify(programEvent, null, 2));

    // Initialize services
    const configService = new ConfigService();
    const config = await configService.getAirtableConfig();
    
    const airtableConfig: AirtableConfig = {
      baseId: config.baseId,
      apiKey: config.apiKey,
      rateLimitPerSecond: 5,
    };
    
    const airtableClient = new AirtableClient(airtableConfig);

    // Process the program event
    const result = await processProgramEvent(programEvent, airtableClient);

    if (!result.success) {
      // eslint-disable-next-line no-console
      console.error('Program processing failed:', result.error);
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'Processing failed',
          message: result.error,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Programs webhook processed successfully',
        memberId: result.memberId,
        allSessionsCompleted: result.allSessionsCompleted,
        membershipCompletedUpdated: result.membershipCompletedUpdated,
        membershipCompletedDate: result.membershipCompletedDate,
      }),
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error processing programs webhook:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
