import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayEvent } from "aws-lambda";
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

// TODO: Make Express Step Function
export const handler = async (event: APIGatewayEvent) => {
  console.log(JSON.stringify(event));
  try {
    const { USERNAME, DOMAIN } = process.env;
    const resource = event.queryStringParameters?.resource;
    if (resource) {
      const splitResource = resource?.split("@");
      const user = splitResource[0].replace("acct:", "");
      const domain = splitResource[1];
      // query dynamo for user and make sure domain matches
      if (domain === process.env.DOMAIN) {
        const publicUser = new GetCommand({
          TableName: process.env.TABLE_NAME,
          Key: {
            pk: `USER#${user}`,
            sk: "PUBLIC",
          },
        });
        const publicUserRes = await ddbDocClient.send(publicUser);
        if (publicUserRes.Item) {
          return {
            statusCode: 200,
            body: JSON.stringify({
              subject: `acct:${USERNAME}@${DOMAIN}`,
              links: [
                {
                  rel: "self",
                  type: "application/activity+json",
                  href: `https://${DOMAIN}/users/${USERNAME}`,
                },
              ],
            }),
          };
        }
      }
    }
  } catch (e) {
    console.log(e);
  }
  return {
    statusCode: 404,
  };
};
