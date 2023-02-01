import { Duration } from "aws-cdk-lib";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { EventPattern, IEventBus, Rule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export interface LambdaTableReadWriteRuleProps {
  bus: IEventBus;
  domain: string;
  entry: string;
  eventPattern: EventPattern;
  put?: boolean;
  table: Table;
}

export class LambdaTableReadWriteRule extends Construct {
  constructor(scope: Construct, id: string, props: LambdaTableReadWriteRuleProps) {
    super(scope, id);
    const { bus, domain, entry, eventPattern, put, table } = props;
    const fn = new NodejsFunction(this, `Fn`, {
      entry,
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
      timeout: Duration.minutes(5),
      environment: {
        DOMAIN: domain,
        TABLE_NAME: table.tableName,
      },
    });
    table.grantReadWriteData(fn);

    new Rule(this, `Rule`, {
      eventBus: bus,
      eventPattern,
      targets: [new LambdaFunction(fn)],
    });
    if (put) {
      bus.grantPutEventsTo(fn);
    }
  }
}
