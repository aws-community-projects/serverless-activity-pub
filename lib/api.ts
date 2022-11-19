import { Cors, RestApi } from "aws-cdk-lib/aws-apigateway";
import { DnsValidatedCertificate } from "aws-cdk-lib/aws-certificatemanager";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";
import { CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import {
  OriginAccessIdentity,
  Distribution,
  ViewerProtocolPolicy,
  BehaviorOptions,
} from "aws-cdk-lib/aws-cloudfront";
import { RestApiOrigin, S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Bucket, BlockPublicAccess, ObjectOwnership } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { join } from "path";

export interface ActivityPubApiProps {
  domain: string;
}

export class ActivityPubApi extends Construct {
  api: RestApi;
  constructor(scope: Construct, id: string, props: ActivityPubApiProps) {
    super(scope, id);
    const { domain } = props;

    const api = new RestApi(this, "RestApi", {
      restApiName: "activity-pub",
      defaultCorsPreflightOptions: {
        allowCredentials: true,
        allowOrigins: Cors.ALL_ORIGINS,
      },
    });

    const bucket = new Bucket(this, "UiBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      autoDeleteObjects: true,
    });

    new BucketDeployment(this, "BucketDeployment", {
      destinationBucket: bucket,
      sources: [Source.asset(join(__dirname, "../dist"))],
    });

    const originAccessIdentity = new OriginAccessIdentity(
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

    const cloudFront = new Distribution(this, "Distribution", {
      defaultRootObject: "index.html",
      certificate,
      domainNames: [domain],
      defaultBehavior: {
        origin: new S3Origin(bucket, { originAccessIdentity }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      additionalBehaviors: {
        ...[
          ".well-known",
          "activityStream",
          "actor",
          "blocked",
          "collections",
          "followers",
          "following",
          "inbox",
          "liked",
          "shares",
          "likes",
          "object",
          "outbox",
          "rejected",
          "rejections",
          "webfinger",
          "nodeInfo",
          "nodeInfoLocation",
          "proxy",
        ].reduce((p, c) => {
          return {
            ...p,
            [`/${c}*`]: {
              origin: restApiOrigin,
              viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
          };
        }, {} as Record<string, BehaviorOptions>),
      },
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
