import { Table } from "aws-cdk-lib/aws-dynamodb";
import { IEventBus } from "aws-cdk-lib/aws-events";
import { Construct } from "constructs";
import { join } from "path";
import { LambdaTableReadRule } from "./utils/lambda-table-read-rule";
import { LambdaTableReadWriteRule } from "./utils/lambda-table-read-write-rule";

export interface EventDrivenProps {
  bus: IEventBus;
  domain: string;
  table: Table;
}

export class EventDriven extends Construct {
  constructor(scope: Construct, id: string, props: EventDrivenProps) {
    super(scope, id);
    const { bus, domain, table } = props;

    new LambdaTableReadWriteRule(this, `AddExternalFollower`, {
      bus,
      domain,
      entry: join(__dirname, "./lambda/event-driven/add-external-follower.ts"),
      eventPattern: {
        source: [`activity-pub.inbox-post`],
        detailType: [`follow`],
      },
      table,
      put: true,
    });

    new LambdaTableReadWriteRule(this, `Accept`, {
      bus,
      domain,
      entry: join(__dirname, "./lambda/event-driven/accept.ts"),
      eventPattern: {
        source: [`activity-pub.inbox-post`],
        detailType: [`accept`],
      },
      table,
      put: true,
    });

    new LambdaTableReadWriteRule(this, `Categorize`, {
      bus,
      domain,
      entry: join(__dirname, "./lambda/event-driven/categorize.ts"),
      eventPattern: {
        source: [`activity-pub.inbox-post`],
      },
      table,
      put: true,
    });

    new LambdaTableReadWriteRule(this, `RemoveExternalFollower`, {
      bus,
      domain,
      entry: join(
        __dirname,
        "./lambda/event-driven/remove-external-follower.ts"
      ),
      eventPattern: {
        source: [`activity-pub.inbox-post`],
        detailType: [`undo.follow`],
      },
      table,
      put: true,
    });

    new LambdaTableReadWriteRule(this, `UpdateFollowers`, {
      bus,
      domain,
      entry: join(__dirname, "./lambda/event-driven/update-followers.ts"),
      eventPattern: {
        detailType: [`follower.added`, `follower.removed`],
      },
      table,
    });

    new LambdaTableReadRule(this, `SendFollowAcceptToExternal`, {
      bus,
      domain,
      entry: join(
        __dirname,
        "./lambda/event-driven/send-follow-accept-to-external.ts"
      ),
      eventPattern: {
        source: [`activity-pub.add-external-follower`],
      },
      table,
    });

    new LambdaTableReadWriteRule(this, `StoreExternalNote`, {
      bus,
      domain,
      entry: join(
        __dirname,
        "./lambda/event-driven/store-external-note.ts"
      ),
      eventPattern: {
        source: [`activity-pub.inbox-post`],
        detailType: [`create`, `update`],
      },
      table,
      put: true,
    });
  }
}
