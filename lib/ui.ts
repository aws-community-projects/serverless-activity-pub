import { CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import { DnsValidatedCertificate } from "aws-cdk-lib/aws-certificatemanager";
import { OriginAccessIdentity, Distribution, ViewerProtocolPolicy } from "aws-cdk-lib/aws-cloudfront";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { ARecord, HostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import { Bucket, BlockPublicAccess, ObjectOwnership } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import { join } from "path";

export interface UiProps {
  domain: string;
}
export class Ui extends Construct {
  constructor(scope: Construct, id: string, props: UiProps) {
    super(scope, id);
    const { domain } = props;
    const bucket = new Bucket(this, "UiBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      autoDeleteObjects: true,
    });

    new BucketDeployment(this, "BucketDeployment", {
      destinationBucket: bucket,
      sources: [Source.asset(join(__dirname, "./ui"))],
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

    const cloudFront = new Distribution(this, "Distribution", {
      defaultRootObject: "index.html",
      certificate,
      domainNames: [domain],
      defaultBehavior: {
        origin: new S3Origin(bucket, { originAccessIdentity }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
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
  }
}
