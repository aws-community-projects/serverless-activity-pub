import { Stack, StackProps } from "aws-cdk-lib";
import { EventBus } from "aws-cdk-lib/aws-events";
import { Construct } from "constructs";
import { Users } from "./users";
import { ActivityPubApi } from "./api";
import { Cognito } from "./cognito";
import { Dynamo } from "./dynamo";
import { EventDriven } from "./event-driven";
import { Internal } from "./internal";
import { WellKnown } from "./well-known";
import { Outbox } from "./outbox";

export interface ServerlessActivityPubProps extends StackProps {
  domain: string;
}

export class ServerlessActivityPub extends Stack {
  constructor(scope: Construct, id: string, props: ServerlessActivityPubProps) {
    super(scope, id, props);

    const { domain } = props;

    const { table } = new Dynamo(this, `Dynamo`, {});
    const bus = EventBus.fromEventBusName(this, `DefaultBus`, "default");

    const { authorizer, userPoolId, userPoolWebClientId } = new Cognito(
      this,
      `Cognito`,
      {
        bus,
        domain,
        table,
      }
    );
    const { api } = new ActivityPubApi(this, `ActivityPubApi`, {
      domain,
      userPoolId,
      userPoolWebClientId,
    });

    const wellKnown = new WellKnown(this, `WellKnown`, {
      api,
      domain,
      table,
    });

    new Users(this, `Users`, {
      api,
      bus,
      domain,
      table,
    });

    new Outbox(this, `Outbox`, {
      api,
      bus,
      domain,
      table,
      authorizer,
    });

    new Internal(this, `Internal`, {
      api,
      authorizer,
      bus,
      domain,
      table,
    });

    new EventDriven(this, `EventDriven`, {
      bus,
      domain,
      table,
    });
  }
}
