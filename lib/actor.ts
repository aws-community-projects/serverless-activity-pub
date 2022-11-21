import {
  AwsIntegration,
  IntegrationResponse,
  LambdaIntegration,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { Role } from "aws-cdk-lib/aws-iam";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export interface ActorProps {
  api: RestApi;
  bucket: Bucket;
  bucketRole: Role;
  domain: string;
  inbox: LambdaIntegration;
  username: string;
}

export class Actor extends Construct {
  constructor(scope: Construct, id: string, props: ActorProps) {
    super(scope, id);
    const { api, bucket, bucketRole, domain, username } = props;
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
  }
}
