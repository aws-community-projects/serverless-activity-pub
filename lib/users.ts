import { LambdaIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { IEventBus } from "aws-cdk-lib/aws-events";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { join } from "path";

export interface UsersProps {
  api: RestApi;
  bus: IEventBus;
  domain: string;
  table: Table;
}

export class Users extends Construct {
  constructor(scope: Construct, id: string, props: UsersProps) {
    super(scope, id);
    const { api, bus, domain, table } = props;
    const actor = api.root.addResource("users");
    const user = actor.addResource("{username}");
    const userFn = new NodejsFunction(this, `UserFn`, {
      functionName: `UserFn`,
      entry: join(__dirname, "./lambda/user.ts"),
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
      environment: {
        DOMAIN: domain,
        TABLE_NAME: table.tableName,
      },
    });
    table.grantReadData(userFn);

    user.addMethod("GET", new LambdaIntegration(userFn), {
      methodResponses: [{ statusCode: "200" }],
    });

    const inboxPostFn = new NodejsFunction(this, `InboxPostFn`, {
      functionName: `InboxPostFn`,
      entry: join(__dirname, "./lambda/inbox-post.ts"),
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
      environment: {
        DOMAIN: domain,
      },
    });
    bus.grantPutEventsTo(inboxPostFn);

    const userInbox = user.addResource("inbox");
    const inboxIntegration = new LambdaIntegration(inboxPostFn);
    userInbox.addMethod("POST", inboxIntegration);
    api.root.addResource('inbox').addMethod("POST", inboxIntegration);

    const userFollowersFn = new NodejsFunction(this, `UserFollowersFn`, {
      functionName: `UserFollowersFn`,
      entry: join(__dirname, "./lambda/user-followers.ts"),
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
      environment: {
        DOMAIN: domain,
        TABLE_NAME: table.tableName,
      },
    });
    table.grantReadData(userFollowersFn);
    const userFollowers = user.addResource("followers");
    userFollowers.addMethod("GET", new LambdaIntegration(userFollowersFn));
  }
}
