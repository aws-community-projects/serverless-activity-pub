import { Duration } from "aws-cdk-lib";
import {
  LambdaIntegration,
  MockIntegration,
  RestApi,
} from "aws-cdk-lib/aws-apigateway";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import { join } from "path";

export interface WellKnownProps {
  api: RestApi;
  domain: string;
  table: Table;
}

export class WellKnown extends Construct {
  constructor(scope: Construct, id: string, props: WellKnownProps) {
    super(scope, id);
    const { api, domain, table } = props;
    const wellknown = api.root.addResource(".well-known");

    const webfingerFn = new NodejsFunction(this, `WebfingerFn`, {
      functionName: `WebfingerFn`,
      entry: join(__dirname, "./lambda/api/well-known/webfinger.ts"),
      runtime: Runtime.NODEJS_18_X,
      logRetention: RetentionDays.ONE_DAY,
      timeout: Duration.minutes(5),
      environment: {
        DOMAIN: domain,
      },
    });
    table.grantReadData(webfingerFn);
    webfingerFn.addEnvironment("TABLE_NAME", table.tableName);

    const webfinger = wellknown.addResource("webfinger");
    webfinger.addMethod("GET", new LambdaIntegration(webfingerFn));

    wellknown.addResource("nodeinfo").addMethod(
      "GET",
      new MockIntegration({
        requestTemplates: {
          "application/json": `{"statusCode" : 200}`,
        },
        integrationResponses: [
          {
            statusCode: "200",
            responseTemplates: {
              "application/json": JSON.stringify({
                links: [
                  {
                    rel: "http://nodeinfo.diaspora.software/ns/schema/2.0",
                    href: `https://${domain}/nodeinfo/2.0`,
                  },
                ],
              }),
            },
          },
        ],
      }),
      {
        methodResponses: [
          {
            statusCode: "200",
          },
        ],
      }
    );

    // TODO this one could actually be a real integration and fetch info from dynamodb
    api.root
      .addResource("nodeinfo")
      .addResource("2.0")
      .addMethod(
        "GET",
        new MockIntegration({
          integrationResponses: [
            {
              statusCode: "200",
              responseTemplates: {
                "application/json": JSON.stringify({
                  version: "2.0",
                  software: { name: "lesstodon", version: "0.0.1" },
                  protocols: ["activitypub"],
                  services: { outbound: [], inbound: [] },
                  usage: {
                    users: {
                      total: 1,
                      activeMonth: 1,
                      activeHalfyear: 1,
                    },
                    localPosts: 0,
                  },
                  openRegistrations: false,
                  metadata: {},
                }),
              },
            },
          ],
          requestTemplates: {
            "application/json": `{ "statusCode": 200 }`,
          },
        }),
        {
          methodResponses: [
            {
              statusCode: "200",
            },
          ],
        }
      );
  }
}
