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

    const addFollowerFn = new NodejsFunction(this, `FollowAddFn`, {
      functionName: `FollowAddFn`,
      entry: join(__dirname, './lambda/event-driven/follow-add.ts'),
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
      environment: {
        DOMAIN: domain,
        TABLE_NAME: table.tableName,
      }
    });
    bus.grantPutEventsTo(addFollowerFn);
    table.grantReadWriteData(addFollowerFn);

    new Rule(this, `FollowAddRule`, {
      eventBus: bus,
      eventPattern: {
        source: [`activity-pub.inbox-post`],
        detailType: [`follow`]
      },
      targets: [new LambdaFunction(addFollowerFn)],
    });

    const acceptFn = new NodejsFunction(this, `AcceptFn`, {
      functionName: `AcceptFn`,
      entry: join(__dirname, './lambda/event-driven/accept.ts'),
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
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

    const undoFollowFn = new NodejsFunction(this, `UndoFollowFn`, {
      functionName: `UndoFollowFn`,
      entry: join(__dirname, './lambda/event-driven/undo-follow.ts'),
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
      environment: {
        DOMAIN: domain,
        TABLE_NAME: table.tableName,
      }
    });
    bus.grantPutEventsTo(undoFollowFn);
    table.grantReadWriteData(undoFollowFn);
    
    new Rule(this, `UndoFollowRule`, {
      eventBus: bus,
      eventPattern: {
        source: [`activity-pub.inbox-post`],
        detailType: [`undo.follow`]
      },
      targets: [new LambdaFunction(undoFollowFn)],
    });

    const updateFollowersFn = new NodejsFunction(this, `UpdateFollowersFn`, {
      functionName: `UpdateFollowersFn`,
      entry: join(__dirname, './lambda/event-driven/update-followers.ts'),
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
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

    const followAcceptFn = new NodejsFunction(this, `FollowAcceptFn`, {
      functionName: `FollowAcceptFn`,
      entry: join(__dirname, './lambda/event-driven/follow-accept.ts'),
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
      environment: {
        DOMAIN: domain,
        TABLE_NAME: table.tableName,
      }
    });
    table.grantReadData(followAcceptFn);
    
    new Rule(this, `FollowAcceptRule`, {
      eventBus: bus,
      eventPattern: {
        source: [`activity-pub.follow-add`],
      },
      targets: [new LambdaFunction(followAcceptFn)],
    });
  }
}
