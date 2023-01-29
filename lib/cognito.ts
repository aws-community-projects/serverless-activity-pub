import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { CognitoUserPoolsAuthorizer } from "aws-cdk-lib/aws-apigateway";
import {
  CfnUserPoolGroup,
  OAuthScope,
  UserPool,
} from "aws-cdk-lib/aws-cognito";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { IEventBus, Rule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { join } from "path";

export interface CognitoProps {
  bus: IEventBus;
  domain: string;
  table: Table;
}

export class Cognito extends Construct {
  authorizer: CognitoUserPoolsAuthorizer;
  userPoolId: string;
  userPoolWebClientId: string;
  constructor(scope: Construct, id: string, props: CognitoProps) {
    super(scope, id);
    const { bus, domain, table } = props;

    const userConfirmationFn = new NodejsFunction(this, `UserConfirmationFn`, {
      functionName: `UserConfirmationFn`,
      entry: join(__dirname, "./lambda/event-driven/user-confirmation.ts"),
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
      environment: {
        TABLE_NAME: table.tableName,
        DOMAIN: domain,
      },
      timeout: Duration.seconds(30),
    });
    table.grantReadWriteData(userConfirmationFn);
    bus.grantPutEventsTo(userConfirmationFn);

    const userPool = new UserPool(this, "activity-pub-user-pool", {
      userPoolName: "activity-pub-user-pool",
      signInCaseSensitive: false, // case insensitive is preferred in most situations
      selfSignUpEnabled: false,
      signInAliases: {
        username: true,
        email: true,
      },
      lambdaTriggers: {
        postConfirmation: userConfirmationFn,
      },
      standardAttributes: {
        email: {
          required: true,
        },
      },
      removalPolicy: RemovalPolicy.DESTROY,
      autoVerify: { email: true },
    });
    const userConfirmedFn = new NodejsFunction(this, `UserConfirmedFn`, {
      functionName: `UserConfirmedFn`,
      entry: join(__dirname, "./lambda/event-driven/user-confirmed.ts"),
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
      timeout: Duration.seconds(30),
    });
    userPool.grant(userConfirmedFn, "cognito-idp:AdminAddUserToGroup");
    new Rule(this, `UserConfirmedRule`, {
      eventBus: bus,
      eventPattern: {
        source: [`activity-pub.user-confirmation`],
        detailType: [`user-added`]
      },
      targets: [new LambdaFunction(userConfirmedFn)],
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
      oAuth: {
        scopes: [OAuthScope.OPENID, OAuthScope.COGNITO_ADMIN],
      },
    });

    this.authorizer = new CognitoUserPoolsAuthorizer(
      this,
      "CognitoAuthorizer",
      {
        cognitoUserPools: [userPool],
      }
    );

    new CfnUserPoolGroup(this, "UserGroup", {
      userPoolId: userPool.userPoolId,
      groupName: "users",
    });

    this.userPoolId = userPool.userPoolId;
    this.userPoolWebClientId = client.userPoolClientId;
  }
}
