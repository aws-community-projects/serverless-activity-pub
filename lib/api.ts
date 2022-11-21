import { Cors, RestApi } from "aws-cdk-lib/aws-apigateway";
import { DnsValidatedCertificate } from "aws-cdk-lib/aws-certificatemanager";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";
import { CfnOutput, DockerImage, RemovalPolicy, Stack } from "aws-cdk-lib";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import { RestApiOrigin, S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Bucket, BlockPublicAccess, ObjectOwnership } from "aws-cdk-lib/aws-s3";
import {
  BucketDeployment,
  CacheControl,
  Source,
} from "aws-cdk-lib/aws-s3-deployment";
import { join } from "path";
import { ExecSyncOptions, execSync } from "child_process";
import { copySync } from "fs-extra";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import {
  PhysicalResourceId,
  AwsCustomResource,
  AwsCustomResourcePolicy,
} from "aws-cdk-lib/custom-resources";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Code, Runtime } from "aws-cdk-lib/aws-lambda";
import {
  AllowedMethods,
  CachePolicy,
  CacheQueryStringBehavior,
  OriginRequestHeaderBehavior,
  OriginRequestPolicy,
  OriginRequestQueryStringBehavior,
} from "aws-cdk-lib/aws-cloudfront";

export interface ActivityPubApiProps {
  domain: string;
  userPoolId: string;
  userPoolWebClientId: string;
}

export class ActivityPubApi extends Construct {
  api: RestApi;
  constructor(scope: Construct, id: string, props: ActivityPubApiProps) {
    super(scope, id);
    const { domain, userPoolId, userPoolWebClientId } = props;

    const api = new RestApi(this, "RestApi", {
      restApiName: "activity-pub",
      defaultCorsPreflightOptions: {
        allowCredentials: true,
        allowOrigins: Cors.ALL_ORIGINS,
      },
    });

    const bucket = new Bucket(this, "ActivityPubUiBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      autoDeleteObjects: true,
    });

    const execOptions: ExecSyncOptions = {
      stdio: ["ignore", process.stderr, "inherit"],
    };
    const uiPath = join(__dirname, `../activity-pub/dist`);
    const bundle = Source.asset(uiPath, {
      assetHash: `actpub-${Date.now()}`,
      bundling: {
        command: ["sh", "-c", 'echo "Not Used"'],
        image: DockerImage.fromRegistry("alpine"), // required but not used
        local: {
          tryBundle(outputDir: string) {
            execSync("cd activity-pub && npm i");
            execSync(`cd activity-pub && npm run build`);
            copySync(uiPath, outputDir, {
              ...execOptions,
              recursive: true,
            });
            return true;
          },
        },
      },
    });

    const originAccessIdentity = new cloudfront.OriginAccessIdentity(
      this,
      "OriginAccessIdentity"
    );
    bucket.grantRead(originAccessIdentity);

    const hostedZone = HostedZone.fromLookup(this, `UIZone`, {
      domainName: domain,
    });
    const certificate = new DnsValidatedCertificate(this, `UiCert`, {
      domainName: domain,
      hostedZone,
    });

    const restApiOrigin = new RestApiOrigin(api);

    const edgeFn = new cloudfront.experimental.EdgeFunction(
      this,
      `ActivityPubEdgeFunction`,
      {
        functionName: `ActivityPubEdgeFunction`,
        code: Code.fromInline(`
const path = require('path');
exports.handler = (event, context, callback) => {
  const { request } = event.Records[0].cf;
  console.log(JSON.stringify(request, null, 2));
  if (!request.uri.startsWith('/prod')) {
    // Rewrite uri without extensions only
    // Will rewrite /blabla to /index.html but not /abc.txt or /xyz.css
    if (!path.extname(request.uri)) request.uri = '/index.html';
  }
  console.log(request.uri);
  callback(null, request);
};`),
        handler: "index.handler",
        runtime: Runtime.NODEJS_16_X,
        logRetention: RetentionDays.ONE_DAY,
      }
    );

    const originRequestPolicy = new OriginRequestPolicy(
      this,
      `ActPubReqPolicy`,
      {
        // cookieBehavior: OriginRequestCookieBehavior.allowList(...[]),
        queryStringBehavior: OriginRequestQueryStringBehavior.allowList(
          ...["resource"]
        ),
        headerBehavior: OriginRequestHeaderBehavior.allowList(...["Signature", "Digest"]),
      }
    );
    const cachePolicy = new CachePolicy(this, `ActPubCachePolicy`, {
      queryStringBehavior: CacheQueryStringBehavior.all(),
    });

    const cloudFront = new cloudfront.Distribution(this, "Distribution", {
      defaultRootObject: "index.html",
      certificate,
      domainNames: [domain],
      defaultBehavior: {
        origin: new S3Origin(bucket, { originAccessIdentity }),
        originRequestPolicy,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        edgeLambdas: [
          {
            functionVersion: edgeFn.currentVersion,
            eventType: cloudfront.LambdaEdgeEventType.ORIGIN_REQUEST,
          },
        ],
      },
      additionalBehaviors: {
        ...[
          ".well-known",
          "activityStream",
          "blocked",
          "collections",
          "followers",
          "following",
          "inbox",
          "internal",
          "liked",
          "likes",
          "nodeInfo",
          "nodeInfoLocation",
          "object",
          "outbox",
          "proxy",
          "rejected",
          "rejections",
          "shares",
          "users",
          "webfinger",
        ].reduce((p, c) => {
          return {
            ...p,
            [`/${c}*`]: {
              allowedMethods: AllowedMethods.ALLOW_ALL,
              origin: restApiOrigin,
              originRequestPolicy,
              cachePolicy,
              viewerProtocolPolicy:
                cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
          };
        }, {} as Record<string, cloudfront.BehaviorOptions>),
      },
    });

    new BucketDeployment(this, "ActivityPubBucketDeployment", {
      distribution: cloudFront,
      destinationBucket: bucket,
      sources: [bundle],
      logRetention: RetentionDays.ONE_DAY,
      cacheControl: [
        CacheControl.fromString(
          "max-age=0, no-cache, no-store, must-revalidate"
        ),
      ],
      memoryLimit: 1024,
      prune: false,
    });

    const resProps = {
      action: "putObject",
      parameters: {
        Body: Stack.of(scope).toJsonString({
          userPoolId,
          userPoolWebClientId,
          version: "1",
        }),
        Bucket: bucket.bucketName,
        CacheControl: "max-age=0, no-cache, no-store, must-revalidate",
        ContentType: "application/json",
        Key: "config.json",
      },
      physicalResourceId: PhysicalResourceId.of("config"),
      service: "S3",
    };
    new AwsCustomResource(this, `ConfigResource`, {
      onCreate: resProps,
      onUpdate: resProps,
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          actions: ["s3:PutObject"],
          resources: [bucket.arnForObjects("config.json")],
        }),
      ]),
    });

    new ARecord(this, `ARecord`, {
      zone: hostedZone,
      recordName: domain,
      target: RecordTarget.fromAlias(new CloudFrontTarget(cloudFront)),
    });

    new CfnOutput(this, `CloudFrontUrl`, {
      value: `https://${cloudFront.distributionDomainName}`,
    });

    this.api = api;

    new CfnOutput(this, `Url`, { value: `https://${domain}` });
  }
}
