import { S3, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  SecretsManager,
  PutSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { generateKeyPairSync } from "crypto";

const sm = new SecretsManager({ region: "us-east-1" });
const s3 = new S3({ region: "us-east-1" });

export const handler = async (): Promise<void> => {
  const { DOMAIN, USERNAME } = process.env;
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

    const putSecretCommand = new PutSecretValueCommand({
      SecretId: `${process.env.SECRET_ID}`,
      SecretString: privateKey,
    });
    await sm.send(putSecretCommand);

    const putObjectCommand = new PutObjectCommand({
      Bucket: `${process.env.BUCKET_ID}`,
      Key: `${USERNAME}.json`,
      Body: JSON.stringify({
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
          publicKeyPem,
        },
      }),
    });
    await s3.send(putObjectCommand);
  } catch (e) {
    console.error(e);
    throw e;
  }
};
