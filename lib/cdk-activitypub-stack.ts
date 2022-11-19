import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { ActivityPubSecrets } from "./activity-pub-secrets";
import { Actor } from "./actor";
import { ActivityPubApi } from "./api";
import { Dynamo } from "./dynamo";
import { WellKnown } from "./well-known";

export class CdkActivitypubStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const username = 'm';
    const domain = `martz.codes`;
    const { api } = new ActivityPubApi(this, `ActivityPubApi`, {
      domain
    });

    const wellKnown = new WellKnown(this, `WellKnown`, {
      api,
      domain,
      username,
    });

    const activityPubSecrets = new ActivityPubSecrets(this, `ActivityPubSecrets`, {
      domain,
      username,
    });

    const actor = new Actor(this, `Actor`, {
      api,
      bucket: activityPubSecrets.bucket,
      bucketRole: activityPubSecrets.bucketRole,
      domain,
      username,
    });

    const { table } = new Dynamo(this, `Dynamo`, {});
  }
}
