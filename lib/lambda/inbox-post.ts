import type { APIGatewayEvent } from "aws-lambda";
import { expandUndo, getPublicKey, unstructureUserLink, verifyRequest } from "./utils";
import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";

const eb = new EventBridgeClient({});

export const handler = async (event: APIGatewayEvent) => {
  console.log(JSON.stringify(event, null, 2));
  if (!event.body) {
    return { statusCode: 400, body: "Missing Body" };
  }
  const headers: Record<string, string> = Object.entries(event.headers).reduce(
    (p, [k, v]) => {
      if (v) {
        return { ...p, [k]: v };
      }
      return p;
    },
    {} as Record<string, string>
  );
  const requestVerified = await verifyRequest({
    method: event.httpMethod,
    headers: {...headers, host: 'awscommunity.social'},
    path: event.path,
  });
  console.log(`requestVerified: ${requestVerified}`);
  if (!requestVerified) {
    return { statusCode: 401, body: "HTTP signature not verified" };
  }

  const activity = JSON.parse(event.body);
  const { server: activityServer, user: activityUser } = unstructureUserLink(
    activity.actor
  );
  try {
    const signature = activity.signature;
    if (signature) {
      const key = await getPublicKey({ keyId: signature.creator });
      const decoded = Buffer.from(signature.signatureValue, 'base64').toString('utf8');
      console.log(`${key} vs ${decoded} = ${key === decoded}`);
      delete activity.signature;
    }
  } catch(e) {
    console.log(e);
  }

  const putEventInput = {
    Entries: [
      {
        Source: `activity-pub.inbox-post`,
        DetailType:
          activity.type.toLowerCase() === "undo"
            ? `${activity.type.toLowerCase()}.${activity.object.type.toLowerCase()}`
            : activity.type.toLowerCase(),
        Detail: JSON.stringify({
          ...activity,
          type: activity.type.toLowerCase(),
          activityServer,
          activityUser,
          ...expandUndo(activity),
        }),
      },
    ],
  };
  console.log(JSON.stringify(putEventInput));
  const putEventsCommand = new PutEventsCommand(putEventInput);
  await eb.send(putEventsCommand);

  return { statusCode: 200 };
};
