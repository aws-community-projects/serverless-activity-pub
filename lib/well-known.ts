import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { join } from "path";

export interface WellKnownProps {
  api: RestApi;
  domain: string;
  table: Table;
}

export class WellKnown extends Construct {
  constructor(scope: Construct, id: string, props: WellKnownProps) {
    super(scope, id);
    const { api, domain, table } = props;
    const wellknown = api.root.addResource('.well-known');


    const webfingerFn = new NodejsFunction(this, `WebfingerFn`, {
      functionName: `WebfingerFn`,
      entry: join(__dirname, './lambda/webfinger.ts'),
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
      environment: {
        DOMAIN: domain,
      }
    });
    table.grantReadData(webfingerFn);
    webfingerFn.addEnvironment('TABLE_NAME', table.tableName)

    const webfinger = wellknown.addResource('webfinger');
    webfinger.addMethod('GET', new LambdaIntegration(webfingerFn));
  }
}
