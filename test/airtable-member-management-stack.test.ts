import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { AirtableMemberManagementStack, DomainConfig } from '../lib/airtable-member-management-stack';

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
      template.resourceCountIs('AWS::Lambda::Function', 8);
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

  describe('Frontend Hosting', () => {
    it('should create S3 bucket for frontend assets', () => {
      template.hasResourceProperties('AWS::S3::Bucket', {
        PublicAccessBlockConfiguration: {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        },
      });
    });

    it('should create CloudFront distribution', () => {
      template.resourceCountIs('AWS::CloudFront::Distribution', 1);
    });

    it('should configure CloudFront with HTTPS redirect', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          DefaultRootObject: 'index.html',
        },
      });
    });

    it('should create CloudFront Origin Access Control (not deprecated OAI)', () => {
      template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1);
      // Verify no deprecated Origin Access Identity is created
      template.resourceCountIs('AWS::CloudFront::CloudFrontOriginAccessIdentity', 0);
    });

    it('should configure SPA error handling for client-side routing', () => {
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          CustomErrorResponses: [
            {
              ErrorCode: 403,
              ResponseCode: 200,
              ResponsePagePath: '/index.html',
            },
            {
              ErrorCode: 404,
              ResponseCode: 200,
              ResponsePagePath: '/index.html',
            },
          ],
        },
      });
    });

    it('should not create Route 53 resources (managed by Cloudflare)', () => {
      // Verify no Route 53 resources are created with Cloudflare DNS
      template.resourceCountIs('AWS::Route53::RecordSet', 0);
      template.resourceCountIs('AWS::Route53::HostedZone', 0);
    });
  });

  describe('Custom Domain Configuration', () => {
    let domainApp: cdk.App;
    let domainStack: AirtableMemberManagementStack;
    let domainTemplate: Template;

    beforeAll(() => {
      const domainConfig: DomainConfig = {
        domainName: 'test.example.com',
        certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/test-cert-id',
      };

      domainApp = new cdk.App();
      domainStack = new AirtableMemberManagementStack(domainApp, 'TestDomainStack', {
        domainConfig,
        env: { account: '123456789012', region: 'us-east-1' },
      });
      domainTemplate = Template.fromStack(domainStack);
    });

    it('should configure CloudFront with custom domain', () => {
      domainTemplate.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          Aliases: ['test.example.com'],
          ViewerCertificate: {
            AcmCertificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/test-cert-id',
            SslSupportMethod: 'sni-only',
            MinimumProtocolVersion: 'TLSv1.2_2021',
          },
        },
      });
    });

    it('should output CloudFront domain for Cloudflare DNS setup', () => {
      domainTemplate.hasOutput('CloudFrontDomainForDNS', {
        Description: 'CloudFront domain name for Cloudflare DNS CNAME record',
      });
    });

    it('should output custom domain name', () => {
      domainTemplate.hasOutput('CustomDomain', {
        Value: 'test.example.com',
        Description: 'Custom domain name',
      });
    });

    it('should still not create Route 53 resources with custom domain', () => {
      // Even with custom domain, no Route 53 resources should be created
      domainTemplate.resourceCountIs('AWS::Route53::RecordSet', 0);
      domainTemplate.resourceCountIs('AWS::Route53::HostedZone', 0);
    });
  });
});
