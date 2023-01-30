import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayEvent } from "aws-lambda";
import { createHash } from "crypto";
import fetch from "node-fetch";
import { URL } from "url";
import { authorizedUsername } from "../../utils/authorized-username";
import { signRequest } from "../../utils/utils";

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

export const handler = async (event: APIGatewayEvent, context: any) => {
  console.log(JSON.stringify(event));
  if (!event.body) {
    throw new Error("Missing Request Body");
  }
  const requestor = authorizedUsername(event);
  const body = JSON.parse(event.body);
  const { userToFollow } = body;
  const [usernameToFollow, serverToFollow] = userToFollow.split("@");

  const webfingerReq = await fetch(`https://${serverToFollow}/.well-known/webfinger?resource=acct:${usernameToFollow}@${serverToFollow}`, {
    headers: {
      Accept:
        'application/json',
    },
  });
  const webfinger: any = await webfingerReq.json();
  console.log(JSON.stringify(webfinger, null, 2));

  const webfingerLinks = webfinger.links;
  const webfingerSelf = webfingerLinks.filter((link: any) => link.rel === 'self');
  if (webfingerSelf.length !== 1) {
    throw new Error("More than one self link");
  }

  const userToFollowReq = await fetch(`${webfingerSelf[0].href}`, {
    headers: {
      Accept:
        'application/json',
    },
  });
  const user: any = await userToFollowReq.json();
  console.log(JSON.stringify(user, null, 2));
  const userToFollowInbox = user.inbox;


  const ddbItem = {
    TableName: process.env.TABLE_NAME,
    Item: {
      pk: `USER#${requestor}`,
      sk: `FOLLOWING#${usernameToFollow}@${serverToFollow}`,
      accepted: false,
      inbox: userToFollowInbox,
      preferredUsername: user.preferredUsername,
      following: user.following,
      followers: user.followers,
      url: user.url,
    },
  };
  const command = new PutCommand(ddbItem);
  try {
    await ddbDocClient.send(command);
  } catch (e) {
    console.log(e);
  }

  const followRequest = {
    "@context": "https://www.w3.org/ns/activitystreams",
    id: `https://${process.env.DOMAIN}/${ddbItem.Item.pk}###${ddbItem.Item.sk}`,
    type: "Follow",
    actor: `https://${process.env.DOMAIN}/users/${requestor}`,
    object: `https://${serverToFollow}/users/${usernameToFollow}`,
  };

  const digest = createHash("sha256")
    .update(JSON.stringify(followRequest))
    .digest("base64");
  const headers = {
    Host: serverToFollow,
    Date: new Date().toUTCString(),
    Digest: `SHA-256=${digest}`,
    "Content-Type": "application/activity+json",
  };

  const privateUser = new GetCommand({
    TableName: process.env.TABLE_NAME,
    Key: {
      pk: `USER#${requestor}`,
      sk: "PRIVATE",
    },
  });
  const privateUserRes = await ddbDocClient.send(privateUser);
  const secret = privateUserRes.Item?.privateKey;

  const method = 'POST';
  const inboxUrl = new URL(userToFollowInbox);
  const { protocol, host, pathname, search } = inboxUrl;
  const path = pathname + search;
  const signature = signRequest({
    keyId: `https://${process.env.DOMAIN}/users/${requestor}#main-key`,
    privateKey: secret,
    method,
    path,
    headers,
  });

  const userInboxReq = await fetch(`${protocol}//${host}${path}`, {
    method,
    headers: {
      ...headers,
      Signature: signature,
      Accept:
        'application/ld+json; profile="https://www.w3.org/ns/activitystreams", application/json',
    },
    body: JSON.stringify(followRequest)
  });
  const userInboxRes: any = await userInboxReq.text();
  console.log(JSON.stringify({userInboxRes}, null, 2));

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
