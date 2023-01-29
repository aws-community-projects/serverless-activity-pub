import { generateKeyPairSync } from "crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { PostConfirmationTriggerEvent } from "aws-lambda";
import {
  EventBridgeClient,
  PutEventsCommand,
} from "@aws-sdk/client-eventbridge";

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


// For a multi-user setup this would be the lambda that generates the user and creates the user's public/private keys
export const handler = async (event: PostConfirmationTriggerEvent) => {
  console.log(JSON.stringify(event, null, 2));

  const { DOMAIN } = process.env;
  // TODO: check that the user name is valid/exists
  const preferredName = event.request?.userAttributes?.preferred_username;
  try {
    const { publicKey: publicKeyPem, privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048, // the length of your key in bits
      publicKeyEncoding: {
        type: "spki", // recommended to be 'spki' by the Node.js docs
        format: "pem",
      },
      privateKeyEncoding: {
        type: "pkcs8", // recommended to be 'pkcs8' by the Node.js docs
        format: "pem",
      },
    });

    // ? privateKey should get stored to DDB?
    const privateCommand = new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: {
        pk: `USER#${preferredName}`,
        sk: `PRIVATE`,
        privateKey
      },
    });
    await ddbDocClient.send(privateCommand);

    const userObject = {
        "@context": [
          "https://www.w3.org/ns/activitystreams",
          "https://w3id.org/security/v1",
        ],
        id: `https://${DOMAIN}/users/${preferredName}`,
        type: "Person",
        name: `${preferredName}`,
        preferredUsername: `${preferredName}`,
        inbox: `https://${DOMAIN}/users/${preferredName}/inbox`,
        following: `https://${DOMAIN}/users/${preferredName}/following`,
        followers: `https://${DOMAIN}/users/${preferredName}/followers`,
        featured: `https://${DOMAIN}/users/${preferredName}/collections/featured`,
        url: `https://${DOMAIN}/users/${preferredName}`,
        tag: [],
        // icon: {
        //   type: "Image",
        //   mediaType: "image/png",
        //   url: "https://cdn.masto.host/awscommunitysocial/accounts/avatars/109/285/701/561/689/321/original/36034c74b7bcc778.png",
        // },
        featuredTags: `https://${DOMAIN}/users/${preferredName}/collections/tags`,
        attachment: [
          // {
          //   type: "PropertyValue",
          //   name: "Blog",
          //   value:
          //     '<a href="https://matt.martz.codes" target="_blank" rel="nofollow noopener noreferrer me"><span class="invisible">https://</span><span class="">matt.martz.codes</span><span class="invisible"></span></a>',
          // },
          // {
          //   type: "PropertyValue",
          //   name: "Github",
          //   value:
          //     '<a href="https://github.com/martzcodes" target="_blank" rel="nofollow noopener noreferrer me"><span class="invisible">https://</span><span class="">github.com/martzcodes</span><span class="invisible"></span></a>',
          // },
          // {
          //   type: "PropertyValue",
          //   name: "Linkedin",
          //   value:
          //     '<a href="https://www.linkedin.com/in/martzcodes" target="_blank" rel="nofollow noopener noreferrer me"><span class="invisible">https://</span><span class="">linkedin.com/in/martzcodes</span><span class="invisible"></span></a>',
          // },
        ],
        publicKey: {
          id: `https://${DOMAIN}/users/${preferredName}#main-key`,
          owner: `https://${DOMAIN}/users/${preferredName}`,
          publicKeyPem,
        },
      };
      console.log(JSON.stringify({ userObject }, null, 2));

      const userCommand = new PutCommand({
        TableName: process.env.TABLE_NAME,
        Item: {
          pk: `USER#${preferredName}`,
          sk: `PUBLIC`,
          ...userObject
        },
      });
      await ddbDocClient.send(userCommand);
  } catch (e) {
    console.error(e);
  }

  const {userPoolId, userName} = event;
  const putEventInput = {
    Entries: [
      {
        Source: `activity-pub.user-confirmation`,
        DetailType: 'user-added',
        Detail: JSON.stringify({
          GroupName: 'users',
          UserPoolId: userPoolId,
          Username: userName,
        }),
      },
    ],
  };
  console.log(JSON.stringify(putEventInput));
  const putEventsCommand = new PutEventsCommand(putEventInput);
  await eb.send(putEventsCommand);

  return event;
};