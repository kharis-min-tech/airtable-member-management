#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AirtableMemberManagementStack } from '../lib/airtable-member-management-stack';

const app = new cdk.App();

// Get environment configuration
const churchId = app.node.tryGetContext('churchId') || 'default';
const environment = app.node.tryGetContext('environment') || 'dev';

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
});
