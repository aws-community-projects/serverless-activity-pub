import { Duration } from "aws-cdk-lib";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { IEventBus, Rule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { table } from "console";
import { Construct } from "constructs";
import { join } from "path";

export interface EventDrivenProps {
  bus: IEventBus;
  domain: string;
  table: Table;
}

export class EventDriven extends Construct {
  constructor(scope: Construct, id: string, props: EventDrivenProps) {
    super(scope, id);
    const { bus, domain, table } = props;

    const addExternalFollowerFn = new NodejsFunction(this, `AddExternalFollowerFn`, {
      functionName: `AddExternalFollowerFn`,
      entry: join(__dirname, './lambda/event-driven/add-external-follower.ts'),
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
      timeout: Duration.minutes(5),
      environment: {
        DOMAIN: domain,
        TABLE_NAME: table.tableName,
      }
    });
    bus.grantPutEventsTo(addExternalFollowerFn);
    table.grantReadWriteData(addExternalFollowerFn);

    new Rule(this, `AddExternalFollowerRule`, {
      eventBus: bus,
      eventPattern: {
        source: [`activity-pub.inbox-post`],
        detailType: [`follow`]
      },
      targets: [new LambdaFunction(addExternalFollowerFn)],
    });

    const acceptFn = new NodejsFunction(this, `AcceptFn`, {
      functionName: `AcceptFn`,
      entry: join(__dirname, './lambda/event-driven/accept.ts'),
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
      timeout: Duration.minutes(5),
      environment: {
        DOMAIN: domain,
        TABLE_NAME: table.tableName,
      }
    });
    bus.grantPutEventsTo(acceptFn);
    table.grantReadWriteData(acceptFn);

    new Rule(this, `AcceptRule`, {
      eventBus: bus,
      eventPattern: {
        source: [`activity-pub.inbox-post`],
        detailType: [`accept`]
      },
      targets: [new LambdaFunction(acceptFn)],
    });

    const categorizeFn = new NodejsFunction(this, `CategorizeFn`, {
      functionName: `CategorizeFn`,
      entry: join(__dirname, './lambda/event-driven/categorize.ts'),
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
      timeout: Duration.minutes(5),
      environment: {
        DOMAIN: domain,
        TABLE_NAME: table.tableName,
      }
    });
    bus.grantPutEventsTo(categorizeFn);
    table.grantReadWriteData(categorizeFn);

    new Rule(this, `CategorizeRule`, {
      eventBus: bus,
      eventPattern: {
        source: [`activity-pub.inbox-post`],
      },
      targets: [new LambdaFunction(categorizeFn)],
    });

    const removeExternalFollower = new NodejsFunction(this, `RemoveExternalFollowerFn`, {
      functionName: `RemoveExternalFollowerFn`,
      entry: join(__dirname, './lambda/event-driven/remove-external-follower.ts'),
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
      timeout: Duration.minutes(5),
      environment: {
        DOMAIN: domain,
        TABLE_NAME: table.tableName,
      }
    });
    bus.grantPutEventsTo(removeExternalFollower);
    table.grantReadWriteData(removeExternalFollower);
    
    new Rule(this, `RemoveExternalFollowerRule`, {
      eventBus: bus,
      eventPattern: {
        source: [`activity-pub.inbox-post`],
        detailType: [`undo.follow`]
      },
      targets: [new LambdaFunction(removeExternalFollower)],
    });

    const updateFollowersFn = new NodejsFunction(this, `UpdateFollowersFn`, {
      functionName: `UpdateFollowersFn`,
      entry: join(__dirname, './lambda/event-driven/update-followers.ts'),
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
      timeout: Duration.minutes(5),
      environment: {
        DOMAIN: domain,
        TABLE_NAME: table.tableName,
      }
    });
    table.grantReadWriteData(updateFollowersFn);
    
    new Rule(this, `UpdateFollowersRule`, {
      eventBus: bus,
      eventPattern: {
        detailType: [`follower.added`, `follower.removed`]
      },
      targets: [new LambdaFunction(updateFollowersFn)],
    });

    const followAcceptExternal = new NodejsFunction(this, `SendFollowAcceptToExternal`, {
      functionName: `SendFollowAcceptToExternal`,
      entry: join(__dirname, './lambda/event-driven/send-follow-accept-to-external.ts'),
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
      timeout: Duration.minutes(5),
      environment: {
        DOMAIN: domain,
        TABLE_NAME: table.tableName,
      }
    });
    table.grantReadData(followAcceptExternal);
    
    new Rule(this, `SendFollowAcceptExternalRule`, {
      eventBus: bus,
      eventPattern: {
        source: [`activity-pub.add-external-follower`],
      },
      targets: [new LambdaFunction(followAcceptExternal)],
    });
  }
}
