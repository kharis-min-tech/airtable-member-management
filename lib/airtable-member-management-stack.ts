import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as route53Targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';
import * as path from 'path';

/**
 * Configuration for custom domain setup with Cloudflare
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4
 */
export interface DomainConfig {
  /** Custom domain name (e.g., 'app.mychurch.com') */
  domainName: string;
  /** ARN of the ACM certificate for SSL (must be in us-east-1 for CloudFront) */
  certificateArn: string;
  /** Route 53 hosted zone ID for DNS records */
  hostedZoneId: string;
}

export interface AirtableMemberManagementStackProps extends cdk.StackProps {
  /** Optional custom domain configuration */
  domainConfig?: DomainConfig;
}

export class AirtableMemberManagementStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;
  public readonly cacheTable: dynamodb.Table;
  public readonly configTable: dynamodb.Table;
  public readonly userMappingTable: dynamodb.Table;
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly websiteBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  public readonly domainConfig?: DomainConfig;

  constructor(scope: Construct, id: string, props?: AirtableMemberManagementStackProps) {
    super(scope, id, props);

    // Store domain config for use in frontend hosting
    this.domainConfig = props?.domainConfig;

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

    // Create Frontend Hosting (S3 + CloudFront)
    const frontendHosting = this.createFrontendHosting();
    this.websiteBucket = frontendHosting.bucket;
    this.distribution = frontendHosting.distribution;

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

    // Common bundling options for NodejsFunction
    const commonBundling: lambdaNodejs.BundlingOptions = {
      minify: true,
      sourceMap: true,
      target: 'node18',
      externalModules: ['@aws-sdk/*'], // AWS SDK v3 is included in Lambda runtime
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

    // Webhook Handlers using NodejsFunction for proper bundling
    const evangelismHandler = new lambdaNodejs.NodejsFunction(this, 'EvangelismHandler', {
      functionName: `${this.stackName}-EvangelismHandler`,
      entry: path.join(__dirname, '../src/handlers/evangelism.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: commonEnv,
      bundling: commonBundling,
      description: 'Handles evangelism record creation webhooks',
      role: lambdaRole,
    });

    const firstTimerHandler = new lambdaNodejs.NodejsFunction(this, 'FirstTimerHandler', {
      functionName: `${this.stackName}-FirstTimerHandler`,
      entry: path.join(__dirname, '../src/handlers/first-timer.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: commonEnv,
      bundling: commonBundling,
      description: 'Handles first timer registration webhooks',
      role: lambdaRole,
    });

    const returnerHandler = new lambdaNodejs.NodejsFunction(this, 'ReturnerHandler', {
      functionName: `${this.stackName}-ReturnerHandler`,
      entry: path.join(__dirname, '../src/handlers/returner.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: commonEnv,
      bundling: commonBundling,
      description: 'Handles returner registration webhooks',
      role: lambdaRole,
    });

    const programsHandler = new lambdaNodejs.NodejsFunction(this, 'ProgramsHandler', {
      functionName: `${this.stackName}-ProgramsHandler`,
      entry: path.join(__dirname, '../src/handlers/programs.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: commonEnv,
      bundling: commonBundling,
      description: 'Handles program completion webhooks',
      role: lambdaRole,
    });

    // Query Service Handler
    const queryHandler = new lambdaNodejs.NodejsFunction(this, 'QueryHandler', {
      functionName: `${this.stackName}-QueryHandler`,
      entry: path.join(__dirname, '../src/handlers/query.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(60),
      memorySize: 256,
      environment: commonEnv,
      bundling: commonBundling,
      description: 'Handles dashboard and query requests',
      role: lambdaRole,
    });

    // Health Check Handler
    const healthHandler = new lambdaNodejs.NodejsFunction(this, 'HealthHandler', {
      functionName: `${this.stackName}-HealthHandler`,
      entry: path.join(__dirname, '../src/handlers/health.ts'),
      handler: 'handler',
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: commonEnv,
      bundling: commonBundling,
      description: 'Health check endpoint',
      role: lambdaRole,
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

  private createFrontendHosting(): {
    bucket: s3.Bucket;
    distribution: cloudfront.Distribution;
  } {
    // S3 bucket for frontend assets
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `${this.stackName.toLowerCase()}-frontend-${this.account}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
    });

    // CloudFront Origin Access Identity
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OAI', {
      comment: `OAI for ${this.stackName} frontend`,
    });

    // Grant CloudFront access to S3 bucket
    websiteBucket.grantRead(originAccessIdentity);

    // Build CloudFront distribution configuration
    const distributionProps: cloudfront.DistributionProps = {
      comment: `${this.stackName} Frontend Distribution`,
      defaultBehavior: {
        origin: new origins.S3Origin(websiteBucket, {
          originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    };

    // Add custom domain configuration if provided
    // Validates: Requirements 1.1, 1.2, 1.3
    if (this.domainConfig) {
      const certificate = acm.Certificate.fromCertificateArn(
        this,
        'DomainCertificate',
        this.domainConfig.certificateArn
      );

      Object.assign(distributionProps, {
        domainNames: [this.domainConfig.domainName],
        certificate,
        minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
        sslSupportMethod: cloudfront.SSLMethod.SNI,
      });
    }

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'Distribution', distributionProps);

    // Create Route 53 DNS record if domain config is provided
    // Validates: Requirements 1.4
    if (this.domainConfig) {
      const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
        hostedZoneId: this.domainConfig.hostedZoneId,
        zoneName: this.domainConfig.domainName.split('.').slice(-2).join('.'),
      });

      new route53.ARecord(this, 'DomainARecord', {
        zone: hostedZone,
        recordName: this.domainConfig.domainName,
        target: route53.RecordTarget.fromAlias(
          new route53Targets.CloudFrontTarget(distribution)
        ),
        comment: `A record for ${this.domainConfig.domainName} pointing to CloudFront`,
      });

      new route53.AaaaRecord(this, 'DomainAAAARecord', {
        zone: hostedZone,
        recordName: this.domainConfig.domainName,
        target: route53.RecordTarget.fromAlias(
          new route53Targets.CloudFrontTarget(distribution)
        ),
        comment: `AAAA record for ${this.domainConfig.domainName} pointing to CloudFront`,
      });
    }

    // Deploy frontend assets to S3
    new s3deploy.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3deploy.Source.asset(path.join(__dirname, '../frontend/dist'))],
      destinationBucket: websiteBucket,
      distribution,
      distributionPaths: ['/*'],
    });

    return { bucket: websiteBucket, distribution };
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

    // Output custom domain URL if configured, otherwise CloudFront URL
    if (this.domainConfig) {
      new cdk.CfnOutput(this, 'FrontendUrl', {
        value: `https://${this.domainConfig.domainName}`,
        description: 'Frontend Custom Domain URL',
        exportName: `${this.stackName}-FrontendUrl`,
      });

      new cdk.CfnOutput(this, 'CloudFrontUrl', {
        value: `https://${this.distribution.distributionDomainName}`,
        description: 'Frontend CloudFront URL (fallback)',
        exportName: `${this.stackName}-CloudFrontUrl`,
      });

      new cdk.CfnOutput(this, 'CustomDomain', {
        value: this.domainConfig.domainName,
        description: 'Custom domain name',
        exportName: `${this.stackName}-CustomDomain`,
      });
    } else {
      new cdk.CfnOutput(this, 'FrontendUrl', {
        value: `https://${this.distribution.distributionDomainName}`,
        description: 'Frontend CloudFront URL',
        exportName: `${this.stackName}-FrontendUrl`,
      });
    }

    new cdk.CfnOutput(this, 'WebsiteBucketName', {
      value: this.websiteBucket.bucketName,
      description: 'S3 Bucket for frontend assets',
      exportName: `${this.stackName}-WebsiteBucketName`,
    });
  }
}
