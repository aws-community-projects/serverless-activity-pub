import { Stack, StackProps } from "aws-cdk-lib";
import { EventBus } from "aws-cdk-lib/aws-events";
import { Construct } from "constructs";
import { ActivityPubSecrets } from "./activity-pub-secrets";
import { Users } from "./users";
import { ActivityPubApi } from "./api";
import { Cognito } from "./cognito";
import { Dynamo } from "./dynamo";
import { EventDriven } from "./event-driven";
import { Inbox } from "./inbox";
import { Internal } from "./internal";
import { WellKnown } from "./well-known";

export class CdkActivitypubStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const username = "a";
    const domain = `martz.codes`;

    const bus = EventBus.fromEventBusName(this, `DefaultBus`, 'default');

    const { authorizer, userPoolId, userPoolWebClientId } = new Cognito(
      this,
      `Cognito`,
      {}
    );
    const { api } = new ActivityPubApi(this, `ActivityPubApi`, {
      domain,
      userPoolId,
      userPoolWebClientId,
    });

    const wellKnown = new WellKnown(this, `WellKnown`, {
      api,
      domain,
      username,
    });

    const activityPubSecrets = new ActivityPubSecrets(
      this,
      `ActivityPubSecrets`,
      {
        domain,
        username,
      }
    );

    const { table } = new Dynamo(this, `Dynamo`, {});

    const { inbox } = new Inbox(this, `Inbox`, {
      api,
      bucket: activityPubSecrets.bucket,
      bus,
      domain,
      username,
    });

    const actor = new Users(this, `Users`, {
      api,
      bucket: activityPubSecrets.bucket,
      bucketRole: activityPubSecrets.bucketRole,
      domain,
      inbox,
      table,
      username,
    });

    const internal = new Internal(this, `Internal`, {
      api,
      authorizer,
      domain,
      username,
    });

    new EventDriven(this, `EventDriven`, {
      bus,
      domain,
      secret: activityPubSecrets.secret,
      table,
      username,
    });
  }
}
