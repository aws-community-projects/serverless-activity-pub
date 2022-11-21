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
  username: string;
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

    const userGenerator = new NodejsFunction(this, 'ActivityPubUserGenerator', {
      functionName: `ActivityPubUserGenerator`,
      timeout: Duration.seconds(30),
      entry: join(__dirname, './lambda/user-generator.ts'),
      runtime: Runtime.NODEJS_18_X,
      environment: {
        SECRET_ID: this.secret.secretArn,
        BUCKET_ID: this.bucket.bucketName,
        DOMAIN: props.domain,
        USERNAME: props.username,
      },
    });
    this.secret.grantWrite(userGenerator);
    this.bucket.grantWrite(userGenerator);

    const userGeneratorProvider = new Provider(this, 'ActivityPubUserGenerateProvider', {
      onEventHandler: userGenerator,
    });

    new CustomResource(this, 'ActivityPubUserGenerateResource', {
      serviceToken: userGeneratorProvider.serviceToken,
      properties: {
        // Bump to force an update
        Version: `${props.username}-1`,
      },
    });
  }
}
