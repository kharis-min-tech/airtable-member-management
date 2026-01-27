#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AirtableMemberManagementStack, DomainConfig } from '../lib/airtable-member-management-stack';

const app = new cdk.App();

// Get environment configuration
const churchId = app.node.tryGetContext('churchId') || 'default';
const environment = app.node.tryGetContext('environment') || 'dev';

// Domain configuration for custom domain
const domainConfig: DomainConfig = {
  domainName: "airtable.khar.is",
  certificateArn: "arn:aws:acm:us-east-1:742213192328:certificate/cbfd4718-560a-47b7-9977-2fb094ec6f8f",
};


new AirtableMemberManagementStack(app, `airtable-member-management-${churchId}-${environment}`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'eu-west-2',
  },
  description: `Airtable Member Management Automation System for ${churchId}`,
  tags: {
    Project: 'AirtableMemberManagment',
    ChurchId: churchId,
    Environment: environment,
  },
  domainConfig, // Add the domain configuration
});
