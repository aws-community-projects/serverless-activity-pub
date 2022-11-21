import { Duration } from "aws-cdk-lib";
import { CognitoUserPoolsAuthorizer } from "aws-cdk-lib/aws-apigateway";
import { UserPool } from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

export interface CognitoProps {}

export class Cognito extends Construct {
  authorizer: CognitoUserPoolsAuthorizer;
  userPoolId: string;
  userPoolWebClientId: string;
  constructor(scope: Construct, id: string, props: CognitoProps) {
    super(scope, id);
    const userPool = new UserPool(this, 'activity-pub-user-pool', {
      userPoolName: 'activity-pub-user-pool',
      signInCaseSensitive: false, // case insensitive is preferred in most situations
      selfSignUpEnabled: false,
      signInAliases: {
        email: true,
      },
      autoVerify: { email: true },
    });

    const client = userPool.addClient("WebClient", {
      userPoolClientName: "webClient",
      idTokenValidity: Duration.days(1),
      accessTokenValidity: Duration.days(1),
      authFlows: {
        userPassword: true,
        userSrp: true,
        custom: true,
      },
    });

    this.authorizer = new CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool]
    });

    this.userPoolId = userPool.userPoolId;
    this.userPoolWebClientId = client.userPoolClientId;
  }
}
