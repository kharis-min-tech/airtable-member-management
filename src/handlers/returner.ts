import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Handles returner registration webhooks from Airtable
 * Links to existing member records and marks attendance
 */
export const handler = async (_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // TODO: Implement returner handler logic
    // 1. Parse webhook payload
    // 2. Search for existing member by phone/email
    // 3. If match: update status to "Returner" if applicable, link record
    // 4. If no match: return error indicating First Timer form should be used
    // 5. Create attendance record for the service

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Returner webhook processed successfully',
      }),
    };
  } catch (error) {
    console.error('Error processing returner webhook:', error);
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
