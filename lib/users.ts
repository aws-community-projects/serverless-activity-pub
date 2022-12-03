import {
  AwsIntegration,
  IntegrationResponse,
  LambdaIntegration,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Role } from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import { join } from "path";

export interface UsersProps {
  api: RestApi;
  bucket: Bucket;
  bucketRole: Role;
  domain: string;
  inbox: LambdaIntegration;
  table: Table;
  username: string;
}

export class Users extends Construct {
  constructor(scope: Construct, id: string, props: UsersProps) {
    super(scope, id);
    const { api, bucket, bucketRole, domain, table, username } = props;
    const actor = api.root.addResource("users");
    const user = actor.addResource(username);

    const userIntegration = new AwsIntegration({
      service: "s3",
      integrationHttpMethod: "GET",
      path: `${bucket.bucketName}/${username}.json`,
      options: {
        credentialsRole: bucketRole,
        integrationResponses: [
          {
            statusCode: "200",
            "method.response.header.Content-Type":
              "integration.response.header.Content-Type",
            "method.response.header.Content-Disposition":
              "integration.response.header.Content-Disposition",
          } as IntegrationResponse,
          { statusCode: "400" },
        ],
      },
    });

    user.addMethod("GET", userIntegration, {
      methodResponses: [{ statusCode: "200" }],
    });

    const userInbox = user.addResource("inbox");
    userInbox.addMethod("POST", props.inbox);

    const userFollowersFn = new NodejsFunction(this, `UserFollowersFn`, {
      functionName: `UserFollowersFn`,
      entry: join(__dirname, './lambda/user-followers.ts'),
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
      environment: {
        DOMAIN: domain,
        USERNAME: username,
        TABLE_NAME: table.tableName,
      }
    });
    table.grantReadData(userFollowersFn);
    const userFollowers = user.addResource("followers");
    userFollowers.addMethod("GET", new LambdaIntegration(userFollowersFn));
  }
}
