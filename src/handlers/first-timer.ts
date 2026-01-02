/**
 * First Timer Handler
 * Handles first timer registration webhooks from Airtable
 * Creates or merges member records and marks attendance
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 6.1, 6.2
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AirtableClient, AIRTABLE_TABLES } from '../services/airtable-client';
import { MemberService } from '../services/member-service';
import { FollowUpService } from '../services/follow-up-service';
import { AttendanceService } from '../services/attendance-service';
import { ConfigService } from '../services/config-service';
import { AirtableConfig, MemberStatus } from '../types';

/**
 * First Timer event parsed from webhook payload
 */
export interface FirstTimerEvent {
  recordId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  email?: string;
  address?: string;
  ghanaPostCode?: string;
  serviceId?: string;
}

/**
 * Webhook payload structure from Airtable
 */
export interface FirstTimerWebhookPayload {
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
      'First Name'?: string;
      'Last Name'?: string;
      'Phone'?: string;
      'Email'?: string;
      'Address'?: string;
      'GhanaPost Code'?: string;
      'Service'?: string[];
      'Linked Member'?: string[];
    };
  };
}

/**
 * Result of processing a first timer event
 */
export interface FirstTimerHandlerResult {
  success: boolean;
  memberId?: string;
  memberCreated: boolean;
  memberMerged: boolean;
  firstTimerRecordLinked: boolean;
  attendanceMarked: boolean;
  reassignmentOccurred: boolean;
  firstServiceAttendedUpdated: boolean;
  error?: string;
}


/**
 * Parse webhook payload from Airtable into FirstTimerEvent
 */
export function parseFirstTimerWebhook(payload: FirstTimerWebhookPayload): FirstTimerEvent {
  const { record } = payload;
  const fields = record.fields;

  return {
    recordId: record.id,
    firstName: fields['First Name'] || '',
    lastName: fields['Last Name'] || '',
    phone: fields['Phone'],
    email: fields['Email'],
    address: fields['Address'],
    ghanaPostCode: fields['GhanaPost Code'],
    serviceId: fields['Service']?.[0],
  };
}

/**
 * Process first timer event - core business logic
 * 
 * Requirements:
 * 2.1 - Search for existing member by phone/email
 * 2.2 - If match with "Evangelism Contact": update status to "First Timer", don't change Source
 * 2.3 - Merge missing fields without overwriting existing non-empty values
 * 2.4 - If no match: create new member with Status "First Timer", Source "First Timer Form"
 * 2.5 - Link first timer record to member
 * 2.6 - Update First Service Attended if empty
 * 6.1, 6.2 - Mark attendance for the service
 */
export async function processFirstTimerEvent(
  event: FirstTimerEvent,
  airtableClient: AirtableClient,
  memberService: MemberService,
  followUpService?: FollowUpService,
  attendanceService?: AttendanceService
): Promise<FirstTimerHandlerResult> {
  // Validate required fields
  if (!event.firstName || !event.lastName) {
    return {
      success: false,
      memberCreated: false,
      memberMerged: false,
      firstTimerRecordLinked: false,
      attendanceMarked: false,
      reassignmentOccurred: false,
      firstServiceAttendedUpdated: false,
      error: 'First name and last name are required',
    };
  }

  if (!event.phone && !event.email) {
    return {
      success: false,
      memberCreated: false,
      memberMerged: false,
      firstTimerRecordLinked: false,
      attendanceMarked: false,
      reassignmentOccurred: false,
      firstServiceAttendedUpdated: false,
      error: 'At least one of phone or email is required',
    };
  }

  try {
    // Step 1: Search for existing member by phone/email (Requirement 2.1)
    const existingMember = await memberService.findMemberByPhoneOrEmail(
      event.phone,
      event.email
    );

    let memberId: string;
    let memberCreated = false;
    let memberMerged = false;
    let reassignmentOccurred = false;
    let firstServiceAttendedUpdated = false;

    if (existingMember) {
      // Existing member found
      memberId = existingMember.id;
      
      // eslint-disable-next-line no-console
      console.log(`Found existing member ${memberId} for first timer record ${event.recordId}`);

      // Check if status is "Evangelism Contact" (Requirement 2.2)
      if (existingMember.status === 'Evangelism Contact') {
        // Update status to "First Timer" but don't change Source (Requirement 2.2)
        // Merge missing fields without overwriting (Requirement 2.3)
        await memberService.mergeFieldsIntoMember(memberId, {
          status: 'First Timer' as MemberStatus,
          address: event.address,
          ghanaPostCode: event.ghanaPostCode,
          email: event.email,
          phone: event.phone,
          firstServiceAttended: event.serviceId,
        });
        memberMerged = true;
        firstServiceAttendedUpdated = true;

        // eslint-disable-next-line no-console
        console.log(`Updated member ${memberId} status from Evangelism Contact to First Timer`);

        // Check for follow-up reassignment based on capacity (Requirement 5.1, 5.2, 5.3, 5.4)
        if (followUpService && existingMember.followUpOwner) {
          try {
            const reassignmentResult = await followUpService.processCapacityReassignment(
              memberId,
              existingMember.followUpOwner
            );

            if (reassignmentResult.reassigned && reassignmentResult.newOwnerId) {
              // Update member's follow-up owner
              await memberService.updateMember(memberId, {
                followUpOwner: reassignmentResult.newOwnerId,
              });
              reassignmentOccurred = true;

              // eslint-disable-next-line no-console
              console.log(`Reassigned member ${memberId} to new follow-up owner ${reassignmentResult.newOwnerId}`);
            } else if (reassignmentResult.warning) {
              // eslint-disable-next-line no-console
              console.warn(`Reassignment warning for member ${memberId}: ${reassignmentResult.warning}`);
            }
          } catch (reassignError) {
            // Log error but don't fail the entire operation
            // eslint-disable-next-line no-console
            console.error('Error checking reassignment:', reassignError);
          }
        }
      } else {
        // Member exists but not as Evangelism Contact - just merge missing fields
        // Update First Service Attended if empty (Requirement 2.6)
        const currentRecord = await airtableClient.getRecord(AIRTABLE_TABLES.MEMBERS, memberId);
        const currentFirstService = currentRecord.fields['First Service Attended'] as string[] | undefined;
        
        if (!currentFirstService || currentFirstService.length === 0) {
          if (event.serviceId) {
            await memberService.updateMember(memberId, {
              firstServiceAttended: event.serviceId,
            });
            firstServiceAttendedUpdated = true;
          }
        }
      }
    } else {
      // No existing member - create new one (Requirement 2.4)
      const newMember = await memberService.createMember({
        firstName: event.firstName,
        lastName: event.lastName,
        phone: event.phone || '',
        email: event.email,
        address: event.address,
        ghanaPostCode: event.ghanaPostCode,
        status: 'First Timer',
        source: 'First Timer Form',
        dateFirstCaptured: new Date(),
      });

      memberId = newMember.id;
      memberCreated = true;

      // eslint-disable-next-line no-console
      console.log(`Created new member ${memberId} for first timer record ${event.recordId}`);

      // Set First Service Attended for new member (Requirement 2.6)
      if (event.serviceId) {
        await memberService.updateMember(memberId, {
          firstServiceAttended: event.serviceId,
        });
        firstServiceAttendedUpdated = true;
      }
    }

    // Step 2: Link first timer record to member (Requirement 2.5)
    await airtableClient.updateRecord(
      AIRTABLE_TABLES.FIRST_TIMERS_REGISTER,
      event.recordId,
      { 'Linked Member': [memberId] }
    );

    // eslint-disable-next-line no-console
    console.log(`Linked first timer record ${event.recordId} to member ${memberId}`);

    // Step 3: Mark attendance for the service (Requirements 6.1, 6.2)
    let attendanceMarked = false;
    if (event.serviceId && attendanceService) {
      try {
        await attendanceService.markPresent(memberId, event.serviceId, 'First Timer');
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
      memberCreated,
      memberMerged,
      firstTimerRecordLinked: true,
      attendanceMarked,
      reassignmentOccurred,
      firstServiceAttendedUpdated,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error processing first timer event:', error);
    return {
      success: false,
      memberCreated: false,
      memberMerged: false,
      firstTimerRecordLinked: false,
      attendanceMarked: false,
      reassignmentOccurred: false,
      firstServiceAttendedUpdated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}


/**
 * Lambda handler for first timer webhook
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // eslint-disable-next-line no-console
  console.log('Received first timer webhook:', JSON.stringify(event, null, 2));

  try {
    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing request body' }),
      };
    }

    const payload: FirstTimerWebhookPayload = JSON.parse(event.body) as FirstTimerWebhookPayload;
    
    // Parse webhook into event
    const firstTimerEvent = parseFirstTimerWebhook(payload);
    
    // eslint-disable-next-line no-console
    console.log('Parsed first timer event:', JSON.stringify(firstTimerEvent, null, 2));

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
    const followUpService = new FollowUpService(airtableClient);
    const attendanceService = new AttendanceService(airtableClient);

    // Process the first timer event
    const result = await processFirstTimerEvent(
      firstTimerEvent,
      airtableClient,
      memberService,
      followUpService,
      attendanceService
    );

    if (!result.success) {
      // eslint-disable-next-line no-console
      console.error('First timer processing failed:', result.error);
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
        message: 'First timer webhook processed successfully',
        memberId: result.memberId,
        memberCreated: result.memberCreated,
        memberMerged: result.memberMerged,
        firstTimerRecordLinked: result.firstTimerRecordLinked,
        attendanceMarked: result.attendanceMarked,
        reassignmentOccurred: result.reassignmentOccurred,
        firstServiceAttendedUpdated: result.firstServiceAttendedUpdated,
      }),
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error processing first timer webhook:', error);
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
