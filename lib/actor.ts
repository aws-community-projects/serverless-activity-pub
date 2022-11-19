import { AwsIntegration, IntegrationResponse, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Role } from "aws-cdk-lib/aws-iam";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

export interface ActorProps {
  api: RestApi;
  bucket: Bucket;
  bucketRole: Role;
  domain: string;
  username: string;
}

export class Actor extends Construct {
  constructor(scope: Construct, id: string, props: ActorProps) {
    super(scope, id);
    const { api, bucket, bucketRole, domain, username } = props;
    const actor = api.root.addResource('actor');

    const actorIntegration = new AwsIntegration({
      service: 's3',
      integrationHttpMethod: 'GET',
      path: `${bucket.bucketName}/${username}.json`,
      options: {
        credentialsRole: bucketRole,
        // integration responses are required!
        integrationResponses: [
          {
            'statusCode': '200',
            'method.response.header.Content-Type': 'integration.response.header.Content-Type',
            'method.response.header.Content-Disposition': 'integration.response.header.Content-Disposition',
          } as IntegrationResponse,
          { statusCode: '400' },
        ],
      },
    });

    actor.addMethod('GET', actorIntegration, {
      methodResponses: [{ statusCode: '200' }],
    });
  }
}
