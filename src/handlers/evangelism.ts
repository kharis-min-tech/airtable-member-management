import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

/**
 * Handles evangelism record creation webhooks from Airtable
 * Creates member records with Status "Evangelism Contact" and assigns follow-up
 */
export const handler = async (_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // TODO: Implement evangelism handler logic
    // 1. Parse webhook payload from Airtable
    // 2. Check for existing member by phone/email
    // 3. Create member record with Status "Evangelism Contact", Source "Evangelism"
    // 4. Copy all fields (First Name, Last Name, Phone, Email, GhanaPost Code)
    // 5. Set Date First Captured from evangelism Date
    // 6. Link evangelism record to member
    // 7. Create follow-up assignment to Captured By volunteer

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Evangelism webhook processed successfully',
      }),
    };
  } catch (error) {
    console.error('Error processing evangelism webhook:', error);
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
