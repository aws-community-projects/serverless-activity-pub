import type { APIGatewayEvent } from "aws-lambda";
import { verifyRequest } from "./utils";
export const handler = async (event: APIGatewayEvent) => {
  console.log(JSON.stringify(event, null, 2));
  if (!event.body) {
    return { statusCode: 400, body: 'Missing Body'};
  }
  const headers: Record<string, string> = Object.entries(event.headers).reduce(
    (p, [k, v]) => {
      if (v) {
        return { ...p, [k]: v };
      }
      return p;
    },
    {} as Record<string, string>
  );
  const requestVerified = await verifyRequest({
    method: event.httpMethod,
    headers,
    path: event.path,
  });
  if (!requestVerified) {
    return { statusCode: 401, body: "HTTP signature not verified" };
  }

  const activity = JSON.parse(event.body);
  console.log(JSON.stringify(activity, null, 2));
  switch (activity.type.toLowerCase()) {
    case 'accept':
      break
    case 'announce':
      break
    case 'delete':
      break
    case 'like':
      break
    case 'reject':
      break
    case 'undo':
      break
    case 'update':
      break
    default:
      break
  }
  return { statusCode: 200 };
};
