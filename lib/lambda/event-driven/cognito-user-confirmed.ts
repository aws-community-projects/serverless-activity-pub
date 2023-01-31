import { CognitoIdentityProviderClient, AdminAddUserToGroupCommand } from "@aws-sdk/client-cognito-identity-provider";
import { EventBridgeEvent } from "aws-lambda";

const cognito = new CognitoIdentityProviderClient({});

export const handler = async (event: EventBridgeEvent<string, any>) => {
  const addUser = new AdminAddUserToGroupCommand(event.detail);
  await cognito.send(addUser);
};