import { AuthorizationType, Authorizer, LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { OAuthScope } from "aws-cdk-lib/aws-cognito";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { IEventBus } from "aws-cdk-lib/aws-events";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { join } from "path";

export interface OutboxProps {
  api: RestApi;
  bus: IEventBus;
  domain: string;
  table: Table;
  authorizer: Authorizer;
}

export class Outbox extends Construct {
  constructor(scope: Construct, id: string, props: OutboxProps) {
    super(scope, id);
    const { api, bus, domain, table } = props;
    const outboxResource = api.root.addResource("outbox");
    const outboxFn = new NodejsFunction(this, `OutboxFn`, {
      functionName: `OutboxFn`,
      entry: join(__dirname, "./lambda/api/outbox/outbox.ts"),
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
      environment: {
        DOMAIN: domain,
        TABLE_NAME: table.tableName,
      },
    });
    table.grantReadWriteData(outboxFn);

    outboxResource.addMethod("POST", new LambdaIntegration(outboxFn), {
      methodResponses: [{ statusCode: "200" }],
      authorizer: props.authorizer,
      authorizationType: AuthorizationType.COGNITO,
      authorizationScopes: [OAuthScope.COGNITO_ADMIN.scopeName],
    });
  }
}
