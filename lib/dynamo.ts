import { RemovalPolicy } from "aws-cdk-lib";
import { AttributeType, BillingMode, Table } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export interface DynamoProps {}

export class Dynamo extends Construct {
  table: Table;
  constructor(scope: Construct, id: string, props: DynamoProps) {
    super(scope, id);
    this.table = new Table(this, `ActivityPubTable`, {
      partitionKey: { name: "pk", type: AttributeType.STRING },
      sortKey: { name: "sk", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: RemovalPolicy.DESTROY,
    });
  }
}
