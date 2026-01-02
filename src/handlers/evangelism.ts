/**
 * Evangelism Handler
 * Handles evangelism record creation webhooks from Airtable
 * Creates member records with Status "Evangelism Contact" and assigns follow-up
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.2, 4.3, 4.4
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { AirtableClient, AIRTABLE_TABLES } from '../services/airtable-client';
import { MemberService } from '../services/member-service';
import { FollowUpService } from '../services/follow-up-service';
import { ConfigService } from '../services/config-service';
import {
  EvangelismEvent,
  EvangelismWebhookPayload,
  EvangelismHandlerResult,
  AirtableConfig,
} from '../types';

/**
 * Parse webhook payload from Airtable into EvangelismEvent
 */
export function parseEvangelismWebhook(payload: EvangelismWebhookPayload): EvangelismEvent {
  const { record } = payload;
  const fields = record.fields;

  // Ensure date is always a string
  const dateValue = fields['Date'] || new Date().toISOString().split('T')[0] || '';

  return {
    recordId: record.id,
    firstName: fields['First Name'] || '',
    lastName: fields['Last Name'] || '',
    phone: fields['Phone'],
    email: fields['Email'],
    ghanaPostCode: fields['GhanaPost Code'],
    date: dateValue,
    capturedBy: fields['Captured By']?.[0],
  };
}

/**
 * Process evangelism event - core business logic
 * 
 * Requirements:
 * 1.1 - Create member record with Status "Evangelism Contact", Source "Evangelism"
 * 1.2 - Copy all fields from evangelism record
 * 1.3 - Link evangelism record to member
 * 1.4 - Set Date First Captured from evangelism Date
 * 4.1 - Create follow-up assignment to Captured By volunteer
 * 4.2 - Set Assigned Date to current date and Status to "Assigned"
 * 4.3 - Set Due Date to 3 days from Assigned Date
 * 4.4 - Update member's Follow-up Owner field
 */
export async function processEvangelismEvent(
  event: EvangelismEvent,
  airtableClient: AirtableClient,
  memberService: MemberService,
  followUpService?: FollowUpService
): Promise<EvangelismHandlerResult> {
  // Validate required fields
  if (!event.firstName || !event.lastName) {
    return {
      success: false,
      memberCreated: false,
      evangelismRecordLinked: false,
      followUpAssignmentCreated: false,
      followUpOwnerUpdated: false,
      error: 'First name and last name are required',
    };
  }

  if (!event.phone && !event.email) {
    return {
      success: false,
      memberCreated: false,
      evangelismRecordLinked: false,
      followUpAssignmentCreated: false,
      followUpOwnerUpdated: false,
      error: 'At least one of phone or email is required',
    };
  }

  try {
    // Step 1: Check for existing member by phone/email (Requirement 11.1 - deduplication)
    const existingMember = await memberService.findMemberByPhoneOrEmail(
      event.phone,
      event.email
    );

    let memberId: string;
    let memberCreated: boolean;

    if (existingMember) {
      // Member already exists - use existing record
      memberId = existingMember.id;
      memberCreated = false;
      
      // eslint-disable-next-line no-console
      console.log(`Found existing member ${memberId} for evangelism record ${event.recordId}`);
    } else {
      // Step 2: Create new member record (Requirements 1.1, 1.2, 1.4)
      const dateFirstCaptured = event.date 
        ? new Date(event.date) 
        : new Date();

      const newMember = await memberService.createMember({
        firstName: event.firstName,
        lastName: event.lastName,
        phone: event.phone || '',
        email: event.email,
        ghanaPostCode: event.ghanaPostCode,
        status: 'Evangelism Contact',
        source: 'Evangelism',
        dateFirstCaptured,
      });

      memberId = newMember.id;
      memberCreated = true;
      
      // eslint-disable-next-line no-console
      console.log(`Created new member ${memberId} for evangelism record ${event.recordId}`);
    }

    // Step 3: Link evangelism record to member (Requirement 1.3)
    await airtableClient.updateRecord(
      AIRTABLE_TABLES.EVANGELISM,
      event.recordId,
      { 'Linked Member': [memberId] }
    );

    // eslint-disable-next-line no-console
    console.log(`Linked evangelism record ${event.recordId} to member ${memberId}`);

    // Step 4: Create follow-up assignment if capturedBy volunteer is provided (Requirements 4.1, 4.2, 4.3)
    let followUpAssignmentId: string | undefined;
    let followUpAssignmentCreated = false;
    let followUpOwnerUpdated = false;

    if (event.capturedBy && followUpService) {
      try {
        // Create follow-up assignment to the soul winner (Requirement 4.1)
        const assignment = await followUpService.createAssignment(
          memberId,
          event.capturedBy
        );
        followUpAssignmentId = assignment.id;
        followUpAssignmentCreated = true;

        // eslint-disable-next-line no-console
        console.log(`Created follow-up assignment ${assignment.id} for member ${memberId}`);

        // Step 5: Update member's Follow-up Owner field (Requirement 4.4)
        await memberService.updateMember(memberId, {
          followUpOwner: event.capturedBy,
        });
        followUpOwnerUpdated = true;

        // eslint-disable-next-line no-console
        console.log(`Updated member ${memberId} Follow-up Owner to ${event.capturedBy}`);
      } catch (followUpError) {
        // Log error but don't fail the entire operation
        // eslint-disable-next-line no-console
        console.error('Error creating follow-up assignment:', followUpError);
      }
    }

    return {
      success: true,
      memberId,
      memberCreated,
      evangelismRecordLinked: true,
      followUpAssignmentId,
      followUpAssignmentCreated,
      followUpOwnerUpdated,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error processing evangelism event:', error);
    return {
      success: false,
      memberCreated: false,
      evangelismRecordLinked: false,
      followUpAssignmentCreated: false,
      followUpOwnerUpdated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Lambda handler for evangelism webhook
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  // eslint-disable-next-line no-console
  console.log('Received evangelism webhook:', JSON.stringify(event, null, 2));

  try {
    // Parse request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Missing request body' }),
      };
    }

    const payload: EvangelismWebhookPayload = JSON.parse(event.body) as EvangelismWebhookPayload;
    
    // Parse webhook into event
    const evangelismEvent = parseEvangelismWebhook(payload);
    
    // eslint-disable-next-line no-console
    console.log('Parsed evangelism event:', JSON.stringify(evangelismEvent, null, 2));

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

    // Process the evangelism event
    const result = await processEvangelismEvent(
      evangelismEvent,
      airtableClient,
      memberService,
      followUpService
    );

    if (!result.success) {
      // eslint-disable-next-line no-console
      console.error('Evangelism processing failed:', result.error);
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
        message: 'Evangelism webhook processed successfully',
        memberId: result.memberId,
        memberCreated: result.memberCreated,
        evangelismRecordLinked: result.evangelismRecordLinked,
        followUpAssignmentId: result.followUpAssignmentId,
        followUpAssignmentCreated: result.followUpAssignmentCreated,
        followUpOwnerUpdated: result.followUpOwnerUpdated,
      }),
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error processing evangelism webhook:', error);
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
