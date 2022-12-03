import fetch from "node-fetch";
import { EventBridgeEvent } from "aws-lambda";
import {
  SecretsManager,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { URL } from "url";
import { signRequest } from "../utils";
import { createHash } from "crypto";

const sm = new SecretsManager({ region: "us-east-1" });

export const handler = async (event: EventBridgeEvent<string, any>) => {
  console.log(JSON.stringify(event));
  const activity = event.detail;
  const getSecretValueCommand = new GetSecretValueCommand({
    SecretId: `${process.env.SECRET_ID}`,
  });
  const secretRes = await sm.send(getSecretValueCommand);
  const secret = secretRes.SecretString!;

  // get user inbox
  const actorRaw = await fetch(activity.actor, {
    headers: {
      Accept:
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams", application/json',
    },
  });
  console.log(actorRaw);
  const actor: any = await actorRaw.json();
  console.log(JSON.stringify(actor, null, 2));
  const actorInbox = actor.inbox;

  // send ack to user inbox

  const inboxUrl = new URL(actorInbox);
  const { protocol, host, pathname, search } = inboxUrl;
  console.log(JSON.stringify({ host }));

  const body = {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: `https://${process.env.DOMAIN}/users/${process.env.USERNAME}#follows/${activity.activityUser}`,
    type: "Accept",
    actor: `https://${process.env.DOMAIN}/users/${process.env.USERNAME}`,
    object: {
      id: activity.id,
      type: "Follow",
      actor: activity.actor,
      object: activity.object,
    },
  };
  console.log(JSON.stringify({ body }));

  const path = pathname + search;
  const method = "POST";
  const digest = createHash("sha256")
    .update(JSON.stringify(body))
    .digest("base64");
  const headers = {
    Host: host,
    Date: new Date().toUTCString(),
    Digest: `SHA-256=${digest}`,
    "Content-Type": "application/activity+json",
  };

  const signature = signRequest({
    keyId: `https://${process.env.DOMAIN}/users/${process.env.USERNAME}#main-key`,
    privateKey: secret,
    method,
    path,
    headers,
  });

  const options = {
    method,
    body: JSON.stringify(body),
    headers: {
      ...headers,
      Signature: signature,
      Accept:
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams", application/json',
    },
  };
  console.log(JSON.stringify(options));

  try {
    console.log(`${protocol}//${host}${path}`);
    console.log(`body: ${JSON.stringify(body)}`);
    const res = await fetch(`${protocol}//${host}${path}`, options);
    const txt = await res.text();
    console.log(txt);
  } catch (e) {
    console.log(e);
  }
};
