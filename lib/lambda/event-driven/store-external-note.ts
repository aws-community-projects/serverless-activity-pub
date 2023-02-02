import { EventBridgeEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  BatchWriteCommand,
  QueryCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";
import console = require("console");

const ddbClient = new DynamoDBClient({});
const marshallOptions = {
  // Whether to automatically convert empty strings, blobs, and sets to `null`.
  convertEmptyValues: false, // false, by default.
  // Whether to remove undefined values while marshalling.
  removeUndefinedValues: true, // false, by default.
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

const batchUpdateForFollowers = async ({
  activity,
  lastEvaluatedKey,
}: {
  activity: any;
  lastEvaluatedKey?: Record<string, any>;
}) => {
  const queryCommand = new QueryCommand({
    TableName: process.env.TABLE_NAME,
    KeyConditionExpression: "#pk = :pk",
    IndexName: "gsi1",
    ExpressionAttributeNames: {
      "#pk": "pk1",
      "#active": "active",
    },
    ExpressionAttributeValues: {
      ":pk": `FOLLOWER#${activity.activityUser}@${activity.activityServer}`,
      ":active": true,
    },
    FilterExpression: "#active = :active",
    ExclusiveStartKey: lastEvaluatedKey,
    ScanIndexForward: true,
  });
  let followers = [];
  let nextLastEvaluatedKey;
  try {
    const queryRes = await ddbDocClient.send(queryCommand);
    nextLastEvaluatedKey = queryRes.LastEvaluatedKey;
    console.log(JSON.stringify({ queryRes }));
    if (!queryRes.Items) {
      throw new Error("No One Following");
    }
    followers = queryRes.Items.map((follower) => follower.pk);
  } catch (e) {
    console.log(e);
    console.log(
      `No one follows: ${activity.activityUser}@${activity.activityServer}`
    );
    return;
  }

  const params = {
    RequestItems: {
      [`${process.env.TABLE_NAME}`]: followers.map((follower) => ({
        PutRequest: {
          Item: {
            pk: `${follower}`,
            sk: `NOTE#${activity.object.published}#${activity.object.id}`,
            pk1: `NOTE`,
            sk1: `NOTE#${activity.object.published}#${activity.object.id}`,
            deleted: false,
            ttl: Date.now() / 1000 + 30 * 24 * 60 * 60,
            ...activity.object,
          },
        },
      })),
    },
  };
  console.log(JSON.stringify({ params }, null, 2));
  const command = new BatchWriteCommand(params);

  await ddbDocClient.send(command);
  if (lastEvaluatedKey) {
    await batchUpdateForFollowers({ activity, lastEvaluatedKey });
  }
};

// TODO this should be a step function

export const handler = async (event: EventBridgeEvent<string, any>) => {
  console.log(JSON.stringify(event));
  const activity = event.detail;
  const publicNote = activity.object.to.includes("https://www.w3.org/ns/activitystreams#Public");
  if (!publicNote) {
    // ? Do we want to store DMs?
    return;
  }
  const queryCommand = new QueryCommand({
    TableName: process.env.TABLE_NAME,
    KeyConditionExpression: "#pk = :pk",
    IndexName: "gsi1",
    ExpressionAttributeNames: {
      "#pk": "pk1",
      "#active": "active",
    },
    ExpressionAttributeValues: {
      ":pk": `FOLLOWER#${activity.activityUser}@${activity.activityServer}`,
      ":active": true,
    },
    FilterExpression: "#active = :active",
    Limit: 1,
  });
  try {
    const queryRes = await ddbDocClient.send(queryCommand);
    console.log(JSON.stringify({ queryRes }));
    if (!queryRes.Items) {
      throw new Error("No One Following");
    }
  } catch (e) {
    console.log(e);
    console.log(
      `No one follows: ${activity.activityUser}@${activity.activityServer}`
    );
    return;
  }

  const hashtags = activity.object.tag
    .filter((tag: any) => tag.type.toLowerCase() === "hashtag")
    .map((tag: any) => tag.name.replace("#", ""));
  const mentions = activity.object.tag
    .filter((tag: any) => tag.type.toLowerCase() === "mention")
    .map((tag: any) => tag.name);

    // ! The to and cc fields usually list followers... it seems like to is usually "public" and cc is usually "followers + specific user"
    // ! It's not clear if mastodon batches activity events by server or by user  
    const ddbItem = {
      TableName: process.env.TABLE_NAME,
      Item: {
        pk: `EXTERNAL#${activity.activityUser}@${activity.activityServer}`,
        sk: `NOTE#${activity.object.id}`,
        pk1: `NOTE`,
        sk1: `${activity.object.published}`,
        deleted: false,
        ttl: Math.round(Date.now() / 1000 + 30 * 24 * 60 * 60),
        hashtags,
        mentions,
        ...activity.object,
      },
    };
    const command = new PutCommand(ddbItem);
    await ddbDocClient.send(command);
};
