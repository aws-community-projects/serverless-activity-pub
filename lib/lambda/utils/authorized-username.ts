import type { APIGatewayEvent } from "aws-lambda";

export const authorizedUsername = (event: APIGatewayEvent): string => {
  const groups = event.requestContext.authorizer?.claims['cognito:groups'].split(',');
  if (!groups.includes('users')) {
    throw new Error("Missing 'users' group in authorization context");
  }
  return event.requestContext.authorizer?.claims.username;
}