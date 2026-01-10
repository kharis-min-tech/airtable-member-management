/**
 * Programs Handler
 * Handles program completion webhooks from Airtable
 * Logs program session completion status
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AirtableClient } from '../services/airtable-client';
import { ConfigService } from '../services/config-service';
import { AirtableConfig } from '../types';

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
 * Process program event - core business logic
 * 
 * Simply logs program completion status without updating member records.
 */
export async function processProgramEvent(
  event: ProgramEvent,
  _airtableClient: AirtableClient
): Promise<ProgramHandlerResult> {
  // Validate required fields
  if (!event.memberId) {
    return {
      success: false,
      allSessionsCompleted: false,
      error: 'Member ID is required',
    };
  }

  // Check if all four sessions are completed
  const allCompleted = areAllSessionsCompleted(event);

  // eslint-disable-next-line no-console
  console.log(`Program ${event.recordId} for member ${event.memberId}: ${allCompleted ? 'All sessions completed' : 'Not all sessions completed yet'}`);

  return {
    success: true,
    memberId: event.memberId,
    allSessionsCompleted: allCompleted,
  };
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
