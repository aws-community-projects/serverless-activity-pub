import { generateKeyPairSync } from "crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

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
export const handler = async (event: any) => {
  console.log(JSON.stringify(event, null, 2));

  const { DOMAIN } = process.env;
  const userName = event.userName;
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
        pk: `USER#${userName}`,
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
        id: `https://${DOMAIN}/users/${userName}`,
        type: "Person",
        name: `${userName}`,
        preferredUsername: `${userName}`,
        inbox: `https://${DOMAIN}/users/${userName}/inbox`,
        following: `https://${DOMAIN}/users/${userName}following`,
        followers: `https://${DOMAIN}/users/${userName}followers`,
        featured: `https://${DOMAIN}/users/${userName}/collections/featured`,
        url: `https://${DOMAIN}/u/${userName}`,
        tag: [],
        // icon: {
        //   type: "Image",
        //   mediaType: "image/png",
        //   url: "https://cdn.masto.host/awscommunitysocial/accounts/avatars/109/285/701/561/689/321/original/36034c74b7bcc778.png",
        // },
        featuredTags: `https://${DOMAIN}/users/${userName}/collections/tags`,
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
          id: `https://${DOMAIN}/users/${userName}#main-key`,
          owner: `https://${DOMAIN}/users/${userName}`,
          publicKeyPem,
        },
      };
      console.log(JSON.stringify({ userObject }, null, 2));

      const userCommand = new PutCommand({
        TableName: process.env.TABLE_NAME,
        Item: {
          pk: `USER#${userName}`,
          sk: `PUBLIC`,
          ...userObject
        },
      });
      await ddbDocClient.send(userCommand);
  } catch (e) {
    console.error(e);
    throw e;
  }

  return event;
};