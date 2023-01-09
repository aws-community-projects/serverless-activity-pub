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

export class ServerlessActivityPub extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const domain = `martz.codes`;

    const { table } = new Dynamo(this, `Dynamo`, {});
    const bus = EventBus.fromEventBusName(this, `DefaultBus`, "default");

    // can probably remove this.
    // const activityPubSecrets = new ActivityPubSecrets(
    //   this,
    //   `ActivityPubSecrets`,
    //   {
    //     domain,
    //   }
    // );

    const { authorizer, userPoolId, userPoolWebClientId } = new Cognito(
      this,
      `Cognito`,
      {
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

    new Internal(this, `Internal`, {
      api,
      authorizer,
      domain,
    });

    new EventDriven(this, `EventDriven`, {
      bus,
      domain,
      secret: activityPubSecrets.secret,
      table,
    });
  }
}
