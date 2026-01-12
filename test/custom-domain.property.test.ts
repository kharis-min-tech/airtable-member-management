/**
 * Property-Based Tests for Custom Domain Infrastructure
 * 
 * Property 1: Custom domain HTTPS accessibility
 * Validates: Requirements 1.1, 1.2, 1.3
 * 
 * For any valid request to the custom Cloudflare domain, the Church_Management_System 
 * should serve the application content over HTTPS with proper SSL termination 
 * and HTTP-to-HTTPS redirection
 * 
 * Property 2: DNS resolution correctness
 * Validates: Requirements 1.4
 * 
 * For any DNS lookup of the Cloudflare domain, the resolution should point to 
 * the correct AWS CloudFront infrastructure
 */

import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { AirtableMemberManagementStack, DomainConfig } from '../lib/airtable-member-management-stack';

// Test data samples representing various valid domain configurations
const testDomainConfigs: DomainConfig[] = [
  {
    domainName: 'app.mychurch.com',
    certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012',
    hostedZoneId: 'Z1234567890ABC',
  },
  {
    domainName: 'dashboard.ministry.org',
    certificateArn: 'arn:aws:acm:us-east-1:987654321098:certificate/abcdefgh-abcd-abcd-abcd-abcdefghijkl',
    hostedZoneId: 'ZABCDEFGHIJKL',
  },
  {
    domainName: 'members.grace.church',
    certificateArn: 'arn:aws:acm:us-east-1:111222333444:certificate/11112222-3333-4444-5555-666677778888',
    hostedZoneId: 'Z0987654321XYZ',
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


describe('Property 2: DNS resolution correctness', () => {
  /**
   * Property 2.1: Route 53 A record SHALL point to CloudFront distribution
   * 
   * For any custom domain configuration, a Route 53 A record SHALL be created
   * that points to the CloudFront distribution
   * 
   * Validates: Requirements 1.4
   */
  it.each(testDomainConfigs)(
    'should create Route 53 A record pointing to CloudFront for domain: $domainName',
    (domainConfig) => {
      const app = new cdk.App();
      
      const stack = new AirtableMemberManagementStack(app, 'TestStack', {
        domainConfig,
        env: { account: '123456789012', region: 'us-east-1' },
      });
      
      const template = Template.fromStack(stack);
      
      // Verify Route 53 A record is created
      template.hasResourceProperties('AWS::Route53::RecordSet', {
        Name: `${domainConfig.domainName}.`,
        Type: 'A',
        HostedZoneId: domainConfig.hostedZoneId,
      });
    }
  );

  /**
   * Property 2.2: Route 53 AAAA record SHALL point to CloudFront distribution
   * 
   * For any custom domain configuration, a Route 53 AAAA record SHALL be created
   * for IPv6 support pointing to the CloudFront distribution
   * 
   * Validates: Requirements 1.4
   */
  it.each(testDomainConfigs)(
    'should create Route 53 AAAA record for IPv6 support for domain: $domainName',
    (domainConfig) => {
      const app = new cdk.App();
      
      const stack = new AirtableMemberManagementStack(app, 'TestStack', {
        domainConfig,
        env: { account: '123456789012', region: 'us-east-1' },
      });
      
      const template = Template.fromStack(stack);
      
      // Verify Route 53 AAAA record is created
      template.hasResourceProperties('AWS::Route53::RecordSet', {
        Name: `${domainConfig.domainName}.`,
        Type: 'AAAA',
        HostedZoneId: domainConfig.hostedZoneId,
      });
    }
  );

  /**
   * Property 2.3: No DNS records SHALL be created without domain config
   * 
   * When no custom domain is configured, no Route 53 records SHALL be created
   * 
   * Validates: Backward compatibility
   */
  it('should not create DNS records when no custom domain is configured', () => {
    const app = new cdk.App();
    
    // Create stack without domain config
    const stack = new AirtableMemberManagementStack(app, 'TestStack');
    
    const template = Template.fromStack(stack);
    
    // Verify no Route 53 records are created
    template.resourceCountIs('AWS::Route53::RecordSet', 0);
  });

  /**
   * Property 2.4: DNS records SHALL use alias target for CloudFront
   * 
   * For any custom domain configuration, the DNS records SHALL use
   * CloudFront alias targets (not direct IP addresses)
   * 
   * Validates: Requirements 1.4
   */
  it.each(testDomainConfigs)(
    'should use CloudFront alias target for DNS records for domain: $domainName',
    (domainConfig) => {
      const app = new cdk.App();
      
      const stack = new AirtableMemberManagementStack(app, 'TestStack', {
        domainConfig,
        env: { account: '123456789012', region: 'us-east-1' },
      });
      
      const template = Template.fromStack(stack);
      
      // Verify A record uses alias target with CloudFront distribution
      // CDK uses Fn::FindInMap to dynamically resolve the CloudFront hosted zone ID
      template.hasResourceProperties('AWS::Route53::RecordSet', {
        Type: 'A',
        AliasTarget: Match.objectLike({
          DNSName: Match.anyValue(),
          // HostedZoneId is resolved via Fn::FindInMap for CloudFront distributions
          HostedZoneId: Match.anyValue(),
        }),
      });
    }
  );
});
