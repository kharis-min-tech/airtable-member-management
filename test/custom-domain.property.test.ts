/**
 * Property-Based Tests for Custom Domain Infrastructure with Cloudflare DNS
 * 
 * Property 1: Custom domain HTTPS accessibility
 * Validates: Requirements 1.1, 1.2, 1.3
 * 
 * For any valid request to the custom domain, the Church_Management_System 
 * should serve the application content over HTTPS with proper SSL termination 
 * and HTTP-to-HTTPS redirection via CloudFront
 * 
 * Property 2: CloudFront configuration correctness
 * Validates: Requirements 1.4
 * 
 * For any custom domain configuration, CloudFront should be properly configured
 * to serve the domain with appropriate outputs for Cloudflare DNS setup
 */

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { AirtableMemberManagementStack, DomainConfig } from '../lib/airtable-member-management-stack';

// Test data samples representing various valid domain configurations
const testDomainConfigs: DomainConfig[] = [
  {
    domainName: 'app.mychurch.com',
    certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012',
  },
  {
    domainName: 'dashboard.ministry.org',
    certificateArn: 'arn:aws:acm:us-east-1:987654321098:certificate/abcdefgh-abcd-abcd-abcd-abcdefghijkl',
  },
  {
    domainName: 'members.grace.church',
    certificateArn: 'arn:aws:acm:us-east-1:111222333444:certificate/11112222-3333-4444-5555-666677778888',
  },
];

describe('Property 1: Custom domain HTTPS accessibility', () => {
  /**
   * Property 1.1: CloudFront distribution SHALL redirect HTTP to HTTPS
   * 
   * For any CloudFront distribution with a custom domain, the viewer protocol policy
   * SHALL be configured to redirect HTTP traffic to HTTPS
   * 
   * Validates: Requirements 1.2
   */
  it.each(testDomainConfigs)(
    'should configure CloudFront to redirect HTTP to HTTPS for domain: $domainName',
    (domainConfig) => {
      const app = new cdk.App();
      
      const stack = new AirtableMemberManagementStack(app, 'TestStack', {
        domainConfig,
        env: { account: '123456789012', region: 'us-east-1' },
      });
      
      const template = Template.fromStack(stack);
      
      // Verify CloudFront distribution has HTTPS redirect policy
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          DefaultCacheBehavior: {
            ViewerProtocolPolicy: 'redirect-to-https',
          },
        },
      });
    }
  );

  /**
   * Property 1.2: CloudFront distribution SHALL include custom domain aliases
   * 
   * For any valid custom domain configuration, the CloudFront distribution
   * SHALL include the domain as an alias
   * 
   * Validates: Requirements 1.1
   */
  it.each(testDomainConfigs)(
    'should include custom domain as CloudFront alias for domain: $domainName',
    (domainConfig) => {
      const app = new cdk.App();
      
      const stack = new AirtableMemberManagementStack(app, 'TestStack', {
        domainConfig,
        env: { account: '123456789012', region: 'us-east-1' },
      });
      
      const template = Template.fromStack(stack);
      
      // Verify CloudFront distribution includes the custom domain alias
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          Aliases: Match.arrayWith([domainConfig.domainName]),
        },
      });
    }
  );

  /**
   * Property 1.3: CloudFront distribution SHALL use ACM certificate for SSL
   * 
   * For any custom domain configuration with a certificate ARN, the CloudFront
   * distribution SHALL reference that certificate for SSL termination
   * 
   * Validates: Requirements 1.3
   */
  it.each(testDomainConfigs)(
    'should use ACM certificate for SSL termination for domain: $domainName',
    (domainConfig) => {
      const app = new cdk.App();
      
      const stack = new AirtableMemberManagementStack(app, 'TestStack', {
        domainConfig,
        env: { account: '123456789012', region: 'us-east-1' },
      });
      
      const template = Template.fromStack(stack);
      
      // Verify CloudFront distribution uses the ACM certificate
      template.hasResourceProperties('AWS::CloudFront::Distribution', {
        DistributionConfig: {
          ViewerCertificate: {
            AcmCertificateArn: domainConfig.certificateArn,
            SslSupportMethod: 'sni-only',
            MinimumProtocolVersion: 'TLSv1.2_2021',
          },
        },
      });
    }
  );

  /**
   * Property 1.4: Stack without domain config SHALL use default CloudFront domain
   * 
   * When no custom domain is configured, the CloudFront distribution SHALL
   * use the default CloudFront domain without aliases
   * 
   * Validates: Backward compatibility
   */
  it('should use default CloudFront domain when no custom domain is configured', () => {
    const app = new cdk.App();
    
    // Create stack without domain config
    const stack = new AirtableMemberManagementStack(app, 'TestStack');
    
    const template = Template.fromStack(stack);
    
    // Verify CloudFront distribution exists without custom aliases
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        DefaultCacheBehavior: {
          ViewerProtocolPolicy: 'redirect-to-https',
        },
      },
    });
    
    // Verify no ViewerCertificate with ACM (uses default CloudFront cert)
    const distributions = template.findResources('AWS::CloudFront::Distribution');
    const distributionKeys = Object.keys(distributions);
    expect(distributionKeys.length).toBe(1);
    
    const firstKey = distributionKeys[0];
    expect(firstKey).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const distConfig = distributions[firstKey!]!.Properties.DistributionConfig;
    // Default config should not have Aliases or custom ViewerCertificate
    expect(distConfig.Aliases).toBeUndefined();
  });
});


describe('Property 2: CloudFront configuration and outputs', () => {
  /**
   * Property 2.1: CloudFront domain output SHALL be available for Cloudflare DNS
   * 
   * For any custom domain configuration, the stack SHALL output the CloudFront
   * distribution domain name for use in Cloudflare DNS CNAME records
   * 
   * Validates: Requirements 1.4
   */
  it.each(testDomainConfigs)(
    'should output CloudFront domain for Cloudflare DNS setup for domain: $domainName',
    (domainConfig) => {
      const app = new cdk.App();
      
      const stack = new AirtableMemberManagementStack(app, 'TestStack', {
        domainConfig,
        env: { account: '123456789012', region: 'us-east-1' },
      });
      
      const template = Template.fromStack(stack);
      
      // Verify CloudFront domain output is created for Cloudflare DNS
      template.hasOutput('CloudFrontDomainForDNS', {
        Description: 'CloudFront domain name for Cloudflare DNS CNAME record',
      });
    }
  );

  /**
   * Property 2.2: Custom domain output SHALL match configured domain
   * 
   * For any custom domain configuration, the stack SHALL output the
   * configured custom domain name
   * 
   * Validates: Requirements 1.1
   */
  it.each(testDomainConfigs)(
    'should output custom domain name for domain: $domainName',
    (domainConfig) => {
      const app = new cdk.App();
      
      const stack = new AirtableMemberManagementStack(app, 'TestStack', {
        domainConfig,
        env: { account: '123456789012', region: 'us-east-1' },
      });
      
      const template = Template.fromStack(stack);
      
      // Verify custom domain output matches configuration
      template.hasOutput('CustomDomain', {
        Value: domainConfig.domainName,
        Description: 'Custom domain name',
      });
    }
  );

  /**
   * Property 2.3: No Route 53 resources SHALL be created
   * 
   * With Cloudflare DNS migration, no Route 53 records SHALL be created
   * in the CloudFormation stack
   * 
   * Validates: Cloudflare DNS migration
   */
  it.each(testDomainConfigs)(
    'should not create Route 53 records with Cloudflare DNS for domain: $domainName',
    (domainConfig) => {
      const app = new cdk.App();
      
      const stack = new AirtableMemberManagementStack(app, 'TestStack', {
        domainConfig,
        env: { account: '123456789012', region: 'us-east-1' },
      });
      
      const template = Template.fromStack(stack);
      
      // Verify no Route 53 records are created (managed by Cloudflare)
      template.resourceCountIs('AWS::Route53::RecordSet', 0);
      template.resourceCountIs('AWS::Route53::HostedZone', 0);
    }
  );

  /**
   * Property 2.4: CloudFront distribution SHALL use Origin Access Control
   * 
   * For any domain configuration, CloudFront SHALL use modern Origin Access Control
   * instead of deprecated Origin Access Identity
   * 
   * Validates: Security best practices
   */
  it.each(testDomainConfigs)(
    'should use Origin Access Control for S3 access for domain: $domainName',
    (domainConfig) => {
      const app = new cdk.App();
      
      const stack = new AirtableMemberManagementStack(app, 'TestStack', {
        domainConfig,
        env: { account: '123456789012', region: 'us-east-1' },
      });
      
      const template = Template.fromStack(stack);
      
      // Verify Origin Access Control is created (not deprecated OAI)
      template.hasResourceProperties('AWS::CloudFront::OriginAccessControl', {
        OriginAccessControlConfig: {
          Description: Match.stringLikeRegexp('.*frontend.*'),
          OriginAccessControlOriginType: 's3',
          SigningBehavior: 'always',
          SigningProtocol: 'sigv4',
        },
      });
      
      // Verify no deprecated Origin Access Identity is created
      template.resourceCountIs('AWS::CloudFront::CloudFrontOriginAccessIdentity', 0);
    }
  );

  /**
   * Property 2.5: Stack without domain config SHALL not output domain-specific values
   * 
   * When no custom domain is configured, domain-specific outputs SHALL not be created
   * 
   * Validates: Backward compatibility
   */
  it('should not create domain-specific outputs when no custom domain is configured', () => {
    const app = new cdk.App();
    
    // Create stack without domain config
    const stack = new AirtableMemberManagementStack(app, 'TestStack');
    
    const template = Template.fromStack(stack);
    
    // Verify domain-specific outputs are not created
    const outputs = template.toJSON().Outputs || {};
    expect(outputs.CustomDomain).toBeUndefined();
    expect(outputs.CloudFrontDomainForDNS).toBeUndefined();
    
    // But CloudFront URL should still be available
    expect(outputs.FrontendUrl).toBeDefined();
  });
});
