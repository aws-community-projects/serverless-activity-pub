import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";

export const hasFollower = async ({
  activity,
  ddbDocClient,
}: {
  activity: any;
  ddbDocClient: DynamoDBDocumentClient;
}) => {
  const queryCommand = new QueryCommand({
    TableName: process.env.TABLE_NAME,
    KeyConditionExpression: "#pk = :pk",
    IndexName: "gsi1",
    ExpressionAttributeNames: {
      "#pk": "pk1",
      "#active": "active",
    },
    ExpressionAttributeValues: {
      ":pk": `FOLLOWER#${activity.activityUser}@${activity.activityServer}`,
      ":active": true,
    },
    FilterExpression: "#active = :active",
    Limit: 1,
  });
  try {
    const queryRes = await ddbDocClient.send(queryCommand);
    console.log(JSON.stringify({ queryRes }));
    if (!queryRes.Items) {
      console.log(
        `No one follows: ${activity.activityUser}@${activity.activityServer}`
      );
      throw new Error("No One Following");
    } else {
      return true;
    }
  } catch (e) {
    console.log(e);
    return false;
  }
};
