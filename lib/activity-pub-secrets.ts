import { RemovalPolicy, Duration, CustomResource } from "aws-cdk-lib";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Bucket, BlockPublicAccess, ObjectOwnership } from "aws-cdk-lib/aws-s3";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Provider } from "aws-cdk-lib/custom-resources";
import { Construct } from "constructs";
import { join } from "path";

export interface SecretsProps {
  domain: string;
}

export class ActivityPubSecrets extends Construct {
  bucket: Bucket;
  bucketRole: Role;
  secret: Secret;
  constructor(scope: Construct, id: string, props: SecretsProps) {
    super(scope, id);
    
    const SECRET_ID = 'ActivityPubSecret';
    this.secret = new Secret(this, SECRET_ID);

    const BUCKET_ID = 'ActivityPubSecretBucket';
    this.bucket = new Bucket(this, BUCKET_ID, {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    this.bucketRole = new Role(this, 'ActivityPubBucketRole', {
      roleName: 'ActivityPubBucketRole',
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });
    this.bucket.grantRead(this.bucketRole);
  }
}
