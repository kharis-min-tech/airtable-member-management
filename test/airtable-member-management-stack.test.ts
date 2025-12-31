import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AirtableMemberManagementStack } from '../lib/airtable-member-management-stack';

describe('ChurchAutomationStack', () => {
  let app: cdk.App;
  let stack: AirtableMemberManagementStack;
  let template: Template;

  beforeAll(() => {
    app = new cdk.App();
    stack = new AirtableMemberManagementStack(app, 'TestStack');
    template = Template.fromStack(stack);
  });

  describe('DynamoDB Tables', () => {
    it('should create Cache table with TTL', () => {
      template.hasResourceProperties('AWS::DynamoDB::Table', {
        KeySchema: [
          { AttributeName: 'pk', KeyType: 'HASH' },
          { AttributeName: 'sk', KeyType: 'RANGE' },
        ],
        TimeToLiveSpecification: {
          AttributeName: 'ttl',
          Enabled: true,
        },
      });
    });

    it('should create three DynamoDB tables', () => {
      template.resourceCountIs('AWS::DynamoDB::Table', 3);
    });
  });

  describe('Cognito User Pool', () => {
    it('should create User Pool with email sign-in', () => {
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UsernameAttributes: ['email'],
        AutoVerifiedAttributes: ['email'],
      });
    });

    it('should create four user groups for roles', () => {
      template.resourceCountIs('AWS::Cognito::UserPoolGroup', 4);
    });

    it('should create User Pool Client', () => {
      template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
    });
  });

  describe('Lambda Functions', () => {
    it('should create Lambda functions for handlers', () => {
      // Should have at least 6 Lambda functions
      template.resourceCountIs('AWS::Lambda::Function', 6);
    });

    it('should configure Lambda with Node.js 18 runtime', () => {
      template.hasResourceProperties('AWS::Lambda::Function', {
        Runtime: 'nodejs18.x',
      });
    });
  });

  describe('API Gateway', () => {
    it('should create REST API', () => {
      template.resourceCountIs('AWS::ApiGateway::RestApi', 1);
    });

    it('should create API Gateway methods', () => {
      // Should have methods for webhooks and query endpoints
      template.resourcePropertiesCountIs(
        'AWS::ApiGateway::Method',
        { HttpMethod: 'POST' },
        4 // 4 webhook endpoints
      );
    });
  });
});
