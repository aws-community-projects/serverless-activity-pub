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
  try {
    const user = event.pathParameters?.username;
    if (user) {
      const getUser = new GetCommand({
        TableName: process.env.TABLE_NAME,
        Key: {
          pk: `USER#${user}`,
          sk: "PUBLIC",
        },
      });
      const userRes = await ddbDocClient.send(getUser);
      if (!userRes.Item) {
        throw new Error("User not found");
      }
      return {
        statusCode: 200,
        body: JSON.stringify(userRes.Item),
      };
    }
  } catch (e) {
    console.log(e);
  }

  return { statusCode: 404 };
};
