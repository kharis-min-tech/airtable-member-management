/**
 * Returner Handler
 * Handles returner registration webhooks from Airtable
 * Links to existing member records and marks attendance
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 7.1, 7.2
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AirtableClient, AIRTABLE_TABLES } from '../services/airtable-client';
import { MemberService } from '../services/member-service';
import { AttendanceService } from '../services/attendance-service';
import { ConfigService } from '../services/config-service';
import { AirtableConfig, MemberStatus } from '../types';

/**
 * Returner event parsed from webhook payload
 */
export interface ReturnerEvent {
  recordId: string;
  name: string;
  phone?: string;
  email?: string;
  serviceId?: string;
}

/**
 * Webhook payload structure from Airtable
 */
export interface ReturnerWebhookPayload {
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
      'Name'?: string;
      'Phone'?: string;
      'Email'?: string;
      'Service'?: string[];
      'Linked Member'?: string[];
    };
  };
}

/**
 * Result of processing a returner event
 */
export interface ReturnerHandlerResult {
  success: boolean;
  memberId?: string;
  statusUpdated: boolean;
  returnerRecordLinked: boolean;
  attendanceMarked: boolean;
  error?: string;
}


/**
 * Parse webhook payload from Airtable into ReturnerEvent
 */
export function parseReturnerWebhook(payload: ReturnerWebhookPayload): ReturnerEvent {
  const { record } = payload;
  const fields = record.fields;

  return {
    recordId: record.id,
    name: fields['Name'] || '',
    phone: fields['Phone'],
    email: fields['Email'],
    serviceId: fields['Service']?.[0],
  };
}

/**
 * Process returner event - core business logic
 * 
 * Requirements:
 * 3.1 - Search for existing member by phone/email
 * 3.2 - If match: update status to "Returner" if currently "First Timer" or "Evangelism Contact"
 * 3.3 - Link returner record to member
 * 3.4 - If no match: return error indicating First Timer form should be used
 * 7.1, 7.2 - Mark attendance for the service
 */
export async function processReturnerEvent(
  event: ReturnerEvent,
  airtableClient: AirtableClient,
  memberService: MemberService,
  attendanceService?: AttendanceService
): Promise<ReturnerHandlerResult> {
  // Validate required fields
  if (!event.phone && !event.email) {
    return {
      success: false,
      statusUpdated: false,
      returnerRecordLinked: false,
      attendanceMarked: false,
      error: 'At least one of phone or email is required',
    };
  }

  try {
    // Step 1: Search for existing member by phone/email (Requirement 3.1)
    const existingMember = await memberService.findMemberByPhoneOrEmail(
      event.phone,
      event.email
    );

    // Step 2: If no match, return error (Requirement 3.4)
    if (!existingMember) {
      return {
        success: false,
        statusUpdated: false,
        returnerRecordLinked: false,
        attendanceMarked: false,
        error: 'No existing member found. Please use the First Timer registration form instead.',
      };
    }

    const memberId = existingMember.id;
    let statusUpdated = false;

    // eslint-disable-next-line no-console
    console.log(`Found existing member ${memberId} for returner record ${event.recordId}`);

    // Step 3: Update status to "Returner" if applicable (Requirement 3.2)
    // Only update if current status is "First Timer" or "Evangelism Contact"
    if (existingMember.status === 'First Timer' || existingMember.status === 'Evangelism Contact') {
      await memberService.updateMember(memberId, {
        status: 'Returner' as MemberStatus,
      });
      statusUpdated = true;

      // eslint-disable-next-line no-console
      console.log(`Updated member ${memberId} status from ${existingMember.status} to Returner`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`Member ${memberId} status remains ${existingMember.status} (no update needed)`);
    }

    // Step 4: Link returner record to member (Requirement 3.3)
    await airtableClient.updateRecord(
      AIRTABLE_TABLES.RETURNERS_REGISTER,
      event.recordId,
      { 'Linked Member': [memberId] }
    );

    // eslint-disable-next-line no-console
    console.log(`Linked returner record ${event.recordId} to member ${memberId}`);

    // Step 5: Mark attendance for the service (Requirements 7.1, 7.2)
    let attendanceMarked = false;
    if (event.serviceId && attendanceService) {
      try {
        await attendanceService.markPresent(memberId, event.serviceId, 'Returner');
        attendanceMarked = true;

        // eslint-disable-next-line no-console
        console.log(`Marked attendance for member ${memberId} at service ${event.serviceId}`);
      } catch (attendanceError) {
        // Log error but don't fail the entire operation
        // eslint-disable-next-line no-console
        console.error('Error marking attendance:', attendanceError);
      }
    }

    return {
      success: true,
      memberId,
      statusUpdated,
      returnerRecordLinked: true,
      attendanceMarked,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error processing returner event:', error);
    return {
      success: false,
      statusUpdated: false,
      returnerRecordLinked: false,
      attendanceMarked: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}


/**
 * Lambda handler for returner webhook
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // eslint-disable-next-line no-console
  console.log('Received returner webhook:', JSON.stringify(event, null, 2));

  try {
    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing request body' }),
      };
    }

    const payload: ReturnerWebhookPayload = JSON.parse(event.body) as ReturnerWebhookPayload;
    
    // Parse webhook into event
    const returnerEvent = parseReturnerWebhook(payload);
    
    // eslint-disable-next-line no-console
    console.log('Parsed returner event:', JSON.stringify(returnerEvent, null, 2));

    // Initialize services
    const configService = new ConfigService();
    const config = await configService.getAirtableConfig();
    
    const airtableConfig: AirtableConfig = {
      baseId: config.baseId,
      apiKey: config.apiKey,
      rateLimitPerSecond: 5,
    };
    
    const airtableClient = new AirtableClient(airtableConfig);
    const memberService = new MemberService(airtableClient);
    const attendanceService = new AttendanceService(airtableClient);

    // Process the returner event
    const result = await processReturnerEvent(
      returnerEvent,
      airtableClient,
      memberService,
      attendanceService
    );

    if (!result.success) {
      // eslint-disable-next-line no-console
      console.error('Returner processing failed:', result.error);
      
      // Return 400 for "no member found" error (Requirement 3.4)
      const statusCode = result.error?.includes('No existing member found') ? 400 : 500;
      
      return {
        statusCode,
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
        message: 'Returner webhook processed successfully',
        memberId: result.memberId,
        statusUpdated: result.statusUpdated,
        returnerRecordLinked: result.returnerRecordLinked,
        attendanceMarked: result.attendanceMarked,
      }),
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error processing returner webhook:', error);
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
