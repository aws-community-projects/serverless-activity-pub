#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ServerlessActivityPub } from "../lib/serverless-activity-pub-stack";

const app = new cdk.App();
new ServerlessActivityPub(app, "ServerlessActivityPub", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  domain: 'serverlesscult.com'
});
