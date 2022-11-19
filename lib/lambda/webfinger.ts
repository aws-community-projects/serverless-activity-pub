import type { APIGatewayEvent } from "aws-lambda";

// TODO: Make Express Step Function
export const handler = async (event: APIGatewayEvent) => {
  console.log(JSON.stringify(event));
  const { USERNAME, DOMAIN } = process.env;
  const resource = event.queryStringParameters?.resource;
  if (resource === `acct:${USERNAME}@${DOMAIN}`) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        subject: `acct:${USERNAME}@${DOMAIN}`,
        links: [
          {
            rel: "self",
            type: "application/activity+json",
            href: `https://${DOMAIN}/actor`,
          },
        ],
      }),
    };
  } else {
    return {
      statusCode: 404,
    };
  }
};
