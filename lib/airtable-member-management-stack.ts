import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface AirtableMemberManagementStackProps extends cdk.StackProps {
  // Additional props can be added here
}

export class AirtableMemberManagementStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly cacheTable: dynamodb.Table;
  public readonly configTable: dynamodb.Table;
  public readonly userMappingTable: dynamodb.Table;
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props?: AirtableMemberManagementStackProps) {
    super(scope, id, props);

    // Create DynamoDB tables
    const tables = this.createDynamoDBTables();
    this.cacheTable = tables.cacheTable;
    this.configTable = tables.configTable;
    this.userMappingTable = tables.userMappingTable;

    // Create Cognito User Pool
    const cognitoResources = this.createCognitoResources();
    this.userPool = cognitoResources.userPool;
    this.userPoolClient = cognitoResources.userPoolClient;

    // Create Lambda functions
    const lambdaFunctions = this.createLambdaFunctions();

    // Create API Gateway
    this.api = this.createApiGateway(lambdaFunctions, cognitoResources.authorizer);

    // Output important values
    this.createOutputs();
  }

  private createDynamoDBTables(): {
    cacheTable: dynamodb.Table;
    configTable: dynamodb.Table;
    userMappingTable: dynamodb.Table;
  } {
    // Cache Table with TTL
    const cacheTable = new dynamodb.Table(this, 'CacheTable', {
      tableName: `${this.stackName}-Cache`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      timeToLiveAttribute: 'ttl',
    });

    // Church Config Table
    const configTable = new dynamodb.Table(this, 'ChurchConfigTable', {
      tableName: `${this.stackName}-ChurchConfig`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // User Mapping Table
    const userMappingTable = new dynamodb.Table(this, 'UserMappingTable', {
      tableName: `${this.stackName}-UserMapping`,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    return { cacheTable, configTable, userMappingTable };
  }

  private createCognitoResources(): {
    userPool: cognito.UserPool;
    userPoolClient: cognito.UserPoolClient;
    authorizer: apigateway.CognitoUserPoolsAuthorizer;
  } {
    // User Pool
    const userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${this.stackName}-UserPool`,
      selfSignUpEnabled: false,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        fullname: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // User Groups for roles
    const roles = ['pastor', 'admin', 'follow_up', 'department_lead'];
    roles.forEach((role) => {
      new cognito.CfnUserPoolGroup(this, `${role}Group`, {
        userPoolId: userPool.userPoolId,
        groupName: role,
        description: `${role.replace('_', ' ')} role group`,
      });
    });

    // User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool,
      userPoolClientName: `${this.stackName}-WebClient`,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
      },
      preventUserExistenceErrors: true,
    });

    // API Gateway Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'ApiAuthorizer', {
      cognitoUserPools: [userPool],
      authorizerName: `${this.stackName}-Authorizer`,
    });

    return { userPool, userPoolClient, authorizer };
  }

  private createLambdaFunctions(): {
    evangelismHandler: lambda.Function;
    firstTimerHandler: lambda.Function;
    returnerHandler: lambda.Function;
    programsHandler: lambda.Function;
    queryHandler: lambda.Function;
    healthHandler: lambda.Function;
  } {
    // Common Lambda environment variables
    const commonEnv = {
      CACHE_TABLE_NAME: this.cacheTable.tableName,
      CONFIG_TABLE_NAME: this.configTable.tableName,
      USER_MAPPING_TABLE_NAME: this.userMappingTable.tableName,
      AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID || '',
      AIRTABLE_API_KEY: process.env.AIRTABLE_API_KEY || '',
      NODE_OPTIONS: '--enable-source-maps',
    };

    // Common Lambda props
    const commonProps = {
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: commonEnv,
    };

    // Lambda execution role with DynamoDB access
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant DynamoDB access
    this.cacheTable.grantReadWriteData(lambdaRole);
    this.configTable.grantReadData(lambdaRole);
    this.userMappingTable.grantReadData(lambdaRole);

    // Webhook Handlers
    const evangelismHandler = new lambda.Function(this, 'EvangelismHandler', {
      ...commonProps,
      functionName: `${this.stackName}-EvangelismHandler`,
      handler: 'handlers/evangelism.handler',
      code: lambda.Code.fromAsset('dist/src'),
      description: 'Handles evangelism record creation webhooks',
      role: lambdaRole,
    });

    const firstTimerHandler = new lambda.Function(this, 'FirstTimerHandler', {
      ...commonProps,
      functionName: `${this.stackName}-FirstTimerHandler`,
      handler: 'handlers/first-timer.handler',
      code: lambda.Code.fromAsset('dist/src'),
      description: 'Handles first timer registration webhooks',
      role: lambdaRole,
    });

    const returnerHandler = new lambda.Function(this, 'ReturnerHandler', {
      ...commonProps,
      functionName: `${this.stackName}-ReturnerHandler`,
      handler: 'handlers/returner.handler',
      code: lambda.Code.fromAsset('dist/src'),
      description: 'Handles returner registration webhooks',
      role: lambdaRole,
    });

    const programsHandler = new lambda.Function(this, 'ProgramsHandler', {
      ...commonProps,
      functionName: `${this.stackName}-ProgramsHandler`,
      handler: 'handlers/programs.handler',
      code: lambda.Code.fromAsset('dist/src'),
      description: 'Handles program completion webhooks',
      role: lambdaRole,
    });

    // Query Service Handler
    const queryHandler = new lambda.Function(this, 'QueryHandler', {
      ...commonProps,
      functionName: `${this.stackName}-QueryHandler`,
      handler: 'handlers/query.handler',
      code: lambda.Code.fromAsset('dist/src'),
      description: 'Handles dashboard and query requests',
      role: lambdaRole,
      timeout: cdk.Duration.seconds(60),
    });

    // Health Check Handler
    const healthHandler = new lambda.Function(this, 'HealthHandler', {
      ...commonProps,
      functionName: `${this.stackName}-HealthHandler`,
      handler: 'handlers/health.handler',
      code: lambda.Code.fromAsset('dist/src'),
      description: 'Health check endpoint',
      role: lambdaRole,
      timeout: cdk.Duration.seconds(10),
    });

    return {
      evangelismHandler,
      firstTimerHandler,
      returnerHandler,
      programsHandler,
      queryHandler,
      healthHandler,
    };
  }

  private createApiGateway(
    lambdaFunctions: {
      evangelismHandler: lambda.Function;
      firstTimerHandler: lambda.Function;
      returnerHandler: lambda.Function;
      programsHandler: lambda.Function;
      queryHandler: lambda.Function;
      healthHandler: lambda.Function;
    },
    authorizer: apigateway.CognitoUserPoolsAuthorizer
  ): apigateway.RestApi {
    const api = new apigateway.RestApi(this, 'ChurchAutomationApi', {
      restApiName: `${this.stackName}-API`,
      description: 'Church Member Management Automation API',
      deployOptions: {
        stageName: 'v1',
        throttlingBurstLimit: 100,
        throttlingRateLimit: 50,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-Api-Key'],
      },
    });

    // Webhook endpoints (no auth - validated by webhook secret)
    const webhooks = api.root.addResource('webhooks');
    
    webhooks.addResource('evangelism').addMethod(
      'POST',
      new apigateway.LambdaIntegration(lambdaFunctions.evangelismHandler)
    );

    webhooks.addResource('first-timer').addMethod(
      'POST',
      new apigateway.LambdaIntegration(lambdaFunctions.firstTimerHandler)
    );

    webhooks.addResource('returner').addMethod(
      'POST',
      new apigateway.LambdaIntegration(lambdaFunctions.returnerHandler)
    );

    webhooks.addResource('programs').addMethod(
      'POST',
      new apigateway.LambdaIntegration(lambdaFunctions.programsHandler)
    );

    // Query endpoints (authenticated)
    const queryResource = api.root.addResource('query');
    const authOptions: apigateway.MethodOptions = {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    };

    // Dashboard KPIs
    queryResource.addResource('dashboard').addMethod(
      'GET',
      new apigateway.LambdaIntegration(lambdaFunctions.queryHandler),
      authOptions
    );

    // Attendance
    queryResource.addResource('attendance').addMethod(
      'GET',
      new apigateway.LambdaIntegration(lambdaFunctions.queryHandler),
      authOptions
    );

    // Members
    queryResource.addResource('members').addMethod(
      'GET',
      new apigateway.LambdaIntegration(lambdaFunctions.queryHandler),
      authOptions
    );

    // Member Journey
    queryResource.addResource('journey').addMethod(
      'GET',
      new apigateway.LambdaIntegration(lambdaFunctions.queryHandler),
      authOptions
    );

    // Follow-up
    queryResource.addResource('follow-up').addMethod(
      'GET',
      new apigateway.LambdaIntegration(lambdaFunctions.queryHandler),
      authOptions
    );

    // Admin views
    queryResource.addResource('admin').addMethod(
      'GET',
      new apigateway.LambdaIntegration(lambdaFunctions.queryHandler),
      authOptions
    );

    // Health check (no auth)
    api.root.addResource('health').addMethod(
      'GET',
      new apigateway.LambdaIntegration(lambdaFunctions.healthHandler)
    );

    return api;
  }

  private createOutputs(): void {
    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: this.api.url,
      description: 'API Gateway endpoint URL',
      exportName: `${this.stackName}-ApiEndpoint`,
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: `${this.stackName}-UserPoolId`,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: `${this.stackName}-UserPoolClientId`,
    });

    new cdk.CfnOutput(this, 'CacheTableName', {
      value: this.cacheTable.tableName,
      description: 'DynamoDB Cache Table Name',
      exportName: `${this.stackName}-CacheTableName`,
    });

    new cdk.CfnOutput(this, 'ConfigTableName', {
      value: this.configTable.tableName,
      description: 'DynamoDB Config Table Name',
      exportName: `${this.stackName}-ConfigTableName`,
    });

    new cdk.CfnOutput(this, 'UserMappingTableName', {
      value: this.userMappingTable.tableName,
      description: 'DynamoDB User Mapping Table Name',
      exportName: `${this.stackName}-UserMappingTableName`,
    });
  }
}
