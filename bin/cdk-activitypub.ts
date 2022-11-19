#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { CdkActivitypubStack } from "../lib/cdk-activitypub-stack";

const app = new cdk.App();
new CdkActivitypubStack(app, "CdkActivitypubStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
