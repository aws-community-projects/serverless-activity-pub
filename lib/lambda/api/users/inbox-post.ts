import type { APIGatewayEvent } from "aws-lambda";
import { getPublicKey, verifyRequest } from "../../utils/utils";
import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { expandUndo } from "../../utils/expand-undo";
import { unstructureUserLink } from "../../utils/unstructure-user-link";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { hasFollower } from "../../utils/has-follower";

const eb = new EventBridgeClient({});
const ddbClient = new DynamoDBClient({});
const marshallOptions = {
  // Whether to automatically convert empty strings, blobs, and sets to `null`.
  convertEmptyValues: false, // false, by default.
  // Whether to remove undefined values while marshalling.
  removeUndefinedValues: false, // false, by default.
  // Whether to convert typeof object to map attribute.
  convertClassInstanceToMap: false, // false, by default.
};

const unmarshallOptions = {
  // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
  wrapNumbers: false, // false, by default.
};

const translateConfig = { marshallOptions, unmarshallOptions };

// Create the DynamoDB Document client.
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient, translateConfig);

export const handler = async (event: APIGatewayEvent) => {
  if (!event.body || !event.pathParameters?.username) {
    return { statusCode: 400, body: "Missing Body or Username" };
  }

  const get = new GetCommand({
    TableName: process.env.TABLE_NAME,
    Key: {
      pk: `USER#${event.pathParameters?.username.toLowerCase()}`,
      sk: "PUBLIC",
    },
  });
  const getRes = await ddbDocClient.send(get);
  if (!getRes.Item) {
    return {
      statusCode: 404,
      body: `User '${event.pathParameters?.username}' not found`,
    };
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
  const activity = JSON.parse(event.body);

  const host = activity.id.replace("https://", "").split("/")[0];

  const requestVerified = await verifyRequest({
    method: event.httpMethod,
    headers: { ...headers, host },
    path: event.path,
  });
  let putEventInput;
  let activitySignature;
  try {
    const signature = activity.signature;
    if (signature) {
      const key = await getPublicKey({ keyId: signature.creator });
      const decoded = Buffer.from(signature.signatureValue, "base64").toString(
        "utf8"
      );
      console.log(`${key} vs ${decoded} = ${key === decoded}`);
      activitySignature = key === decoded;
      delete activity.signature;
    }
  } catch (e) {
    console.log(e);
  }

  let followed = false;
  if (requestVerified) {
    const { server: activityServer, user: activityUser } = unstructureUserLink(
      activity.actor
    );
    const detail = {
      ...activity,
      userName: event.pathParameters.userName,
      type: activity.type.toLowerCase(),
      activityServer,
      activityUser,
      ...expandUndo(activity),
    };

    followed = await hasFollower({ ddbDocClient, activity: detail });

    if (followed) {
      putEventInput = {
        Entries: [
          {
            Source: `activity-pub.inbox-post`,
            DetailType:
              activity.type.toLowerCase() === "undo"
                ? `${activity.type.toLowerCase()}.${activity.object.type.toLowerCase()}`
                : activity.type.toLowerCase(),
            Detail: JSON.stringify(detail),
          },
        ],
      };
      const putEventsCommand = new PutEventsCommand(putEventInput);
      await eb.send(putEventsCommand);
    }
  }

  console.log(
    JSON.stringify(
      { activity, activitySignature, followed, putEventInput, requestVerified },
      null,
      2
    )
  );

  if (requestVerified) {
    if (followed) {
      return { statusCode: 200 };
    } else {
      return {
        statusCode: 404,
        body: "Not found",
      };
    }
  } else {
    return { statusCode: 401, body: "HTTP signature not verified" };
  }
};
