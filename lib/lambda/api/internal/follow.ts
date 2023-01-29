import type { APIGatewayEvent } from "aws-lambda";
import { authorizedUsername } from "../../utils/authorized-username";

export const handler = async (event: APIGatewayEvent, context: any) => {
  console.log(JSON.stringify(event));
  if (!event.body) {
    throw new Error("Missing Request Body");
  }
  const requestor = authorizedUsername(event);
  const body = JSON.parse(event.body);
  const { userToFollow } = body;
  const [usernameToFollow, serverToFollow] = userToFollow.split("@");

  const followId = '';

  const followRequest = {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: `https://${process.env.DOMAIN}/${followId}`,
    type: "Follow",
    actor: `https://${process.env.DOMAIN}/users/${requestor}`,
    object: `https://${serverToFollow}/users/${userToFollow}`,
  };

  return {
    statusCode: 200,
    body: JSON.stringify({
      requestor,
      userToFollow,
      usernameToFollow,
      serverToFollow,
      followRequest
    }),
    headers: {
      "Access-Control-Allow-Origin": "*", // Required for CORS support to work
      "Access-Control-Allow-Credentials": true, // Required for cookies, authorization headers with HTTPS
    },
  };
};
