import {
  AuthorizationType,
  CognitoUserPoolsAuthorizer,
  LambdaIntegration,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { join } from "path";

export interface InternalProps {
  api: RestApi;
  authorizer: CognitoUserPoolsAuthorizer;
  domain: string;
}

export class Internal extends Construct {
  constructor(scope: Construct, id: string, props: InternalProps) {
    super(scope, id);
    const { api, authorizer, domain } = props;
    const internal = api.root.addResource("internal");
    const internalFn = new NodejsFunction(this, `InternalFn`, {
      functionName: `InternalFn`,
      entry: join(__dirname, './lambda/internal.ts'),
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
      environment: {
        DOMAIN: domain,
      }
    });

    internal.addMethod('GET', new LambdaIntegration(internalFn), {
      authorizationType: AuthorizationType.COGNITO,
      authorizer,
    });
  }
}
