import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { ChurchConfig, UserRole } from '../types';

/**
 * Configuration Service for multi-tenant church configuration
 * Stores church-specific settings in DynamoDB
 */
export class ConfigService {
  private readonly client: DynamoDBDocumentClient;
  private readonly configTableName: string;
  private readonly userMappingTableName: string;

  constructor(configTableName?: string, userMappingTableName?: string) {
    const dynamoClient = new DynamoDBClient({});
    this.client = DynamoDBDocumentClient.from(dynamoClient);
    this.configTableName = configTableName || process.env.CONFIG_TABLE_NAME || 'ChurchConfig';
    this.userMappingTableName = userMappingTableName || process.env.USER_MAPPING_TABLE_NAME || 'UserMapping';
  }

  /**
   * Get church configuration by church ID
   */
  async getChurchConfig(churchId: string): Promise<ChurchConfig | null> {
    try {
      const result = await this.client.send(
        new GetCommand({
          TableName: this.configTableName,
          Key: {
            pk: `CHURCH#${churchId}`,
            sk: 'CONFIG',
          },
        })
      );

      if (!result.Item) {
        return null;
      }

      return {
        churchId: result.Item.churchId as string,
        churchName: result.Item.churchName as string,
        airtableBaseId: result.Item.airtableBaseId as string,
        airtableApiKey: result.Item.airtableApiKey as string,
        defaultFollowUpDueDays: (result.Item.defaultFollowUpDueDays as number) || 3,
        volunteerCapacityLimit: (result.Item.volunteerCapacityLimit as number) || 20,
        adminEmails: (result.Item.adminEmails as string[]) || [],
      };
    } catch (error) {
      console.error('Config get error:', error);
      return null;
    }
  }

  /**
   * Save or update church configuration
   */
  async saveChurchConfig(config: ChurchConfig): Promise<void> {
    try {
      await this.client.send(
        new PutCommand({
          TableName: this.configTableName,
          Item: {
            pk: `CHURCH#${config.churchId}`,
            sk: 'CONFIG',
            ...config,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        })
      );
    } catch (error) {
      console.error('Config save error:', error);
      throw error;
    }
  }

  /**
   * Update specific configuration fields
   */
  async updateChurchConfig(
    churchId: string,
    updates: Partial<Omit<ChurchConfig, 'churchId'>>
  ): Promise<void> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    });

    if (updateExpressions.length === 0) {
      return;
    }

    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    try {
      await this.client.send(
        new UpdateCommand({
          TableName: this.configTableName,
          Key: {
            pk: `CHURCH#${churchId}`,
            sk: 'CONFIG',
          },
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
        })
      );
    } catch (error) {
      console.error('Config update error:', error);
      throw error;
    }
  }

  /**
   * Get user mapping (Cognito user to Airtable volunteer)
   */
  async getUserMapping(
    cognitoUserId: string,
    churchId: string
  ): Promise<{
    volunteerId: string;
    role: UserRole;
    departmentIds: string[];
  } | null> {
    try {
      const result = await this.client.send(
        new GetCommand({
          TableName: this.userMappingTableName,
          Key: {
            pk: `USER#${cognitoUserId}`,
            sk: `CHURCH#${churchId}`,
          },
        })
      );

      if (!result.Item) {
        return null;
      }

      return {
        volunteerId: result.Item.volunteerId as string,
        role: result.Item.role as UserRole,
        departmentIds: (result.Item.departmentIds as string[]) || [],
      };
    } catch (error) {
      console.error('User mapping get error:', error);
      return null;
    }
  }

  /**
   * Save user mapping
   */
  async saveUserMapping(
    cognitoUserId: string,
    churchId: string,
    mapping: {
      volunteerId: string;
      role: UserRole;
      departmentIds?: string[];
    }
  ): Promise<void> {
    try {
      await this.client.send(
        new PutCommand({
          TableName: this.userMappingTableName,
          Item: {
            pk: `USER#${cognitoUserId}`,
            sk: `CHURCH#${churchId}`,
            volunteerId: mapping.volunteerId,
            role: mapping.role,
            departmentIds: mapping.departmentIds || [],
            createdAt: new Date().toISOString(),
          },
        })
      );
    } catch (error) {
      console.error('User mapping save error:', error);
      throw error;
    }
  }

  /**
   * Get Airtable configuration from environment variables
   * Used by Lambda handlers to initialize AirtableClient
   */
  async getAirtableConfig(): Promise<{ baseId: string; apiKey: string }> {
    const baseId = process.env.AIRTABLE_BASE_ID;
    const apiKey = process.env.AIRTABLE_API_KEY;

    if (!baseId || !apiKey) {
      throw new Error(
        'Missing Airtable configuration. Ensure AIRTABLE_BASE_ID and AIRTABLE_API_KEY environment variables are set.'
      );
    }

    return { baseId, apiKey };
  }
}
