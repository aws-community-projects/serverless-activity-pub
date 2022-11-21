export interface AddFollower {
  "@context": string;
  actor: string;
  id: string;
  object: string;
  type: "follow";
  activityServer: string;
  activityUser: string;
}
