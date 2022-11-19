import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { join } from "path";

export interface InboxProps {
  api: RestApi;
  bucket: Bucket;
  domain: string;
  username: string;
}

export class Inbox extends Construct {
  constructor(scope: Construct, id: string, props: InboxProps) {
    super(scope, id);
    const { api, bucket, domain, username } = props;
    const inbox = api.root.addResource('inbox');

    const inboxPostFn = new NodejsFunction(this, `InboxPostFn`, {
      entry: join(__dirname, './lambda/inbox-post.ts'),
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
      environment: {
        DOMAIN: domain,
        USERNAME: username,
        BUCKET: bucket.bucketName,
      }
    });

    inbox.addMethod('POST', new LambdaIntegration(inboxPostFn));
  }
}
