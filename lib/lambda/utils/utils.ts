import { createVerify, getHashes, createSign } from "crypto";
import fetch from "node-fetch";

export const normalizeHeaders = (
  headers: Record<string, string>
): Record<string, string> =>
  Object.entries(headers).reduce(
    (acc, [k, v]) => ({ ...acc, [k.toLowerCase()]: v }),
    {}
  );

const requestCleartext = ({
  method = "POST",
  path = "/",
  headerNames = ["host", "date"],
  lcHeaders,
}: {
  method: string;
  path?: string;
  headerNames?: string[];
  lcHeaders: Record<string, string>;
}) =>
  `(request-target): ${method.toLowerCase()} ${path}\n` +
  headerNames.map((k) => `${k}: ${lcHeaders[k]}`).join("\n");

const lcAlgorithms: Record<string, string> = getHashes().reduce(
  (acc, name) => ({ ...acc, [name.toLowerCase()]: name }),
  {}
);

const normalizeAlgorithm = (algorithm: string) =>
  lcAlgorithms[algorithm.toLowerCase()];

export const getPublicKey = async ({ keyId }: { keyId: string }) => {
  try {
    const actorReq = await fetch(keyId, {
      headers: {
        Accept:
          'application/ld+json; profile="https://www.w3.org/ns/activitystreams", application/json',
      },
    });
    const actor: any = await actorReq.json();
    let publicKey = actor.publicKey;
    if (typeof actor.publicKey === "string") {
      const publicKeyReq = await fetch(publicKey, {
        headers: {
          Accept:
            'application/ld+json; profile="https://www.w3.org/ns/activitystreams", application/json',
        },
      });
      publicKey = await publicKeyReq.json();
    }
    return publicKey.publicKeyPem;
  } catch (e) {
    return null;
  }
};
export const verifyRequest = async ({
  method,
  path,
  headers,
}: {
  method: string;
  path: string;
  headers: Record<string, string>;
}) => {
  const lcHeaders = normalizeHeaders(headers);
  const sigParts: Record<string, string> = lcHeaders.signature
    .split(/, ?/)
    .reduce((acc, part) => {
      const [key, value] = part.split("=");
      return { ...acc, [key]: value.split('"')[1] };
    }, {});
  // hacky workaround for cloudfront replacing the host
  // const host = sigParts.keyId.replace("https://", "").split("/")[0];
  lcHeaders.host = `${process.env.DOMAIN}`;

  const {
    signature,
    keyId,
    algorithm = "SHA256",
    headers: sigHeaders,
  } = sigParts;

  const headerNames = sigHeaders
    .split(" ")
    .filter((k) => k !== "(request-target)");
  const toVerify = requestCleartext({ method, path, headerNames, lcHeaders });

  const key = await getPublicKey({ keyId });
  if (!key) return false;

  return createVerify(normalizeAlgorithm(algorithm))
    .update(toVerify)
    .verify(key, signature, "base64");
};

export const signRequest = ({
  keyId,
  privateKey,
  method,
  path,
  headers,
  algorithm = "SHA256",
}: {
  keyId: string;
  privateKey: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  algorithm?: string;
}) => {
  const lcHeaders = normalizeHeaders(headers);
  const headerNames = Object.keys(lcHeaders);
  const toSign = requestCleartext({ method, path, headerNames, lcHeaders });

  const signature = createSign(normalizeAlgorithm(algorithm))
    .update(toSign)
    .sign(privateKey, "base64");

  return [
    `keyId="${keyId}"`,
    `algorithm="rsa-sha256"`,
    `headers="(request-target) ${headerNames.join(" ")}"`,
    `signature="${signature}"`,
  ].join(",");
};
