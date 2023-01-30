import { EventBridgeEvent } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { unstructureUserLink } from "../utils/unstructure-user-link";

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
  const update = new UpdateCommand({
    TableName: process.env.TABLE_NAME,
    Key: {
      pk: `INBOX`,
      sk: `META`,
    },
    UpdateExpression: "SET #detailType = :detailType",
    ExpressionAttributeNames: {
      "#detailType": event["detail-type"],
    },
    ExpressionAttributeValues: {
      ":detailType": true,
    },
    ReturnValues: "ALL_NEW"
  });
  const ddbRes = await ddbDocClient.send(update);
  console.log(JSON.stringify({ddbRes}));
};
