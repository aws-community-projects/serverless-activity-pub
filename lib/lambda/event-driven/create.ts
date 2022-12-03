import { EventBridgeEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

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
  const actor = activity.actor;
  const to = [...(activity?.to || []), ...(activity?.cc || [])];
  // are we following actor?
  // are we in the to list?
  const command = new PutCommand({
    TableName: process.env.TABLE_NAME,
    Item: {
      pk: `USER#${process.env.USERNAME}`,
      sk: `FOLLOWER#${activity.activityUser}@${activity.activityServer}`,
      active: true,
      id: activity.id,
      actor: activity.actor,
    },
  });
  await ddbDocClient.send(command);
};
