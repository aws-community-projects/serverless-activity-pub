import { EventBridgeEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  BatchWriteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";
import { unstructureUserLink } from "../utils/unstructure-user-link";

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
    console.log(`No one follows: ${activity.activityUser}@${activity.activityServer}`);
    return;
  }
  const command = new BatchWriteCommand({
    RequestItems: {
      [`${process.env.TABLE_NAME}`]: followers.map((follower) => ({
        PutRequest: {
          Item: {
            pk: follower.pk,
            sk: `FOLLOWER#${activity.activityUser}@${activity.activityServer}#NOTE#${activity.object.id}`,
            pk1: follower.pk,
            sk1: `NOTE#${new Date(activity.object.published).getTime()}`,
            deleted: false,
            ...activity.object,
          },
        },
      })),
    },
  });

  // ? instead of storing individually by followers maybe it should store singles and then have a way to individually query?

  await ddbDocClient.send(command);
  if (lastEvaluatedKey) {
    await batchUpdateForFollowers({ activity, lastEvaluatedKey });
  }
};

export const handler = async (event: EventBridgeEvent<string, any>) => {
  console.log(JSON.stringify(event));
  const activity = event.detail;
  // const { server: targetServer, user: targetUser } = unstructureUserLink(
  //   activity.object
  // );
  await batchUpdateForFollowers({ activity });
  // const putEventsCommand = new PutEventsCommand({
  //   Entries: [
  //     {
  //       Source: `activity-pub.add-external-follower`,
  //       DetailType: "follower.added",
  //       Detail: JSON.stringify({
  //         ...activity,
  //         type: activity.type.toLowerCase(),
  //         targetUser,
  //         targetServer,
  //         pk: `USER#${targetUser}`,
  //         sk: `FOLLOWER#${activity.activityUser}@${activity.activityServer}`,
  //       }),
  //     },
  //   ],
  // });
  // await eb.send(putEventsCommand);
};
