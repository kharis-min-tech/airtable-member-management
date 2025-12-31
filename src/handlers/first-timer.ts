import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Handles first timer registration webhooks from Airtable
 * Creates or merges member records and marks attendance
 */
export const handler = async (_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // TODO: Implement first timer handler logic
    // 1. Parse webhook payload
    // 2. Search for existing member by phone/email
    // 3. If match with "Evangelism Contact": update status, merge fields, check reassignment
    // 4. If no match: create new member with Status "First Timer", Source "First Timer Form"
    // 5. Link first timer record to member
    // 6. Update First Service Attended if empty
    // 7. Create attendance record for the service

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'First timer webhook processed successfully',
      }),
    };
  } catch (error) {
    console.error('Error processing first timer webhook:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
