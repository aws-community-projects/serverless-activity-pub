import { EventBridgeEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";

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
  const command = new UpdateCommand({
    TableName: process.env.TABLE_NAME,
    Key: {
      pk: `USER#${activity.targetUser}`,
      sk: `FOLLOWER#${activity.activityUser}@${activity.activityServer}`,
    },
    UpdateExpression: "SET active = :a REMOVE #id",
    ConditionExpression: "attribute_exists(id)",
    ExpressionAttributeNames: {
      "#id": "id",
    },
    ExpressionAttributeValues: {
      ":a": false,
    },
    ReturnValues: "ALL_NEW"
  });
  const ddbRes = await ddbDocClient.send(command);
  console.log(JSON.stringify({ddbRes}));
  const putEventsCommand = new PutEventsCommand({
    Entries: [
      {
        Source: `activity-pub.undo-follow`,
        DetailType: 'follower.removed',
        Detail: JSON.stringify({
          ...activity,
          type: activity.type.toLowerCase(),
          pk: `USER#${activity.targetUser}`,
          sk: `FOLLOWER#${activity.activityUser}@${activity.activityServer}`,
        }),
      },
    ],
  });
  await eb.send(putEventsCommand);
};
