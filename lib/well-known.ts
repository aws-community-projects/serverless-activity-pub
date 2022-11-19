import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { join } from "path";

export interface WellKnownProps {
  api: RestApi;
  domain: string;
  username: string;
}

export class WellKnown extends Construct {
  constructor(scope: Construct, id: string, props: WellKnownProps) {
    super(scope, id);
    const { api, domain, username } = props;
    const wellknown = api.root.addResource('.well-known');


    const webfingerFn = new NodejsFunction(this, `WebfingerFn`, {
      entry: join(__dirname, './lambda/webfinger.ts'),
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
      environment: {
        DOMAIN: domain,
        USERNAME: username
      }
    });

    const webfinger = wellknown.addResource('webfinger');
    webfinger.addMethod('GET', new LambdaIntegration(webfingerFn));
  }
}
