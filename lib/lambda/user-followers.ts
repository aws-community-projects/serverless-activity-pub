import type { APIGatewayEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

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
  console.log(JSON.stringify(event));
  let followers = 0;
  try {
    const get = new GetCommand({
      TableName: process.env.TABLE_NAME,
      Key: {
        pk: `USER#${event.pathParameters?.username}`,
        sk: "COUNTS",
      },
    });
    const getRes = await ddbDocClient.send(get);
    console.log(JSON.stringify({ getRes }));
    followers = getRes.Item?.followers || 0;
    const page = event.queryStringParameters?.page;
    if (page && getRes.Item) {
      const query = new QueryCommand({
        TableName: process.env.TABLE_NAME,
        KeyConditionExpression: "#pk = :pk and begins_with(#sk, :sk)",
        ExpressionAttributeNames: {
          "#pk": "pk",
          "#sk": "sk",
          "#active": "active",
        },
        ExpressionAttributeValues: {
          ":pk": `USER#${event.pathParameters?.username}`,
          ":sk": "FOLLOWER",
          ":active": true,
        },
        FilterExpression: "#active = :active",
      });
      const queryRes = await ddbDocClient.send(query);
      console.log(JSON.stringify({ queryRes }));
      const orderedItems = (queryRes.Items || []).map((item) => item.actor);
      return {
        statusCode: 200,
        body: JSON.stringify({
          "@context": "https://www.w3.org/ns/activitystreams",
          id: `https://${process.env.DOMAIN}/users/${event.pathParameters?.username}/followers?page=${page}`,
          type: "OrderedCollectionPage",
          totalItems: getRes.Item?.followers || 0,
          // next: `https://${process.env.DOMAIN}/users/${event.pathParameters?.username}/followers?page=${next page}`,
          partOf: `https://${process.env.DOMAIN}/users/${event.pathParameters?.username}/followers`,
          orderedItems,
        }),
      };
    }
  } catch (e) {
    console.log(e);
  }
  return {
    statusCode: 200,
    body: JSON.stringify({
      "@context": "https://www.w3.org/ns/activitystreams",
      id: `https://${process.env.DOMAIN}/users/${event.pathParameters?.username}/followers`,
      type: "OrderedCollection",
      totalItems: followers,
      first: `https://${process.env.DOMAIN}/users/${event.pathParameters?.username}/followers?page=1`,
    }),
  };
};
