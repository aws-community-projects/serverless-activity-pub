import { EventBridgeEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

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
  const query = new QueryCommand({
    TableName: process.env.TABLE_NAME,
    KeyConditionExpression: '#pk = :pk and begins_with(#sk, :sk)',
    ExpressionAttributeNames: {
      '#pk': 'pk',
      '#sk': 'sk',
      '#active': "active"
    },
    ExpressionAttributeValues: {
      ':pk': activity.pk,
      ':sk': 'FOLLOWER',
      ":active": true,
    },
    FilterExpression: "#active = :active",
    Select: 'COUNT',
  });
  const queryRes = await ddbDocClient.send(query);
  console.log(JSON.stringify({queryRes}));
  const update = new UpdateCommand({
    TableName: process.env.TABLE_NAME,
    Key: {
      pk: activity.pk,
      sk: `COUNTS`,
    },
    UpdateExpression: "SET followers = :followers",
    ExpressionAttributeValues: {
      ":followers": queryRes.Count || 0,
    },
    ReturnValues: "ALL_NEW"
  });
  const ddbRes = await ddbDocClient.send(update);
  console.log(JSON.stringify({ddbRes}));
};
