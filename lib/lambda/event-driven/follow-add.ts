import { EventBridgeEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { unstructureUserLink } from "../utils";

import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";

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
export const handler = async (event: EventBridgeEvent<string, any>) => {
  console.log(JSON.stringify(event));
  const activity = event.detail;
  const { server: targetServer, user: targetUser } = unstructureUserLink(activity.object);
  const get = new GetCommand({
    TableName: process.env.TABLE_NAME,
    Key: {
      pk: `USER#${targetUser}`,
      sk: "PUBLIC",
    },
  });
  try {
    const getRes = await ddbDocClient.send(get);
    console.log(JSON.stringify({ getRes }));
    if (!getRes.Item) {
      throw new Error("No User Item");
    }
  } catch (e) {
    console.log(`Trying to follow unsupported user: ${targetUser}`);
    return;
  }
  const command = new PutCommand({
    TableName: process.env.TABLE_NAME,
    Item: {
      pk: `USER#${targetUser}`,
      sk: `FOLLOWER#${activity.activityUser}@${activity.activityServer}`,
      active: true,
      id: activity.id,
      actor: activity.actor,
    },
  });
  await ddbDocClient.send(command);
  const putEventsCommand = new PutEventsCommand({
    Entries: [
      {
        Source: `activity-pub.follow-add`,
        DetailType: 'follower.added',
        Detail: JSON.stringify({
          ...activity,
          type: activity.type.toLowerCase(),
          targetUser,
          targetServer,
          pk: `USER#${targetUser}`,
          sk: `FOLLOWER#${activity.activityUser}@${activity.activityServer}`,
        }),
      },
    ],
  });
  await eb.send(putEventsCommand);
};
