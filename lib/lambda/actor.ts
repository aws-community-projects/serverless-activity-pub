import type { APIGatewayEvent } from "aws-lambda";
import { S3, GetObjectCommand } from "@aws-sdk/client-s3";
import { streamToString } from "./utils";

const s3 = new S3({});

// TODO: Make Express Step Function
export const handler = async (event: APIGatewayEvent) => {
  const { USERNAME, DOMAIN, BUCKET } = process.env;

  const getObject = new GetObjectCommand({
    Bucket: BUCKET,
    Key: `public.pem`,
  });
  const jwksObject = await s3.send(getObject);
  const jwks = await streamToString(jwksObject.Body);
  console.log(`jwks: ${jwks}`);

  return {
    statusCode: 200,
    body: JSON.stringify({
      "@context": [
        "https://www.w3.org/ns/activitystreams",
        "https://w3id.org/security/v1",
      ],

      id: `https://${DOMAIN}/actor`,
      type: "Person",
      preferredUsername: `${USERNAME}`,
      inbox: `https://${DOMAIN}/inbox`,

      publicKey: {
        id: `https://${DOMAIN}/actor#main-key`,
        owner: `https://${DOMAIN}/actor`,
        publicKeyPem: jwks,
      },
    }),
  };
};
